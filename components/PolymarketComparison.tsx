'use client';

import { useState, useEffect } from 'react';

interface Props {
  userQuestion: string;
  aiPrediction: number;
}

function extractPolymarketSlug(text: string): string | null {
  const match = text.match(/polymarket\.com\/event\/([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

export function PolymarketComparison({ userQuestion, aiPrediction }: Props) {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      try {
        const slug = extractPolymarketSlug(userQuestion);
        
        let response;
        if (slug) {
          response = await fetch(`/api/polymarket?endpoint=events&slug=${slug}`);
        } else {
          response = await fetch(`/api/polymarket?endpoint=markets&query=${encodeURIComponent(userQuestion)}&limit=5`);
        }
        
        const data = await response.json();
        
        // Extract first market
        let market = null;
        if (Array.isArray(data) && data.length > 0) {
          market = data[0];
        } else if (data.event && data.event.markets && data.event.markets.length > 0) {
          market = data.event.markets[0];
        } else if (data.markets && data.markets.length > 0) {
          market = data.markets[0];
        }
        
        // Parse outcomes
        let outcomes = null;
        let outcomePrices = null;
        
        if (market) {
          try {
            outcomes = typeof market.outcomes === 'string' 
              ? JSON.parse(market.outcomes) 
              : market.outcomes;
            outcomePrices = typeof market.outcomePrices === 'string'
              ? JSON.parse(market.outcomePrices)
              : market.outcomePrices;
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
        
        setDebugData({
          slug,
          responseKeys: Object.keys(data),
          isArray: Array.isArray(data),
          market: market ? {
            question: market.question,
            active: market.active,
            closed: market.closed,
            outcomesRaw: market.outcomes,
            outcomePricesRaw: market.outcomePrices,
            outcomesParsed: outcomes,
            outcomePricesParsed: outcomePrices,
            tokens: market.tokens,
            allKeys: Object.keys(market)
          } : null,
          fullMarket: market
        });
        
        console.log('=== POLYMARKET DEBUG ===');
        console.log('Full response:', data);
        console.log('Market:', market);
        console.log('Outcomes:', outcomes);
        console.log('Prices:', outcomePrices);
        console.log('=======================');
        
      } catch (error: any) {
        setDebugData({ error: error.message, stack: error.stack });
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [userQuestion]);

  if (loading) {
    return (
      <div className="border border-purple-500/20 rounded-lg p-6 bg-black/40">
        <div className="flex items-center gap-2 text-purple-400">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-yellow-500/30 rounded-lg p-6 bg-black/40 max-h-[600px] overflow-auto">
      <div className="text-sm font-bold text-yellow-400 mb-4">
        🔍 POLYMARKET DEBUG - CHECK CONSOLE (F12)
      </div>
      <pre className="text-xs text-gray-300 bg-black/60 p-4 rounded whitespace-pre-wrap">
        {JSON.stringify(debugData, null, 2)}
      </pre>
      <div className="text-xs text-yellow-400 mt-4">
        Copy this output and share it with me!
      </div>
    </div>
  );
}
