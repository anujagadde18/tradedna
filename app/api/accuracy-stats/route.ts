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

    // ---- CALIBRATION ----
    // Win rate alone says little: 63% on coin flips is near chance, 63% on longshots
    // is excellent. What matters is whether a stated confidence means what it claims -
    // when we say 80%, does it happen about 80% of the time?
    //
    // Predictions below 50% are really statements about the other side: a 30% call is a
    // 70% call that it will NOT happen. So we fold the confidence up AND flip what counts
    // as a hit - if we said 30% and the thing did not happen, our 70% claim was right.
    // Getting this backwards would make the whole curve meaningless.
    const BANDS = [
      { lo: 50, hi: 60, label: '50-60%' },
      { lo: 60, hi: 70, label: '60-70%' },
      { lo: 70, hi: 80, label: '70-80%' },
      { lo: 80, hi: 90, label: '80-90%' },
      { lo: 90, hi: 101, label: '90-100%' },
    ];

    const calibration = BANDS.map(b => {
      const inBand = rows.filter((r: any) => {
        const conf = Number(r.ai_confidence);
        if (!Number.isFinite(conf)) return false;
        const stated = conf >= 50 ? conf : 100 - conf;   // fold low-confidence calls
        return stated >= b.lo && stated < b.hi;
      });
      if (inBand.length === 0) {
        return { band: b.label, claimed: (b.lo + Math.min(b.hi, 100)) / 2, actual: null, n: 0, correct: 0 };
      }
      const hits = inBand.filter((r: any) => {
        const conf = Number(r.ai_confidence);
        // For a folded (sub-50) call, the stated claim was that it would NOT happen,
        // so an 'incorrect' row means that claim held.
        return conf >= 50 ? r.result === 'correct' : r.result === 'incorrect';
      }).length;
      const claimedAvg = Math.round(
        inBand.reduce((s: number, r: any) => {
          const conf = Number(r.ai_confidence);
          return s + (conf >= 50 ? conf : 100 - conf);
        }, 0) / inBand.length
      );
      return {
        band: b.label,
        claimed: claimedAvg,
        actual: Math.round((hits / inBand.length) * 100),
        n: inBand.length,
        correct: hits,
      };
    });

    // ---- BRIER SCORE ----
    // A calibration curve needs density per bucket to say anything. A Brier score
    // scores every prediction individually, so it stays meaningful at small samples:
    // mean squared error between the stated probability and what actually happened.
    // 0 is perfect, 0.25 is what you get by saying 50% to everything, higher is worse.
    //
    // Sub-50 predictions are claims about the other side, so both the probability and
    // the outcome flip - otherwise a confident "no" that came true would score as a miss.
    const scored = rows.filter((r: any) => Number.isFinite(Number(r.ai_confidence)));
    let brier: number | null = null;
    let brierSkill: number | null = null;
    if (scored.length > 0) {
      const sum = scored.reduce((acc: number, r: any) => {
        const conf = Number(r.ai_confidence);
        const stated = conf >= 50 ? conf : 100 - conf;
        const happened = conf >= 50
          ? (r.result === 'correct' ? 1 : 0)
          : (r.result === 'incorrect' ? 1 : 0);
        return acc + Math.pow((stated / 100) - happened, 2);
      }, 0);
      brier = Math.round((sum / scored.length) * 10000) / 10000;
      // Skill against always saying 50%: positive means better than a coin flip.
      brierSkill = Math.round((1 - (brier / 0.25)) * 100);
    }

    // A band needs a handful of results before its number means anything.
    const MIN_FOR_SIGNAL = 5;
    const meaningful = calibration.filter(b => b.n >= MIN_FOR_SIGNAL);
    const avgGap = meaningful.length > 0
      ? Math.round(meaningful.reduce((s, b) => s + Math.abs((b.actual as number) - b.claimed), 0) / meaningful.length)
      : null;

    return Response.json({
      total: rows.length,
      correct,
      incorrect: rows.length - correct,
      pending: pendingCount[0]?.n ?? 0,
      winRate: rows.length > 0 ? Math.round((correct / rows.length) * 100) : null,
      brier,
      brierSkill,
      brierSample: scored.length,
      calibration,
      calibrationMinSample: MIN_FOR_SIGNAL,
      calibrationGap: avgGap,
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
    return Response.json({ total: 0, correct: 0, incorrect: 0, pending: 0, winRate: null, brier: null, brierSkill: null, brierSample: 0, calibration: [], calibrationMinSample: 5, calibrationGap: null, categories: [], recent: [] }, { status: 200 });
  }
}
