export const dynamic = "force-dynamic";

export default function ScoresPage({
  searchParams,
}: {
  searchParams?: { event?: string };
}) {
  const event = searchParams?.event ?? "Unknown Event";
  const scores = {
    social: 72,
    news: 61,
    technical: 68,
  };
  const overall = Math.round((scores.social + scores.news + scores.technical) / 3);
  const q = encodeURIComponent(event);

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
          <div style={{ fontSize: 48, fontWeight: 700, color: "#00D4FF" }}>
            {overall}%
          </div>
        </div>
        <div
          style={{
            marginTop: 30,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          <ScoreCard title="Social Score" value={scores.social} />
          <ScoreCard title="News Score" value={scores.news} />
          <ScoreCard title="Technical Score" value={scores.technical} />
        </div>
        <div
          style={{
            marginTop: 40,
            padding: 18,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h3>Suggested Research Links</h3>
          <ul style={{ marginTop: 10, lineHeight: 1.8 }}>
            <li>
              
                href={`https://x.com/search?q=${q}&src=typed_query`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#00D4FF" }}
              >
                X Sentiment Search
              </a>
            </li>
            <li>
              
                href={`https://news.google.com/search?q=${q}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#00D4FF" }}
              >
                Google News
              </a>
            </li>
            <li>
              
                href={`https://polymarket.com/search?q=${q}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#00D4FF" }}
              >
                Search on Polymarket
              </a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function ScoreCard({ title, value }: { title: string; value: number }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 36, marginTop: 10 }}>{value}%</div>
    </div>
  );
}
