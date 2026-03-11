/**
 * FIXED INTELLIGENCE ENGINE
 * Market signal now properly pulls toward market consensus
 */

interface IntelligenceOutput {
  direction: 'YES' | 'NO';
  confidence: number;
  probabilityLabel: string;
  predictionStrength: string;
  strengthScore: number;
  riskLevel: string;
  marketEdge: number | null;
  edgeContext: string;
  modelComponents: Array<{
    name: string;
    contribution: number;
    description: string;
  }>;
  confidenceDrivers: {
    positive: string[];
    negative: string[];
  };
  explanation: string;
}

export function calculateIntelligence(
  baseConfidence: number,
  weights: { social: number; news: number; technical: number },
  customSourcesCount: number,
  marketOdds: number | null,
  eventQuestion: string
): IntelligenceOutput {
  
  const signals = calculateDynamicSignals(baseConfidence, weights, marketOdds);
  const finalConfidence = signals.totalConfidence;
  const direction = finalConfidence >= 50 ? 'YES' : 'NO';
  const actualConfidence = direction === 'YES' ? finalConfidence : (100 - finalConfidence);
  
  const marketAnalysis = analyzeMarketDivergence(actualConfidence, marketOdds);
  
  // ADJUST CONFIDENCE if divergence is high
  let adjustedConfidence = actualConfidence;
  if (marketOdds !== null && marketAnalysis.divergence > 40) {
    // High divergence - weight heavily toward market
    const marketWeight = 0.6; // 60% market, 40% AI
    const marketDirection = marketOdds >= 50 ? marketOdds : (100 - marketOdds);
    adjustedConfidence = Math.round(
      actualConfidence * (1 - marketWeight) + marketDirection * marketWeight
    );
  } else if (marketOdds !== null && marketAnalysis.divergence > 20) {
    // Medium divergence - blend 50/50
    const marketWeight = 0.3; // 30% market, 70% AI
    const marketDirection = marketOdds >= 50 ? marketOdds : (100 - marketOdds);
    adjustedConfidence = Math.round(
      actualConfidence * (1 - marketWeight) + marketDirection * marketWeight
    );
  }
  
  const finalMarketAnalysis = analyzeMarketDivergence(adjustedConfidence, marketOdds);
  const strength = calculateStrength(adjustedConfidence, finalMarketAnalysis.divergence, marketOdds);
  const risk = calculateRisk(adjustedConfidence, finalMarketAnalysis.divergence);
  const drivers = identifyDrivers(signals, finalMarketAnalysis, customSourcesCount, marketOdds, adjustedConfidence !== actualConfidence);
  const explanation = generateExplanation(direction, adjustedConfidence, signals, finalMarketAnalysis, weights, marketOdds, adjustedConfidence !== actualConfidence);
  
  return {
    direction,
    confidence: adjustedConfidence,
    probabilityLabel: getProbabilityLabel(adjustedConfidence),
    predictionStrength: strength.label,
    strengthScore: strength.score,
    riskLevel: risk,
    marketEdge: finalMarketAnalysis.edge,
    edgeContext: finalMarketAnalysis.context,
    modelComponents: signals.components,
    confidenceDrivers: drivers,
    explanation
  };
}

function calculateDynamicSignals(
  baseConfidence: number,
  weights: { social: number; news: number; technical: number },
  marketOdds: number | null
) {
  const socialWeight = weights.social / 100;
  const newsWeight = weights.news / 100;
  const technicalWeight = weights.technical / 100;
  
  const socialSignal = baseConfidence * socialWeight;
  const newsSignal = baseConfidence * newsWeight;
  
  let marketSignal: number;
  let marketDescription: string;
  
  if (marketOdds !== null) {
    // FIXED: Market signal should represent the full market prediction weighted
    // If market says 3% YES, that means market predicts NO at 97%
    // For a YES/NO prediction, we want to know: how much does market pull us toward its answer?
    
    // Market prediction (aligned to YES direction for consistency)
    const marketPrediction = marketOdds;
    
    // Apply weight to market's full prediction, not just the percentage
    // This allows market to pull the total confidence toward its position
    marketSignal = marketPrediction * technicalWeight;
    
    marketDescription = `Live Polymarket odds (${marketOdds}% YES / ${100-marketOdds}% NO) weighted at ${Math.round(technicalWeight * 100)}%`;
  } else {
    marketSignal = baseConfidence * technicalWeight;
    marketDescription = 'Prediction market indicators and trading signals';
  }
  
  const totalConfidence = Math.round(socialSignal + newsSignal + marketSignal);
  
  const components = [
    {
      name: 'News Sentiment Model',
      contribution: Math.round(newsSignal),
      description: 'Analyzes sentiment and momentum across major news outlets'
    },
    {
      name: 'Community Signal Model',
      contribution: Math.round(socialSignal),
      description: 'Measures public sentiment and discussion trends'
    },
    {
      name: 'Market Probability Model',
      contribution: Math.round(marketSignal),
      description: marketDescription
    }
  ];
  
  return {
    totalConfidence,
    socialSignal: Math.round(socialSignal),
    newsSignal: Math.round(newsSignal),
    marketSignal: Math.round(marketSignal),
    components
  };
}

function analyzeMarketDivergence(aiConfidence: number, marketOdds: number | null) {
  if (marketOdds === null) {
    return {
      divergence: 0,
      edge: null,
      context: 'No market data available'
    };
  }
  
  const divergence = Math.abs(aiConfidence - marketOdds);
  const edge = aiConfidence - marketOdds;
  
  let context: string;
  if (Math.abs(edge) <= 5) {
    context = 'Strong agreement with market';
  } else if (Math.abs(edge) <= 15) {
    context = 'Moderate divergence from market';
  } else if (edge > 15) {
    context = 'AI significantly more bullish than market - HIGH RISK';
  } else {
    context = 'Market significantly more bullish than AI';
  }
  
  return { divergence, edge, context };
}

