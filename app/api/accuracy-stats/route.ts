import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Public accuracy statistics.
 * Reads resolved predictions from the database so the accuracy page reflects
 * reality rather than a hand-maintained list. Includes losses - the record is
 * only worth anything if it shows both.
 */
export async function GET(_request: NextRequest) {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);

    await sql`CREATE TABLE IF NOT EXISTS journal (
      id TEXT PRIMARY KEY, anon_id UUID, question TEXT NOT NULL,
      ai_confidence INT, market_odds INT, edge INT, category TEXT,
      result TEXT DEFAULT 'pending', outcome_note TEXT,
      resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    const rows = await sql`
      SELECT question, ai_confidence, market_odds, edge, category, result, outcome_note, created_at, resolved_at
      FROM journal
      WHERE result IN ('correct','incorrect')
      ORDER BY COALESCE(resolved_at, created_at) DESC
      LIMIT 300`;

    const pendingCount = await sql`SELECT COUNT(*)::int AS n FROM journal WHERE result = 'pending'`;

    const byCategory: Record<string, { correct: number; total: number }> = {};
    for (const r of rows) {
      const cat = String(r.category || 'other');
      if (!byCategory[cat]) byCategory[cat] = { correct: 0, total: 0 };
      byCategory[cat].total++;
      if (r.result === 'correct') byCategory[cat].correct++;
    }

    const correct = rows.filter((r: any) => r.result === 'correct').length;

    return Response.json({
      total: rows.length,
      correct,
      incorrect: rows.length - correct,
      pending: pendingCount[0]?.n ?? 0,
      winRate: rows.length > 0 ? Math.round((correct / rows.length) * 100) : null,
      categories: Object.entries(byCategory).map(([name, v]) => ({
        name,
        correct: v.correct,
        total: v.total,
        winRate: Math.round((v.correct / v.total) * 100),
      })).sort((a, b) => b.total - a.total),
      recent: rows.slice(0, 40).map((r: any) => ({
        question: r.question,
        aiConfidence: r.ai_confidence,
        marketOdds: r.market_odds,
        edge: r.edge,
        category: r.category || 'other',
        result: r.result,
        note: r.outcome_note,
        date: r.resolved_at || r.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Accuracy stats:', err.message);
    return Response.json({ total: 0, correct: 0, incorrect: 0, pending: 0, winRate: null, categories: [], recent: [] }, { status: 200 });
  }
}
