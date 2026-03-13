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
  const [marketType, setMarketType] = useState<'binary' | 'categorical'>('binary');
  const [categoricalOutcomes, setCategoricalOutcomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  
  const DEFAULT_WEIGHTS = { news: 35, social: 40, technical: 25 };
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [activeSources, setActiveSources] = useState<any[]>([]);
  const [showSources, setShowSources] = useState(false);

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

  const handleSave = () => {
    if (typeof window === 'undefined') return;
    
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

  const newsSignal = Math.round((polymarketOdds || 50) * (weights.news / 100));
  const socialSignal = Math.round((polymarketOdds || 50) * (weights.social / 100));
  const marketSignal = Math.round((polymarketOdds || 50) * (weights.technical / 100));
  const totalConfidence = newsSignal + socialSignal + marketSignal;

  const topOutcome = categoricalOutcomes[0] || { name: 'Unknown', odds: 0, weekChange: 0, aiConfidence: 0 };

  const getRiskLevel = () => {
    if (marketType === 'binary') {
      return intelligence?.riskLevel || 'Medium Risk';
    }
    return 'Medium Risk';
  };

  const getRiskColor = () => {
    const risk = getRiskLevel();
    if (risk === 'Low Risk') return 'text-green-400';
    if (risk === 'High Risk') return 'text-red-400';
    return 'text-yellow-400';
  };

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
                Manage Sources
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

        {/* Analyzing Event */}
        <div className="mb-6 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl p-4">
          <div className="text-gray-400 text-xs mb-1">Analyzing:</div>
          <div className="text-white text-sm font-mono break-all">{event}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* LEFT COLUMN - MARKET RACE (60%) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* BINARY: AI Prediction Card */}
            {marketType === 'binary' && intelligence && !loading && (
              <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl p-6">
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
          </div>

          {/* RIGHT COLUMN - AI VERDICT (40%) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* AI VERDICT CARD - PRIMARY */}
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🤖</span>
                <h2 className="text-xl font-bold text-white">AI Verdict</h2>
              </div>

              {/* Overall Confidence */}
              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2">Overall Confidence</div>
                <div className="text-4xl font-bold text-purple-400 mb-3">
                  {totalConfidence}%
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all"
                    style={{ width: `${totalConfidence}%` }}
                  />
                </div>
              </div>

              {/* Signal Breakdown */}
              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-3">Based on:</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">📰 News sentiment</span>
                    <span className="text-white font-semibold">+{newsSignal}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">💬 Community signal</span>
                    <span className="text-white font-semibold">+{socialSignal}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">📊 Market data</span>
                    <span className="text-white font-semibold">+{marketSignal}%</span>
                  </div>
                </div>
              </div>

              {/* Verdict Summary - Plain English */}
              <div className="p-4 bg-black/40 rounded-lg mb-4">
                <div className="text-white text-sm leading-relaxed">
                  {marketType === 'categorical' ? (
                    <>
                      <strong className="text-purple-400">{topOutcome.name}</strong> is the strongest pick. 
                      Market agrees at <strong>{topOutcome.odds}%</strong>. 
                      AI confidence: <strong>{topOutcome.aiConfidence}%</strong>
                      {topOutcome.weekChange !== 0 && (
                        <>. Momentum: <strong className={topOutcome.weekChange > 0 ? 'text-green-400' : 'text-red-400'}>
                          {topOutcome.weekChange > 0 ? '▲' : '▼'}{Math.abs(topOutcome.weekChange)}%
                        </strong> this week</>
                      )}.
                    </>
                  ) : intelligence ? (
                    <>
                      Analysis indicates <strong className="text-purple-400">{intelligence.direction}</strong> is probable 
                      at <strong>{intelligence.confidence}%</strong> confidence. 
                      {intelligence.riskLevel && ` ${intelligence.riskLevel}.`}
                    </>
                  ) : (
                    'Analysis pending...'
                  )}
                </div>
              </div>

              {/* Risk Badge */}
              <div className={`px-4 py-3 rounded-lg ${
                getRiskLevel() === 'Low Risk' ? 'bg-green-900/20 border border-green-500/30' :
                getRiskLevel() === 'High Risk' ? 'bg-red-900/20 border border-red-500/30' :
                'bg-yellow-900/20 border border-yellow-500/30'
              }`}>
                <div className={`font-bold text-lg ${getRiskColor()}`}>
                  ⚠️ {getRiskLevel()}
                </div>
                {marketType === 'categorical' && (
                  <div className="text-sm text-gray-300 mt-1">
                    {categoricalOutcomes.length} active competitors. No dominant leader yet.
                  </div>
                )}
              </div>
            </div>

            {/* DETAILED ANALYSIS - COLLAPSED BY DEFAULT */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-xl">
              <button
                onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-xl"
              >
                <span className="text-white font-semibold">See detailed analysis</span>
                <span className="text-gray-400">
                  {showDetailedAnalysis ? '▴' : '▾'}
                </span>
              </button>

              {showDetailedAnalysis && (
                <div className="p-6 pt-0 space-y-6">
                  
                  {/* Signal Contribution - DETAILED */}
                  {marketType === 'binary' && intelligence && (
                    <div>
                      <h3 className="text-white font-semibold mb-3">Signal Contribution</h3>
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
                      </div>
                    </div>
                  )}

                  {/* Confidence Drivers */}
                  {marketType === 'binary' && intelligence && (
                    <div>
                      <h3 className="text-white font-semibold mb-3">Confidence Drivers</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-green-400 font-semibold mb-2 uppercase">Positive Signals</div>
                          <ul className="space-y-1">
                            {intelligence.confidenceDrivers.positive.map((driver: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                <span className="text-green-400">✓</span>
                                <span>{driver}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-xs text-orange-400 font-semibold mb-2 uppercase">Negative Signals</div>
                          <ul className="space-y-1">
                            {intelligence.confidenceDrivers.negative.map((driver: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                <span className="text-orange-400">⚠</span>
                                <span>{driver}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Why This Prediction */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Why This Prediction?</h3>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      {marketType === 'categorical' ? (
                        `Market race analysis across news (${weights.news}%), social (${weights.social}%), and market data (${weights.technical}%). 
                        ${topOutcome.name} leads with ${topOutcome.odds}% market probability across ${categoricalOutcomes.length} competitors.`
                      ) : (
                        intelligence?.explanation || 'Analysis pending...'
                      )}
                    </p>
                  </div>

                </div>
              )}
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
