"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { analyzeEventWithData } from "@/lib/engine/analyzeEventWithData";
import { type ComponentKey } from "@/lib/engine/analyzeEvent";
import { saveAnalysis } from "@/lib/profile/userProfile";
import { getCachedNewsData, type NewsData } from "@/lib/data/newsData";
import { getCachedSocialData, type SocialData } from "@/lib/data/socialData";
import { trackEventAnalysis } from "@/lib/storage/popularEvents";
import { track, saveAnalysis as saveAnalyticAnalysis } from "@/lib/analytics";
import { calculateReliability } from "@/components/ui/DecisionSummary";

function ScoresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const event = searchParams.get("event") || "Unknown Event";

  const [mode, setMode] = useState<"balanced" | "custom">("balanced");
  const [weights, setWeights] = useState<Record<ComponentKey, number>>({
    social: 40,
    news: 35,
    technical: 25,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [socialData, setSocialData] = useState<SocialData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

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
        weights: weights,
      });
    }
  }, [analysis, weights, event, isLoadingData]);

  function setWeight(key: ComponentKey, value: number) {
    const next = { ...weights, [key]: value };
    const sum = next.social + next.news + next.technical;
    if (sum === 100) {
      setWeights(next);
      return;
    }
    const scale = 100 / sum;
    const scaled = {
      social: Math.round(next.social * scale),
      news: Math.round(next.news * scale),
      technical: 100 - Math.round(next.social * scale) - Math.round(next.news * scale),
    };
    setWeights(scaled);
  }

  function setTrustLevel(level: "balanced" | "social" | "news" | "technical") {
    if (level === "balanced") {
      setWeights({ social: 40, news: 35, technical: 25 });
      setMode("balanced");
    } else if (level === "social") {
      setWeights({ social: 100, news: 0, technical: 0 });
      setMode("custom");
    } else if (level === "news") {
      setWeights({ social: 0, news: 100, technical: 0 });
      setMode("custom");
    } else {
      setWeights({ social: 0, news: 0, technical: 100 });
      setMode("custom");
    }
  }

  const direction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;
  const reliability = calculateReliability(analysis);

  const polymarketUrl = "https://polymarket.com/search?q=" + encodeURIComponent(event);

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <a href="/" style={{ color: "#9ca3af", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            ← Back
          </a>
          <button
            onClick={() => router.push("/profile")}
            style={{ padding: "6px 14px", borderRadius: 6, background: "rgba(147,51,234,0.15)", border: "1px solid rgba(147,51,234,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Profile
          </button>
        </div>

        {/* Event Title */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
            Analysis
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1.3, color: "#fafafa" }}>
            {analysis.event}
          </h1>
        </div>

        {/* Main Decision - Robinhood Style */}
        <div style={{ marginBottom: 32, padding: 32, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          
          {/* Big YES/NO */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 12 }}>Model Prediction</div>
            <div style={{ fontSize: 64, fontWeight: 900, color: direction === "YES" ? "#22c55e" : "#ef4444", marginBottom: 8 }}>
              {direction}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e4e4e7" }}>
              {confidence}% Confidence
            </div>
          </div>

          {/* Reliability Badge */}
          <div style={{ 
            textAlign: "center", 
            padding: "12px 20px", 
            borderRadius: 10, 
            background: reliability.score >= 70 ? "rgba(34,197,94,0.1)" : reliability.score >= 50 ? "rgba(251,146,60,0.1)" : "rgba(239,68,68,0.1)",
            border: reliability.score >= 70 ? "1px solid rgba(34,197,94,0.3)" : reliability.score >= 50 ? "1px solid rgba(251,146,60,0.3)" : "1px solid rgba(239,68,68,0.3)",
            marginBottom: 20
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: reliability.score >= 70 ? "#22c55e" : reliability.score >= 50 ? "#fb923c" : "#ef4444" }}>
              {reliability.level} Reliability • {reliability.score}%
            </div>
          </div>

          {/* Simple Explanation */}
          <div style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.6 }}>
              {analysis.explanation}
            </div>
          </div>
        </div>

        {/* Trust Settings - Simple */}
        <div style={{ marginBottom: 32, padding: 24, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7", marginBottom: 6 }}>
              What do you trust most?
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Choose which signals matter to you
            </div>
          </div>

          {/* Simple Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: mode === "custom" ? 20 : 0 }}>
            <TrustButton
              label="Balanced"
              active={mode === "balanced"}
              onClick={() => setTrustLevel("balanced")}
            />
            <TrustButton
              label="Social Only"
              active={mode === "custom" && weights.social === 100}
              onClick={() => setTrustLevel("social")}
            />
            <TrustButton
              label="News Only"
              active={mode === "custom" && weights.news === 100}
              onClick={() => setTrustLevel("news")}
            />
            <TrustButton
              label="Technical Only"
              active={mode === "custom" && weights.technical === 100}
              onClick={() => setTrustLevel("technical")}
            />
          </div>

          {/* Custom Sliders - Only if Custom Mode */}
          {mode === "custom" && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
                Or adjust manually:
              </div>
              <SimpleSlider label="Social" value={weights.social} onChange={(v) => setWeight("social", v)} />
              <SimpleSlider label="News" value={weights.news} onChange={(v) => setWeight("news", v)} />
              <SimpleSlider label="Technical" value={weights.technical} onChange={(v) => setWeight("technical", v)} />
            </div>
          )}
        </div>

        {/* Show Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ 
            width: "100%",
            padding: "14px 20px", 
            borderRadius: 10, 
            background: "rgba(255,255,255,0.03)", 
            border: "1px solid rgba(255,255,255,0.08)", 
            color: "#9ca3af", 
            fontSize: 14, 
            fontWeight: 600, 
            cursor: "pointer",
            marginBottom: 24,
            textAlign: "left",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>{showAdvanced ? "Hide" : "Show"} Advanced Details</span>
          <span>{showAdvanced ? "▲" : "▼"}</span>
        </button>

        {/* Advanced Section - Hidden by Default */}
        {showAdvanced && (
          <div style={{ marginBottom: 32 }}>
            
            {/* Component Scores */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                Signal Scores
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <ScoreRow label="Social" score={analysis.components.social.final} />
                <ScoreRow label="News" score={analysis.components.news.final} />
                <ScoreRow label="Technical" score={analysis.components.technical.final} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 13, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                Technical Metrics
              </div>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <MetricRow label="Stability" value={`${analysis.stats.stability}%`} />
                <MetricRow label="Volatility" value={`${analysis.stats.volatility}%`} />
                <MetricRow label="Conviction" value={analysis.directional.convictionTier} />
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <a
          href={polymarketUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("click_polymarket", { event })}
          style={{ 
            display: "block",
            padding: "16px 24px", 
            borderRadius: 10, 
            background: "#9333ea", 
            border: "none", 
            color: "#fff", 
            fontSize: 16, 
            fontWeight: 700, 
            textDecoration: "none",
            textAlign: "center",
            marginBottom: 16
          }}
        >
          Trade on Polymarket →
        </a>

        {/* Disclaimer */}
        <div style={{ fontSize: 12, color: "#71717a", textAlign: "center", lineHeight: 1.5 }}>
          Analysis saved to your profile • Not financial advice
        </div>

      </div>
    </main>
  );
}

function TrustButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "14px 16px",
        borderRadius: 8,
        background: active ? "rgba(147,51,234,0.15)" : "rgba(255,255,255,0.03)",
        border: active ? "2px solid #9333ea" : "1px solid rgba(255,255,255,0.08)",
        color: active ? "#a78bfa" : "#9ca3af",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      {label}
    </button>
  );
}

function SimpleSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "#e4e4e7", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#9333ea" }}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}
      />
    </div>
  );
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ fontSize: 14, color: "#e4e4e7", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color: "#9333ea" }}>{score}%</span>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ color: "#e4e4e7", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Analyzing...
      </div>
    }>
      <ScoresContent />
    </Suspense>
  );
}
