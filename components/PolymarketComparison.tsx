'use client';

import { useState, useEffect } from 'react';

interface Props {
  userQuestion: string;
  aiPrediction: number;
}

// Extract Polymarket slug from URL
function extractPolymarketSlug(text: string): string | null {
  const match = text.match(/polymarket\.com\/event\/([a-z0-9-]+)/i);
  return match ? match[1] : null;
}

// Clean question for search
function cleanSearchQuery(text: string): string {
  // Remove URLs
  let cleaned = text.replace(/https?:\/\/[^\s]+/g, '');
  // Remove extra whitespace
  cleaned = cleaned.trim();
  return cleaned || text;
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
        const searchQuery = cleanSearchQuery(userQuestion);
        
        console.log('Question:', userQuestion);
        console.log('Extracted slug:', slug);
        console.log('Search query:', searchQuery);
        
        let response;
        
        if (slug) {
          // Try fetching by slug first
          console.log('Attempting slug fetch:', slug);
          response = await fetch(`/api/polymarket?endpoint=events&slug=${slug}`);
        } else {
          // Search by query
          console.log('Searching by query:', searchQuery);
          response = await fetch(`/api/polymarket?endpoint=markets&query=${encodeURIComponent(searchQuery)}&limit=10`);
        }
        
        if (!response.ok) {
          setError('Failed to fetch Polymarket data');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Extract markets from various response formats
        let markets = [];
        
        if (Array.isArray(data)) {
          markets = data;
        } else if (data.event) {
          // Single event response
          if (data.event.markets) {
            markets = data.event.markets;
          } else if (Array.isArray(data.event)) {
            markets = data.event;
          }
        } else if (data.markets) {
          markets = data.markets;
        }
        
        console.log('Extracted markets:', markets.length);
        
        if (!markets || markets.length === 0) {
          setError('No markets found');
          setLoading(false);
          return;
        }
        
        // Filter active markets
        const activeMarkets = markets.filter((m: any) => {
          // More lenient filtering
          const isActive = m.active !== false && m.closed !== true;
          console.log(`Market "${m.question}": active=${m.active}, closed=${m.closed}, using=${isActive}`);
          return isActive;
        });
        
        console.log('Active markets:', activeMarkets.length);
        
        if (activeMarkets.length === 0) {
          // Try ALL markets if no active ones
          console.log('No active markets, trying all markets');
          if (markets.length > 0) {
            processMarket(markets[0]);
            return;
          }
          setError('No markets available');
          setLoading(false);
          return;
        }
        
        processMarket(activeMarkets[0]);
        
      } catch (error: any) {
        console.error('Error loading Polymarket:', error);
        setError('Failed to load data: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
    
    function processMarket(market: any) {
      console.log('Processing market:', market);
      
      // Parse outcomes - handle multiple formats
      let outcomes: string[] = [];
      let outcomePrices: string[] = [];
      
      try {
        // Format 1: Stringified JSON
        if (typeof market.outcomes === 'string') {
          outcomes = JSON.parse(market.outcomes);
        } else if (Array.isArray(market.outcomes)) {
          outcomes = market.outcomes;
        }
        
        if (typeof market.outcomePrices === 'string') {
          outcomePrices = JSON.parse(market.outcomePrices);
        } else if (Array.isArray(market.outcomePrices)) {
          outcomePrices = market.outcomePrices;
        }
        
        // Format 2: tokens array (alternative format)
        if ((!outcomes || outcomes.length === 0) && market.tokens) {
          outcomes = market.tokens.map((t: any) => t.outcome);
          outcomePrices = market.tokens.map((t: any) => t.price || '0');
        }
        
        console.log('Parsed outcomes:', outcomes);
        console.log('Parsed prices:', outcomePrices);
        
      } catch (e) {
        console.error('Parse error:', e);
        setError('Could not parse market data');
        return;
      }
      
      // Validate
      if (!outcomes || !outcomePrices || outcomes.length === 0 || outcomePrices.length === 0) {
        console.error('Invalid market structure:', { outcomes, outcomePrices });
        setError('Market has no valid outcomes');
        return;
      }
      
      if (outcomes.length !== outcomePrices.length) {
        console.error('Outcomes/prices mismatch:', outcomes.length, 'vs', outcomePrices.length);
        setError('Mismatched market data');
        return;
      }
      
      // Filter valid outcomes (non-zero prices)
      const validOutcomes = outcomes.map((name: string, idx: number) => ({
        name,
        price: parseFloat(outcomePrices[idx] || '0')
      })).filter(o => o.price > 0);
      
      console.log('Valid outcomes:', validOutcomes);
      
      if (validOutcomes.length === 0) {
        setError('No active outcomes in this market');
        return;
      }
      
      // Multi-outcome vs binary
      const isMulti = validOutcomes.length > 2;
      setIsMultiOutcome(isMulti);
      
      if (isMulti) {
        // Multi-outcome
        const outcomesList = validOutcomes
          .map((o: any) => ({
            name: o.name,
            probability: Math.round(o.price * 100)
          }))
          .sort((a: any, b: any) => b.probability - a.probability);
        
        setAllOutcomes(outcomesList);
        
        const topOutcome = outcomesList[0];
        const marketOdds = topOutcome.probability;
        const divergence = Math.abs(aiPrediction - marketOdds);
        
        setComparison({ aiPrediction, marketOdds, divergence });
        setPolymarketData({
          question: market.question,
          marketOdds,
          volume: market.volume,
          topOutcome: topOutcome.name,
          url: market.slug 
            ? `https://polymarket.com/event/${market.slug}`
            : `https://polymarket.com`
        });
        
      } else {
        // Binary
        const yesOutcome = validOutcomes[0];
        const marketOdds = Math.round(yesOutcome.price * 100);
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

      {isMultiOutcome && polymarketData.topOutcome && (
        <div className="mb-4 text-xs text-gray-400">
          Leading: <span className="text-purple-300 font-semibold">{polymarketData.topOutcome}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/20">
          <div className="text-xs text-purple-300 mb-2">PlayPicks AI</div>
          <div className="text-3xl font-bold text-white">{comparison.aiPrediction}%</div>
        </div>

        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/20">
          <div className="text-xs text-blue-300 mb-2">Polymarket</div>
          <div className="text-3xl font-bold text-white">{comparison.marketOdds}%</div>
        </div>
      </div>

      {isMultiOutcome && allOutcomes.length > 1 && (
        <div className="mb-6 bg-black/30 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-3 font-semibold">ALL OUTCOMES</div>
          <div className="space-y-2">
            {allOutcomes.slice(0, 5).map((outcome, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-xs text-gray-300">{outcome.name}</span>
                <span className="text-sm font-bold text-white">{outcome.probability}%</span>
              </div>
            ))}
            {allOutcomes.length > 5 && (
              <div className="text-xs text-gray-500 mt-2">
                +{allOutcomes.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

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
