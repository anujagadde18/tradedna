'use client';

import { useState, useEffect } from 'react';

interface MarketOutcome {
  name: string;
  odds: number;
  aiConfidence: number;
  edge: number;
  momentum?: number;
}

interface PolymarketComparisonProps {
  userQuestion: string;
  aiPrediction: number;
  onDataReceived?: (marketOdds: number) => void;
  onMarketAnalysis?: (outcomes: MarketOutcome[]) => void;
}

export function PolymarketComparison({ 
  userQuestion, 
  aiPrediction, 
  onDataReceived,
  onMarketAnalysis 
}: PolymarketComparisonProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketOdds, setMarketOdds] = useState<number | null>(null);
  const [marketName, setMarketName] = useState<string>('');
  const [marketVolume, setMarketVolume] = useState<string>('');
  const [isCategorical, setIsCategorical] = useState(false);
  const [outcomes, setOutcomes] = useState<MarketOutcome[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'deepdive'>('table');

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
      const outcomeSlug = urlMatch[2];
      const response = await fetch(`/api/polymarket?slug=${eventSlug}`);
      
      if (!response.ok) throw new Error('Failed to fetch market data');

      const data = await response.json();
      if (!data || !data.markets || data.markets.length === 0) {
        throw new Error('No market data found');
      }

      const market = data.markets[0];
      
      // CRITICAL: Use parent event title for categorical markets
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

      // STEP 2: COUNT OUTCOMES - Determine market type
      if (parsedOutcomes.length === 2 && parsedOutcomes.includes('Yes') && parsedOutcomes.includes('No')) {
        // BINARY MARKET (YES/NO)
        setIsCategorical(false);
        
        // For binary: outcomePrices[0] is YES probability
        const yesOdds = Math.round(parseFloat(parsedPrices[0]) * 100);
        setMarketOdds(yesOdds);
        
        if (onDataReceived) {
          onDataReceived(yesOdds);
        }
        
      } else if (parsedOutcomes.length > 2) {
        // CATEGORICAL MARKET (Multiple outcomes)
        setIsCategorical(true);
        
        // For categorical: each price is the probability of that specific outcome
        const outcomesList: MarketOutcome[] = parsedOutcomes.map((name: string, idx: number) => ({
          name,
          odds: Math.round(parseFloat(parsedPrices[idx]) * 100),
          aiConfidence: 0, // Will be calculated
          edge: 0,
          momentum: 0
        }));

        // CRITICAL: Sort by probability DESCENDING
        outcomesList.sort((a, b) => b.odds - a.odds);

        // Calculate AI predictions for each outcome
        // TODO: Replace with real AI calculation
        const analyzed = outcomesList.map(outcome => {
          // Simulate AI confidence (should use real calculateIntelligence per outcome)
          const aiConf = Math.max(0, Math.min(100, outcome.odds + (Math.random() - 0.5) * 20));
          return {
            ...outcome,
            aiConfidence: Math.round(aiConf),
            edge: Math.round(aiConf - outcome.odds)
          };
        });

        setOutcomes(analyzed);
        
        // STEP 1: Try to match URL slug
        let matched = false;
        if (outcomeSlug) {
          const matchedOutcome = analyzed.find(o => 
            o.name.toLowerCase().includes(outcomeSlug.toLowerCase().replace(/-/g, ' ')) ||
            outcomeSlug.toLowerCase().includes(o.name.toLowerCase().replace(/\s/g, '-'))
          );
          if (matchedOutcome) {
            setSelectedOutcome(matchedOutcome.name);
            matched = true;
          }
        }
        
        // STEP 2: Default to HIGHEST probability
        if (!matched) {
          setSelectedOutcome(analyzed[0].name);
        }
        
        setViewMode('table'); // Start with ranked table
        
        if (onMarketAnalysis) {
          onMarketAnalysis(analyzed);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Polymarket fetch error:', err);
      setError(err.message || 'Failed to fetch market data');
      setLoading(false);
    }
  };

  const deepDiveOutcome = (outcomeName: string) => {
    setSelectedOutcome(outcomeName);
    const outcome = outcomes.find(o => o.name === outcomeName);
    if (outcome) {
      setMarketOdds(outcome.odds);
      setViewMode('deepdive');
      if (onDataReceived) {
        onDataReceived(outcome.odds);
      }
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

  // CATEGORICAL MARKET - RANKED INTELLIGENCE TABLE
  if (isCategorical && viewMode === 'table') {
    const topEdge = outcomes.reduce((prev, curr) => 
      Math.abs(curr.edge) > Math.abs(prev.edge) ? curr : prev
    );

    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl font-bold text-white">{marketName}</h2>
          </div>
          <div className="text-sm text-gray-400">
            {marketVolume && `${marketVolume} Vol · `}
            {outcomes.length} outcomes
          </div>
        </div>

        {/* Ranked Intelligence Table */}
        <div className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                  <th className="pb-3 pr-4">COMPANY</th>
                  <th className="pb-3 pr-4 text-right">MARKET</th>
                  <th className="pb-3 pr-4 text-right">AI SAYS</th>
                  <th className="pb-3 pr-4 text-right">EDGE</th>
                  <th className="pb-3">SIGNAL</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((outcome, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '   ';
                  const signal = outcome.edge > 5 ? 'Strong buy signal' :
                                outcome.edge < -5 ? 'Overvalued' :
                                outcome.edge > 0 ? 'Slight edge' : 'Neutral';
                  const signalColor = outcome.edge > 5 ? 'text-green-400' :
                                     outcome.edge < -5 ? 'text-red-400' :
                                     outcome.edge > 0 ? 'text-blue-400' : 'text-gray-400';
                  
                  return (
                    <tr key={outcome.name} className="border-b border-gray-800 hover:bg-white/5 cursor-pointer" onClick={() => deepDiveOutcome(outcome.name)}>
                      <td className="py-3 pr-4">
                        <span className="text-white font-medium">
                          {medal} {outcome.name}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-white font-semibold">{outcome.odds}%</td>
                      <td className="py-3 pr-4 text-right text-purple-400 font-semibold">{outcome.aiConfidence}%</td>
                      <td className="py-3 pr-4 text-right">
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
                      <td className={`py-3 text-sm ${signalColor}`}>{signal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insight */}
        <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-300 mb-2">
            <span>🤖</span>
            <span className="font-semibold">AI INSIGHT</span>
          </div>
          <div className="text-sm text-gray-300 mb-4">
            {topEdge.edge > 5 ? (
              <>
                <strong className="text-white">{topEdge.name}</strong> appears most undervalued 
                (+{topEdge.edge}% edge). Market may be underpricing this outcome.
              </>
            ) : topEdge.edge < -5 ? (
              <>
                <strong className="text-white">{topEdge.name}</strong> may be overvalued by market consensus 
                ({topEdge.edge}% edge). Exercise caution.
              </>
            ) : (
              <>Market and AI signals are well-aligned. No significant divergence opportunities detected.</>
            )}
          </div>

          <div className="flex gap-2">
            {outcomes.slice(0, 2).map(outcome => (
              <button
                key={outcome.name}
                onClick={() => deepDiveOutcome(outcome.name)}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold text-white transition-all"
              >
                Deep Analyze: {outcome.name} →
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // DEEP DIVE OR BINARY MARKET
  const divergence = marketOdds !== null ? Math.abs(aiPrediction - marketOdds) : null;

  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
      {isCategorical && (
        <button
          onClick={() => setViewMode('table')}
          className="mb-4 text-gray-400 hover:text-white text-sm"
        >
          ← Back to Market Overview
        </button>
      )}

      <h2 className="text-xl font-bold mb-4 text-white">
        {isCategorical ? `Deep Dive: ${selectedOutcome}` : 'Market Analysis'}
      </h2>
      
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
        </>
      )}
    </div>
  );
}
