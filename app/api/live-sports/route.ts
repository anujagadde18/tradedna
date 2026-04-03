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
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get('sport') || 'all';
  const now = new Date().toISOString();

  // Use endDateMin to only get current/future markets
  // Polymarket gamma API supports endDateMin filter
  const BASE = 'https://gamma-api.polymarket.com/events';
  const PARAMS = `active=true&limit=30&order=volume&ascending=false&endDateMin=${encodeURIComponent(now)}`;

  const urls = sport === 'ipl'
    ? [`${BASE}?${PARAMS}&tag=cricket`, `${BASE}?${PARAMS}&q=IPL+2026`]
    : sport === 'nba'
    ? [`${BASE}?${PARAMS}&tag=nba`, `${BASE}?${PARAMS}&q=NBA+2026`]
    : [
        `${BASE}?${PARAMS}&tag=cricket`,
        `${BASE}?${PARAMS}&tag=nba`,
        `${BASE}?${PARAMS}&q=IPL+2026`,
        `${BASE}?${PARAMS}&q=NBA+2026`,
      ];

  const batches = await Promise.all(urls.map(fetchEvents));

  const seen = new Set<string>();
  const matches: any[] = [];
  const futures: any[] = [];
  const debugTitles: string[] = [];

  for (const batch of batches) {
    for (const event of batch) {
      if (!event.slug || !event.title || seen.has(event.slug)) continue;
      seen.add(event.slug);
      const vol = parseFloat(event.volume || '0');
      const markets = event.markets || [];
      const title: string = event.title;
      debugTitles.push(title + ' [m:' + markets.length + ' v:' + Math.round(vol) + ']');

      const tl = title.toLowerCase();
      const isIPL = tl.includes('ipl') || tl.includes('indian premier league') ||
        ['super kings','mumbai indians','knight riders','sunrisers','rajasthan royals',
         'punjab kings','delhi capitals','lucknow super','royal challengers','gujarat titans']
        .some(t => tl.includes(t));
      const isNBA = tl.includes('nba') || tl.includes('thunder') || tl.includes('celtics') ||
        tl.includes('lakers') || tl.includes('warriors') || tl.includes('knicks') ||
        tl.includes('nuggets') || tl.includes('timberwolves') || tl.includes('pistons') ||
        tl.includes('heat') || tl.includes('bucks') || tl.includes('suns') || tl.includes('mavericks');

      if (!isIPL && !isNBA) continue;
      const sportLabel = isIPL ? 'IPL 2026' : 'NBA 2026';
      const emoji      = isIPL ? '🏏' : '🏀';

      // Binary match market
      if (markets.length === 1) {
        const price = extractPrice(markets[0]);
        // Try to split title into two teams
        // Polymarket sports titles: "Indian Premier League: CSK vs MI"
        const colonPart = title.includes(':') ? title.split(':')[1].trim() : title;
        const vsMatch = colonPart.match(/^(.+?)\s+(?:vs?\.?)\s+(.+?)(?:\s*[-–(].*)?$/i);
        if (price && vsMatch) {
          matches.push({
            slug: event.slug, title, url: 'https://polymarket.com/event/' + event.slug,
            volume: vol, volumeFormatted: fmtVolume(vol),
            sport: sportLabel, emoji, type: 'match',
            homeTeam: vsMatch[1].trim(), awayTeam: vsMatch[2].trim(),
            homeOdds: price.yes, awayOdds: price.no,
          });
          continue;
        }
      }

      // Futures / multi-outcome
      if (markets.length > 1 && vol > 100) {
        const outcomes: { name: string; pct: number }[] = [];
        for (const m of markets) {
          const name = m.groupItemTitle || m.outcomeName || m.question || '';
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
      urlsUsed: urls,
      totalFound: batches.reduce((a, b) => a + b.length, 0),
      afterDedup: seen.size,
      matches: matches.length,
      futures: futures.length,
      sampleTitles: debugTitles.slice(0, 20),
    },
  });
}
