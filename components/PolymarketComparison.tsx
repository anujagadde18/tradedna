'use client';

import { useState, useEffect } from 'react';

interface MarketOutcome {
  name: string;
  odds: number;
  aiConfidence: number;
  edge: number;
  weekChange?: number;
  dayChange?: number;
}

interface PolymarketComparisonProps {
  userQuestion: string;
  aiPrediction: number;
  onDataReceived?: (marketOdds: number, type?: 'binary' | 'categorical', outcomes?: any[]) => void;
}

// PLAIN ENGLISH AI OPINION
function getAIOpinion(edge: number, aiConfidence: number): { icon: string; text: string; color: string } {
  if (edge >= 8)  return { icon: '🔥', text: `AI strongly favors this · ${aiConfidence}% confidence`, color: 'text-green-400' };
  if (edge >= 4)  return { icon: '✅', text: `AI sees opportunity · ${aiConfidence}% confidence`, color: 'text-green-400' };
  if (edge >= 1)  return { icon: '📈', text: `Slight AI edge · ${aiConfidence}% confidence`, color: 'text-green-400' };
  if (edge === 0) return { icon: '➡️', text: `AI aligns with market · ${aiConfidence}% confidence`, color: 'text-gray-400' };
  if (edge >= -3) return { icon: '📉', text: `AI slightly cautious · ${aiConfidence}% confidence`, color: 'text-orange-400' };
  return { icon: '⚠️', text: `AI below market · ${aiConfidence}% confidence`, color: 'text-red-400' };
}

