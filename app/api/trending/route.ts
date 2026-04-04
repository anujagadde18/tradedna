import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

// Polymarket category slugs — from their actual tag system
const CAT_QUERIES: Record<string, string> = {
  all:        'active=true&closed=false&archived=false&limit=50&order=volume24hr&ascending=false',
  sports:     'active=true&closed=false&archived=false&limit=30&order=volume24hr&ascending=false&tag_id=12',
  crypto:     'active=true&closed=false&archived=false&limit=30&order=volume24hr&ascending=false&tag_id=2',
  politics:   'active=true&closed=false&archived=false&limit=30&order=volume24hr&ascending=false&tag_id=7',
  technology: 'active=true&closed=false&archived=false&limit=30&order=volume24hr&ascending=false&tag_id=18',
  economics:  'active=true&closed=false&archived=false&limit=30&order=volume24hr&ascending=false&tag_id=5',
  world:      'active=true&closed=false&archived=false&limit=30&order=volume24hr&ascending=false&tag_id=4',
};

// Fallback: keyword-based category detection
const CAT_KEYWORDS: Record<string, string[]> = {
  sports:     ['nba','nfl','ipl','cricket','basketball','football','soccer','tennis','golf','champion','playoff','league','world cup','match'],
  crypto:     ['bitcoin','btc','eth','ethereum','crypto','blockchain','solana','coin','defi','stablecoin'],
  politics:   ['trump','election','president','congress','senate','vote','tariff','democrat','republican','supreme court'],
  technology: ['ai','openai','gpt','model','artificial intelligence','microsoft','google','nvidia','anthropic','chatgpt'],
  economics:  ['fed','federal reserve','rates','inflation','recession','gdp','unemployment','interest','economy'],
  world:      ['ukraine','russia','iran','china','nato','war','ceasefire','israel','gaza','military','nuclear','taiwan'],
};

const CAT_EMOJI: Record<string, string> = {
  sports:'🏆', crypto:'₿', politics:'🗳️', technology:'🤖', economics:'📈', world:'🌍', other:'🔮',
};

function detectCat(title: string, apiCategory?: string): string {
  // Use API category if available
  if (apiCategory) {
    const c = apiCategory.toLowerCase();
    if (c.includes('sport') || c.includes('cricket') || c.includes('basketball') || c.includes('football')) return 'sports';
    if (c.includes('crypto') || c.includes('bitcoin') || c.includes('ethereum')) return 'crypto';
    if (c.includes('politic') || c.includes('election') || c.includes('government')) return 'politics';
    if (c.includes('tech') || c.includes('ai') || c.includes('science')) return 'technology';
    if (c.includes('econom') || c.includes('finance') || c.includes('business')) return 'economics';
    if (c.includes('world') || c.includes('geopolitic') || c.includes('international')) return 'world';
  }
  // Fall back to keyword detection
  const t = title.toLowerCase();
  let best = 'other'; let bestScore = 0;
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    const score = kws.filter(kw => t.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

function fmtVol(v: number): string {
  if (v >= 1_000_000) return '$' + (v/1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return '$' + (v/1_000).toFixed(0) + 'K';
  return '$' + Math.round(v);
}

function getYesPrice(event: any): number | null {
  try {
    const markets = event.markets || [];
    if (markets.length !== 1) return null;
    const prices = markets[0].outcomePrices
      ? (typeof markets[0].outcomePrices === 'string'
          ? JSON.parse(markets[0].outcomePrices) : markets[0].outcomePrices)
      : null;
    if (!prices || prices.length < 2) return null;
    const yes = parseFloat(prices[0]);
    const no  = parseFloat(prices[1]);
    const yesPct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
    const noPct  = no  <= 1 ? Math.round(no  * 100) : Math.round(no);
    if (Math.abs(yesPct + noPct - 100) > 15) return null;
    if (yesPct < 2 || yesPct > 98) return null;
    return yesPct;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || 'all';
  const params = CAT_QUERIES[category] || CAT_QUERIES.all;

  let events: any[] = [];
  let debugInfo: any = {};

  try {
    // Primary: use events endpoint with volume24hr sorting (shows currently active)
    const res = await fetch(
      `https://gamma-api.polymarket.com/events?${params}`,
      { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      events = Array.isArray(data) ? data : [];
    }
    debugInfo.primaryCount = events.length;
    debugInfo.sampleTitles = events.slice(0, 5).map((e: any) => e.title + ' [vol24:' + e.volume24hr + ' cat:' + e.category + ']');
  } catch (e: any) {
    debugInfo.error = e.message;
  }

  const seen = new Set<string>();
  const results: any[] = [];

  for (const event of events) {
    if (!event.slug || !event.title || seen.has(event.slug)) continue;
    seen.add(event.slug);

    const vol = parseFloat(event.volume || '0');
    const vol24 = parseFloat(event.volume24hr || '0');
    const cat = detectCat(event.title, event.category || event.subcategory);

    // For specific tabs, filter by category
    if (category !== 'all' && cat !== category) continue;

    results.push({
      slug: event.slug,
      title: event.title,
      url: 'https://polymarket.com/event/' + event.slug,
      volume: vol,
      volumeFormatted: fmtVol(vol),
      volume24h: vol24,
      volume24hFormatted: fmtVol(vol24),
      category: cat,
      icon: CAT_EMOJI[cat] || '🔮',
      yesPrice: getYesPrice(event),
      marketCount: (event.markets || []).length,
      endDate: event.endDate || '',
    });
  }

  // Sort by 24h volume — most active RIGHT NOW first
  results.sort((a, b) => b.volume24h - a.volume24h);

  return Response.json({
    results: results.slice(0, 20),
    debug: debugInfo,
  });
}
