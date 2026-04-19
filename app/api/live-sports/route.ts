import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

function fmtVolume(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(0) + 'K';
  return '$' + Math.round(v);
}

function extractPrice(market: any): { yes: number; no: number } | null {
  try {
    const prices = market.outcomePrices
      ? (typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices)
      : null;
    if (!prices || prices.length < 2) return null;
    const yes = parseFloat(prices[0]);
    const no  = parseFloat(prices[1]);
    if (isNaN(yes) || isNaN(no)) return null;
    const yesPct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
    const noPct  = no  <= 1 ? Math.round(no  * 100) : Math.round(no);
    if (yesPct < 2 || yesPct > 98) return null;
    return { yes: yesPct, no: noPct };
  } catch { return null; }
}

async function fetchEvents(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// Only keep events ending in the future
function isActive(event: any): boolean {
  if (!event.endDate) return true;
  return new Date(event.endDate) > new Date();
}

const IPL_TEAMS = ['chennai super kings','mumbai indians','kolkata knight riders','kkr',
  'sunrisers hyderabad','srh','rajasthan royals','punjab kings','pbks','delhi capitals',
  'lucknow super giants','lsg','royal challengers','rcb','gujarat titans','gt'];

const NBA_TEAMS = ['thunder','celtics','lakers','warriors','knicks','nuggets','timberwolves',
  'pistons','heat','bucks','suns','mavericks','mavs','clippers','spurs','hawks','nets',
  'sixers','cavaliers','cavs','rockets','grizzlies','pelicans','pacers','raptors','jazz',
  'kings','blazers','magic','hornets','wizards','bulls'];

function classifySport(title: string): 'ipl' | 'nba' | null {
  const t = title.toLowerCase();
  if (t.includes('ipl') || t.includes('indian premier league') || IPL_TEAMS.some(team => t.includes(team))) return 'ipl';
  if (t.includes(' nba ') || t.includes('nba ') || NBA_TEAMS.some(team => t.includes(team))) return 'nba';
  return null;
}

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get('sport') || 'all';

  // Very specific queries that Polymarket search actually returns current results for
  const SPECIFIC_QUERIES = sport === 'ipl' ? [
    'Chennai Super Kings vs', 'Mumbai Indians vs', 'IPL 2026 Champion',
    'Kolkata Knight Riders vs', 'Royal Challengers vs', 'Rajasthan Royals vs',
  ] : sport === 'nba' ? [
    'NBA Champion 2026', 'Oklahoma City Thunder vs', 'NBA playoffs 2026',
    'Boston Celtics vs', 'Cleveland Cavaliers vs',
  ] : [
    'Chennai Super Kings', 'Mumbai Indians', 'IPL 2026 Champion',
    'NBA Champion 2026', 'Oklahoma City Thunder vs', 'Kolkata Knight Riders',
    'Royal Challengers Bengaluru', 'Boston Celtics vs',
  ];

  const batches = await Promise.all(
    SPECIFIC_QUERIES.map(q =>
      fetchEvents(`https://gamma-api.polymarket.com/events?q=${encodeURIComponent(q)}&active=true&limit=10`)
    )
  );

  const seen = new Set<string>();
  const matches: any[] = [];
  const futures: any[] = [];
  const debugTitles: string[] = [];

  for (const batch of batches) {
    for (const event of batch) {
      if (!event.slug || !event.title || seen.has(event.slug)) continue;
      if (!isActive(event)) continue;
      seen.add(event.slug);

      const vol = parseFloat(event.volume || '0');
      const markets = event.markets || [];
      const title: string = event.title;
      debugTitles.push(title + ' [endDate:' + (event.endDate||'none') + ' m:' + markets.length + ']');

      const sportType = classifySport(title);
      if (!sportType) continue;
      if (sport !== 'all' && sportType !== sport) continue;

      const sportLabel = sportType === 'ipl' ? 'IPL 2026' : 'NBA 2026';
      const emoji = sportType === 'ipl' ? '🏏' : '🏀';

      // Binary match market — 1 market, title has "vs"
      if (markets.length === 1 && /\bvs?\.?\b/i.test(title)) {
        const price = extractPrice(markets[0]);
        // Strip prefix like "Indian Premier League: " before parsing teams
        const colonPart = title.includes(':') ? title.split(':').slice(1).join(':').trim() : title;
        const vsMatch = colonPart.match(/^(.+?)\s+vs?\.?\s+(.+?)(?:\s*[-–(].*)?$/i);
        if (price && vsMatch) {
          matches.push({
            slug: event.slug, title, url: 'https://polymarket.com/event/' + event.slug,
            volume: vol, volumeFormatted: fmtVolume(vol),
            sport: sportLabel, emoji, type: 'match',
            homeTeam: vsMatch[1].trim(), awayTeam: vsMatch[2].trim(),
            homeOdds: price.yes, awayOdds: price.no,
            endDate: event.endDate || '',
          });
          continue;
        }
      }

      // Futures / multi-outcome (champion markets etc)
      if (markets.length > 1 && vol > 100) {
        const outcomes: { name: string; pct: number }[] = [];
        for (const m of markets) {
          const name = m.groupItemTitle || m.outcomeName || '';
          if (!name || !m.outcomePrices) continue;
          try {
            const prices = typeof m.outcomePrices === 'string'
              ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            const p = parseFloat(prices[0]);
            const pct = p <= 1 ? Math.round(p * 100) : Math.round(p);
            if (pct >= 1 && pct <= 99) outcomes.push({ name, pct });
          } catch {}
        }
        outcomes.sort((a, b) => b.pct - a.pct);
        if (outcomes.length >= 2) {
          futures.push({
            slug: event.slug, title, url: 'https://polymarket.com/event/' + event.slug,
            volume: vol, volumeFormatted: fmtVolume(vol),
            sport: sportLabel, emoji, type: 'futures',
            topOutcomes: outcomes.slice(0, 5),
          });
        }
      }
    }
  }

  matches.sort((a, b) => b.volume - a.volume);
  futures.sort((a, b) => b.volume - a.volume);

  return Response.json({
    liveGames: matches.slice(0, 10),
    futures: futures.slice(0, 4),
    total: matches.length + futures.length,
    debug: {
      queries: SPECIFIC_QUERIES,
      totalFound: batches.reduce((a, b) => a + b.length, 0),
      afterDedup: seen.size,
      sampleTitles: debugTitles.slice(0, 25),
    },
  });
}
