'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { calculateIntelligence } from '@/lib/intelligenceEngine';
import { SourcesMarketplace } from '@/components/SourcesMarketplace';

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || 'Unknown Event';
  
  const [intelligence, setIntelligence] = useState<any>(null);
  const [polymarketOdds, setPolymarketOdds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // DEFAULT WEIGHTS - ALWAYS START HERE
  const DEFAULT_WEIGHTS = { social: 40, news: 35, technical: 25 };
  
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [customSources, setCustomSources] = useState<any[]>([]);
  const [showSourcePanel, setShowSourcePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'weights' | 'marketplace'>('weights');

  // Load saved data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedWeights = localStorage.getItem('signalWeights');
        if (savedWeights) {
          const parsed = JSON.parse(savedWeights);
          setWeights(parsed);
        }
        
        const savedSources = localStorage.getItem('customSources');
        if (savedSources) {
          setCustomSources(JSON.parse(savedSources));
        }
      } catch {}
    }
  }, []);

  // Calculate smart weights based on active sources
  const calculateSmartWeights = (manualWeights: typeof weights) => {
    const sourcesByType = {
      news: customSources.filter(s => s.enabled && s.type === 'news').length,
      social: customSources.filter(s => s.enabled && s.type === 'social').length,
      technical: customSources.filter(s => s.enabled && s.type === 'technical').length
    };

    // If user has explicitly set weights, use those
    if (manualWeights !== DEFAULT_WEIGHTS) {
      return manualWeights;
    }

    // Otherwise, adjust based on available sources
    let adjusted = { ...DEFAULT_WEIGHTS };
    
    // Reduce weight if no sources of that type
    if (sourcesByType.news === 0) {
      adjusted.news = Math.max(10, adjusted.news - 10);
    }
    if (sourcesByType.social === 0) {
      adjusted.social = Math.max(10, adjusted.social - 10);
    }

    // Normalize to 100
    const total = adjusted.news + adjusted.social + adjusted.technical;
    if (total !== 100) {
      const factor = 100 / total;
      adjusted.news = Math.round(adjusted.news * factor);
      adjusted.social = Math.round(adjusted.social * factor);
      adjusted.technical = 100 - adjusted.news - adjusted.social;
    }

    return adjusted;
  };

  const getCustomSourcesCount = () => {
    return customSources.filter((s: any) => s.enabled).length;
  };

  const runAnalysis = () => {
    const baseConfidence = 54;
    const customSourcesCount = getCustomSourcesCount();
    const smartWeights = calculateSmartWeights(weights);
    
    const result = calculateIntelligence(
      baseConfidence,
      smartWeights,
      customSourcesCount,
      polymarketOdds,
      event
    );
    
    setIntelligence(result);
    setLoading(false);
  };

  useEffect(() => {
    runAnalysis();
  }, [event, polymarketOdds, customSources]);

  const handleWeightChange = (type: 'social' | 'news' | 'technical', value: number) => {
    const newWeights = { ...weights, [type]: value };
    
    // Auto-balance other weights proportionally
    const others = ['social', 'news', 'technical'].filter(k => k !== type) as ('social' | 'news' | 'technical')[];
    const otherTotal = others.reduce((sum, key) => sum + weights[key], 0);
    const remaining = 100 - value;
    
    if (otherTotal > 0) {
      others.forEach(key => {
        newWeights[key] = Math.round((weights[key] / otherTotal) * remaining);
      });
      
      // Fix rounding errors
      const actualTotal = newWeights.social + newWeights.news + newWeights.technical;
      if (actualTotal !== 100) {
        newWeights[others[0]] += (100 - actualTotal);
      }
    }
    
    setWeights(newWeights);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('signalWeights', JSON.stringify(newWeights));
    }
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
    if (typeof window !== 'undefined') {
      localStorage.setItem('signalWeights', JSON.stringify(DEFAULT_WEIGHTS));
    }
  };

  const applyAndReanalyze = () => {
    runAnalysis();
    setShowSourcePanel(false);
  };

  const addSourceFromMarketplace = (source: any) => {
    const newSource = {
      id: source.id,
      name: source.name,
      url: source.url,
      type: source.type,
      enabled: true
    };
    const updated = [...customSources, newSource];
    setCustomSources(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSources', JSON.stringify(updated));
    }
  };

  const toggleSource = (id: string) => {
    const updated = customSources.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setCustomSources(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSources', JSON.stringify(updated));
    }
  };

  const removeSource = (id: string) => {
    const updated = customSources.filter(s => s.id !== id);
    setCustomSources(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customSources', JSON.stringify(updated));
    }
  };

  const saveAnalysis = () => {
    if (typeof window === 'undefined' || !intelligence) return;
    
    const analysis = {
      id: Date.now().toString(),
      event,
      direction: intelligence.direction,
      confidence: intelligence.confidence,
      timestamp: Date.now(),
      polymarketOdds
    };
    
    try {
      const saved = localStorage.getItem('savedAnalyses');
      const analyses = saved ? JSON.parse(saved) : [];
      
      const existing = analyses.find((a: any) => a.event === event);
      if (existing) {
        alert('This analysis is already saved!');
        return;
      }
      
      analyses.unshift(analysis);
      localStorage.setItem('savedAnalyses', JSON.stringify(analyses));
      alert('✅ Analysis saved to your profile!');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('❌ Failed to save analysis');
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

  const smartWeights = calculateSmartWeights(weights);
  const sourcesByType = {
    news: customSources.filter(s => s.enabled && s.type === 'news').length,
    social: customSources.filter(s => s.enabled && s.type === 'social').length,
    technical: customSources.filter(s => s.enabled && s.type === 'technical').length
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
              ← Back
            </button>
            
            <button
              onClick={() => router.push('/profile')}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              View Profile →
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Forecast Engine</h1>
              <p className="text-gray-400 text-sm">
                Multi-source prediction engine analyzing news sentiment, market probability signals, and community trends
              </p>
            </div>

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
              <button
                onClick={saveAnalysis}
                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* MANAGE SOURCES PANEL */}
        {showSourcePanel && (
          <div className="mb-6 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl overflow-hidden">
            
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
                onClick={() => setActiveTab('marketplace')}
                className={`flex-1 px-6 py-4 font-semibold transition-all ${
                  activeTab === 'marketplace'
                    ? 'bg-purple-600 text-white'
                    : 'bg-black/40 text-gray-400 hover:text-white'
                }`}
              >
                Source Marketplace ({getCustomSourcesCount()})
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'weights' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-white">Adjust Signal Weights</h3>
                  
                  {/* NEWS WEIGHT */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <div>
                        <span className="text-gray-300">News Sources</span>
                        {sourcesByType.news === 0 && (
                          <span className="ml-2 text-xs text-orange-400">⚠ No sources active</span>
                        )}
                      </div>
                      <span className="text-white font-bold">{smartWeights.news}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.news}
                      onChange={(e) => handleWeightChange('news', parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* SOCIAL WEIGHT */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <div>
                        <span className="text-gray-300">Social Sources</span>
                        {sourcesByType.social === 0 && (
                          <span className="ml-2 text-xs text-orange-400">⚠ No sources active</span>
                        )}
                      </div>
                      <span className="text-white font-bold">{smartWeights.social}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.social}
                      onChange={(e) => handleWeightChange('social', parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  {/* TECHNICAL WEIGHT */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300">Market Probability (Polymarket)</span>
                      <span className="text-white font-bold">{smartWeights.technical}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weights.technical}
                      onChange={(e) => handleWeightChange('technical', parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-700 flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-400">Total: </span>
                      <span className="text-white font-bold">{smartWeights.news + smartWeights.social + smartWeights.technical}%</span>
                      {smartWeights.news + smartWeights.social + smartWeights.technical === 100 && (
                        <span className="ml-2 text-green-400">✓</span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={resetWeights}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all text-sm"
                      >
                        Reset to Default
                      </button>
                      <button
                        onClick={applyAndReanalyze}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-all text-sm"
                      >
                        Apply & Re-analyze
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-black/40 rounded-lg border border-gray-700">
                    <div className="text-sm text-gray-400 mb-2">💡 Smart Weights:</div>
                    <div className="text-sm text-gray-300">
                      Weights automatically adjust based on your active sources. Add more sources to improve prediction accuracy.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'marketplace' && (
                <div className="space-y-6">
                  {/* ACTIVE SOURCES */}
                  {customSources.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">
                        Your Active Sources ({getCustomSourcesCount()})
                      </h3>
                      <div className="space-y-2 mb-6">
                        {customSources.map((source) => (
                          <div
                            key={source.id}
                            className="p-3 bg-black/40 border border-gray-700 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={source.enabled}
                                onChange={() => toggleSource(source.id)}
                                className="w-4 h-4 rounded accent-purple-500"
                              />
                              <div className="flex-1">
                                <div className="text-white font-medium">{source.name}</div>
                                <div className="text-xs text-gray-500">{source.type}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeSource(source.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-semibold transition-all"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MARKETPLACE */}
                  <SourcesMarketplace
                    onAddSource={addSourceFromMarketplace}
                    activeSources={customSources.map(s => s.id)}
                  />
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
                  <span className="text-white">{smartWeights.news}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Social Sources:</span>
                  <span className="text-white">{smartWeights.social}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Market Probability:</span>
                  <span className="text-white">{smartWeights.technical}%</span>
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
