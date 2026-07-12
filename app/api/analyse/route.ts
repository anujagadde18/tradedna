import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = ['fra1', 'lhr1', 'sin1']; // Non-US regions — Polymarket geoblocks US servers, same fix as /api/trending

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function extractKeywords(query: string): string {
  const stop = new Set(['will','there','that','this','what','when','have','does','with','would','the','and','for','are','by','in','on','at','to','of','a','an','be','is','it','any','over','than','more','less','how','who','which','where','why','can','could','should','may','might']);
  return query.replace(/[?!.,]/g, '').split(' ').filter(w => w.length > 2 && !stop.has(w.toLowerCase())).slice(0, 6).join(' ');
}

function detectMarketType(query: string): string {
  const q = query.toLowerCase();
  if (/ipl|cricket|srh|rcb|csk|kkr|mi |pbks|rr |gt |lsg|dc /.test(q)) return 'cricket';
  if (/nba|lakers|celtics|thunder|warriors|knicks|bucks|heat|nuggets|playoff/.test(q)) return 'nba';
  if (/formula 1|f1|verstappen|hamilton|leclerc|norris|grand prix|antonelli|russell|piastri/.test(q)) return 'f1';
  if (/champions league|ucl|premier league|bundesliga|la liga|serie a|ligue 1|euro|copa|fifa|world cup|mls|epl/.test(q)) return 'soccer';
  if (/eurovision|esc 2026/.test(q)) return 'eurovision';
  if (/french open|roland garros|wimbledon|us open|australian open|tennis/.test(q)) return 'tennis';
  if (/fed |federal reserve|rate cut|rate hike|fomc|inflation|gdp|cpi|recession|interest rate/.test(q)) return 'economics';
  if (/bitcoin|btc|ethereum|eth|crypto|solana|doge|coinbase|binance/.test(q)) return 'crypto';
  if (/election|president|prime minister|senator|congress|vote|poll|macron|trump|biden|harris|starmer/.test(q)) return 'politics';
  if (/iran|israel|ukraine|russia|china|nato|war|ceasefire|peace deal|military|conflict/.test(q)) return 'geopolitics';
  return 'general';
}

