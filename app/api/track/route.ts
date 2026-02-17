// app/api/track/route.ts
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getOrCreateAnonId } from "@/lib/anon";

export async function POST(req: Request) {
  try {
    const { anonId, referer } = await getOrCreateAnonId();
    const body = await req.json().catch(() => ({}));

    const name = String(body.name || "");
    const props = body.props ?? {};

    if (!name) {
      return NextResponse.json({ ok: false, error: "Missing event name" }, { status: 400 });
    }

    // Upsert user
    await sql`
      insert into users (id, first_ref)
      values (${anonId}::uuid, ${referer})
      on conflict (id) do update
      set last_seen_at = now()
    `;

    // Log event
    await sql`
      insert into events (user_id, name, props)
      values (${anonId}::uuid, ${name}, ${JSON.stringify(props)}::jsonb)
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
