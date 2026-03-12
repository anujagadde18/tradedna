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
  const [isMultiOutcome, setIsMultiOutcome] = useState(false);
  const [outcomes, setOutcomes] = useState<MarketOutcome[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  useEffect(() => {
    fetchPolymarketData();
  }, [userQuestion]);

  useEffect(() => {
    if (selectedOutcome && outcomes.length > 0) {
      const outcome = outcomes.find(o => o.name === selectedOutcome);
      if (outcome) {
        setMarketOdds(outcome.odds);
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

      if (outcomesList.length > 2) {
        setIsMultiOutcome(true);
        
        if (outcomeSlug) {
          const matchedOutcome = outcomesList.find(o => 
            o.name.toLowerCase().includes(outcomeSlug.toLowerCase().replace(/-/g, ' '))
          );
          if (matchedOutcome) {
            setSelectedOutcome(matchedOutcome.name);
          } else {
            setSelectedOutcome(outcomesList[0].name);
          }
        } else {
          setSelectedOutcome(outcomesList[0].name);
        }
      } else {
        setIsMultiOutcome(false);
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

      {isMultiOutcome && (
        <div className="mb-6 p-4 bg-black/40 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-3">Select outcome to analyze:</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {outcomes.map((outcome) => (
              <button
                key={outcome.name}
                onClick={() => setSelectedOutcome(outcome.name)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                  selectedOutcome === outcome.name
                    ? 'bg-purple-600 border-2 border-purple-400'
                    : 'bg-gray-800 border-2 border-gray-700 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedOutcome === outcome.name
                      ? 'bg-white border-white'
                      : 'border-gray-500'
                  }`}>
                    {selectedOutcome === outcome.name && (
                      <div className="w-full h-full rounded-full bg-purple-600" />
                    )}
                  </div>
                  <span className="text-white font-medium">{outcome.name}</span>
                </div>
                <span className="text-xl font-bold text-white">{outcome.odds}%</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
              {divergence > 30 && (
                <div className="mt-2 text-xs text-orange-400">
                  ⚠️ High divergence detected - review both perspectives carefully
                </div>
              )}
            </div>
          )}

          {isMultiOutcome && selectedOutcome && (
            <div className="mt-4 p-3 bg-purple-900/10 rounded-lg border border-purple-500/30">
              <div className="text-xs text-purple-400">
                💡 Analyzing outcome: <span className="font-semibold">{selectedOutcome}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
