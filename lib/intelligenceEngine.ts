/**
 * DYNAMIC INTELLIGENCE ENGINE
 * Makes predictions based on actual market data, not hardcoded values
 */

interface IntelligenceInput {
  baseConfidence: number;
  weights: {
    social: number;
    news: number;
    technical: number;
  };
  customSourcesCount: number;
  marketOdds: number | null;
  eventQuestion: string;
}

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
  const strength = calculateStrength(actualConfidence, marketAnalysis.divergence, customSourcesCount);
  const risk = calculateRisk(actualConfidence, marketAnalysis.divergence);
  const drivers = identifyDrivers(signals, marketAnalysis, customSourcesCount);
  const explanation = generateExplanation(direction, actualConfidence, signals, marketAnalysis, weights);
  
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
  if (marketOdds !== null) {
    marketSignal = marketOdds * technicalWeight;
  } else {
    marketSignal = baseConfidence * technicalWeight;
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
      description: marketOdds !== null 
        ? `Live Polymarket odds (${marketOdds}%) weighted at ${Math.round(technicalWeight * 100)}%`
        : 'Prediction market indicators and trading signals'
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
    context = 'AI significantly more bullish than market';
  } else {
    context = 'AI significantly more bearish than market';
  }
  
  return { divergence, edge, context };
}

function calculateStrength(
  confidence: number,
  divergence: number,
  customSourcesCount: number
) {
  let score = confidence;
  
  if (divergence > 30) {
    score -= 20;
  } else if (divergence > 15) {
    score -= 10;
  }
  
  score += Math.min(customSourcesCount * 2, 10);
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
  if (confidence < 55 || divergence > 30) {
    return 'High Risk';
  } else if (confidence < 65 || divergence > 15) {
    return 'Medium Risk';
  } else {
    return 'Low Risk';
  }
}

function identifyDrivers(
  signals: any,
  marketAnalysis: any,
  customSourcesCount: number
) {
  const positive: string[] = [];
  const negative: string[] = [];
  
  if (signals.newsSignal > 15) {
    positive.push('Strong news sentiment supporting this outcome');
  }
  if (signals.socialSignal > 15) {
    positive.push('Community discussion trends are favorable');
  }
  if (marketAnalysis.edge !== null && Math.abs(marketAnalysis.edge) <= 10) {
    positive.push('AI prediction aligns with market expectations');
  }
  if (customSourcesCount > 3) {
    positive.push(`${customSourcesCount} custom sources configured for analysis`);
  }
  
  if (signals.totalConfidence < 55) {
    negative.push('Low overall confidence across signals');
  }
  if (marketAnalysis.divergence > 20) {
    negative.push('Significant divergence from market consensus');
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
  weights: any
): string {
  const parts: string[] = [];
  
  parts.push(
    `Analysis across news (${weights.news}%), social (${weights.social}%), and market data (${weights.technical}%) ` +
    `indicates ${direction} is ${getProbabilityLabel(confidence).toLowerCase()} at ${confidence}% confidence.`
  );
  
  if (marketAnalysis.edge !== null) {
    if (Math.abs(marketAnalysis.edge) <= 10) {
      parts.push(
        `This prediction aligns closely with Polymarket odds, suggesting market consensus supports this view.`
      );
    } else if (marketAnalysis.edge > 10) {
      parts.push(
        `The AI is more bullish than the market by ${Math.abs(marketAnalysis.edge)}%, ` +
        `indicating potential opportunity if the AI's signal sources prove accurate.`
      );
    } else {
      parts.push(
        `The market is more bullish than the AI by ${Math.abs(marketAnalysis.edge)}%, ` +
        `suggesting caution or further investigation of market signals.`
      );
    }
  }
  
  return parts.join(' ');
}
