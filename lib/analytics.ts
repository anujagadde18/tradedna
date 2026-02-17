// lib/analytics.ts

export async function track(name: string, props?: Record<string, any>) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, props }),
    });
  } catch (error) {
    console.error("Track error:", error);
  }
}

export async function saveAnalysis(data: {
  event_text: string;
  category?: string;
  yes_conf?: number;
  no_conf?: number;
  reliability?: number;
  conviction?: string;
  stability?: number;
  weights?: Record<string, number>;
}) {
  try {
    const response = await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Save analysis error:", error);
    return { ok: false };
  }
}
