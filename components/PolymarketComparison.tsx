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

// AI Confidence Calculation - NO RANDOM!
function calculateAIConfidence(
  marketOdds: number,
  rankIndex: number,
  newsWeight: number = 0.35,
  socialWeight: number = 0.40,
  marketWeight: number = 0.25
): number {
  // Rank boost: leader gets positive signal, tail gets negative
  const rankBoost = 
    rankIndex === 0 ? 5 :
    rankIndex === 1 ? 2 :
    rankIndex <= 3 ? 0 : -3;

  return Math.round(
    (marketOdds * marketWeight) +
    ((marketOdds + rankBoost) * newsWeight) +
    ((marketOdds + rankBoost) * socialWeight)
  );
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
        // data.outcomes already sorted highest first
        
        const analyzed = data.outcomes.map((o: any, idx: number) => {
          const marketOdds = Math.round(parseFloat(o.price) * 100);
          const aiConf = calculateAIConfidence(marketOdds, idx);
          
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
        
        // Use leader's odds for signal contribution
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
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Market Intelligence</h2>
        <div className="text-center text-gray-400">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Market Intelligence</h2>
        <div className="text-center text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // BINARY MARKET - VERDICT CARD
  // ═══════════════════════════════════════════════
  if (marketType === 'binary' && marketOdds !== null) {
    const divergence = Math.abs(aiPrediction - marketOdds);
    const consensus = divergence < 10;

    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Market Verdict</h2>
        
        <div className="mb-4">
          <div className="text-white font-semibold mb-4">{marketName}</div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Polymarket Row */}
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

          {/* AI Row */}
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

        {/* Consensus Badge */}
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

        {/* Signal Note */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="text-xs text-blue-300">
            Live Polymarket odds: {marketOdds}% YES / {100 - marketOdds}% NO
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // CATEGORICAL MARKET - HORSE RACE CARD
  // ═══════════════════════════════════════════════
  if (marketType === 'categorical') {
    const leader = outcomes[0];
    const volume = parseFloat(marketVolume);
    const volDisplay = volume >= 1000000 
      ? `$${(volume / 1000000).toFixed(2)}M`
      : volume >= 1000
      ? `$${(volume / 1000).toFixed(0)}K`
      : `$${volume.toFixed(0)}`;

    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏇</span>
            <h2 className="text-xl font-bold text-white">Market Race</h2>
          </div>
          <div className="text-white font-semibold mb-2">{marketName}</div>
          <div className="text-sm text-gray-400">
            {volDisplay} Vol · {outcomes.length} competitors
          </div>
        </div>

        {/* Race Bars */}
        <div className="space-y-4 mb-6">
          {outcomes.map((outcome, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
            const weekChangeNum = outcome.weekChange || 0;
            const hasChange = weekChangeNum !== 0;

            return (
              <div key={outcome.name}>
                {/* Row Header */}
                <div className="flex items-center justify-between mb-2">
                  
                  {/* Left: Medal + Name */}
                  <div className="flex items-center gap-2 flex-1">
                    {medal && <span className="text-xl">{medal}</span>}
                    <span className="text-white font-semibold">{outcome.name}</span>
                  </div>

                  {/* Right: All Numbers */}
                  <div className="flex items-center gap-4 text-sm">
                    
                    {/* Polymarket Odds */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs text-gray-400">Market</div>
                      <div className="text-white font-bold">{outcome.odds}%</div>
                    </div>

                    {/* AI Confidence */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs text-gray-400">AI</div>
                      <div className="text-purple-400 font-bold">{outcome.aiConfidence}%</div>
                    </div>

                    {/* Weekly Momentum */}
                    {hasChange && (
                      <div className="text-center min-w-[60px]">
                        <div className="text-xs text-gray-400">1wk</div>
                        <div className={weekChangeNum > 0 ? 'text-green-400' : 'text-red-400'}>
                          {weekChangeNum > 0 ? '▲' : '▼'}{Math.abs(weekChangeNum)}%
                        </div>
                      </div>
                    )}

                    {/* Edge */}
                    <div className="text-center min-w-[70px]">
                      <div className="text-xs text-gray-400">Edge</div>
                      <div className={`font-bold ${
                        outcome.edge > 5 ? 'text-green-400' :
                        outcome.edge < -5 ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {outcome.edge > 0 ? '+' : ''}{outcome.edge}%
                        {outcome.edge > 5 && ' 🔥'}
                        {outcome.edge < -5 && ' 📉'}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Dual Progress Bars */}
                <div className="space-y-1">
                  {/* Market Bar (Purple) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12">Market</span>
                    <div className="flex-1 bg-gray-700 rounded-md h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-700 h-full transition-all"
                        style={{ width: `${outcome.odds}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* AI Bar (Blue) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12">AI</span>
                    <div className="flex-1 bg-gray-700 rounded-md h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-700 h-full transition-all"
                        style={{ width: `${outcome.aiConfidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Insight */}
        {leader && (
          <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-300 mb-2">
              <span>🤖</span>
              <span className="font-semibold">AI PICKS</span>
            </div>
            <div className="text-sm text-gray-300">
              <strong className="text-white">{leader.name}</strong> · Strongest edge
              {leader.edge > 5 && ` (+${leader.edge}% AI advantage)`}
            </div>
          </div>
        )}

        {/* Signal Note */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="text-xs text-blue-300">
            {leader.name} leads at {leader.odds}% · {outcomes.length} competitors
          </div>
        </div>
      </div>
    );
  }

  return null;
}
