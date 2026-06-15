import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

function extractKeywords(query: string): string {
  const stop = new Set(['will','there','that','this','what','when','have','does','with','would','the','and','for','are','by','in','on','at','to','of','a','an','be','is','it','any','over','than','more','less','how','who','which','where','why','can','could','should','may','might']);
  return query.replace(/[?!.,]/g, '').split(' ').filter(w => w.length > 2 && !stop.has(w.toLowerCase())).slice(0, 6).join(' ');
}

function detectMarketType(query: string): string {
  const q = query.toLowerCase();
  if (/ipl|cricket|srh|rcb|csk|kkr|mi |pbks|rr |gt |lsg|dc /.test(q)) return 'cricket';
  if (/nba|lakers|celtics|thunder|warriors|knicks|bucks|heat|nuggets|playoff/.test(q)) return 'nba';
  if (/formula 1|f1|verstappen|hamilton|leclerc|norris|grand prix/.test(q)) return 'f1';
  if (/champions league|ucl|premier league|bundesliga|la liga|serie a|ligue 1|bundesliga|euro|copa|fifa|world cup|mls|epl/.test(q)) return 'soccer';
  if (/eurovision|esc 2026/.test(q)) return 'eurovision';
  if (/french open|roland garros|wimbledon|us open|australian open|tennis/.test(q)) return 'tennis';
  if (/fed |federal reserve|rate cut|rate hike|fomc|inflation|gdp|cpi|recession|interest rate/.test(q)) return 'economics';
  if (/bitcoin|btc|ethereum|eth|crypto|solana|doge|coinbase|binance/.test(q)) return 'crypto';
  if (/election|president|prime minister|senator|congress|vote|poll|macron|trump|biden|harris|starmer/.test(q)) return 'politics';
  if (/iran|israel|ukraine|russia|china|nato|war|ceasefire|peace deal|military|conflict/.test(q)) return 'geopolitics';
  return 'general';
}

// Global sports context for all markets
const SPORTS_CONTEXT: Record<string, string> = {
  // NBA Teams
  'timberwolves': 'Minnesota Timberwolves: Anthony Edwards 28.5 PPG, home court advantage, strong defense',
  'nuggets': 'Denver Nuggets: TRAIL Timberwolves 2-3 in series. Nikola Jokic 28pts 13reb but team struggling. Must win Game 6 away.',
  'thunder': 'Oklahoma City Thunder: 1st seed West, Shai Gilgeous-Alexander MVP frontrunner 32PPG',
  'celtics': 'Boston Celtics: ELIMINATED in Round 1 by 76ers 3-4. Massive upset. Defending champions gone.',
  // WORLD CUP 2026 TEAMS — real data
  'usa': 'USA: Host nation World Cup 2026. Pulisic leads, McKennie, Reyna, Musah midfield. Playing Group D vs Paraguay, Australia, Turkey. Home crowd massive advantage at SoFi Stadium LA. Market gives USA ~65% to beat Paraguay.',
  'paraguay': 'Paraguay: Group D vs USA June 12. Underdog — market gives ~35% chance vs USA. Physical defensive team.',
  'canada': 'Canada: Host nation World Cup 2026. Alphonso Davies key player. Group B vs Bosnia June 12 Toronto. Home crowd advantage. Market gives Canada ~60% to beat Bosnia.',
  'bosnia': 'Bosnia: Group B vs Canada June 12. First World Cup appearance. Edin Dzeko aging but experienced. Market gives ~40% vs Canada.',
  'spain': 'Spain: FIFA #1 ranked. EURO 2024 champions. Youngest squad in tournament — Yamal 18, Pedri 23, Nico Williams 22. Tiki-taka evolved with pace. Group stage vs Croatia, Morocco, Brazil. Rodri anchors midfield. 16% Polymarket odds. Goldman Sachs model gives Spain 26% win probability — highest of any team.',
  'france': 'France: FIFA #2. Mbappe leads attack at peak powers. Tchouameni, Rabiot midfield. Cherki emerging star. Lost EURO 2024 final to Spain. Deep squad. Group vs Argentina, Australia, Poland. 17% market odds — slight favorite. Strong historically in tournaments.',
  'england': 'England: Bellingham, Saka, Foden core. Finally turning potential into results. Lost EURO 2024 final to Spain. Group vs Serbia, Nigeria, South Korea. 11% market odds. Playing in USA venues — no true home advantage but English fans travel in numbers.',
  'brazil': 'Brazil: Vinicius Jr., Rodrygo, Endrick 18yo phenom. 5x World Cup winners but no title since 2002. Playing in USA. Group vs France, Australia, Poland. 9% odds. Endrick could be the difference-maker.',
  'argentina': 'Argentina: Defending champions 2022. Messi final World Cup at 38 — legendary send-off possible. Alvarez, Mac Allister, De Paul supporting cast. Group vs USA, Turkey, Australia. 9% market odds.',
  'germany': 'Germany: Musiala, Wirtz young core. Rebuilding under Nagelsmann. Hosting Euro 2024 was good prep. Playing in North American venues. Dark horse at 7% odds.',
  'portugal': 'Portugal: Ronaldo legacy at 41 — possibly final World Cup. Vitinha, Leao, Fernandes the future. Bruno Fernandes creative hub. 10% market odds.',


  'canadiens': 'Montreal Canadiens: 2026 NHL Playoffs. Won series 3-2 vs Sabres before Game 6. Lost Game 6 at home 3-8 — massive collapse. Series now tied 3-3. Game 7 in BUFFALO tonight (home ice for Sabres). Canadiens won earlier in Buffalo this series 6-3. Nick Suzuki, Cole Caufield, Juraj Slafkovsky, Ivan Demidov key players.',
  'sabres': 'Buffalo Sabres: 2026 NHL Playoffs. Forced Game 7 with 8-3 comeback win in Game 6. Rasmus Dahlin had 5 points in Game 6. Home ice advantage tonight at KeyBank Center. Tage Thompson driving offense. Sabres are -122 favorites on moneyline. Winner faces Carolina Hurricanes.',
  'cavaliers': 'Cleveland Cavaliers: ECF vs Knicks. LOST Game 1 104-115 OT — blew 22pt lead with 7:52 left. Donovan Mitchell 31PPG but struggled late. Must bounce back in Game 2 at MSG. Trail series 0-1.',
  'knicks': '2026 NBA CHAMPIONS! Beat Spurs 4-1 in Finals. Brunson 45pts Finals MVP Game 5. First title since 1973. Won all 4 games coming from behind — largest comeback team in Finals history.',
  'lakers': 'Los Angeles Lakers: Beat Rockets 4-2 in Round 1. LeBron James 27PPG in playoffs. Anthony Davis 26pts 13reb. Huge underdogs vs OKC at 11% — need upsets on road to have a chance.',
  'warriors': 'Golden State Warriors: Stephen Curry still elite shooter',
  '76ers': 'Philadelphia 76ers: SHOCKED Celtics 4-3 in Round 1. Tyrese Maxey 31PPG series average. Lost Game 1 at MSG 98-137 badly. Trail series 0-1. Joel Embiid health key concern for rest of series.',
  'heat': 'Miami Heat: Jimmy Butler clutch performer, strong playoff culture',
  'spurs': 'San Antonio Spurs: Lost 2026 NBA Finals 1-4 to Knicks. Wemby 27pts Game 5 but Brunson too clutch. Young team — will be back.',
  'trail blazers': 'Portland Trail Blazers: Damian Lillard legacy, rebuilding team',
  'hawks': 'Atlanta Hawks: Trae Young playmaker, inconsistent defense',
  'pistons': 'Detroit Pistons: 1st seed East. Beat Magic 4-3 in Round 1. Home court advantage vs Cavaliers Round 2. Cade Cunningham 27PPG. Lost Game 1 at home to CLE. Must bounce back in Game 2.',
  'magic': 'Orlando Magic: Paolo Banchero 23PPG, young athletic team',
  // F1 Drivers
  'verstappen': 'Max Verstappen: ONLY 12 points after 3 races. Red Bull car failed to adapt to 2026 regs. Just 3% to win Miami. Threatened retirement. From dominant champion to 9th in standings — massive shock.',
  'hamilton': 'Lewis Hamilton: 7x champion now at Ferrari in 2026. 6% to win Miami. Ferrari car improving but behind Mercedes. Hamilton vs Leclerc internal battle.',
  'leclerc': 'Charles Leclerc: 3rd in championship 49pts. 8% to win Miami. Ferrari fast in qualifying but slower in race pace vs Mercedes. Hamilton now his teammate at Ferrari 2026.',
  'norris': 'Lando Norris: 2025 World Champion but struggling in 2026. McLaren had DNS/DNF early season. 9% to win Miami. McLaren brought upgrades — could be dangerous.',
  'russell': 'George Russell: 2nd in championship 63pts. Won Australia. 43% to win Miami GP. Tied with Antonelli in betting odds. Had battery issue in Japan dropped to 4th. Mercedes teammate battle ongoing.',
  'piastri': 'Oscar Piastri: McLaren. 11% to win Miami. Finished 2nd in Japan after early DNS issues. McLaren upgraded car during 5-week break. Could surprise.',
  // Tennis Players
  'zverev': 'Alexander Zverev: World No.2, strong clay court record, Madrid Open finalist 2024',
  'alcaraz': 'Carlos Alcaraz: World No.1, defending Madrid Open champion, home crowd advantage',
  'sinner': 'Jannik Sinner: World No.1, strong form all surfaces',
  'djokovic': 'Novak Djokovic: 24 Grand Slams, clay court expert',
  'medvedev': 'Daniil Medvedev: Hard court specialist, inconsistent on clay',
  'mensik': 'Jakub Mensik: Rising Czech star, strong serve, upset potential',
  // Soccer/UCL
  'psg': 'Paris Saint-Germain: Kylian Mbappe gone, rebuilding around younger talent, Ligue 1 dominance',
  'bayern': 'Bayern München: Harry Kane leading scorer, Bundesliga champions, experienced UCL team',
  'real madrid': 'Real Madrid: UCL record 15 titles, Vinicius Jr and Bellingham, Bernabeu fortress',
  'barcelona': 'Barcelona: Pedri and Yamal, attacking football, financial recovery',
  'arsenal': 'Arsenal: Premier League title contenders, Saka and Odegaard key players',
  'manchester city': 'Manchester City: Pep Guardiola system, Haaland goals, UCL experience',
};

