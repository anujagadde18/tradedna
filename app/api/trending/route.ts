import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = ['fra1', 'lhr1', 'sin1']; // Non-US regions to avoid Polymarket geoblock

const CAT_KEYWORDS: Record<string, string[]> = {
  sports:     ['nba','nfl','ipl','cricket','basketball','football','soccer','tennis','golf','champion','playoff','league','world cup','match','vs','celtics','lakers','warriors','thunder','nuggets','heat','knicks','bucks','suns','mavs','mavericks','grizzlies','pacers','cavaliers','raptors','jazz','nets','bulls','hornets','wizards','pistons','timberwolves','clippers','spurs','hawks','pelicans','rockets','kings','blazers','magic','76ers','sixers','f1','formula','drivers','ufc','fifa','nhl','mlb','premier league','champions league','europa','masters','pga','open championship','wimbledon','us open','french open','olympics'],
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

const NBA_TEAMS: Record<string,string> = {
  'atl':'Hawks','bos':'Celtics','bkn':'Nets','cha':'Hornets','chi':'Bulls',
  'cle':'Cavaliers','dal':'Mavericks','den':'Nuggets','det':'Pistons','gsw':'Warriors',
  'hou':'Rockets','ind':'Pacers','lac':'Clippers','lal':'Lakers','mem':'Grizzlies',
  'mia':'Heat','mil':'Bucks','min':'Timberwolves','nop':'Pelicans','nyk':'Knicks',
  'okc':'Thunder','orl':'Magic','phi':'76ers','phx':'Suns','por':'Trail Blazers',
  'sac':'Kings','sas':'Spurs','tor':'Raptors','uta':'Jazz','was':'Wizards',
};
const NHL_TEAMS: Record<string,string> = {
  'tb':'Lightning','ott':'Senators','edm':'Oilers','utah':'Utah HC','cbj':'Blue Jackets',
  'det':'Red Wings','bos':'Bruins','tor':'Maple Leafs','mtl':'Canadiens','nyr':'Rangers',
  'pit':'Penguins','was':'Capitals','chi':'Blackhawks','col':'Avalanche','vgs':'Golden Knights',
};
const MLB_TEAMS: Record<string,string> = {
  'kc':'Royals','cle':'Guardians','ari':'Diamondbacks','nym':'Mets','atl':'Braves',
  'laa':'Angels','oak':'Athletics','nyy':'Yankees','bos':'Red Sox','lad':'Dodgers',
  'sf':'Giants','chc':'Cubs','cws':'White Sox','hou':'Astros','sea':'Mariners',
};

function teamsFromSlug(slug: string): { team1: string; team2: string } | null {
  // Format: nba-chi-was-2026-04-07 or mlb-kc-cle-2026-04-07
  const m = slug.match(/^(nba|nhl|mlb)-([a-z]+)-([a-z]+)-\d{4}/);
  if (!m) return null;
  const league = m[1];
  const a = m[2]; const b = m[3];
  const map = league === 'nba' ? NBA_TEAMS : league === 'nhl' ? NHL_TEAMS : MLB_TEAMS;
  const t1 = map[a]; const t2 = map[b];
  if (!t1 || !t2) return null;
  return { team1: t1, team2: t2 };
}

function getMoneylineOdds(event: any): number | null {
  try {
    const markets = event.markets || [];
    // Only look for true binary winner markets — skip props, totals, spreads
    for (const m of markets) {
      const q = (m.question || m.groupItemTitle || '').toLowerCase();
      const isWinner = q.includes('moneyline') || q === 'winner' ||
        q === 'win' || q.includes('win the game') ||
        q.includes('to win') || q.includes('will win');
      const isProps = q.includes('points') || q.includes('rebounds') ||
        q.includes('assists') || q.includes('total') || q.includes('over') ||
        q.includes('under') || q.includes('spread') || q.includes('quarter') ||
        q.includes('half') || q.includes('first') || q.includes('hits') ||
        q.includes('runs') || q.includes('strikeout');
      if (!isWinner || isProps) continue;
      const price = m.lastTradePrice || m.bestAsk;
      if (!price) continue;
      const pct = parseFloat(price) <= 1
        ? Math.round(parseFloat(price) * 100)
        : Math.round(parseFloat(price));
      if (pct >= 10 && pct <= 90) return pct;
    }
    return null;
  } catch { return null; }
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

    // For matchup markets — find the moneyline market (exactly 2 outcomes, no prop keywords)
    if (markets.length > 1) {
      const moneyline = markets.find((m: any) => {
        const q = (m.question || m.groupItemTitle || '').toLowerCase();
        // Skip prop bets
        if (q.includes('o/u') || q.includes('over') || q.includes('under') || 
            q.includes('spread') || q.includes('points') || q.includes('rebounds') ||
            q.includes('assists') || q.includes('goals') || q.includes('exact') ||
            q.includes('first half') || q.includes('1h') || q.includes('nrfi')) return false;
        // Prefer markets with exactly 2 outcomes (binary win/lose)
        const prices = m.outcomePrices ? (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices) : [];
        return prices.length === 2;
      });
      // Only use moneyline — never fall back to markets[0] which could be a prop
      if (moneyline?.outcomePrices) {
        const prices = typeof moneyline.outcomePrices === 'string'
          ? JSON.parse(moneyline.outcomePrices)
          : moneyline.outcomePrices;
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
  // Try multiple endpoints in case of geoblock
  const urls = [
    `https://gamma-api.polymarket.com/events?active=true&closed=false&archived=false&limit=${limit}&order=volume24hr&ascending=false`,
    `https://gamma-api.polymarket.com/events?active=true&limit=${limit}&order=volume&ascending=false`,
  ];
  
  for (const url of urls) {
    try {
      const res = await fetch(url, { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; PlayPicksAI/1.0)',
        }, 
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const d = await res.json();
      const results = Array.isArray(d) ? d : [];
      if (results.length > 0) return results;
    } catch { continue; }
  }
  return [];
}

// Fetch moneyline odds for a specific game event
async function fetchMoneyline(eventSlug: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?event_slug=${eventSlug}&limit=100`,
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const markets = Array.isArray(d) ? d : (d.markets || []);

    // Find the moneyline/winner market
    const moneyline = markets.find((m: any) => {
      const q = (m.question || m.groupItemTitle || '').toLowerCase();
      return q.includes('moneyline') || q === 'winner' ||
        q.includes('to win') || q.includes('win the game');
    }) || markets.find((m: any) => {
      // Fallback: binary market with 2 outcomes summing to ~100%
      if (!m.outcomePrices) return false;
      try {
        const p = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
        if (p.length !== 2) return false;
        const sum = parseFloat(p[0]) + parseFloat(p[1]);
        return sum > 0.9 && sum < 1.1;
      } catch { return false; }
    });

    if (!moneyline?.outcomePrices) return null;
    const prices = typeof moneyline.outcomePrices === 'string'
      ? JSON.parse(moneyline.outcomePrices) : moneyline.outcomePrices;
    const yes = parseFloat(prices[0]);
    const pct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
    return (pct >= 2 && pct <= 98) ? pct : null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') || 'all';
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000); // next 48 hours

  const events = await fetchLive(50);

  const seen = new Set<string>();
  const results: any[] = [];

  for (const event of events) {
    if (!event.slug || !event.title || seen.has(event.slug)) continue;
    seen.add(event.slug);
    // Filter esports and noise
    const slug = event.slug.toLowerCase();
    const t = (event.title || '').toLowerCase();
    const isEsports = slug.startsWith('lol-') || slug.startsWith('lpl-') || slug.startsWith('lck-') || slug.startsWith('lec-') || slug.includes('counter-strike') || slug.includes('dota') || slug.includes('dreamleague') || slug.includes('pgl-') || slug.includes('esports-world-cup') || t.includes('counter-strike') || t.includes('(bo3)') || t.includes('(bo5)') || t.includes('dota 2') || t.includes('lol:') || t.includes('iem rio');
    const isNoise = slug.includes('elon-musk') || slug.includes('of-tweets') || slug.includes('what-will-be-said') || slug.includes('yi-zhou') || slug.includes('kotov') || slug.includes('clavicular') || slug.includes('pregnancy') || t.includes('clavicular') || t.includes('pregnancy') || slug.includes('trump-today') || t.includes('trump today:');
    if (isEsports || isNoise) continue;

    const vol24 = parseFloat(event.volume24hr || '0');
    const vol   = parseFloat(event.volume || '0');
    if (vol24 <= 0 && vol <= 0) continue;

    const cat = detectCat(event.title, event.category || event.subcategory);
    if (category !== 'all' && cat !== category) continue;

    const teamNames = teamsFromSlug(event.slug);
    const yesPrice = getYesPrice(event) ?? getMoneylineOdds(event);

    // For game matchups — skip if already finished (yesPrice 95%+) or endDate passed
    const isGameMatchup = /^(nba|nhl|mlb|nfl|epl|ucl)-/.test(event.slug);
    if (isGameMatchup) {
      if (yesPrice !== null && (yesPrice >= 95 || yesPrice <= 5)) continue; // finished
      const endDate = event.endDate ? new Date(event.endDate) : null;
      if (endDate && endDate < now) continue; // already ended
    }

    // Clean up title for human readability
    const cleanTitle = (t: string): string => {
      return t
        .replace(/ by\.\.\.\?/gi, '?')
        .replace(/ by \.\.\./gi, '')
        .replace(/ \.\.\./gi, '')
        .replace(/\.\.\.\?/gi, '?')
        .replace(/^Will the /i, 'Will ')
        .replace(/^Who will /i, 'Who ')
        .replace(/United States/gi, 'US')
        .replace(/President of the US/gi, 'US President')
        .trim();
    };

    results.push({
      slug:               event.slug,
      title:              cleanTitle(event.title),
      url:                'https://polymarket.com/event/' + event.slug,
      volume:             vol,
      volumeFormatted:    fmtVol(vol),
      volume24h:          vol24,
      volume24hFormatted: fmtVol(vol24),
      category:           cat,
      icon:               CAT_EMOJI[cat] || '🔮',
      image:              event.image || event.featuredImage || null,
      yesPrice:           yesPrice ?? null,
      team1:              teamNames?.team1 || null,
      team2:              teamNames?.team2 || null,
      marketCount:        (event.markets || []).length,
      endDate:            event.endDate || '',
    });
  }

  results.sort((a, b) => b.volume24h - a.volume24h);
  return Response.json({ results: results.slice(0, 20) });
}
