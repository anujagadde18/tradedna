// lib/profile/userProfile.ts

import type { AnalysisOutput, ComponentKey } from "@/lib/engine/analyzeEvent";

export type AnalysisRecord = {
  id: string;
  timestamp: number;
  event: string;
  category: string;
  weights: Record<ComponentKey, number>;
  scores: Record<ComponentKey, number>;
  overall: number;
  directional: { yes: number; no: number };
  stability: number;
  volatility: number;
  conviction: string;
};

export type UserProfile = {
  totalAnalyses: number;
  averageWeights: Record<ComponentKey, number>;
  categoryDistribution: Record<string, number>;
  stabilityPreference: {
    high: number; // count
    medium: number;
    low: number;
  };
  convictionDistribution: {
    high: number;
    moderate: number;
    uncertain: number;
    weak: number;
  };
  researchStyle: "Social-Heavy" | "News-Heavy" | "Technical-Heavy" | "Balanced" | "Experimental";
  traderType: "Contrarian" | "Momentum" | "Cautious" | "Aggressive" | "Analytical";
};

const STORAGE_KEY = "tradedna_analysis_history";
const MAX_HISTORY = 100; // Keep last 100 analyses

// Baseline averages (what a "typical" user uses)
const BASELINE_WEIGHTS: Record<ComponentKey, number> = {
  social: 40,
  news: 35,
  technical: 25,
};

export function saveAnalysis(analysis: AnalysisOutput, weights: Record<ComponentKey, number>): void {
  try {
    const history = getAnalysisHistory();
    
    const record: AnalysisRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      event: analysis.event,
      category: analysis.category.name,
      weights,
      scores: {
        social: analysis.components.social.final,
        news: analysis.components.news.final,
        technical: analysis.components.technical.final,
      },
      overall: analysis.overall,
      directional: {
        yes: analysis.directional.yes,
        no: analysis.directional.no,
      },
      stability: analysis.stats.stability,
      volatility: analysis.stats.volatility,
      conviction: analysis.directional.convictionTier,
    };

    history.unshift(record); // Add to beginning
    
    // Keep only last MAX_HISTORY records
    if (history.length > MAX_HISTORY) {
      history.splice(MAX_HISTORY);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    console.error("Failed to save analysis:", err);
  }
}

export function getAnalysisHistory(): AnalysisRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (err) {
    console.error("Failed to load history:", err);
    return [];
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear history:", err);
  }
}

export function computeUserProfile(): UserProfile {
  const history = getAnalysisHistory();
  
  if (history.length === 0) {
    return {
      totalAnalyses: 0,
      averageWeights: BASELINE_WEIGHTS,
      categoryDistribution: {},
      stabilityPreference: { high: 0, medium: 0, low: 0 },
      convictionDistribution: { high: 0, moderate: 0, uncertain: 0, weak: 0 },
      researchStyle: "Balanced",
      traderType: "Analytical",
    };
  }

  // Calculate average weights
  const avgWeights = {
    social: Math.round(history.reduce((sum, r) => sum + r.weights.social, 0) / history.length),
    news: Math.round(history.reduce((sum, r) => sum + r.weights.news, 0) / history.length),
    technical: Math.round(history.reduce((sum, r) => sum + r.weights.technical, 0) / history.length),
  };

  // Category distribution
  const categoryDist: Record<string, number> = {};
  history.forEach((r) => {
    categoryDist[r.category] = (categoryDist[r.category] || 0) + 1;
  });

  // Stability preference
  const stabilityPref = { high: 0, medium: 0, low: 0 };
  history.forEach((r) => {
    if (r.stability >= 75) stabilityPref.high++;
    else if (r.stability >= 50) stabilityPref.medium++;
    else stabilityPref.low++;
  });

  // Conviction distribution
  const convictionDist = { high: 0, moderate: 0, uncertain: 0, weak: 0 };
  history.forEach((r) => {
    const conv = r.conviction.toLowerCase();
    if (conv === "high") convictionDist.high++;
    else if (conv === "moderate") convictionDist.moderate++;
    else if (conv === "uncertain") convictionDist.uncertain++;
    else convictionDist.weak++;
  });

  // Classify research style
  const researchStyle = classifyResearchStyle(avgWeights);
  
  // Classify trader type
  const traderType = classifyTraderType(history, avgWeights, stabilityPref);

  return {
    totalAnalyses: history.length,
    averageWeights: avgWeights,
    categoryDistribution: categoryDist,
    stabilityPreference: stabilityPref,
    convictionDistribution: convictionDist,
    researchStyle,
    traderType,
  };
}

