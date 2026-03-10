/**
 * POLYMARKET API INTEGRATION
 * Real-time market data from Polymarket Gamma API
 * No authentication required for public data
 */

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string[]; // [YES price, NO price]
  outcomes: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  active: boolean;
  slug?: string;
  description?: string;
}

/**
 * Search Polymarket markets by question text
 */
export async function searchPolymarketMarkets(query: string): Promise<PolymarketMarket[]> {
  try {
    const response = await fetch(
      `/api/polymarket?endpoint=markets&query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      console.error('Polymarket search failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error searching Polymarket:', error);
    return [];
  }
}

/**
 * Get probability percentage from Polymarket price
 * Price format: "0.53" = 53%
 */
export function getProbabilityFromPrice(price: string): number {
  return Math.round(parseFloat(price) * 100);
}

/**
 * Compare PlayPicks AI prediction with Polymarket market odds
 */
export function compareWithPolymarket(
  aiPrediction: number, // 0-100
  polymarketPrice: string // "0.53"
): {
  aiPrediction: number;
  marketOdds: number;
  divergence: number;
  agreement: 'strong' | 'moderate' | 'weak' | 'disagree';
} {
  const marketOdds = getProbabilityFromPrice(polymarketPrice);
  const divergence = Math.abs(aiPrediction - marketOdds);
  
  let agreement: 'strong' | 'moderate' | 'weak' | 'disagree';
  if (divergence <= 5) agreement = 'strong';
  else if (divergence <= 15) agreement = 'moderate';
  else if (divergence <= 30) agreement = 'weak';
  else agreement = 'disagree';
  
  return {
    aiPrediction,
    marketOdds,
    divergence,
    agreement
  };
}
