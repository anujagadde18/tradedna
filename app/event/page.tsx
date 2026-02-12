export default function EventPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "72px 20px" }}>
        <a href="/" style={{ color: "#9CA3AF", textDecoration: "none", fontSize: 13 }}>
          ← Back
        </a>

        <h1 style={{ fontSize: 34, marginTop: 16 }}>Choose an Event</h1>
        <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.6, maxWidth: 720 }}>
          For Day 1, we’ll start with a simple demo event. Next, we’ll make this pull markets from Polymarket API.
        </p>

        <div
          style={{
            marginTop: 18,
            borderRadius: 18,
            padding: 18,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            Will Bitcoin cross $150k by Dec 2026?
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <a
              href="/scores"
              style={{
                background: "#00D4FF",
                color: "#001018",
                padding: "12px 16px",
                borderRadius: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Generate Scores
            </a>

            <a
              href="https://polymarket.com"
              target="_blank"
              rel="noreferrer"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#fff",
                padding: "12px 16px",
                borderRadius: 12,
                fontWeight: 600,
                textDecoration: "none",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              View on Polymarket
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
