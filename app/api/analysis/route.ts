// app/api/analysis/route.ts
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getOrCreateAnonId } from "@/lib/anon";

export async function POST(req: Request) {
  try {
    const { anonId, referer } = await getOrCreateAnonId();
    const body = await req.json();

    const analysisId = crypto.randomUUID();

    // Minimal validation
    const event_text = String(body.event_text || "");
    if (!event_text) {
      return NextResponse.json({ ok: false, error: "Missing event_text" }, { status: 400 });
    }

    // Upsert user
    await sql`
      insert into users (id, first_ref)
      values (${anonId}::uuid, ${referer})
      on conflict (id) do update
      set last_seen_at = now()
    `;

    // Save analysis
    await sql`
      insert into analyses (
        id, user_id, event_text, category,
        yes_conf, no_conf, reliability, conviction, stability, weights
      ) values (
        ${analysisId}::uuid,
        ${anonId}::uuid,
        ${event_text},
        ${body.category ?? null},
        ${body.yes_conf ?? null},
        ${body.no_conf ?? null},
        ${body.reliability ?? null},
        ${body.conviction ?? null},
        ${body.stability ?? null},
        ${JSON.stringify(body.weights ?? {})}::jsonb
      )
    `;

    // Track event
    await sql`
      insert into events (user_id, name, props)
      values (${anonId}::uuid, 'analyze_completed', ${JSON.stringify({ analysisId, category: body.category })}::jsonb)
    `;

    return NextResponse.json({ ok: true, analysisId });
  } catch (error) {
    console.error("Analysis save error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
