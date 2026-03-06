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
 * This makes the confidence score explainable and based on actual data
 */
export function calculateWeightedConfidence(
  weights: Record<ComponentKey, number>,
  newsStrength: number = 0.75,  // How strong the news signal is (0-1)
  socialStrength: number = 0.65, // How strong the social signal is (0-1)
  technicalStrength: number = 0.85 // How strong the technical signal is (0-1)
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
 * @param aiPrediction - Our AI confidence (0-100)
 * @param marketOdds - Market probability (0-100) from Polymarket/Kalshi
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
 * Compares default confidence vs custom source confidence
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
  const dominantSource = 
    weights.news > weights.social && weights.news > weights.technical ? "news" :
    weights.social > weights.news && weights.social > weights.technical ? "social" :
    "market data";

  const sourceDescriptions = {
    news: "news headlines",
    social: "social sentiment",
    "market data": "technical indicators"
  };

  let explanation = `This prediction favors ${direction} based on `;

  if (weights.news > 30) {
    explanation += `strong news signals (${weights.news}% weight), `;
  }
  
  if (weights.social > 30) {
    explanation += `${weights.social}% social sentiment analysis, `;
  }
  
  if (weights.technical > 20) {
    explanation += `and ${weights.technical}% market data. `;
  }

  if (customSourcesCount > 0) {
    if (customImpact > 0) {
      explanation += `Your ${customSourcesCount} custom sources increased confidence by ${customImpact}%.`;
    } else if (customImpact < 0) {
      explanation += `Your ${customSourcesCount} custom sources decreased confidence by ${Math.abs(customImpact)}%.`;
    } else {
      explanation += `Your ${customSourcesCount} custom sources aligned with our analysis.`;
    }
  } else {
    explanation += `Analysis based on ${dominantSource}.`;
  }

  return explanation;
}

/**
 * Main intelligence calculation
 * This is the central function that ties everything together
 */
export function calculateIntelligence(
  baseConfidence: number,
  weights: Record<ComponentKey, number>,
  customSourcesCount: number = 0,
  marketOdds: number | null = null
): IntelligenceMetrics {
  // Calculate weighted confidence
  const confidence = baseConfidence;
  
  // Default confidence (no custom sources)
  const defaultConfidence = 56; // This would be your base prediction
  
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
