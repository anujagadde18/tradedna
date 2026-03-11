'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { calculateIntelligence } from '@/lib/intelligenceEngine';

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || 'Unknown Event';
  
  const [intelligence, setIntelligence] = useState<any>(null);
  const [polymarketOdds, setPolymarketOdds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Controls
  const [weights, setWeights] = useState({ social: 40, news: 35, technical: 25 });
  const [customSources, setCustomSources] = useState<any[]>([]);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'weights' | 'sources'>('weights');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedWeights = localStorage.getItem('signalWeights');
        if (savedWeights) {
          setWeights(JSON.parse(savedWeights));
        }
        
        const savedSources = localStorage.getItem('customSources');
        if (savedSources) {
          setCustomSources(JSON.parse(savedSources));
        }
      } catch {}
    }
  }, []);

  const getCustomSourcesCount = () => {
    return customSources.filter((s: any) => s.enabled).length;
  };

  const runAnalysis = () => {
    const baseConfidence = 54;
    const customSourcesCount = getCustomSourcesCount();
    
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
  }, [event, polymarketOdds, weights, customSources]);

  const handleWeightChange = (type: 'social' | 'news' | 'technical', value: number) => {
    const newWeights = { ...weights, [type]: value };
    
    const total = newWeights.social + newWeights.news + newWeights.technical;
    if (total !== 100) {
      const diff = 100 - total;
      const others = ['social', 'news', 'technical'].filter(k => k !== type) as ('social' | 'news' | 'technical')[];
      const adjust = diff / others.length;
      others.forEach(k => {
        newWeights[k] = Math.max(0, Math.min(100, newWeights[k] + adjust));
      });
    }
    
    setWeights(newWeights);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('signalWeights', JSON.stringify(newWeights));
    }
  };

  const toggleSource = (index: number) => {
    const updated = [...customSources];
    updated[index].enabled = !updated[index].enabled;
    setCustomSources(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSources', JSON.stringify(updated));
    }
  };

  const addCustomSource = () => {
    const newSource = {
      id: Date.now(),
      name: 'New Source',
      url: '',
      type: 'news',
      enabled: true
    };
    const updated = [...customSources, newSource];
    setCustomSources(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSources', JSON.stringify(updated));
    }
  };

  const updateSource = (index: number, field: string, value: string) => {
    const updated = [...customSources];
    updated[index][field] = value;
    setCustomSources(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSources', JSON.stringify(updated));
    }
  };

  const removeSource = (index: number) => {
    const updated = customSources.filter((_, i) => i !== index);
    setCustomSources(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSources', JSON.stringify(updated));
    }
  };

  const handlePolymarketData = (odds: number) => {
    setPolymarketOdds(odds);
  };

  if (loading || !intelligence) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-purple-400">Loading analysis...</div>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400';
    if (confidence >= 55) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'Low Risk') return 'text-green-400';
    if (risk === 'Medium Risk') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER WITH CONTROLS */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/')}
              className="mb-4 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              ← Back
            </button>
            
            <h1 className="text-3xl font-bold mb-2">AI Forecast Engine</h1>
            <p className="text-gray-400 text-sm">
              Multi-source prediction engine analyzing news sentiment, market probability signals, and community trends
            </p>
          </div>

          {/* CONTROL BUTTONS */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowSourcePanel(!showSourcePanel)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-all"
            >
              {showSourcePanel ? 'Hide' : 'Manage'} Sources
            </button>
            <button
              onClick={runAnalysis}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
            >
              Re-analyze
            </button>
          </div>
        </div>

        {/* MANAGE SOURCES PANEL */}
        {showSourcePanel && (
          <div className="mb-6 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl overflow-hidden">
            
            {/* TABS */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab('weights')}
                className={`flex-1 px-6 py-4 font-semibold transition-all ${
                  activeTab === 'weights'
                    ? 'bg-purple-600 text-white'
                    : 'bg-black/40 text-gray-400 hover:text-white'
                }`}
              >
                Adjust Weights
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`flex-1 px-6 py-4 font-semibold transition-all ${
                  activeTab === 'sources'
                    ? 'bg-purple-600 text-white'
                    : 'bg-black/40 text-gray-400 hover:text-white'
                }`}
              >
                Custom Sources ({getCustomSourcesCount()})
              </button>
            </div>

            <div className="p-6">
              {/* WEIGHTS TAB */}
              {activeTab === 'weights' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white">Signal Weights</h3>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Community Signals</span>
                      <span className="text-white font-bold">{Math.round(weights.social)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.social}
                      onChange={(e) => handleWeightChange('social', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">News Sentiment</span>
                      <span className="text-white font-bold">{Math.round(weights.news)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.news}
                      onChange={(e) => handleWeightChange('news', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Market Probability (Polymarket)</span>
                      <span className="text-white font-bold">{Math.round(weights.technical)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.technical}
                      onChange={(e) => handleWeightChange('technical', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div className="p-4 bg-black/40 rounded-lg border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">💡 Tip:</div>
                    <div className="text-sm text-gray-300">
                      Trust market data more? Increase Market Probability weight. 
                      Think community sentiment matters? Boost Community Signals. 
                      Weights automatically balance to total 100%.
                    </div>
                  </div>
                </div>
              )}

              {/* SOURCES TAB */}
              {activeTab === 'sources' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Custom Sources</h3>
                    <button
                      onClick={addCustomSource}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-all text-sm"
                    >
                      + Add Source
                    </button>
                  </div>

                  {customSources.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No custom sources yet. Click "Add Source" to create one.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customSources.map((source, idx) => (
                        <div
                          key={source.id}
                          className="p-4 bg-black/40 border border-gray-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={source.enabled}
                                onChange={() => toggleSource(idx)}
                                className="w-5 h-5 rounded accent-purple-500"
                              />
                              <input
                                type="text"
                                value={source.name}
                                onChange={(e) => updateSource(idx, 'name', e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                                placeholder="Source name"
                              />
                            </div>
                            <button
                              onClick={() => removeSource(idx)}
                              className="ml-3 px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold transition-all"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Type</label>
                              <select
                                value={source.type}
                                onChange={(e) => updateSource(idx, 'type', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                              >
                                <option value="news">News</option>
                                <option value="social">Social</option>
                                <option value="technical">Technical</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">URL/Feed</label>
                              <input
                                type="text"
                                value={source.url}
                                onChange={(e) => updateSource(idx, 'url', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Analyzing Event</div>
              <div className="text-xl text-white font-semibold break-words">{event}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-lg p-6">
              <h2 className="text-white text-xl font-bold mb-6">AI Prediction</h2>
              
              <div className="text-center mb-6">
                <div className="text-6xl font-bold mb-2">{intelligence.direction}</div>
                <div className={`text-4xl font-bold mb-2 ${getConfidenceColor(intelligence.confidence)}`}>
                  {intelligence.confidence}% Confidence
                </div>
                <div className="text-gray-400">{intelligence.probabilityLabel}</div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                  <span className="text-gray-300">NO</span>
                  <div className="flex-1 mx-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all"
                      style={{ 
                        width: `${intelligence.direction === 'YES' ? intelligence.confidence : (100 - intelligence.confidence)}%` 
                      }}
                    />
                  </div>
                  <span className="text-gray-300">YES</span>
                </div>

                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">PREDICTION STRENGTH</div>
                  <div className="text-lg font-semibold text-white">{intelligence.predictionStrength}</div>
                </div>
              </div>
            </div>

            <PolymarketComparison 
              userQuestion={event}
              aiPrediction={intelligence.confidence}
              onDataReceived={handlePolymarketData}
            />

            <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-lg p-6">
              <h2 className={`text-2xl font-bold ${getRiskColor(intelligence.riskLevel)}`}>
                {intelligence.riskLevel}
              </h2>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2">Current Configuration</h2>
              <p className="text-gray-400 text-sm mb-4">
                {getCustomSourcesCount()} custom sources active
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">News Sources:</span>
                  <span className="text-white">{Math.round(weights.news)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Social Sources:</span>
                  <span className="text-white">{Math.round(weights.social)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Market Probability:</span>
                  <span className="text-white">{Math.round(weights.technical)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/20 to-black border border-green-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Signal Contribution</h2>
              
              <div className="space-y-4">
                {intelligence.modelComponents.map((component: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{component.name}</span>
                      <span className="text-white font-semibold">
                        {component.contribution > 0 ? '+' : ''}{component.contribution}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${Math.abs(component.contribution)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{component.description}</p>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-white font-semibold">Total Confidence</span>
                    <span className="text-white font-bold">{intelligence.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Confidence Drivers</h2>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-2 uppercase">
                    Positive Signals
                  </h4>
                  <ul className="space-y-2">
                    {intelligence.confidenceDrivers.positive.map((driver: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-green-400">✓</span>
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-orange-400 mb-2 uppercase">
                    Negative Signals
                  </h4>
                  <ul className="space-y-2">
                    {intelligence.confidenceDrivers.negative.map((driver: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-orange-400">⚠</span>
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Why This Prediction?</h2>
              <p className="text-gray-300 leading-relaxed">
                {intelligence.explanation}
              </p>
            </div>

          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Analysis saved to profile • Not financial advice • Research purposes only
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
