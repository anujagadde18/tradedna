'use client';

import { useState, useEffect } from 'react';

interface Props {
  userQuestion: string;
  aiPrediction: number;
}

// Parse Polymarket URL to extract event slug and optional market slug
function parsePolymarketURL(text: string): { eventSlug: string; marketSlug?: string } | null {
  // Match: polymarket.com/event/EVENT-SLUG or
  //        polymarket.com/event/EVENT-SLUG/MARKET-SLUG
  const match = text.match(/polymarket\.com\/event\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/i);
  
  if (match) {
    return {
      eventSlug: match[1],
      marketSlug: match[2] // Optional - specific market within the event
    };
  }
  
  return null;
}

export function PolymarketComparison({ userQuestion, aiPrediction }: Props) {
  const [polymarketData, setPolymarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchedMarket, setMatchedMarket] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      setMatchedMarket('');
      
      try {
        const urlParse = parsePolymarketURL(userQuestion);
        
        if (urlParse) {
          // DIRECT URL - Use official slug endpoint (NO SEARCH!)
          console.log('Fetching Polymarket event by slug:', urlParse.eventSlug);
          
          // Use official endpoint: /events/slug/{slug}
          const response = await fetch(
            `https://gamma-api.polymarket.com/events/slug/${urlParse.eventSlug}`
          );
          
          if (!response.ok) {
            console.error('Failed to fetch event:', response.status);
            setError('Event not found on Polymarket');
            setLoading(false);
            return;
          }
          
          const event = await response.json();
          console.log('Event data:', event);
          
          // Extract markets from event
          const markets = event.markets || [];
          console.log('Markets in event:', markets.length);
          
          if (markets.length === 0) {
            setError('No markets in this event');
            setLoading(false);
            return;
          }
          
          let targetMarket;
          
          if (urlParse.marketSlug) {
            // SPECIFIC MARKET REQUESTED (e.g., "will-kevin-wilson...")
            console.log('Looking for specific market:', urlParse.marketSlug);
            
            // Find market that matches the market slug
            targetMarket = markets.find((m: any) => 
              m.slug === urlParse.marketSlug ||
              m.conditionId === urlParse.marketSlug
            );
            
            if (!targetMarket) {
              console.warn('Specific market not found, using first market');
              targetMarket = markets[0];
            } else {
              console.log('Found exact market match:', targetMarket.question);
            }
          } else {
            // NO SPECIFIC MARKET - Use first/primary market
            targetMarket = markets[0];
            console.log('Using primary market:', targetMarket.question);
          }
          
          // Process the target market
          await processMarket(targetMarket, event);
          
        } else {
          // TEXT QUERY - Search for matching market
          console.log('Text query, searching Polymarket:', userQuestion);
          
          const response = await fetch(
            `https://gamma-api.polymarket.com/events?` + 
            new URLSearchParams({
              active: 'true',
              closed: 'false',
              limit: '10',
              order: 'volume_24hr'
            })
          );
          
          if (!response.ok) {
            setError('Failed to search Polymarket');
            setLoading(false);
            return;
          }
          
          const events = await response.json();
          console.log('Search results:', events.length, 'events');
          
          if (events.length === 0) {
            setError('No active markets found');
            setLoading(false);
            return;
          }
          
          // For text queries, use the first active market
          // (In production, you'd implement better search matching here)
          const firstEvent = events[0];
          const firstMarket = firstEvent.markets?.[0];
          
          if (!firstMarket) {
            setError('No markets available');
            setLoading(false);
            return;
          }
          
          await processMarket(firstMarket, firstEvent);
        }
        
      } catch (error: any) {
        console.error('Error loading Polymarket:', error);
        setError('Failed to load Polymarket data');
      } finally {
        setLoading(false);
      }
    }
    
    async function processMarket(market: any, event: any) {
      console.log('Processing market:', market.question);
      setMatchedMarket(market.question || 'Unknown market');
      
      // Parse outcomes
      let outcomes: string[];
      let outcomePrices: string[];
      
      try {
        outcomes = typeof market.outcomes === 'string' 
          ? JSON.parse(market.outcomes) 
          : market.outcomes || [];
          
        outcomePrices = typeof market.outcomePrices === 'string'
          ? JSON.parse(market.outcomePrices)
          : market.outcomePrices || [];
      } catch (e) {
        console.error('Parse error:', e);
        setError('Invalid market format');
        return;
      }
      
      console.log('Outcomes:', outcomes);
      console.log('Prices:', outcomePrices);
      
      if (!outcomes || outcomes.length === 0) {
        setError('No outcomes in market');
        return;
      }
      
      // Calculate market odds
      let marketOdds: number;
      
      if (outcomes.length === 2 && outcomePrices && outcomePrices.length === 2) {
        // BINARY MARKET (Yes/No, Up/Down)
        // Use first outcome price (YES/UP)
        const yesPrice = parseFloat(outcomePrices[0] || '0');
        marketOdds = Math.round(yesPrice * 100);
        console.log('Binary market - YES probability:', marketOdds + '%');
        
      } else if (outcomePrices && outcomePrices.length > 0) {
        // MULTI-OUTCOME MARKET
        // Use highest probability
        const prices = outcomePrices.map((p: string) => parseFloat(p || '0'));
        const maxPrice = Math.max(...prices);
        marketOdds = Math.round(maxPrice * 100);
        console.log('Multi-outcome market - top probability:', marketOdds + '%');
        
      } else {
        // Fallback to market metadata if available
        marketOdds = market.bestBid ? Math.round(market.bestBid * 100) : 50;
        console.log('Using fallback price:', marketOdds + '%');
      }
      
      const divergence = Math.abs(aiPrediction - marketOdds);
      
      setComparison({ aiPrediction, marketOdds, divergence });
      setPolymarketData({
        question: market.question,
        marketOdds,
        volume: event.volume || market.volume,
        url: `https://polymarket.com/event/${event.slug || market.slug || ''}`
      });
    }
    
    loadData();
  }, [userQuestion, aiPrediction]);

  if (loading) {
    return (
      <div className="border border-purple-500/20 rounded-lg p-6 bg-black/40">
        <div className="flex items-center gap-2 text-purple-400">
          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          <span>Fetching from Polymarket...</span>
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
        {matchedMarket && (
          <div className="text-xs text-gray-400 mb-3">
            Attempted: <span className="text-purple-300">{matchedMarket}</span>
          </div>
        )}
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
          <h3 className="text-lg font-semibold text-white">AI vs Market</h3>
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

      <div className="mb-4 p-3 bg-black/30 rounded-lg border border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Matched Market:</div>
        <div className="text-sm text-white font-medium leading-snug">{matchedMarket}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/20">
          <div className="text-xs text-purple-300 mb-2">PlayPicks AI</div>
          <div className="text-3xl font-bold text-white">{comparison.aiPrediction}%</div>
          <div className="text-xs text-gray-400 mt-2">Your sources</div>
        </div>

        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/20">
          <div className="text-xs text-blue-300 mb-2">Polymarket</div>
          <div className="text-3xl font-bold text-white">{comparison.marketOdds}%</div>
          <div className="text-xs text-gray-400 mt-2">Market odds</div>
        </div>
      </div>

      <div className="bg-black/40 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Divergence</span>
          <span className={`text-sm font-semibold ${getDivergenceColor()}`}>
            {comparison.divergence}%
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {aiHigher ? (
            <p>💡 AI is {comparison.divergence}% more bullish</p>
          ) : comparison.divergence === 0 ? (
            <p>✅ AI and market agree</p>
          ) : (
            <p>💡 Market is {comparison.divergence}% more bullish</p>
          )}
        </div>
      </div>
    </div>
  );
}
