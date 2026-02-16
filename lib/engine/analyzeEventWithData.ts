// lib/engine/analyzeEventWithData.ts
import { analyzeEvent as analyzeEventBase, type AnalysisOutput, type ComponentKey } from "./analyzeEvent";
import type { NewsData } from "@/lib/data/newsData";
import type { SocialData } from "@/lib/data/socialData";

export type EnhancedAnalysisOutput = AnalysisOutput & {
  dataIntegration: {
    news: {
      realDataUsed: boolean;
      articleCount?: number;
      scoreBoost?: number;
    };
    social: {
      realDataUsed: boolean;
      estimatedVolume?: number;
      scoreBoost?: number;
    };
  };
};

export function analyzeEventWithData(
  event: string,
  weights: Record<ComponentKey, number>,
  newsData?: NewsData | null,
  socialData?: SocialData | null
): EnhancedAnalysisOutput {
  // Start with base analysis
  const baseAnalysis = analyzeEventBase(event, weights);

  // Apply real data boosts if available
  let newsScoreBoost = 0;
  let socialScoreBoost = 0;

  if (newsData && !newsData.error && newsData.totalCount > 0) {
    // News score boost based on article count
    const articleScore = newsData.score;
    const baseNewsScore = baseAnalysis.components.news.final;
    
    // Blend real data with base analysis (70% real, 30% base)
    const blendedScore = Math.round(articleScore * 0.7 + baseNewsScore * 0.3);
    newsScoreBoost = blendedScore - baseNewsScore;
    
    // Update news component
    baseAnalysis.components.news = {
      ...baseAnalysis.components.news,
      contributions: [
        ...baseAnalysis.components.news.contributions,
        {
          reason: `Real news data: ${newsData.totalCount} articles found`,
          impact: newsScoreBoost,
          tag: "real_data:news",
        },
      ],
      final: Math.min(95, Math.max(40, baseNewsScore + newsScoreBoost)),
    };
  }

  if (socialData && !socialData.error && socialData.estimatedVolume > 0) {
    // Social score boost based on volume
    const volumeScore = socialData.score;
    const baseSocialScore = baseAnalysis.components.social.final;
    
    // Blend real data with base analysis (70% real, 30% base)
    const blendedScore = Math.round(volumeScore * 0.7 + baseSocialScore * 0.3);
    socialScoreBoost = blendedScore - baseSocialScore;
    
    // Update social component
    baseAnalysis.components.social = {
      ...baseAnalysis.components.social,
      contributions: [
        ...baseAnalysis.components.social.contributions,
        {
          reason: `Real social data: ~${socialData.estimatedVolume.toLocaleString()} mentions`,
          impact: socialScoreBoost,
          tag: "real_data:social",
        },
      ],
      final: Math.min(95, Math.max(40, baseSocialScore + socialScoreBoost)),
    };
  }

  // Recalculate overall with updated scores
  const updatedOverall = Math.round(
    (baseAnalysis.components.social.final * weights.social +
      baseAnalysis.components.news.final * weights.news +
      baseAnalysis.components.technical.final * weights.technical) /
      100
  );

  // Recalculate stats with updated scores
  const values = [
    baseAnalysis.components.social.final,
    baseAnalysis.components.news.final,
    baseAnalysis.components.technical.final,
  ];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const divergence = Math.max(...values) - Math.min(...values);
  const stability = Math.min(100, Math.max(0, 100 - (stdDev / 25) * 100));

  // Update explanation to mention real data
  let dataNote = "";
  if (newsData && !newsData.error && newsData.totalCount > 0) {
    dataNote += ` Integrated ${newsData.totalCount} real news articles.`;
  }
  if (socialData && !socialData.error && socialData.estimatedVolume > 0) {
    dataNote += ` Social volume: ~${socialData.estimatedVolume.toLocaleString()} mentions.`;
  }

  return {
    ...baseAnalysis,
    overall: updatedOverall,
    stats: {
      ...baseAnalysis.stats,
      mean: Math.round(mean),
      stdDev: Number(stdDev.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      stability: Math.round(stability),
      divergence: Math.round(divergence),
    },
    explanation: baseAnalysis.explanation + dataNote,
    dataIntegration: {
      news: {
        realDataUsed: !!(newsData && !newsData.error && newsData.totalCount > 0),
        articleCount: newsData?.totalCount,
        scoreBoost: newsScoreBoost,
      },
      social: {
        realDataUsed: !!(socialData && !socialData.error && socialData.estimatedVolume > 0),
        estimatedVolume: socialData?.estimatedVolume,
        scoreBoost: socialScoreBoost,
      },
    },
  };
}