function calculateStrength(
  confidence: number,
  divergence: number,
  marketOdds: number | null
): { score: number; label: string } {
  
  if (marketOdds !== null) {
    const marketCertainty = Math.max(marketOdds, 100 - marketOdds);
    
    if (marketCertainty >= 90) {
      return { score: 85, label: 'Strong' };
    } else if (marketCertainty >= 75) {
      return { score: 70, label: 'Strong' };
    } else if (marketCertainty >= 60) {
      return { score: 55, label: 'Moderate' };
    } else {
      return { score: 40, label: 'Weak' };
    }
  }
  
  let score = confidence;
  
  if (divergence > 30) {
    score -= 20;
  } else if (divergence > 15) {
    score -= 10;
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let label: string;
  if (score >= 70) {
    label = 'Strong';
  } else if (score >= 50) {
    label = 'Moderate';
  } else {
    label = 'Weak';
  }
  
  return { score, label };
}

function calculateRisk(confidence: number, divergence: number): string {
  if (divergence > 40) {
    return 'High Risk';
  } else if (divergence > 20) {
    return 'Medium Risk';
  } else if (confidence < 55) {
    return 'Medium Risk';
  } else {
    return 'Low Risk';
  }
}

function identifyDrivers(
  signals: any,
  marketAnalysis: any,
  customSourcesCount: number,
  marketOdds: number | null,
  wasAdjusted: boolean
) {
  const positive: string[] = [];
  const negative: string[] = [];
  
  if (marketOdds !== null) {
    const marketCertainty = Math.max(marketOdds, 100 - marketOdds);
    
    if (marketCertainty >= 85) {
      positive.push(`Market shows ${marketCertainty}% certainty - very strong signal`);
    }
    
    if (wasAdjusted) {
      positive.push('AI confidence adjusted toward market consensus due to high divergence');
    }
    
    if (marketAnalysis.divergence > 30 && !wasAdjusted) {
      negative.push(`Large ${marketAnalysis.divergence}% divergence from market consensus - proceed with caution`);
    } else if (marketAnalysis.divergence <= 10) {
      positive.push('AI prediction aligns closely with market expectations');
    }
  }
  
  if (signals.newsSignal > 15) {
    positive.push('Strong news sentiment supporting this outcome');
  }
  if (signals.socialSignal > 15) {
    positive.push('Community discussion trends are favorable');
  }
  if (customSourcesCount > 3) {
    positive.push(`${customSourcesCount} custom sources configured for analysis`);
  }
  
  if (signals.totalConfidence < 55 && marketOdds === null) {
    negative.push('Low overall confidence across signals');
  }
  if (signals.newsSignal < 10) {
    negative.push('Limited news sentiment data available');
  }
  
  if (positive.length === 0) {
    positive.push('Multiple data sources analyzed');
  }
  if (negative.length === 0) {
    negative.push('No significant negative signals detected');
  }
  
  return { positive, negative };
}

function getProbabilityLabel(confidence: number): string {
  if (confidence >= 75) return 'Highly Likely';
  if (confidence >= 65) return 'Likely';
  if (confidence >= 55) return 'Probable';
  if (confidence >= 45) return 'Uncertain';
  if (confidence >= 35) return 'Unlikely';
  return 'Highly Unlikely';
}

function generateExplanation(
  direction: 'YES' | 'NO',
  confidence: number,
  signals: any,
  marketAnalysis: any,
  weights: any,
  marketOdds: number | null,
  wasAdjusted: boolean
): string {
  const parts: string[] = [];
  
  parts.push(
    `Analysis across news (${weights.news}%), social (${weights.social}%), and market data (${weights.technical}%) ` +
    `indicates ${direction} is ${getProbabilityLabel(confidence).toLowerCase()} at ${confidence}% confidence.`
  );
  
  if (marketAnalysis.edge !== null && marketOdds !== null) {
    const marketCertainty = Math.max(marketOdds, 100 - marketOdds);
    
    if (wasAdjusted) {
      parts.push(
        `⚠️ The AI's initial prediction was adjusted toward the market consensus due to ${Math.abs(marketAnalysis.edge)}% divergence. ` +
        `When market certainty is ${marketCertainty}% and divergence is high, the market signal is given greater weight.`
      );
    } else if (Math.abs(marketAnalysis.edge) <= 10) {
      parts.push(
        `This prediction aligns closely with Polymarket odds (${marketOdds}%), suggesting market consensus supports this view.`
      );
    } else if (Math.abs(marketAnalysis.edge) > 30) {
      if (marketCertainty >= 80) {
        parts.push(
          `⚠️ WARNING: The market shows ${marketCertainty}% certainty, with ${Math.abs(marketAnalysis.edge)}% divergence from AI signals. ` +
          `When markets are this confident, large divergence suggests investigating why the AI differs or trusting the market.`
        );
      } else {
        parts.push(
          `The AI diverges from the market by ${Math.abs(marketAnalysis.edge)}%. ` +
          `This large difference suggests conflicting signals - verify both perspectives before deciding.`
        );
      }
    } else {
      parts.push(
        `The AI shows ${Math.abs(marketAnalysis.edge)}% divergence from the market. ` +
        `This moderate difference suggests reviewing both sources before deciding.`
      );
    }
  }
  
  return parts.join(' ');
}
