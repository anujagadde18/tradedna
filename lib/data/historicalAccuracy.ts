// lib/data/historicalAccuracy.ts

export type ComponentAccuracy = {
  component: "social" | "news" | "technical";
  winRate: number;
  sampleSize: number;
  confidence: "high" | "medium" | "low";
};

export type CategoryAccuracy = {
  [category: string]: ComponentAccuracy[];
};

// Based on simulated backtested data
// You'll update these with real performance data over time
export const HISTORICAL_ACCURACY: CategoryAccuracy = {
  politics: [
    { component: "news", winRate: 68, sampleSize: 127, confidence: "high" },
    { component: "social", winRate: 62, sampleSize: 127, confidence: "high" },
    { component: "technical", winRate: 45, sampleSize: 127, confidence: "medium" },
  ],
  sports: [
    { component: "social", winRate: 71, sampleSize: 89, confidence: "high" },
    { component: "technical", winRate: 64, sampleSize: 89, confidence: "medium" },
    { component: "news", winRate: 58, sampleSize: 89, confidence: "medium" },
  ],
  crypto: [
    { component: "technical", winRate: 69, sampleSize: 203, confidence: "high" },
    { component: "social", winRate: 65, sampleSize: 203, confidence: "high" },
    { component: "news", winRate: 54, sampleSize: 203, confidence: "medium" },
  ],
  entertainment: [
    { component: "news", winRate: 73, sampleSize: 56, confidence: "medium" },
    { component: "social", winRate: 58, sampleSize: 56, confidence: "medium" },
    { component: "technical", winRate: 42, sampleSize: 56, confidence: "low" },
  ],
  finance: [
    { component: "technical", winRate: 66, sampleSize: 145, confidence: "high" },
    { component: "news", winRate: 61, sampleSize: 145, confidence: "high" },
    { component: "social", winRate: 52, sampleSize: 145, confidence: "medium" },
  ],
  tech: [
    { component: "news", winRate: 64, sampleSize: 98, confidence: "medium" },
    { component: "social", winRate: 59, sampleSize: 98, confidence: "medium" },
    { component: "technical", winRate: 51, sampleSize: 98, confidence: "low" },
  ],
  general: [
    { component: "news", winRate: 58, sampleSize: 234, confidence: "medium" },
    { component: "social", winRate: 56, sampleSize: 234, confidence: "medium" },
    { component: "technical", winRate: 48, sampleSize: 234, confidence: "low" },
  ],
};

export function getComponentAccuracy(
  category: string, 
  component: "social" | "news" | "technical"
): ComponentAccuracy | null {
  const categoryData = HISTORICAL_ACCURACY[category.toLowerCase()];
  if (!categoryData) {
    // Fallback to general if category not found
    const generalData = HISTORICAL_ACCURACY["general"];
    return generalData.find(c => c.component === component) || null;
  }
  return categoryData.find(c => c.component === component) || null;
}

export function getBestComponent(category: string): ComponentAccuracy | null {
  const categoryData = HISTORICAL_ACCURACY[category.toLowerCase()] || HISTORICAL_ACCURACY["general"];
  if (!categoryData) return null;
  return categoryData.reduce((best, current) => 
    current.winRate > best.winRate ? current : best
  );
}

export function getRecommendedWeights(category: string): { social: number; news: number; technical: number } {
  const best = getBestComponent(category);
  if (!best) return { social: 40, news: 35, technical: 25 }; // Default

  const categoryData = HISTORICAL_ACCURACY[category.toLowerCase()] || HISTORICAL_ACCURACY["general"];
  
  // Weight based on win rates
  const total = categoryData.reduce((sum, c) => sum + c.winRate, 0);
  const weights = categoryData.reduce((acc, c) => {
    acc[c.component] = Math.round((c.winRate / total) * 100);
    return acc;
  }, {} as Record<string, number>);

  // Normalize to 100
  const sum = (weights.social || 33) + (weights.news || 33) + (weights.technical || 34);
  return {
    social: Math.round(((weights.social || 33) / sum) * 100),
    news: Math.round(((weights.news || 33) / sum) * 100),
    technical: 100 - Math.round(((weights.social || 33) / sum) * 100) - Math.round(((weights.news || 33) / sum) * 100),
  };
}
