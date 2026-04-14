import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const referer = req.headers.get('referer') || '';
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 150);
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '');
    const props = body.props ?? {};
    const anonId = body.anonId || crypto.randomUUID();

    if (!name) return NextResponse.json({ ok: false }, { status: 400 });

    await sql`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), first_ref TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), last_seen_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS events (id SERIAL PRIMARY KEY, user_id UUID, name TEXT NOT NULL, props JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW())`;

    await sql`INSERT INTO users (id, first_ref, last_seen_at) VALUES (${anonId}::uuid, ${referer}, NOW()) ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()`;
    await sql`INSERT INTO events (user_id, name, props) VALUES (${anonId}::uuid, ${name}, ${JSON.stringify({...props, ua: userAgent})}::jsonb)`;

    return NextResponse.json({ ok: true, anonId });
  } catch (err: any) {
    console.error('Track:', err.message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
