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
    const { query, marketOdds } = await request.json();
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });

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

    // CRICKET CONTEXT — for IPL matches, fetch team stats for better predictions
    let cricketContext: any = null;
    const isIPLQuery = /ipl|indian premier league|cricket/i.test(query);
    if (isIPLQuery) {
      // Extract team names from query like "Will KKR beat LSG in IPL 2026?"
      const teamMatch = query.match(/will\s+(.+?)\s+beat\s+(.+?)(?:\s+in|\?|$)/i);
      if (teamMatch) {
        try {
          const res = await fetch(new URL('/api/cricket-context', 'https://tradedna-8sn1.vercel.app').toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team1: teamMatch[1].trim(), team2: teamMatch[2].trim() }),
          });
          if (res.ok) cricketContext = await res.json();
        } catch {}
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
        newsAdjustment = Math.max(-15, Math.min(15, total * 3));
      }
      if (metaculus.probability !== null) {
        newsAdjustment += (metaculus.probability - marketOdds) * 0.15;
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
      newsConfidence = cricketContext.baseProbability;
      // Adjust by news sentiment ±10 pts
      if (relevantArticles.length > 0) {
        const scores = relevantArticles.map((a:any) => scoreHeadline(a.title, a.desc));
        const total = scores.reduce((a:number, b:number) => a + b, 0);
        const newsAdj = Math.max(-10, Math.min(10, total * 2));
        newsConfidence = Math.round(newsConfidence + newsAdj);
      }
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
    if (metaculus.probability !== null) {
      finalConfidence = Math.round(newsConfidence * 0.45 + metaculus.probability * 0.55);
    } else {
      finalConfidence = newsConfidence;
    }
    finalConfidence = Math.max(10, Math.min(95, finalConfidence));

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

    return Response.json({ valid: true, confidence: finalConfidence, keywords, articleCount: relevantArticles.length, sources });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
