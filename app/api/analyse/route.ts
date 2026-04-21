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

function getMarketContext(type: string, query: string): string {
  const contexts: Record<string, string> = {
    cricket: 'Focus on: team form (last 5 matches), home advantage, head-to-head record, key players, pitch conditions. IPL 2026 season context.',
    nba: 'Focus on: team record, playoff seeding, home court advantage, key injuries, head-to-head, historical championship odds for #1 seeds (~30%).',
    f1: 'Focus on: driver championship points, team performance, circuit history, recent race results, reliability.',
    soccer: 'Focus on: league position, recent form, head-to-head, home/away record, key injuries, European competition context.',
    eurovision: 'Focus on: betting market history (markets predict winner 70%+ accuracy), country performance history, song style trends, televote vs jury split.',
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
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return (data.articles || []).slice(0, 6);
  } catch { return []; }
}

async function fetchHackerNews(keywords: string): Promise<any[]> {
  try {
    const q = encodeURIComponent(keywords);
    const url = `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&numericFilters=created_at_i>${Math.floor(Date.now()/1000) - 604800}&hitsPerPage=6`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return (data.hits || []).slice(0, 4);
  } catch { return []; }
}

async function fetchNewsAPI(keywords: string): Promise<any[]> {
  if (!NEWS_API_KEY) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&sortBy=publishedAt&pageSize=8&language=en&apiKey=${NEWS_API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return (data.articles || []).slice(0, 6);
  } catch { return []; }
}

async function fetchMetaculus(keywords: string): Promise<{ probability: number | null; count: number }> {
  try {
    const q = encodeURIComponent(keywords);
    const url = `https://www.metaculus.com/api2/questions/?search=${q}&status=open&order_by=-activity&limit=3`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const questions = data.results || [];
    if (questions.length === 0) return { probability: null, count: 0 };
    const probs = questions.map((q: any) => q.community_prediction?.full?.q2).filter((p: any) => p !== null && p !== undefined);
    if (probs.length === 0) return { probability: null, count: questions.length };
    const avg = probs.reduce((a: number, b: number) => a + b, 0) / probs.length;
    return { probability: Math.round(avg * 100), count: questions.length };
  } catch { return { probability: null, count: 0 }; }
}

