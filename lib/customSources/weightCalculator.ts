// lib/customSources/weightCalculator.ts

import { CustomSource, CategoryWeight, CalculatedWeight } from "./types";

/**
 * Auto-balance weights within a category so they sum to 100%
 */
export function autoBalanceWeights(sources: CustomSource[]): CustomSource[] {
  const enabledSources = sources.filter(s => s.enabled);
  
  if (enabledSources.length === 0) return sources;
  
  // Equal distribution
  const weightPerSource = Math.floor(100 / enabledSources.length);
  const remainder = 100 - (weightPerSource * enabledSources.length);
  
  let enabledIndex = 0;
  return sources.map(source => {
    if (!source.enabled) return source;
    
    const isLast = enabledIndex === enabledSources.length - 1;
    const weight = isLast ? weightPerSource + remainder : weightPerSource;
    enabledIndex++;
    
    return { ...source, weight };
  });
}

/**
 * Normalize weights to sum to 100% while preserving ratios
 */
export function normalizeWeights(sources: CustomSource[]): CustomSource[] {
  const enabledSources = sources.filter(s => s.enabled);
  
  if (enabledSources.length === 0) return sources;
  
  const totalWeight = enabledSources.reduce((sum, s) => sum + s.weight, 0);
  
  if (totalWeight === 0) {
    return autoBalanceWeights(sources);
  }
  
  if (totalWeight === 100) return sources;
  
  // Normalize to 100%
  const scale = 100 / totalWeight;
  let runningTotal = 0;
  
  return sources.map((source, index) => {
    if (!source.enabled) return source;
    
    const isLast = index === sources.length - 1 && source.enabled;
    
    if (isLast) {
      return { ...source, weight: 100 - runningTotal };
    }
    
    const normalizedWeight = Math.round(source.weight * scale);
    runningTotal += normalizedWeight;
    
    return { ...source, weight: normalizedWeight };
  });
}

/**
 * Calculate final weights considering category weights
 */
export function calculateFinalWeights(
  sources: CustomSource[],
  categoryWeights: CategoryWeight
): CalculatedWeight[] {
  const result: CalculatedWeight[] = [];
  
  // Group by category
  const byCategory = {
    news: sources.filter(s => s.type === "news" && s.enabled),
    social: sources.filter(s => s.type === "social" && s.enabled),
    technical: sources.filter(s => s.type === "technical" && s.enabled)
  };
  
  // Calculate for each category
  Object.entries(byCategory).forEach(([category, categorySources]) => {
    const categoryWeight = categoryWeights[category as keyof CategoryWeight];
    
    categorySources.forEach(source => {
      const sourceWeight = source.weight / 100; // Convert to decimal
      const finalWeight = categoryWeight * sourceWeight;
      
      result.push({
        source,
        categoryWeight,
        sourceWeight: source.weight,
        finalWeight: Number(finalWeight.toFixed(2))
      });
    });
  });
  
  return result.sort((a, b) => b.finalWeight - a.finalWeight);
}

/**
 * Validate that category weights sum to 100%
 */
export function validateCategoryWeights(weights: CategoryWeight): boolean {
  const total = weights.news + weights.social + weights.technical;
  return Math.abs(total - 100) < 0.01; // Allow tiny floating point errors
}
