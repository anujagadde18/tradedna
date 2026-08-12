import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Server-side prediction journal.
 * Predictions were previously kept in browser localStorage, which meant they
 * vanished between browsers and could never be resolved by a scheduled job.
 * This stores them per anonymous user so history follows the person and the
 * resolver can settle them server-side.
 */

async function ensureTable(sql: any) {
  await sql`CREATE TABLE IF NOT EXISTS journal (
    id TEXT PRIMARY KEY,
    anon_id UUID,
    question TEXT NOT NULL,
    ai_confidence INT,
    market_odds INT,
    edge INT,
    category TEXT,
    result TEXT DEFAULT 'pending',
    outcome_note TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

// Save a prediction
export async function POST(req: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await ensureTable(sql);

    const body = await req.json().catch(() => ({}));
    const anonId = String(body.anonId || '').trim();
    const question = String(body.question || '').trim();
    if (!anonId || !question) return NextResponse.json({ ok: false }, { status: 400 });

    const id = String(body.id || (Date.now() + '-' + Math.random().toString(36).slice(2, 8)));
    const conf = Number.isFinite(body.aiConfidence) ? Math.round(body.aiConfidence) : null;
    const market = Number.isFinite(body.marketOdds) ? Math.round(body.marketOdds) : null;
    const edge = conf !== null && market !== null ? conf - market : null;

    // Don't store the same question twice within an hour - re-analysing is not a new prediction.
    const dupe = await sql`
      SELECT id FROM journal
      WHERE anon_id = ${anonId}::uuid AND question = ${question}
        AND created_at > NOW() - INTERVAL '1 hour'
      LIMIT 1`;
    if (dupe.length > 0) return NextResponse.json({ ok: true, id: dupe[0].id, duplicate: true });

    await sql`
      INSERT INTO journal (id, anon_id, question, ai_confidence, market_odds, edge, category)
      VALUES (${id}, ${anonId}::uuid, ${question}, ${conf}, ${market}, ${edge}, ${String(body.category || 'other')})
      ON CONFLICT (id) DO NOTHING`;

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error('Journal save:', err.message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

// Read this user's journal
export async function GET(req: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await ensureTable(sql);

    const anonId = req.nextUrl.searchParams.get('anonId') || '';
    if (!anonId) return NextResponse.json({ entries: [] });

    const rows = await sql`
      SELECT id, question, ai_confidence, market_odds, edge, category, result, outcome_note, created_at
      FROM journal WHERE anon_id = ${anonId}::uuid
      ORDER BY created_at DESC LIMIT 200`;

    return NextResponse.json({
      entries: rows.map((r: any) => ({
        id: r.id,
        question: r.question,
        aiConfidence: r.ai_confidence,
        marketOdds: r.market_odds,
        edge: r.edge,
        category: r.category,
        result: r.result,
        notes: r.outcome_note,
        date: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Journal read:', err.message);
    return NextResponse.json({ entries: [] }, { status: 200 });
  }
}

// Mark a prediction resolved (used by the resolver)
export async function PATCH(req: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await ensureTable(sql);

    const body = await req.json().catch(() => ({}));
    const updates: any[] = Array.isArray(body.updates) ? body.updates : [];
    let applied = 0;

    for (const u of updates.slice(0, 100)) {
      const id = String(u.id || '');
      const result = u.result === 'correct' ? 'correct' : u.result === 'incorrect' ? 'incorrect' : null;
      if (!id || !result) continue;
      await sql`
        UPDATE journal
        SET result = ${result}, outcome_note = ${String(u.note || '').slice(0, 300)}, resolved_at = NOW()
        WHERE id = ${id} AND result = 'pending'`;
      applied++;
    }

    return NextResponse.json({ ok: true, applied });
  } catch (err: any) {
    console.error('Journal update:', err.message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
