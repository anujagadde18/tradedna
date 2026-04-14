import { neon } from '@neondatabase/serverless';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Create tables if needed
    await sql`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_ref TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      user_id UUID,
      name TEXT NOT NULL,
      props JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7*86400000).toISOString();
    const days14 = new Date(Date.now() - 14*86400000).toISOString();

    const [totalUsers, newToday, newWeek, activeToday, activeWeek,
           totalAnalyses, analysesToday, analysesWeek, retained,
           dauTrend, analysesTrend, topQueries, referrers, avgAnalyses] = await Promise.all([
      sql`SELECT COUNT(*)::int as count FROM users`,
      sql`SELECT COUNT(*)::int as count FROM users WHERE created_at >= ${today}::date`,
      sql`SELECT COUNT(*)::int as count FROM users WHERE created_at >= ${weekAgo}::timestamptz`,
      sql`SELECT COUNT(DISTINCT id)::int as count FROM users WHERE last_seen_at >= ${today}::date`,
      sql`SELECT COUNT(DISTINCT id)::int as count FROM users WHERE last_seen_at >= ${weekAgo}::timestamptz`,
      sql`SELECT COUNT(*)::int as count FROM events WHERE name = 'analysis_run'`,
      sql`SELECT COUNT(*)::int as count FROM events WHERE name = 'analysis_run' AND created_at >= ${today}::date`,
      sql`SELECT COUNT(*)::int as count FROM events WHERE name = 'analysis_run' AND created_at >= ${weekAgo}::timestamptz`,
      sql`SELECT COUNT(DISTINCT id)::int as count FROM users WHERE created_at < ${today}::date AND last_seen_at >= ${today}::date`,
      sql`SELECT DATE(last_seen_at) as day, COUNT(DISTINCT id)::int as users FROM users WHERE last_seen_at >= ${days14}::timestamptz GROUP BY DATE(last_seen_at) ORDER BY day`,
      sql`SELECT DATE(created_at) as day, COUNT(*)::int as count FROM events WHERE name='analysis_run' AND created_at >= ${days14}::timestamptz GROUP BY DATE(created_at) ORDER BY day`,
      sql`SELECT props->>'query' as query, COUNT(*)::int as count FROM events WHERE name='analysis_run' AND props->>'query' IS NOT NULL GROUP BY props->>'query' ORDER BY count DESC LIMIT 10`,
      sql`SELECT COALESCE(first_ref,'direct') as ref, COUNT(*)::int as count FROM users GROUP BY first_ref ORDER BY count DESC LIMIT 8`,
      sql`SELECT ROUND(AVG(user_count)::numeric,1) as avg FROM (SELECT user_id, COUNT(*) as user_count FROM events WHERE name='analysis_run' GROUP BY user_id) t`,
    ]);

    return Response.json({
      kpis: {
        totalUsers: totalUsers[0].count,
        newToday: newToday[0].count,
        newWeek: newWeek[0].count,
        activeToday: activeToday[0].count,
        activeWeek: activeWeek[0].count,
        totalAnalyses: totalAnalyses[0].count,
        analysesToday: analysesToday[0].count,
        analysesWeek: analysesWeek[0].count,
        retained: retained[0].count,
        avgAnalysesPerUser: parseFloat(avgAnalyses[0]?.avg || '0'),
      },
      trends: { dau: dauTrend, analyses: analysesTrend },
      topQueries, referrers,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
