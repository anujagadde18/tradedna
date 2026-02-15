"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function ScoresContent() {
  const searchParams = useSearchParams();
  const event = searchParams.get("event") || "Unknown Event";
  const analysis = useMemo(() => analyzeEvent(event), [event]);
  
  const [wSocial, setWSocial] = useState(40);
  const [wNews, setWNews] = useState(35);
  const [wTech, setWTech] = useState(25);
  const [copied, setCopied] = useState(false);
  const [weightsLoaded, setWeightsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tradedna_weights");
      if (saved) {
        const parsed = JSON.parse(saved);
        setWSocial(parsed.social || 40);
        setWNews(parsed.news || 35);
        setWTech(parsed.technical || 25);
      }
    } catch (err) {
      console.log("Could not load saved weights");
    }
    setWeightsLoaded(true);
  }, []);

  useEffect(() => {
    if (!weightsLoaded) return;
    try {
      localStorage.setItem("tradedna_weights", JSON.stringify({
        social: wSocial,
        news: wNews,
        technical: wTech
      }));
    } catch (err) {
      console.log("Could not save weights");
    }
  }, [wSocial, wNews, wTech, weightsLoaded]);
  
  const directionalAnalysis = useMemo(() => 
    calculateDirectionalBias(analysis.scores, { social: wSocial, news: wNews, technical: wTech }, analysis.volatility),
    [analysis.scores, wSocial, wNews, wTech, analysis.volatility]
  );
  
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
✅ YES: ${directionalAnalysis.yes}%
❌ NO: ${directionalAnalysis.no}%

