export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
          padding: "72px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#00D4FF",
              boxShadow: "0 0 18px rgba(0,212,255,0.8)",
            }}
          />
          <span style={{ color: "#9CA3AF", fontSize: 13 }}>
            Live MVP • Confidence Engine for Polymarket events
          </span>
        </div>

        <h1 style={{ fontSize: 44, lineHeight: 1.1, marginTop: 18 }}>
          TradeDNA
        </h1>

        <p style={{ color: "#9CA3AF", fontSize: 16, lineHeight: 1.6, marginTop: 12, maxWidth: 720 }}>
          Pick an event → we compute three scores (Social, News, Technical) → you get a confidence read +
          resources to research. Goal: help new users build conviction before trading on Polymarket.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
          <a
            href="/event"
            style={{
              background: "#00D4FF",
              color: "#001018",
              padding: "12px 18px",
              borderRadius: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Start (Demo)
          </a>

          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noreferrer"
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#fff",
              padding: "12px 18px",
              borderRadius: 12,
              fontWeight: 600,
              textDecoration: "none",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            Open Polymarket
          </a>
        </div>

        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {[
            { title: "Social Score", desc: "What X / communities are leaning toward." },
            { title: "News Score", desc: "Signals from headlines & reputable sources." },
            { title: "Technical Score", desc: "Historical / trend-based confidence inputs." },
            { title: "Your TradeDNA", desc: "A combined view + resources to learn." },
          ].map((c) => (
            <div
              key={c.title}
              style={{
                borderRadius: 16,
                padding: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div style={{ fontWeight: 700 }}>{c.title}</div>
              <div style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
                {c.desc}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 34, color: "#6B7280", fontSize: 12 }}>
          Practice-first. No real money. This is an early MVP built for speed.
        </div>
      </div>
    </main>
  );
}
