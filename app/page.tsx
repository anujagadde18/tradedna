'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsAnalyzing(true);
    router.push(`/scores?event=${encodeURIComponent(query.trim())}`);
  };

  const exampleQueries = [
    { 
      text: "Will Trump win the 2024 election?", 
      display: "Will Trump win the 2024 election?",
      category: "Politics" 
    },
    { 
      text: "https://polymarket.com/event/fed-decision-march", 
      display: "Fed Interest Rate Decision - March",
      category: "Economics" 
    },
    { 
      text: "Will Bitcoin hit $100k in 2025?", 
      display: "Will Bitcoin hit $100k in 2025?",
      category: "Crypto" 
    },
    { 
      text: "https://polymarket.com/event/nba-mvp-2024", 
      display: "NBA MVP Winner 2024",
      category: "Sports" 
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* HERO SECTION WITH SEARCH */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          
          {/* Logo & Branding */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              PlayPicks AI
            </h1>
            <p className="text-2xl text-gray-300 mb-2">
              Pick Feeds. Tweak Weights. Craft Conviction.
            </p>
            <p className="text-gray-500 text-sm">
              Multi-source prediction engine analyzing news, markets, and community trends
            </p>
          </div>

          {/* MAIN SEARCH INPUT */}
          <form onSubmit={handleAnalyze} className="max-w-3xl mx-auto mb-16">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Paste a Polymarket URL or ask any question..."
                className="w-full px-6 py-5 text-lg bg-white/10 border-2 border-purple-500/30 rounded-2xl 
                         text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 
                         transition-all backdrop-blur-sm"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={!query.trim() || isAnalyzing}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-8 py-3 bg-purple-600 
                         hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed 
                         rounded-xl font-semibold transition-all"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-400">
              Try pasting a Polymarket event URL or ask any yes/no question
            </div>
          </form>

          {/* Example Queries */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold mb-6 text-center text-gray-300">
              Try these examples:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exampleQueries.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(example.text)}
                  className="p-4 bg-white/5 hover:bg-white/10 border border-gray-700 hover:border-purple-500/50 
                           rounded-xl text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-purple-400 font-semibold">{example.category}</span>
                    <span className="text-gray-500 group-hover:text-purple-400 transition-colors">→</span>
                  </div>
                  <div className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {example.display}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-6 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-3 text-white">Multi-Source Intelligence</h3>
            <p className="text-gray-400">
              Combines news sentiment, community signals, and live market data from Polymarket for comprehensive analysis.
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl">
            <div className="text-4xl mb-4">⚖️</div>
            <h3 className="text-xl font-bold mb-3 text-white">Custom Weighting</h3>
            <p className="text-gray-400">
              Adjust signal weights to match your strategy. Trust markets more? Increase technical weight. Trust community? Boost social signals.
            </p>
          </div>

          <div className="p-6 bg-gradient-to-br from-green-900/20 to-black border border-green-500/30 rounded-xl">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-3 text-white">Full Transparency</h3>
            <p className="text-gray-400">
              See exactly how each signal contributes to the final prediction. No black box - every percentage explained.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Not financial advice • Research purposes only
            </div>
            <div className="text-xs text-gray-600">
              Powered by TradeDNA™
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
