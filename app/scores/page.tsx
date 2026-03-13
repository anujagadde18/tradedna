'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { calculateIntelligence } from '@/lib/intelligenceEngine';

// Source Marketplace Data
const SOURCE_MARKETPLACE = {
  news: [
    { name: 'Reuters', desc: 'Global newswire coverage', url: 'https://feeds.reuters.com' },
    { name: 'Bloomberg', desc: 'Financial & markets news', url: 'https://bloomberg.com' },
    { name: 'Associated Press', desc: 'Breaking news worldwide', url: 'https://apnews.com' },
    { name: 'BBC News', desc: 'International coverage', url: 'https://bbc.com/news' },
    { name: 'CoinDesk', desc: 'Crypto & blockchain news', url: 'https://coindesk.com' },
    { name: 'ESPN', desc: 'Sports news & analysis', url: 'https://espn.com' },
    { name: 'Politico', desc: 'Politics & policy news', url: 'https://politico.com' },
    { name: 'Financial Times', desc: 'Business & finance', url: 'https://ft.com' },
  ],
  social: [
    { name: 'r/politics', desc: 'Political discussion', url: 'https://reddit.com/r/politics' },
    { name: 'r/investing', desc: 'Investment sentiment', url: 'https://reddit.com/r/investing' },
    { name: 'r/cryptocurrency', desc: 'Crypto community', url: 'https://reddit.com/r/cryptocurrency' },
    { name: 'r/sports', desc: 'Sports discussion', url: 'https://reddit.com/r/sports' },
    { name: 'Twitter/X', desc: 'Real-time public sentiment', url: 'https://twitter.com' },
    { name: 'StockTwits', desc: 'Trader sentiment', url: 'https://stocktwits.com' },
  ],
  technical: [
    { name: 'Kalshi', desc: 'Prediction market odds', url: 'https://kalshi.com' },
    { name: 'Metaculus', desc: 'Forecasting community', url: 'https://metaculus.com' },
    { name: 'PredictIt', desc: 'Political prediction market', url: 'https://predictit.org' },
    { name: 'Manifold', desc: 'Play-money prediction market', url: 'https://manifold.markets' },
    { name: 'Augur', desc: 'Decentralized predictions', url: 'https://augur.net' },
  ]
};

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || 'Unknown Event';
  
  const [intelligence, setIntelligence] = useState<any>(null);
  const [polymarketOdds, setPolymarketOdds] = useState<number | null>(null);
  const [marketType, setMarketType] = useState<'binary' | 'categorical'>('binary');
  const [categoricalOutcomes, setCategoricalOutcomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Weights & Sources
  const DEFAULT_WEIGHTS = { news: 35, social: 40, technical: 25 };
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [activeSources, setActiveSources] = useState<any[]>([]);
  const [showSources, setShowSources] = useState(false);
  const [sourceTab, setSourceTab] = useState<'weights' | 'marketplace'>('weights');
  const [sourceCategory, setSourceCategory] = useState<'news' | 'social' | 'technical'>('news');
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customType, setCustomType] = useState('news');

  // Load saved data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedWeights = localStorage.getItem('signalWeights');
        if (savedWeights) setWeights(JSON.parse(savedWeights));
        
        const savedSources = localStorage.getItem('customSources');
        if (savedSources) setActiveSources(JSON.parse(savedSources));
      } catch {}
    }
  }, []);

  const runAnalysis = () => {
    if (marketType === 'categorical') {
      setLoading(false);
      return;
    }

    const baseConfidence = 54;
    const customSourcesCount = activeSources.filter(s => s.enabled !== false).length;
    
    const result = calculateIntelligence(
      baseConfidence,
      weights,
      customSourcesCount,
      polymarketOdds,
      event
    );
    
    setIntelligence(result);
    setLoading(false);
  };

  useEffect(() => {
    runAnalysis();
  }, [event, polymarketOdds, marketType]);

  const handlePolymarketData = (odds: number, type?: 'binary' | 'categorical', outcomes?: any[]) => {
    setPolymarketOdds(odds);
    if (type) setMarketType(type);
    if (outcomes) setCategoricalOutcomes(outcomes);
  };

  const handleWeightChange = (key: string, value: number) => {
    const newWeights = { ...weights, [key]: value };
    const others = Object.keys(weights).filter(k => k !== key);
    const otherTotal = others.reduce((sum, k) => sum + (weights as any)[k], 0);
    const remaining = 100 - value;
    
    if (otherTotal > 0) {
      others.forEach(k => {
        (newWeights as any)[k] = Math.round(((weights as any)[k] / otherTotal) * remaining);
      });
    }
    
    const total = Object.values(newWeights).reduce((s: number, v) => s + v, 0);
    if (total !== 100) {
      (newWeights as any)[others[0]] += (100 - total);
    }
    
    setWeights(newWeights);
    localStorage.setItem('signalWeights', JSON.stringify(newWeights));
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
    localStorage.setItem('signalWeights', JSON.stringify(DEFAULT_WEIGHTS));
  };

  const isSourceActive = (name: string) => activeSources.some(s => s.name === name);

  const toggleSource = (source: any, type: string) => {
    let updated;
    if (isSourceActive(source.name)) {
      updated = activeSources.filter(s => s.name !== source.name);
    } else {
      updated = [...activeSources, { ...source, type, enabled: true }];
    }
    setActiveSources(updated);
    localStorage.setItem('customSources', JSON.stringify(updated));
  };

  const addCustomSource = () => {
    if (!customName || !customUrl) return;
    const updated = [...activeSources, {
      name: customName,
      url: customUrl,
      type: customType,
      desc: 'Custom source',
      enabled: true
    }];
    setActiveSources(updated);
    localStorage.setItem('customSources', JSON.stringify(updated));
    setCustomName('');
    setCustomUrl('');
  };

  const handleSave = () => {
    if (typeof window === 'undefined' || !intelligence && !categoricalOutcomes.length) return;
    
    const analysis = {
      id: Date.now().toString(),
      event,
      type: marketType,
      timestamp: Date.now(),
      polymarketOdds
    };
    
    try {
      const saved = localStorage.getItem('savedAnalyses');
      const analyses = saved ? JSON.parse(saved) : [];
      analyses.unshift(analysis);
      localStorage.setItem('savedAnalyses', JSON.stringify(analyses));
      alert('✅ Analysis saved!');
    } catch {
      alert('❌ Failed to save');
    }
  };

  // Calculate signals for right panel
  const newsSignal = Math.round((intelligence?.confidence || polymarketOdds || 50) * (weights.news / 100));
  const socialSignal = Math.round((intelligence?.confidence || polymarketOdds || 50) * (weights.social / 100));
  const marketSignal = Math.round((polymarketOdds || 50) * (weights.technical / 100));
  const totalConfidence = newsSignal + socialSignal + marketSignal;

  const topOutcome = categoricalOutcomes[0] || { name: 'Unknown', odds: 0, weekChange: 0 };

  const positiveSignals = marketType === 'categorical' ? [
    `${topOutcome.name} leads market at ${topOutcome.odds}%`,
    'Strong news sentiment for leader',
    'Community momentum favorable'
  ] : intelligence?.confidenceDrivers?.positive || [];

  const negativeSignals = marketType === 'categorical' ? [
    `Highly competitive — ${categoricalOutcomes.length} active competitors`,
    topOutcome.weekChange < 0 ? `Leader declining ${Math.abs(topOutcome.weekChange)}% this week` : 'Market volatility present',
    `No dominant leader (${topOutcome.odds}% is beatable)`
  ] : intelligence?.confidenceDrivers?.negative || [];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="text-gray-400 hover:text-white text-sm"
            >
              View Profile →
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Forecast Engine</h1>
              <p className="text-gray-400 text-sm">
                Multi-source prediction engine analyzing market signals
              </p>
            </div>

            {/* TOP ACTION BUTTONS */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSources(!showSources)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-all"
              >
                {showSources ? 'Hide' : 'Manage'} Sources
              </button>
              <button
                onClick={runAnalysis}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
              >
                Re-analyze
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* MANAGE SOURCES PANEL */}
        {showSources && (
          <div className="mb-6 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl p-6">
            
            {/* Tab Switcher */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSourceTab('weights')}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                  sourceTab === 'weights' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Adjust Weights
              </button>
              <button
                onClick={() => setSourceTab('marketplace')}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                  sourceTab === 'marketplace' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Source Marketplace ({activeSources.length})
              </button>
            </div>

            {/* Tab 1: Weight Sliders */}
            {sourceTab === 'weights' && (
              <div className="space-y-6">
                <h3 className="text-white font-semibold text-lg">Adjust Signal Weights</h3>
                
                {/* News */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">📰 News Sources</span>
                    <span className="text-purple-400 font-bold">{weights.news}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={weights.news}
                    onChange={(e) => handleWeightChange('news', parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Reuters, Bloomberg, AP News...</p>
                </div>

                {/* Social */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">💬 Social Sources</span>
                    <span className="text-purple-400 font-bold">{weights.social}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={weights.social}
                    onChange={(e) => handleWeightChange('social', parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Twitter/X, Reddit, StockTwits...</p>
                </div>

                {/* Market */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-300">📊 Market Probability</span>
                    <span className="text-purple-400 font-bold">{weights.technical}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" value={weights.technical}
                    onChange={(e) => handleWeightChange('technical', parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Polymarket, Kalshi, Metaculus...</p>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <span className="text-gray-400">Total</span>
                  <span className={`font-bold ${
                    weights.news + weights.social + weights.technical === 100 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {weights.news + weights.social + weights.technical}% 
                    {weights.news + weights.social + weights.technical === 100 ? ' ✓' : ' ✗'}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={resetWeights}
                    className="flex-1 bg-gray-700 text-gray-300 py-2 rounded-lg hover:bg-gray-600"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={() => { runAnalysis(); setShowSources(false); }}
                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                  >
                    Apply & Re-analyze
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Source Marketplace */}
            {sourceTab === 'marketplace' && (
              <div>
                <h3 className="text-white font-semibold text-lg mb-4">Browse Source Marketplace</h3>

                {/* Category Tabs */}
                <div className="flex gap-2 mb-4">
                  {(['news', 'social', 'technical'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSourceCategory(cat)}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        sourceCategory === cat ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {cat === 'news' ? '📰 News' : cat === 'social' ? '💬 Social' : '📊 Technical'}
                    </button>
                  ))}
                </div>

                {/* Source Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {SOURCE_MARKETPLACE[sourceCategory].map(source => (
                    <div
                      key={source.name}
                      className={`p-3 rounded-lg border ${
                        isSourceActive(source.name)
                          ? 'border-purple-500 bg-purple-900/20'
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium text-sm">{source.name}</div>
                          <div className="text-gray-400 text-xs mt-1">{source.desc}</div>
                        </div>
                        <button
                          onClick={() => toggleSource(source, sourceCategory)}
                          className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                            isSourceActive(source.name)
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {isSourceActive(source.name) ? 'Remove' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active Sources */}
                {activeSources.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-gray-400 text-sm mb-2">Active Sources ({activeSources.length})</h4>
                    <div className="space-y-2">
                      {activeSources.map((source: any) => (
                        <div key={source.name} className="flex justify-between items-center p-2 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-purple-400 uppercase">{source.type}</span>
                            <span className="text-white text-sm">{source.name}</span>
                          </div>
                          <button
                            onClick={() => toggleSource(source, source.type)}
                            className="text-red-400 text-xs hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Source Form */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-gray-400 text-sm mb-3">+ Add Custom Source</h4>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="Source name"
                      className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600"
                    />
                    <select
                      value={customType}
                      onChange={e => setCustomType(e.target.value)}
                      className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600"
                    >
                      <option value="news">News</option>
                      <option value="social">Social</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>
                  <input
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 mb-2"
                  />
                  <button
                    onClick={addCustomSource}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
                  >
                    Add Custom Source
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Analyzing Event</div>
              <div className="text-xl text-white font-semibold break-words">{event}</div>
            </div>

            {/* BINARY: AI Prediction Card */}
            {marketType === 'binary' && intelligence && !loading && (
              <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-lg p-6">
                <h2 className="text-white text-xl font-bold mb-6">AI Prediction</h2>
                
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold mb-2">{intelligence.direction}</div>
                  <div className={`text-4xl font-bold mb-2 ${
                    intelligence.confidence >= 70 ? 'text-green-400' :
                    intelligence.confidence >= 55 ? 'text-yellow-400' : 'text-orange-400'
                  }`}>
                    {intelligence.confidence}% Confidence
                  </div>
                  <div className="text-gray-400">{intelligence.probabilityLabel}</div>
                </div>
              </div>
            )}

            {/* Polymarket Comparison */}
            <PolymarketComparison 
              userQuestion={event}
              aiPrediction={intelligence?.confidence || 0}
              onDataReceived={handlePolymarketData}
            />

            {/* BINARY: Risk Level */}
            {marketType === 'binary' && intelligence && (
              <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-lg p-6">
                <h2 className={`text-2xl font-bold ${
                  intelligence.riskLevel === 'Low Risk' ? 'text-green-400' :
                  intelligence.riskLevel === 'Medium Risk' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {intelligence.riskLevel}
                </h2>
              </div>
            )}

            {/* CATEGORICAL: Risk */}
            {marketType === 'categorical' && (
              <div className="bg-gradient-to-br from-yellow-900/20 to-black border border-yellow-500/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-yellow-400">🟡 Medium Risk</h2>
                <p className="text-gray-300 text-sm mt-2">
                  Competitive market with {categoricalOutcomes.length} outcomes. 
                  Leader holds {topOutcome.odds}% — outcome not certain.
                </p>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* 1. Current Configuration */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2">Current Configuration</h2>
              <p className="text-gray-400 text-sm mb-4">
                {activeSources.length} custom sources active
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">News Sources:</span>
                  <span className="text-white">{weights.news}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Social Sources:</span>
                  <span className="text-white">{weights.social}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Market Probability:</span>
                  <span className="text-white">{weights.technical}%</span>
                </div>
              </div>
            </div>

            {/* 2. Signal Contribution */}
            <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Signal Contribution</h2>
              
              {[
                { label: 'News Sentiment Model', value: newsSignal, desc: 'Analyzes sentiment across major outlets', color: 'bg-yellow-500' },
                { label: 'Community Signal Model', value: socialSignal, desc: 'Measures public discussion trends', color: 'bg-green-500' },
                { 
                  label: 'Market Probability Model', 
                  value: marketSignal, 
                  desc: marketType === 'categorical' 
                    ? `${topOutcome.name} leads at ${topOutcome.odds}% · ${categoricalOutcomes.length} competitors`
                    : `Live Polymarket odds ${polymarketOdds}% YES / ${100 - (polymarketOdds || 0)}% NO`,
                  color: 'bg-blue-500' 
                }
              ].map(signal => (
                <div key={signal.label} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{signal.label}</span>
                    <span className="text-white font-semibold">+{signal.value}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`${signal.color} h-2 rounded-full transition-all`}
                      style={{ width: `${Math.min((signal.value / 30) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{signal.desc}</p>
                </div>
              ))}
              
              <div className="pt-4 border-t border-gray-700">
                <div className="flex justify-between">
                  <span className="text-white font-semibold">Total Confidence</span>
                  <span className="text-white font-bold">{totalConfidence}%</span>
                </div>
              </div>
            </div>

            {/* 3. Confidence Drivers */}
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Confidence Drivers</h2>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-2 uppercase">Positive Signals</h4>
                  <ul className="space-y-2">
                    {positiveSignals.map((driver: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-green-400">✓</span>
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-orange-400 mb-2 uppercase">Negative Signals</h4>
                  <ul className="space-y-2">
                    {negativeSignals.map((driver: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-orange-400">⚠</span>
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 4. Why This Prediction */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Why This Prediction?</h2>
              <p className="text-gray-300 leading-relaxed text-sm">
                {marketType === 'categorical' ? (
                  `Market race analysis across news (${weights.news}%), social (${weights.social}%), and market data (${weights.technical}%). 
                  ${topOutcome.name} leads with ${topOutcome.odds}% market probability across ${categoricalOutcomes.length} competitors. 
                  Weekly momentum: ${topOutcome.name} ${topOutcome.weekChange > 0 ? '▲' : '▼'}${Math.abs(topOutcome.weekChange)}%. 
                  AI signals point to ${topOutcome.name} as highest conviction pick with multiple positive indicators.`
                ) : (
                  intelligence?.explanation || 'Analysis pending...'
                )}
              </p>
            </div>

          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Not financial advice · Research purposes only
        </div>
      </div>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-purple-400">Loading...</div>
      </div>
    }>
      <ScoresPageContent />
    </Suspense>
  );
}