// ---------- Single team database: strength (0-100, for probability calc) + context (for AI reasoning) ----------
// Strength ratings are an illustrative relative model, not a claim of precision — refined over time as results come in.
const TEAM_DB: Record<string, { strength: number; ctx: string }> = {
  // World Cup 2026
  spain:        { strength: 88, ctx: 'Spain: FIFA #1, EURO 2024 champions. Yamal, Pedri, Nico Williams, Rodri anchors midfield.' },
  france:       { strength: 86, ctx: 'France: FIFA #2. Mbappe at peak powers. Tchouameni, Rabiot midfield, deep squad.' },
  argentina:    { strength: 83, ctx: 'Argentina: 2022 champions. Messi final World Cup at 38. Alvarez, Mac Allister, De Paul.' },
  brazil:       { strength: 82, ctx: 'Brazil: Vinicius Jr, Rodrygo, Endrick. 5x champions but none since 2002.' },
  germany:      { strength: 80, ctx: 'Germany: Musiala, Wirtz young core. Rebuilding under Nagelsmann.' },
  england:      { strength: 78, ctx: 'England: Bellingham, Saka, Foden. Lost EURO 2024 final to Spain.' },
  portugal:     { strength: 77, ctx: 'Portugal: Ronaldo, 41, likely final World Cup. Vitinha, Leao, Bruno Fernandes.' },
  netherlands:  { strength: 76, ctx: 'Netherlands: deep technical squad, Van Dijk, Gakpo, De Jong.' },
  belgium:      { strength: 75, ctx: 'Belgium: De Bruyne leads a golden generation closing its window.' },
  italy:        { strength: 72, ctx: 'Italy: defensively organized, tournament pedigree.' },
  uruguay:      { strength: 70, ctx: 'Uruguay: 2x World Cup winners. Nunez, Valverde lead the new generation.' },
  croatia:      { strength: 68, ctx: 'Croatia: experienced tournament team, reliable at World Cups.' },
  morocco:      { strength: 63, ctx: 'Morocco: 2022 semifinalists, well-organized defense.' },
  mexico:       { strength: 65, ctx: 'Mexico: host nation, Raul Jimenez and Lozano, Azteca Stadium crowd.' },
  usa:          { strength: 62, ctx: 'USA: host nation. Pulisic, McKennie, Reyna, Musah. Big home crowd advantage.' },
  japan:        { strength: 60, ctx: 'Japan: technical, well-organized, has produced upsets before.' },
  senegal:      { strength: 60, ctx: 'Senegal: Africa Cup of Nations champions. Mane leads the attack.' },
  canada:       { strength: 58, ctx: 'Canada: host nation. Alphonso Davies, home crowd advantage.' },
  'south korea':{ strength: 58, ctx: 'South Korea: technical, fast counter-attacking team.' },
  nigeria:      { strength: 55, ctx: 'Nigeria: athletic, talented individual players.' },
  australia:    { strength: 52, ctx: 'Australia: physical, well-organized underdogs.' },
  egypt:        { strength: 52, ctx: 'Egypt: relies heavily on Mohamed Salah to create chances.' },
  ecuador:      { strength: 50, ctx: 'Ecuador: athletic, direct attacking style.' },
  'saudi arabia':{ strength: 50, ctx: 'Saudi Arabia: shocked Argentina in 2022. Counter-attack specialists, no home advantage in North America.' },
  iran:         { strength: 48, ctx: 'Iran: solid, well-organized defensive team.' },
  paraguay:     { strength: 48, ctx: 'Paraguay: physical, defensive-minded underdogs.' },
  bolivia:      { strength: 40, ctx: 'Bolivia: normally plays at altitude, a different challenge in North America.' },
  bosnia:       { strength: 40, ctx: 'Bosnia: first-ever World Cup appearance. Edin Dzeko aging but experienced.' },
  jordan:       { strength: 38, ctx: 'Jordan: first-ever World Cup appearance, major underdogs.' },
  'new zealand':{ strength: 35, ctx: 'New Zealand: physical, set-piece threat, major underdogs.' },
  'cape verde': { strength: 28, ctx: 'Cape Verde: FIFA ranked ~68th, first-ever World Cup, tiny island nation.' },
  'cabo verde': { strength: 28, ctx: 'Cabo Verde: FIFA ranked ~68th, first-ever World Cup.' },
  curacao:      { strength: 20, ctx: 'Curacao: smallest nation in the tournament, heavy underdogs.' },
  'curaçao':    { strength: 20, ctx: 'Curaçao: smallest nation in the tournament, heavy underdogs.' },
  // NBA (post-2026-Finals state)
  knicks:       { strength: 70, ctx: '2026 NBA champions. Beat Spurs 4-1 in the Finals. Brunson was Finals MVP.' },
  spurs:        { strength: 60, ctx: 'Lost the 2026 NBA Finals 1-4. Wembanyama leads a young core that will be back.' },
  thunder:      { strength: 78, ctx: 'Oklahoma City Thunder: best record in the NBA, SGA the MVP frontrunner.' },
  nuggets:      { strength: 64, ctx: 'Denver Nuggets: Jokic playing at an MVP level, 2023 champions.' },
  lakers:       { strength: 58, ctx: 'LA Lakers: LeBron James and Anthony Davis, veteran core.' },
  celtics:      { strength: 50, ctx: 'Boston Celtics: deep roster but lost early in the 2026 playoffs, a real upset.' },
  bucks:        { strength: 60, ctx: 'Milwaukee Bucks: Giannis Antetokounmpo and Damian Lillard, top East threat.' },
  warriors:     { strength: 54, ctx: 'Golden State Warriors: Stephen Curry still an elite shooter.' },
  heat:         { strength: 54, ctx: 'Miami Heat: Jimmy Butler, strong playoff culture under Spoelstra.' },
  timberwolves: { strength: 56, ctx: 'Minnesota Timberwolves: Anthony Edwards, strong defense.' },
  // World Cup 2026 — additional teams as they show up live
  'south africa': { strength: 50, ctx: 'South Africa: mid-tier African side, physical and well-organized.' },
  czechia:      { strength: 57, ctx: 'Czechia: solid European side, organized defensively.' },
  haiti:        { strength: 35, ctx: 'Haiti: first major tournament appearance in decades, big underdogs.' },
  qatar:        { strength: 45, ctx: 'Qatar: 2022 hosts, reigning AFC champions, moderate level.' },
  scotland:     { strength: 62, ctx: 'Scotland: physical, well-drilled European side.' },
  tunisia:      { strength: 52, ctx: 'Tunisia: regular African qualifier, disciplined defense.' },
  norway:       { strength: 68, ctx: 'Norway: Haaland leads a dangerous attack, Odegaard creative hub.' },
  iraq:         { strength: 38, ctx: 'Iraq: first-time qualifier in decades, major underdogs.' },
  algeria:      { strength: 58, ctx: 'Algeria: talented squad, strong African pedigree.' },
  'ivory coast':{ strength: 58, ctx: 'Ivory Coast: Africa Cup of Nations holders, athletic and dangerous.' },
  turkiye:      { strength: 68, ctx: 'Türkiye: talented squad, strong recent European form.' },
  turkey:       { strength: 68, ctx: 'Turkey: talented squad, strong recent European form.' },
  sweden:       { strength: 66, ctx: 'Sweden: technical, well-organized Scandinavian side.' },
  switzerland:  { strength: 70, ctx: 'Switzerland: organized and resilient, beat Colombia on penalties in the Round of 16.' },
};

