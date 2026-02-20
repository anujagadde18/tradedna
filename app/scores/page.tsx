"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { analyzeEventWithData } from "@/lib/engine/analyzeEventWithData";
import { type ComponentKey } from "@/lib/engine/analyzeEvent";
import { ComponentBreakdownCard, DivergenceBanner } from "@/components/analysis/Breakdown";
import { saveAnalysis } from "@/lib/profile/userProfile";
import { getCachedNewsData, type NewsData } from "@/lib/data/newsData";
import { getCachedSocialData, type SocialData } from "@/lib/data/socialData";
import { EvidenceCards } from "@/components/evidence/EvidenceCards";
import { PlainEnglishSummary, ConfidenceMeter, SimplifiedMetrics } from "@/components/ui/EnhancedUI";
import { DecisionSummaryCard, TradeRecommendation, calculateReliability } from "@/components/ui/DecisionSummary";
import { ShareAnalysisButton } from "@/components/share/ShareAnalysis";
import { trackEventAnalysis } from "@/lib/storage/popularEvents";
import { track, saveAnalysis as saveAnalyticAnalysis } from "@/lib/analytics";
import { HistoricalAccuracySummary } from "@/components/analysis/HistoricalSummary";

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

  const polymarketUrl = "https://polymarket.com/search?q=" + encodeURIComponent(event);

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <a href="/" style={{ color: "#9CA3AF", fontSize: 13, textDecoration: "none" }}>← Back to Home</a>
          <button
            onClick={() => router.push("/profile")}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#67e8f9", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            📊 View Profile
          </button>
        </div>

        {/* Event Title - Clean */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            Analysis Report
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{analysis.event}</h1>
          <div style={{ marginTop: 8, fontSize: 13, color: "#9ca3af" }}>
            Category: <span style={{ color: "#60a5fa" }}>{analysis.category.name}</span> • 
            {!isLoadingData && (analysis.dataIntegration.news.realDataUsed || analysis.dataIntegration.social.realDataUsed) && (
              <span style={{ color: "#10b981", marginLeft: 4 }}>Real-time data integrated</span>
            )}
          </div>
        </div>

        {/* Decision Summary */}
        <DecisionSummaryCard analysis={analysis} />

        {/* Historical Accuracy Summary - NEW */}
        <HistoricalAccuracySummary category={analysis.category.name} />

        {/* Plain English Summary */}
        <PlainEnglishSummary analysis={analysis} />

        {/* Simplified Metrics */}
        <SimplifiedMetrics analysis={analysis} />

        <DivergenceBanner warnings={analysis.warnings} />

        {/* Confidence Meter */}
        <ConfidenceMeter yesPercent={analysis.directional.yes} noPercent={analysis.directional.no} />

        {/* Model Note */}
        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: "rgba(80, 200, 255, 0.08)", border: "1px solid rgba(80, 200, 255, 0.2)" }}>
          <div style={{ fontSize: 12, color: "#67e8f9", lineHeight: 1.6 }}>
            <strong>Model Reasoning:</strong> {analysis.explanation}
          </div>
        </div>

        {/* Weight Controls - Cleaner */}
        <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Signal Weights</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              Customize component importance • Saved to your profile
            </div>
          </div>
          <SliderRow label="Social" sub="Community sentiment" value={weights.social} onChange={(v) => setWeight("social", v)} />
          <SliderRow label="News" sub="Headlines & narratives" value={weights.news} onChange={(v) => setWeight("news", v)} />
          <SliderRow label="Technical" sub="Price & indicators" value={weights.technical} onChange={(v) => setWeight("technical", v)} />
        </div>

        {/* Component Breakdown - Clean Grid */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, fontWeight: 600 }}>
            Component Breakdown
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <ComponentBreakdownCard component={analysis.components.social} category={analysis.category.name} />
            <ComponentBreakdownCard component={analysis.components.news} category={analysis.category.name} />
            <ComponentBreakdownCard component={analysis.components.technical} category={analysis.category.name} />
          </div>
        </div>

        {/* Evidence Sources */}
        <EvidenceCards event={event} newsData={newsData} socialData={socialData} isLoading={isLoadingData} />

        {/* Trade Recommendation */}
        <TradeRecommendation analysis={analysis} />

        {/* Share */}
        <ShareAnalysisButton analysis={analysis} />

        {/* Polymarket CTA - Cleaner */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <a
            href={polymarketUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => track("click_polymarket", { event })}
            style={{ display: "inline-block", padding: "14px 28px", borderRadius: 10, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none", fontSize: 14 }}
          >
            Trade on Polymarket →
          </a>
        </div>

      </div>
    </main>
  );
}

function SliderRow({ label, sub, value, onChange }: { label: string; sub: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
          <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 8 }}>{sub}</span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#60a5fa" }}>{value}</div>
      </div>
      <input
        type="range"
        min={5}
        max={80}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", cursor: "pointer" }}
      />
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#070B10", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔵</div>
          <div>Analyzing event...</div>
        </div>
      </div>
    }>
      <ScoresContent />
    </Suspense>
  );
}
