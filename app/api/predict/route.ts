import { NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sql = neon(process.env.DATABASE_URL!);

async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    match_id TEXT NOT NULL,
    match_title TEXT NOT NULL,
    match_date TEXT NOT NULL,
    team1 TEXT NOT NULL,
    team2 TEXT NOT NULL,
    predicted_winner TEXT NOT NULL,
    confidence INTEGER DEFAULT 50,
    ai_prediction TEXT,
    ai_confidence INTEGER,
    actual_winner TEXT,
    points_earned INTEGER DEFAULT 0,
    correct BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS leaderboard (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    total_points INTEGER DEFAULT 0,
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
  )`;
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const { username, matchId, matchTitle, matchDate, team1, team2, predictedWinner, confidence, aiPrediction, aiConfidence } = body;
    if (!username || !matchId || !predictedWinner) return Response.json({ error: 'Missing fields' }, { status: 400 });
    const existing = await sql`SELECT id FROM predictions WHERE username = ${username} AND match_id = ${matchId}`;
    if (existing.length > 0) return Response.json({ error: 'Already predicted', alreadyPredicted: true });
    await sql`INSERT INTO predictions (username, match_id, match_title, match_date, team1, team2, predicted_winner, confidence, ai_prediction, ai_confidence)
      VALUES (${username}, ${matchId}, ${matchTitle}, ${matchDate}, ${team1}, ${team2}, ${predictedWinner}, ${confidence}, ${aiPrediction}, ${aiConfidence})`;
    await sql`INSERT INTO leaderboard (username) VALUES (${username}) ON CONFLICT (username) DO NOTHING`;
    await sql`UPDATE leaderboard SET total_predictions = total_predictions + 1, updated_at = NOW() WHERE username = ${username}`;
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const matchId = searchParams.get('matchId');
    if (matchId && username) {
      const pred = await sql`SELECT * FROM predictions WHERE match_id = ${matchId} AND username = ${username}`;
      return Response.json({ prediction: pred[0] || null });
    }
    if (username) {
      const preds = await sql`SELECT * FROM predictions WHERE username = ${username} ORDER BY created_at DESC LIMIT 20`;
      return Response.json({ predictions: preds });
    }
    return Response.json({ error: 'Missing params' }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
