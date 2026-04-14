// app/api/sports/route.ts
// Fetches live sports markets from Polymarket, prioritizing trending events like IPL & NBA

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const SPORTS_KEYWORDS = [
  'ipl','cricket','mumbai indians','chennai','kolkata','rajasthan','punjab','delhi capitals','sunrisers','royal challengers',
  'nba','playoffs','lakers','celtics','warriors','knicks','heat','bulls','nets','sixers','bucks','nuggets',
  'nfl','super bowl','nhl','mlb','soccer','premier league','champions league','la liga','bundesliga',
  'ufc','mma','tennis','wimbledon','us open','french open','australian open',
  'world cup','copa america','euro','formula 1','f1','golf','masters',
  'ncaa','march madness','wnba',
];

const LEAGUE_MAP: Record<string, { label: string; emoji: string; priority: number }> = {
  ipl:        { label: 'IPL',           emoji: '🏏', priority: 1 },
  cricket:    { label: 'Cricket',       emoji: '🏏', priority: 1 },
  nba:        { label: 'NBA',           emoji: '🏀', priority: 2 },
  nfl:        { label: 'NFL',           emoji: '🏈', priority: 3 },
  soccer:     { label: 'Soccer',        emoji: '⚽', priority: 4 },
  'premier league': { label: 'EPL',    emoji: '⚽', priority: 4 },
  'champions league': { label: 'UCL',  emoji: '⚽', priority: 4 },
  nhl:        { label: 'NHL',           emoji: '🏒', priority: 5 },
  mlb:        { label: 'MLB',           emoji: '⚾', priority: 5 },
  ufc:        { label: 'UFC',           emoji: '🥊', priority: 6 },
  tennis:     { label: 'Tennis',        emoji: '🎾', priority: 7 },
  golf:       { label: 'Golf',          emoji: '⛳', priority: 8 },
  f1:         { label: 'F1',            emoji: '🏎️', priority: 9 },
  'formula 1':{ label: 'F1',            emoji: '🏎️', priority: 9 },
};

function detectLeague(title: string): { label: string; emoji: string; priority: number } {
  const t = title.toLowerCase();
  for (const [kw, meta] of Object.entries(LEAGUE_MAP)) {
    if (t.includes(kw)) return meta;
  }
  return { label: 'Sports', emoji: '🏆', priority: 10 };
}

function isSportsMarket(title: string): boolean {
  const t = title.toLowerCase();
  return SPORTS_KEYWORDS.some(kw => t.includes(kw));
}

function fmtVolume(v: number): string {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return '$' + (v / 1_000).toFixed(0) + 'K';
  return '$' + v;
}

export async function GET(request: NextRequest) {
  const league = request.nextUrl.searchParams.get('league') || 'all';

  try {
    // Fetch top active markets by volume
    const res = await fetch(
      'https://gamma-api.polymarket.com/events/keyset?limit=100&active=true&order=volume&ascending=false',
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 180 } }
    );

    if (!res.ok) throw new Error('Polymarket fetch failed');
    const events = await res.json();
    if (!events?.length) return Response.json({ results: [], leagues: [] });

    // Filter to sports only
    const sportsEvents = events
      .filter((e: any) => e.slug && e.title && isSportsMarket(e.title) && parseFloat(e.volume || '0') > 500)
      .map((e: any) => {
        const vol    = parseFloat(e.volume || '0');
        const league = detectLeague(e.title);
        const markets = e.markets || [];

        // Get YES price from first market
        let yesPrice: number | null = null;
        if (markets.length > 0 && markets[0].outcomePrices) {
          try {
            const prices = typeof markets[0].outcomePrices === 'string'
              ? JSON.parse(markets[0].outcomePrices)
              : markets[0].outcomePrices;
            const p = parseFloat(prices[0]);
            if (!isNaN(p)) yesPrice = p > 1 ? Math.round(p) : Math.round(p * 100);
          } catch {}
        }

        // Detect if this is a multi-outcome market (e.g. "who wins IPL 2025")
        const isMulti = markets.length > 1 || (markets[0]?.groupItemTitle);

        return {
          slug:             e.slug,
          title:            e.title,
          url:              'https://polymarket.com/event/' + e.slug,
          volume:           vol,
          volumeFormatted:  fmtVolume(vol),
          endDate:          e.endDate || '',
          league:           league.label,
          emoji:            league.emoji,
          priority:         league.priority,
          yesPrice:         isMulti ? null : yesPrice,
          marketCount:      markets.length,
          isMulti,
        };
      })
      // Filter by league if requested
      .filter((e: any) => league === 'all' || e.league.toLowerCase() === league.toLowerCase())
      // Sort by priority (IPL/NBA first) then volume
      .sort((a: any, b: any) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.volume - a.volume;
      });

    // Get unique leagues present
    const leagues = [...new Set(sportsEvents.map((e: any) => e.league))] as string[];

    return Response.json({
      results: sportsEvents.slice(0, 25),
      leagues,
      total: sportsEvents.length,
    });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
