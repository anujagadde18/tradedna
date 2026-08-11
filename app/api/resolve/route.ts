import { NextRequest } from 'next/server';

/**
 * Prediction resolver.
 * Takes questions the app has predicted on and checks them against SETTLED
 * Polymarket markets. Only returns a verdict when the match is confident and
 * the market has actually resolved - otherwise the prediction stays pending.
 * Guessing here would defeat the point of a public accuracy record.
 */

const STOP = new Set([
  'will','the','and','for','what','who','next','with','this','that','before','after',
  'beat','win','wins','won','in','on','at','to','a','an','of','by','vs','be','is','are','it',
]);

function keywords(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP.has(w));
}

/** Word-overlap score between a stored question and a market title. */
function matchScore(question: string, title: string): number {
  const q = keywords(question);
  const t = new Set(keywords(title));
  if (q.length === 0) return 0;
  const hits = q.filter(w => t.has(w)).length;
  return hits / q.length;
}

/** Reads the settled outcome of a market: which side paid out. */
function settledOutcome(market: any): { winner: string; index: number } | null {
  try {
    const prices = typeof market.outcomePrices === 'string'
      ? JSON.parse(market.outcomePrices) : market.outcomePrices;
    const names = typeof market.outcomes === 'string'
      ? JSON.parse(market.outcomes) : market.outcomes;
    if (!Array.isArray(prices) || !Array.isArray(names) || prices.length < 2) return null;
    // A settled market pays 1 to the winning side and 0 to the loser.
    const nums = prices.map((p: any) => parseFloat(p));
    const top = Math.max(...nums);
    if (isNaN(top) || top < 0.97) return null;   // not actually settled
    const idx = nums.indexOf(top);
    return { winner: String(names[idx] ?? ''), index: idx };
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: { id: string; question: string; confidence: number }[] = body.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ results: [] });
    }

    // Pull recently closed events once, then match every pending question against them.
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?closed=true&limit=400&order=endDate&ascending=false',
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return Response.json({ results: [], error: 'upstream' });
    const events = await res.json();
    if (!Array.isArray(events)) return Response.json({ results: [] });

    const results: any[] = [];

    for (const item of items.slice(0, 60)) {
      let best: any = null;
      let bestScore = 0;

      for (const ev of events) {
        const score = matchScore(item.question, ev.title || '');
        if (score > bestScore) { bestScore = score; best = ev; }
      }

      // Conservative threshold: a weak match is worse than no match.
      if (!best || bestScore < 0.6) {
        results.push({ id: item.id, status: 'unmatched' });
        continue;
      }

      const markets = (best.markets || []).filter((m: any) => m.closed === true);
      if (markets.length === 0) {
        results.push({ id: item.id, status: 'unsettled' });
        continue;
      }

      // Single-market event: straightforward Yes/No settlement.
      if (markets.length === 1) {
        const out = settledOutcome(markets[0]);
        if (!out) { results.push({ id: item.id, status: 'unsettled' }); continue; }
        const saidYes = item.confidence >= 50;
        const wasYes = out.index === 0;
        results.push({
          id: item.id,
          status: 'resolved',
          correct: saidYes === wasYes,
          outcome: wasYes ? 'Yes' : 'No',
          marketTitle: best.title,
        });
        continue;
      }

      // Multi-outcome event: the winner is whichever sub-market paid out.
      let winner: string | null = null;
      for (const m of markets) {
        const out = settledOutcome(m);
        if (out && out.index === 0) {
          winner = String(m.groupItemTitle || m.question || '').trim();
          break;
        }
      }
      if (!winner) { results.push({ id: item.id, status: 'unsettled' }); continue; }

      // Did the stored question name the winning outcome?
      const q = item.question.toLowerCase();
      const namedWinner = keywords(winner).some(w => q.includes(w));
      results.push({
        id: item.id,
        status: 'resolved',
        correct: namedWinner,
        outcome: winner,
        marketTitle: best.title,
      });
    }

    return Response.json({ results, checked: items.length });
  } catch (e) {
    return Response.json({ results: [], error: 'failed' }, { status: 200 });
  }
}
