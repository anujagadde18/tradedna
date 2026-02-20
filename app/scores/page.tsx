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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/event" style={{ color: "#9CA3AF", fontSize: 13 }}>Back to Event</a>
          <button
            onClick={() => router.push("/profile")}
            style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#67e8f9", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            View Profile
          </button>
        </div>

        <h1 style={{ fontSize: 34, marginTop: 14 }}>Signal Analysis</h1>
        <div style={{ marginTop: 8, color: "#cbd5e1" }}>
          <b>Event:</b> {analysis.event}
        </div>

        <DecisionSummaryCard analysis={analysis} />
        <PlainEnglishSummary analysis={analysis} />
        <SimplifiedMetrics analysis={analysis} />
        <DivergenceBanner warnings={analysis.warnings} />

        {!isLoadingData && (analysis.dataIntegration.news.realDataUsed || analysis.dataIntegration.social.realDataUsed) && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>
              {"Real Data Integrated: "}
              {analysis.dataIntegration.news.realDataUsed && (analysis.dataIntegration.news.articleCount + " news articles")}
              {analysis.dataIntegration.news.realDataUsed && analysis.dataIntegration.social.realDataUsed && " • "}
              {analysis.dataIntegration.social.realDataUsed && ("~" + analysis.dataIntegration.social.estimatedVolume?.toLocaleString() + " social mentions")}
            </div>
          </div>
        )}

        <ConfidenceMeter yesPercent={analysis.directional.yes} noPercent={analysis.directional.no} />

        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: "rgba(80, 200, 255, 0.10)", border: "1px solid rgba(80, 200, 255, 0.20)", color: "#cbd5e1", lineHeight: 1.55 }}>
          <b style={{ color: "#67e8f9" }}>Model note:</b> {analysis.explanation}
        </div>

        <div style={{ marginTop: 18, padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight: 800 }}>Score Components</div>
          <div style={{ marginTop: 6, color: "#9CA3AF", fontSize: 13 }}>
            Adjust weights (auto-normalized to 100). Your preferences are saved to your profile.
          </div>
          <SliderRow label="Social weight" sub="X / community sentiment" value={weights.social} onChange={(v) => setWeight("social", v)} />
          <SliderRow label="News weight" sub="headlines / narratives" value={weights.news} onChange={(v) => setWeight("news", v)} />
          <SliderRow label="Technical weight" sub="price action / indicators" value={weights.technical} onChange={(v) => setWeight("technical", v)} />
        </div>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <ComponentBreakdownCard component={analysis.components.social} category={analysis.category.name} />
          <ComponentBreakdownCard component={analysis.components.news} category={analysis.category.name} />
          <ComponentBreakdownCard component={analysis.components.technical} category={analysis.category.name} />
        </div>

        <EvidenceCards event={event} newsData={newsData} socialData={socialData} isLoading={isLoadingData} />

        <TradeRecommendation analysis={analysis} />

        <ShareAnalysisButton analysis={analysis} />

        <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#67e8f9", marginBottom: 6 }}>
            {"Analysis Saved to Profile"}
            {!isLoadingData && (analysis.dataIntegration.news.realDataUsed || analysis.dataIntegration.social.realDataUsed) && " • Real Data Integrated"}
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>
            {"Your weight preferences and signal patterns are being tracked."}
          </div>
        </div>

        <a
          href={polymarketUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("click_polymarket", { event })}
          style={{ display: "inline-block", marginTop: 20, padding: "14px 20px", borderRadius: 12, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none", fontSize: 15 }}
        >
          Trade on Polymarket
        </a>

      </div>
    </main>
  );
}

function SliderRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontWeight: 700 }}>{label}</div>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>{sub}</div>
        </div>
        <div style={{ fontWeight: 900, color: "#67e8f9" }}>{value}</div>
      </div>
      <input
        type="range"
        min={5}
        max={80}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: 8 }}
      />
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#070B10", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading...
      </div>
    }>
      <ScoresContent />
    </Suspense>
  );
}
