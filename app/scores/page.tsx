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

function ScoresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const event = searchParams.get("event") || "Unknown Event";

  const [weights, setWeights] = useState<Record<ComponentKey, number>>({
    social: 40,
    news: 35,
    technical: 25,
  });

  const [customSources, setCustomSources] = useState<any[]>([]);

  useEffect(() => {
    setCustomSources(loadSources());
  }, []);

  const analysis = useMemo(
    () => analyzeEventWithData(event, weights, null, null),
    [event, weights]
  );

  const direction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", padding: 20 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1>{analysis.event}</h1>
        
        <ActiveSourcesBreakdown
          sources={customSources}
          categoryWeights={{
            news: weights.news,
            social: weights.social,
            technical: weights.technical
          }}
        />

        <div style={{ fontSize: 56, fontWeight: 900, color: direction === "YES" ? "#22c55e" : "#ef4444" }}>
          {direction}
        </div>
        
        <div style={{ fontSize: 20 }}>{confidence}% Confidence</div>
      </div>
    </main>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScoresContent />
    </Suspense>
  );
}
