import { NextRequest } from 'next/server';
import { readMoneylineSides } from '@/lib/sources/moneyline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * End-to-end self-test.
 *
 * Built after a silent failure: multi-outcome predictions were being displayed but
 * never written to the database, so the September Fed call was never recorded and
 * never resolved. Nothing in the UI showed a problem. It took a missed event to notice.
 *
 * This runs a real question through every stage and reports pass or fail on each,
 * so a break in the chain surfaces in minutes rather than weeks.
 *
 * GET /api/selftest?key=ADMIN_KEY
 */

type Step = { step: string; ok: boolean; detail: string; ms?: number };

export async function GET(request: NextRequest) {
  const secret = process.env.ADMIN_KEY;
  const provided = request.nextUrl.searchParams.get('key')
    || (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (secret && provided !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const steps: Step[] = [];
  const origin = new URL(request.url).origin;
  const testId = 'selftest-' + Date.now();
  // A real UUID so the write path is exercised exactly as a user's would be.
  const testAnon = '00000000-0000-4000-8000-' + String(Date.now()).slice(-12).padStart(12, '0');

  const record = (step: string, ok: boolean, detail: string, ms?: number) => {
    steps.push({ step, ok, detail, ...(ms !== undefined ? { ms } : {}) });
  };

  // 1. Can we reach the market data at all?
  let marketOk = false;
  try {
    const t = Date.now();
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=5&order=volume24hr&ascending=false',
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    marketOk = Array.isArray(data) && data.length > 0;
    record('market data reachable', marketOk,
      marketOk ? 'got ' + data.length + ' live events' : 'no events returned', Date.now() - t);
  } catch (e: any) {
    record('market data reachable', false, 'fetch failed: ' + e.message);
  }

  // 2. Does a MULTI-OUTCOME question still return ranked outcomes?
  //    This is the path that silently broke.
  let analysed: any = null;
  try {
    const t = Date.now();
    const res = await fetch(origin + '/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Fed Decision', anonId: testAnon }),
      signal: AbortSignal.timeout(30000),
    });
    analysed = await res.json();
    const isMulti = analysed?.mtype === 'categorical' && Array.isArray(analysed.outcomes) && analysed.outcomes.length > 1;
    record('multi-outcome analysis', isMulti,
      isMulti ? analysed.outcomes.length + ' outcomes, top: ' + analysed.outcomes[0].name + ' at ' + analysed.outcomes[0].prob + '%'
              : 'did not return ranked outcomes (got mtype=' + (analysed?.mtype || 'none') + ')',
      Date.now() - t);
  } catch (e: any) {
    record('multi-outcome analysis', false, 'analyse failed: ' + e.message);
  }

  // 2b. Does the INDEPENDENT NFL number actually come back?
  //
  //     The model shipped and ran for nobody: analyseNflGame was only called from
  //     a branch that any "X vs Y" query skips, so ownAnalysis was always absent
  //     and the two-card comparison never rendered. A green build said nothing
  //     about it. This step checks the field that proves the code ran, and says
  //     WHICH part gave up when it does not, so the next failure is diagnosable
  //     without reading the source.
  try {
    const t = Date.now();
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?active=true&closed=false&archived=false&limit=150&order=volume24hr&ascending=false',
      { signal: AbortSignal.timeout(8000) }
    );
    const events = await res.json();
    // Polymarket slugs are league-prefixed (nfl-buf-lar-...), which is the
    // reliable NFL marker; the title suffix "(NFL)" is the fallback.
    const nflEvents = (Array.isArray(events) ? events : []).filter((e: any) => {
      const slug = String(e?.slug || '').toLowerCase();
      const title = String(e?.title || '');
      if (!/\svs\.?\s/i.test(title)) return false;
      if (/more markets/i.test(title)) return false;
      return slug.startsWith('nfl-') || /\(nfl\)/i.test(title);
    });

    // A FINISHED game legitimately returns no independent number: season records
    // cannot describe a game that is over, and the app is right to decline. Testing
    // the first NFL event in the feed meant the newest one was usually a game that
    // had just been played, so this step went red for correct behaviour - and a
    // health check that cries wolf stops being read. Only games whose two-way price
    // is still live are sampled, using the same parser production uses.
    const playable = nflEvents.filter((e: any) => readMoneylineSides(e).length >= 2);

    if (playable.length === 0) {
      record('independent NFL analysis', true,
        nflEvents.length > 0
          ? 'skipped - the ' + nflEvents.length + ' NFL game(s) in the feed are finished or not priced two ways yet'
          : 'skipped - no NFL matchup in the market feed right now',
        Date.now() - t);
    } else {
      const nflEventsPlayable = playable;
      const title = String(nflEventsPlayable[0].title || '').replace(/\s*\(NFL\)\s*$/i, '').trim();
      const r = await fetch(origin + '/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: title, anonId: testAnon }),
        signal: AbortSignal.timeout(30000),
      });
      const a = await r.json();
      const own = a?.ownAnalysis;
      const hasOwn = !!(own && typeof own.number === 'number' && own.forTeam && Array.isArray(own.signals) && own.signals.length > 0);

      if (!hasOwn) {
        // Distinguish "ESPN had no such game" from "the branch never ran".
        // Two different failures used to print the same sentence. The generic path
        // answers BOTH when the NFL branch never ran AND when it ran, found the
        // game, and then could not read a two-way price - so filler alone does not
        // tell them apart.
        const usedFiller = Array.isArray(a?.sources) && a.sources.some((s: any) => s?.name === 'Signal');
        const sides = readMoneylineSides(nflEventsPlayable[0]);
        record('independent NFL analysis', false,
          '"' + title + '" returned no independent number. '
          + (sides.length < 2
              ? 'The market no longer prices it two ways, so the game is over or suspended.'
              : usedFiller
              ? 'The market still prices it two ways, so either ESPN has no game matching both team names, or the NFL branch did not run.'
              : 'The NFL branch ran but produced nothing.'),
          Date.now() - t);
      } else {
        // The market price must be matched to OUR team, not taken from the top of
        // the list. Taking the favourite showed the wrong team's number on roughly
        // half of all games.
        const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        const target = norm(own.forTeam);
        const nick = target.split(' ').pop() || '';
        const outs = Array.isArray(a.outcomes) ? a.outcomes : [];
        const matched = outs.find((o: any) => norm(o.name) === target)
          || (nick.length >= 3 ? outs.find((o: any) => norm(o.name).split(' ').includes(nick)) : undefined)
          || (nick.length >= 3 ? outs.find((o: any) => norm(o.name).includes(nick)) : undefined);
        const sigText = own.signals.map((s: any) => s.key + ' ' + s.pct + '%@' + s.defaultWeight).join(' | ');
        record('independent NFL analysis', !!matched,
          title + ' - ours ' + own.number + '% for ' + own.forTeam
          + (matched ? ', market ' + matched.prob + '% for the same team' : ', but NO market outcome matched that team')
          + ' [' + sigText + ']',
          Date.now() - t);
      }
    }
  } catch (e: any) {
    record('independent NFL analysis', false, 'check failed: ' + e.message);
  }

  // 3. Can a prediction actually be WRITTEN? This is the step that was broken.
  let wrote = false;
  try {
    const res = await fetch(origin + '/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        anonId: testAnon,
        id: testId,
        question: 'SELF TEST - safe to ignore',
        aiConfidence: 75,
        marketOdds: 75,
        category: 'selftest',
        topOutcome: 'No change',
      }),
    });
    const out = await res.json();
    wrote = out?.ok === true;
    record('prediction writes to database', wrote,
      wrote ? 'stored id ' + testId : 'write rejected: ' + JSON.stringify(out));
  } catch (e: any) {
    record('prediction writes to database', false, 'write failed: ' + e.message);
  }

  // 4. Can it be READ BACK? A write that cannot be read is not a record.
  let readBack = false;
  try {
    const res = await fetch(origin + '/api/journal?anonId=' + encodeURIComponent(testAnon));
    const out = await res.json();
    const found = (out.entries || []).find((e: any) => e.id === testId);
    readBack = !!found;
    record('prediction reads back', readBack,
      readBack ? 'found it, confidence ' + found.aiConfidence + '%' : 'not found in journal after writing');
  } catch (e: any) {
    record('prediction reads back', false, 'read failed: ' + e.message);
  }

  // 5. Does the resolver run and authenticate?
  try {
    const res = await fetch(origin + '/api/cron-resolve?key=' + encodeURIComponent(provided || ''), {
      signal: AbortSignal.timeout(20000),
    });
    const out = await res.json();
    record('resolver runs', out?.ok === true,
      out?.ok ? 'checked ' + (out.checked ?? 0) + ', resolved ' + (out.resolved ?? 0) : 'resolver said: ' + JSON.stringify(out).slice(0, 120));
  } catch (e: any) {
    record('resolver runs', false, 'resolver failed: ' + e.message);
  }

  // 6. Does the accuracy page have data to show?
  try {
    const res = await fetch(origin + '/api/accuracy-stats');
    const out = await res.json();
    record('accuracy stats available', typeof out.total === 'number',
      'resolved in database: ' + (out.total ?? 0) + ', pending: ' + (out.pending ?? 0));
  } catch (e: any) {
    record('accuracy stats available', false, 'stats failed: ' + e.message);
  }

  // 7. Honesty gate still refuses questions with no real data.
  try {
    const res = await fetch(origin + '/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'will my neighbour adopt a dog next month', anonId: testAnon }),
      signal: AbortSignal.timeout(20000),
    });
    const out = await res.json();
    record('refuses unanswerable questions', out?.noData === true,
      out?.noData ? 'correctly returned no-data' : 'DID NOT REFUSE - returned confidence ' + out?.confidence);
  } catch (e: any) {
    record('refuses unanswerable questions', false, 'check failed: ' + e.message);
  }

  // Clean up the test row so it never pollutes the public record.
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    await sql`DELETE FROM journal WHERE id = ${testId} OR category = 'selftest'`;
    record('test data cleaned up', true, 'self-test rows removed');
  } catch (e: any) {
    record('test data cleaned up', false, 'cleanup failed, remove id ' + testId + ' manually: ' + e.message);
  }

  const failed = steps.filter(s => !s.ok);
  return Response.json({
    healthy: failed.length === 0,
    summary: failed.length === 0
      ? 'All ' + steps.length + ' checks passed.'
      : failed.length + ' of ' + steps.length + ' checks FAILED: ' + failed.map(f => f.step).join(', '),
    steps,
    ranAt: new Date().toISOString(),
  });
}
