import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

// Category queries that reliably return CURRENT markets
const CATEGORY_QUERIES: Record<string, string[]> = {
  all:        ['Trump tariffs 2026', 'NBA champion 2026', 'Bitcoin 2026', 'IPL 2026', 'Ukraine ceasefire', 'Fed rates 2026', 'AI model 2026'],
  sports:     ['NBA champion 2026', 'IPL 2026', 'Champions League 2026', 'NFL 2026', 'NBA playoffs 2026'],
  crypto:     ['Bitcoin price 2026', 'Ethereum 2026', 'crypto 2026', 'stablecoin 2026'],
  politics:   ['Trump 2026', 'US election 2026', 'Congress 2026', 'tariffs 2026', 'government 2026'],
  technology: ['OpenAI 2026', 'AI model 2026', 'GPT 2026', 'Google AI 2026', 'tech 2026'],
  economics:  ['Fed rates 2026', 'recession 2026', 'inflation 2026', 'GDP 2026'],
  world:      ['Ukraine ceasefire', 'Iran 2026', 'China 2026', 'NATO 2026'],
};

const CAT_KEYWORDS: Record<string, string[]> = {
  sports:     ['nba','nfl','ipl','cricket','basketball','football','soccer','tennis','golf','champion','playoff','league','cup','match','game','team'],
  crypto:     ['bitcoin','btc','eth','ethereum','crypto','blockchain','solana','coin','defi'],
  politics:   ['trump','election','president','congress','senate','vote','tariff','democrat','republican','governor','supreme court'],
  technology: ['ai','openai','gpt','model','artificial intelligence','microsoft','google','nvidia','anthropic','chatgpt','gemini','tech'],
  economics:  ['fed','federal reserve','rates','inflation','recession','gdp','unemployment','tariff','interest','economy'],
  world:      ['ukraine','russia','iran','china','nato','war','ceasefire','israel','gaza','military','nuclear'],
};

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  let best = 'other'; let bestScore = 0;
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    const score = kws.filter(kw => t.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

const CAT_EMOJI: Record<string, string> = {
  sports:'🏆', crypto:'₿', politics:'🗳️', technology:'🤖', economics:'📈', world:'🌍', other:'🔮',
};

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
          ? JSON.parse(markets[0].outcomePrices)
          : markets[0].outcomePrices)
      : null;
    if (!prices || prices.length < 2) return null;
    const yes = parseFloat(prices[0]);
    const no  = parseFloat(prices[1]);
    const yesPct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
    const noPct  = no  <= 1 ? Math.round(no  * 100) : Math.round(no);
    const sum = yesPct + noPct;
    if (sum < 85 || sum > 115) return null;
    if (yesPct < 2 || yesPct > 98) return null;
    return yesPct;
  } catch { return null; }
}

// Only keep events that end in the future
function isCurrent(event: any): boolean {
  if (!event.endDate) return true;
  return new Date(event.endDate) > new Date();
}

async function search(q: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/events?q=${encodeURIComponent(q)}&active=true&limit=8`,
      { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || 'all';
  const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.all;

  const batches = await Promise.all(queries.map(search));

  const seen = new Set<string>();
  const results: any[] = [];

  for (const batch of batches) {
    for (const event of batch) {
      if (!event.slug || !event.title || seen.has(event.slug)) continue;
      if (!isCurrent(event)) continue;
      seen.add(event.slug);

      const vol = parseFloat(event.volume || '0');
      if (vol < 100) continue;

      const cat = detectCategory(event.title);
      // For specific category tabs, filter strictly
      if (category !== 'all' && cat !== category) continue;

      results.push({
        slug: event.slug,
        title: event.title,
        url: 'https://polymarket.com/event/' + event.slug,
        volume: vol,
        volumeFormatted: fmtVol(vol),
        category: cat,
        icon: CAT_EMOJI[cat] || '🔮',
        yesPrice: getYesPrice(event),
        marketCount: (event.markets || []).length,
        endDate: event.endDate || '',
      });
    }
  }

  // Sort by volume, dedupe
  results.sort((a, b) => b.volume - a.volume);

  return Response.json({ results: results.slice(0, 20) });
}
