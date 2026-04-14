import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_ref TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        name TEXT NOT NULL,
        props JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id UUID,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        duration_seconds INTEGER,
        page_views INTEGER DEFAULT 1
      )
    `;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    // Total users
    const totalUsers = await sql`SELECT COUNT(*) as count FROM users`;

    // New users today
    const newToday = await sql`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= ${today}::date
    `;

    // New users this week
    const newWeek = await sql`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= ${weekAgo}::timestamptz
    `;

    // Active users today (seen today)
    const activeToday = await sql`
      SELECT COUNT(DISTINCT id) as count FROM users
      WHERE last_seen_at >= ${today}::date
    `;

    // Active users this week
    const activeWeek = await sql`
      SELECT COUNT(DISTINCT id) as count FROM users
      WHERE last_seen_at >= ${weekAgo}::timestamptz
    `;

    // Total analyses run
    const totalAnalyses = await sql`
      SELECT COUNT(*) as count FROM events WHERE name = 'analysis_run'
    `;

    // Analyses today
    const analysesToday = await sql`
      SELECT COUNT(*) as count FROM events 
      WHERE name = 'analysis_run' AND created_at >= ${today}::date
    `;

    // Analyses this week
    const analysesWeek = await sql`
      SELECT COUNT(*) as count FROM events 
      WHERE name = 'analysis_run' AND created_at >= ${weekAgo}::timestamptz
    `;

    // Daily active users - last 14 days
    const dauTrend = await sql`
      SELECT 
        DATE(last_seen_at) as day,
        COUNT(DISTINCT id) as users
      FROM users
      WHERE last_seen_at >= ${new Date(now.getTime() - 14 * 86400000).toISOString()}::timestamptz
      GROUP BY DATE(last_seen_at)
      ORDER BY day ASC
    `;

    // Daily analyses - last 14 days
    const analysesTrend = await sql`
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as count
      FROM events
      WHERE name = 'analysis_run' 
        AND created_at >= ${new Date(now.getTime() - 14 * 86400000).toISOString()}::timestamptz
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `;

    // Top queries analyzed
    const topQueries = await sql`
      SELECT 
        props->>'query' as query,
        COUNT(*) as count
      FROM events
      WHERE name = 'analysis_run' AND props->>'query' IS NOT NULL
      GROUP BY props->>'query'
      ORDER BY count DESC
      LIMIT 10
    `;

    // User retention - users who came back after first visit
    const retained = await sql`
      SELECT COUNT(DISTINCT id) as count FROM users
      WHERE created_at < ${today}::date 
        AND last_seen_at >= ${today}::date
    `;

    // Referrers
    const referrers = await sql`
      SELECT 
        COALESCE(first_ref, 'direct') as ref,
        COUNT(*) as count
      FROM users
      GROUP BY first_ref
      ORDER BY count DESC
      LIMIT 8
    `;

    // Avg analyses per user
    const avgAnalyses = await sql`
      SELECT ROUND(AVG(user_count)::numeric, 1) as avg FROM (
        SELECT user_id, COUNT(*) as user_count 
        FROM events WHERE name = 'analysis_run'
        GROUP BY user_id
      ) t
    `;

    return Response.json({
      kpis: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        newToday: parseInt(newToday.rows[0].count),
        newWeek: parseInt(newWeek.rows[0].count),
        activeToday: parseInt(activeToday.rows[0].count),
        activeWeek: parseInt(activeWeek.rows[0].count),
        totalAnalyses: parseInt(totalAnalyses.rows[0].count),
        analysesToday: parseInt(analysesToday.rows[0].count),
        analysesWeek: parseInt(analysesWeek.rows[0].count),
        retained: parseInt(retained.rows[0].count),
        avgAnalysesPerUser: parseFloat(avgAnalyses.rows[0].avg || '0'),
      },
      trends: {
        dau: dauTrend.rows,
        analyses: analysesTrend.rows,
      },
      topQueries: topQueries.rows,
      referrers: referrers.rows,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
