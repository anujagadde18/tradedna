import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Generation traces.
 *
 * The consistency check can tell us an explanation overstated its number. It cannot
 * tell us WHY: bad source evidence, a bad computation, or the model narrating good
 * evidence badly. Those have completely different fixes, and telling them apart
 * requires knowing what the model actually received at generation time.
 *
 * So each analysis stores a compact trace: the inputs available, the computed
 * probability and how it was derived, the context handed to the model, the
 * explanation that came back, and whether the consistency check flagged it.
 *
 * Deliberately not a full log of everything forever. Traces are capped and pruned,
 * with flagged ones kept longest, since those are the ones worth inspecting.
 */

async function ensureTable(sql: any) {
  await sql`CREATE TABLE IF NOT EXISTS generation_traces (
    id BIGSERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    route TEXT,
    market_type TEXT,
    computed_probability INT,
    probability_source TEXT,
    context_given TEXT,
    headlines_given TEXT,
    explanation JSONB,
    consistency_ok BOOLEAN,
    consistency_flags TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

export async function POST(req: NextRequest) {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    await ensureTable(sql);

    const b = await req.json().catch(() => ({}));
    if (!b.question) return Response.json({ ok: false }, { status: 400 });

    await sql`
      INSERT INTO generation_traces
        (question, route, market_type, computed_probability, probability_source,
         context_given, headlines_given, explanation, consistency_ok, consistency_flags)
      VALUES (
        ${String(b.question).slice(0, 300)},
        ${String(b.route || '')},
        ${String(b.marketType || '')},
        ${Number.isFinite(b.probability) ? Math.round(b.probability) : null},
        ${String(b.probabilitySource || '')},
        ${String(b.context || '').slice(0, 2000)},
        ${String(b.headlines || '').slice(0, 1000)},
        ${JSON.stringify(b.explanation || null)},
        ${b.consistencyOk !== false},
        ${String((b.consistencyFlags || []).join(' | ')).slice(0, 500)}
      )`;

    // Keep the table small. Flagged traces survive longer because they are the ones
    // worth looking at; clean ones age out quickly.
    await sql`DELETE FROM generation_traces
              WHERE consistency_ok = true AND created_at < NOW() - INTERVAL '14 days'`;
    await sql`DELETE FROM generation_traces
              WHERE consistency_ok = false AND created_at < NOW() - INTERVAL '90 days'`;

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('Trace write:', err.message);
    return Response.json({ ok: false }, { status: 200 });
  }
}

/**
 * Read traces back. Defaults to the flagged ones, since a clean trace is rarely
 * what you want to inspect.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_KEY;
  const provided = req.nextUrl.searchParams.get('key') || (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (secret && provided !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);
    await ensureTable(sql);

    const flaggedOnly = req.nextUrl.searchParams.get('all') !== '1';
    const rows = flaggedOnly
      ? await sql`SELECT * FROM generation_traces WHERE consistency_ok = false ORDER BY created_at DESC LIMIT 100`
      : await sql`SELECT * FROM generation_traces ORDER BY created_at DESC LIMIT 100`;

    const totals = await sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE consistency_ok = false)::int AS flagged
      FROM generation_traces`;

    return Response.json({
      total: totals[0]?.total ?? 0,
      flagged: totals[0]?.flagged ?? 0,
      showing: flaggedOnly ? 'flagged only' : 'all',
      traces: rows,
    });
  } catch (err: any) {
    return Response.json({ traces: [], error: err.message }, { status: 200 });
  }
}