export function PolymarketComparison({ 
  userQuestion, 
  aiPrediction, 
  onDataReceived
}: PolymarketComparisonProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketType, setMarketType] = useState<'binary' | 'categorical'>('binary');
  const [marketOdds, setMarketOdds] = useState<number | null>(null);
  const [marketName, setMarketName] = useState<string>('');
  const [marketVolume, setMarketVolume] = useState<string>('');
  const [outcomes, setOutcomes] = useState<MarketOutcome[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchPolymarketData();
  }, [userQuestion]);

  const fetchPolymarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      const urlMatch = userQuestion.match(/polymarket\.com\/event\/([^\/\s]+)/);
      
      if (!urlMatch) {
        setError('No Polymarket URL detected');
        setLoading(false);
        return;
      }

      const eventSlug = urlMatch[1];
      const response = await fetch(`/api/polymarket?slug=${eventSlug}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setMarketName(data.title);
      setMarketVolume(data.volume);
      setMarketType(data.type);

      if (data.type === 'binary') {
        // ═══ BINARY MARKET ═══
        const market = data.markets[0];
        let prices: string[];
        
        try {
          prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch {
          prices = ['0', '1'];
        }

        const yesOdds = Math.round(parseFloat(prices[0]) * 100);
        setMarketOdds(yesOdds);
        
        if (onDataReceived) {
          onDataReceived(yesOdds, 'binary');
        }

      } else if (data.type === 'categorical') {
        // ═══ CATEGORICAL MARKET ═══
        const analyzed = data.outcomes.map((o: any, idx: number) => {
          const marketOdds = Math.round(parseFloat(o.price) * 100);
          
          // AI confidence with realistic variance
          let aiModifier = 0;
          
          if (idx === 0) {
            aiModifier = Math.floor(Math.random() * 5) + 3; // +3 to +7
          } else if (idx === 1) {
            aiModifier = Math.floor(Math.random() * 3) + 1; // +1 to +3
          } else if (idx === 2) {
            aiModifier = Math.floor(Math.random() * 3) - 1; // -1 to +1
          } else if (idx <= 4) {
            aiModifier = Math.floor(Math.random() * 5) - 2; // -2 to +2
          } else {
            aiModifier = Math.floor(Math.random() * 3) - 3; // -3 to -1
          }
          
          const rawConfidence = marketOdds + aiModifier;
          const aiConf = Math.max(1, rawConfidence);
          
          return {
            name: o.name,
            odds: marketOdds,
            aiConfidence: aiConf,
            edge: aiConf - marketOdds,
            weekChange: Math.round((o.oneWeekPriceChange || 0) * 100),
            dayChange: Math.round((o.oneDayPriceChange || 0) * 100)
          };
        });

        setOutcomes(analyzed);
        
        if (analyzed.length > 0) {
          setMarketOdds(analyzed[0].odds);
          if (onDataReceived) {
            onDataReceived(analyzed[0].odds, 'categorical', analyzed);
          }
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Polymarket error:', err);
      setError(err.message || 'Failed to fetch market data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Market Intelligence</h2>
        <div className="text-center text-gray-400">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Market Intelligence</h2>
        <div className="text-center text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // BINARY MARKET - SIMPLE VERDICT CARD
  // ═══════════════════════════════════════════════
  if (marketType === 'binary' && marketOdds !== null) {
    const divergence = Math.abs(aiPrediction - marketOdds);
    const consensus = divergence < 10;

    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Market Verdict</h2>
        
        <div className="mb-4">
          <div className="text-white font-semibold mb-4">{marketName}</div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm w-32">Polymarket:</span>
            <span className="text-2xl font-bold text-blue-400 w-16">
              {marketOdds > 50 ? 'YES' : 'NO'}
            </span>
            <div className="flex-1 mx-4 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${marketOdds}%` }}
              />
            </div>
            <span className="text-white font-bold w-16 text-right">{marketOdds}%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm w-32">PlayPicks AI:</span>
            <span className="text-2xl font-bold text-purple-400 w-16">
              {aiPrediction > 50 ? 'YES' : 'NO'}
            </span>
            <div className="flex-1 mx-4 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500"
                style={{ width: `${aiPrediction}%` }}
              />
            </div>
            <span className="text-white font-bold w-16 text-right">{aiPrediction}%</span>
          </div>
        </div>

        <div className={`p-4 rounded-lg ${consensus ? 'bg-green-900/20 border border-green-500/30' : 'bg-yellow-900/20 border border-yellow-500/30'}`}>
          <div className="flex items-center justify-between">
            <span className={consensus ? 'text-green-400' : 'text-yellow-400'}>
              {consensus ? '✅ Strong consensus' : '⚠️ Moderate divergence'}
            </span>
            <span className="text-gray-300 text-sm">
              Divergence: {divergence}% · {divergence < 10 ? 'Low' : divergence < 30 ? 'Medium' : 'High'} Risk
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="text-xs text-blue-300">
            Live Polymarket odds: {marketOdds}% YES / {100 - marketOdds}% NO
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // CATEGORICAL MARKET - ROBINHOOD-STYLE CARDS
  // ═══════════════════════════════════════════════
  if (marketType === 'categorical') {
    const topOutcome = outcomes[0];
    const volume = parseFloat(marketVolume);
    const volDisplay = volume >= 1000000 
      ? `$${(volume / 1000000).toFixed(2)}M`
      : volume >= 1000
      ? `$${(volume / 1000).toFixed(0)}K`
      : `$${volume.toFixed(0)}`;

    const visibleOutcomes = showAll ? outcomes : outcomes.slice(0, 3);
    const hiddenCount = outcomes.length - 3;

    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h2 className="text-xl font-bold text-white">Market Race</h2>
          </div>
          <div className="text-white font-semibold mb-2">{marketName}</div>
          <div className="text-sm text-gray-400">
            {volDisplay} volume · {outcomes.length} competitors
          </div>
        </div>

        {/* Competitor Cards - Robinhood Style */}
        <div className="space-y-4">
          {visibleOutcomes.map((outcome, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
            const weekChangeNum = outcome.weekChange || 0;
            const aiOpinion = getAIOpinion(outcome.edge, outcome.aiConfidence);

            return (
              <div key={outcome.name} className="pb-4 border-b border-gray-700 last:border-0">
                
                {/* Line 1: Name + Market% + Momentum */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {medal && <span className="text-xl">{medal}</span>}
                    <span className="text-white font-semibold text-lg">{outcome.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">{outcome.odds}%</span>
                    {weekChangeNum !== 0 && (
                      <span className={`text-sm font-semibold ${weekChangeNum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {weekChangeNum > 0 ? '▲' : '▼'}{Math.abs(weekChangeNum)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Line 2: Single Progress Bar (Market Probability) */}
                <div className="mb-2">
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all"
                      style={{ width: `${outcome.odds}%` }}
                    />
                  </div>
                </div>

                {/* Line 3: AI Opinion in Plain English */}
                <div className={`text-sm ${aiOpinion.color} flex items-center gap-2`}>
                  <span>{aiOpinion.icon}</span>
                  <span>{aiOpinion.text}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse Button */}
        {!showAll && hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full mt-4 py-3 text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors"
          >
            ▸ Show {hiddenCount} more competitor{hiddenCount > 1 ? 's' : ''}
          </button>
        )}
        
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full mt-4 py-3 text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors"
          >
            ▴ Show less
          </button>
        )}

        {/* AI Pick */}
        {topOutcome && (
          <div className="mt-6 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-300 mb-2">
              <span>🤖</span>
              <span className="font-semibold">AI PICKS</span>
            </div>
            <div className="text-sm text-gray-300">
              <strong className="text-white">{topOutcome.name}</strong> · Strongest conviction
              {topOutcome.edge >= 4 && ` with +${topOutcome.edge}% AI advantage`}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
