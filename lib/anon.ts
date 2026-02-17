// lib/anon.ts
import { cookies, headers } from "next/headers";

export async function getOrCreateAnonId() {
  const cookieStore = await cookies();
  let anon = cookieStore.get("pp_anon")?.value;

  if (!anon) {
    anon = crypto.randomUUID();
    cookieStore.set("pp_anon", anon, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  const headersList = await headers();
  const ref = headersList.get("referer") || null;
  return { anonId: anon, referer: ref };
}
