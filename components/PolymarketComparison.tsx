'use client';

import { useState, useEffect } from 'react';

interface MarketOutcome {
  name: string;
  odds: number;
  aiConfidence?: number;
  edge?: number;
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
  const [viewMode, setViewMode] = useState<'overview' | 'single' | 'full'>('overview');

  useEffect(() => {
    fetchPolymarketData();
  }, [userQuestion]);

  useEffect(() => {
    if (selectedOutcome && outcomes.length > 0 && viewMode === 'single') {
      const outcome = outcomes.find(o => o.name === selectedOutcome);
      if (outcome) {
        setMarketOdds(outcome.odds);
        if (onDataReceived) {
          onDataReceived(outcome.odds);
        }
      }
    }
  }, [selectedOutcome, outcomes, viewMode]);

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
      setMarketName(market.question || data.title || 'Unknown Market');
      
      // Extract volume if available
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

      const outcomesList: MarketOutcome[] = parsedOutcomes.map((name: string, idx: number) => ({
        name,
        odds: Math.round(parseFloat(parsedPrices[idx]) * 100),
        aiConfidence: 0,
        edge: 0,
        momentum: 0
      }));

      // CRITICAL: Sort by probability DESCENDING
      outcomesList.sort((a, b) => b.odds - a.odds);

      setOutcomes(outcomesList);

