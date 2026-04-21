import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

const NEWS_API_KEY = process.env.NEWS_API_KEY;

const REAL_SIGNALS = [
  'president','election','fed','rate','bitcoin','crypto','war','ceasefire',
  'gdp','inflation','ai','model','company','market','price','stock','iran',
  'china','russia','ukraine','us','uk','eu','2025','2026',
  'percent','dollar','euro','senate','congress','supreme','court',
  'tariff','trade','oil','energy','climate','nuclear','military',
  'trump','biden','harris','musk','openai','google','apple','tesla','amazon',
  'nasa','space','temperature','weather','storm','hurricane','earthquake',
  'ipl','cricket','masters','golf','champions','league','world cup',
];

function validateQuestion(query: string): { valid: boolean; reason?: string } {
  if (query.includes('polymarket.com') || query.includes('/event/')) return { valid: true };
  if (!query || query.trim().length < 8) return { valid: false, reason: 'too_short' };
  // Accept everything — sports, politics, science, NASA, entertainment, anything
  return { valid: true };
}

const BULLISH = [
  'likely','confirms','surge','strong','positive','yes','growth','beats','record',
  'rises','rally','confidence','supports','agree','bullish','wins','leads','ahead',
  'dominates','breakthrough','launches','succeeds','approved','passes','elected',
  'confirmed','achieved','exceeded','expected','imminent','announced','deal','accord',
  'progress','agreement','ceasefire','truce','peace','signed','enacted','passed',
  'raised','increased','higher','above','beat','exceeded','soars','boosts','up',
  'gain','advance','climb','recover','rebound','optimistic','positive','favorable',
];

const BEARISH = [
  'unlikely','doubt','fall','weak','negative','no','decline','misses','drops',
  'crash','risk','against','contrary','bearish','loses','behind','fails',
  'collapses','delays','cancels','struggles','controversy','rejected','blocked',
  'denied','failed','missed','below','cut','lowered','reduced','slump','plunge',
  'concerns','warned','threat','crisis','escalation','breakdown','collapse',
  'opposed','vetoed','halted','suspended','terminated','down','loss','bearish',
  'pessimistic','unfavorable','worsen','deteriorate','tumble','slide',
];

function scoreHeadline(title: string, description: string): number {
  const text = (title + ' ' + (description || '')).toLowerCase();
  let score = 0;
  BULLISH.forEach(w => { if (text.includes(w)) score += 1; });
  BEARISH.forEach(w => { if (text.includes(w)) score -= 1; });
  return score;
}

function extractKeywords(query: string): string {
  const stop = new Set(['will','there','that','this','what','when','have',
    'does','with','would','the','and','for','are','by','in','on','at',
    'to','of','a','an','be','is','it','any','over','than','more','less',
    'how','who','which','where','why','can','could','should','may','might']);
  return query.replace(/[?!.,]/g, '').split(' ')
    .filter(w => w.length > 2 && !stop.has(w.toLowerCase()))
    .slice(0, 5).join(' ');
}