// Context-only entries — no calibrated strength model exists for these, so probability defaults to market odds or 50.
const EXTRA_CONTEXT: Record<string, string> = {
  zverev: 'Alexander Zverev: top-5 ranked, strong clay-court record.',
  alcaraz: 'Carlos Alcaraz: former world No.1, all-surface threat, strong big-match temperament.',
  sinner: 'Jannik Sinner: world No.1, dominant on hard and clay courts.',
  djokovic: 'Novak Djokovic: 24 Grand Slams, elite at every Slam even late in his career.',
  medvedev: 'Daniil Medvedev: hard-court specialist, less comfortable on clay.',
  mensik: 'Jakub Mensik: rising young talent, big serve, real upset potential.',
  verstappen: "Max Verstappen: dominant in recent years, but the 2026 regulation reset hurt Red Bull's pace.",
  hamilton: 'Lewis Hamilton: Ferrari. Won the 2026 Barcelona GP, Ferrari first win since Mexico 2024.',
  leclerc: 'Charles Leclerc: Ferrari. Often fast in qualifying, racecraft battles with teammate Hamilton.',
  norris: 'Lando Norris: McLaren. Defending champion pedigree, chasing consistency in 2026.',
  russell: 'George Russell: Mercedes. Podium-capable, fighting Antonelli for status as team lead.',
  antonelli: 'Kimi Antonelli: Mercedes rookie sensation, championship-leading pace, retired from Barcelona with an engine failure.',
  piastri: 'Oscar Piastri: McLaren. Calm, consistent, capable of podiums on the right weekend.',
  psg: 'Paris Saint-Germain: rebuilding around younger talent, dominant domestically.',
  bayern: 'Bayern Munich: Harry Kane leading scorer, Bundesliga champions, deep UCL experience.',
  'real madrid': 'Real Madrid: record 15 UCL titles, Vinicius Jr and Bellingham, strong home form.',
  barcelona: 'Barcelona: Pedri and Yamal, possession-heavy attacking football.',
  arsenal: 'Arsenal: Premier League title contenders, Saka and Odegaard central to their game.',
  'manchester city': 'Manchester City: Guardiola system, Haaland scoring, deep UCL pedigree.',
};

const TEAM_ALIASES: Record<string, string> = {
  'korea republic': 'south korea',
  "cote d'ivoire": 'ivory coast',
  "côte d'ivoire": 'ivory coast',
  'united states': 'usa',
};

function wordBoundaryIndex(haystack: string, needle: string): number {
  // Escape regex special chars (apostrophes etc.), then require a word boundary on both sides
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'i');
  const m = haystack.match(re);
  return m ? m.index! : -1;
}

function findTeamsInQuery(query: string): { name: string; strength: number; ctx: string; idx: number }[] {
  const q = query.toLowerCase();
  const found: { name: string; strength: number; ctx: string; idx: number }[] = [];
  for (const [name, data] of Object.entries(TEAM_DB)) {
    const idx = wordBoundaryIndex(q, name);
    if (idx !== -1) found.push({ name, strength: data.strength, ctx: data.ctx, idx });
  }
  for (const [alias, canonical] of Object.entries(TEAM_ALIASES)) {
    const idx = wordBoundaryIndex(q, alias);
    if (idx !== -1 && !found.some(f => f.name === canonical)) {
      const data = TEAM_DB[canonical];
      if (data) found.push({ name: canonical, strength: data.strength, ctx: data.ctx, idx });
    }
  }
  // "US" as a country reference is only safe to detect in its capitalized form (e.g. "Turkiye vs US").
  // Lowercase "us" is almost always the pronoun, and a false match here would pollute the AI
  // reasoning prompt with USA context for an unrelated question, not just the probability number.
  if (!found.some(f => f.name === 'usa')) {
    const capUsIdx = query.search(/(?:^|[^a-zA-Z])US(?:$|[^a-zA-Z])/);
    if (capUsIdx !== -1) {
      const data = TEAM_DB['usa'];
      if (data) found.push({ name: 'usa', strength: data.strength, ctx: data.ctx, idx: capUsIdx });
    }
  }
  found.sort((a, b) => a.idx - b.idx);
  return found;
}

function findExtraContext(query: string): string[] {
  const q = query.toLowerCase();
  return Object.entries(EXTRA_CONTEXT).filter(([k]) => q.includes(k)).map(([, v]) => v);
}

// The ONLY place a probability number gets decided. Market odds (real money) always win.
// Otherwise: Bradley-Terry on the team-strength table. Otherwise: honest 50/50 — never a fake default.
function calculateProbability(teams: { strength: number }[], marketOdds: number | null): number {
  if (marketOdds && marketOdds > 0) return marketOdds;
  if (teams.length >= 2) {
    const t1 = teams[0].strength, t2 = teams[1].strength;
    const prob = Math.round((t1 / (t1 + t2)) * 100);
    return Math.max(10, Math.min(90, prob));
  }
  return 50;
}

