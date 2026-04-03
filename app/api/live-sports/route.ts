import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function fmtVolume(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(0) + 'K';
  return '$' + v;
}

function extractBinaryPrice(market: any): { yes: number; no: number } | null {
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

async function searchPolymarket(query: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/events?q=${encodeURIComponent(query)}&active=true&limit=20`,
      { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function classifySport(title: string): 'ipl' | 'nba' | null {
  const t = title.toLowerCase();
  const iplTerms = ['ipl','indian premier league','super kings','mumbai indians','knight riders',
    'sunrisers','rajasthan royals','punjab kings','delhi capitals','lucknow','royal challengers',
    'gujarat titans','rising pune'];
  const nbaTerms = ['nba','thunder','celtics','lakers','warriors','knicks','heat','nuggets',
    'pistons','timberwolves','bulls','nets','sixers','bucks','suns','mavs','mavericks',
    'clippers','spurs','hawks','hornets','wizards','magic','pacers','raptors','jazz','pelicans',
    'grizzlies','rockets','kings','blazers','cavaliers'];
  if (iplTerms.some(w => t.includes(w))) return 'ipl';
  if (nbaTerms.some(w => t.includes(w))) return 'nba';
  return null;
}

function getTeams(title: string): { home: string; away: string } | null {
  // Try "Team A vs Team B" or "Team A v Team B"
  const patterns = [
    /^(.+?)\s+vs\.?\s+(.+?)(?:\s*[-–(].*)?$/i,
    /^(.+?)\s+v\s+(.+?)(?:\s*[-–(].*)?$/i,
  ];
  for (const pattern of patterns) {
    const m = title.match(pattern);
    if (m) return { home: m[1].trim(), away: m[2].trim() };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get('sport') || 'all';

  // Simple, proven queries that Polymarket search returns results for
  const QUERIES = sport === 'ipl'
    ? ['IPL', 'Indian Premier League', 'Chennai Super Kings', 'Mumbai Indians', 'KKR']
    : sport === 'nba'
    ? ['NBA', 'Oklahoma City Thunder', 'NBA champion 2026', 'NBA playoffs']
    : ['IPL', 'Indian Premier League', 'NBA', 'NBA champion 2026'];

  const batches = await Promise.all(QUERIES.map(q => searchPolymarket(q)));

  const seen = new Set<string>();
  const matchEvents: any[] = [];
  const futureEvents: any[] = [];

  for (const batch of batches) {
    for (const event of batch) {
      if (!event.slug || !event.title || seen.has(event.slug)) continue;
      seen.add(event.slug);

      const sportType = classifySport(event.title);
      if (!sportType) continue;
      if (sport !== 'all' && sportType !== sport) continue;

      const vol = parseFloat(event.volume || '0');
      const markets = event.markets || [];
      const teams = getTeams(event.title);

      // Binary match (1 market, two teams)
      if (teams && markets.length === 1) {
        const price = extractBinaryPrice(markets[0]);
        if (price) {
          matchEvents.push({
            slug: event.slug,
            title: event.title,
            url: 'https://polymarket.com/event/' + event.slug,
            volume: vol,
            volumeFormatted: fmtVolume(vol),
            sport: sportType === 'ipl' ? 'IPL 2026' : 'NBA 2026',
            emoji: sportType === 'ipl' ? '🏏' : '🏀',
            type: 'match',
            homeTeam: teams.home,
            awayTeam: teams.away,
            homeOdds: price.yes,
            awayOdds: price.no,
          });
          continue;
        }
      }

      // Futures / multi-outcome
      if (markets.length > 1 && vol > 500) {
        const outcomes: { name: string; pct: number }[] = [];
        for (const m of markets) {
          if (!m.outcomePrices || !m.groupItemTitle) continue;
          try {
            const prices = typeof m.outcomePrices === 'string'
              ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            const p = parseFloat(prices[0]);
            const pct = p <= 1 ? Math.round(p * 100) : Math.round(p);
            if (pct >= 1 && pct <= 99) outcomes.push({ name: m.groupItemTitle, pct });
          } catch {}
        }
        outcomes.sort((a, b) => b.pct - a.pct);
        if (outcomes.length >= 2) {
          futureEvents.push({
            slug: event.slug,
            title: event.title,
            url: 'https://polymarket.com/event/' + event.slug,
            volume: vol,
            volumeFormatted: fmtVolume(vol),
            sport: sportType === 'ipl' ? 'IPL 2026' : 'NBA 2026',
            emoji: sportType === 'ipl' ? '🏏' : '🏀',
            type: 'futures',
            topOutcomes: outcomes.slice(0, 5),
          });
        }
      }
    }
  }

  matchEvents.sort((a, b) => b.volume - a.volume);
  futureEvents.sort((a, b) => b.volume - a.volume);

  // Debug info
  const debug = {
    queriesRun: QUERIES,
    totalEventsFound: [...batches].reduce((a, b) => a + b.length, 0),
    matchesFound: matchEvents.length,
    futuresFound: futureEvents.length,
  };

  return Response.json({
    liveGames: matchEvents.slice(0, 10),
    futures: futureEvents.slice(0, 4),
    total: matchEvents.length + futureEvents.length,
    debug,
  });
}
