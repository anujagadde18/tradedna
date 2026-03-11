/**
 * POLYMARKET API INTEGRATION - MULTI-OUTCOME SUPPORT
 * Handles both binary (YES/NO) and categorical (multi-outcome) markets
 */

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

interface PolymarketMarket {
  id: string;
  question: string;
  outcomePrices: string[];
  outcomes: string[];
  volume: string;
  liquidity: string;
  endDate: string;
  active: boolean;
  slug?: string;
  condition_id?: string;
}

interface MarketOutcome {
  name: string;
  probability: number;
  priceRaw: string;
}

/**
 * Search Polymarket markets by question text
 */
export async function searchPolymarketMarkets(query: string): Promise<PolymarketMarket[]> {
  try {
    console.log('Searching Polymarket for:', query);
    
    const response = await fetch(
      `/api/polymarket?endpoint=markets&query=${encodeURIComponent(query)}&limit=5`
    );
    
    if (!response.ok) {
      console.error('Polymarket API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log('Polymarket API response:', data);
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.markets && Array.isArray(data.markets)) {
      return data.markets;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    console.warn('Unexpected Polymarket response format:', data);
    return [];
    
  } catch (error) {
    console.error('Error searching Polymarket:', error);
    return [];
  }
}

/**
 * Get probability percentage from outcome price
 */
export function getProbabilityFromPrice(price: string | number): number {
  try {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numPrice)) {
      console.error('Invalid price value:', price);
      return 0;
    }
    
    // Handle both decimal (0.53) and percentage (53) formats
    if (numPrice <= 1) {
      // Decimal format (0.53 = 53%)
      return Math.round(numPrice * 100);
    } else {
      // Already percentage format (53 = 53%)
      return Math.round(numPrice);
    }
  } catch (error) {
    console.error('Error parsing probability:', error);
    return 0;
  }
}

/**
 * NEW: Get top outcome from multi-outcome market
 */
export function getTopOutcome(market: PolymarketMarket): MarketOutcome | null {
  try {
    if (!market.outcomes || !market.outcomePrices) {
      return null;
    }

    const outcomes = market.outcomes.map((name, idx) => ({
      name,
      probability: getProbabilityFromPrice(market.outcomePrices[idx]),
      priceRaw: market.outcomePrices[idx]
    }));

    // Sort by highest probability
    outcomes.sort((a, b) => b.probability - a.probability);

    return outcomes[0] || null;
  } catch (error) {
    console.error('Error getting top outcome:', error);
    return null;
  }
}

/**
 * NEW: Get all outcomes from multi-outcome market
 */
export function getAllOutcomes(market: PolymarketMarket): MarketOutcome[] {
  try {
    if (!market.outcomes || !market.outcomePrices) {
      return [];
    }

    const outcomes = market.outcomes.map((name, idx) => ({
      name,
      probability: getProbabilityFromPrice(market.outcomePrices[idx]),
      priceRaw: market.outcomePrices[idx]
    }));

    // Sort by highest probability
    outcomes.sort((a, b) => b.probability - a.probability);

    return outcomes;
  } catch (error) {
    console.error('Error getting all outcomes:', error);
    return [];
  }
}

/**
 * Check if market is binary (YES/NO) or multi-outcome
 */
export function isMultiOutcomeMarket(market: PolymarketMarket): boolean {
  return market.outcomePrices && market.outcomePrices.length > 2;
}

/**
 * Compare PlayPicks AI prediction with Polymarket market odds
 */
export function compareWithPolymarket(
  aiPrediction: number,
  polymarketPrice: string | number
): {
  aiPrediction: number;
  marketOdds: number;
  divergence: number;
  agreement: 'strong' | 'moderate' | 'weak' | 'disagree';
} {
  try {
    const marketOdds = getProbabilityFromPrice(polymarketPrice);
    const divergence = Math.abs(aiPrediction - marketOdds);
    
    let agreement: 'strong' | 'moderate' | 'weak' | 'disagree';
    if (divergence <= 5) agreement = 'strong';
    else if (divergence <= 15) agreement = 'moderate';
    else if (divergence <= 30) agreement = 'weak';
    else agreement = 'disagree';
    
    return { aiPrediction, marketOdds, divergence, agreement };
  } catch (error) {
    console.error('Error comparing with Polymarket:', error);
    return { 
      aiPrediction, 
      marketOdds: 0, 
      divergence: 0, 
      agreement: 'disagree' 
    };
  }
}
