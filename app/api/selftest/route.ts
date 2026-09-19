import { NextRequest } from 'next/server';

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
