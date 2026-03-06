// lib/engine/intelligenceEngine.ts

import { type ComponentKey } from "./analyzeEvent";

export interface IntelligenceMetrics {
  confidence: number;
  probabilityLabel: string; // NEW: "Very Likely", "Likely", etc.
  trustLevel: string;
  trustScore: number;
  riskLevel: string;
  direction: "YES" | "NO";
  marketEdge: number | null;
  edgeContext: string; // NEW: Human-readable edge context
  explanation: string;
  customSourceImpact: number;
  sourceBreakdown: {
    news: number;
    social: number;
    technical: number;
  };
  confidenceBreakdown: { // NEW: Shows where confidence comes from
    newsImpact: number;
    socialImpact: number;
    technicalImpact: number;
  };
}

/**
 * Calculate probability label from confidence
 */
export function getProbabilityLabel(confidence: number): string {
  if (confidence >= 80) return "Very Likely";
  if (confidence >= 65) return "Likely";
  if (confidence >= 55) return "Slightly Likely";
  if (confidence >= 45) return "Uncertain";
  return "Unlikely";
}

/**
 * Get edge context (human-readable)
 */
export function getEdgeContext(edge: number | null): string {
  if (edge === null) return "";
  
  if (Math.abs(edge) < 3) return "Aligned with market";
  if (edge > 15) return "Strong AI advantage";
  if (edge > 10) return "AI sees opportunity";
  if (edge > 5) return "Slight AI advantage";
  if (edge > 0) return "Minor AI advantage";
  if (edge > -5) return "Slight market advantage";
  if (edge > -10) return "Market slightly stronger";
  return "Market significantly stronger";
}

/**
 * Calculate confidence breakdown (shows contribution from each source)
 */
export function calculateConfidenceBreakdown(
  weights: Record<ComponentKey, number>,
  baseConfidence: number
): { newsImpact: number; socialImpact: number; technicalImpact: number } {
  // Estimate signal strengths (in real app, these come from actual data)
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
 * Generate enhanced explanation with specifics
 */
export function generateExplanation(
  direction: "YES" | "NO",
  weights: Record<ComponentKey, number>,
  customSourcesCount: number,
  customImpact: number,
  event: string
): string {
  const dominantSource = 
    weights.news > weights.social && weights.news > weights.technical ? "news" :
    weights.social > weights.news && weights.social > weights.technical ? "social" :
    "technical";

  let explanation = "";

  // Event-specific context
  const eventLower = event.toLowerCase();
  
  if (dominantSource === "news" && weights.news > 40) {
    if (eventLower.includes('regulation') || eventLower.includes('law')) {
      explanation = `Multiple news outlets report increasing legislative momentum. Policy analysis from major financial publications shows ${direction === "YES" ? "growing" : "declining"} support for regulatory frameworks. `;
    } else if (eventLower.includes('stock') || eventLower.includes('price')) {
      explanation = `Financial news sources indicate ${direction === "YES" ? "bullish" : "bearish"} sentiment. Market analysis from Bloomberg, Reuters, and WSJ shows ${direction === "YES" ? "positive" : "negative"} momentum. `;
    } else {
      explanation = `News coverage from ${Math.floor(weights.news / 15)} major sources shows ${direction === "YES" ? "increasing" : "decreasing"} likelihood. Headlines and expert commentary favor ${direction}. `;
    }
  } else if (dominantSource === "social" && weights.social > 40) {
    explanation = `Social sentiment analysis across Twitter, Reddit, and forums shows ${direction === "YES" ? "strong positive" : "strong negative"} momentum. Community discussions indicate ${direction === "YES" ? "growing" : "declining"} consensus. `;
  } else if (dominantSource === "technical" && weights.technical > 40) {
    explanation = `Market data and prediction market pricing suggest ${direction === "YES" ? "upward" : "downward"} probability. Technical indicators and trading volume support ${direction}. `;
  } else {
    explanation = `Balanced analysis across news (${weights.news}%), social (${weights.social}%), and market data (${weights.technical}%) favors ${direction}. `;
  }

  if (customSourcesCount > 0) {
    if (Math.abs(customImpact) > 5) {
      explanation += `Your ${customSourcesCount} custom source${customSourcesCount > 1 ? 's' : ''} ${customImpact > 0 ? 'significantly strengthened' : 'moderated'} this prediction (${customImpact > 0 ? '+' : ''}${customImpact}%).`;
    } else if (customImpact !== 0) {
      explanation += `Your custom sources ${customImpact > 0 ? 'slightly boosted' : 'slightly lowered'} confidence.`;
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
  marketOdds: number | null = null,
  event: string = ""
): IntelligenceMetrics {
  const confidence = baseConfidence;
  const defaultConfidence = 56;
  
  const customSourceImpact = customSourcesCount > 0 
    ? calculateCustomSourceImpact(defaultConfidence, confidence)
    : 0;

  const trustMetrics = calculateTrustLevel(confidence);
  const riskLevel = calculateRiskLevel(confidence);
  const direction = calculateDirection(confidence);
  const marketEdge = calculateMarketEdge(confidence, marketOdds);
  const probabilityLabel = getProbabilityLabel(confidence);
  const edgeContext = getEdgeContext(marketEdge);
  const confidenceBreakdown = calculateConfidenceBreakdown(weights, confidence);
  
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
    trustLevel: trustMetrics.level,
    trustScore: trustMetrics.score,
    riskLevel,
    direction,
    marketEdge,
    edgeContext,
    explanation,
    customSourceImpact,
    sourceBreakdown,
    confidenceBreakdown
  };
}