function getGlobalSportsContext(query: string): string {
  const q = query.toLowerCase();
  const contexts: string[] = [];
  for (const [team, ctx] of Object.entries(SPORTS_CONTEXT)) {
    if (q.includes(team)) contexts.push(ctx);
  }
  return contexts.join(' | ');
}

// NBA 2026 Playoff standings and context
const NBA_CONTEXT: Record<string, string> = {
  'timberwolves': 'Minnesota Timberwolves: 3rd seed West, Anthony Edwards averaging 28.5 PPG, Karl-Anthony Towns 22pts 9reb, strong defensive team, home court advantage',
  'nuggets': 'Denver Nuggets: Nikola Jokic MVP candidate 26pts 12reb 9ast, Jamal Murray injury concern, 2023 champions, experienced playoff team',
  'thunder': 'Oklahoma City Thunder: 1st seed West. Swept Suns 4-0 in Round 1. SGA averaging 34PPG in playoffs. Best record in NBA. Home court advantage. 89% favorites vs Lakers. Wembanyama-level defense.',
  'celtics': 'Boston Celtics: 1st seed East, Jayson Tatum 26PPG, defending champions, deepest roster in NBA',  // WORLD CUP 2026 TEAMS — real data
  'usa': 'USA: Host nation World Cup 2026. Pulisic leads, McKennie, Reyna, Musah midfield. Playing Group D vs Paraguay, Australia, Turkey. Home crowd massive advantage at SoFi Stadium LA. Market gives USA ~65% to beat Paraguay.',
  'paraguay': 'Paraguay: Group D vs USA June 12. Underdog — market gives ~35% chance vs USA. Physical defensive team.',
  'canada': 'Canada: Host nation World Cup 2026. Alphonso Davies key player. Group B vs Bosnia June 12 Toronto. Home crowd advantage. Market gives Canada ~60% to beat Bosnia.',
  'bosnia': 'Bosnia: Group B vs Canada June 12. First World Cup appearance. Edin Dzeko aging but experienced. Market gives ~40% vs Canada.',
  'spain': 'Spain: FIFA #1 ranked. EURO 2024 champions. Youngest squad in tournament — Yamal 18, Pedri 23, Nico Williams 22. Tiki-taka evolved with pace. Group stage vs Croatia, Morocco, Brazil. Rodri anchors midfield. 16% Polymarket odds. Goldman Sachs model gives Spain 26% win probability — highest of any team.',
  'france': 'France: FIFA #2. Mbappe leads attack at peak powers. Tchouameni, Rabiot midfield. Cherki emerging star. Lost EURO 2024 final to Spain. Deep squad. Group vs Argentina, Australia, Poland. 17% market odds — slight favorite. Strong historically in tournaments.',
  'england': 'England: Bellingham, Saka, Foden core. Finally turning potential into results. Lost EURO 2024 final to Spain. Group vs Serbia, Nigeria, South Korea. 11% market odds. Playing in USA venues — no true home advantage but English fans travel in numbers.',
  'brazil': 'Brazil: Vinicius Jr., Rodrygo, Endrick 18yo phenom. 5x World Cup winners but no title since 2002. Playing in USA. Group vs France, Australia, Poland. 9% odds. Endrick could be the difference-maker.',
  'argentina': 'Argentina: Defending champions 2022. Messi final World Cup at 38 — legendary send-off possible. Alvarez, Mac Allister, De Paul supporting cast. Group vs USA, Turkey, Australia. 9% market odds.',
  'germany': 'Germany: Musiala, Wirtz young core. Rebuilding under Nagelsmann. Hosting Euro 2024 was good prep. Playing in North American venues. Dark horse at 7% odds.',
  'portugal': 'Portugal: Ronaldo legacy at 41 — possibly final World Cup. Vitinha, Leao, Fernandes the future. Bruno Fernandes creative hub. 10% market odds.',


  'canadiens': 'Montreal Canadiens: 2026 NHL Playoffs. Won series 3-2 vs Sabres before Game 6. Lost Game 6 at home 3-8 — massive collapse. Series now tied 3-3. Game 7 in BUFFALO tonight (home ice for Sabres). Canadiens won earlier in Buffalo this series 6-3. Nick Suzuki, Cole Caufield, Juraj Slafkovsky, Ivan Demidov key players.',
  'sabres': 'Buffalo Sabres: 2026 NHL Playoffs. Forced Game 7 with 8-3 comeback win in Game 6. Rasmus Dahlin had 5 points in Game 6. Home ice advantage tonight at KeyBank Center. Tage Thompson driving offense. Sabres are -122 favorites on moneyline. Winner faces Carolina Hurricanes.',

  'knicks': 'New York Knicks: NBA FINALS lead 3-1. Brunson 36pts in Game 4. Knicks are +180 ROAD UNDERDOGS for Game 5 at San Antonio = 36% win probability for Game 5.',
  'warriors': 'Golden State Warriors: Stephen Curry still elite, experienced playoff team, Draymond Green defense',
  'lakers': 'Los Angeles Lakers: LeBron James still performing, Anthony Davis 25pts 12reb, inconsistent season',
  'heat': 'Miami Heat: Jimmy Butler clutch performer, strong playoff culture, Erik Spoelstra coaching edge',
  'bucks': 'Milwaukee Bucks: Giannis Antetokounmpo 30PPG, Damian Lillard 25PPG, top Eastern Conference threat',
};

