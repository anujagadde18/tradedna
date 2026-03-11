'use client';

import { useState, useEffect } from 'react';
import { searchPolymarketMarkets, compareWithPolymarket, getTopOutcome } from '@/lib/polymarket-integration';

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
        const markets = await searchPolymarketMarkets(userQuestion);
        
        console.log('Polymarket search results:', markets);
        
        if (!markets || markets.length === 0) {
          setError('No matching Polymarket market found');
          setLoading(false);
          return;
        }
        
        const market = markets[0];
        console.log('Selected market:', market);
        
        // Validate market has outcomes
        if (!market.outcomePrices || !Array.isArray(market.outcomePrices) || market.outcomePrices.length === 0) {
          setError('Invalid market data format');
          setLoading(false);
          return;
        }

        // Check if multi-outcome market (more than 2 outcomes)
        const isMulti = market.outcomePrices.length > 2;
        setIsMultiOutcome(isMulti);

        if (isMulti) {
          // MULTI-OUTCOME MARKET (e.g., UEFA Champions League Winner)
          console.log('Multi-outcome market detected');
          
          // Get all outcomes with their probabilities
          const outcomes = market.outcomes.map((name: string, idx: number) => ({
            name,
            probability: parseFloat(market.outcomePrices[idx]) * 100,
            priceRaw: market.outcomePrices[idx]
          })).sort((a: any, b: any) => b.probability - a.probability); // Sort by highest probability
          
          setAllOutcomes(outcomes);
          
          // Use the TOP outcome for comparison
          const topOutcome = outcomes[0];
          const topPrice = market.outcomePrices[market.outcomes.indexOf(topOutcome.name)];
          
          console.log('Top outcome:', topOutcome.name, topPrice);
          
          const comp = compareWithPolymarket(aiPrediction, topPrice);
          
          setComparison(comp);
          setPolymarketData({
            question: market.question,
            marketOdds: comp.marketOdds,
            volume: market.volume,
            topOutcome: topOutcome.name,
            url: `https://polymarket.com/event/${market.slug || market.id}`
          });
          
        } else {
          // BINARY MARKET (YES/NO)
          console.log('Binary market detected');
          
          const yesPrice = market.outcomePrices[0];
          
          if (!yesPrice || isNaN(parseFloat(yesPrice))) {
            setError('Invalid price data');
            setLoading(false);
            return;
          }
          
          const comp = compareWithPolymarket(aiPrediction, yesPrice);
          
          if (isNaN(comp.marketOdds) || isNaN(comp.divergence)) {
            setError('Failed to calculate comparison');
            setLoading(false);
            return;
          }
          
          setComparison(comp);
          setPolymarketData({
            question: market.question,
            marketOdds: comp.marketOdds,
            volume: market.volume,
            url: `https://polymarket.com/event/${market.slug || market.id}`
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
        <div className="text-xs text-gray-500">
          {error || 'No matching market found on Polymarket for this event.'}
        </div>
        <a 
          href={`https://polymarket.com/search?q=${encodeURIComponent(userQuestion)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-block"
        >
          Search on Polymarket →
        </a>
      </div>
    );
  }

  if (isNaN(comparison.marketOdds) || isNaN(comparison.divergence)) {
    return (
      <div className="border border-gray-700 rounded-lg p-6 bg-black/40">
        <div className="text-sm text-gray-400">
          Unable to compare with Polymarket (invalid data)
        </div>
      </div>
    );
  }

  const getDivergenceColor = () => {
    if (comparison.agreement === 'strong') return 'text-green-400';
    if (comparison.agreement === 'moderate') return 'text-yellow-400';
    if (comparison.agreement === 'weak') return 'text-orange-400';
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

      {/* MULTI-OUTCOME: Show top outcome name */}
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

      {/* MULTI-OUTCOME: Show all outcomes */}
      {isMultiOutcome && allOutcomes.length > 0 && (
        <div className="mb-6 bg-black/30 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-3 font-semibold">ALL OUTCOMES</div>
          <div className="space-y-2">
            {allOutcomes.slice(0, 5).map((outcome, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-xs text-gray-300">{outcome.name}</span>
                <span className="text-sm font-bold text-white">{Math.round(outcome.probability)}%</span>
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
