// app/scores/page-with-data.tsx
"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { analyzeEventWithData } from "@/lib/engine/analyzeEventWithData";
import { type ComponentKey } from "@/lib/engine/analyzeEvent";
import { ComponentBreakdownCard, DivergenceBanner, SummaryStats } from "@/components/analysis/Breakdown";
import { saveAnalysis } from "@/lib/profile/userProfile";
import { getCachedNewsData, type NewsData } from "@/lib/data/newsData";
import { getCachedSocialData, type SocialData } from "@/lib/data/socialData";
import { EvidenceCards } from "@/components/evidence/EvidenceCards";

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

  // Fetch real data on mount
  useEffect(() => {
    if (event === "Unknown Event") return;

    async function fetchData() {
      setIsLoadingData(true);
      
      try {
        // Fetch news and social data in parallel
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

  const analysis = useMemo(() => 
    analyzeEventWithData(event, weights, newsData, socialData),
    [event, weights, newsData, socialData]
  );

  // Save analysis to history
  useEffect(() => {
    if (analysis && event !== "Unknown Event" && !isLoadingData) {
      saveAnalysis(analysis, weights);
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

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/event" style={{ color: "#9CA3AF", fontSize: 13 }}>
            ← Back to Event
          </a>
          <button
            onClick={() => router.push("/profile")}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: "#67e8f9",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            📊 View Profile
          </button>
        </div>

        <h1 style={{ fontSize: 34, marginTop: 14 }}>Signal Analysis</h1>
        <div style={{ marginTop: 8, color: "#cbd5e1" }}>
          <b>Event:</b> {analysis.event}
        </div>

        {/* Real Data Status Banner */}
        {!isLoadingData && (analysis.dataIntegration.news.realDataUsed || analysis.dataIntegration.social.realDataUsed) && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>
              ✅ Real Data Integrated:{" "}
              {analysis.dataIntegration.news.realDataUsed && `${analysis.dataIntegration.news.articleCount} news articles`}
              {analysis.dataIntegration.news.realDataUsed && analysis.dataIntegration.social.realDataUsed && " • "}
              {analysis.dataIntegration.social.realDataUsed && `~${analysis.dataIntegration.social.estimatedVolume?.toLocaleString()} social mentions`}
            </div>
          </div>
        )}

        <SummaryStats a={analysis} />

        <DivergenceBanner warnings={analysis.warnings} />

        {/* Directional cards */}
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(0, 255, 170, 0.08)",
              border: "1px solid rgba(0, 255, 170, 0.18)",
            }}
          >
            <div style={{ fontSize: 12, color: "#a7f3d0" }}>YES Confidence</div>
            <div style={{ fontSize: 44, fontWeight: 900, marginTop: 6, color: "#6ee7b7" }}>
              {analysis.directional.yes}%
            </div>
            <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 13 }}>
              Strength: <b>{analysis.directional.strengthLabel}</b> • Conviction: <b>{analysis.directional.convictionTier}</b>
            </div>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(255, 80, 80, 0.08)",
              border: "1px solid rgba(255, 80, 80, 0.18)",
            }}
          >
            <div style={{ fontSize: 12, color: "#fecaca" }}>NO Confidence</div>
            <div style={{ fontSize: 44, fontWeight: 900, marginTop: 6, color: "#fb7185" }}>
              {analysis.directional.no}%
            </div>
            <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 13 }}>
              Stability: <b>{analysis.directional.stabilityLabel}</b> • Volatility: <b>{analysis.directional.volatilityLabel}</b>
            </div>
          </div>
        </div>

        {/* Engine explanation */}
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            background: "rgba(80, 200, 255, 0.10)",
            border: "1px solid rgba(80, 200, 255, 0.20)",
            color: "#cbd5e1",
            lineHeight: 1.55,
          }}
        >
          <b style={{ color: "#67e8f9" }}>Model note:</b> {analysis.explanation}
        </div>

        {/* Weight controls */}
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontWeight: 800 }}>Score Components</div>
          <div style={{ marginTop: 6, color: "#9CA3AF", fontSize: 13 }}>
            Adjust weights (auto-normalized to 100). Your preferences are saved to your profile.
          </div>

          <SliderRow
            label="Social weight"
            sub="X / community sentiment"
            value={weights.social}
            onChange={(v) => setWeight("social", v)}
          />
          <SliderRow
            label="News weight"
            sub="headlines / narratives"
            value={weights.news}
            onChange={(v) => setWeight("news", v)}
          />
          <SliderRow
            label="Technical weight"
            sub="price action / indicators"
            value={weights.technical}
            onChange={(v) => setWeight("technical", v)}
          />
        </div>

        {/* Contribution breakdown */}
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          <ComponentBreakdownCard component={analysis.components.social} />
          <ComponentBreakdownCard component={analysis.components.news} />
          <ComponentBreakdownCard component={analysis.components.technical} />
        </div>

        {/* Evidence Cards with Real Data */}
        <EvidenceCards
          event={event}
          newsData={newsData}
          socialData={socialData}
          isLoading={isLoadingData}
        />

        {/* Profile reminder */}
        <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#67e8f9", marginBottom: 6 }}>
            ✅ Analysis Saved to Profile
            {!isLoadingData && (analysis.dataIntegration.news.realDataUsed || analysis.dataIntegration.social.realDataUsed) && " • Real Data Integrated"}
          </div>
          <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>
            Your weight preferences and signal patterns are being tracked. 
            {!isLoadingData && (analysis.dataIntegration.news.realDataUsed || analysis.dataIntegration.social.realDataUsed) && (
              <> This analysis includes real-time data from news sources and social platforms.</>
            )}
          </div>
        </div>

        <a href={`https://polymarket.com/search?q=${encodeURIComponent(event)}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 20, padding: "14px 20px", borderRadius: 12, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
          Trade on Polymarket →
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
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#070B10", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ScoresContent />
    </Suspense>
  );
}
