'use client';

import { useState, useEffect } from 'react';

interface Props {
  userQuestion: string;
  aiPrediction: number;
  onDataReceived?: (marketOdds: number) => void; // NEW: Callback to parent
}

function parsePolymarketURL(text: string): { eventSlug: string; marketSlug?: string } | null {
  const match = text.match(/polymarket\.com\/event\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/i);
  
  if (match) {
    return {
      eventSlug: match[1],
      marketSlug: match[2]
    };
  }
  
  return null;
}

export function PolymarketComparison({ userQuestion, aiPrediction, onDataReceived }: Props) {
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
          console.log('Fetching event by slug:', urlParse.eventSlug);
          
          const response = await fetch(
            `/api/polymarket?endpoint=events&slug=${urlParse.eventSlug}`
          );
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('API error:', response.status, errorText);
            setError('Event not found');
            setLoading(false);
            return;
          }
          
          const data = await response.json();
          console.log('API response:', data);
          
          let event;
          if (Array.isArray(data)) {
            event = data[0];
          } else if (data.event) {
            event = data.event;
          } else {
            event = data;
          }
          
          console.log('Event:', event);
          
          if (!event) {
            setError('Event not found');
            setLoading(false);
            return;
          }
          
          const markets = event.markets || [];
          console.log('Markets:', markets.length);
          
          if (markets.length === 0) {
            setError('No markets in event');
            setLoading(false);
            return;
          }
          
          let targetMarket;
          
          if (urlParse.marketSlug) {
            console.log('Looking for:', urlParse.marketSlug);
            
            targetMarket = markets.find((m: any) => 
              m.slug === urlParse.marketSlug ||
              m.slug?.includes(urlParse.marketSlug) ||
              m.conditionId === urlParse.marketSlug
            );
            
            if (!targetMarket) {
              console.warn('Specific market not found');
              targetMarket = markets[0];
            } else {
              console.log('Found:', targetMarket.question);
            }
          } else {
            targetMarket = markets[0];
          }
          
          await processMarket(targetMarket, event);
          
        } else {
          console.log('Searching:', userQuestion);
          
          const response = await fetch(
            `/api/polymarket?endpoint=events&` + 
            new URLSearchParams({
              active: 'true',
              closed: 'false',
              limit: '5',
              order: 'volume_24hr'
            })
          );
          
          if (!response.ok) {
            setError('Search failed');
            setLoading(false);
            return;
          }
          
          const events = await response.json();
          console.log('Search results:', events);
          
          if (!events || events.length === 0) {
            setError('No markets found');
            setLoading(false);
            return;
          }
          
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
        console.error('Error:', error);
        setError('Failed to load: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
    
    async function processMarket(market: any, event: any) {
      console.log('Processing:', market.question);
      setMatchedMarket(market.question || 'Unknown');
      
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
        setError('Invalid format');
        return;
      }
      
      console.log('Outcomes:', outcomes);
      console.log('Prices:', outcomePrices);
      
      let marketOdds: number;
      
      if (outcomePrices && outcomePrices.length > 0) {
        if (outcomePrices.length === 2) {
          marketOdds = Math.round(parseFloat(outcomePrices[0] || '0') * 100);
        } else {
          const prices = outcomePrices.map((p: string) => parseFloat(p || '0'));
          marketOdds = Math.round(Math.max(...prices) * 100);
        }
      } else {
        marketOdds = market.bestBid ? Math.round(market.bestBid * 100) : 50;
      }
      
      console.log('Market odds:', marketOdds + '%');
      
      // SEND DATA TO PARENT!
      if (onDataReceived) {
        onDataReceived(marketOdds);
      }
      
      const divergence = Math.abs(aiPrediction - marketOdds);
      
      setComparison({ aiPrediction, marketOdds, divergence });
      setPolymarketData({
        question: market.question,
        marketOdds,
        volume: event.volume || market.volume,
        url: `https://polymarket.com/event/${event.slug || market.slug}`
      });
    }
    
    loadData();
  }, [userQuestion, aiPrediction, onDataReceived]);

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
          {error || 'No market found'}
        </div>
        {matchedMarket && (
          <div className="text-xs text-gray-400 mb-3">
            Found: <span className="text-purple-300">{matchedMarket}</span>
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