async function findLiveMarketOdds(team1Name: string, team2Name: string): Promise<number | null> {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?active=true&closed=false&archived=false&limit=150&order=volume24hr&ascending=false',
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const events = await res.json();
    if (!Array.isArray(events)) return null;
    const t1 = team1Name.toLowerCase();
    const t2 = team2Name.toLowerCase();
    const candidates = events.filter((e: any) => {
      const title = (e.title || '').toLowerCase();
      if (!title.includes(t1) || !title.includes(t2)) return false;
      if (title.includes('more markets') || title.includes('exact score')) return false;
      return true;
    });
    if (candidates.length === 0) return null;
    candidates.sort((a: any, b: any) => parseFloat(b.volume24hr || '0') - parseFloat(a.volume24hr || '0'));
    const event = candidates[0];
    const markets = event.markets || [];
    const moneyline = markets.find((m: any) => {
      const q = (m.question || m.groupItemTitle || '').toLowerCase();
      if (q.includes('o/u') || q.includes('over') || q.includes('under') ||
          q.includes('spread') || q.includes('points') || q.includes('rebounds') ||
          q.includes('assists') || q.includes('total') || q.includes('quarter') ||
          q.includes('half') || q.includes('first') || q.includes('hits') ||
          q.includes('runs') || q.includes('strikeout') || q.includes('exact') ||
          q.includes('score') || q.includes('nrfi')) return false;
      const prices = m.outcomePrices ? (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices) : [];
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

function getMarketContext(type: string, query: string): string {
  const contexts: Record<string, string> = {
    cricket: 'Focus on: team form (last 5 matches), home advantage, head-to-head record, key players, pitch conditions. IPL 2026 season context.',
    nba: 'Focus on: team record, playoff seeding, home court advantage, key injuries, head-to-head.',
    f1: 'Focus on: driver championship points, team performance, circuit history, recent race results, reliability.',
    soccer: 'Focus on: FIFA ranking, recent form, head-to-head, home/away record, key injuries, tournament context.',
    eurovision: 'Focus on: betting market history (markets have predicted the winner correctly roughly 70-80% of the time historically), country performance trends, song style, televote vs jury split.',
    tennis: 'Focus on: ATP/WTA ranking, surface win rate (clay/grass/hard), recent results, head-to-head on this surface.',
    economics: 'Focus on: market-implied probabilities, current inflation rate, employment data, Fed tone, historical rate-decision patterns.',
    crypto: 'Focus on: current price vs target, distance to target, historical volatility, market cycle phase, macro conditions.',
    politics: 'Focus on: polling averages, historical poll accuracy in this country, incumbent advantage, economic conditions.',
    geopolitics: 'Focus on: negotiation timeline, historical base rates for similar conflicts, key stakeholders, recent diplomatic activity.',
    general: 'Focus on: base rates for this type of event, expert consensus, recent developments, key factors that could change the outcome.',
  };
  return contexts[type] || contexts.general;
}

async function fetchGDELT(keywords: string): Promise<any[]> {
  try {
    const q = encodeURIComponent(keywords);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=8&format=json&timespan=7d&sourcelang=eng`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return (data.articles || []).slice(0, 6);
  } catch { return []; }
}

async function fetchHackerNews(keywords: string): Promise<any[]> {
  try {
    const q = encodeURIComponent(keywords);
    const url = `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&numericFilters=created_at_i>${Math.floor(Date.now()/1000) - 604800}&hitsPerPage=6`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return (data.hits || []).slice(0, 4);
  } catch { return []; }
}

async function fetchNewsAPI(keywords: string): Promise<any[]> {
  if (!NEWS_API_KEY) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&sortBy=publishedAt&pageSize=8&language=en&apiKey=${NEWS_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return (data.articles || []).slice(0, 6);
  } catch { return []; }
}

async function fetchMetaculus(keywords: string): Promise<{ probability: number | null; count: number }> {
  try {
    const q = encodeURIComponent(keywords);
    const url = `https://www.metaculus.com/api2/questions/?search=${q}&status=open&order_by=-activity&limit=3`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    const questions = data.results || [];
    if (questions.length === 0) return { probability: null, count: 0 };
    const probs = questions.map((qq: any) => qq.community_prediction?.full?.q2).filter((p: any) => p !== null && p !== undefined);
    if (probs.length === 0) return { probability: null, count: questions.length };
    const avg = probs.reduce((a: number, b: number) => a + b, 0) / probs.length;
    return { probability: Math.round(avg * 100), count: questions.length };
  } catch { return { probability: null, count: 0 }; }
}

// Generates ONLY the reasoning text (bull/bear/keyRisk/verdict). The probability is fixed before this is ever called —
// the model writes reasoning consistent with our number, it never invents its own.
async function generateReasoning(
  query: string,
  probability: number,
  contextLines: string[],
  headlines: string[],
  marketType: string
): Promise<{ bull: string[]; bear: string[]; keyRisk: string; verdict: string } | null> {
  const contextText = contextLines.join(' | ').slice(0, 500) || 'No specific team data available.';
  const headlineText = headlines.slice(0, 3).join(' | ').slice(0, 300) || 'No recent headlines.';
  const typeGuidance = getMarketContext(marketType, query);

  const prompt = `Sports and prediction-market analyst. Return ONLY valid JSON, no markdown.

Question: "${query}"
Computed probability for the FIRST named team/option: ${probability}% (fixed — do not change this number)
Context: ${contextText}
Recent headlines: ${headlineText}
Guidance: ${typeGuidance}

Write reasoning consistent with the ${probability}% figure above:
- bull: 3 short reasons the first team/option wins, max 10 words each, specific to these teams
- bear: 2 short risks or reasons it could lose, max 10 words each
- keyRisk: the single biggest uncertainty, max 8 words
- verdict: a 3-5 word summary phrase

Return ONLY: {"bull":["...","...","..."],"bear":["...","..."],"keyRisk":"...","verdict":"..."}`;

  let text = '';
  if (ANTHROPIC_API_KEY) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) { const data = await res.json(); text = data.content?.[0]?.text || ''; }
    } catch {}
  }
  if (!text && GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 500, temperature: 0.2 }),
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) { const data = await res.json(); text = data.choices?.[0]?.message?.content || ''; }
    } catch {}
  }
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.bull) || !Array.isArray(parsed.bear)) return null;
    return {
      bull: parsed.bull.slice(0, 3).map((s: string) => String(s).slice(0, 100)),
      bear: parsed.bear.slice(0, 3).map((s: string) => String(s).slice(0, 100)),
      keyRisk: String(parsed.keyRisk || '').slice(0, 120),
      verdict: String(parsed.verdict || '').slice(0, 50),
    };
  } catch { return null; }
}

