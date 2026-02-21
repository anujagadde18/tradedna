// lib/engine/analyzeEventWithData.ts

import type { ComponentKey } from "./analyzeEvent";
import { analyzeEvent } from "./analyzeEvent";
import type { NewsData } from "../data/newsData";
import type { SocialData } from "../data/socialData";

/**
 * Analyzes an event with optional real-time data integration
 */
export function analyzeEventWithData(
  event: string,
  weights: Record<ComponentKey, number>,
  newsData: NewsData | null,
  socialData: SocialData | null
) {
  // Start with base analysis
  const baseAnalysis = analyzeEvent(event, weights);

  // If no real data, return base analysis
  if ((!newsData || newsData.error) && (!socialData || socialData.error)) {
    return baseAnalysis;
  }

  // --- Integrate Real Data ---

  // News score boost based on article count and recency
  let newsScoreBoost = 0;
  if (newsData && !newsData.error && newsData.totalCount > 0) {
    const articleCount = newsData.totalCount;
    // More articles = stronger signal (cap at +15)
    newsScoreBoost = Math.min(15, Math.floor(articleCount / 10));
    
    // Adjust based on news score (0-100)
    const newsScoreAdjustment = (newsData.score - 50) / 10; // -5 to +5
    newsScoreBoost += Math.round(newsScoreAdjustment);
    
    newsScoreBoost = Math.max(-10, Math.min(15, newsScoreBoost)); // Cap between -10 and +15
  }

  // Social score boost based on volume and sentiment
  let socialScoreBoost = 0;
  if (socialData && !socialData.error && socialData.estimatedVolume > 0) {
    const volume = socialData.estimatedVolume;
    
    // Volume boost (logarithmic scale)
    if (volume > 10000) socialScoreBoost += 12;
    else if (volume > 5000) socialScoreBoost += 10;
    else if (volume > 1000) socialScoreBoost += 7;
    else if (volume > 500) socialScoreBoost += 5;
    else if (volume > 100) socialScoreBoost += 3;
    
    // Sentiment adjustment
    const { positive, negative } = socialData.sentiment;
    const sentimentDelta = positive - negative;
    const sentimentAdjustment = Math.round(sentimentDelta / 10); // -10 to +10
    socialScoreBoost += sentimentAdjustment;
    
    socialScoreBoost = Math.max(-10, Math.min(15, socialScoreBoost)); // Cap between -10 and +15
  }

  // Apply boosts to component scores
  const updatedComponents = {
    social: {
      ...baseAnalysis.components.social,
      final: Math.max(0, Math.min(100, baseAnalysis.components.social.final + socialScoreBoost)),
    },
    news: {
      ...baseAnalysis.components.news,
      final: Math.max(0, Math.min(100, baseAnalysis.components.news.final + newsScoreBoost)),
    },
    technical: baseAnalysis.components.technical,
  };

  // Recalculate overall score with updated components
  const updatedOverall = Math.round(
    (updatedComponents.social.final * weights.social +
      updatedComponents.news.final * weights.news +
      updatedComponents.technical.final * weights.technical) /
      100
  );

  // Recalculate directional confidence
  const yesBoost = (socialScoreBoost + newsScoreBoost) / 4;
  const updatedYes = Math.max(0, Math.min(100, baseAnalysis.directional.yes + yesBoost));
  const updatedNo = 100 - updatedYes;

  // Recalculate stats with updated component scores
  const values = [
    updatedComponents.social.final,
    updatedComponents.news.final,
    baseAnalysis.components.technical.final,
  ];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const divergence = Math.max(...values) - Math.min(...values);
  const stability = Math.min(100, Math.max(0, 100 - (stdDev / 25) * 100));

  // Add data sources in beginner-friendly language
  let dataNote = "";
  if (newsData && !newsData.error && newsData.totalCount > 0) {
    dataNote += ` We analyzed ${newsData.totalCount} recent news articles.`;
  }
  if (socialData && !socialData.error && socialData.estimatedVolume > 0) {
    dataNote += ` We tracked ${socialData.estimatedVolume.toLocaleString()} social media mentions.`;
  }
  if (dataNote) {
    dataNote = " " + dataNote.trim();
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
