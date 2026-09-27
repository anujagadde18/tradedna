import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = ['fra1', 'lhr1', 'sin1']; // Non-US regions to avoid Polymarket geoblock

const CAT_KEYWORDS: Record<string, string[]> = {
  sports:     ['nba','nfl','ipl','cricket','basketball','football','soccer','tennis','golf','champion','playoff','league','world cup','match','vs','celtics','lakers','warriors','thunder','nuggets','heat','knicks','bucks','suns','mavs','mavericks','grizzlies','pacers','cavaliers','raptors','jazz','nets','bulls','hornets','wizards','pistons','timberwolves','clippers','spurs','hawks','pelicans','rockets','kings','blazers','magic','76ers','sixers','f1','formula','drivers','ufc','fifa','nhl','mlb','premier league','champions league','europa','masters','pga','open championship','wimbledon','us open','french open','olympics','ballon','grand prix','la liga','serie a','bundesliga','ligue 1','mls','wnba','t20','test match'],
  crypto:     ['bitcoin','btc','eth','ethereum','crypto','blockchain','solana','coin','defi','stablecoin','usdc','xrp','bnb','dogecoin'],
  politics:   ['trump','election','president','congress','senate','vote','tariff','democrat','republican','supreme court','governor','ballot','midterm','nominee','political','prime minister','minister','parliament','chancellor','coalition'],
  technology: ['ai','openai','gpt','model','artificial intelligence','microsoft','google','nvidia','anthropic','chatgpt','gemini','tech','software','startup'],
  economics:  ['fed','federal reserve','rates','inflation','recession','gdp','unemployment','interest','economy','treasury','dollar','market cap','tariff','oil','crude','wti','opec','cpi','payrolls'],
  world:      ['ukraine','russia','iran','china','nato','war','ceasefire','israel','gaza','military','nuclear','taiwan','north korea','sanctions','geopolit','strait','hormuz','ceasefire','un security','iranian','blockade'],
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
  // Whole-word matching so 'eth' cannot match 'Ethiopia' and 'ai' cannot match 'Strait'
  const hasWord = (kw: string) => {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)').test(t);
  };
  let best = 'other'; let bestScore = 0;
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    const score = kws.filter(hasWord).length;
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
    
    // Find the moneyline market - binary (2 outcomes), no prop keywords
    const moneyline = markets.find((m: any) => {
      const q = (m.question || m.groupItemTitle || '').toLowerCase();
      // Skip prop bets
      if (q.includes('o/u') || q.includes('over') || q.includes('under') ||
          q.includes('spread') || q.includes('points') || q.includes('rebounds') ||
          q.includes('assists') || q.includes('total') || q.includes('quarter') ||
          q.includes('half') || q.includes('first') || q.includes('hits') ||
          q.includes('runs') || q.includes('strikeout') || q.includes('exact') ||
          q.includes('score') || q.includes('nrfi')) return false;
      // Must have exactly 2 outcome prices
      const prices = m.outcomePrices 
        ? (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices)
        : [];
      return prices.length === 2;
    });
    
    if (!moneyline) return null;
    
    const prices = moneyline.outcomePrices
      ? (typeof moneyline.outcomePrices === 'string' ? JSON.parse(moneyline.outcomePrices) : moneyline.outcomePrices)
      : null;
    if (!prices || prices.length < 2) return null;
    
    const yes = parseFloat(prices[0]);
    const pct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
    if (pct >= 5 && pct <= 95) return pct;
    return null;
  } catch { return null; }
}

