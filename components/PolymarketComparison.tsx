'use client';

import { useState, useEffect } from 'react';

interface Props {
  userQuestion: string;
  aiPrediction: number;
}

// Extract Polymarket slug from URL if present
function extractPolymarketSlug(text: string): string | null {
  // Match patterns like:
  // https://polymarket.com/event/uefa-champions-league-winner
  // polymarket.com/event/some-event-name
  const match = text.match(/polymarket\.com\/event\/([a-z0-9-]+)/i);
  return match ? match[1] : null;
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
        // Check if user provided a direct Polymarket URL
        const slug = extractPolymarketSlug(userQuestion);
        
        let endpoint = '/api/polymarket';
        let params = new URLSearchParams();
        
        if (slug) {
          // DIRECT FETCH by slug (more reliable!)
          console.log('Fetching Polymarket event by slug:', slug);
          params.append('endpoint', 'events');
          params.append('slug', slug);
        } else {
          // SEARCH by query (fallback)
          console.log('Searching Polymarket for:', userQuestion);
          params.append('endpoint', 'markets');
          params.append('query', userQuestion);
          params.append('limit', '10');
        }
        
        const response = await fetch(`${endpoint}?${params.toString()}`);
        
        if (!response.ok) {
          setError('Failed to fetch Polymarket data');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('Polymarket response:', data);
        
        // Handle different response formats
        let markets = [];
        if (Array.isArray(data)) {
          markets = data;
        } else if (data.markets && Array.isArray(data.markets)) {
          markets = data.markets;
        } else if (data.event && data.event.markets) {
          // Single event response
          markets = data.event.markets;
        }
        
        if (markets.length === 0) {
          setError('No matching markets found');
          setLoading(false);
          return;
        }
        
        // Filter for active markets
        const activeMarkets = markets.filter((m: any) => 
          m.active === true && m.closed === false
        );
        
        console.log('Active markets found:', activeMarkets.length);
        
        if (activeMarkets.length === 0) {
          setError('No active markets found (all are closed)');
          setLoading(false);
          return;
        }
        
        const market = activeMarkets[0];
        console.log('Using market:', market.question);
        
        // Parse stringified JSON
        let outcomes, outcomePrices;
        
        try {
          outcomes = typeof market.outcomes === 'string' 
            ? JSON.parse(market.outcomes) 
            : market.outcomes;
            
          outcomePrices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          setError('Invalid market data format');
          setLoading(false);
          return;
        }
        
        console.log('Outcomes:', outcomes);
        console.log('Prices:', outcomePrices);
        
        if (!Array.isArray(outcomes) || !Array.isArray(outcomePrices)) {
          setError('Invalid market structure');
          setLoading(false);
          return;
        }
        
        // Filter out zero-probability outcomes
        const validOutcomes = outcomes.map((name: string, idx: number) => ({
          name,
          price: parseFloat(outcomePrices[idx])
        })).filter(o => o.price > 0);
        
        if (validOutcomes.length === 0) {
          setError('No valid outcomes found');
          setLoading(false);
          return;
        }
        
        // Check if multi-outcome
        const isMulti = validOutcomes.length > 2;
        setIsMultiOutcome(isMulti);
        
        if (isMulti) {
          // Multi-outcome market
          const outcomesList = validOutcomes.map((o: any) => ({
            name: o.name,
            probability: Math.round(o.price * 100)
          })).sort((a: any, b: any) => b.probability - a.probability);
          
          setAllOutcomes(outcomesList);
          
          const topOutcome = outcomesList[0];
          const marketOdds = topOutcome.probability;
          const divergence = Math.abs(aiPrediction - marketOdds);
          
          setComparison({
            aiPrediction,
            marketOdds,
            divergence
          });
          
          setPolymarketData({
            question: market.question,
            marketOdds,
            volume: market.volume,
            topOutcome: topOutcome.name,
            url: slug 
              ? `https://polymarket.com/event/${slug}`
              : `https://polymarket.com/event/${market.slug}`
          });
          
        } else {
          // Binary market
          const yesPrice = validOutcomes[0].price;
          const marketOdds = Math.round(yesPrice * 100);
          const divergence = Math.abs(aiPrediction - marketOdds);
          
          setComparison({
            aiPrediction,
            marketOdds,
            divergence
          });
          
          setPolymarketData({
            question: market.question,
            marketOdds,
            volume: market.volume,
            url: slug 
              ? `https://polymarket.com/event/${slug}`
              : `https://polymarket.com/event/${market.slug}`
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
        <div className="text-xs text-gray-500 mb-3">
          {error || 'No matching market found'}
        </div>
        <div className="text-xs text-gray-400 mb-3">
          💡 <strong>Tip:</strong> Paste the full Polymarket event URL for accurate comparison
        </div>
        <a 
          href={`https://polymarket.com/search?q=${encodeURIComponent(userQuestion)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          Search on Polymarket →
        </a>
      </div>
    );
  }

  const getDivergenceColor = () => {
    if (comparison.divergence <= 5) return 'text-green-400';
    if (comparison.divergence <= 15) return 'text-yellow-400';
    if (comparison.divergence <= 30) return 'text-orange-400';
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

      {isMultiOutcome && allOutcomes.length > 0 && (
        <div className="mb-6 bg-black/30 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 mb-3 font-semibold">ALL OUTCOMES</div>
          <div className="space-y-2">
            {allOutcomes.slice(0, 5).map((outcome, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-xs text-gray-300">{outcome.name}</span>
                <span className="text-sm font-bold text-white">{outcome.probability}%</span>
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