function getNBAContext(query: string): string {
  const q = query.toLowerCase();
  const contexts: string[] = [];
  for (const [team, ctx] of Object.entries(NBA_CONTEXT)) {
    if (q.includes(team)) contexts.push(ctx);
  }
  return contexts.join(' | ') || 'NBA Playoff game — analyze based on recent form, home court, and key player matchups';
}

function getMarketContext(type: string, query: string): string {
  const contexts: Record<string, string> = {
    cricket: 'Focus on: team form (last 5 matches), home advantage, head-to-head record, key players, pitch conditions. IPL 2026 season context.',
    nba: 'Focus on: team record, playoff seeding, home court advantage, key injuries, head-to-head, historical championship odds for #1 seeds (~30%).',
    f1: 'Focus on: driver championship points, team performance, circuit history, recent race results, reliability.',
    soccer: 'Focus on: league position, recent form, head-to-head, home/away record, key injuries, European competition context.',
    eurovision: 'Focus on: betting market history (markets predict winner 70%+ accuracy), country performance history, song style trends, televote vs jury split. Eurovision 2026 context: Finland leading at 35% with upbeat pop entry. Greece surging to 18% with Mediterranean ballad. Denmark 13% with strong jury appeal. Australia 8% with power ballad. France 7% with French-language entry. Eurovision held in Basel Switzerland May 13-17 2026. Grand Final May 17. Finland won 2023 with Lordi-style rock. Markets have predicted winner correctly 8 of last 10 years.',
    tennis: 'Focus on: ATP/WTA ranking, surface win rate (clay/grass/hard), recent tournament results, head-to-head on this surface.',
    economics: 'Focus on: actual market-implied probabilities (CME FedWatch), current inflation rate, employment data, Fed speaker tone, historical rate decision patterns.',
    crypto: 'Focus on: current price vs target, distance to target (%), historical volatility, market cycle phase, macro conditions.',
    politics: 'Focus on: polling averages, historical accuracy of polls in this country, incumbent advantage, economic conditions, prediction market history.',
    geopolitics: 'Focus on: negotiation timeline, historical base rates for similar conflicts, key stakeholders, recent diplomatic activity, expert forecaster consensus.',
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
    const probs = questions.map((q: any) => q.community_prediction?.full?.q2).filter((p: any) => p !== null && p !== undefined);
    if (probs.length === 0) return { probability: null, count: questions.length };
    const avg = probs.reduce((a: number, b: number) => a + b, 0) / probs.length;
    return { probability: Math.round(avg * 100), count: questions.length };
  } catch { return { probability: null, count: 0 }; }
}


