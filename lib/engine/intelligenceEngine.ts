// lib/engine/intelligenceEngine.ts

import { type ComponentKey } from "./analyzeEvent";

export interface IntelligenceMetrics {
  confidence: number;
  trustLevel: string;
  trustScore: number;
  riskLevel: string;
  direction: "YES" | "NO";
  marketEdge: number | null;
  explanation: string;
  customSourceImpact: number;
  sourceBreakdown: {
    news: number;
    social: number;
    technical: number;
  };
}

/**
 * Calculate weighted confidence from category weights
 */
export function calculateWeightedConfidence(
  weights: Record<ComponentKey, number>,
  newsStrength: number = 0.75,
  socialStrength: number = 0.65,
  technicalStrength: number = 0.85
): number {
  const newsContribution = (weights.news / 100) * newsStrength * 100;
  const socialContribution = (weights.social / 100) * socialStrength * 100;
  const technicalContribution = (weights.technical / 100) * technicalStrength * 100;

  const totalConfidence = newsContribution + socialContribution + technicalContribution;
  
  return Math.round(totalConfidence);
}

/**
 * Calculate trust level from confidence score
 */
export function calculateTrustLevel(confidence: number): { level: string; score: number } {
  let level = "Low";
  let score = 0;

  if (confidence >= 80) {
    level = "Very High";
    score = 95;
  } else if (confidence >= 70) {
    level = "High";
    score = 75;
  } else if (confidence >= 60) {
    level = "Moderate";
    score = 60;
  } else if (confidence >= 50) {
    level = "Low";
    score = 45;
  } else {
    level = "Very Low";
    score = 30;
  }

  return { level, score };
}

/**
 * Calculate risk level from confidence
 */
export function calculateRiskLevel(confidence: number): string {
  if (confidence >= 75) return "Low Risk";
  if (confidence >= 60) return "Medium Risk";
  return "High Risk";
}

/**
 * Calculate prediction direction
 */
export function calculateDirection(confidence: number): "YES" | "NO" {
  return confidence >= 50 ? "YES" : "NO";
}

/**
 * Calculate market edge (AI prediction vs market odds)
 */
export function calculateMarketEdge(
  aiPrediction: number,
  marketOdds: number | null
): number | null {
  if (marketOdds === null) return null;
  return Math.round(aiPrediction - marketOdds);
}

/**
 * Calculate impact of custom sources on confidence
 */
export function calculateCustomSourceImpact(
  defaultConfidence: number,
  customConfidence: number
): number {
  return Math.round(customConfidence - defaultConfidence);
}

/**
 * Generate transparent explanation
 */
export function generateExplanation(
  direction: "YES" | "NO",
  weights: Record<ComponentKey, number>,
  customSourcesCount: number,
  customImpact: number
): string {
  const sources = [];
  
  if (weights.news > 30) {
    sources.push(`news analysis (${weights.news}% weight)`);
  }
  
  if (weights.social > 30) {
    sources.push(`social sentiment (${weights.social}% weight)`);
  }
  
  if (weights.technical > 20) {
    sources.push(`market data (${weights.technical}% weight)`);
  }

  let explanation = `This prediction favors ${direction} based on `;
  
  if (sources.length === 0) {
    explanation += "balanced analysis across all sources.";
  } else if (sources.length === 1) {
    explanation += `${sources[0]}.`;
  } else if (sources.length === 2) {
    explanation += `${sources[0]} and ${sources[1]}.`;
  } else {
    explanation += `${sources[0]}, ${sources[1]}, and ${sources[2]}.`;
  }

  if (customSourcesCount > 0) {
    explanation += ` Your ${customSourcesCount} custom source${customSourcesCount > 1 ? 's' : ''}`;
    
    if (customImpact > 5) {
      explanation += ` significantly boosted this prediction (+${customImpact}%).`;
    } else if (customImpact > 0) {
      explanation += ` slightly increased confidence (+${customImpact}%).`;
    } else if (customImpact < -5) {
      explanation += ` significantly lowered this prediction (${customImpact}%).`;
    } else if (customImpact < 0) {
      explanation += ` slightly decreased confidence (${customImpact}%).`;
    } else {
      explanation += ` aligned with the default analysis.`;
    }
  }

  return explanation;
}

/**
 * Main intelligence calculation
 */
export function calculateIntelligence(
  baseConfidence: number,
  weights: Record<ComponentKey, number>,
  customSourcesCount: number = 0,
  marketOdds: number | null = null
): IntelligenceMetrics {
  const confidence = baseConfidence;
  
  // Default confidence (assumes 3 default sources balanced)
  const defaultConfidence = 56;
  
  // Custom source impact
  const customSourceImpact = customSourcesCount > 0 
    ? calculateCustomSourceImpact(defaultConfidence, confidence)
    : 0;

  // Trust level
  const trustMetrics = calculateTrustLevel(confidence);
  
  // Risk level
  const riskLevel = calculateRiskLevel(confidence);
  
  // Direction
  const direction = calculateDirection(confidence);
  
  // Market edge
  const marketEdge = calculateMarketEdge(confidence, marketOdds);
  
  // Explanation
  const explanation = generateExplanation(
    direction,
    weights,
    customSourcesCount,
    customSourceImpact
  );

  // Source breakdown
  const sourceBreakdown = {
    news: weights.news,
    social: weights.social,
    technical: weights.technical
  };

  return {
    confidence,
    trustLevel: trustMetrics.level,
    trustScore: trustMetrics.score,
    riskLevel,
    direction,
    marketEdge,
    explanation,
    customSourceImpact,
    sourceBreakdown
  };
}
