"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function ScoresContent() {
  const searchParams = useSearchParams();
  const event = searchParams.get("event") || "Unknown Event";
  const analysis = useMemo(() => analyzeEvent(event), [event]);
  const [wSocial, setWSocial] = useState(40);
  const [wNews, setWNews] = useState(35);
  const [wTech, setWTech] = useState(25);
  const [copied, setCopied] = useState(false);
  
  const overall = useMemo(() => {
    const total = wSocial + wNews + wTech;
    if (total === 0) return 50;
    return Math.round((analysis.scores.social * wSocial + analysis.scores.news * wNews + analysis.scores.technical * wTech) / total);
  }, [analysis.scores, wSocial, wNews, wTech]);
  
  const yesNo = useMemo(() => ({
    yes: overall,
    no: 100 - overall
  }), [overall]);
  
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

Directional Confidence:
✅ YES: ${yesNo.yes}%
❌ NO: ${yesNo.no}%

Signal Strength: ${analysis.uncertainty.strength}
Stability: ${analysis.uncertainty.stability}

Component Scores:
- Social: ${analysis.scores.social}% (weight: ${wSocial})
- News: ${analysis.scores.news}% (weight: ${wNews})
- Technical: ${analysis.scores.technical}% (weight: ${wTech})

${analysis.explanation}

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
        <h1 style={{ fontSize: 34, marginTop: 18 }}>Signal Analysis</h1>
        <div style={{ marginTop: 10, color: "#9CA3AF" }}>
          <b style={{ color: "#fff" }}>Event:</b> {event}
        </div>
        <div style={{ marginTop: 8, color: "#9CA3AF", fontSize: 12, fontStyle: "italic" }}>
          ⚠️ Demo analysis using event-sensitive scoring logic (API integration pending)
        </div>
        
        {/* YES/NO Split */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 20, borderRadius: 18, background: "rgba(16, 185, 129, 0.1)", border: "2px solid rgba(16, 185, 129, 0.3)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#10B981", marginBottom: 4 }}>YES Confidence</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#10B981" }}>{yesNo.yes}%</div>
          </div>
          <div style={{ padding: 20, borderRadius: 18, background: "rgba(239, 68, 68, 0.1)", border: "2px solid rgba(239, 68, 68, 0.3)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#EF4444", marginBottom: 4 }}>NO Confidence</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#EF4444" }}>{yesNo.no}%</div>
          </div>
        </div>

        {/* Signal Strength Indicators */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>Signal Strength</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: analysis.uncertainty.strength === "Strong" ? "#10B981" : analysis.uncertainty.strength === "Moderate" ? "#F59E0B" : "#EF4444" }}>
              {analysis.uncertainty.strength}
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>Signal Stability</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: analysis.uncertainty.stability === "High" ? "#10B981" : analysis.uncertainty.stability === "Medium" ? "#F59E0B" : "#EF4444" }}>
              {analysis.uncertainty.stability}
            </div>
          </div>
        </div>

        {/* Explanation Box */}
        <div style={{ marginTop: 16, padding: 18, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#00D4FF", marginBottom: 8 }}>AI Analysis</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "#E5E7EB" }}>{analysis.explanation}</div>
        </div>

        {/* Score Breakdown with Explanations */}
        <div style={{ marginTop: 24, padding: 24, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Score Components</h2>
            <button onClick={handleShare} style={{ padding: "8px 14px", borderRadius: 8, background: copied ? "#10B981" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {copied ? "✓ Copied!" : "📋 Share Analysis"}
            </button>
          </div>
          
          <div style={{ marginBottom: 20, fontSize: 13, color: "#9CA3AF" }}>
            Adjust weights to match your research priorities ↓
          </div>
          
          <div style={{ marginBottom: 16, display: "flex", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
            <span style={{ color: "#9CA3AF" }}>Current mix:</span>
            <span style={{ color: "#00D4FF", fontWeight: 600 }}>{contributions.social}% Social</span>
            <span style={{ color: "#9CA3AF" }}>•</span>
            <span style={{ color: "#00D4FF", fontWeight: 600 }}>{contributions.news}% News</span>
            <span style={{ color: "#9CA3AF" }}>•</span>
            <span style={{ color: "#00D4FF", fontWeight: 600 }}>{contributions.technical}% Technical</span>
          </div>
          
          <ScoreSlider
            label="Social Weight"
            value={wSocial}
            onChange={setWSocial}
            score={analysis.scores.social}
            boosts={analysis.boosts.social}
            hint="X / community sentiment"
          />

          <ScoreSlider
            label="News Weight"
            value={wNews}
            onChange={setWNews}
            score={analysis.scores.news}
            boosts={analysis.boosts.news}
            hint="Media coverage / institutional attention"
          />

          <ScoreSlider
            label="Technical Weight"
            value={wTech}
            onChange={setWTech}
            score={analysis.scores.technical}
            boosts={analysis.boosts.technical}
            hint="Price action / market indicators"
          />
        </div>

        {/* Evidence Cards */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          <EvidenceCard 
            title="Social Score" 
            value={analysis.scores.social}
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
            value={analysis.scores.news}
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
            value={analysis.scores.technical}
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
          <h3 style={{ marginTop: 0 }}>Research Workflow</h3>
          <ol style={{ marginTop: 10, lineHeight: 1.9, paddingLeft: 20, color: "#E5E7EB" }}>
            <li>Review the AI-generated analysis and score breakdowns above</li>
            <li>Check signal strength and stability indicators</li>
            <li>Click through evidence sources to validate each component</li>
            <li>Adjust weights based on your confidence in each signal type</li>
            <li>Compare YES and NO directional confidence before trading</li>
          </ol>
        </div>

        <a href={`https://polymarket.com/search?q=${q}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 20, padding: "14px 20px", borderRadius: 12, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
          Trade on Polymarket →
        </a>
      </div>
    </main>
  );
}

function ScoreSlider({ label, value, onChange, score, boosts, hint }: { label: string; value: number; onChange: (v: number) => void; score: number; boosts: string[]; hint: string }) {
  return (
    <div style={{ marginTop: 16, background: "rgba(255,255,255,0.04)", padding: 16, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
          <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{hint}</div>
          {boosts.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#00D4FF" }}>
              {boosts.map((boost, i) => (
                <div key={i}>• {boost}</div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#E5E7EB" }}>{score}%</div>
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>base score</div>
          </div>
          <div style={{ color: "#00D4FF", fontWeight: 800, fontSize: 18 }}>{value}</div>
        </div>
      </div>
      <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", cursor: "pointer" }} />
    </div>
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
      <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 6, marginBottom: 14 }}>Event-sensitive score</div>
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

function analyzeEvent(event: string) {
  const lower = event.toLowerCase();
  
  let social = 50;
  let news = 50;
  let technical = 50;
  
  const socialBoosts: string[] = [];
  const newsBoosts: string[] = [];
  const technicalBoosts: string[] = [];

  // Crypto/Finance topics
  if (lower.includes("bitcoin") || lower.includes("btc") || lower.includes("crypto") || lower.includes("ethereum")) {
    technical += 20;
    social += 10;
    technicalBoosts.push("Crypto asset detected (+20)");
    socialBoosts.push("Strong crypto community (+10)");
  }

  // Political topics
  if (lower.includes("election") || lower.includes("trump") || lower.includes("biden") || lower.includes("president") || lower.includes("vote")) {
    social += 25;
    news += 15;
    socialBoosts.push("Political event (+25)");
    newsBoosts.push("High media coverage expected (+15)");
  }

  // Regulatory/Policy
  if (lower.includes("regulation") || lower.includes("law") || lower.includes("bill") || lower.includes("policy") || lower.includes("ban")) {
    news += 25;
    newsBoosts.push("Regulatory topic (+25)");
  }

  // Markets/Trading
  if (lower.includes("stock") || lower.includes("market") || lower.includes("trading") || lower.includes("price") || lower.includes("$")) {
    technical += 15;
    technicalBoosts.push("Market-related event (+15)");
  }

  // Viral/Social
  if (lower.includes("viral") || lower.includes("trend") || lower.includes("meme") || lower.includes("social")) {
    social += 20;
    socialBoosts.push("Viral/trending topic (+20)");
  }

  // News-heavy
  if (lower.includes("breaking") || lower.includes("report") || lower.includes("announce") || lower.includes("scandal")) {
    news += 20;
    newsBoosts.push("Breaking news indicator (+20)");
  }

  // Time-based
  if (lower.includes("2026") || lower.includes("2027") || lower.includes("next year")) {
    technical += 5;
    technicalBoosts.push("Long-term forecast (+5)");
  }

  if (lower.includes("today") || lower.includes("this week") || lower.includes("tomorrow")) {
    social += 10;
    news += 10;
    socialBoosts.push("Short-term event (+10)");
    newsBoosts.push("Immediate news cycle (+10)");
  }

  // Randomize slightly
  const hash = event.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  social += (hash % 10);
  news += ((hash * 3) % 10);
  technical += ((hash * 7) % 10);

  const scores = {
    social: Math.min(Math.max(social, 40), 95),
    news: Math.min(Math.max(news, 40), 95),
    technical: Math.min(Math.max(technical, 40), 95)
  };

  // Calculate uncertainty
  const highest = Math.max(scores.social, scores.news, scores.technical);
  const lowest = Math.min(scores.social, scores.news, scores.technical);
  const spread = highest - lowest;
  
  let strength: "Strong" | "Moderate" | "Weak";
  if (highest > 75) strength = "Strong";
  else if (highest > 60) strength = "Moderate";
  else strength = "Weak";

  let stability: "High" | "Medium" | "Low";
  if (spread < 15) stability = "High";
  else if (spread < 30) stability = "Medium";
  else stability = "Low";

  // Generate explanation
  const explanation = generateExplanation(event, scores, strength, stability);

  return {
    scores,
    boosts: {
      social: socialBoosts,
      news: newsBoosts,
      technical: technicalBoosts
    },
    uncertainty: { strength, stability },
    explanation
  };
}

function generateExplanation(event: string, scores: { social: number; news: number; technical: number }, strength: string, stability: string): string {
  const lower = event.toLowerCase();
  const highest = Math.max(scores.social, scores.news, scores.technical);
  
  let primary = "";
  if (scores.social === highest) primary = `Strong social momentum (${scores.social}%)`;
  else if (scores.news === highest) primary = `High institutional coverage (${scores.news}%)`;
  else primary = `Strong technical indicators (${scores.technical}%)`;

  let context = "";
  if (lower.includes("crypto") || lower.includes("bitcoin")) {
    context = "Crypto markets combine technical patterns with social sentiment. ";
  } else if (lower.includes("election") || lower.includes("political")) {
    context = "Political outcomes are driven by polling data and social momentum. ";
  } else if (lower.includes("regulation") || lower.includes("policy")) {
    context = "Regulatory events require institutional news monitoring. ";
  }

  let recommendation = "";
  if (strength === "Strong" && stability === "High") {
    recommendation = "High-confidence signals suggest directional clarity.";
  } else if (strength === "Strong" && stability === "Low") {
    recommendation = "Strong but volatile signals—expect rapid changes.";
  } else if (strength === "Moderate") {
    recommendation = "Moderate conviction—additional research recommended.";
  } else {
    recommendation = "Weak signals—wait for clearer indicators before trading.";
  }

  return `${context}${primary} suggests directional bias. Signal strength is ${strength.toLowerCase()} with ${stability.toLowerCase()} stability. ${recommendation}`;
}
