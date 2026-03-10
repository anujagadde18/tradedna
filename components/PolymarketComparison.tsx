'use client';

import { useState, useEffect } from 'react';
import { searchPolymarketMarkets, compareWithPolymarket } from '@/lib/polymarket-integration';

interface Props {
  userQuestion: string;
  aiPrediction: number;
}

export function PolymarketComparison({ userQuestion, aiPrediction }: Props) {
  const [polymarketData, setPolymarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const markets = await searchPolymarketMarkets(userQuestion);
        
        if (markets.length > 0) {
          const market = markets[0];
          const yesPrice = market.outcomePrices[0];
          const comp = compareWithPolymarket(aiPrediction, yesPrice);
          
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

  if (!polymarketData || !comparison) {
    return null;
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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/20">
          <div className="text-xs text-purple-300 mb-2">PlayPicks AI</div>
          <div className="text-3xl font-bold text-white">{comparison.aiPrediction}%</div>
          <div className="text-xs text-gray-400 mt-2">Your custom sources</div>
        </div>

        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/20">
          <div className="text-xs text-blue-300 mb-2">Polymarket Odds</div>
          <div className="text-3xl font-bold text-white">{comparison.marketOdds}%</div>
          <div className="text-xs text-gray-400 mt-2">Market probability</div>
        </div>
      </div>

      <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-300">Divergence</span>
          <span className={`text-sm font-semibold ${getDivergenceColor()}`}>
            {comparison.divergence}%
          </span>
        </div>

        <div className="text-xs text-gray-400">
          {aiHigher ? (
            <p>💡 Your AI model is {comparison.divergence}% more bullish than the market.</p>
          ) : (
            <p>💡 The market is {comparison.divergence}% more bullish than your AI.</p>
          )}
        </div>
      </div>
    </div>
  );
}
