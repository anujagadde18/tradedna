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

/**
 * Settles a finished two-way sports market.
 *
 * The bundle logic below was written for elections, where each market is one
 * candidate and index 0 is that candidate's "Yes". A game is not shaped like
 * that: ONE market holds both teams, so requiring index 0 to be the winner meant
 * any game won by the second-listed team could never resolve, and the games that
 * did resolve were scored by keyword-matching a winner against a question that
 * contains BOTH team names - a test that passes whoever won.
 */
function settledMoneyline(event: any): { winner: string } | null {
  const parseArr = (v: any): string[] => {
    try {
      const a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) ? a.map((x: any) => String(x)) : [];
    } catch { return []; }
  };
  const markets = (event?.markets || []).filter((m: any) => m && m.closed === true);
  const isTwoWayTeams = (m: any) => {
    const smt = String(m.sportsMarketType || '').toLowerCase();
    if (smt && smt !== 'moneyline') return false;
    const names = parseArr(m.outcomes);
    return names.length === 2 && !names.some((n: string) => /^(yes|no)$/i.test(n.trim()));
  };
  const ml = markets.find((m: any) => String(m.sportsMarketType || '').toLowerCase() === 'moneyline')
    || markets.find(isTwoWayTeams);
  if (!ml) return null;

  const names = parseArr(ml.outcomes);
  const prices = parseArr(ml.outcomePrices).map((x: string) => parseFloat(x));
  if (names.length < 2 || prices.length < 2) return null;
  let bi = 0;
  for (let i = 1; i < prices.length; i++) if (prices[i] > prices[bi]) bi = i;
  if (!Number.isFinite(prices[bi]) || prices[bi] < 0.97) return null;   // not settled
  const w = String(names[bi] || '').trim();
  return w ? { winner: w } : null;
}

/** Same team, allowing "Rams" to match "Los Angeles Rams". */
function sameTeam(a: string, b: string): boolean {
  const norm = (x: string) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nick = (x: string) => String(x || '').trim().split(/\s+/).pop() || '';
  const A = norm(a), B = norm(b);
  if (!A || !B) return false;
  if (A === B) return true;
  const an = norm(nick(a)), bn = norm(nick(b));
  return (an.length >= 3 && B.includes(an)) || (bn.length >= 3 && A.includes(bn));
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
      SELECT id, question, ai_confidence, top_outcome FROM journal
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
    // Two weeks of "checked 7, resolved 0" said nothing about WHY. Every skip now
    // names its reason, so one run diagnoses itself.
    const unresolved: any[] = [];
    const shortQ = (q: any) => String(q || '').slice(0, 48);

    for (const p of pending) {
      let best: any = null, bestScore = 0;
      for (const ev of events) {
        const s = matchScore(p.question, ev.title || '');
        if (s > bestScore) { bestScore = s; best = ev; }
      }
      if (!best || bestScore < 0.6) {
        unresolved.push({ q: shortQ(p.question), why: 'no finished market matched (best score ' + bestScore.toFixed(2) + ')' });
        continue;
      }

      const markets = (best.markets || []).filter((m: any) => m.closed === true);
      if (markets.length === 0) { unresolved.push({ q: shortQ(p.question), why: 'matched "' + String(best.title||'').slice(0,40) + '" but it has no closed markets' }); continue; }

      let correct: boolean | null = null;
      let outcomeText = '';

      // A game settles from its moneyline, judged against the team we recorded.
      const predicted = String(p.top_outcome || '').trim();
      const game = settledMoneyline(best);
      if (game && predicted) {
        const weBackedThem = (p.ai_confidence ?? 50) >= 50;
        const theyWon = sameTeam(game.winner, predicted);
        correct = weBackedThem === theyWon;
        outcomeText = game.winner + ' won';
      } else if (game && !predicted) {
        unresolved.push({ q: shortQ(p.question), why: 'game settled (' + game.winner + ' won) but no team was recorded for this prediction' });
        continue;
      } else if (markets.length === 1) {
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
        if (!winner) { unresolved.push({ q: shortQ(p.question), why: 'matched "' + String(best.title||'').slice(0,40) + '" but no outcome has settled yet' }); continue; }
        const q = String(p.question).toLowerCase();
        correct = keywords(winner).some(w => q.includes(w));
        outcomeText = winner;
      }

      if (correct === null) { unresolved.push({ q: shortQ(p.question), why: 'matched but the outcome could not be read' }); continue; }

      await sql`
        UPDATE journal
        SET result = ${correct ? 'correct' : 'incorrect'},
            outcome_note = ${'Resolved automatically: ' + outcomeText.slice(0, 200)},
            resolved_at = NOW()
        WHERE id = ${p.id} AND result = 'pending'`;

      resolved++;
      details.push({ question: String(p.question).slice(0, 60), outcome: outcomeText, correct });
    }

    return Response.json({ ok: true, checked: pending.length, resolved, details, unresolved });
  } catch (err: any) {
    console.error('Resolver cron:', err.message);
    return Response.json({ ok: false, error: err.message }, { status: 200 });
  }
}
