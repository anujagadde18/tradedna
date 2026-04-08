import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

const CAT_KEYWORDS: Record<string, string[]> = {
  sports:     ['nba','nfl','ipl','cricket','basketball','football','soccer','tennis','golf','champion','playoff','league','world cup','match','vs','celtics','lakers','warriors','thunder','nuggets','heat','knicks','bucks','suns','mavs','mavericks','grizzlies','pacers','cavaliers','raptors','jazz','nets','bulls','hornets','wizards','pistons','timberwolves','clippers','spurs','hawks','pelicans','rockets','kings','blazers','magic','76ers','sixers','f1','formula','drivers','ufc','fifa','nhl','mlb','premier league','champions league','europa'],
  crypto:     ['bitcoin','btc','eth','ethereum','crypto','blockchain','solana','coin','defi','stablecoin','usdc','xrp','bnb','dogecoin'],
  politics:   ['trump','election','president','congress','senate','vote','tariff','democrat','republican','supreme court','governor','ballot','midterm','nominee','political'],
  technology: ['ai','openai','gpt','model','artificial intelligence','microsoft','google','nvidia','anthropic','chatgpt','gemini','tech','software','startup'],
  economics:  ['fed','federal reserve','rates','inflation','recession','gdp','unemployment','interest','economy','treasury','dollar','market cap','tariff'],
  world:      ['ukraine','russia','iran','china','nato','war','ceasefire','israel','gaza','military','nuclear','taiwan','north korea','sanctions','geopolit'],
};

const CAT_EMOJI: Record<string, string> = {
  sports:'🏆', crypto:'₿', politics:'🗳️', technology:'🤖', economics:'📈', world:'🌍', other:'🔮',
};

function detectCat(title: string, apiCat?: string): string {
  if (apiCat) {
    const c = apiCat.toLowerCase();
    if (c.includes('sport') || c.includes('cricket') || c.includes('nba') || c.includes('football')) return 'sports';
    if (c.includes('crypto') || c.includes('bitcoin')) return 'crypto';
    if (c.includes('politic') || c.includes('election')) return 'politics';
    if (c.includes('tech') || c.includes('ai')) return 'technology';
    if (c.includes('econom') || c.includes('finance')) return 'economics';
    if (c.includes('world') || c.includes('geopolit')) return 'world';
  }
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

    // For binary markets (single market, YES/NO)
    if (markets.length === 1) {
      const m = markets[0];
      const prices = m.outcomePrices
        ? (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices)
        : null;
      if (prices && prices.length >= 2) {
        const yes = parseFloat(prices[0]);
        const no  = parseFloat(prices[1]);
        const yesPct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
        const noPct  = no  <= 1 ? Math.round(no  * 100) : Math.round(no);
        if (Math.abs(yesPct + noPct - 100) <= 15 && yesPct >= 2 && yesPct <= 98) return yesPct;
      }
      if (m.lastTradePrice) {
        const p = parseFloat(m.lastTradePrice);
        const pct = p <= 1 ? Math.round(p * 100) : Math.round(p);
        if (pct >= 2 && pct <= 98) return pct;
      }
    }

    // For matchup markets — find the moneyline "win" market
    if (markets.length > 1) {
      const moneyline = markets.find((m: any) => {
        const q = (m.question || m.groupItemTitle || '').toLowerCase();
        return q.includes('moneyline') || q.includes('win') || q.includes('winner');
      });
      const target = moneyline || markets[0];
      if (target?.outcomePrices) {
        const prices = typeof target.outcomePrices === 'string'
          ? JSON.parse(target.outcomePrices)
          : target.outcomePrices;
        if (prices && prices.length >= 2) {
          const yes = parseFloat(prices[0]);
          const yesPct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
          if (yesPct >= 2 && yesPct <= 98) return yesPct;
        }
      }
    }
    return null;
  } catch { return null; }
}

