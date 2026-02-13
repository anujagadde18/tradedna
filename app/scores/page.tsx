"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ScoresPage() {
  const searchParams = useSearchParams();
  const event = searchParams.get("event") || "Unknown Event";
  const base = useMemo(() => generateBaseScores(event), [event]);
  const [wSocial, setWSocial] = useState(40);
  const [wNews, setWNews] = useState(35);
  const [wTech, setWTech] = useState(25);
  const overall = useMemo(() => {
    const total = wSocial + wNews + wTech;
    if (total === 0) return 0;
    return Math.round((base.social * wSocial + base.news * wNews + base.technical * wTech) / total);
  }, [base, wSocial, wNews, wTech]);
  const q = encodeURIComponent(event);

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff", padding: "72px 20px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <a href="/event" style={{ color: "#9CA3AF", fontSize: 13 }}>← Back to Event</a>
        <h1 style={{ fontSize: 34, marginTop: 18 }}>Confidence Breakdown</h1>
        <div style={{ marginTop: 10, color: "#9CA3AF" }}><b style={{ color: "#fff" }}>Event:</b> {event}</div>
        
        <div style={{ marginTop: 24, padding: 24, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Overall Confidence</h2>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#00D4FF", marginTop: 8 }}>{overall}%</div>
          <div style={{ marginTop: 20, color: "#9CA3AF", fontSize: 13 }}>Adjust weights below ↓</div>
          
          <div style={{ marginTop: 20, background: "rgba(255,255,255,0.04)", padding: 16, borderRadius: 12 }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>Social weight</span>
              <span style={{ color: "#00D4FF", fontWeight: 700 }}>{wSocial}</span>
            </div>
            <input type="range" min="0" max="100" value={wSocial} onChange={(e) => setWSocial(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.04)", padding: 16, borderRadius: 12 }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>News weight</span>
              <span style={{ color: "#00D4FF", fontWeight: 700 }}>{wNews}</span>
            </div>
            <input type="range" min="0" max="100" value={wNews} onChange={(e) => setWNews(Number(e.target.value))} style={{ width: "100%" }} />
          </div>

          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.04)", padding: 16, borderRadius: 12 }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>Technical weight</span>
              <span style={{ color: "#00D4FF", fontWeight: 700 }}>{wTech}</span>
            </div>
            <input type="range" min="0" max="100" value={wTech} onChange={(e) => setWTech(Number(e.target.value))} style={{ width: "100%" }} />
          </div>
        </div>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontWeight: 700 }}>Social Score</div>
            <div style={{ fontSize: 38, marginTop: 10, fontWeight: 800 }}>{base.social}%</div>
          </div>
          <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontWeight: 700 }}>News Score</div>
            <div style={{ fontSize: 38, marginTop: 10, fontWeight: 800 }}>{base.news}%</div>
          </div>
          <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontWeight: 700 }}>Technical Score</div>
            <div style={{ fontSize: 38, marginTop: 10, fontWeight: 800 }}>{base.technical}%</div>
          </div>
        </div>

        <div style={{ marginTop: 28, padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ marginTop: 0 }}>Suggested Research Links</h3>
          <ul style={{ marginTop: 10, lineHeight: 1.9 }}>
            <li><a href={`https://x.com/search?q=${q}&src=typed_query`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>X sentiment search</a></li>
            <li><a href={`https://news.google.com/search?q=${q}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>Google News</a></li>
            <li><a href={`https://polymarket.com/search?q=${q}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>Find market on Polymarket</a></li>
          </ul>
        </div>

        <a href={`https://polymarket.com/search?q=${q}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 20, padding: "12px 18px", borderRadius: 12, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none" }}>
          Trade on Polymarket →
        </a>
      </div>
    </main>
  );
}

function generateBaseScores(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return {
    social: Math.min(100, 45 + (h % 56)),
    news: Math.min(100, 40 + ((h * 7) % 61)),
    technical: Math.min(100, 42 + ((h * 13) % 59))
  };
}
