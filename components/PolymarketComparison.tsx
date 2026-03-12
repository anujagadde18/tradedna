'use client';

import { useState, useEffect } from 'react';

interface PolymarketComparisonProps {
  userQuestion: string;
  aiPrediction: number;
  onDataReceived?: (marketOdds: number) => void;
}

interface MarketOutcome {
  name: string;
  odds: number;
}

export function PolymarketComparison({ userQuestion, aiPrediction, onDataReceived }: PolymarketComparisonProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketOdds, setMarketOdds] = useState<number | null>(null);
  const [marketName, setMarketName] = useState<string>('');
  const [isCategorical, setIsCategorical] = useState(false);
  const [outcomes, setOutcomes] = useState<MarketOutcome[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [waitingForSelection, setWaitingForSelection] = useState(false);

  useEffect(() => {
    fetchPolymarketData();
  }, [userQuestion]);

  useEffect(() => {
    if (selectedOutcome && outcomes.length > 0) {
      const outcome = outcomes.find(o => o.name === selectedOutcome);
      if (outcome) {
        setMarketOdds(outcome.odds);
        setWaitingForSelection(false);
        if (onDataReceived) {
          onDataReceived(outcome.odds);
        }
      }
    }
  }, [selectedOutcome, outcomes]);

  const fetchPolymarketData = async () => {
    try {
      setLoading(true);
      setError(null);
      setWaitingForSelection(false);

      const urlMatch = userQuestion.match(/polymarket\.com\/event\/([^\/\s]+)(?:\/([^\/\s]+))?/);
      
      if (!urlMatch) {
        setError('No Polymarket URL detected');
        setLoading(false);
        return;
      }

      const eventSlug = urlMatch[1];
      const outcomeSlug = urlMatch[2];

      const response = await fetch(`/api/polymarket?slug=${eventSlug}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }

      const data = await response.json();

      if (!data || !data.markets || data.markets.length === 0) {
        throw new Error('No market data found');
      }

      const market = data.markets[0];
      setMarketName(market.question || data.title || 'Unknown Market');

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

      if (!parsedOutcomes || !parsedPrices || parsedOutcomes.length !== parsedPrices.length) {
        throw new Error('Market data mismatch');
      }

      const outcomesList: MarketOutcome[] = parsedOutcomes.map((name: string, idx: number) => ({
        name,
        odds: Math.round(parseFloat(parsedPrices[idx]) * 100)
      }));

      setOutcomes(outcomesList);

      // PHASE 1: MARKET TYPE DETECTION
      if (outcomesList.length > 2) {
        // CATEGORICAL MARKET
        setIsCategorical(true);
        setWaitingForSelection(true);
        
        if (outcomeSlug) {
          const matchedOutcome = outcomesList.find(o => 
            o.name.toLowerCase().includes(outcomeSlug.toLowerCase().replace(/-/g, ' '))
          );
          if (matchedOutcome) {
            setSelectedOutcome(matchedOutcome.name);
          } else {
            const highest = outcomesList.reduce((prev, current) => 
              current.odds > prev.odds ? current : prev
            );
            setSelectedOutcome(highest.name);
          }
        } else {
          const highest = outcomesList.reduce((prev, current) => 
            current.odds > prev.odds ? current : prev
          );
          setSelectedOutcome(highest.name);
        }
      } else {
        // BINARY MARKET
        setIsCategorical(false);
        const odds = outcomesList[0].odds;
        setMarketOdds(odds);
        if (onDataReceived) {
          onDataReceived(odds);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Polymarket fetch error:', err);
      setError(err.message || 'Failed to fetch market data');
      setLoading(false);
    }
  };

  const handleOutcomeSelect = (outcomeName: string) => {
    setSelectedOutcome(outcomeName);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Polymarket Comparison</h2>
        <div className="text-center text-gray-400">Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Polymarket Comparison</h2>
        <div className="text-center text-gray-500 text-sm">{error}</div>
      </div>
    );
  }

  const divergence = marketOdds !== null ? Math.abs(aiPrediction - marketOdds) : null;

  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-white">Polymarket Comparison</h2>
      
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">Market Question</div>
        <div className="text-white font-semibold">{marketName}</div>
      </div>

      {/* OUTCOME SELECTOR */}
      {isCategorical && (
        <div className="mb-6">
          <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/50 mb-4">
            <div className="flex items-center gap-2 text-sm text-blue-300 mb-1">
              <span>📊</span>
              <span className="font-semibold">Multi-Outcome Market Detected</span>
            </div>
            <div className="text-xs text-gray-400">
              Select which outcome you want to analyze
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {outcomes.map((outcome) => {
              const isSelected = selectedOutcome === outcome.name;
              
              return (
                <button
                  key={outcome.name}
                  onClick={() => handleOutcomeSelect(outcome.name)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'bg-purple-900/40 border-purple-500'
                      : 'bg-gray-900/40 border-gray-700 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-500'
                      }`}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className={`font-semibold ${
                        isSelected ? 'text-white' : 'text-gray-300'
                      }`}>
                        {outcome.name}
                      </span>
                    </div>
                    <span className={`text-2xl font-bold ${
                      isSelected ? 'text-white' : 'text-gray-400'
                    }`}>
                      {outcome.odds}%
                    </span>
                  </div>
                  
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        isSelected ? 'bg-purple-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${outcome.odds}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {selectedOutcome && (
            <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
              <div className="text-xs text-purple-300">
                ✓ Analyzing: <span className="font-semibold">{selectedOutcome}</span> at {outcomes.find(o => o.name === selectedOutcome)?.odds}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPARISON DISPLAY */}
      {marketOdds !== null && !waitingForSelection && (
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
              {divergence > 30 && (
                <div className="mt-2 text-xs text-orange-400">
                  ⚠️ High divergence detected - review both perspectives carefully
                </div>
              )}
            </div>
          )}

          {/* MARKET CONTEXT */}
          {isCategorical && selectedOutcome && (
            <div className="mt-4 p-4 bg-black/40 rounded-lg border border-gray-700">
              <div className="text-sm font-semibold text-gray-300 mb-3">Market Context - All Outcomes:</div>
              <div className="space-y-2">
                {outcomes.map((outcome) => (
                  <div key={outcome.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={outcome.name === selectedOutcome ? 'text-purple-400' : 'text-gray-400'}>
                        {outcome.name}
                      </span>
                      {outcome.name === selectedOutcome && (
                        <span className="text-xs text-purple-400">← YOU</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={outcome.name === selectedOutcome ? 'bg-purple-500' : 'bg-gray-500'}
                          style={{ width: `${outcome.odds}%`, height: '100%' }}
                        />
                      </div>
                      <span className="text-gray-300 w-10 text-right">{outcome.odds}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
