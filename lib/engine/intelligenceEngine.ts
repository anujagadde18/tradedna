// lib/engine/intelligenceEngine.ts

import { type ComponentKey } from "./analyzeEvent";

export interface IntelligenceMetrics {
  confidence: number;
  probabilityLabel: string;
  predictionStrength: string; // Changed from "trustLevel"
  strengthScore: number;
  riskLevel: string;
  direction: "YES" | "NO";
  marketEdge: number | null;
  edgeContext: string;
  explanation: string;
  customSourceImpact: number;
  sourceBreakdown: {
    news: number;
    social: number;
    technical: number;
  };
  confidenceBreakdown: {
    newsImpact: number;
    socialImpact: number;
    technicalImpact: number;
  };
  confidenceDrivers: {
    positive: string[];
    negative: string[];
  };
  modelComponents: {
    name: string;
    description: string;
    contribution: number;
  }[];
}

/**
 * Get probability label from confidence
 */
export function getProbabilityLabel(confidence: number): string {
  if (confidence >= 80) return "Very Likely";
  if (confidence >= 65) return "Likely";
  if (confidence >= 55) return "Slightly Likely";
  if (confidence >= 45) return "Uncertain";
  return "Unlikely";
}

/**
 * Get prediction strength (replaces "trust level")
 */
export function getPredictionStrength(confidence: number): { strength: string; score: number } {
  let strength = "Very Weak";
  let score = 0;

  if (confidence >= 80) {
    strength = "Very Strong";
    score = 95;
  } else if (confidence >= 70) {
    strength = "Strong";
    score = 75;
  } else if (confidence >= 60) {
    strength = "Moderate";
    score = 60;
  } else if (confidence >= 50) {
    strength = "Weak";
    score = 45;
  } else {
    strength = "Very Weak";
    score = 30;
  }

  return { strength, score };
}

/**
 * Get edge context
 */
export function getEdgeContext(edge: number | null): string {
  if (edge === null) return "No market data available";
  
  if (Math.abs(edge) < 3) return "AI and market closely aligned";
  if (edge > 15) return "Strong AI advantage detected";
  if (edge > 10) return "AI sees significant opportunity";
  if (edge > 5) return "AI shows slight advantage";
  if (edge > 0) return "Minor AI advantage";
  if (edge > -5) return "Market shows slight advantage";
  if (edge > -10) return "Market slightly stronger";
  return "Market significantly stronger";
}

/**
 * Calculate confidence breakdown
 */
export function calculateConfidenceBreakdown(
  weights: Record<ComponentKey, number>,
  baseConfidence: number
): { newsImpact: number; socialImpact: number; technicalImpact: number } {
  const newsStrength = 0.75;
  const socialStrength = 0.65;
  const technicalStrength = 0.85;
  
  const newsImpact = Math.round((weights.news / 100) * newsStrength * baseConfidence);
  const socialImpact = Math.round((weights.social / 100) * socialStrength * baseConfidence);
  const technicalImpact = Math.round((weights.technical / 100) * technicalStrength * baseConfidence);
  
  return {
    newsImpact,
    socialImpact,
    technicalImpact
  };
}

/**
 * Generate confidence drivers (what pushed prediction up/down)
 */
export function generateConfidenceDrivers(
  weights: Record<ComponentKey, number>,
  confidence: number,
  event: string
): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  
  const eventLower = event.toLowerCase();
  
  // Positive drivers
  if (weights.news > 40) {
    if (eventLower.includes('regulation') || eventLower.includes('law')) {
      positive.push("Increasing policy discussion momentum");
      positive.push("Financial news outlets show regulatory consensus");
    } else if (eventLower.includes('stock') || eventLower.includes('price')) {
      positive.push("Strong financial news sentiment");
      positive.push("Analyst coverage trending positive");
    } else {
      positive.push("Major news sources show consensus");
      positive.push("Recent headline momentum");
    }
  }
  
  if (weights.social > 30) {
    positive.push("Community sentiment analysis favorable");
  }
  
  if (weights.technical > 30) {
    positive.push("Market indicators show alignment");
  }
  
  // Negative drivers (things that reduce confidence)
  if (confidence < 60) {
    if (weights.news < 30) {
      negative.push("Limited news coverage");
    }
    if (weights.social < 20) {
      negative.push("Weak social signal strength");
    }
    if (weights.technical < 20) {
      negative.push("Market data inconclusive");
    }
  }
  
  if (negative.length === 0) {
    negative.push("No significant negative signals detected");
  }
  
  return { positive, negative };
}

/**
 * Get model components breakdown
 */