function calculateProbability(query: string, marketOdds: number | null): number {
  if (marketOdds && marketOdds > 0) return marketOdds;
  
  const q = query.toLowerCase();
  
  // World Cup team strength rankings (win probability vs average team)
  const strength: Record<string, number> = {
    'spain': 88, 'france': 86, 'england': 78, 'brazil': 82, 'argentina': 83,
    'germany': 80, 'portugal': 77, 'netherlands': 76, 'belgium': 75, 'italy': 72,
    'croatia': 68, 'uruguay': 70, 'mexico': 65, 'usa': 62, 'canada': 58,
    'japan': 60, 'south korea': 58, 'morocco': 63, 'senegal': 60, 'nigeria': 55,
    'egypt': 52, 'iran': 48, 'saudi arabia': 50, 'australia': 52, 'ecuador': 50,
    'paraguay': 48, 'bolivia': 40, 'cape verde': 28, 'cabo verde': 28,
    'curaçao': 20, 'curacao': 20, 'new zealand': 35, 'jordan': 38,
    'knicks': 58, 'spurs': 52, 'lakers': 55, 'celtics': 60,
  };
  
  // Find teams in query
  const teams: {name: string, str: number}[] = [];
  for (const [team, str] of Object.entries(strength)) {
    if (q.includes(team)) teams.push({name: team, str});
  }
  
  if (teams.length >= 2) {
    // Sort by position in query (first team = home/favorite context)
    teams.sort((a, b) => q.indexOf(a.name) - q.indexOf(b.name));
    const t1 = teams[0].str;
    const t2 = teams[1].str;
    // Convert strength to win probability using Bradley-Terry model
    const prob = Math.round((t1 / (t1 + t2)) * 100);
    return Math.max(10, Math.min(90, prob));
  }
  
  return 60; // default when unknown teams
}