async function fetchGDELT(keywords: string): Promise<any[]> {
  try {
    const q = encodeURIComponent(keywords);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=10&format=json&timespan=7d&sourcelang=eng`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return (data.articles || []).slice(0, 8);
  } catch { return []; }
}

async function fetchHackerNews(keywords: string): Promise<any[]> {
  try {
    const q = encodeURIComponent(keywords);
    const url = `https://hn.algolia.com/api/v1/search?query=${q}&tags=story&numericFilters=created_at_i>${Math.floor(Date.now()/1000) - 604800}&hitsPerPage=8`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return (data.hits || []).slice(0, 6);
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

export async function POST(request: NextRequest) {
  try {
    const { query, marketOdds, anonId, isSignedIn, weights } = await request.json();
    const w = weights || { news:30, social:30, technical:40 }; // Metaculus is most reliable signal
    const wNews = (w.news || 35) / 100;
    const wSocial = (w.social || 40) / 100;
    const wTech = (w.technical || 25) / 100;
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });

    // Usage limit — 5 free analyses per day per user (bypassed for signed-in users)
    if (anonId && !isSignedIn) {
      try {
        const { neon } = await import('@neondatabase/serverless');
        const sql = neon(process.env.DATABASE_URL!);
        const today = new Date().toISOString().split('T')[0];
        const usage = await sql`
          SELECT COUNT(*)::int as count FROM events 
          WHERE user_id = ${anonId}::uuid 
          AND name = 'analysis_run' 
          AND created_at >= ${today}::date
        `;
        const count = usage[0]?.count || 0;
        if (count >= 5) {
          return Response.json({ 
            valid: false, 
            limitReached: true,
            usageCount: count,
            message: 'You have used your 5 free analyses today. Sign in to get unlimited access.',
            sources: [] 
          });
        }
      } catch {} // Don't block if DB fails
    }

    const validation = validateQuestion(query);
    if (!validation.valid) {
      return Response.json({
        valid: false, confidence: 0, reason: validation.reason,
        message: "This doesn't appear to be a real prediction market question.",
        examples: [
          'Will the Fed cut rates in May 2026?',
          'Will Bitcoin hit $100k before April?',
          'Will there be a US-Iran ceasefire?',
        ],
        sources: [],
      });
    }

    const keywords = extractKeywords(query);

    // CRICKET CONTEXT — inline for IPL matches
    let cricketContext: any = null;
    const isIPLQuery = /ipl|indian premier league|cricket/i.test(query);
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
          // Updated April 20 after Match 30 (MI beat GT)
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
        // Venue home advantage
        const HOME_ADV: Record<string,number> = {
          'SRH':8,'MI':6,'RCB':7,'CSK':8,'KKR':5,'DC':4,'RR':5,'GT':4,'LSG':5,'PBKS':4
        };
        const c1 = TEAM_MAP[teamMatch[1].trim().toLowerCase()];
        const c2 = TEAM_MAP[teamMatch[2].trim().toLowerCase()];
        if (c1 && c2 && POINTS[c1] && POINTS[c2]) {
          const t1 = POINTS[c1], t2 = POINTS[c2];
          const f1 = Math.round(((t1.form.match(/W/g)||[]).length/t1.form.length)*100);
          const f2 = Math.round(((t2.form.match(/W/g)||[]).length/t2.form.length)*100);
          const nrr1 = parseFloat(t1.nrr), nrr2 = parseFloat(t2.nrr);
          const nrrMax = Math.max(Math.abs(nrr1),Math.abs(nrr2),0.1);
          // Detect home team: the team playing at their city gets home advantage
          // In IPL questions "Will A beat B" — B is usually the home team (host)
          // But we check both to be safe
          const HOME_CITIES: Record<string,string> = {
            'SRH':'Hyderabad','MI':'Mumbai','RCB':'Bengaluru','CSK':'Chennai',
            'KKR':'Kolkata','DC':'Delhi','RR':'Jaipur','GT':'Ahmedabad',
            'LSG':'Lucknow','PBKS':'New Chandigarh',
          };
          const CHASE_ADV: Record<string,number> = { // venues where chasing is strong
            'SRH':3,'MI':2,'KKR':1,'DC':2,'LSG':2,
          };
          // Home advantage — only ONE team can be home per match
          // In "Will A beat B" format, we detect home team from the IPL schedule
          // Each team plays half their games at home — use team code to identify
          const HOME_CITIES: Record<string,string[]> = {
            'SRH':['hyderabad'],'MI':['mumbai','wankhede'],'RCB':['bengaluru','bangalore','chinnaswamy'],
            'CSK':['chennai','chepauk'],'KKR':['kolkata','eden'],'DC':['delhi'],
            'RR':['jaipur','guwahati'],'GT':['ahmedabad','narendra'],'LSG':['lucknow'],
            'PBKS':['chandigarh','dharamshala','mohali'],
          };
          // Simple heuristic: in IPL schedule, home team is usually mentioned second
          // But we also check if the query mentions a venue
          const queryLower = query.toLowerCase();
          let homeTeam = c2; // default: c2 is home
          // Check if query mentions c1's home city
          const c1Cities = HOME_CITIES[c1] || [];
          const c2Cities = HOME_CITIES[c2] || [];
          if (c1Cities.some(city => queryLower.includes(city))) homeTeam = c1;
          else if (c2Cities.some(city => queryLower.includes(city))) homeTeam = c2;
          
          const homeAdv1 = homeTeam === c1 ? (HOME_ADV[c1]||0) * 1.5 : 0;
          const homeAdv2 = homeTeam === c2 ? (HOME_ADV[c2]||0) * 1.5 : 0;
          let s1 = f1*0.35 + (t1.pts/Math.max(t1.pts+t2.pts,1))*100*0.30 + ((nrr1/nrrMax+1)/2*100*0.20) + homeAdv1;
          let s2 = f2*0.35 + (t2.pts/Math.max(t1.pts+t2.pts,1))*100*0.30 + ((nrr2/nrrMax+1)/2*100*0.20) + homeAdv2;
          const raw = s1/(s1+s2)*100;
          const stretched = 50+(raw-50)*1.6;
          const baseProbability = Math.round(Math.max(20,Math.min(82,stretched)));
          console.log(`[Cricket] ${c1}(${baseProbability}%) vs ${c2}(${100-baseProbability}%) home:${c2}+${homeAdv2}`);
          cricketContext = { baseProbability, team1:{...t1,code:c1,formScore:f1}, team2:{...t2,code:c2,formScore:f2} };
        } else {
          console.log(`[Cricket] Teams not found: "${teamMatch[1]}"→${c1}, "${teamMatch[2]}"→${c2}`);
        }
      }
    }

    const [gdeltArticles, hnArticles, metaculus] = await Promise.all([
      fetchGDELT(keywords),
      fetchHackerNews(keywords),
      fetchMetaculus(keywords),
    ]);

    let newsArticles: any[] = [];
    if (NEWS_API_KEY) {
      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${NEWS_API_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        newsArticles = data.articles || [];
      } catch {}
    }

    const allArticles = [
      ...newsArticles.slice(0, 5).map((a: any) => ({ title: a.title || '', desc: a.description || '', source: a.source?.name || 'News', url: a.url, category: 'news' })),
      ...gdeltArticles.slice(0, 4).map((a: any) => ({ title: a.title || '', desc: a.seendescription || '', source: a.domain || 'GDELT News', url: a.url, category: 'news' })),
      ...hnArticles.slice(0, 3).map((a: any) => ({ title: a.title || '', desc: '', source: 'Hacker News', url: `https://news.ycombinator.com/item?id=${a.objectID}`, category: 'social' })),
    ];

    const queryWords = keywords.toLowerCase().split(' ').filter(w => w.length > 3);
    const relevantArticles = allArticles.filter(a => {
      const text = (a.title + ' ' + a.desc).toLowerCase();
      return queryWords.some(w => text.includes(w));
    });

    // MARKET ODDS = ground truth, adjust by news ±15pts max
    if (marketOdds && marketOdds > 0) {
      let newsAdjustment = 0;
      if (relevantArticles.length > 0) {
        const scores = relevantArticles.map(a => scoreHeadline(a.title, a.desc));
        const total = scores.reduce((a, b) => a + b, 0);
        newsAdjustment = Math.max(-8, Math.min(8, total * 2));
      }
      if (metaculus.probability !== null) {
        newsAdjustment += (metaculus.probability - marketOdds) * 0.25;
      }
      let finalConfidence = Math.round(marketOdds + newsAdjustment);
      finalConfidence = Math.max(5, Math.min(95, finalConfidence));

      const sources: any[] = relevantArticles.slice(0, 6).map(a => {
        const score = scoreHeadline(a.title, a.desc);
        return { name: a.source, sig: a.title, url: a.url, category: a.category, type: score > 0 ? 'strong' : score < 0 ? 'contrary' : 'mixed', contribution: score !== 0 ? (score > 0 ? Math.abs(score) * 5 : -(Math.abs(score) * 5)) : 1 };
      });
      sources.push({ name: 'Polymarket', sig: `Live market at ${marketOdds}% — crowd consensus`, url: '', category: 'market', type: 'priced', contribution: Math.round((marketOdds - 50) / 5) });
      if (metaculus.probability !== null) sources.push({ name: 'Metaculus', sig: `Community forecasters: ${metaculus.probability}%`, url: 'https://metaculus.com', category: 'community', type: metaculus.probability > 55 ? 'strong' : metaculus.probability < 45 ? 'contrary' : 'mixed', contribution: Math.round((metaculus.probability - 50) / 3) });

      return Response.json({ valid: true, confidence: finalConfidence, keywords, articleCount: relevantArticles.length, sources });
    }

    // NO MARKET ODDS — use cricket stats + news + metaculus
    if (relevantArticles.length === 0 && !metaculus.probability && !cricketContext) {
      return Response.json({ valid: true, confidence: 35, keywords, articleCount: 0, sources: [], noData: true, message: 'No relevant news found. Try pasting a Polymarket URL for live odds.' });
    }

    let newsConfidence = 50;

    // If we have cricket context, start from stats-based probability
    if (cricketContext?.baseProbability) {
      // Cricket stats are the ground truth — news can only adjust ±8 pts max
      newsConfidence = cricketContext.baseProbability;
      if (relevantArticles.length > 0) {
        const scores = relevantArticles.map((a:any) => scoreHeadline(a.title, a.desc));
        const total = scores.reduce((a:number, b:number) => a + b, 0);
        // Very small news adjustment — cricket stats dominate
        const newsAdj = Math.max(-8, Math.min(8, total * 1));
        newsConfidence = Math.round(newsConfidence + newsAdj);
      }
      // Hard clamp — if cricket says underdog (<40%), keep them underdog despite news
      if (cricketContext.baseProbability < 40) newsConfidence = Math.min(45, newsConfidence);
      if (cricketContext.baseProbability > 60) newsConfidence = Math.max(55, newsConfidence);
    } else if (relevantArticles.length > 0) {
      const scores = relevantArticles.map(a => scoreHeadline(a.title, a.desc));
      const positives = scores.filter(s => s > 0).length;
      const negatives = scores.filter(s => s < 0).length;
      const total = scores.reduce((a, b) => a + b, 0);
      const maxScore = Math.max(relevantArticles.length * 2, 1);
      const normalized = (total + maxScore) / (maxScore * 2);
      newsConfidence = Math.round(20 + normalized * 70);
      if (positives > negatives * 2) newsConfidence = Math.min(85, newsConfidence + 12);
      if (negatives > positives * 2) newsConfidence = Math.max(15, newsConfidence - 12);
      // Avoid clustering at 50 — push to extremes when signal is clear
      if (newsConfidence > 48 && newsConfidence < 52) newsConfidence = positives >= negatives ? 55 : 45;
    }

    let finalConfidence: number;
    // Apply user weights to final confidence
    if (cricketContext?.baseProbability) {
      // Cricket — use base probability directly
      finalConfidence = newsConfidence;
    } else if (metaculus.probability !== null) {
      // Blend: news (weighted), metaculus as technical signal
      const newsW = wNews + wSocial; // combine news+social
      const techW = wTech;
      const total = newsW + techW;
      finalConfidence = Math.round((newsConfidence * newsW + metaculus.probability * techW) / total);
    } else {
      finalConfidence = newsConfidence;
    }
    finalConfidence = Math.max(10, Math.min(95, finalConfidence));
    // Final absolute clamp for cricket — never flip the favourite
    if (cricketContext?.baseProbability) {
      if (cricketContext.baseProbability <= 35) finalConfidence = Math.min(42, finalConfidence);
      if (cricketContext.baseProbability >= 65) finalConfidence = Math.max(58, finalConfidence);
    }

    const sources: any[] = relevantArticles.slice(0, 6).map((a:any) => {
      const score = scoreHeadline(a.title, a.desc);
      return { name: a.source, sig: a.title, url: a.url, category: a.category, type: score > 0 ? 'strong' : score < 0 ? 'contrary' : 'mixed', contribution: score !== 0 ? (score > 0 ? Math.abs(score) * 5 : -(Math.abs(score) * 5)) : 1 };
    });
    if (metaculus.probability !== null) sources.push({ name: 'Metaculus', sig: `Community forecasters: ${metaculus.probability}% across ${metaculus.count} questions`, url: 'https://metaculus.com', category: 'community', type: metaculus.probability > 55 ? 'strong' : metaculus.probability < 45 ? 'contrary' : 'mixed', contribution: Math.round((metaculus.probability - 50) / 3) });
    if (cricketContext?.team1) {
      const t1 = cricketContext.team1;
      const t2 = cricketContext.team2;
      sources.unshift({ name: 'IPL Stats', sig: `Form: ${t1.form} (${t1.formScore}% wins) vs ${t2.form} (${t2.formScore}% wins). Points: ${t1.pts} vs ${t2.pts}`, url: '', category: 'market', type: t1.formScore > t2.formScore ? 'strong' : t1.formScore < t2.formScore ? 'contrary' : 'mixed', contribution: Math.round((t1.formScore - t2.formScore) / 5) });
      if (cricketContext.h2h) sources.unshift({ name: 'Head-to-Head', sig: cricketContext.h2h, url: '', category: 'market', type: 'mixed', contribution: 1 });
    }

    fetch(new URL('/api/track', request.url).toString(), {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anonId:anonId||'',name:'analysis_run',props:{query:query.slice(0,100),confidence:finalConfidence}})}).catch(()=>{});
    return Response.json({ valid: true, confidence: finalConfidence, keywords, articleCount: relevantArticles.length, sources });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
