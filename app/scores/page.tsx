// app/scores/page.tsx
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { event?: string };
};

export default function ScoresPage({ searchParams }: PageProps) {
  const event = searchParams?.event ? decodeURIComponent(searchParams.event) : "Unknown Event";

  // demo scores (we’ll calculate later)
  const scores = { social: 72, news: 61, technical: 68 };
  const overall = Math.round((scores.social + scores.news + scores.technical) / 3);

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "72px 20px" }}>
        <a href="/event" style={{ color: "#9CA3AF", fontSize: 13 }}>
          ← Back to Event
        </a>

        <h1 style={{ fontSize: 34, marginTop: 18 }}>Confidence Breakdown</h1>

        <div style={{ marginTop: 10, color: "#9CA3AF" }}>
          <b style={{ color: "#fff" }}>Event:</b> {event}
        </div>

        <div
          style={{
            marginTop: 30,
            padding: 20,
            borderRadius: 18,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h2>Overall Confidence</h2>
          <div style={{ fontSize: 48, fontWeight: 700, color:
