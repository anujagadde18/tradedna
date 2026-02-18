import { sql } from "@vercel/postgres";

export async function GET() {
  const result = await sql`select now()`;
  return Response.json({ ok: true, time: result.rows[0] });
}
