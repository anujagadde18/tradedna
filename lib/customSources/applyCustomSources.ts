// lib/customSources/applyCustomSources.ts

import type { ComponentKey, AnalysisOutput } from "@/lib/engine/analyzeEvent";

export type CustomSource = {
  id: string;
  type: "news" | "social" | "technical";
  name: string;
  url: string;
  weight: number;
  enabled: boolean;
};

/**
 * Load custom sources from localStorage
 */
export function loadCustomSources(): CustomSource[] {
  if (typeof window === "undefined") return [];
  
  try {
    const saved = localStorage.getItem("customSources");
    if (!saved) return [];
    return JSON.parse(saved);
  } catch (error) {
    console.error("Error loading custom sources:", error);
    return [];
  }
}

/**
 * Calculate adjusted weights based on custom sources
 * 
 * Example:
 * Default: news 35%, social 40%, technical 25%
 * User adds: Bloomberg RSS (news, 30%), @elonmusk (social, 20%)
 * 
 * Total weights:
 * news: 35 (default) + 30 (custom) = 65
 * social: 40 (default) + 20 (custom) = 60
 * technical: 25 (default) = 25
 * 
 * Normalized to 100%:
 * news: 43%, social: 40%, technical: 17%
 */
export function calculateAdjustedWeights(
  baseWeights: Record<ComponentKey, number>
): Record<ComponentKey, number> {
  const customSources = loadCustomSources();
  const enabledSources = customSources.filter(s => s.enabled);

  if (enabledSources.length === 0) {
    return baseWeights;
  }

  // Aggregate custom source weights by type
  const customWeights: Record<ComponentKey, number> = {
    social: 0,
    news: 0,
    technical: 0
  };

  enabledSources.forEach(source => {
    customWeights[source.type] += source.weight;
  });

  // Combine base + custom weights
  const combinedWeights = {
    social: baseWeights.social + customWeights.social,
    news: baseWeights.news + customWeights.news,
    technical: baseWeights.technical + customWeights.technical
  };

  // Normalize to 100%
  const total = combinedWeights.social + combinedWeights.news + combinedWeights.technical;
  
  return {
    social: Math.round((combinedWeights.social / total) * 100),
    news: Math.round((combinedWeights.news / total) * 100),
    technical: 100 - Math.round((combinedWeights.social / total) * 100) - Math.round((combinedWeights.news / total) * 100)
  };
}

/**
 * Get custom sources grouped by type
 */
export function getCustomSourcesByType(type: "news" | "social" | "technical"): CustomSource[] {
  const sources = loadCustomSources();
  return sources.filter(s => s.type === type && s.enabled);
}

/**
 * Get total custom source count
 */
export function getCustomSourceCount(): number {
  return loadCustomSources().filter(s => s.enabled).length;
}

/**
 * Check if user has custom sources enabled
 */
export function hasCustomSources(): boolean {
  return getCustomSourceCount() > 0;
}

/**
 * Enhance analysis explanation with custom source info
 */
export function enhanceExplanationWithCustomSources(
  baseExplanation: string,
  analysis: AnalysisOutput
): string {
  const customCount = getCustomSourceCount();
  
  if (customCount === 0) {
    return baseExplanation;
  }

  const customSources = loadCustomSources().filter(s => s.enabled);
  const sourceNames = customSources
    .slice(0, 3)
    .map(s => s.name)
    .join(", ");
  
  const moreText = customCount > 3 ? ` and ${customCount - 3} more` : "";
  
  return `${baseExplanation} Analysis includes ${customCount} custom source${customCount === 1 ? "" : "s"}: ${sourceNames}${moreText}.`;
}

/**
 * Get custom source summary for display
 */
export function getCustomSourceSummary(): {
  total: number;
  byType: Record<"news" | "social" | "technical", number>;
  topSources: CustomSource[];
} {
  const sources = loadCustomSources().filter(s => s.enabled);
  
  return {
    total: sources.length,
    byType: {
      news: sources.filter(s => s.type === "news").length,
      social: sources.filter(s => s.type === "social").length,
      technical: sources.filter(s => s.type === "technical").length
    },
    topSources: sources
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
  };
}
