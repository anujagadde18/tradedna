"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { analyzeEventWithData } from "@/lib/engine/analyzeEventWithData";
import { type ComponentKey } from "@/lib/engine/analyzeEvent";
import { saveAnalysis } from "@/lib/profile/userProfile";
import { type NewsData, getCachedNewsData } from "@/lib/data/newsData";
import { type SocialData, getCachedSocialData } from "@/lib/data/socialData";
import { trackEventAnalysis } from "@/lib/storage/popularEvents";
import { track, saveAnalysis as saveAnalyticAnalysis } from "@/lib/analytics";
import { calculateReliability } from "@/components/ui/DecisionSummary";
import { ActiveSourcesBreakdown } from "@/components/customSources/ActiveSourcesBreakdown";
import { loadSources } from "@/lib/customSources/sourceManager";
import { calculateIntelligence } from "@/lib/engine/intelligenceEngine";

function ScoresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const event = searchParams.get("event") || "Unknown Event";

  const [weights, setWeights] = useState<Record<ComponentKey, number>>({
    social: 40,
    news: 35,
    technical: 25,
  });

  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [socialData, setSocialData] = useState<SocialData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [customSources, setCustomSources] = useState<any[]>([]);
  const [marketOdds, setMarketOdds] = useState<number | null>(null);
  const [prevConfidence, setPrevConfidence] = useState<number | null>(null);
  const [showConfidenceChange, setShowConfidenceChange] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const timeline = useMemo(() => {
    const match = event.match(/by (\d{4})|in (\d{4})|(\d{4})/);
    return match ? `By ${match[1] || match[2] || match[3]}` : null;
  }, [event]);

  useEffect(() => {
    setCustomSources(loadSources());
  }, []);

  useEffect(() => {
    if (event && event !== "Unknown Event") {
      localStorage.setItem('lastAnalyzedEvent', event);
      const mockMarketOdds = Math.floor(Math.random() * 20) + 45;
      setMarketOdds(mockMarketOdds);
    }
  }, [event]);

  useEffect(() => {
    if (event === "Unknown Event") return;
    track("analyze_started", { event });

    async function fetchData() {
      setIsLoadingData(true);
      try {
        const [news, social] = await Promise.all([
          getCachedNewsData(event),
          getCachedSocialData(event),
        ]);
        setNewsData(news);
        setSocialData(social);
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Data fetch error:", error);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchData();
  }, [event]);

  const analysis = useMemo(
    () => analyzeEventWithData(event, weights, newsData, socialData),
    [event, weights, newsData, socialData]
  );

  const intelligence = useMemo(() => {
    const customSourcesCount = customSources.filter(s => !s.isDefault && s.enabled).length;
    const baseConfidence = analysis.directional.yes > 50 
      ? analysis.directional.yes 
      : analysis.directional.no;
    
    return calculateIntelligence(baseConfidence, weights, customSourcesCount, marketOdds, event);
  }, [analysis, weights, customSources, marketOdds, event]);

  useEffect(() => {
    if (prevConfidence !== null && prevConfidence !== intelligence.confidence) {
      setShowConfidenceChange(true);
      setLastUpdated(new Date());
      setTimeout(() => setShowConfidenceChange(false), 3000);
    }
    setPrevConfidence(intelligence.confidence);
  }, [intelligence.confidence, prevConfidence]);

  useEffect(() => {
    if (analysis && event !== "Unknown Event" && !isLoadingData) {
      saveAnalysis(analysis, weights);
      trackEventAnalysis(event, analysis.category.name, analysis.directional.yes);

      const reliability = calculateReliability(analysis);

      saveAnalyticAnalysis({
        event_text: event,
        category: analysis.category.name,
        yes_conf: analysis.directional.yes,
        no_conf: analysis.directional.no,
        reliability: reliability.score,
        conviction: analysis.directional.convictionTier,
        stability: analysis.stats.stability,
        weights,
      });
    }
  }, [analysis, weights, event, isLoadingData]);

  function setWeight(key: ComponentKey, value: number) {
    const next = { ...weights, [key]: value };
    const sum = next.social + next.news + next.technical;

    if (sum === 0) return;

    const scale = 100 / sum;
    const scaled = {
      social: Math.round(next.social * scale),
      news: Math.round(next.news * scale),
      technical: 100 - Math.round(next.social * scale) - Math.round(next.news * scale),
    };
    setWeights(scaled);
  }

  function setPreset(preset: "balanced" | "community" | "headlines" | "charts") {
    if (preset === "balanced") {
      setWeights({ social: 40, news: 35, technical: 25 });
    } else if (preset === "community") {
      setWeights({ social: 100, news: 0, technical: 0 });
    } else if (preset === "headlines") {
      setWeights({ social: 0, news: 100, technical: 0 });
    } else {
      setWeights({ social: 0, news: 0, technical: 100 });
    }
  }

  const timeAgo = useMemo(() => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    return "Recently";
  }, [lastUpdated]);

  const polymarketUrl = "https://polymarket.com/search?q=" + encodeURIComponent(event);

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
        
        {/* Live Confidence Change */}
        {showConfidenceChange && prevConfidence !== null && (
          <div style={{ position: "fixed", top: 80, right: 24, padding: "12px 20px", borderRadius: 10, background: "rgba(147,51,234,0.95)", border: "1px solid rgba(147,51,234,0.4)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 1000 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              Confidence updated: {prevConfidence}% → {intelligence.confidence}%
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <a href="/event" style={{ color: "#9ca3af", fontSize: 14, textDecoration: "none" }}>Back</a>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => {
                const shareText = `${event}\n\nPrediction: ${intelligence.direction} (${intelligence.confidence}%)\n${intelligence.probabilityLabel}\n\nPlayPicks AI\ntradedna.vercel.app`;
                if (navigator.share) {
                  navigator.share({ text: shareText }).catch(() => {
                    navigator.clipboard.writeText(shareText);
                    alert('Copied!');
                  });
                } else {
                  navigator.clipboard.writeText(shareText);
                  alert('Copied!');
                }
                track("share_analysis", { event });
              }}
              style={{ padding: "6px 14px", borderRadius: 6, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Share
            </button>
            <button onClick={() => router.push("/event")} style={{ padding: "6px 14px", borderRadius: 6, background: "rgba(147,51,234,0.12)", border: "1px solid rgba(147,51,234,0.25)", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              New Analysis
            </button>
            <button onClick={() => router.push("/profile")} style={{ padding: "6px 14px", borderRadius: 6, background: "rgba(147,51,234,0.12)", border: "1px solid rgba(147,51,234,0.25)", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Profile
            </button>
          </div>
        </div>

        {/* Platform Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 700 }}>
              AI Forecast Engine
            </div>
            {timeline && (
              <div style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#60a5fa" }}>{timeline}</div>
              </div>
            )}
            <div style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#22c55e" }}>● {timeAgo}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, lineHeight: 1.6, maxWidth: 800 }}>
            Multi-source prediction engine analyzing news sentiment, market probability signals, and community trends to forecast future event outcomes
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, lineHeight: 1.3, color: "#fafafa", wordBreak: "break-word" }}>
            {analysis.event}
          </h1>
        </div>

        {/* TWO-COLUMN LAYOUT */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          
          {/* LEFT COLUMN - DECISION PANEL */}
          <div>
            {/* Main Prediction */}
            <div style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                AI Prediction
              </div>

              <div style={{ fontSize: 56, fontWeight: 900, color: intelligence.direction === "YES" ? "#22c55e" : "#ef4444", marginBottom: 10, lineHeight: 1 }}>
                {intelligence.direction}
              </div>

              <div style={{ fontSize: 20, fontWeight: 700, color: "#e4e4e7", marginBottom: 8 }}>
                {intelligence.confidence}% Confidence
              </div>

              <div style={{ fontSize: 15, fontWeight: 600, color: "#9ca3af", marginBottom: 16 }}>
                {intelligence.probabilityLabel}
              </div>

              {/* Confidence Bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ height: 8, borderRadius: 10, background: "rgba(255,255,255,0.08)", overflow: "hidden", position: "relative" }}>
                  <div style={{ height: "100%", width: `${intelligence.confidence}%`, background: intelligence.confidence >= 65 ? "linear-gradient(90deg, #22c55e, #10b981)" : intelligence.confidence >= 55 ? "linear-gradient(90deg, #fb923c, #f59e0b)" : "linear-gradient(90deg, #ef4444, #dc2626)", borderRadius: 10, transition: "width 0.5s ease" }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "#71717a" }}>NO</span>
                  <span style={{ fontSize: 10, color: "#71717a" }}>50%</span>
                  <span style={{ fontSize: 10, color: "#71717a" }}>YES</span>
                </div>
              </div>

              {/* Prediction Strength */}
              <div style={{ padding: "12px 16px", borderRadius: 10, background: intelligence.strengthScore >= 70 ? "rgba(34,197,94,0.12)" : intelligence.strengthScore >= 60 ? "rgba(251,146,60,0.12)" : "rgba(239,68,68,0.12)", border: intelligence.strengthScore >= 70 ? "1px solid rgba(34,197,94,0.25)" : intelligence.strengthScore >= 60 ? "1px solid rgba(251,146,60,0.25)" : "1px solid rgba(239,68,68,0.25)" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, fontWeight: 600 }}>PREDICTION STRENGTH</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: intelligence.strengthScore >= 70 ? "#22c55e" : intelligence.strengthScore >= 60 ? "#fb923c" : "#ef4444" }}>
                  {intelligence.predictionStrength}
                </div>
              </div>
            </div>

            {/* Market vs AI */}
            {intelligence.marketEdge !== null && marketOdds !== null && (
              <div style={{ padding: 20, borderRadius: 14, background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.2)", marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  AI vs Market Comparison
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Market Probability</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa" }}>{marketOdds}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>AI Prediction</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa" }}>{intelligence.confidence}%</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.6 }}>
                  <strong style={{ color: "#a78bfa" }}>{intelligence.edgeContext}</strong>
                  {intelligence.marketEdge !== 0 && ` (${intelligence.marketEdge > 0 ? '+' : ''}${intelligence.marketEdge}%)`}
                </div>
              </div>
            )}

            {/* Risk Level */}
            <div style={{ padding: 16, borderRadius: 12, background: intelligence.riskLevel === "Low Risk" ? "rgba(34,197,94,0.08)" : intelligence.riskLevel === "Medium Risk" ? "rgba(251,146,60,0.08)" : "rgba(239,68,68,0.08)", border: intelligence.riskLevel === "Low Risk" ? "1px solid rgba(34,197,94,0.2)" : intelligence.riskLevel === "Medium Risk" ? "1px solid rgba(251,146,60,0.2)" : "1px solid rgba(239,68,68,0.2)" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6, fontWeight: 600 }}>RISK ASSESSMENT</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: intelligence.riskLevel === "Low Risk" ? "#22c55e" : intelligence.riskLevel === "Medium Risk" ? "#fb923c" : "#ef4444" }}>
                {intelligence.riskLevel}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - ANALYSIS PANEL */}
          <div>
            {/* Sources Used */}
            <div style={{ marginBottom: 20 }}>
              <ActiveSourcesBreakdown
                sources={customSources}
                categoryWeights={{
                  news: weights.news,
                  social: weights.social,
                  technical: weights.technical
                }}
              />
            </div>

            {/* Signal Contribution */}
            <div style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Signal Contribution
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {intelligence.modelComponents.map((model, idx) => (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "#d4d4d8", fontWeight: 600 }}>{model.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: idx === 0 ? "#f59e0b" : idx === 1 ? "#10b981" : "#3b82f6" }}>+{model.contribution}%</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${model.contribution}%`, background: idx === 0 ? "#f59e0b" : idx === 1 ? "#10b981" : "#3b82f6", borderRadius: 4 }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "16px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>Total Confidence</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#a78bfa" }}>{intelligence.confidence}%</span>
              </div>
            </div>

            {/* Confidence Drivers */}
            <div style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Confidence Drivers
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, marginBottom: 8 }}>POSITIVE SIGNALS</div>
                {intelligence.confidenceDrivers.positive.map((driver, idx) => (
                  <div key={idx} style={{ fontSize: 13, color: "#d4d4d8", marginBottom: 6, paddingLeft: 12, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#22c55e" }}>+</span>
                    {driver}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginBottom: 8 }}>NEGATIVE SIGNALS</div>
                {intelligence.confidenceDrivers.negative.map((driver, idx) => (
                  <div key={idx} style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6, paddingLeft: 12, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "#ef4444" }}>-</span>
                    {driver}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Why This Prediction?
              </div>
              <div style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.7 }}>
                {intelligence.explanation}
              </div>
            </div>
          </div>
        </div>

        {/* Model Transparency */}
        <div style={{ padding: 24, borderRadius: 16, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#60a5fa", marginBottom: 16 }}>
            🔬 Model Transparency
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Prediction Model Components
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {intelligence.modelComponents.map((model, idx) => (
              <div key={idx}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7", marginBottom: 4 }}>{model.name}</div>
                <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>{model.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* System Capabilities */}
        <div style={{ padding: 24, borderRadius: 16, background: "rgba(147,51,234,0.05)", border: "1px solid rgba(147,51,234,0.15)", marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#a78bfa", marginBottom: 16 }}>
            ⚙️ Platform Capabilities
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
            <div style={{ fontSize: 13, color: "#d4d4d8" }}>✓ Multi-source data aggregation</div>
            <div style={{ fontSize: 13, color: "#d4d4d8" }}>✓ Real-time sentiment analysis</div>
            <div style={{ fontSize: 13, color: "#d4d4d8" }}>✓ Market probability comparison</div>
            <div style={{ fontSize: 13, color: "#d4d4d8" }}>✓ Custom signal weighting</div>
            <div style={{ fontSize: 13, color: "#d4d4d8" }}>✓ Explainable AI predictions</div>
            <div style={{ fontSize: 13, color: "#d4d4d8" }}>✓ Transparent model architecture</div>
          </div>
        </div>

        {/* Research Context */}
        <div style={{ padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Research Context
          </div>
          <div style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.7 }}>
            This system explores how combining news sentiment analysis, market probability signals, and community discussion trends can improve probabilistic forecasting of real-world events. The platform demonstrates multi-model ensemble methods with transparent signal attribution and user-configurable weighting for scenario analysis.
          </div>
        </div>

        {/* Signal Controls */}
        <div style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 32 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7", marginBottom: 6 }}>
              Customize Prediction Signals
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
              Adjust signal weights to explore how different information sources influence prediction outcomes
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, fontWeight: 600 }}>QUICK PRESETS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <PresetButton label="Balanced" desc="All signals equal" active={weights.social === 40 && weights.news === 35 && weights.technical === 25} onClick={() => setPreset("balanced")} />
              <PresetButton label="Community First" desc="Social signals" active={weights.social === 100} onClick={() => setPreset("community")} />
              <PresetButton label="News First" desc="Headlines focus" active={weights.news === 100} onClick={() => setPreset("headlines")} />
              <PresetButton label="Market First" desc="Data driven" active={weights.technical === 100} onClick={() => setPreset("charts")} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 14, fontWeight: 600 }}>SIGNAL WEIGHTS</div>
            <TrustSlider label="Community Signals" value={weights.social} onChange={(v) => setWeight("social", v)} color="#3b82f6" />
            <TrustSlider label="News Sentiment" value={weights.news} onChange={(v) => setWeight("news", v)} color="#f59e0b" />
            <TrustSlider label="Market Indicators" value={weights.technical} onChange={(v) => setWeight("technical", v)} color="#10b981" />
          </div>
        </div>

        {/* Action Button */}
        <a href={polymarketUrl} target="_blank" rel="noreferrer" onClick={() => track("click_polymarket", { event })} style={{ display: "block", padding: "18px 24px", borderRadius: 12, background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)", border: "none", color: "#fff", fontSize: 16, fontWeight: 800, textDecoration: "none", textAlign: "center", marginBottom: 16, boxShadow: "0 4px 16px rgba(147,51,234,0.4)" }}>
          View on Polymarket →
        </a>

        {/* Footer */}
        <div style={{ fontSize: 11, color: "#71717a", textAlign: "center", lineHeight: 1.8 }}>
          Analysis saved to profile • Not financial advice • Research purposes only
        </div>
      </div>
    </main>
  );
}

function PresetButton({ label, desc, active, onClick }: { label: string; desc: string; active: boolean; onClick: () => void; }) {
  return (
    <button onClick={onClick} style={{ padding: "12px 14px", borderRadius: 10, background: active ? "rgba(147,51,234,0.15)" : "rgba(255,255,255,0.02)", border: active ? "2px solid #9333ea" : "1px solid rgba(255,255,255,0.06)", textAlign: "left", cursor: "pointer", transition: "all 0.2s" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#a78bfa" : "#e4e4e7", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11, color: active ? "#9ca3af" : "#71717a" }}>{desc}</div>
    </button>
  );
}

function TrustSlider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string; }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: "#e4e4e7", fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 17, fontWeight: 900, color }}>{value}%</span>
      </div>
      <input type="range" min={0} max={100} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", height: 8, borderRadius: 4, background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.08) ${value}%, rgba(255,255,255,0.08) 100%)`, cursor: "pointer", WebkitAppearance: "none", appearance: "none" }} />
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><div>Analyzing...</div></div>}>
      <ScoresContent />
    </Suspense>
  );
}