function fmtVol(v: number): string {
  if (v >= 1_000_000) return '$' + (v/1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return '$' + (v/1_000).toFixed(0) + 'K';
  return '$' + Math.round(v);
}

// For multi-outcome events, find the leading answer and its live price.
// For single-market events, surface the market's answer name when it differs from the title.
// A game that has already been played is not a prediction. Ranking by 24h volume
// surfaces exactly these - a match that just ended has the day's highest volume -
// which is why the homepage filled up with blank rows. Verified against live data:
// every blank row was a fixture whose endDate had passed.
function isEventFinished(event: any): boolean {
  try {
    const markets = event.markets || [];
    const ml = markets.filter((m: any) => String(m.sportsMarketType || '').toLowerCase() === 'moneyline');
    // The clearest signal: the who-wins market has settled.
    if (ml.length > 0 && ml.every((m: any) => m.closed === true)) return true;
    // Verified against the live API (Houston Astros vs. Athletics, 27 Sep 2026):
    // MLB leaves its moneyline OPEN with endDate a week out, but prices it at
    // 0.9995 once the game is decided. So a moneyline pinned to near-certainty is
    // a finished game regardless of the closed flag or the date.
    for (const m of ml) {
      try {
        const prices = (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices) || [];
        const nums = prices.map((x: any) => parseFloat(x)).filter((n: number) => Number.isFinite(n));
        if (nums.length >= 2 && Math.max(...nums) >= 0.99) return true;
      } catch { /* unparseable prices tell us nothing */ }
    }
    // Otherwise fall back to the scheduled end time, with a small grace period so a
    // game in progress still counts as live.
    const end = event.endDate ? new Date(event.endDate).getTime() : null;
    if (end && end < Date.now() - 30 * 60 * 1000) {
      // Long-dated markets (championships, elections) legitimately sit past a stale
      // endDate, so only treat short-horizon sports fixtures as finished.
      const isFixture = /\svs\.?\s/i.test(String(event.title || ''));
      if (isFixture) return true;
    }
    return false;
  } catch { return false; }
}

function getTopOutcome(event: any): { name: string; prob: number } | null {
  try {
    const rawTitle = String(event?.title || '');
    const eventTitle = rawTitle.toLowerCase();

    // Verified against a live gamma response (Chargers vs. Bills, 27 Sep 2026):
    //  - the moneyline market has NO groupItemTitle; its question is the matchup title
    //  - the team names live in outcomes: "[\"Chargers\", \"Bills\"]"
    //  - outcomePrices lines up with outcomes: ["0","1"] means the second side won
    //  - a finished game is markets[].closed = true even while event.closed = false
    // Six earlier attempts guessed at this shape instead of reading it.
    const parseArr = (v: any): string[] => {
      try {
        const a = typeof v === 'string' ? JSON.parse(v) : v;
        return Array.isArray(a) ? a.map((x: any) => String(x)) : [];
      } catch { return []; }
    };

    const allMarkets = event.markets || [];
    const openMarkets = allMarkets.filter((m: any) => m && m.closed !== true);

    const clean = (s: string) => {
      const t = String(s || '').replace(/[\u2190-\u21FF\u2B00-\u2BFF]/g, '').replace(/\s+/g, ' ').trim();
      return t.length > 34 ? t.slice(0, 33).trimEnd() + '\u2026' : t;
    };

    // Reads the leading side of a two-way market from its own outcomes array.
    const readTwoWay = (m: any): { name: string; prob: number } | null => {
      const names = parseArr(m.outcomes);
      const prices = parseArr(m.outcomePrices).map(p => parseFloat(p));
      if (names.length < 2 || prices.length < 2) return null;
      let bestI = 0;
      for (let i = 1; i < prices.length; i++) if (prices[i] > prices[bestI]) bestI = i;
      const pct = Math.round((prices[bestI] <= 1 ? prices[bestI] * 100 : prices[bestI]));
      if (!Number.isFinite(pct)) return null;
      const name = String(names[bestI] || '').trim();
      if (!name || /^(yes|no)$/i.test(name)) return null;   // Yes/No is not a team
      return { name, prob: pct };
    };

    // 1. Sports: the moneyline market is the who-wins line, labelled by the API.
    const moneyline = openMarkets.find((m: any) =>
      String(m.sportsMarketType || '').toLowerCase() === 'moneyline');
    if (moneyline) {
      const r = readTwoWay(moneyline);
      // A game in progress or just finished sits at 99/1 and tells the reader nothing.
      if (r && r.prob < 99 && r.prob > 1) return { name: clean(r.name), prob: r.prob };
      return null;
    }

    // If every moneyline in the bundle has closed, the game is over. Say nothing
    // rather than reporting a settled price as if it were a live chance.
    const closedMoneyline = allMarkets.some((m: any) =>
      String(m.sportsMarketType || '').toLowerCase() === 'moneyline' && m.closed === true);
    if (closedMoneyline) return null;

    // 2. Two-way market with real team names. Baseball bundles carry 30+ prop markets
    //    alongside the main line, so the old 3-market limit skipped them entirely.
    const isFixtureTitle = /\svs\.?\s/i.test(rawTitle);
    if (openMarkets.length <= 3 || isFixtureTitle) {
      for (const m of openMarkets) {
        const smt = String(m.sportsMarketType || '').toLowerCase();
        if (smt && smt !== 'moneyline') continue;
        const r = readTwoWay(m);
        if (r && r.prob < 99 && r.prob > 1) return { name: clean(r.name), prob: r.prob };
      }
    }

    // 3. Multi-outcome events (elections, championships, price ladders): each market
    //    is one candidate, named by groupItemTitle.
    const PROP_TERMS = /\bo\/u\b|over|under|innings|spread|handicap|moneyline|anytime|touchdown|first half|second half|\b[1-4][hq]\b|quarter|period|rebounds|assists|strikeouts|goals scored|points\b|\+\d|\-\d\.\d|exact margin|margin of|winning margin|\bby \d|correct score|both teams|clean sheet|\bhalftime\b|\bovertime\b|shutout/;

    const candidates: { name: string; prob: number }[] = [];
    for (const m of openMarkets) {
      const smt = String(m.sportsMarketType || '').toLowerCase();
      if (smt && smt !== 'moneyline') continue;           // API says it is a prop
      const name = String(m.groupItemTitle || '').trim();  // real candidates carry this
      if (!name) continue;
      const n = name.toLowerCase();
      if (/^team [a-z]$/.test(n)) continue;
      if (/^(other|others|none|no winner|field|any other)\b/.test(n)) continue;
      if (/^draw\b|^tie\b/.test(n)) continue;
      if (PROP_TERMS.test(n)) continue;
      if (eventTitle && n.length > 12 && eventTitle.startsWith(n.slice(0, 12))) continue;
      const prices = parseArr(m.outcomePrices).map(p => parseFloat(p));
      if (prices.length < 2) continue;
      const pct = Math.round(prices[0] <= 1 ? prices[0] * 100 : prices[0]);
      if (!Number.isFinite(pct) || pct < 1 || pct > 99) continue;
      candidates.push({ name, prob: pct });
    }

    if (candidates.length === 0) return null;
    const sorted = candidates.slice().sort((a, b) => b.prob - a.prob);

    // Threshold ladders (Bitcoin above X) top out near certainty, which says nothing.
    const nearCertain = candidates.filter(o => o.prob >= 97).length;
    const contested = candidates.filter(o => o.prob < 97 && o.prob > 5).length;
    const pick = (nearCertain >= 2 || (nearCertain >= 1 && contested >= 1))
      ? sorted.filter(o => o.prob < 97)[0] || sorted[0]
      : sorted[0];
    if (!pick) return null;
    return { name: clean(pick.name), prob: pick.prob };
  } catch { return null; }
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
          'User-Agent': 'Mozilla/5.0 (compatible; CallIt/1.0)',
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
      isFinished:         isEventFinished(event),
      topOutcome:         getTopOutcome(event),
      endDate:            event.endDate || '',
    });
  }

  results.sort((a, b) => b.volume24h - a.volume24h);
  return Response.json({ results: results.slice(0, 20) });
}
// cache bust Mon Jun 15 20:22:21 CDT 2026
// cache bust Mon Jun 15 20:45:30 CDT 2026
// cache bust Mon Jun 15 20:46:53 CDT 2026
