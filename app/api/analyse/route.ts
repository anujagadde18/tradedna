// app/api/analyse/route.ts
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const NEWS_API_KEY = process.env.NEWS_API_KEY;

// ── Question validation ────────────────────────────────────────
const MEDICAL_NONSENSE = [
  'clavicular','femoral','tibial','cranial','parietal','occipital',
  'mandibular','maxillary','vertebral','humeral','radial','ulnar',
  'patellar','calcaneal','metatarsal','metacarpal','phalanx','clavicle',
];

const REAL_SIGNALS = [
  'president','election','fed','rate','bitcoin','crypto','war','ceasefire',
  'gdp','inflation','ai','model','company','market','price','stock','iran',
  'china','russia','ukraine','us','uk','eu','2025','2026','january','february',
  'march','april','may','june','july','august','september','october','november',
  'december','percent','dollar','euro','senate','congress','supreme','court',
  'tariff','trade','oil','energy','climate','nuclear','military','election',
  'trump','biden','harris','musk','openai','google','apple','tesla','amazon',
];

function validateQuestion(query: string): { valid: boolean; reason?: string } {
  // Always valid if Polymarket URL
  if (query.includes("polymarket.com") || query.includes("/event/")) return { valid: true };
  if (!query || query.trim().length < 8)
    return { valid: false, reason: 'too_short' };

  const q = query.toLowerCase();

  // Reject medical terms used as names
  if (MEDICAL_NONSENSE.some(w => q.includes(w)))
    return { valid: false, reason: 'nonsense_entity' };

  // Must have question-like structure
  const hasQuestionWord = /\b(will|would|could|can|should|when|what|who|which|how|is|are|does|did|has|have|by|before|after)\b/i.test(query);
  if (!hasQuestionWord)
    return { valid: false, reason: 'not_a_question' };

  // Short questions must reference real things
  if (query.length < 25 && !REAL_SIGNALS.some(w => q.includes(w)))
    return { valid: false, reason: 'no_real_entity' };

  return { valid: true };
}

// ── Sentiment scoring ──────────────────────────────────────────
const BULLISH = ['likely','confirms','surge','strong','positive','yes','growth',
  'beats','record','rises','rally','confidence','supports','agree','bullish',
  'wins','leads','ahead','dominates','breakthrough','launches','succeeds',
  'approved','passes','elected','confirmed','achieved','exceeded'];

const BEARISH = ['unlikely','doubt','fall','weak','negative','no','decline',
  'misses','drops','crash','risk','against','contrary','bearish','loses',
  'behind','fails','collapses','delays','cancels','struggles','controversy',
  'rejected','blocked','denied','failed','missed','below'];

function scoreHeadline(title: string, description: string): number {
  const text = (title + ' ' + (description||'')).toLowerCase();
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
  return query
    .replace(/[?!.,]/g, '')
    .split(' ')
    .filter(w => w.length > 2 && !stop.has(w.toLowerCase()))
    .slice(0, 5)
    .join(' ');
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
    const probs = questions
      .map((q: any) => q.community_prediction?.full?.q2)
      .filter((p: any) => p !== null && p !== undefined);
    if (probs.length === 0) return { probability: null, count: questions.length };
    const avg = probs.reduce((a: number, b: number) => a + b, 0) / probs.length;
    return { probability: Math.round(avg * 100), count: questions.length };
  } catch { return { probability: null, count: 0 }; }
}