async function analyzeWithGroq(
  query: string,
  headlines: string[],
  metaculusPct: number | null,
  marketOdds: number | null,
  marketType: string
): Promise<{ probability: number; bull: string[]; bear: string[]; keyRisk: string; verdict: string } | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const headlineText = headlines.slice(0, 8).map((h, i) => `${i+1}. ${h}`).join('\n');
    const marketContext = marketOdds ? `Prediction market (Polymarket) odds: ${marketOdds}%` : '';
    const metaContext = metaculusPct ? `Expert forecasters (Metaculus): ${metaculusPct}%` : '';
    const typeContext = getMarketContext(marketType, query);

    const prompt = `You are a prediction market analyst. Return ONLY valid JSON. No other text.

Question: "${query}"
Market type: ${marketType}
${marketContext}
${metaContext}

Headlines (ONLY use facts from these — do NOT invent any statistics, names, scores, or numbers not present here):
${headlineText || 'No headlines available. Use only general knowledge, no invented stats.'}

Analysis guidance: ${typeContext}

STRICT RULES:
1. NEVER invent statistics, player names, scores, or numbers not in the headlines above
2. If headlines have no relevant data, say "Limited data available" as a factor
3. probability must be integer 0-100
4. If Polymarket odds given: stay within +-8% of them
5. If Metaculus given: weight it at 40%
6. Each factor max 12 words, must be factual not opinion
7. NO "based on analysis", "it appears", "I believe", "historically speaking"
8. If you are not certain of a fact, do not include it

Return ONLY this JSON:
{"probability":65,"bull":["Fact from headlines or known data","Fact 2","Fact 3"],"bear":["Risk factor 1","Risk factor 2","Risk factor 3"],"keyRisk":"Most important unknown, max 12 words","verdict":"3-5 word verdict"}

Verdict options: "Strong YES signal", "Leaning YES", "Too close to call", "Leaning NO", "Strong NO signal"`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
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
          'RR':  {p:7,  w:6, l:1, pts:12, nrr:'+0.923', form:'WWWWWL'},
          'RCB': {p:9,  w:6, l:3, pts:12, nrr:'+0.534', form:'WWLLWWW'},
          'PBKS':{p:9,  w:5, l:3, pts:10, nrr:'+0.612', form:'WLWLWWW'},
          'DC':  {p:9,  w:5, l:4, pts:10, nrr:'+0.298', form:'LWWLWLW'},
          'GT':  {p:10, w:5, l:5, pts:10, nrr:'+0.021', form:'LWLWLWWL'},
          'SRH': {p:9,  w:4, l:5, pts:8,  nrr:'+0.045', form:'WLLWLLWL'},
          'MI':  {p:10, w:3, l:7, pts:6,  nrr:'-0.398', form:'WLLWLLLLW'},
          'LSG': {p:9,  w:3, l:6, pts:6,  nrr:'-0.312', form:'LLLWWWLL'},
          'CSK': {p:9,  w:3, l:6, pts:6,  nrr:'-0.198', form:'LLLLLWWW'},
          'KKR': {p:10, w:1, l:8, pts:2,  nrr:'-0.934', form:'LLLLLLLNL'},
        };
        const HOME_ADV: Record<string,number> = {'SRH':8,'MI':6,'RCB':7,'CSK':8,'KKR':5,'DC':4,'RR':5,'GT':4,'LSG':5,'PBKS':4};
        const VENUE_CITIES: Record<string,string[]> = {
          'SRH':['hyderabad'],'MI':['mumbai','wankhede'],'RCB':['bengaluru','bangalore','chinnaswamy'],
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
          const homeAdv1 = homeTeam===c1 ? (HOME_ADV[c1]||0)*1.5 : 0;
          const homeAdv2 = homeTeam===c2 ? (HOME_ADV[c2]||0)*1.5 : 0;
          let s1 = f1*0.35 + (t1.pts/Math.max(t1.pts+t2.pts,1))*100*0.30 + ((nrr1/nrrMax+1)/2*100*0.20) + homeAdv1;
          let s2 = f2*0.35 + (t2.pts/Math.max(t1.pts+t2.pts,1))*100*0.30 + ((nrr2/nrrMax+1)/2*100*0.20) + homeAdv2;
          const raw = s1/(s1+s2)*100;
          const stretched = 50+(raw-50)*1.6;
          const baseProbability = Math.round(Math.max(20,Math.min(82,stretched)));
          cricketContext = { baseProbability, team1:{...t1,code:c1,formScore:f1}, team2:{...t2,code:c2,formScore:f2}, homeTeam };
        }
      }
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

    const buildSources = (groqResult: any, extra: any[]) => {
      const sources: any[] = [];
      if (groqResult) {
        groqResult.bull.forEach((b: string) => sources.push({ name: 'Signal', sig: b, url: '', category: 'news', type: 'strong', contribution: 5 }));
        groqResult.bear.forEach((b: string) => sources.push({ name: 'Signal', sig: b, url: '', category: 'news', type: 'contrary', contribution: -5 }));
        if (groqResult.keyRisk) sources.push({ name: 'Key Risk', sig: groqResult.keyRisk, url: '', category: 'community', type: 'mixed', contribution: 0 });
      }
      sources.push(...extra);
      return sources;
    };

    if (cricketContext?.baseProbability) {
      const groqResult = await analyzeWithGroq(query, headlines, metaculus.probability, null, 'cricket');
      const t1 = cricketContext.team1, t2 = cricketContext.team2;
      const extraSources = [
        { name: 'IPL Stats', sig: `${t1.code}: ${t1.form} (${t1.formScore}% wins, ${t1.pts}pts) vs ${t2.code}: ${t2.form} (${t2.formScore}% wins, ${t2.pts}pts)`, url: '', category: 'market', type: t1.formScore>t2.formScore?'strong':'contrary', contribution: Math.round((t1.formScore-t2.formScore)/5) },
      ];
      if (metaculus.probability !== null) extraSources.push({ name: 'Metaculus', sig: `Forecasters: ${metaculus.probability}%`, url: 'https://metaculus.com', category: 'community', type: 'mixed', contribution: Math.round((metaculus.probability-50)/5) });
      const sources = buildSources(groqResult, extraSources);
      fetch(new URL('/api/track', request.url).toString(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anonId:anonId||'',name:'analysis_run',props:{query:query.slice(0,100),confidence:cricketContext.baseProbability}})}).catch(()=>{});
      return Response.json({ valid: true, confidence: cricketContext.baseProbability, keywords, articleCount: relevantArticles.length, sources, groqVerdict: groqResult?.verdict||null, marketType });
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
      const sources = buildSources(groqResult, extraSources);
      fetch(new URL('/api/track', request.url).toString(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anonId:anonId||'',name:'analysis_run',props:{query:query.slice(0,100),confidence:finalConfidence}})}).catch(()=>{});
      return Response.json({ valid: true, confidence: finalConfidence, keywords, articleCount: relevantArticles.length, sources, groqVerdict: groqResult?.verdict||null, marketType });
    }

    const groqResult = await analyzeWithGroq(query, headlines, metaculus.probability, null, marketType);
    if (!groqResult && metaculus.probability === null && relevantArticles.length === 0) {
      return Response.json({ valid: true, confidence: 0, keywords, articleCount: 0, sources: [], noData: true, message: 'No data found. Paste a Polymarket URL for live market analysis.' });
    }
    let finalConfidence = 50;
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
    return Response.json({ valid: true, confidence: finalConfidence, keywords, articleCount: relevantArticles.length, sources, groqVerdict: groqResult?.verdict||null, marketType });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
