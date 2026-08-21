import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Scheduled prediction resolver.
 *
 * Runs daily. Reads pending predictions from the database, checks them against
 * SETTLED Polymarket markets, and records the outcome. No human decides when to
 * look, which is the whole point of a public accuracy record.
 *
 * Only settles when the market has genuinely resolved AND the match is confident.
 * Everything else stays pending - a wrong verdict is worse than a slow one.
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

function matchScore(question: string, title: string): number {
  const q = keywords(question);
  const t = new Set(keywords(title));
  if (q.length === 0) return 0;
  return q.filter(w => t.has(w)).length / q.length;
}

function settledOutcome(market: any): { winner: string; index: number } | null {
  try {
    const prices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
    const names = typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : market.outcomes;
    if (!Array.isArray(prices) || !Array.isArray(names) || prices.length < 2) return null;
    const nums = prices.map((p: any) => parseFloat(p));
    const top = Math.max(...nums);
    if (isNaN(top) || top < 0.97) return null;   // not settled
    const idx = nums.indexOf(top);
    return { winner: String(names[idx] ?? ''), index: idx };
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  // Vercel cron sends the secret; allow manual runs only with it too.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') || '';
  const provided = request.nextUrl.searchParams.get('key') || auth.replace('Bearer ', '');
  if (secret && provided !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);

    await sql`CREATE TABLE IF NOT EXISTS journal (
      id TEXT PRIMARY KEY, anon_id UUID, question TEXT NOT NULL,
      ai_confidence INT, market_odds INT, edge INT, category TEXT,
      result TEXT DEFAULT 'pending', outcome_note TEXT,
      resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    const pending = await sql`
      SELECT id, question, ai_confidence FROM journal
      WHERE result = 'pending' AND created_at < NOW() - INTERVAL '1 day'
      ORDER BY created_at ASC LIMIT 80`;

    if (pending.length === 0) {
      return Response.json({ ok: true, checked: 0, resolved: 0, note: 'nothing pending' });
    }

    // Page back through closed events, stopping once everything has a candidate match.
    const PAGE = 250;
    const MAX_PAGES = 8;
    const events: any[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetch(
        'https://gamma-api.polymarket.com/events?closed=true&limit=' + PAGE +
        '&offset=' + (page * PAGE) + '&order=endDate&ascending=false',
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) break;
      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      events.push(...batch);
      const allMatched = pending.every((p: any) =>
        events.some(ev => matchScore(p.question, ev.title || '') >= 0.6));
      if (allMatched || batch.length < PAGE) break;
    }

    let resolved = 0;
    const details: any[] = [];

    for (const p of pending) {
      let best: any = null, bestScore = 0;
      for (const ev of events) {
        const s = matchScore(p.question, ev.title || '');
        if (s > bestScore) { bestScore = s; best = ev; }
      }
      if (!best || bestScore < 0.6) continue;

      const markets = (best.markets || []).filter((m: any) => m.closed === true);
      if (markets.length === 0) continue;

      let correct: boolean | null = null;
      let outcomeText = '';

      if (markets.length === 1) {
        const out = settledOutcome(markets[0]);
        if (!out) continue;
        const saidYes = (p.ai_confidence ?? 50) >= 50;
        const wasYes = out.index === 0;
        correct = saidYes === wasYes;
        outcomeText = wasYes ? 'Yes' : 'No';
      } else {
        let winner: string | null = null;
        for (const m of markets) {
          const out = settledOutcome(m);
          if (out && out.index === 0) { winner = String(m.groupItemTitle || m.question || '').trim(); break; }
        }
        if (!winner) continue;
        const q = String(p.question).toLowerCase();
        correct = keywords(winner).some(w => q.includes(w));
        outcomeText = winner;
      }

      if (correct === null) continue;

      await sql`
        UPDATE journal
        SET result = ${correct ? 'correct' : 'incorrect'},
            outcome_note = ${'Resolved automatically: ' + outcomeText.slice(0, 200)},
            resolved_at = NOW()
        WHERE id = ${p.id} AND result = 'pending'`;

      resolved++;
      details.push({ question: String(p.question).slice(0, 60), outcome: outcomeText, correct });
    }

    return Response.json({ ok: true, checked: pending.length, resolved, details });
  } catch (err: any) {
    console.error('Resolver cron:', err.message);
    return Response.json({ ok: false, error: err.message }, { status: 200 });
  }
}