export async function POST(request: NextRequest) {
  try {
    const { query, marketOdds } = await request.json();
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });

    // ── Validate first — reject nonsense before any API calls ──
    const validation = validateQuestion(query);
    if (!validation.valid) {
      return Response.json({
        valid: false,
        confidence: 0,
        reason: validation.reason,
        message: "This doesn't appear to be a real prediction market question.",
        examples: [
          'Will the Fed cut rates in May 2026?',
          'Will Bitcoin hit $100k before April?',
          'Will there be a US-Iran ceasefire?',
          'Which company will have the top AI model by June 2026?',
        ],
        sources: [],
      });
    }

    const keywords = extractKeywords(query);

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
      ...newsArticles.slice(0, 5).map((a: any) => ({
        title: a.title || '', desc: a.description || '',
        source: a.source?.name || 'News', url: a.url, category: 'news',
      })),
      ...gdeltArticles.slice(0, 4).map((a: any) => ({
        title: a.title || '', desc: a.seendescription || '',
        source: a.domain || 'GDELT News', url: a.url, category: 'news',
      })),
      ...hnArticles.slice(0, 3).map((a: any) => ({
        title: a.title || '', desc: '',
        source: 'Hacker News', url: `https://news.ycombinator.com/item?id=${a.objectID}`, category: 'social',
      })),
    ];

    // Only use articles that actually mention query keywords
    const queryWords = keywords.toLowerCase().split(' ').filter(w => w.length > 3);
    const relevantArticles = allArticles.filter(a => {
      const text = (a.title + ' ' + a.desc).toLowerCase();
      return queryWords.some(w => text.includes(w));
    });

    // If no relevant articles found, return low confidence with no data
    if (relevantArticles.length === 0 && !metaculus.probability && !marketOdds) {
      return Response.json({
        valid: true,
        confidence: 35,
        keywords,
        articleCount: 0,
        sources: [],
        noData: true,
        message: 'No relevant news found. Try pasting a Polymarket URL for live odds.',
      });
    }

    // If no articles but we have market odds, use market as primary signal
    if (relevantArticles.length === 0 && marketOdds && marketOdds > 0) {
      return Response.json({
        valid: true,
        confidence: marketOdds,
        keywords,
        articleCount: 0,
        sources: [{
          name: 'Polymarket',
          sig: `Live market at ${marketOdds}% — crowd consensus`,
          url: '',
          category: 'market',
          type: 'priced',
          contribution: Math.round((marketOdds - 50) / 5),
        }],
      });
    }

    let newsConfidence = 50;
    if (relevantArticles.length > 0) {
      const scores = relevantArticles.map(a => scoreHeadline(a.title, a.desc));
      const positives = scores.filter(s => s > 0).length;
      const negatives = scores.filter(s => s < 0).length;
      const total = scores.reduce((a, b) => a + b, 0);
      const maxScore = relevantArticles.length * 2;
      const normalized = (total + maxScore) / (maxScore * 2);
      // More aggressive spread — don't cluster around 50
      newsConfidence = Math.round(25 + normalized * 65);
      // Bias based on article count direction
      if (positives > negatives * 2) newsConfidence = Math.min(85, newsConfidence + 10);
      if (negatives > positives * 2) newsConfidence = Math.max(20, newsConfidence - 10);
    }

    // If marketOdds exists, weight it heavily — it's the ground truth
    const signals: { value: number; weight: number }[] = [];
    if (marketOdds && marketOdds > 0) {
      signals.push({ value: marketOdds, weight: 0.45 });
      signals.push({ value: newsConfidence, weight: 0.35 });
      if (metaculus.probability !== null) signals.push({ value: metaculus.probability, weight: 0.2 });
    } else if (metaculus.probability !== null) {
      signals.push({ value: newsConfidence, weight: 0.5 });
      signals.push({ value: metaculus.probability, weight: 0.5 });
    } else {
      // News only — use it directly but add variance
      signals.push({ value: newsConfidence, weight: 1.0 });
    }

    const totalWeight = signals.reduce((a, s) => a + s.weight, 0);
    let finalConfidence = Math.round(
      signals.reduce((a, s) => a + s.value * (s.weight / totalWeight), 0)
    );
    finalConfidence = Math.max(20, Math.min(95, finalConfidence));

    // Build sources from REAL articles only
    const sources: any[] = relevantArticles.slice(0, 6).map(a => {
      const score = scoreHeadline(a.title, a.desc);
      return {
        name: a.source,
        sig: a.title,
        url: a.url,
        category: a.category,
        type: score > 0 ? 'strong' : score < 0 ? 'contrary' : 'mixed',
        contribution: score !== 0 ? (score > 0 ? Math.abs(score) * 5 : -(Math.abs(score) * 5)) : 1,
      };
    });

    if (metaculus.probability !== null) {
      sources.push({
        name: 'Metaculus',
        sig: `Community forecasters: ${metaculus.probability}% probability across ${metaculus.count} related questions`,
        url: 'https://metaculus.com',
        category: 'community',
        type: metaculus.probability > 55 ? 'strong' : metaculus.probability < 45 ? 'contrary' : 'mixed',
        contribution: Math.round((metaculus.probability - 50) / 3),
      });
    }

    if (marketOdds && marketOdds > 0) {
      sources.push({
        name: 'Polymarket',
        sig: `Live market at ${marketOdds}% — crowd consensus`,
        url: '',
        category: 'market',
        type: 'priced',
        contribution: Math.round((marketOdds - 50) / 5),
      });
    }

    return Response.json({
      valid: true,
      confidence: finalConfidence,
      keywords,
      articleCount: relevantArticles.length,
      sources,
    });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