// One function builds the source/reasons list everywhere — no more duplicated fallback blocks per code path.
function buildSources(reasoning: { bull: string[]; bear: string[]; keyRisk: string } | null, extra: any[]): any[] {
  const sources: any[] = [];
  if (reasoning) {
    reasoning.bull.forEach(b => sources.push({ name: 'Signal', sig: b, url: '', category: 'news', type: 'strong', contribution: 5 }));
    reasoning.bear.forEach(b => sources.push({ name: 'Signal', sig: b, url: '', category: 'news', type: 'contrary', contribution: -5 }));
    if (reasoning.keyRisk) sources.push({ name: 'Key Risk', sig: reasoning.keyRisk, url: '', category: 'community', type: 'mixed', contribution: 0 });
  } else {
    const newsExtras = extra.filter(e => e.category === 'news' && e.sig && e.sig.length > 10);
    if (newsExtras.length > 0) {
      newsExtras.slice(0, 3).forEach(e => sources.push({ name: 'Signal', sig: e.sig, url: e.url || '', category: 'news', type: 'strong', contribution: 5 }));
    } else {
      sources.push(
        { name: 'Signal', sig: 'Market data and recent form analyzed', url: '', category: 'news', type: 'strong', contribution: 5 },
        { name: 'Signal', sig: 'Historical head-to-head record considered', url: '', category: 'news', type: 'strong', contribution: 5 },
        { name: 'Signal', sig: 'Upset potential always exists in this format', url: '', category: 'news', type: 'contrary', contribution: -5 },
      );
    }
  }
  sources.push(...extra);
  return sources;
}

