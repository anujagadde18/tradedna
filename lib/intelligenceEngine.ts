/**
 * IMPROVED DYNAMIC INTELLIGENCE ENGINE
 * Properly weights market data and handles divergence intelligently
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
  const strength = calculateStrength(actualConfidence, marketAnalysis.divergence, marketOdds);
  const risk = calculateRisk(actualConfidence, marketAnalysis.divergence);
  const drivers = identifyDrivers(signals, marketAnalysis, customSourcesCount, marketOdds);
  const explanation = generateExplanation(direction, actualConfidence, signals, marketAnalysis, weights, marketOdds);
  
  return {
    direction,
    confidence: actualConfidence,
    probabilityLabel: getProbabilityLabel(actualConfidence),
    predictionStrength: strength.label,
    strengthScore: strength.score,
    riskLevel: risk,
    marketEdge: marketAnalysis.edge,
    edgeContext: marketAnalysis.context,
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
    // Use ACTUAL market odds, not base confidence!
    marketSignal = marketOdds * technicalWeight;
    marketDescription = `Live Polymarket odds (${marketOdds}%) weighted at ${Math.round(technicalWeight * 100)}%`;
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
  
  // When market data is available and clear, strength should reflect that clarity
  if (marketOdds !== null) {
    // Extreme market positions (very low or very high) = strong signal
    const marketCertainty = Math.max(marketOdds, 100 - marketOdds);
    
    if (marketCertainty >= 90) {
      // Market is 90%+ certain - this is a STRONG signal
      return { score: 85, label: 'Strong' };
    } else if (marketCertainty >= 75) {
      // Market is 75-90% certain
      return { score: 70, label: 'Strong' };
    } else if (marketCertainty >= 60) {
      return { score: 55, label: 'Moderate' };
    } else {
      // Market is uncertain
      return { score: 40, label: 'Weak' };
    }
  }
  
  // Fallback when no market data
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
  // High divergence = High risk, regardless of confidence
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
  marketOdds: number | null
) {
  const positive: string[] = [];
  const negative: string[] = [];
  
  // Market-based drivers (most important)
  if (marketOdds !== null) {
    const marketCertainty = Math.max(marketOdds, 100 - marketOdds);
    
    if (marketCertainty >= 85) {
      positive.push(`Market shows ${marketCertainty}% certainty - very strong signal`);
    }
    
    if (marketAnalysis.divergence > 30) {
      negative.push(`Large ${marketAnalysis.divergence}% divergence from market consensus - proceed with caution`);
    } else if (marketAnalysis.divergence <= 10) {
      positive.push('AI prediction aligns closely with market expectations');
    }
  }
  
  // Signal strength drivers
  if (signals.newsSignal > 15) {
    positive.push('Strong news sentiment supporting this outcome');
  }
  if (signals.socialSignal > 15) {
    positive.push('Community discussion trends are favorable');
  }
  if (customSourcesCount > 3) {
    positive.push(`${customSourcesCount} custom sources configured for analysis`);
  }
  
  // Warning drivers
  if (signals.totalConfidence < 55 && marketOdds === null) {
    negative.push('Low overall confidence across signals');
  }
  if (signals.newsSignal < 10) {
    negative.push('Limited news sentiment data available');
  }
  
  // Ensure we always have at least one
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
  marketOdds: number | null
): string {
  const parts: string[] = [];
  
  parts.push(
    `Analysis across news (${weights.news}%), social (${weights.social}%), and market data (${weights.technical}%) ` +
    `indicates ${direction} is ${getProbabilityLabel(confidence).toLowerCase()} at ${confidence}% confidence.`
  );
  
  if (marketAnalysis.edge !== null && marketOdds !== null) {
    const marketCertainty = Math.max(marketOdds, 100 - marketOdds);
    
    if (Math.abs(marketAnalysis.edge) <= 10) {
      parts.push(
        `This prediction aligns closely with Polymarket odds (${marketOdds}%), suggesting market consensus supports this view.`
      );
    } else if (Math.abs(marketAnalysis.edge) > 30) {
      // Large divergence - WARNING
      if (marketCertainty >= 80) {
        parts.push(
          `⚠️ WARNING: The market shows ${marketCertainty}% certainty, but the AI diverges by ${Math.abs(marketAnalysis.edge)}%. ` +
          `When markets are this confident, large divergence suggests the AI may be missing key information. ` +
          `Consider trusting the market or investigating why the AI differs so significantly.`
        );
      } else {
        parts.push(
          `The AI diverges from the market by ${Math.abs(marketAnalysis.edge)}%. ` +
          `This large divergence suggests conflicting signals - proceed with caution and verify both perspectives.`
        );
      }
    } else {
      // Moderate divergence
      parts.push(
        `The AI shows ${Math.abs(marketAnalysis.edge)}% divergence from the market. ` +
        `This moderate difference suggests reviewing both the AI's sources and market reasoning before deciding.`
      );
    }
  }
  
  return parts.join(' ');
}