Conviction: ${directionalAnalysis.conviction}
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

  const resetWeights = () => {
    setWSocial(40);
    setWNews(35);
    setWTech(25);
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
          ⚠️ Adaptive conviction modeling using semantic analysis (API integration pending)
        </div>
        
        {/* YES/NO Split with Conviction */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9CA3AF" }}>Directional Confidence</div>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 700, 
              padding: "4px 10px", 
              borderRadius: 6,
              background: directionalAnalysis.conviction === "High Conviction" ? "rgba(16, 185, 129, 0.15)" : 
                         directionalAnalysis.conviction === "Moderate" ? "rgba(245, 158, 11, 0.15)" : 
                         directionalAnalysis.conviction === "Uncertain" ? "rgba(156, 163, 175, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: directionalAnalysis.conviction === "High Conviction" ? "#10B981" : 
                     directionalAnalysis.conviction === "Moderate" ? "#F59E0B" : 
                     directionalAnalysis.conviction === "Uncertain" ? "#9CA3AF" : "#EF4444"
            }}>
              {directionalAnalysis.conviction}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 20, borderRadius: 18, background: "rgba(16, 185, 129, 0.1)", border: "2px solid rgba(16, 185, 129, 0.3)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#10B981", marginBottom: 4 }}>YES Confidence</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: "#10B981" }}>{directionalAnalysis.yes}%</div>
            </div>
            <div style={{ padding: 20, borderRadius: 18, background: "rgba(239, 68, 68, 0.1)", border: "2px solid rgba(239, 68, 68, 0.3)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#EF4444", marginBottom: 4 }}>NO Confidence</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: "#EF4444" }}>{directionalAnalysis.no}%</div>
            </div>
          </div>
        </div>

        {/* Signal Strength Indicators */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
          <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>Volatility</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: analysis.volatility > 15 ? "#EF4444" : analysis.volatility > 8 ? "#F59E0B" : "#10B981" }}>
              {analysis.volatility > 15 ? "High" : analysis.volatility > 8 ? "Medium" : "Low"}
            </div>
          </div>
        </div>

        {/* Explanation Box */}
        <div style={{ marginTop: 16, padding: 18, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#00D4FF", marginBottom: 8 }}>AI Analysis</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "#E5E7EB" }}>{analysis.explanation}</div>
          {analysis.uncertainty.stability === "Low" && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#F59E0B", fontStyle: "italic" }}>
              ⚠️ Low stability detected: Score variance is {analysis.variance.toFixed(1)}. Signals are conflicting—additional research strongly recommended.
            </div>
          )}
        </div>

        {/* Score Breakdown */}
        <div style={{ marginTop: 24, padding: 24, borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Score Components</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={resetWeights} style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", color: "#9CA3AF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Reset Weights
              </button>
              <button onClick={handleShare} style={{ padding: "8px 14px", borderRadius: 8, background: copied ? "#10B981" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {copied ? "✓ Copied!" : "📋 Share"}
              </button>
            </div>
          </div>
          
          <div style={{ marginBottom: 20, fontSize: 13, color: "#9CA3AF" }}>
            Adjust weights to match your research priorities (saved automatically) ↓
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
            <li>Review AI analysis and conviction level</li>
            <li>Check signal strength, stability, and volatility metrics</li>
            <li>Validate each component score with evidence sources</li>
            <li>Adjust weights based on your confidence in each signal</li>
            <li>Compare YES vs NO confidence with conviction tier</li>
            <li>Make informed decision on Polymarket</li>
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

// ========================================
// PHASE 2: INTELLIGENT ENGINE LOGIC
// ========================================

interface EventCategory {
  name: string;
  keywords: string[];
  socialBias: number;
  newsBias: number;
  technicalBias: number;
  volatility: number;
}

const EVENT_CATEGORIES: EventCategory[] = [
  {
    name: "Cryptocurrency",
    keywords: ["bitcoin", "btc", "ethereum", "eth", "crypto", "blockchain", "defi", "nft", "altcoin", "token"],
    socialBias: 15,
    newsBias: 10,
    technicalBias: 25,
    volatility: 12
  },
  {
    name: "Politics",
    keywords: ["election", "vote", "president", "trump", "biden", "congress", "senate", "democrat", "republican", "political"],
    socialBias: 25,
    newsBias: 20,
    technicalBias: 5,
    volatility: 15
  },
  {
    name: "Regulation",
    keywords: ["regulation", "sec", "law", "bill", "policy", "ban", "approve", "approval", "etf", "compliance"],
    socialBias: 8,
    newsBias: 28,
    technicalBias: 12,
    volatility: 10
  },
  {
    name: "Markets",
    keywords: ["stock", "market", "trading", "price", "$", "wall street", "nasdaq", "s&p", "dow", "index"],
    socialBias: 10,
    newsBias: 15,
    technicalBias: 22,
    volatility: 8
  },
  {
    name: "Technology",
    keywords: ["ai", "tech", "apple", "google", "microsoft", "tesla", "innovation", "product", "launch", "release"],
    socialBias: 18,
    newsBias: 18,
    technicalBias: 15,
    volatility: 9
  },
  {
    name: "Sports",
    keywords: ["nfl", "nba", "mlb", "nhl", "soccer", "football", "basketball", "championship", "playoff", "super bowl"],
    socialBias: 22,
    newsBias: 12,
    technicalBias: 8,
    volatility: 14
  },
  {
    name: "Entertainment",
    keywords: ["movie", "film", "oscar", "grammy", "emmy", "celebrity", "actor", "music", "album", "box office"],
    socialBias: 25,
    newsBias: 15,
    technicalBias: 5,
    volatility: 11
  },
  {
    name: "Crisis",
    keywords: ["war", "crisis", "pandemic", "disaster", "attack", "conflict", "emergency", "outbreak"],
    socialBias: 20,
    newsBias: 25,
    technicalBias: 10,
    volatility: 18
  }
];

function analyzeEvent(event: string) {
  const lower = event.toLowerCase();
  
  let social = 50;
  let news = 50;
  let technical = 50;
  let volatility = 5;
  
  const socialBoosts: string[] = [];
  const newsBoosts: string[] = [];
  const technicalBoosts: string[] = [];

  // Category detection
  for (const category of EVENT_CATEGORIES) {
    const matchCount = category.keywords.filter(kw => lower.includes(kw)).length;
    if (matchCount > 0) {
      const strength = Math.min(matchCount / category.keywords.length, 1);
      const socialAdd = Math.round(category.socialBias * strength);
      const newsAdd = Math.round(category.newsBias * strength);
      const techAdd = Math.round(category.technicalBias * strength);
      
      social += socialAdd;
      news += newsAdd;
      technical += techAdd;
      volatility += Math.round(category.volatility * strength);
      
      if (socialAdd > 0) socialBoosts.push(`${category.name} category (+${socialAdd})`);
      if (newsAdd > 0) newsBoosts.push(`${category.name} category (+${newsAdd})`);
      if (techAdd > 0) technicalBoosts.push(`${category.name} category (+${techAdd})`);
    }
  }

  // Time sensitivity
  if (lower.includes("today") || lower.includes("this week") || lower.includes("tomorrow")) {
    social += 12;
    news += 12;
    volatility += 3;
    socialBoosts.push("Short-term event (+12)");
    newsBoosts.push("Immediate news cycle (+12)");
  }

  if (lower.includes("2026") || lower.includes("2027") || lower.includes("next year")) {
    technical += 8;
    volatility -= 2;
    technicalBoosts.push("Long-term forecast (+8)");
  }

  // Sentiment indicators
  if (lower.includes("will") || lower.includes("predict")) {
    technical += 5;
    technicalBoosts.push("Prediction market (+5)");
  }

  // Add deterministic variance based on event hash
  const hash = event.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  social += (hash % 8);
  news += ((hash * 3) % 8);
  technical += ((hash * 7) % 8);

  const scores = {
    social: Math.min(Math.max(social, 40), 95),
    news: Math.min(Math.max(news, 40), 95),
    technical: Math.min(Math.max(technical, 40), 95)
  };

  // Calculate variance (mathematical stability measure)
  const mean = (scores.social + scores.news + scores.technical) / 3;
  const variance = Math.sqrt(
    (Math.pow(scores.social - mean, 2) + 
     Math.pow(scores.news - mean, 2) + 
     Math.pow(scores.technical - mean, 2)) / 3
  );

  const highest = Math.max(scores.social, scores.news, scores.technical);
  const lowest = Math.min(scores.social, scores.news, scores.technical);
  const spread = highest - lowest;
  
  let strength: "Strong" | "Moderate" | "Weak";
  if (highest > 75) strength = "Strong";
  else if (highest > 60) strength = "Moderate";
  else strength = "Weak";

  let stability: "High" | "Medium" | "Low";
  if (variance < 8) stability = "High";
  else if (variance < 15) stability = "Medium";
  else stability = "Low";

  const explanation = generateExplanation(event, scores, strength, stability, variance, volatility);

  return {
    scores,
    boosts: {
      social: socialBoosts,
      news: newsBoosts,
      technical: technicalBoosts
    },
    uncertainty: { strength, stability },
    volatility: Math.min(volatility, 20),
    variance,
    explanation
  };
}

function calculateDirectionalBias(
  scores: { social: number; news: number; technical: number },
  weights: { social: number; news: number; technical: number },
  volatility: number
) {
  const total = weights.social + weights.news + weights.technical;
  if (total === 0) return { yes: 50, no: 50, conviction: "Uncertain" };

  const weighted = (scores.social * weights.social + scores.news * weights.news + scores.technical * weights.technical) / total;
  
  // Apply volatility adjustment (higher volatility = pull toward 50/50)
  const volatilityFactor = Math.min(volatility / 20, 0.3); // Max 30% pull
  const adjusted = weighted + (50 - weighted) * volatilityFactor;
  
  const yes = Math.round(adjusted);
  const no = 100 - yes;

  let conviction: string;
  if (yes >= 80 || yes <= 20) conviction = "High Conviction";
  else if (yes >= 65 || yes <= 35) conviction = "Moderate";
  else if (yes >= 55 || yes <= 45) conviction = "Uncertain";
  else conviction = "Weak Signal";

  return { yes, no, conviction };
}

function generateExplanation(
  event: string, 
  scores: { social: number; news: number; technical: number }, 
  strength: string, 
  stability: string,
  variance: number,
  volatility: number
): string {
  const lower = event.toLowerCase();
  const highest = Math.max(scores.social, scores.news, scores.technical);
  
  let primary = "";
  if (scores.social === highest) primary = `Social momentum (${scores.social}%) is the strongest signal`;
  else if (scores.news === highest) primary = `Institutional coverage (${scores.news}%) dominates the signal`;
  else primary = `Technical indicators (${scores.technical}%) show the clearest pattern`;

  let context = "";
  if (lower.includes("crypto") || lower.includes("bitcoin")) {
    context = "Crypto events combine technical analysis with community sentiment. ";
  } else if (lower.includes("election") || lower.includes("political")) {
    context = "Political markets are driven by polling momentum and social narratives. ";
  } else if (lower.includes("regulation") || lower.includes("policy")) {
    context = "Regulatory decisions require institutional news monitoring. ";
  } else if (lower.includes("crisis") || lower.includes("war")) {
    context = "Crisis events show elevated volatility and conflicting signals. ";
  }

  let stabilityNote = "";
  if (stability === "Low") {
    stabilityNote = ` Score variance is ${variance.toFixed(1)}, indicating conflicting signals across components.`;
  } else if (stability === "Medium") {
    stabilityNote = ` Moderate signal alignment with variance of ${variance.toFixed(1)}.`;
  }

  let recommendation = "";
  if (strength === "Strong" && stability === "High") {
    recommendation = "High-confidence scenario with aligned signals.";
  } else if (strength === "Strong" && stability === "Low") {
    recommendation = "Strong but volatile—rapid changes likely.";
  } else if (strength === "Moderate") {
    recommendation = "Moderate conviction—thorough research recommended before trading.";
  } else {
    recommendation = "Weak signals—wait for clearer indicators.";
  }

  return `${context}${primary}.${stabilityNote} Signal strength is ${strength.toLowerCase()}, stability is ${stability.toLowerCase()}, and volatility is ${volatility > 12 ? "elevated" : "moderate"}. ${recommendation}`;
}
