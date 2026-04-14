import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const headersList = headers();
    const referer = headersList.get('referer') || '';
    const userAgent = (headersList.get('user-agent') || '').slice(0, 150);
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '');
    const props = body.props ?? {};
    const anonId = body.anonId || crypto.randomUUID();

    if (!name) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 });

    await sql`
      INSERT INTO users (id, first_ref, last_seen_at)
      VALUES (${anonId}::uuid, ${referer}, NOW())
      ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()
    `;

    await sql`
      INSERT INTO events (user_id, name, props)
      VALUES (${anonId}::uuid, ${name}, ${JSON.stringify({...props, ua: userAgent})}::jsonb)
    `;

    return NextResponse.json({ ok: true, anonId });
  } catch (err: any) {
    console.error('Track:', err.message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
