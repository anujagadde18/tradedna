'use client';

import { useState, useEffect } from 'react';

interface Props {
  userQuestion: string;
  aiPrediction: number;
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
        const response = await fetch(
          `/api/polymarket?endpoint=markets&query=${encodeURIComponent(userQuestion)}&limit=10`
        );
        
        if (!response.ok) {
          setError('Failed to fetch Polymarket data');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Polymarket raw response:', data);
        
        if (!Array.isArray(data) || data.length === 0) {
          setError('No matching markets found');
          setLoading(false);
          return;
        }
        
        // FILTER OUT CLOSED MARKETS - only use active ones
        const activeMarkets = data.filter(m => m.active === true && m.closed === false);
        console.log('Active markets:', activeMarkets.length, 'out of', data.length);
        
        if (activeMarkets.length === 0) {
          setError('No active markets found (all are closed)');
          setLoading(false);
          return;
        }
        
        const market = activeMarkets[0];
        console.log('Selected market:', market.question);
        
        // FIX: Parse stringified JSON arrays
        let outcomes, outcomePrices;
        
        try {
          outcomes = typeof market.outcomes === 'string' 
            ? JSON.parse(market.outcomes) 
            : market.outcomes;
            
          outcomePrices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          setError('Invalid market data format');
          setLoading(false);
          return;
        }
        
        console.log('Parsed outcomes:', outcomes);
        console.log('Parsed prices:', outcomePrices);
        
        if (!Array.isArray(outcomes) || !Array.isArray(outcomePrices) || outcomes.length === 0) {
          setError('Invalid market structure');
          setLoading(false);
          return;
        }
        
        // Check if multi-outcome (more than 2 options)
        const isMulti = outcomes.length > 2;
        setIsMultiOutcome(isMulti);
        
        if (isMulti) {
          // MULTI-OUTCOME MARKET
          const outcomesList = outcomes.map((name: string, idx: number) => ({
            name,
            probability: Math.round(parseFloat(outcomePrices[idx]) * 100),
            priceRaw: outcomePrices[idx]
          })).sort((a: any, b: any) => b.probability - a.probability);
          
          setAllOutcomes(outcomesList);
          
          const topOutcome = outcomesList[0];
          const marketOdds = topOutcome.probability;
          const divergence = Math.abs(aiPrediction - marketOdds);
          
          setComparison({
            aiPrediction,
            marketOdds,
            divergence,
            agreement: divergence <= 15 ? 'moderate' : 'weak'
          });
          
          setPolymarketData({
            question: market.question,
            marketOdds,
            volume: market.volume,
            topOutcome: topOutcome.name,
            url: `https://polymarket.com/event/${market.slug}`
          });
          
        } else {
          // BINARY MARKET (YES/NO)
          const yesPrice = outcomePrices[0];
          const marketOdds = Math.round(parseFloat(yesPrice) * 100);
          const divergence = Math.abs(aiPrediction - marketOdds);
          
          setComparison({
            aiPrediction,
            marketOdds,
            divergence,
            agreement: divergence <= 15 ? 'moderate' : 'weak'
          });
          
          setPolymarketData({
            question: market.question,
            marketOdds,
            volume: market.volume,
            url: `https://polymarket.com/event/${market.slug}`
          });
        }
        
      } catch (error) {
        console.error('Error loading Polymarket:', error);
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
          <span>Comparing with Polymarket odds...</span>
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
          <h3 className="text-lg font-semibold text-white">AI vs Market Comparison</h3>
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
          Comparing to leading outcome: <span className="text-purple-300 font-semibold">{polymarketData.topOutcome}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/20">
          <div className="text-xs text-purple-300 mb-2">PlayPicks AI</div>
          <div className="text-3xl font-bold text-white">{comparison.aiPrediction}%</div>
          <div className="text-xs text-gray-400 mt-2">Your custom sources</div>
        </div>

        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/20">
          <div className="text-xs text-blue-300 mb-2">
            {isMultiOutcome ? 'Market Leader' : 'Polymarket Odds'}
          </div>
          <div className="text-3xl font-bold text-white">{comparison.marketOdds}%</div>
          <div className="text-xs text-gray-400 mt-2">
            {isMultiOutcome ? polymarketData.topOutcome : 'Market probability'}
          </div>
        </div>
      </div>

      {isMultiOutcome && allOutcomes.length > 0 && (
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
                +{allOutcomes.length - 5} more options
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-300">Divergence</span>
          <span className={`text-sm font-semibold ${getDivergenceColor()}`}>
            {comparison.divergence}%
          </span>
        </div>

        <div className="text-xs text-gray-400">
          {aiHigher ? (
            <p>💡 Your AI model is {comparison.divergence}% more bullish than the {isMultiOutcome ? 'leading outcome' : 'market'}.</p>
          ) : (
            <p>💡 The {isMultiOutcome ? 'leading outcome' : 'market'} is {comparison.divergence}% more bullish than your AI.</p>
          )}
        </div>
      </div>
    </div>
  );
}