// ---------- IPL cricket: dedicated season-stats model. Returns null if it can't parse two known teams,
// in which case the caller falls through to the generic model below. ----------
async function tryComputeCricket(query: string, request: NextRequest) {
  const teamMatch = query.match(/will\s+(.+?)\s+beat\s+(.+?)(?:\s+in|\?|$)/i);
  if (!teamMatch) return null;

  const TEAM_MAP: Record<string, string> = {
    'royal challengers bengaluru': 'RCB', rcb: 'RCB', 'mumbai indians': 'MI', mi: 'MI',
    'chennai super kings': 'CSK', csk: 'CSK', 'kolkata knight riders': 'KKR', kkr: 'KKR',
    'delhi capitals': 'DC', dc: 'DC', 'punjab kings': 'PBKS', pbks: 'PBKS',
    'rajasthan royals': 'RR', rr: 'RR', 'sunrisers hyderabad': 'SRH', srh: 'SRH',
    'gujarat titans': 'GT', gt: 'GT', 'lucknow super giants': 'LSG', lsg: 'LSG',
  };
  const POINTS: Record<string, { p: number; w: number; l: number; pts: number; nrr: string; form: string }> = {
    RR:   { p: 10, w: 7, l: 3, pts: 14, nrr: '+0.656', form: 'WWWWWLWLL' },
    RCB:  { p: 11, w: 9, l: 2, pts: 18, nrr: '+0.812', form: 'WWLLWWWWWW' },
    PBKS: { p: 13, w: 8, l: 2, pts: 16, nrr: '+0.612', form: 'WWWWWWWWLL' },
    DC:   { p: 11, w: 5, l: 6, pts: 10, nrr: '-0.201', form: 'LWWLWLWLL' },
    GT:   { p: 14, w: 9, l: 5, pts: 18, nrr: '+0.695', form: 'LWLWLWWLWWWWWL' },
    SRH:  { p: 11, w: 7, l: 4, pts: 14, nrr: '+0.445', form: 'WLLWLLWLWWW' },
    MI:   { p: 11, w: 3, l: 8, pts: 6,  nrr: '-0.498', form: 'WLLWLLLLWL' },
    LSG:  { p: 13, w: 3, l: 9, pts: 6,  nrr: '-0.612', form: 'LLLWWWLLLLL' },
    CSK:  { p: 14, w: 5, l: 9, pts: 10, nrr: '-0.298', form: 'LLLLLWWWLLWLL' },
    KKR:  { p: 13, w: 6, l: 6, pts: 13, nrr: '+0.011', form: 'LLLLLLLNLWWWW' },
  };
  const HOME_ADV: Record<string, number> = { SRH: 8, MI: 6, RCB: 7, CSK: 8, KKR: 5, DC: 4, RR: 5, GT: 4, LSG: 5, PBKS: 4 };
  const VENUE_CITIES: Record<string, string[]> = {
    SRH: ['hyderabad'], MI: ['mumbai', 'wankhede'], RCB: ['bengaluru', 'bangalore', 'chinnaswamy', 'dharamsala', 'dharamshala'],
    CSK: ['chennai', 'chepauk'], KKR: ['kolkata', 'eden'], DC: ['delhi'],
    RR: ['jaipur', 'guwahati'], GT: ['ahmedabad', 'narendra'], LSG: ['lucknow'],
    PBKS: ['chandigarh', 'dharamshala', 'mohali'],
  };

  const c1 = TEAM_MAP[teamMatch[1].trim().toLowerCase()];
  const c2 = TEAM_MAP[teamMatch[2].trim().toLowerCase()];
  if (!c1 || !c2 || !POINTS[c1] || !POINTS[c2]) return null;

  const t1 = POINTS[c1], t2 = POINTS[c2];
  const f1 = Math.round(((t1.form.match(/W/g) || []).length / t1.form.length) * 100);
  const f2 = Math.round(((t2.form.match(/W/g) || []).length / t2.form.length) * 100);
  const nrr1 = parseFloat(t1.nrr), nrr2 = parseFloat(t2.nrr);
  const nrrMax = Math.max(Math.abs(nrr1), Math.abs(nrr2), 0.1);
  const queryLower = query.toLowerCase();

  let homeTeam = c2;
  if ((VENUE_CITIES[c1] || []).some(city => queryLower.includes(city))) homeTeam = c1;
  else if ((VENUE_CITIES[c2] || []).some(city => queryLower.includes(city))) homeTeam = c2;

  const homeAdv1Raw = homeTeam === c1 ? (HOME_ADV[c1] || 0) * 1.5 : 0;
  const homeAdv2Raw = homeTeam === c2 ? (HOME_ADV[c2] || 0) * 1.5 : 0;
  const homeAdv1 = homeAdv1Raw > 0 && f1 < 40 ? Math.min(homeAdv1Raw, 8) : homeAdv1Raw;
  const homeAdv2 = homeAdv2Raw > 0 && f2 < 40 ? Math.min(homeAdv2Raw, 8) : homeAdv2Raw;

  let venueChaseBonus = 0;
  try {
    const vRes = await fetch(new URL('/api/cricket-context', request.url).toString(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team1: c1, team2: c2 }), signal: AbortSignal.timeout(3000),
    });
    const vData = await vRes.json();
    if (vData.venue?.chase) venueChaseBonus = (vData.venue.chase - 50) * 0.3;
  } catch {}

  const s1 = f1 * 0.35 + (t1.pts / Math.max(t1.pts + t2.pts, 1)) * 100 * 0.30 + ((nrr1 / nrrMax + 1) / 2 * 100 * 0.20) + homeAdv1 + venueChaseBonus;
  const s2 = f2 * 0.35 + (t2.pts / Math.max(t1.pts + t2.pts, 1)) * 100 * 0.30 + ((nrr2 / nrrMax + 1) / 2 * 100 * 0.20) + homeAdv2;
  const raw = s1 / (s1 + s2) * 100;
  const stretched = 50 + (raw - 50) * 1.6;
  let baseProbability = Math.round(Math.max(20, Math.min(82, stretched)));

  const breakdown = [
    { factor: 'Starting point (equal teams)', value: 50, delta: 0, cumulative: 50 },
    { factor: `Season form (${c1} ${f1}% win rate vs ${c2} ${f2}% win rate)`, value: f1 - f2, delta: Math.round((f1 - f2) * 0.35 * 0.3), cumulative: 0 },
    { factor: `Points table (${c1} ${t1.pts}pts vs ${c2} ${t2.pts}pts)`, value: t1.pts - t2.pts, delta: Math.round(((t1.pts / Math.max(t1.pts + t2.pts, 1)) - 0.5) * 100 * 0.30), cumulative: 0 },
    { factor: `Run rate (NRR ${t1.nrr} vs ${t2.nrr})`, value: nrr1 - nrr2, delta: Math.round(((nrr1 / nrrMax + 1) / 2 * 100 - (nrr2 / nrrMax + 1) / 2 * 100) * 0.20), cumulative: 0 },
  ];
  if (homeAdv1 > 0) breakdown.push({ factor: `Home advantage (${c1} playing at home)`, value: homeAdv1, delta: Math.round(homeAdv1), cumulative: 0 });
  if (homeAdv2 > 0) breakdown.push({ factor: `Home advantage (${c2} at ${homeTeam})`, value: -homeAdv2, delta: -Math.round(homeAdv2), cumulative: 0 });

  let cumulative = 50;
  breakdown.forEach((b, i) => { if (i === 0) { b.cumulative = 50; return; } cumulative += b.delta; b.cumulative = Math.round(cumulative); });

  let liveScoreContext = '';
  try {
    const TEAM_FULL: Record<string, string> = {
      SRH: 'Sunrisers Hyderabad', MI: 'Mumbai Indians', RCB: 'Royal Challengers Bengaluru',
      CSK: 'Chennai Super Kings', KKR: 'Kolkata Knight Riders', DC: 'Delhi Capitals',
      RR: 'Rajasthan Royals', GT: 'Gujarat Titans', LSG: 'Lucknow Super Giants', PBKS: 'Punjab Kings',
    };
    const fullT1 = TEAM_FULL[c1] || '';
    const fullT2 = TEAM_FULL[c2] || '';
    const liveRes = await fetch(new URL(`/api/live-cricket?team1=${encodeURIComponent(fullT1)}&team2=${encodeURIComponent(fullT2)}`, request.url).toString(), { signal: AbortSignal.timeout(2000) });
    const liveData = await liveRes.json();
    if (liveData.success && liveData.isLive && liveData.liveContext) {
      liveScoreContext = liveData.liveContext;
      if (liveData.score?.length > 0) {
        const lastInnings = liveData.score[liveData.score.length - 1];
        const runs = lastInnings?.r || 0;
        const wickets = lastInnings?.w || 0;
        const overs = parseFloat(String(lastInnings?.o || '0'));
        const isBattingTeam1 = liveData.score[0]?.inning?.toLowerCase().includes(fullT1.toLowerCase());
        if (overs > 0) {
          const runRate = runs / overs;
          const oversLeft = 20 - overs;
          const projectedScore = Math.round(runs + runRate * oversLeft);
          const avgScore = 165;
          const scoreDiff = projectedScore - avgScore;
          const scoreAdj = Math.round(scoreDiff / 10) * 3;
          const wicketAdj = wickets >= 6 ? (wickets - 5) * 4 : 0;
          if (isBattingTeam1) {
            baseProbability = Math.max(15, Math.min(85, baseProbability + Math.round(scoreAdj * 0.4) - wicketAdj));
          } else {
            baseProbability = Math.max(15, Math.min(85, baseProbability - Math.round(scoreAdj * 0.4) + wicketAdj));
          }
        }
      }
    } else if (liveData.success && liveData.matchEnded && liveData.status) {
      liveScoreContext = `Match result: ${liveData.status}`;
    }
  } catch {}

  return {
    baseProbability,
    breakdown,
    team1: { ...t1, code: c1, formScore: f1 },
    team2: { ...t2, code: c2, formScore: f2 },
    homeTeam,
    liveScoreContext,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { query, marketOdds, anonId, isSignedIn } = await request.json();
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });
    if (query.trim().length < 8) {
      return Response.json({ valid: false, confidence: 0, message: 'Question too short.', sources: [] });
    }

    if (anonId && !isSignedIn) {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL!);
        const today = new Date().toISOString().split('T')[0];
        const usage = await sql`SELECT COUNT(*)::int as count FROM events WHERE user_id = ${anonId}::uuid AND name = 'analysis_run' AND created_at >= ${today}::date`;
        if ((usage[0]?.count || 0) >= 5) {
          return Response.json({ valid: false, limitReached: true, message: 'Daily limit reached. Sign in for unlimited access.', sources: [] });
        }
      } catch {}
    }

    const keywords = extractKeywords(query);
    const marketType = detectMarketType(query);

    const [gdeltArticles, hnArticles, newsApiArticles, metaculus] = await Promise.all([
      fetchGDELT(keywords), fetchHackerNews(keywords), fetchNewsAPI(keywords), fetchMetaculus(keywords),
    ]);
    const allArticles = [
      ...newsApiArticles.map((a: any) => ({ title: a.title || '', source: a.source?.name || 'News', url: a.url, category: 'news' })),
      ...gdeltArticles.map((a: any) => ({ title: a.title || '', source: a.domain || 'GDELT', url: a.url, category: 'news' })),
      ...hnArticles.map((a: any) => ({ title: a.title || '', source: 'Hacker News', url: `https://news.ycombinator.com/item?id=${a.objectID}`, category: 'social' })),
    ];
    const queryWords = keywords.toLowerCase().split(' ').filter(w => w.length > 3);
    const relevantArticles = allArticles.filter(a => queryWords.some(w => a.title.toLowerCase().includes(w)));
    let headlines = relevantArticles.map(a => a.title).filter(Boolean);

    // ---- Cricket: dedicated IPL stats model takes priority when it can parse the teams ----
    if (marketType === 'cricket') {
      const cricketResult = await tryComputeCricket(query, request);
      if (cricketResult) {
        const { baseProbability, breakdown, team1, team2, homeTeam, liveScoreContext } = cricketResult;
        if (liveScoreContext) headlines = [`LIVE SCORE: ${liveScoreContext}`, ...headlines];
        const cricketHeadlines = [
          `Will ${team1.code} beat ${team2.code}? Higher win% and NRR favor that team.`,
          `${team1.code}: ${team1.pts}pts, ${team1.w}W-${team1.l}L, form ${team1.formScore}% wins, NRR ${team1.nrr}`,
          `${team2.code}: ${team2.pts}pts, ${team2.w}W-${team2.l}L, form ${team2.formScore}% wins, NRR ${team2.nrr}`,
          homeTeam === team1.code ? `${team1.code} playing at home — advantage` : `${team2.code} playing at home — advantage to them`,
          ...headlines.slice(0, 2),
        ].filter(Boolean);
        const reasoning = await generateReasoning(query, baseProbability, [], cricketHeadlines, 'cricket');
        const extraSources: any[] = [
          { name: 'IPL Stats', sig: `${team1.code} ${team1.formScore}% wins (${team1.pts}pts) vs ${team2.code} ${team2.formScore}% wins (${team2.pts}pts)`, url: '', category: 'market', type: team1.formScore > team2.formScore ? 'strong' : 'contrary', contribution: Math.round((team1.formScore - team2.formScore) / 5) },
        ];
        if (metaculus.probability !== null) extraSources.push({ name: 'Metaculus', sig: `Forecasters: ${metaculus.probability}%`, url: 'https://metaculus.com', category: 'community', type: 'mixed', contribution: Math.round((metaculus.probability - 50) / 5) });
        const sources = buildSources(reasoning, extraSources);
        fetch(new URL('/api/track', request.url).toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anonId: anonId || '', name: 'analysis_run', props: { query: query.slice(0, 100), confidence: baseProbability } }) }).catch(() => {});
        return Response.json({ valid: true, confidence: baseProbability, keywords, articleCount: relevantArticles.length, sources, groqVerdict: reasoning?.verdict || null, marketType, breakdown });
      }
      // fall through to the generic model below if cricket-specific calc couldn't run
    }

    // ---- Generic: team-strength model + market odds + AI-written reasoning ----
    const teams = findTeamsInQuery(query);
    const contextLines = [...teams.map(t => t.ctx), ...findExtraContext(query)];
    let effectiveMarketOdds = marketOdds || null;
    if (!effectiveMarketOdds) {
      if (teams.length >= 2) {
        effectiveMarketOdds = await findLiveMarketOdds(teams[0].name, teams[1].name);
      } else {
        const vsMatch = query.match(/^(.+?)\s+vs\.?\s+(.+?)(?:\s+world cup|\s+nba|\s+ipl|\?|$)/i);
        if (vsMatch) {
          effectiveMarketOdds = await findLiveMarketOdds(vsMatch[1].trim(), vsMatch[2].trim());
        }
      }
    }
    const probability = calculateProbability(teams, effectiveMarketOdds);

    if (teams.length === 0 && contextLines.length === 0 && metaculus.probability === null && relevantArticles.length === 0 && !effectiveMarketOdds) {
      return Response.json({ valid: true, confidence: 0, keywords, articleCount: 0, sources: [], noData: true, message: 'No data found for this question yet. Try naming the teams, or paste a Polymarket URL.' });
    }

    const reasoning = await generateReasoning(query, probability, contextLines, headlines, marketType);

    let finalConfidence = probability;
    if (!effectiveMarketOdds && metaculus.probability !== null) {
      finalConfidence = Math.round(probability * 0.8 + metaculus.probability * 0.2);
    }
    finalConfidence = Math.max(5, Math.min(95, finalConfidence));

    const extraSources: any[] = [];
    if (effectiveMarketOdds) extraSources.push({ name: 'Polymarket', sig: `Live market: ${effectiveMarketOdds}% — crowd consensus`, url: '', category: 'market', type: 'priced', contribution: Math.round((effectiveMarketOdds - 50) / 5) });
    if (metaculus.probability !== null) extraSources.push({ name: 'Metaculus', sig: `Expert forecasters: ${metaculus.probability}% (${metaculus.count} questions)`, url: 'https://metaculus.com', category: 'community', type: metaculus.probability > 55 ? 'strong' : 'contrary', contribution: Math.round((metaculus.probability - 50) / 3) });
    relevantArticles.slice(0, 4).forEach(a => extraSources.push({ name: a.source, sig: a.title, url: a.url, category: a.category, type: 'mixed', contribution: 1 }));

    const sources = buildSources(reasoning, extraSources);

    fetch(new URL('/api/track', request.url).toString(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anonId: anonId || '', name: 'analysis_run', props: { query: query.slice(0, 100), confidence: finalConfidence } }) }).catch(() => {});

    return Response.json({
      valid: true,
      confidence: finalConfidence,
      keywords,
      articleCount: relevantArticles.length,
      sources,
      groqVerdict: reasoning?.verdict || null,
      marketType,
      components: [
        effectiveMarketOdds ? { key: 'market', label: 'Market odds', prob: effectiveMarketOdds } : null,
        teams.length >= 2 ? { key: 'model', label: 'Team strength model', prob: calculateProbability(teams, null) } : null,
        metaculus.probability !== null ? { key: 'experts', label: 'Forecasters', prob: metaculus.probability } : null,
      ].filter(Boolean),
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
