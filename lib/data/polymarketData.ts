// lib/data/polymarketData.ts

/**
 * Mock Polymarket data fetcher
 * In production, this would fetch real odds from Polymarket API
 * For now, we generate realistic mock data
 */

interface PolymarketOdds {
  marketPrice: number; // Probability as percentage (0-100)
  volume: number;
  lastUpdated: string;
}

/**
 * Generate realistic mock market odds
 * This simulates what Polymarket might price the event at
 */
export function getMockPolymarketOdds(event: string): PolymarketOdds | null {
  // Keywords that suggest different market pricing
  const eventLower = event.toLowerCase();
  
  let basePrice = 50; // Default 50/50
  
  // Adjust based on event type
  if (eventLower.includes('bitcoin') || eventLower.includes('btc')) {
    basePrice = Math.floor(Math.random() * 15) + 50; // 50-65%
  } else if (eventLower.includes('trump') || eventLower.includes('election')) {
    basePrice = Math.floor(Math.random() * 20) + 45; // 45-65%
  } else if (eventLower.includes('apple') || eventLower.includes('stock')) {
    basePrice = Math.floor(Math.random() * 20) + 50; // 50-70%
  } else if (eventLower.includes('regulation') || eventLower.includes('law')) {
    basePrice = Math.floor(Math.random() * 15) + 40; // 40-55%
  } else if (eventLower.includes('ai') || eventLower.includes('artificial intelligence')) {
    basePrice = Math.floor(Math.random() * 20) + 55; // 55-75%
  } else {
    // Random for other events
    basePrice = Math.floor(Math.random() * 30) + 40; // 40-70%
  }
  
  // Add some variance
  const variance = Math.floor(Math.random() * 10) - 5; // -5 to +5
  const finalPrice = Math.max(35, Math.min(75, basePrice + variance));
  
  return {
    marketPrice: finalPrice,
    volume: Math.floor(Math.random() * 500000) + 100000, // $100k-$600k volume
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Fetch real Polymarket odds (for future implementation)
 */
export async function fetchPolymarketOdds(event: string): Promise<number | null> {
  try {
    // For now, return mock data
    const mock = getMockPolymarketOdds(event);
    return mock ? mock.marketPrice : null;
    
    // Future: Real API call
    // const response = await fetch(`https://api.polymarket.com/search?q=${encodeURIComponent(event)}`);
    // const data = await response.json();
    // return data.markets[0]?.probability * 100;
  } catch (error) {
    console.error('Error fetching Polymarket odds:', error);
    return null;
  }
}

/**
 * Calculate if market is mispriced
 */
export function isMarketMispriced(aiPrediction: number, marketPrice: number): {
  mispriced: boolean;
  edge: number;
  recommendation: string;
} {
  const edge = aiPrediction - marketPrice;
  const absEdge = Math.abs(edge);
  
  let recommendation = "Aligned";
  
  if (absEdge > 15) {
    recommendation = edge > 0 ? "Strong Buy Signal" : "Strong Sell Signal";
  } else if (absEdge > 10) {
    recommendation = edge > 0 ? "Buy Signal" : "Sell Signal";
  } else if (absEdge > 5) {
    recommendation = edge > 0 ? "Slight Buy" : "Slight Sell";
  }
  
  return {
    mispriced: absEdge > 10,
    edge: Math.round(edge),
    recommendation
  };
}
