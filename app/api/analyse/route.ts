// app/api/analyse/route.ts
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const NEWS_API_KEY = process.env.NEWS_API_KEY;

// ── Sentiment scoring ──────────────────────────────────────────
const BULLISH = ['likely','confirms','surge','strong','positive','yes','growth',
  'beats','record','rises','rally','confidence','supports','agree','bullish',
  'wins','leads','ahead','dominates','breakthrough','launches','succeeds'];

const BEARISH = ['unlikely','doubt','fall','weak','negative','no','decline',
  'misses','drops','crash','risk','against','contrary','bearish','loses',
  'behind','fails','collapses','delays','cancels','struggles','controversy'];

function scoreHeadline(title: string, description: string): number {
  const text = (title + ' ' + description).toLowerCase();
  let score = 0;
  BULLISH.forEach(w => { if (text.includes(w)) score += 1; });
  BEARISH.forEach(w => { if (text.includes(w)) score -= 1; });
  return score;
}

// ── Keyword extraction ─────────────────────────────────────────
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

// ── Main handler ───────────────────────────────────────────────

function isValidQuestion(query: string): { valid: boolean; reason?: string } {
  if (query.length < 10) return { valid: false, reason: "Question too short" };
  
  const q = query.toLowerCase();
  
  // Must have question-like words
  const questionWords = ['will','would','could','can','should','when','what',
    'who','which','how','is','are','does','did','has','have','by','before','after'];
  if (!questionWords.some(w => q.includes(w)))
    return { valid: false, reason: "Doesn't look like a prediction question" };

  // Check for nonsense — real questions mention real things
  const realSignals = ['president','election','fed','rate','bitcoin','crypto',
    'war','ceasefire','gdp','inflation','ai','model','company','market',
    'price','stock','iran','china','russia','ukraine','us ','uk ','2025','2026',
    'january','february','march','april','may','june','july','august',
    'september','october','november','december','percent','%','dollar','euro'];
  
  // If very short and no real signals, likely nonsense
  if (query.length < 30 && !realSignals.some(w => q.includes(w)))
    return { valid: false, reason: "Question doesn't appear to be about a real verifiable event" };

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const { query, marketOdds } = await request.json();
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });

    const validation = isValidQuestion(query);
    if (!validation.valid) {
      return Response.json({
        valid: false,
        confidence: 0,
        reason: validation.reason,
        message: 'This doesn\'t appear to be a real prediction market question. Try asking about a verifiable world event.',
        examples: [
          'Will the Fed cut rates in May?',
          'Will Bitcoin hit $100k before April?',
          'Will there be a US-Iran ceasefire?'
        ]
      });
    }

    const keywords = extractKeywords(query);

    // Fetch news from NewsAPI
    let articles: any[] = [];
    let newsConfidence = 50; // fallback

    if (NEWS_API_KEY) {
      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${NEWS_API_KEY}`;
        const res  = await fetch(url, { next: { revalidate: 3600 } });
        const data = await res.json();

        if (data.articles && data.articles.length > 0) {
          articles = data.articles.slice(0, 10);

          // Score each headline
          const scores = articles.map((a: any) =>
            scoreHeadline(a.title || '', a.description || '')
          );
          const total   = scores.reduce((a: number, b: number) => a + b, 0);
          const maxScore = articles.length * 2; // max +2 per article

          // Normalize to 35-85% range
          const normalized = (total + maxScore) / (maxScore * 2);
          newsConfidence   = Math.round(35 + normalized * 50);
        }
      } catch (e) {
        console.error('NewsAPI error:', e);
      }
    }

    // If live market odds exist, blend with market signal
    let finalConfidence = newsConfidence;
    if (marketOdds && marketOdds > 0) {
      // 60% news sentiment, 40% market signal
      finalConfidence = Math.round(newsConfidence * 0.6 + marketOdds * 0.4);
    }

    // Clamp to 20-95
    finalConfidence = Math.max(20, Math.min(95, finalConfidence));

    // Build source signals for display
    const sources = articles.slice(0, 6).map((a: any) => {
      const score = scoreHeadline(a.title || '', a.description || '');
      return {
        name:         a.source?.name || 'News',
        sig:          a.title || '',
        url:          a.url,
        category:     'news',
        type:         score > 0 ? 'strong' : score < 0 ? 'contrary' : 'mixed',
        contribution: score > 0 ? Math.abs(score) * 5 : -(Math.abs(score) * 5),
        publishedAt:  a.publishedAt,
      };
    });

    // Add market source if we have odds
    if (marketOdds && marketOdds > 0) {
      sources.push({
        name:         'Polymarket',
        sig:          `Live market at ${marketOdds}% — crowd consensus`,
        url:          '',
        category:     'market',
        type:         'priced',
        contribution: Math.round((marketOdds - 50) / 5),
        publishedAt:  new Date().toISOString(),
      });
    }

    return Response.json({
      confidence: finalConfidence,
      keywords,
      articleCount: articles.length,
      sources,
    });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
