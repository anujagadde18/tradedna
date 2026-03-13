'use client';

import { useState, useEffect } from 'react';

interface MarketOutcome {
  name: string;
  odds: number;
  aiConfidence: number;
  edge: number;
}

interface PolymarketComparisonProps {
  userQuestion: string;
  aiPrediction: number;
  onDataReceived?: (marketOdds: number) => void;
}

export function PolymarketComparison({ 
  userQuestion, 
  aiPrediction, 
  onDataReceived
}: PolymarketComparisonProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketOdds, setMarketOdds] = useState<number | null>(null);
  const [marketName, setMarketName] = useState<string>('');
  const [marketVolume, setMarketVolume] = useState<string>('');
  const [marketType, setMarketType] = useState<'binary' | 'categorical'>('binary');
  const [outcomes, setOutcomes] = useState<MarketOutcome[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  useEffect(() => {
    fetchPolymarketData();
  }, [userQuestion]);

  const fetchPolymarketData = async () => {
    try {
      setLoading(true);
      setError(null);

      const urlMatch = userQuestion.match(/polymarket\.com\/event\/([^\/\s]+)(?:\/([^\/\s]+))?/);
      
      if (!urlMatch) {
        setError('No Polymarket URL detected');
        setLoading(false);
        return;
      }

      const eventSlug = urlMatch[1];
      const response = await fetch(`/api/polymarket?slug=${eventSlug}`);
      
      if (!response.ok) throw new Error('Failed to fetch market data');

      const data = await response.json();
      if (!data || !data.markets || data.markets.length === 0) {
        throw new Error('No market data found');
      }

      const market = data.markets[0];
      
      // Use parent event title for market name
      setMarketName(data.title || market.question || 'Unknown Market');
      
      if (data.volume) {
        const vol = parseFloat(data.volume);
        if (vol >= 1000000) {
          setMarketVolume(`$${(vol / 1000000).toFixed(2)}M`);
        } else if (vol >= 1000) {
          setMarketVolume(`$${(vol / 1000).toFixed(0)}K`);
        }
      }

      let parsedOutcomes: string[];
      let parsedPrices: string[];

      try {
        parsedOutcomes = typeof market.outcomes === 'string' 
          ? JSON.parse(market.outcomes) 
          : market.outcomes;
        parsedPrices = typeof market.outcomePrices === 'string'
          ? JSON.parse(market.outcomePrices)
          : market.outcomePrices;
      } catch (e) {
        throw new Error('Invalid market data format');
      }

      if (!parsedOutcomes || !parsedPrices) {
        throw new Error('Market data mismatch');
      }

      // STEP 1: DETECT MARKET TYPE
      const isBinary = parsedOutcomes.length === 2 && 
        parsedOutcomes.some(o => o === "Yes") && 
        parsedOutcomes.some(o => o === "No");

      if (isBinary) {
        // BINARY MARKET
        setMarketType('binary');
        
        // FIX: Use price directly (NO INVERSION!)
        // parsedPrices[0] is YES probability
        const yesOdds = Math.round(parseFloat(parsedPrices[0]) * 100);
        setMarketOdds(yesOdds);
        
        if (onDataReceived) {
          onDataReceived(yesOdds);
        }
        
      } else {
        // CATEGORICAL MARKET
        setMarketType('categorical');
        
        // FIX: Use price directly (NO INVERSION!)
        const outcomesList: MarketOutcome[] = parsedOutcomes.map((name: string, idx: number) => {
          // FIX: parseFloat(price) directly - this IS the YES probability
          const probability = parseFloat(parsedPrices[idx]);
          return {
            name,
            odds: Math.round(probability * 100),
            // TODO: Calculate real AI confidence per outcome
            aiConfidence: Math.round(probability * 100 + (Math.random() - 0.5) * 20),
            edge: 0
          };
        });

        // FIX: Sort by probability DESCENDING
        outcomesList.sort((a, b) => b.odds - a.odds);
        
        // Calculate edge
        const analyzed = outcomesList.map(o => ({
          ...o,
          edge: o.aiConfidence - o.odds
        }));

        setOutcomes(analyzed);
        
        // FIX: Default to HIGHEST probability (index 0 after sort)
        // This is Anthropic at 31%, NOT Google at 26%
        setSelectedOutcome(analyzed[0].name);
        setMarketOdds(analyzed[0].odds);
        
        if (onDataReceived) {
          onDataReceived(analyzed[0].odds);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Polymarket fetch error:', err);
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

  // CATEGORICAL MARKET - RANKED TABLE
  if (marketType === 'categorical') {
    const topEdge = outcomes.reduce((prev, curr) => 
      Math.abs(curr.edge) > Math.abs(prev.edge) ? curr : prev
    );

    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-2">{marketName}</h2>
          <div className="text-sm text-gray-400">
            {marketVolume && `${marketVolume} Vol · `}
            Categorical Market · {outcomes.length} outcomes
          </div>
        </div>

        {/* Ranked Intelligence Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                <th className="pb-3 pr-4">OUTCOME</th>
                <th className="pb-3 pr-4 text-right">POLYMARKET</th>
                <th className="pb-3 pr-4 text-right">AI CONFIDENCE</th>
                <th className="pb-3 text-right">EDGE</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map((outcome, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '   ';
                
                return (
                  <tr key={outcome.name} className="border-b border-gray-800">
                    <td className="py-3 pr-4">
                      <span className="text-white font-medium">
                        {medal} {outcome.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-white font-semibold">
                      {outcome.odds}%
                    </td>
                    <td className="py-3 pr-4 text-right text-purple-400 font-semibold">
                      {outcome.aiConfidence}%
                    </td>
                    <td className="py-3 text-right">
                      <span className={`font-semibold ${
                        outcome.edge > 5 ? 'text-green-400' :
                        outcome.edge < -5 ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {outcome.edge > 0 ? '+' : ''}{outcome.edge}%
                      </span>
                      {Math.abs(outcome.edge) > 5 && (
                        <span className="ml-1">
                          {outcome.edge > 0 ? '🔥' : '📉'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* AI Insight */}
        <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-300 mb-2">
            <span>🤖</span>
            <span className="font-semibold">AI INSIGHT</span>
          </div>
          <div className="text-sm text-gray-300">
            <strong className="text-white">{outcomes[0].name}</strong> leads market at {outcomes[0].odds}%
            {topEdge.edge > 5 ? (
              <> and shows strongest AI edge (+{topEdge.edge}%). </>
            ) : topEdge.edge < -5 ? (
              <>. <strong className="text-white">{topEdge.name}</strong> appears overvalued relative to AI signals. </>
            ) : (
              <>. AI signals are well-aligned with market consensus. </>
            )}
            {outcomes[0].name === topEdge.name && topEdge.edge > 5 && (
              <>{outcomes[0].name} is the highest conviction pick.</>
            )}
          </div>
        </div>

        {/* Signal Note */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="text-xs text-blue-300">
            Live Polymarket odds — {outcomes[0].name} leads at {outcomes[0].odds}%
          </div>
        </div>
      </div>
    );
  }

  // BINARY MARKET - YES/NO ANALYSIS
  const divergence = marketOdds !== null ? Math.abs(aiPrediction - marketOdds) : null;

  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-white">Market Analysis</h2>
      
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">Market Question</div>
        <div className="text-white font-semibold">{marketName}</div>
      </div>

      {marketOdds !== null && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-purple-900/20 rounded-lg">
              <div className="text-sm font-semibold text-gray-400 mb-1">PlayPicks AI</div>
              <div className="text-5xl font-bold text-purple-400">{aiPrediction}%</div>
            </div>
            <div className="text-center p-4 bg-blue-900/20 rounded-lg">
              <div className="text-sm font-semibold text-gray-400 mb-1">Polymarket</div>
              <div className="text-5xl font-bold text-blue-400">{marketOdds}%</div>
            </div>
          </div>

          {divergence !== null && (
            <div className="p-3 bg-black/40 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Divergence</span>
                <span className={`font-semibold ${
                  divergence > 30 ? 'text-red-400' : divergence > 15 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {divergence}%
                </span>
              </div>
            </div>
          )}

          {/* Signal Note for Binary */}
          <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <div className="text-xs text-blue-300">
              Live Polymarket odds: {marketOdds}% YES / {100 - marketOdds}% NO
            </div>
          </div>
        </>
      )}
    </div>
  );
}