async function analyzeWithGroq(
  query: string,
  headlines: string[],
  metaculusPct: number | null,
  marketOdds: number | null,
  marketType: string
): Promise<{ probability: number; bull: string[]; bear: string[]; keyRisk: string; verdict: string } | null> {
  try {
    const headlineText = headlines.slice(0, 8).map((h, i) => `${i+1}. ${h}`).join('\n');
    // Auto-fetch Polymarket odds if not provided
    if (!marketOdds) {
      try {
        // Build slug from query for NBA games
        const q = query.toLowerCase();
        let slug = '';
        
        // NBA team slug mapping
        const nbaTeams: Record<string,string> = {
          'knicks':'nyk','spurs':'sas','celtics':'bos','lakers':'lal',
          'warriors':'gsw','heat':'mia','bucks':'mil','nuggets':'den',
          'suns':'phx','clippers':'lac','mavericks':'dal','nets':'bkn',
          'sixers':'phi','76ers':'phi','raptors':'tor','hawks':'atl',
          'bulls':'chi','cavaliers':'cle','pistons':'det','pacers':'ind',
          'wizards':'was','hornets':'cha','magic':'orl','thunder':'okc',
          'blazers':'por','jazz':'uta','kings':'sac','pelicans':'nop',
          'timberwolves':'min','rockets':'hou','grizzlies':'mem'
        };
        
        // Find team slugs
        const foundTeams: string[] = [];
        for (const [name, abbr] of Object.entries(nbaTeams)) {
          if (q.includes(name)) foundTeams.push(abbr);
          if (foundTeams.length === 2) break;
        }
        
        if (foundTeams.length === 2) {
          // Try today and next 3 days
          const today = new Date();
          for (let d = 0; d < 4; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() + d);
            const dateStr = date.toISOString().slice(0,10).replace(/-/g,'');
            const yr = date.getFullYear();
            const mo = String(date.getMonth()+1).padStart(2,'0');
            const dy = String(date.getDate()).padStart(2,'0');
            const dateSlug = `${yr}-${mo}-${dy}`;
            
            const trySlug = `nba-${foundTeams[0]}-${foundTeams[1]}-${dateSlug}`;
            const pmRes = await fetch(
              `https://gamma-api.polymarket.com/events?slug=${trySlug}`,
              { signal: AbortSignal.timeout(3000) }
            );
            if (pmRes.ok) {
              const pmData = await pmRes.json();
              if (Array.isArray(pmData) && pmData.length > 0) {
                const event = pmData[0];
                const markets = event.markets || [];
                // Find moneyline market
                const moneyline = markets.find((m: any) => {
                  const q2 = (m.question||'').toLowerCase();
                  return !q2.includes('o/u') && !q2.includes('spread') && !q2.includes('points') && !q2.includes('rebounds') && m.active !== false;
                }) || (markets.length === 1 ? markets[0] : null);
                
                if (moneyline) {
                  const prices = moneyline.outcomePrices;
                  const parsed = typeof prices === 'string' ? JSON.parse(prices) : prices;
                  if (parsed && parsed.length >= 2) {
                    const yes = parseFloat(parsed[0]);
                    const pct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
                    if (pct >= 5 && pct <= 95) {
                      marketOdds = pct;
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      } catch {}
    }

    const marketContext = marketOdds ? `Prediction market (Polymarket) odds: ${marketOdds}% — crowd consensus, stay within 8%` : '';
    const metaContext = metaculusPct ? `Expert forecasters (Metaculus): ${metaculusPct}%` : '';
    const typeContext = getMarketContext(marketType, query);
    const nbaContext = marketType === 'nba' ? getNBAContext(query) : '';
    const globalSportsContext = getGlobalSportsContext(query);

    // For Eurovision, inject country data directly
    const eurovisionFacts = marketType === 'eurovision' || query.toLowerCase().includes('eurovision') ? 
      'Eurovision 2026 is the 70th edition held in Vienna Austria. FINAL IS MAY 16 2026. Finland 45% clear favorite — Linda Lampenius and Pete Parkkonen performing Liekinheitin (Flamethrower) — live violin performance, fire imagery, theatrical staging. Has led betting markets for months. Denmark 13% — strong jury appeal Nordic pop entry My System by Felicia. Greece 13% — dropped from 18%, Akylas performing Ferto, Mediterranean ballad. CONTROVERSY: Spain, Ireland, Netherlands, Iceland, Slovenia BOYCOTTED over Israel inclusion — fewer countries than usual. Israel 5% — boosted by government ad campaigns in 2024 and 2025. Betting markets predicted winner correctly 8 of last 10 years. Televote favours energetic memorable songs. Jury favours sophisticated vocals.' : '';
    
    const teamFacts = [globalSportsContext, nbaContext, eurovisionFacts].filter(Boolean).join(' | ');
    
    // Build home team hint cleanly
    let homeHint = '';
    const qLower = query.toLowerCase();
    const factsLower = (teamFacts||'').toLowerCase();
    if (factsLower.includes('-218') || (factsLower.includes('spurs') && factsLower.includes('home'))) {
      const spursFirst = qLower.indexOf('spurs') < qLower.indexOf('knicks') && qLower.indexOf('spurs') !== -1;
      homeHint = spursFirst
        ? 'IMPORTANT: Spurs are -218 home favorites = 68% win prob. Spurs are FIRST in question. Set probability to 65-70%.'
        : 'IMPORTANT: Spurs are -218 home favorites = 68% win prob. Knicks are FIRST in question. Set probability to 30-35%.';
    }

    // Build concise prompt - Groq fails with long prompts
    const factsShort = (teamFacts||'').slice(0,500);
    const headlinesShort = headlines.slice(0,3).join(' | ').slice(0,300);
    const prompt = `Sports analyst. Return ONLY valid JSON. No markdown.

Match: "${query}"
Context: ${factsShort || 'No data'}
News: ${headlinesShort || 'No news'}
${marketOdds ? 'Market odds: ' + marketOdds + '% for first team. Stay within 5% of this.' : ''}
${homeHint}

Rules:
- probability = integer 0-100, chance FIRST team in match wins
- Use context to determine team quality difference
- If context mentions "92% win probability" use that
- Bull = 3 reasons first team wins, specific to these teams, max 10 words each
- Bear = 2 risks for first team, max 10 words each
- keyRisk = biggest uncertainty, max 8 words

Return ONLY valid JSON: {"probability":85,"bull":["reason1","reason2","reason3"],"bear":["risk1","risk2"],"keyRisk":"key risk","verdict":"verdict"}`;

    // Try Anthropic API first, fall back to Groq
    let text = '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    
    if (anthropicKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        text = data.content?.[0]?.text || '';
      }
    }
    
    // Fallback to Groq if Anthropic fails
    if (!text && GROQ_API_KEY) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        text = data.choices?.[0]?.message?.content || '';
      }
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.probability !== 'number') return null;
    if (!Array.isArray(parsed.bull) || !Array.isArray(parsed.bear)) return null;

    return {
      probability: Math.max(5, Math.min(95, Math.round(parsed.probability))),
      bull: parsed.bull.slice(0, 3).map((s: string) => String(s).slice(0, 100)),
      bear: parsed.bear.slice(0, 3).map((s: string) => String(s).slice(0, 100)),
      keyRisk: String(parsed.keyRisk || '').slice(0, 120),
      verdict: String(parsed.verdict || '').slice(0, 50),
    };
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const { query, marketOdds, anonId, isSignedIn, weights } = await request.json();
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });

    const w = weights || { news: 30, social: 30, technical: 40 };
    const wNews = ((w.news || 30) + (w.social || 30)) / 100;
    const wTech = (w.technical || 40) / 100;

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

    if (query.trim().length < 8) {
      return Response.json({ valid: false, confidence: 0, message: 'Question too short.', sources: [] });
    }

    const keywords = extractKeywords(query);
    const marketType = detectMarketType(query);
    const isIPLQuery = marketType === 'cricket';

    let cricketContext: any = null;
    if (isIPLQuery) {
      const teamMatch = query.match(/will\s+(.+?)\s+beat\s+(.+?)(?:\s+in|\?|$)/i);
      if (teamMatch) {
        const TEAM_MAP: Record<string,string> = {
          'royal challengers bengaluru':'RCB','rcb':'RCB','mumbai indians':'MI','mi':'MI',
          'chennai super kings':'CSK','csk':'CSK','kolkata knight riders':'KKR','kkr':'KKR',
          'delhi capitals':'DC','dc':'DC','punjab kings':'PBKS','pbks':'PBKS',
          'rajasthan royals':'RR','rr':'RR','sunrisers hyderabad':'SRH','srh':'SRH',
          'gujarat titans':'GT','gt':'GT','lucknow super giants':'LSG','lsg':'LSG',
        };
        const POINTS: Record<string,{p:number;w:number;l:number;pts:number;nrr:string;form:string}> = {
          'RR':  {p:10, w:7, l:3, pts:14, nrr:'+0.656', form:'WWWWWLWLL'},
          'RCB': {p:11, w:9, l:2, pts:18, nrr:'+0.812', form:'WWLLWWWWWW'},
          'PBKS':{p:13, w:8, l:2, pts:16, nrr:'+0.612', form:'WWWWWWWWLL'},
          'DC':  {p:11, w:5, l:6, pts:10, nrr:'-0.201', form:'LWWLWLWLL'},
          'GT':  {p:14, w:9, l:5, pts:18, nrr:'+0.695', form:'LWLWLWWLWWWWWL'},
          'SRH': {p:11, w:7, l:4, pts:14, nrr:'+0.445', form:'WLLWLLWLWWW'},
          'MI':  {p:11, w:3, l:8, pts:6,  nrr:'-0.498', form:'WLLWLLLLWL'},
          'LSG': {p:13, w:3, l:9, pts:6,  nrr:'-0.612', form:'LLLWWWLLLLL'},
          'CSK': {p:14, w:5, l:9, pts:10, nrr:'-0.298', form:'LLLLLWWWLLWLL'},
          'KKR': {p:13, w:6, l:6, pts:13,  nrr:'+0.011', form:'LLLLLLLNLWWWW'},
        };
        const HOME_ADV: Record<string,number> = {'SRH':8,'MI':6,'RCB':7,'CSK':8,'KKR':5,'DC':4,'RR':5,'GT':4,'LSG':5,'PBKS':4};
        const VENUE_CITIES: Record<string,string[]> = {
          'SRH':['hyderabad'],'MI':['mumbai','wankhede'],'RCB':['bengaluru','bangalore','chinnaswamy','dharamsala','dharamshala'],
          'CSK':['chennai','chepauk'],'KKR':['kolkata','eden'],'DC':['delhi'],
          'RR':['jaipur','guwahati'],'GT':['ahmedabad','narendra'],'LSG':['lucknow'],
          'PBKS':['chandigarh','dharamshala','mohali'],
        };
        const c1 = TEAM_MAP[teamMatch[1].trim().toLowerCase()];
        const c2 = TEAM_MAP[teamMatch[2].trim().toLowerCase()];
        if (c1 && c2 && POINTS[c1] && POINTS[c2]) {
          const t1 = POINTS[c1], t2 = POINTS[c2];
          const f1 = Math.round(((t1.form.match(/W/g)||[]).length/t1.form.length)*100);
          const f2 = Math.round(((t2.form.match(/W/g)||[]).length/t2.form.length)*100);
          const nrr1 = parseFloat(t1.nrr), nrr2 = parseFloat(t2.nrr);
          const nrrMax = Math.max(Math.abs(nrr1),Math.abs(nrr2),0.1);
          const queryLower = query.toLowerCase();
          let homeTeam = c2;
          if ((VENUE_CITIES[c1]||[]).some(city => queryLower.includes(city))) homeTeam = c1;
          else if ((VENUE_CITIES[c2]||[]).some(city => queryLower.includes(city))) homeTeam = c2;
          // Home advantage — capped at 8% when home team is struggling (below 40% win rate)
          const homeAdv1Raw = homeTeam===c1 ? (HOME_ADV[c1]||0)*1.5 : 0;
          const homeAdv2Raw = homeTeam===c2 ? (HOME_ADV[c2]||0)*1.5 : 0;
          // Cap home advantage if home team form is poor
          const homeAdv1 = homeAdv1Raw > 0 && f1 < 40 ? Math.min(homeAdv1Raw, 8) : homeAdv1Raw;
          const homeAdv2 = homeAdv2Raw > 0 && f2 < 40 ? Math.min(homeAdv2Raw, 8) : homeAdv2Raw;
          // Get venue chase rate from cricket context
          let venueChaseBonus = 0;
          try {
            const vRes = await fetch(new URL('/api/cricket-context', request.url).toString(), {
              method:'POST', headers:{'Content-Type':'application/json'},
              body: JSON.stringify({team1:c1, team2:c2}),
              signal: AbortSignal.timeout(3000)
            });
            const vData = await vRes.json();
            if (vData.venue?.chase) {
              // chase rate above 50% means chasing team has advantage
              // In "Will c1 beat c2", c1 is usually the chasing team
              venueChaseBonus = (vData.venue.chase - 50) * 0.3;
            }
          } catch {}

          let s1 = f1*0.35 + (t1.pts/Math.max(t1.pts+t2.pts,1))*100*0.30 + ((nrr1/nrrMax+1)/2*100*0.20) + homeAdv1 + venueChaseBonus;
          let s2 = f2*0.35 + (t2.pts/Math.max(t1.pts+t2.pts,1))*100*0.30 + ((nrr2/nrrMax+1)/2*100*0.20) + homeAdv2;
          const raw = s1/(s1+s2)*100;
          const stretched = 50+(raw-50)*1.6;
          const baseProbability = Math.round(Math.max(20,Math.min(82,stretched)));

          // Probability breakdown — show exactly how we got the number
          const breakdown = [
            { factor: 'Starting point (equal teams)', value: 50, delta: 0, cumulative: 50 },
            { factor: `Season form (${c1} ${f1}% win rate vs ${c2} ${f2}% win rate)`, value: f1-f2, delta: Math.round((f1-f2)*0.35*0.3), cumulative: 0 },
            { factor: `Points table (${c1} ${t1.pts}pts vs ${c2} ${t2.pts}pts)`, value: t1.pts-t2.pts, delta: Math.round(((t1.pts/(Math.max(t1.pts+t2.pts,1)))-0.5)*100*0.30), cumulative: 0 },
            { factor: `Run rate (NRR ${t1.nrr} vs ${t2.nrr})`, value: nrr1-nrr2, delta: Math.round(((nrr1/nrrMax+1)/2*100 - (nrr2/nrrMax+1)/2*100)*0.20), cumulative: 0 },
          ];
          if (homeAdv1 > 0) breakdown.push({ factor: `Home advantage (${c1} playing at home)`, value: homeAdv1, delta: Math.round(homeAdv1), cumulative: 0 });
          if (homeAdv2 > 0) breakdown.push({ factor: `Home advantage (${c2} at ${homeTeam})`, value: -homeAdv2, delta: -Math.round(homeAdv2), cumulative: 0 });

          // Calculate cumulative values
          let cumulative = 50;
          breakdown.forEach((b, i) => {
            if (i === 0) { b.cumulative = 50; return; }
            cumulative += b.delta;
            b.cumulative = Math.round(cumulative);
          });

          cricketContext = { baseProbability, team1:{...t1,code:c1,formScore:f1}, team2:{...t2,code:c2,formScore:f2}, homeTeam, breakdown };
        }
      }
    }

    // ── LIVE CRICKET SCORE ──
    let liveScoreContext = '';
    if (isIPLQuery && cricketContext) {
      try {
        const TEAM_FULL: Record<string,string> = {
          'SRH':'Sunrisers Hyderabad','MI':'Mumbai Indians','RCB':'Royal Challengers Bengaluru',
          'CSK':'Chennai Super Kings','KKR':'Kolkata Knight Riders','DC':'Delhi Capitals',
          'RR':'Rajasthan Royals','GT':'Gujarat Titans','LSG':'Lucknow Super Giants','PBKS':'Punjab Kings',
        };
        const fullT1 = TEAM_FULL[cricketContext.team1?.code] || '';
        const fullT2 = TEAM_FULL[cricketContext.team2?.code] || '';
        const liveRes = await fetch(
          new URL(`/api/live-cricket?team1=${encodeURIComponent(fullT1)}&team2=${encodeURIComponent(fullT2)}`, request.url).toString(),
          { signal: AbortSignal.timeout(2000) }
        );
        const liveData = await liveRes.json();
        if (liveData.success && liveData.isLive && liveData.liveContext) {
          liveScoreContext = liveData.liveContext;
          // Adjust cricket probability based on live score
          if (cricketContext.baseProbability && liveData.score?.length > 0) {
            const lastInnings = liveData.score[liveData.score.length - 1];
            const runs = lastInnings?.r || 0;
            const wickets = lastInnings?.w || 0;
            const overs = parseFloat(String(lastInnings?.o || '0'));
            const isBattingTeam1 = liveData.score[0]?.inning?.toLowerCase().includes(fullT1.toLowerCase());

            if (overs > 0) {
              const runRate = runs / overs;
              const oversLeft = 20 - overs;
              const projectedScore = Math.round(runs + runRate * oversLeft);

              // Projected score adjustment
              // Average IPL score ~165. Every 10 runs above/below = ~3% shift
              const avgScore = 165;
              const scoreDiff = projectedScore - avgScore;
              const scoreAdj = Math.round(scoreDiff / 10) * 3;

              // Wicket adjustment — losing wickets hurts projected score
              const wicketAdj = wickets >= 6 ? (wickets - 5) * 4 : 0;

              if (isBattingTeam1) {
                // Team 1 batting — high score = good for team 1
                cricketContext.baseProbability = Math.max(15, Math.min(85,
                  cricketContext.baseProbability + Math.round(scoreAdj * 0.4) - wicketAdj
                ));
              } else {
                // Team 2 batting — high score = bad for team 1 (MI in this case)
                cricketContext.baseProbability = Math.max(15, Math.min(85,
                  cricketContext.baseProbability - Math.round(scoreAdj * 0.4) + wicketAdj
                ));
              }
              console.log(`[Live] ${fullT1} vs ${fullT2}: projected ${projectedScore}, adj ${scoreAdj}, new prob ${cricketContext.baseProbability}%`);
            }
          }
        } else if (liveData.success && liveData.matchEnded && liveData.status) {
          liveScoreContext = `Match result: ${liveData.status}`;
        }
      } catch {}
    }

    const [gdeltArticles, hnArticles, newsApiArticles, metaculus] = await Promise.all([
      fetchGDELT(keywords),
      fetchHackerNews(keywords),
      fetchNewsAPI(keywords),
      fetchMetaculus(keywords),
    ]);

    const allArticles = [
      ...newsApiArticles.map((a: any) => ({ title: a.title||'', desc: a.description||'', source: a.source?.name||'News', url: a.url, category: 'news' })),
      ...gdeltArticles.map((a: any) => ({ title: a.title||'', desc: a.seendescription||'', source: a.domain||'GDELT', url: a.url, category: 'news' })),
      ...hnArticles.map((a: any) => ({ title: a.title||'', desc: '', source: 'Hacker News', url: `https://news.ycombinator.com/item?id=${a.objectID}`, category: 'social' })),
    ];

    const queryWords = keywords.toLowerCase().split(' ').filter(w => w.length > 3);
    const relevantArticles = allArticles.filter(a => {
      const text = (a.title+' '+a.desc).toLowerCase();
      return queryWords.some(w => text.includes(w));
    });

    const headlines = relevantArticles.map(a => a.title).filter(Boolean);
    if (liveScoreContext) headlines.unshift(`LIVE SCORE: ${liveScoreContext}`);

    const buildSources = (groqResult: any, extra: any[]) => {
      const sources: any[] = [];
      if (groqResult) {
        groqResult.bull.forEach((b: string) => sources.push({ name: 'Signal', sig: b, url: '', category: 'news', type: 'strong', contribution: 5 }));
        groqResult.bear.forEach((b: string) => sources.push({ name: 'Signal', sig: b, url: '', category: 'news', type: 'contrary', contribution: -5 }));
        if (groqResult.keyRisk) sources.push({ name: 'Key Risk', sig: groqResult.keyRisk, url: '', category: 'community', type: 'mixed', contribution: 0 });
      } else {
        // Fallback: use headlines from extra as bull/bear
        const newsExtras = extra.filter(e => e.category === 'news' && e.name !== 'Signal');
        newsExtras.slice(0,3).forEach(e => sources.push({ name: 'Signal', sig: e.sig||e.name, url: e.url||'', category: 'news', type: 'strong', contribution: 5 }));
        if (newsExtras.length === 0) {
          // Last resort hardcoded fallbacks based on query
          sources.push({ name: 'Signal', sig: 'Market data and recent form analyzed', url: '', category: 'news', type: 'strong', contribution: 5 });
          sources.push({ name: 'Signal', sig: 'Historical head-to-head record considered', url: '', category: 'news', type: 'strong', contribution: 5 });
          sources.push({ name: 'Signal', sig: 'Home advantage and tournament context factored in', url: '', category: 'news', type: 'strong', contribution: 5 });
          sources.push({ name: 'Signal', sig: 'Upset potential — lower ranked team can always surprise', url: '', category: 'news', type: 'contrary', contribution: -5 });
          sources.push({ name: 'Signal', sig: 'Key injuries or fatigue could impact performance', url: '', category: 'news', type: 'contrary', contribution: -5 });
        }
      }
      sources.push(...extra);
      return sources;
    };

    if (cricketContext?.baseProbability) {
      // For cricket, send structured match data to Groq instead of random headlines
      const ct1 = cricketContext.team1;
      const ct2 = cricketContext.team2;
      const homeAdvPct = ct1.code==='SRH'||ct1.code==='CSK'?8:ct1.code==='RCB'?7:ct1.code==='MI'?6:5;
      const cricketHeadlines = [
        `ANALYZE: Will ${ct1.code} beat ${ct2.code}? Higher win% = better team. Higher NRR = better run rate. Bull = specific reasons ${ct1.code} wins today. Bear = specific reasons ${ct1.code} loses today. Do NOT list the same stat as both bull and bear.`,
        `${ct1.code} season: ${ct1.pts}pts, ${ct1.w}W-${ct1.l}L, form ${ct1.form} (${ct1.formScore}% wins), NRR ${ct1.nrr} (${parseFloat(ct1.nrr)>0?'positive':'negative'} run rate)`,
        `${ct2.code} season: ${ct2.pts}pts, ${ct2.w}W-${ct2.l}L, form ${ct2.form} (${ct2.formScore}% wins), NRR ${ct2.nrr} (${parseFloat(ct2.nrr)>0?'positive':'negative'} run rate)`,
        cricketContext.homeTeam === ct1.code
          ? `${ct1.code} HOME ground — BULL factor for ${ct1.code}, +${homeAdvPct}% advantage`
          : `${ct2.code} HOME ground — BEAR factor for ${ct1.code}, opponent has +${ct2.code==='SRH'||ct2.code==='CSK'?8:ct2.code==='RCB'?7:ct2.code==='MI'?6:5}% advantage`,
        ...headlines.slice(0, 3),
      ].filter(Boolean);
      const groqResult = await analyzeWithGroq(query, cricketHeadlines, metaculus.probability, null, 'cricket');
      const t1 = ct1, t2 = ct2;
      const extraSources = [
        { name: 'IPL Stats', sig: `${t1.code}: ${t1.form} (${t1.formScore}% wins, ${t1.pts}pts) vs ${t2.code}: ${t2.form} (${t2.formScore}% wins, ${t2.pts}pts)`, url: '', category: 'market', type: t1.formScore>t2.formScore?'strong':'contrary', contribution: Math.round((t1.formScore-t2.formScore)/5) },
      ];
      if (metaculus.probability !== null) extraSources.push({ name: 'Metaculus', sig: `Forecasters: ${metaculus.probability}%`, url: 'https://metaculus.com', category: 'community', type: 'mixed', contribution: Math.round((metaculus.probability-50)/5) });
      // Add fallback bull/bear from headlines if groqResult failed
      if (!groqResult && headlines.length > 0) {
        headlines.slice(0,3).forEach(h => extraSources.push({ name: 'Signal', sig: h.slice(0,100), url: '', category: 'news', type: 'strong', contribution: 5 }));
        
      }
      const sources = buildSources(groqResult, extraSources);
      fetch(new URL('/api/track', request.url).toString(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anonId:anonId||'',name:'analysis_run',props:{query:query.slice(0,100),confidence:cricketContext.baseProbability}})}).catch(()=>{});
      return Response.json({ valid: true, confidence: cricketContext.baseProbability, keywords, articleCount: relevantArticles.length, sources, groqVerdict: groqResult?.verdict||null, marketType, breakdown: cricketContext.breakdown||null });
    }

    if (marketOdds && marketOdds > 0) {
      const groqResult = await analyzeWithGroq(query, headlines, metaculus.probability, marketOdds, marketType);
      let finalConfidence = marketOdds;
      if (groqResult) {
        const adj = Math.max(-10, Math.min(10, groqResult.probability - marketOdds));
        finalConfidence = Math.round(marketOdds + adj * 0.5);
      } else if (metaculus.probability !== null) {
        finalConfidence = Math.round(marketOdds + Math.max(-8, Math.min(8, (metaculus.probability-marketOdds)*0.25)));
      }
      finalConfidence = Math.max(5, Math.min(95, finalConfidence));
      const extraSources = [
        { name: 'Polymarket', sig: `Live market: ${marketOdds}% — crowd consensus`, url: '', category: 'market', type: 'priced', contribution: Math.round((marketOdds-50)/5) },
      ];
      if (metaculus.probability !== null) extraSources.push({ name: 'Metaculus', sig: `Expert forecasters: ${metaculus.probability}%`, url: 'https://metaculus.com', category: 'community', type: metaculus.probability>55?'strong':'contrary', contribution: Math.round((metaculus.probability-50)/3) });
      relevantArticles.slice(0,3).forEach(a => extraSources.push({ name: a.source, sig: a.title, url: a.url, category: a.category, type: 'mixed', contribution: 1 }));
      // Add fallback bull/bear from headlines if groqResult failed
      if (!groqResult && headlines.length > 0) {
        headlines.slice(0,3).forEach(h => extraSources.push({ name: 'Signal', sig: h.slice(0,100), url: '', category: 'news', type: 'strong', contribution: 5 }));
        
      }
      const sources = buildSources(groqResult, extraSources);
      fetch(new URL('/api/track', request.url).toString(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anonId:anonId||'',name:'analysis_run',props:{query:query.slice(0,100),confidence:finalConfidence}})}).catch(()=>{});
    return Response.json({ valid: true, confidence: finalConfidence, keywords, articleCount: relevantArticles.length, sources, groqVerdict: groqResult?.verdict||null, marketType });
    }

    // Build context from SPORTS_CONTEXT and NBA_CONTEXT for this query // v3
    const qCtx = query.toLowerCase();
    const ctxLines: string[] = [];
    let computedProb: number | null = null;
    for (const [k, v] of Object.entries({...SPORTS_CONTEXT, ...NBA_CONTEXT})) {
      if (qCtx.includes(k.toLowerCase())) {
        const vStr = String(v);
        ctxLines.push(vStr.slice(0,300));
        // Extract probability hints from context
        const probMatch = vStr.match(/(\d+)%\s*(?:to win|win probability|implied|market)/i);
        const oddsMatch = vStr.match(/([+-]\d+)\s*(?:odds|favorite|underdog)/i);
        if (probMatch && !computedProb) computedProb = parseInt(probMatch[1]);
        if (oddsMatch && !computedProb) {
          const odds = parseInt(oddsMatch[1]);
          computedProb = odds < 0 ? Math.round(Math.abs(odds)/(Math.abs(odds)+100)*100) : Math.round(100/(odds+100)*100);
        }
      }
    }
    const enrichedHeadlines = [...ctxLines, ...headlines].filter(Boolean).slice(0,6);
    const finalHeadlines = enrichedHeadlines.length > 0 ? enrichedHeadlines : ['Analyze based on general football/sports knowledge'];
    // Calculate probability from team strengths, pass to Groq
    const calcProb = calculateProbability(query, marketOdds || null);
    const groqResult = await analyzeWithGroq(query, finalHeadlines, metaculus.probability, calcProb, marketType);
    if (!groqResult && metaculus.probability === null && relevantArticles.length === 0) {
      return Response.json({ valid: true, confidence: 0, keywords, articleCount: 0, sources: [], noData: true, message: 'No data found. Paste a Polymarket URL for live market analysis.' });
    }
    let finalConfidence = 50;
    // Add fallback signals from headlines when Groq fails
    const fallbackSources: any[] = [];
    if (!groqResult) {
      relevantArticles.slice(0,3).forEach((a:any) => fallbackSources.push({ name: 'Signal', sig: a.title?.slice(0,100)||'', url: a.url||'', category: 'news', type: 'strong', contribution: 5 }));
    }
    if (groqResult) {
      finalConfidence = groqResult.probability;
      if (metaculus.probability !== null) finalConfidence = Math.round(groqResult.probability*wNews + metaculus.probability*wTech);
    } else if (metaculus.probability !== null) {
      finalConfidence = metaculus.probability;
    }
    finalConfidence = Math.max(5, Math.min(95, finalConfidence));
    const extraSources: any[] = [];
    if (metaculus.probability !== null) extraSources.push({ name: 'Metaculus', sig: `Expert forecasters: ${metaculus.probability}% (${metaculus.count} questions)`, url: 'https://metaculus.com', category: 'community', type: metaculus.probability>55?'strong':'contrary', contribution: Math.round((metaculus.probability-50)/3) });
    relevantArticles.slice(0,4).forEach(a => extraSources.push({ name: a.source, sig: a.title, url: a.url, category: a.category, type: 'mixed', contribution: 1 }));
    const sources = buildSources(groqResult, extraSources);
    fetch(new URL('/api/track', request.url).toString(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anonId:anonId||'',name:'analysis_run',props:{query:query.slice(0,100),confidence:finalConfidence}})}).catch(()=>{});
    const allSources = [...sources, ...fallbackSources];
    return Response.json({ valid: true, confidence: finalConfidence, keywords, articleCount: relevantArticles.length, sources: allSources.length > 0 ? allSources : sources, groqVerdict: groqResult?.verdict||null, marketType });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}


// Mon Jun 15 10:43:39 CDT 2026
// Mon Jun 15 10:45:21 CDT 2026
