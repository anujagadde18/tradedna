'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  slug:    string;
  title:   string;
  url:     string;
  volume:  number;
  endDate: string;
  markets: number;
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery]               = useState('');
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [showResults, setShowResults]   = useState(false);
  const searchTimer                     = useRef<NodeJS.Timeout | null>(null);
  const inputRef                        = useRef<HTMLInputElement>(null);

  const isPolymarketUrl = (q: string) => /polymarket\.com\/event\//.test(q);

  // Auto-search as user types — debounced 400ms
  useEffect(() => {
    if (!query.trim() || isPolymarketUrl(query)) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    if (query.trim().length < 3) return;

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
          setShowResults(true);
        } else {
          setSearchResults([]);
          setShowResults(false);
        }
      } catch {}
      setIsSearching(false);
    }, 400);

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsAnalyzing(true);
    setShowResults(false);
    router.push(`/scores?event=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectResult = (result: SearchResult) => {
    setShowResults(false);
    setIsAnalyzing(true);
    router.push(`/scores?event=${encodeURIComponent(result.url)}`);
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000)     return `$${(vol / 1_000).toFixed(0)}K`;
    return `$${vol.toFixed(0)}`;
  };

  const exampleQueries = [
    {
      text:     'https://polymarket.com/event/which-company-has-top-ai-model-end-of-june-style-control-on',
      display:  'Which company has the top AI model by June 2026?',
      category: 'Technology',
    },
    {
      text:     'https://polymarket.com/event/us-x-iran-ceasefire-by',
      display:  'Will there be a US-Iran ceasefire?',
      category: 'Geopolitics',
    },
    {
      text:     'https://polymarket.com/event/will-bitcoin-hit-100k-before-april',
      display:  'Will Bitcoin hit $100k before April?',
      category: 'Crypto',
    },
    {
      text:     'https://polymarket.com/event/fed-rate-cut-may-2025',
      display:  'Will the Fed cut rates in May?',
      category: 'Economics',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />

        <div className="relative max-w-7xl mx-auto px-6 py-20">

          {/* Top nav */}
          <div className="flex justify-end gap-4 mb-8">
            <button onClick={() => router.push('/journal')} className="text-gray-400 hover:text-white text-sm transition-colors">
              📒 Trade Journal
            </button>
            <button onClick={() => router.push('/profile')} className="text-gray-400 hover:text-white text-sm transition-colors">
              👤 Profile
            </button>
          </div>

          {/* Logo */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              PlayPicks AI
            </h1>
            <p className="text-2xl text-gray-300 mb-2">
              Pick Feeds. Tweak Weights. Craft Conviction.
            </p>
            <p className="text-gray-500 text-sm">
              Ask any prediction question. Get AI analysis with sources. Trade with conviction.
            </p>
          </div>

          {/* SEARCH INPUT */}
          <form onSubmit={handleAnalyze} className="max-w-3xl mx-auto mb-6">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                placeholder="What do you want to predict? Ask anything..."
                className="w-full px-6 py-5 text-lg bg-white/10 border-2 border-purple-500/30 rounded-2xl
                         text-white placeholder-gray-400 focus:outline-none focus:border-purple-500
                         transition-all backdrop-blur-sm"
                disabled={isAnalyzing}
                autoComplete="off"
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

            {/* Search hint */}
            <div className="mt-3 text-center text-sm text-gray-400">
              {isPolymarketUrl(query)
                ? '✓ Polymarket URL detected — full live analysis ready'
                : isSearching
                ? '🔍 Searching Polymarket markets...'
                : 'Type a question or paste a Polymarket URL'
              }
            </div>

            {/* AUTO-SEARCH RESULTS DROPDOWN */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-gray-900 border border-purple-500/30 rounded-xl overflow-hidden z-50 shadow-xl">
                <div className="px-4 py-2 border-b border-gray-700">
                  <span className="text-xs text-purple-400 font-medium">
                    {searchResults.length} Polymarket market{searchResults.length > 1 ? 's' : ''} found
                  </span>
                </div>
                {searchResults.map((result, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-purple-900/30 transition-colors border-b border-gray-800 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white font-medium truncate flex-1">
                        {result.title}
                      </div>
                      <div className="text-xs text-purple-400 shrink-0 font-medium">
                        {formatVolume(result.volume)} vol
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      polymarket.com/event/{result.slug}
                    </div>
                  </button>
                ))}
                <div className="px-4 py-2 bg-gray-800/50">
                  <span className="text-xs text-gray-500">
                    Click a market to analyze it with PlayPicks AI
                  </span>
                </div>
              </div>
            )}
          </form>

          {/* Example Queries */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold mb-6 text-center text-gray-300">
              Not sure where to start? Try one of these:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exampleQueries.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(example.text);
                    setShowResults(false);
                  }}
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

      {/* HOW IT WORKS */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center text-white mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold mx-auto mb-4">1</div>
            <h3 className="text-white font-semibold mb-2">Analyze the market</h3>
            <p className="text-gray-400 text-sm">Ask any prediction question or paste a Polymarket URL. AI figures out the rest.</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold mx-auto mb-4">2</div>
            <h3 className="text-white font-semibold mb-2">See your conviction score</h3>
            <p className="text-gray-400 text-sm">AI calculates an edge — where it disagrees with the market and why. You decide if it's worth betting.</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold mx-auto mb-4">3</div>
            <h3 className="text-white font-semibold mb-2">Trade with conviction</h3>
            <p className="text-gray-400 text-sm">Place orders directly through PlayPicks. Every trade is logged with the AI reasoning that justified it.</p>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="max-w-7xl mx-auto px-6 py-10 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-bold mb-2 text-white">Multi-Source Intelligence</h3>
            <p className="text-gray-400 text-sm">News sentiment, community signals, and live Polymarket odds — all in one analysis.</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl">
            <div className="text-3xl mb-4">⚖️</div>
            <h3 className="text-lg font-bold mb-2 text-white">Custom Weighting</h3>
            <p className="text-gray-400 text-sm">Adjust signal weights to match your strategy. Trust markets more? Increase market weight.</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-green-900/20 to-black border border-green-500/30 rounded-xl">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-bold mb-2 text-white">Conviction-Gated Trading</h3>
            <p className="text-gray-400 text-sm">Only trade after the AI analysis runs. See your edge before placing a single dollar.</p>
          </div>
          <div className="p-6 bg-gradient-to-br from-orange-900/20 to-black border border-orange-500/30 rounded-xl">
            <div className="text-3xl mb-4">📒</div>
            <h3 className="text-lg font-bold mb-2 text-white">Trade Journal</h3>
            <p className="text-gray-400 text-sm">Every trade logged with the AI conviction snapshot. Track your win rate when you followed the edge.</p>
            <button onClick={() => router.push('/journal')} className="mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors">
              View journal →
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Not financial advice • Research purposes only</div>
            <div className="flex items-center gap-6">
              <button onClick={() => router.push('/journal')} className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Trade Journal</button>
              <button onClick={() => router.push('/profile')} className="text-xs text-gray-500 hover:text-gray-400 transition-colors">Profile</button>
              <div className="text-xs text-gray-600">Powered by TradeDNA™</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
