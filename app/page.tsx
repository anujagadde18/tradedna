export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "80px 20px" }}>
        <div style={{ color: "#9CA3AF", fontSize: 13 }}>
          ● Live MVP • Confidence Engine for Polymarket events
        </div>
        <h1 style={{ fontSize: 54, marginTop: 14, marginBottom: 10 }}>
          TradeDNA
        </h1>
        <p style={{ color: "#9CA3AF", lineHeight: 1.6, maxWidth: 720 }}>
          Pick an event, we compute three scores (Social, News, Technical), you get a confidence read plus resources to research. Goal: help new users build conviction before trading on Polymarket.
        </p>
        <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/event" style={{ padding: "12px 18px", borderRadius: 12, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none" }}>
            Start Demo
          </a>
          <a href="https://polymarket.com" target="_blank" rel="noreferrer" style={{ padding: "12px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.16)", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
            Open Polymarket
          </a>
        </div>
      </div>
    </main>
  );
}
