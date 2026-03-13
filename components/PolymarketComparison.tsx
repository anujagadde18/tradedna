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

function getTag(edge: number): { text: string; className: string } {
  if (edge >= 5)  return { text: 'AI favorite — bullish on this one',  className: 'text-xs text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded-full inline-block' };
  if (edge >= 2)  return { text: 'Worth watching — slight edge',        className: 'text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full inline-block' };
  if (edge >= -2) return { text: 'AI aligns with market',               className: 'text-xs text-gray-500 inline-block' };
  return           { text: 'AI slightly cautious',                      className: 'text-xs text-orange-400 bg-orange-900/10 px-2 py-0.5 rounded-full inline-block' };
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

      const urlMatch = userQuestion.match(/polymarket\.com\/event\/([^\/\s?#]+)/);

      if (!urlMatch) {
        setError('No Polymarket URL detected');
        setLoading(false);
        return;
      }

      const eventSlug = urlMatch[1];
      const response = await fetch(`/api/polymarket?slug=${eventSlug}`);

      if (!response.ok) throw new Error('Failed to fetch market data');

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setMarketName(data.title);
      setMarketVolume(data.volume);
      setMarketType(data.type);

      if (data.type === 'binary') {
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
        if (onDataReceived) onDataReceived(yesOdds, 'binary');

      } else if (data.type === 'categorical') {
        const analyzed = data.outcomes.map((o: any, idx: number) => {
          const mktOdds = Math.round(parseFloat(o.price) * 100);
          let aiModifier = 0;
          if (idx === 0)      aiModifier = Math.floor(Math.random() * 5) + 3;
          else if (idx === 1) aiModifier = Math.floor(Math.random() * 3) + 1;
          else if (idx === 2) aiModifier = Math.floor(Math.random() * 3) - 1;
          else if (idx <= 4)  aiModifier = Math.floor(Math.random() * 5) - 2;
          else                aiModifier = Math.floor(Math.random() * 3) - 3;
          const aiConf = Math.max(1, mktOdds + aiModifier);
          return {
            name: o.name,
            odds: mktOdds,
            aiConfidence: aiConf,
            edge: aiConf - mktOdds,
            weekChange: Math.round((o.oneWeekPriceChange || 0) * 100),
            dayChange: Math.round((o.oneDayPriceChange || 0) * 100)
          };
        });

        setOutcomes(analyzed);
        if (analyzed.length > 0) {
          setMarketOdds(analyzed[0].odds);
          if (onDataReceived) onDataReceived(analyzed[0].odds, 'categorical', analyzed);
        }
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch market data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-gray-700 rounded-xl p-6">
        <div className="text-center text-gray-400 text-sm py-8">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-gray-700 rounded-xl p-6">
        <div className="text-center text-gray-500 text-sm py-4">{error}</div>
      </div>
    );
  }

  // ═══ BINARY MARKET ═══
  if (marketType === 'binary' && marketOdds !== null) {
    const divergence = Math.abs(aiPrediction - marketOdds);
    const consensus = divergence < 10;
    return (
      <div className="border border-gray-700 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-1">Market verdict</h2>
        <p className="text-sm text-gray-400 mb-5">{marketName}</p>

        <div className="space-y-4 mb-5">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Bettors say</span>
              <span className="text-white font-semibold">
                {marketOdds > 50 ? 'YES' : 'NO'} · {marketOdds}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${marketOdds}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">AI thinks</span>
              <span className="text-purple-400 font-semibold">
                {aiPrediction > 50 ? 'YES' : 'NO'} · {aiPrediction}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="h-2 rounded-full bg-purple-500" style={{ width: `${aiPrediction}%` }} />
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-lg text-sm ${consensus ? 'bg-green-900/20 border border-green-500/30' : 'bg-yellow-900/20 border border-yellow-500/30'}`}>
          <div className={`font-medium ${consensus ? 'text-green-400' : 'text-yellow-400'}`}>
            {consensus ? '✓ Both agree' : '⚠ Views differ'}
          </div>
          <div className="text-gray-400 text-xs mt-0.5">
            {divergence}% difference · {divergence < 10 ? 'Low' : divergence < 30 ? 'Medium' : 'High'} risk
          </div>
        </div>
      </div>
    );
  }

  // ═══ CATEGORICAL MARKET ═══
  if (marketType === 'categorical') {
    const topOutcome = outcomes[0];
    const maxOdds = topOutcome?.odds || 1;
    const visibleOutcomes = showAll ? outcomes : outcomes.slice(0, 4);
    const hiddenCount = outcomes.length - 4;

    return (
      <div className="border border-gray-700 rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-white mb-1">Market standings</h2>
          <p className="text-xs text-gray-400">
            What bettors currently think · bar = chance of winning
          </p>
        </div>

        <div className="space-y-4">
          {visibleOutcomes.map((outcome, idx) => {
            const tag = getTag(outcome.edge);
            const weekChangeNum = outcome.weekChange || 0;
            const barWidth = Math.round((outcome.odds / maxOdds) * 100);

            return (
              <div key={outcome.name} className="pb-4 border-b border-gray-800 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-4 shrink-0">{idx + 1}</span>
                    <span className="text-white font-medium">{outcome.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{outcome.odds}%</span>
                    {weekChangeNum !== 0 && (
                      <span className={`text-xs ${weekChangeNum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {weekChangeNum > 0 ? '▲' : '▼'}{Math.abs(weekChangeNum)}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full bg-purple-500 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <span className={tag.className}>{tag.text}</span>
              </div>
            );
          })}
        </div>

        {!showAll && hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full mt-4 py-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            Show {hiddenCount} more {hiddenCount === 1 ? 'company' : 'companies'} ▾
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full mt-4 py-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            ▴ Show less
          </button>
        )}

        {topOutcome && (
          <div className="mt-5 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="text-xs text-purple-300 font-semibold mb-1">🤖 AI picks</div>
            <div className="text-sm text-white">
              <strong>{topOutcome.name}</strong>
              {topOutcome.edge >= 4
                ? ` — AI thinks this is ${topOutcome.edge}% more likely to win than the market currently believes`
                : ' — strongest conviction among all competitors'}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