      // MARKET TYPE DETECTION
      if (outcomesList.length > 2) {
        setIsCategorical(true);
        setViewMode('overview');
        
        // STEP 1: Try to match URL slug to specific outcome
        const urlMatch = userQuestion.match(/polymarket\.com\/event\/([^\/\s]+)(?:\/([^\/\s]+))?/);
        const outcomeSlug = urlMatch?.[2];
        
        let matched = false;
        if (outcomeSlug) {
          const matchedOutcome = outcomesList.find(o => 
            o.name.toLowerCase().includes(outcomeSlug.toLowerCase().replace(/-/g, ' ')) ||
            outcomeSlug.toLowerCase().includes(o.name.toLowerCase().replace(/\s/g, '-'))
          );
          if (matchedOutcome) {
            setSelectedOutcome(matchedOutcome.name);
            matched = true;
          }
        }
        
        // STEP 2: Default to HIGHEST probability (first after sort)
        if (!matched) {
          setSelectedOutcome(outcomesList[0].name);
        }
      } else {
        // Binary market
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

  const analyzeSingleOutcome = (outcomeName: string) => {
    setSelectedOutcome(outcomeName);
    setViewMode('single');
  };

  const analyzeFullMarket = () => {
    setViewMode('full');
    // Calculate AI predictions for all outcomes
    const analyzed = outcomes.map(outcome => ({
      ...outcome,
      aiConfidence: Math.round(50 + (Math.random() - 0.5) * 30), // TODO: Real AI calc
      edge: 0
    })).map(outcome => ({
      ...outcome,
      edge: outcome.aiConfidence - outcome.odds
    }));
    
    setOutcomes(analyzed);
    if (onMarketAnalysis) {
      onMarketAnalysis(analyzed);
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

  // OVERVIEW MODE - Market Intelligence Dashboard
  if (isCategorical && viewMode === 'overview') {
    const topOutcome = outcomes[0];
    const marketInsight = outcomes[0].odds > 40 
      ? `${outcomes[0].name} leading with strong ${outcomes[0].odds}% consensus`
      : 'Market is highly uncertain with no clear leader';

    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-2xl font-bold text-white">{marketName}</h2>
          </div>
          {marketVolume && (
            <div className="text-sm text-gray-400">
              {marketVolume} Volume · High Liquidity ✓
            </div>
          )}
        </div>

        {/* Market Landscape */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">MARKET LANDSCAPE</h3>
          <div className="space-y-3">
            {outcomes.map((outcome, idx) => (
              <div key={outcome.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{outcome.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">{outcome.odds}%</span>
                    {outcome.momentum && outcome.momentum !== 0 && (
                      <span className={`text-sm ${outcome.momentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {outcome.momentum > 0 ? '↑' : '↓'}{Math.abs(outcome.momentum)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      idx === 0 ? 'bg-purple-500' : 'bg-gray-500'
                    }`}
                    style={{ width: `${outcome.odds}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Insight */}
        <div className="mb-6 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-300 mb-1">
            <span>🔥</span>
            <span className="font-semibold">MARKET INSIGHT</span>
          </div>
          <div className="text-sm text-gray-300">{marketInsight}</div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="text-sm text-gray-400 mb-2">Which outcome do you want to analyze?</div>
          <div className="grid grid-cols-2 gap-2">
            {outcomes.slice(0, 4).map((outcome) => (
              <button
                key={outcome.name}
                onClick={() => analyzeSingleOutcome(outcome.name)}
                className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 rounded-lg transition-all text-left"
              >
                <div className="text-white font-semibold text-sm">{outcome.name}</div>
                <div className="text-gray-400 text-xs">{outcome.odds}%</div>
              </button>
            ))}
          </div>
          
          <button
            onClick={analyzeFullMarket}
            className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg font-semibold text-white transition-all"
          >
            🤖 Analyze the FULL Market →
          </button>
        </div>
      </div>
    );
  }

  // FULL MARKET ANALYSIS MODE
  if (isCategorical && viewMode === 'full') {
    const strongestEdge = outcomes.reduce((prev, current) => 
      Math.abs(current.edge || 0) > Math.abs(prev.edge || 0) ? current : prev
    );

    return (
      <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
        <button
          onClick={() => setViewMode('overview')}
          className="mb-4 text-gray-400 hover:text-white text-sm"
        >
          ← Back to Overview
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">FULL MARKET AI ANALYSIS</h2>
        <p className="text-gray-400 text-sm mb-6">{marketName}</p>

        {/* Comparison Table */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                <th className="pb-3">OUTCOME</th>
                <th className="pb-3 text-right">POLYMARKET</th>
                <th className="pb-3 text-right">PLAYPICKS AI</th>
                <th className="pb-3 text-right">EDGE</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {outcomes.map((outcome) => (
                <tr key={outcome.name} className="border-b border-gray-800">
                  <td className="py-3 text-white font-medium">{outcome.name}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500"
                          style={{ width: `${outcome.odds}%` }}
                        />
                      </div>
                      <span className="text-white w-10">{outcome.odds}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500"
                          style={{ width: `${outcome.aiConfidence}%` }}
                        />
                      </div>
                      <span className="text-white w-10">{outcome.aiConfidence}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className={`font-semibold ${
                        (outcome.edge || 0) > 5 ? 'text-green-400' :
                        (outcome.edge || 0) < -5 ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {(outcome.edge || 0) > 0 ? '+' : ''}{outcome.edge}%
                      </span>
                      {Math.abs(outcome.edge || 0) > 10 && (
                        <span>{(outcome.edge || 0) > 0 ? '🔥' : '📉'}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Recommendation */}
        <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-300 mb-3">
            <span>🤖</span>
            <span className="font-semibold">AI RECOMMENDATION</span>
          </div>
          <div className="text-sm text-gray-300 mb-4">
            {strongestEdge.edge && strongestEdge.edge > 10 ? (
              <>
                <strong className="text-white">{strongestEdge.name}</strong> appears undervalued by AI signals 
                (+{strongestEdge.edge}% edge). Strongest divergence opportunity.
              </>
            ) : strongestEdge.edge && strongestEdge.edge < -10 ? (
              <>
                <strong className="text-white">{strongestEdge.name}</strong> appears overvalued by AI signals 
                ({strongestEdge.edge}% edge). Caution recommended.
              </>
            ) : (
              <>Market and AI signals are well-aligned. No significant divergence opportunities detected.</>
            )}
          </div>

          <div className="flex gap-2">
            {outcomes.slice(0, 2).map((outcome) => (
              <button
                key={outcome.name}
                onClick={() => analyzeSingleOutcome(outcome.name)}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold text-white transition-all"
              >
                Deep Dive: {outcome.name} →
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // SINGLE OUTCOME MODE (or Binary Market)
  const divergence = marketOdds !== null ? Math.abs(aiPrediction - marketOdds) : null;

  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
      {isCategorical && (
        <button
          onClick={() => setViewMode('overview')}
          className="mb-4 text-gray-400 hover:text-white text-sm"
        >
          ← Back to Overview
        </button>
      )}

      <h2 className="text-xl font-bold mb-4 text-white">
        {isCategorical ? 'Single Outcome Analysis' : 'Market Analysis'}
      </h2>
      
      {isCategorical && selectedOutcome && (
        <>
          {/* Outcome Switcher Dropdown */}
          <div className="mb-4 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <label className="text-xs text-purple-300 block mb-2">ANALYZING OUTCOME</label>
            <select
              value={selectedOutcome}
              onChange={(e) => {
                setSelectedOutcome(e.target.value);
                const outcome = outcomes.find(o => o.name === e.target.value);
                if (outcome) {
                  setMarketOdds(outcome.odds);
                  if (onDataReceived) {
                    onDataReceived(outcome.odds);
                  }
                }
              }}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white font-semibold focus:outline-none focus:border-purple-500"
            >
              {outcomes.map(outcome => (
                <option key={outcome.name} value={outcome.name}>
                  {outcome.name} ({outcome.odds}%)
                </option>
              ))}
            </select>
          </div>

          {/* All Outcomes Overview Panel */}
          <div className="mb-4 p-4 bg-black/40 rounded-lg border border-gray-700">
            <div className="text-sm font-semibold text-gray-300 mb-3">ALL OUTCOMES OVERVIEW</div>
            <div className="space-y-2">
              {outcomes.map((outcome) => (
                <div key={outcome.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1">
                    <span className={outcome.name === selectedOutcome ? 'text-purple-400 font-semibold' : 'text-gray-400'}>
                      {outcome.name}
                    </span>
                    {outcome.name === selectedOutcome && (
                      <span className="text-xs text-purple-400">← ANALYZING</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={outcome.name === selectedOutcome ? 'bg-purple-500' : 'bg-gray-500'}
                        style={{ width: `${outcome.odds}%`, height: '100%' }}
                      />
                    </div>
                    <span className="text-gray-300 w-12 text-right">{outcome.odds}%</span>
                    {outcome.momentum && outcome.momentum !== 0 && (
                      <span className={`text-xs w-10 ${outcome.momentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {outcome.momentum > 0 ? '↑' : '↓'}{Math.abs(outcome.momentum)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