function classifyResearchStyle(weights: Record<ComponentKey, number>): UserProfile["researchStyle"] {
  const max = Math.max(weights.social, weights.news, weights.technical);
  const diff = max - Math.min(weights.social, weights.news, weights.technical);
  
  if (diff < 10) return "Balanced";
  if (max === weights.social) return "Social-Heavy";
  if (max === weights.news) return "News-Heavy";
  if (max === weights.technical) return "Technical-Heavy";
  return "Experimental";
}

function classifyTraderType(
  history: AnalysisRecord[],
  avgWeights: Record<ComponentKey, number>,
  stabilityPref: { high: number; medium: number; low: number }
): UserProfile["traderType"] {
  const total = history.length;
  
  // Contrarian: Prefers low-volatility, high-stability signals
  const highStabilityPct = stabilityPref.high / total;
  if (highStabilityPct > 0.6 && avgWeights.technical > 40) {
    return "Contrarian";
  }

  // Momentum: Technical-heavy, lower stability tolerance
  if (avgWeights.technical > 45 && highStabilityPct < 0.4) {
    return "Momentum";
  }

  // Cautious: High stability preference, balanced weights
  if (highStabilityPct > 0.65) {
    return "Cautious";
  }

  // Aggressive: Willing to trade on uncertain signals
  const lowStabilityPct = stabilityPref.low / total;
  if (lowStabilityPct > 0.35) {
    return "Aggressive";
  }

  return "Analytical";
}

export function generateInsights(profile: UserProfile): string[] {
  const insights: string[] = [];
  
  if (profile.totalAnalyses === 0) {
    return ["Analyze your first event to start building your profile"];
  }

  // Weight comparisons
  const socialDiff = profile.averageWeights.social - BASELINE_WEIGHTS.social;
  const newsDiff = profile.averageWeights.news - BASELINE_WEIGHTS.news;
  const techDiff = profile.averageWeights.technical - BASELINE_WEIGHTS.technical;

  if (Math.abs(socialDiff) >= 10) {
    insights.push(
      `You weight Social ${socialDiff > 0 ? Math.abs(socialDiff) : Math.abs(socialDiff)} points ${
        socialDiff > 0 ? "higher" : "lower"
      } than baseline (${BASELINE_WEIGHTS.social}%)`
    );
  }

  if (Math.abs(newsDiff) >= 10) {
    insights.push(
      `You weight News ${Math.abs(newsDiff)} points ${
        newsDiff > 0 ? "higher" : "lower"
      } than baseline (${BASELINE_WEIGHTS.news}%)`
    );
  }

  if (Math.abs(techDiff) >= 10) {
    insights.push(
      `You weight Technical ${Math.abs(techDiff)} points ${
        techDiff > 0 ? "higher" : "lower"
      } than baseline (${BASELINE_WEIGHTS.technical}%)`
    );
  }

  // Stability preference
  const total = profile.stabilityPreference.high + profile.stabilityPreference.medium + profile.stabilityPreference.low;
  if (total > 0) {
    const highPct = Math.round((profile.stabilityPreference.high / total) * 100);
    if (highPct >= 70) {
      insights.push(`You strongly prefer high-stability signals (${highPct}% of analyses)`);
    } else if (highPct <= 30) {
      insights.push(`You're comfortable with volatile signals (only ${highPct}% high-stability)`);
    }
  }

  // Category preference
  const topCategory = Object.entries(profile.categoryDistribution)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (topCategory && topCategory[1] >= 3) {
    const pct = Math.round((topCategory[1] / profile.totalAnalyses) * 100);
    if (pct >= 40) {
      insights.push(`You focus heavily on ${topCategory[0]} events (${pct}% of analyses)`);
    }
  }

  // Research style
  insights.push(`Your research style: ${profile.researchStyle}`);
  insights.push(`Trader profile: ${profile.traderType}`);

  return insights;
}

export function getRecentAnalyses(count: number = 5): AnalysisRecord[] {
  const history = getAnalysisHistory();
  return history.slice(0, count);
}
