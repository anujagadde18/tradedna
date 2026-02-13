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
    const weighted = (base.social * wSocial + base.news * wNews + base.technical * wTech) / total;
    return Math.round(weighted);
  }, [base, wSocial, wNews, wTech]);

  const q = encodeURIComponent(event);

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "72px 20px" }}>
        <a href="/event" style={{ color: "#9CA3AF", fontSize: 13 }}>← Back to Event</a>
        <h1 style={{ fontSize: 34, marginTop: 18 }}>Confidence Breakdown</h1>
        <div style={{ marginTop: 10, color: "#9CA3AF" }}>
          <b style={{ color: "#fff" }}>Event:</b> {event}
        </div>
        <div style={{ marginTop: 24, padding: 24, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>Overall Confidence</h2>
            <div style={{ color: "#9CA3AF", fontSize: 13 }}>Weighted by your filters</div>
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#00D4FF", marginTop: 8, marginBottom: 24 }}>{overall}%</div>
          <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
            <SliderRow label="Social weight" value={wSocial} onChange={setWSocial} hint="X / community sentiment" />
            <SliderRow label="News weight" value={wNews} onChange={setWNews} hint="headlines / narratives" />
            <SliderRow label="Technical weight" value={wTech} onChange={setWTech} hint="price action / indicators" />
          </div>
        </div>
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <ScoreCard title="Social Score" value={base.social} />
          <ScoreCard title="News Score" value={base.news} />
          <ScoreCard title="Technical Score" value={base.technical} />
        </div>
        <div style={{ marginTop: 28, padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ marginTop: 0, fontSize: 18 }}>Suggested Research Links</h3>
          <ul style={{ marginTop: 10, lineHeight: 1.9, paddingLeft: 20 }}>
            <li><a href={`https://x.com/search?q=${q}&src=typed_query`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>X sentiment search</a></li>
            <li><a href={`https://news.google.com/search?q=${q}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>Google News</a></li>
            <li><a href={`https://polymarket.com/search?q=${q}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>Find this market on Polymarket</a></li>
          </ul>
        </div>
        <div style={{ marginTop: 20 }}>
          <a href={`https://polymarket.com/search?q=${q}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "12px 18px", borderRadius: 12, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
            Trade on Polymarket →
          </a>
        </div>
      </div>
    </main>
  );
}

function SliderRow({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{label}</div>
          <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 3 }}>{hint}</div>
        </div>
        <div style={{ color: "#00D4FF", fontWeight: 800, fontSize: 18, minWidth: 40, textAlign: "right" }}>{value}</div>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", height: 6, borderRadius: 3, outline: "none", background: "rgba(255,255,255,0.1)", cursor: "pointer", accentColor: "#00D4FF" }} />
    </div>
  );
}

function generateBaseScores(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const social = 45 + (h % 56);
  const news = 40 + ((h * 7) % 61);
  const technical = 42 + ((h * 13) % 59);
  return { social: clamp(social, 40, 100), news: clamp(news, 40, 100), technical: clamp(technical, 40, 100) };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ScoreCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      <div style={{ fontSize: 38, marginTop: 10, fontWeight: 800 }}>{value}%</div>
      <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 6 }}>Base score (demo)</div>
    </div>
  );
}
