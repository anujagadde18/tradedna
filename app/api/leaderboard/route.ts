import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const leaders = await sql`
      SELECT username, total_points, total_predictions, correct_predictions, current_streak, best_streak,
        CASE WHEN total_predictions > 0 THEN ROUND(correct_predictions::numeric / total_predictions * 100) ELSE 0 END as accuracy
      FROM leaderboard WHERE total_predictions > 0
      ORDER BY total_points DESC, accuracy DESC LIMIT 20
    `;
    const tot = await sql`SELECT COUNT(*) as count FROM predictions`;
    return Response.json({ leaders, totalPredictions: tot[0]?.count || 0 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, actualWinner, adminKey } = body;
    if (adminKey !== 'playpicks2026') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const predictions = await sql`SELECT * FROM predictions WHERE match_id = ${matchId} AND actual_winner IS NULL`;
    if (predictions.length === 0) return Response.json({ message: 'No predictions', count: 0 });
    let scored = 0;
    for (const pred of predictions) {
      const correct = pred.predicted_winner === actualWinner;
      const points = correct ? 10 + Math.round((pred.confidence - 50) / 10) : 0;
      await sql`UPDATE predictions SET actual_winner = ${actualWinner}, correct = ${correct}, points_earned = ${points} WHERE id = ${pred.id}`;
      if (correct) {
        await sql`UPDATE leaderboard SET total_points = total_points + ${points}, correct_predictions = correct_predictions + 1, current_streak = current_streak + 1, best_streak = GREATEST(best_streak, current_streak + 1), updated_at = NOW() WHERE username = ${pred.username}`;
      } else {
        await sql`UPDATE leaderboard SET current_streak = 0, updated_at = NOW() WHERE username = ${pred.username}`;
      }
      scored++;
    }
    return Response.json({ success: true, scored });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
