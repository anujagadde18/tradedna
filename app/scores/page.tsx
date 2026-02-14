"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function ScoresContent() {
  const searchParams = useSearchParams();
  const event = searchParams.get("event") || "Unknown Event";
  const base = useMemo(() => generateBaseScores(event), [event]);
  const [wSocial, setWSocial] = useState(40);
  const [wNews, setWNews] = useState(35);
  const [wTech, setWTech] = useState(25);
  const [copied, setCopied] = useState(false);
  
  const overall = useMemo(() => {
    const total = wSocial + wNews + wTech;
    if (total === 0) return 0;
    return Math.round((base.social * wSocial + base.news * wNews + base.technical * wTech) / total);
  }, [base, wSocial, wNews, wTech]);
  
  const contributions = useMemo(() => {
    const total = wSocial + wNews + wTech;
    if (total === 0) return { social: 0, news: 0, technical: 0 };
    return {
      social: Math.round((wSocial / total) * 100),
      news: Math.round((wNews / total) * 100),
      technical: Math.round((wTech / total) * 100)
    };
  }, [wSocial, wNews, wTech]);
  
  const q = encodeURIComponent(event);

  const handleShare = async () => {
    const shareText = `📊 TradeDNA Analysis: ${event}

Overall Confidence: ${overall}%
- Social: ${base.social}% (weight: ${wSocial})
- News: ${base.news}% (weight: ${wNews})
- Technical: ${base.technical}% (weight: ${wTech})

Research:
🔍 X: https://x.com/search?q=${q}
📰 News: https://news.google.com/search?q=${q}
💹 Polymarket: https://polymarket.com/search?q=${q}

Powered by TradeDNA`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Copy failed - please copy manually");
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff", padding: "72px 20px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <a href="/event" style={{ color: "#9CA3AF", fontSize: 13 }}>← Back to Event</a>
        <h1 style={{ fontSize: 34, marginTop: 18 }}>Confidence Breakdown</h1>
        <div style={{ marginTop: 10, color: "#9CA3AF" }}>
          <b style={{ color: "#fff" }}>Event:</b> {event}
        </div>
        <div style={{ marginTop: 8, color: "#9CA3AF", fontSize: 12, fontStyle: "italic" }}>
          ⚠️ Scores are demo-generated from event text until API connection
        </div>
        
        <div style={{ marginTop: 24, padding: 24, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>Overall Confidence</h2>
            <button onClick={handleShare} style={{ padding: "8px 14px", borderRadius: 8, background: copied ? "#10B981" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {copied ? "✓ Copied!" : "📋 Copy Analysis"}
            </button>
          </div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#00D4FF", marginTop: 8 }}>{overall}%</div>
          
          <div style={{ marginTop: 16, display: "flex", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
            <span style={{ color: "#9CA3AF" }}>Based on:</span>
            <span style={{ color: "#00D4FF", fontWeight: 600 }}>{contributions.social}% Social</span>
            <span style={{ color: "#9CA3AF" }}>•</span>
            <span style={{ color: "#00D4FF", fontWeight: 600 }}>{contributions.news}% News</span>
            <span style={{ color: "#9CA3AF" }}>•</span>
            <span style={{ color: "#00D4FF", fontWeight: 600 }}>{contributions.technical}% Technical</span>
          </div>
          
          <div style={{ marginTop: 20, color: "#9CA3AF", fontSize: 13 }}>Adjust weights below ↓</div>
          
          <div style={{ marginTop: 20, background: "rgba(255,255,255,0.04)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontWeight: 700 }}>Social weight</div><div style={{ color: "#9CA3AF", fontSize: 12 }}>X / community sentiment</div></div>
              <span style={{ color: "#00D4FF", fontWeight: 800, fontSize: 18 }}>{wSocial}</span>
            </div>
            <input type="range" min="0" max="100" value={wSocial} onChange={(e) => setWSocial(Number(e.target.value))} style={{ width: "100%", cursor: "pointer" }} />
          </div>

          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.04)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontWeight: 700 }}>News weight</div><div style={{ color: "#9CA3AF", fontSize: 12 }}>headlines / narratives</div></div>
              <span style={{ color: "#00D4FF", fontWeight: 800, fontSize: 18 }}>{wNews}</span>
            </div>
            <input type="range" min="0" max="100" value={wNews} onChange={(e) => setWNews(Number(e.target.value))} style={{ width: "100%", cursor: "pointer" }} />
          </div>

          <div style={{ marginTop: 16, background: "rgba(255,255,255,0.04)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontWeight: 700 }}>Technical weight</div><div style={{ color: "#9CA3AF", fontSize: 12 }}>price action / indicators</div></div>
              <span style={{ color: "#00D4FF", fontWeight: 800, fontSize: 18 }}>{wTech}</span>
            </div>
            <input type="range" min="0" max="100" value={wTech} onChange={(e) => setWTech(Number(e.target.value))} style={{ width: "100%", cursor: "pointer" }} />
          </div>
        </div>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          <EvidenceCard 
            title="Social Score" 
            value={base.social} 
            contribution={contributions.social}
            weight={wSocial}
            evidence={[
              { label: "X search: event", url: `https://x.com/search?q=${q}&src=typed_query` },
              { label: 'X search: event + "YES"', url: `https://x.com/search?q=${q}%20YES&src=typed_query` },
              { label: 'X search: event + "NO"', url: `https://x.com/search?q=${q}%20NO&src=typed_query` }
            ]}
            staticInfo={[
              "Top accounts to watch:",
              "• @polymarket (official)",
              "• @0xSisyphus (analyst)",
              "• @dontloseyoureth (markets)"
            ]}
            notes="Check community sentiment, influencer takes, and viral threads" 
          />
          
          <EvidenceCard 
            title="News Score" 
            value={base.news} 
            contribution={contributions.news}
            weight={wNews}
            evidence={[
              { label: "Google News", url: `https://news.google.com/search?q=${q}` },
              { label: "Reuters coverage", url: `https://www.google.com/search?q=site:reuters.com+${q}` },
              { label: "Bloomberg coverage", url: `https://www.google.com/search?q=site:bloomberg.com+${q}` }
            ]}
            notes="Look for major headlines, expert analysis, and breaking developments" 
          />
          
          <EvidenceCard 
            title="Technical Score" 
            value={base.technical} 
            contribution={contributions.technical}
            weight={wTech}
            evidence={[
              { label: "TradingView charts", url: `https://www.tradingview.com/search/?text=${q}` },
              { label: "CoinMarketCap (crypto)", url: `https://coinmarketcap.com/search?q=${q}` }
            ]}
            staticInfo={[
              "Indicators to check:",
              "• RSI (overbought/oversold)",
              "• Trend direction (uptrend/down)",
              "• Volume (buying/selling pressure)",
              "• Support/resistance levels"
            ]}
            notes="Price action and momentum indicators" 
          />
        </div>

        <div style={{ marginTop: 28, padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ marginTop: 0 }}>Next Steps</h3>
          <ol style={{ marginTop: 10, lineHeight: 1.9, paddingLeft: 20 }}>
            <li>Review evidence panels above to validate scores</li>
            <li>Research both YES and NO cases thoroughly</li>
            <li>Check recent price action and market trends</li>
            <li>Read expert opinions and community sentiment</li>
            <li>Make your informed decision on Polymarket</li>
          </ol>
        </div>

        <a href={`https://polymarket.com/search?q=${q}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 20, padding: "14px 20px", borderRadius: 12, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
          Trade on Polymarket →
        </a>
      </div>
    </main>
  );
}

function EvidenceCard({ title, value, contribution, weight, evidence, staticInfo, notes }: { title: string; value: number; contribution: number; weight: number; evidence: Array<{ label: string; url: string }>; staticInfo?: string[]; notes: string }) {
  const opacity = weight === 0 ? 0.4 : 1;
  
  return (
    <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: `2px solid ${weight > 50 ? "#00D4FF" : "rgba(255,255,255,0.1)"}`, opacity, transition: "all 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 11, color: "#00D4FF", fontWeight: 700, background: "rgba(0,212,255,0.1)", padding: "4px 8px", borderRadius: 6 }}>
          {contribution}% impact
        </div>
      </div>
      <div style={{ fontSize: 38, marginTop: 10, fontWeight: 800 }}>{value}%</div>
      <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 6, marginBottom: 14 }}>Base score (from event analysis)</div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Evidence sources:</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
          {evidence.map((item, i) => (
            <li key={i}><a href={item.url} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>{item.label}</a></li>
          ))}
        </ul>
        {staticInfo && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#E5E7EB", lineHeight: 1.6 }}>
            {staticInfo.map((line, i) => (
              <div key={i} style={{ color: i === 0 ? "#9CA3AF" : "#E5E7EB" }}>{line}</div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: "#9CA3AF", fontStyle: "italic" }}>{notes}</div>
      </div>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#070B10", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ScoresContent />
    </Suspense>
  );
}

function generateBaseScores(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return { social: Math.min(100, 45 + (h % 56)), news: Math.min(100, 40 + ((h * 7) % 61)), technical: Math.min(100, 42 + ((h * 13) % 59)) };
}