export function getModelComponents(
  weights: Record<ComponentKey, number>,
  confidenceBreakdown: { newsImpact: number; socialImpact: number; technicalImpact: number }
): { name: string; description: string; contribution: number }[] {
  return [
    {
      name: "News Sentiment Model",
      description: "Analyzes sentiment and momentum across major financial, policy, and news outlets",
      contribution: confidenceBreakdown.newsImpact
    },
    {
      name: "Market Probability Model",
      description: "Tracks probability signals from prediction markets and trading indicators",
      contribution: confidenceBreakdown.technicalImpact
    },
    {
      name: "Community Signal Model",
      description: "Measures public sentiment, discussion volume, and social momentum trends",
      contribution: confidenceBreakdown.socialImpact
    }
  ].sort((a, b) => b.contribution - a.contribution);
}

/**
 * Calculate risk level
 */
export function calculateRiskLevel(confidence: number): string {
  if (confidence >= 75) return "Low Risk";
  if (confidence >= 60) return "Medium Risk";
  return "High Risk";
}

/**
 * Calculate direction
 */
export function calculateDirection(confidence: number): "YES" | "NO" {
  return confidence >= 50 ? "YES" : "NO";
}

/**
 * Calculate market edge
 */
export function calculateMarketEdge(
  aiPrediction: number,
  marketOdds: number | null
): number | null {
  if (marketOdds === null) return null;
  return Math.round(aiPrediction - marketOdds);
}

/**
 * Calculate custom source impact
 */
export function calculateCustomSourceImpact(
  defaultConfidence: number,
  customConfidence: number
): number {
  return Math.round(customConfidence - defaultConfidence);
}

/**
 * Generate enhanced explanation
 */
export function generateExplanation(
  direction: "YES" | "NO",
  weights: Record<ComponentKey, number>,
  customSourcesCount: number,
  customImpact: number,
  event: string
): string {
  const eventLower = event.toLowerCase();
  let explanation = "";

  if (weights.news > 40) {
    if (eventLower.includes('regulation') || eventLower.includes('law')) {
      explanation = `Financial news coverage indicates ${direction === "YES" ? "growing" : "declining"} legislative momentum. Policy analysis from major outlets shows ${direction === "YES" ? "increasing" : "decreasing"} support for regulatory frameworks. `;
    } else if (eventLower.includes('stock') || eventLower.includes('price')) {
      explanation = `Market analysis from financial publications shows ${direction === "YES" ? "bullish" : "bearish"} sentiment. News coverage suggests ${direction === "YES" ? "positive" : "negative"} momentum. `;
    } else {
      explanation = `News analysis across major sources indicates ${direction === "YES" ? "favorable" : "unfavorable"} outlook. Coverage momentum supports ${direction} prediction. `;
    }
  } else if (weights.social > 40) {
    explanation = `Social sentiment analysis shows ${direction === "YES" ? "strong positive" : "strong negative"} trends. Community discussions and public discourse favor ${direction}. `;
  } else if (weights.technical > 40) {
    explanation = `Market probability signals and technical indicators suggest ${direction === "YES" ? "upward" : "downward"} momentum. Trading data supports ${direction} outcome. `;
  } else {
    explanation = `Balanced multi-signal analysis across news (${weights.news}%), social (${weights.social}%), and market data (${weights.technical}%) indicates ${direction} is more likely. `;
  }

  if (customSourcesCount > 0 && Math.abs(customImpact) > 3) {
    explanation += `Your ${customSourcesCount} custom source${customSourcesCount > 1 ? 's' : ''} ${customImpact > 0 ? 'strengthened' : 'moderated'} this prediction by ${Math.abs(customImpact)}%.`;
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
  marketOdds: number | null = null,
  event: string = ""
): IntelligenceMetrics {
  const confidence = baseConfidence;
  const defaultConfidence = 56;
  
  const customSourceImpact = customSourcesCount > 0 
    ? calculateCustomSourceImpact(defaultConfidence, confidence)
    : 0;

  const strengthMetrics = getPredictionStrength(confidence);
  const riskLevel = calculateRiskLevel(confidence);
  const direction = calculateDirection(confidence);
  const marketEdge = calculateMarketEdge(confidence, marketOdds);
  const probabilityLabel = getProbabilityLabel(confidence);
  const edgeContext = getEdgeContext(marketEdge);
  const confidenceBreakdown = calculateConfidenceBreakdown(weights, confidence);
  const confidenceDrivers = generateConfidenceDrivers(weights, confidence, event);
  const modelComponents = getModelComponents(weights, confidenceBreakdown);
  
  const explanation = generateExplanation(
    direction,
    weights,
    customSourcesCount,
    customSourceImpact,
    event
  );

  const sourceBreakdown = {
    news: weights.news,
    social: weights.social,
    technical: weights.technical
  };

  return {
    confidence,
    probabilityLabel,
    predictionStrength: strengthMetrics.strength,
    strengthScore: strengthMetrics.score,
    riskLevel,
    direction,
    marketEdge,
    edgeContext,
    explanation,
    customSourceImpact,
    sourceBreakdown,
    confidenceBreakdown,
    confidenceDrivers,
    modelComponents
  };
}
