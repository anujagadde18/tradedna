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
  const [polymarketData, setPolymarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMultiOutcome, setIsMultiOutcome] = useState(false);
  const [allOutcomes, setAllOutcomes] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      
      try {
        const slug = extractPolymarketSlug(userQuestion);
        
        let response;
        if (slug) {
          response = await fetch(`/api/polymarket?endpoint=events&slug=${slug}`);
        } else {
          response = await fetch(`/api/polymarket?endpoint=markets&query=${encodeURIComponent(userQuestion)}&limit=5`);
        }
        
        if (!response.ok) {
          setError('Failed to fetch Polymarket data');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Polymarket response:', data);
        
        // Extract market from various response formats
        let market = null;
        
        if (Array.isArray(data) && data.length > 0) {
          // Array of events
          const event = data[0];
          if (event.markets && event.markets.length > 0) {
            market = event.markets[0];
          }
        } else if (data.event) {
          // Single event object
          if (data.event.markets && data.event.markets.length > 0) {
            market = data.event.markets[0];
          }
        } else if (data.markets && data.markets.length > 0) {
          // Direct markets array
          market = data.markets[0];
        }
        
        if (!market) {
          setError('No market found');
          setLoading(false);
          return;
        }
        
        console.log('Selected market:', market);
        
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
        
        console.log('Parsed outcomes:', outcomes);
        
        if (!Array.isArray(outcomes) || outcomes.length === 0) {
          setError('No outcomes found');
          setLoading(false);
          return;
        }
        
        // For binary markets (Up/Down, Yes/No), use bestBid/bestAsk as prices
        // This is how Polymarket 5m markets work!
        const isBinary = outcomes.length === 2;
        setIsMultiOutcome(!isBinary);
        
        if (isBinary) {
          // BINARY MARKET (Up/Down, Yes/No)
          // Use bestBid as the YES/UP probability
          const yesProb = market.bestBid || market.lastTradePrice || 0.5;
          const marketOdds = Math.round(yesProb * 100);
          const divergence = Math.abs(aiPrediction - marketOdds);
          
          setComparison({ aiPrediction, marketOdds, divergence });
          setPolymarketData({
            question: market.question,
            marketOdds,
            volume: market.volume,
            outcome: outcomes[0], // "Up" or "Yes"
            url: `https://polymarket.com/event/${market.slug || slug || ''}`
          });
          
        } else {
          // MULTI-OUTCOME MARKET
          // For multi-outcome, we'd need to fetch individual token prices
          // For now, show that it's not supported yet
          setError('Multi-outcome markets not yet supported for this format');
          setLoading(false);
          return;
        }
        
      } catch (error: any) {
        console.error('Error loading Polymarket:', error);
        setError('Failed to load data');
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

      {polymarketData.outcome && (
        <div className="mb-4 text-xs text-gray-400">
          Market: <span className="text-purple-300 font-semibold">{polymarketData.outcome}</span>
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
          ) : (
            <p>💡 Market is {comparison.divergence}% more bullish</p>
          )}
        </div>
      </div>
    </div>
  );
}