// Fetch using volume24hr sort — gets what's actively trading RIGHT NOW
async function fetchLive(limit = 50): Promise<any[]> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/events?active=true&closed=false&archived=false&limit=${limit}&order=volume24hr&ascending=false`,
      { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

// Fetch binary sports matchup markets directly — these have real win % odds
async function fetchSportsMatchups(): Promise<any[]> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?active=true&closed=false&archived=false&limit=50&order=volume24hr&ascending=false`,
      { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
    );
    if (!res.ok) return [];
    const d = await res.json();
    const markets = Array.isArray(d) ? d : (d.markets || []);

    // Filter to binary sports matchups with real odds
    return markets.filter((m: any) => {
      const q = (m.question || '').toLowerCase();
      const isMatchup = q.includes(' vs ') || q.includes(' v ') ||
        (q.includes('will ') && q.includes(' win'));
      const hasPrices = m.outcomePrices && m.outcomePrices !== '[]';
      const vol = parseFloat(m.volume24hr || m.volumeNum || '0');
      return isMatchup && hasPrices && vol > 1000;
    }).slice(0, 30);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || 'all';

  // Fetch both events (for images/featured) and markets (for real odds)
  const [events, matchupMarkets] = await Promise.all([
    fetchLive(50),
    fetchSportsMatchups(),
  ]);

  // Build a slug→yesPrice map from direct market data
  const matchupOdds: Record<string, { yesPrice: number; team1: string; team2: string }> = {};
  for (const m of matchupMarkets) {
    try {
      const prices = typeof m.outcomePrices === 'string'
        ? JSON.parse(m.outcomePrices)
        : m.outcomePrices;
      if (!prices || prices.length < 2) continue;
      const outcomes = typeof m.outcomes === 'string'
        ? JSON.parse(m.outcomes)
        : (m.outcomes || []);
      const yes = parseFloat(prices[0]);
      const no  = parseFloat(prices[1]);
      const yesPct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
      const noPct  = no  <= 1 ? Math.round(no  * 100) : Math.round(no);
      if (yesPct < 2 || yesPct > 98) continue;
      if (Math.abs(yesPct + noPct - 100) > 15) continue;
      const slug = m.slug || m.eventSlug || '';
      const eventSlug = slug.split('/')[0];
      if (eventSlug && !matchupOdds[eventSlug]) {
        matchupOdds[eventSlug] = {
          yesPrice: yesPct,
          team1: outcomes[0] || '',
          team2: outcomes[1] || '',
        };
      }
    } catch {}
  }

  const seen = new Set<string>();
  const results: any[] = [];

  for (const event of events) {
    if (!event.slug || !event.title || seen.has(event.slug)) continue;
    seen.add(event.slug);

    const vol24 = parseFloat(event.volume24hr || '0');
    const vol   = parseFloat(event.volume || '0');
    if (vol24 <= 0 && vol <= 0) continue;

    const cat = detectCat(event.title, event.category || event.subcategory);
    if (category !== 'all' && cat !== category) continue;

    // Use direct market odds if available, fallback to event-level extraction
    const directOdds = matchupOdds[event.slug];
    const yesPrice = directOdds?.yesPrice ?? getYesPrice(event);

    results.push({
      slug:              event.slug,
      title:             event.title,
      url:               'https://polymarket.com/event/' + event.slug,
      volume:            vol,
      volumeFormatted:   fmtVol(vol),
      volume24h:         vol24,
      volume24hFormatted: fmtVol(vol24),
      category:          cat,
      icon:              CAT_EMOJI[cat] || '🔮',
      image:             event.image || event.featuredImage || null,
      yesPrice,
      team1:             directOdds?.team1 || null,
      team2:             directOdds?.team2 || null,
      marketCount:       (event.markets || []).length,
      endDate:           event.endDate || '',
    });
  }

  // Sort by 24h volume — most active right now first
  results.sort((a, b) => b.volume24h - a.volume24h);

  return Response.json({ results: results.slice(0, 20) });
}
// test
