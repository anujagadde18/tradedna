'use client';

import { useState, useEffect } from 'react';

interface Props {
  userQuestion: string;
  aiPrediction: number;
}

// Extract FULL Polymarket URL including specific outcome
function parsePolymarketURL(text: string): { eventSlug: string; outcomeSlug?: string } | null {
  // Match: polymarket.com/event/EVENT-SLUG or
  //        polymarket.com/event/EVENT-SLUG/OUTCOME-SLUG
  const match = text.match(/polymarket\.com\/event\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/i);
  
  if (match) {
    return {
      eventSlug: match[1],
      outcomeSlug: match[2] // Optional - specific outcome like "will-kevin-wilson..."
    };
  }
  
  return null;
}

export function PolymarketComparison({ userQuestion, aiPrediction }: Props) {
  const [polymarketData, setPolymarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchedMarket, setMatchedMarket] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      setMatchedMarket('');
      
      try {
        const urlParse = parsePolymarketURL(userQuestion);
        
        let markets: any[] = [];
        let targetOutcome: string | null = null;
        
        if (urlParse) {
          // USER PROVIDED POLYMARKET URL
          console.log('Polymarket URL detected:', urlParse);
          
          // Fetch by event slug
          const response = await fetch(`/api/polymarket?endpoint=events&slug=${urlParse.eventSlug}`);
          
          if (!response.ok) {
            setError('Failed to fetch Polymarket event');
            setLoading(false);
            return;
          }
          
          const data = await response.json();
          console.log('Event data:', data);
          
          // Extract markets from event
          if (Array.isArray(data) && data.length > 0) {
            const event = data[0];
            markets = event.markets || [];
          } else if (data.event && data.event.markets) {
            markets = data.event.markets;
          }
          
          // If URL has specific outcome slug, try to match it
          if (urlParse.outcomeSlug && markets.length > 0) {
            console.log('Looking for outcome:', urlParse.outcomeSlug);
            
            // Try to find market that matches the outcome slug
            const matchedMarket = markets.find((m: any) => 
              m.slug === urlParse.outcomeSlug || 
              m.slug?.includes(urlParse.outcomeSlug) ||
              m.question?.toLowerCase().includes(urlParse.outcomeSlug.replace(/-/g, ' '))
            );
            
            if (matchedMarket) {
              console.log('Found matching outcome market:', matchedMarket.question);
              markets = [matchedMarket];
            } else {
              console.log('No exact match, will use first market');
            }
          }
          
        } else {
          // USER PROVIDED TEXT QUERY - SEARCH POLYMARKET
          console.log('Text query, searching Polymarket for:', userQuestion);
          
          const response = await fetch(
            `/api/polymarket?endpoint=markets&query=${encodeURIComponent(userQuestion)}&limit=10`
          );
          
          if (!response.ok) {
            setError('Failed to search Polymarket');
            setLoading(false);
            return;
          }
          
          const data = await response.json();
          console.log('Search results:', data);
          
          if (Array.isArray(data)) {
            markets = data;
          } else if (data.markets) {
            markets = data.markets;
          }
          
          // Filter for active markets only
          markets = markets.filter((m: any) => m.active !== false && m.closed !== true);
        }
        
        console.log('Markets to process:', markets.length);
        
        if (markets.length === 0) {
          setError('No matching markets found on Polymarket');
          setLoading(false);
          return;
        }
        
        // Process first/best matching market
        const market = markets[0];
        console.log('Using market:', market.question);
        setMatchedMarket(market.question || market.title || 'Unknown market');
        
        // Parse outcomes
        let outcomes;
        try {
          outcomes = typeof market.outcomes === 'string' 
            ? JSON.parse(market.outcomes) 
            : market.outcomes;
        } catch (e) {
          console.error('Parse error:', e);
          setError('Invalid market format');
          setLoading(false);
          return;
        }
        
        console.log('Outcomes:', outcomes);
        
        if (!Array.isArray(outcomes) || outcomes.length === 0) {
          setError('No outcomes in market');
          setLoading(false);
          return;
        }
        
        // Determine probability
        let marketOdds: number;
        
        if (outcomes.length === 2) {
          // BINARY MARKET (Yes/No, Up/Down)
          // Use bestBid or lastTradePrice
          const prob = market.bestBid || market.lastTradePrice || market.bestAsk || 0.5;
          marketOdds = Math.round(prob * 100);
          console.log('Binary market, using bestBid/lastTradePrice:', prob, '→', marketOdds + '%');
          
        } else {
          // MULTI-OUTCOME MARKET
          // Need outcomePrices
          let outcomePrices;
          try {
            outcomePrices = typeof market.outcomePrices === 'string'
              ? JSON.parse(market.outcomePrices)
              : market.outcomePrices;
          } catch (e) {
            console.error('Price parse error:', e);
            setError('Cannot parse market prices');
            setLoading(false);
            return;
          }
          
          if (!Array.isArray(outcomePrices) || outcomePrices.length === 0) {
            setError('No prices available for multi-outcome market');
            setLoading(false);
            return;
          }
          
          // Find highest probability outcome
          const maxPrice = Math.max(...outcomePrices.map((p: any) => parseFloat(p || '0')));
          marketOdds = Math.round(maxPrice * 100);
          console.log('Multi-outcome market, top probability:', marketOdds + '%');
        }
        
        const divergence = Math.abs(aiPrediction - marketOdds);
        
        setComparison({ aiPrediction, marketOdds, divergence });
        setPolymarketData({
          question: market.question,
          marketOdds,
          volume: market.volume,
          url: market.slug 
            ? `https://polymarket.com/event/${market.slug}`
            : `https://polymarket.com`
        });
        
      } catch (error: any) {
        console.error('Error:', error);
        setError('Failed to load Polymarket data');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [userQuestion, aiPrediction]);

  if (loading) {
    return (
      <div className="border border-purple-500/20 rounded-lg p-6 bg-black/40">
        <div className="flex items-center gap-2 text-purple-400">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Comparing with Polymarket...</span>
        </div>
      </div>
    );
  }

  if (error || !polymarketData || !comparison) {
    return (
      <div className="border border-gray-700 rounded-lg p-6 bg-black/40">
        <div className="text-sm text-gray-400 mb-2">
          💡 <strong>Polymarket Comparison</strong>
        </div>
        <div className="text-xs text-gray-500 mb-3">
          {error || 'No matching market found'}
        </div>
        {matchedMarket && (
          <div className="text-xs text-gray-400 mb-3">
            Searched for: <span className="text-purple-300">{matchedMarket}</span>
          </div>
        )}
        <a 
          href={`https://polymarket.com/search?q=${encodeURIComponent(userQuestion)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          Search on Polymarket →
        </a>
      </div>
    );
  }

  const getDivergenceColor = () => {
    if (comparison.divergence <= 5) return 'text-green-400';
    if (comparison.divergence <= 15) return 'text-yellow-400';
    if (comparison.divergence <= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const aiHigher = comparison.aiPrediction > comparison.marketOdds;

  return (
    <div className="border border-purple-500/30 rounded-lg p-6 bg-gradient-to-br from-purple-900/10 to-black/40">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <h3 className="text-lg font-semibold text-white">AI vs Market</h3>
        </div>
        <a 
          href={polymarketData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          View on Polymarket →
        </a>
      </div>

      {matchedMarket && (
        <div className="mb-4 p-3 bg-black/30 rounded-lg border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">Matched Market:</div>
          <div className="text-sm text-white font-medium">{matchedMarket}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/20">
          <div className="text-xs text-purple-300 mb-2">PlayPicks AI</div>
          <div className="text-3xl font-bold text-white">{comparison.aiPrediction}%</div>
          <div className="text-xs text-gray-400 mt-2">Your sources</div>
        </div>

        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/20">
          <div className="text-xs text-blue-300 mb-2">Polymarket</div>
          <div className="text-3xl font-bold text-white">{comparison.marketOdds}%</div>
          <div className="text-xs text-gray-400 mt-2">Market odds</div>
        </div>
      </div>

      <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Divergence</span>
          <span className={`text-sm font-semibold ${getDivergenceColor()}`}>
            {comparison.divergence}%
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {aiHigher ? (
            <p>💡 AI is {comparison.divergence}% more bullish</p>
          ) : comparison.divergence === 0 ? (
            <p>✅ AI and market agree perfectly</p>
          ) : (
            <p>💡 Market is {comparison.divergence}% more bullish</p>
          )}
        </div>
      </div>
    </div>
  );
}
