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
  const [loading, setLoading] = useState(true);
  
  const DEFAULT_WEIGHTS = { social: 40, news: 35, technical: 25 };
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [customSources, setCustomSources] = useState<any[]>([]);

  const getCustomSourcesCount = () => {
    return customSources.filter((s: any) => s.enabled).length;
  };

  const runAnalysis = () => {
    if (marketType === 'categorical') {
      // For categorical, skip binary YES/NO analysis
      setLoading(false);
      return;
    }

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
  }, [event, polymarketOdds, marketType]);

  const handlePolymarketData = (odds: number, type?: 'binary' | 'categorical') => {
    setPolymarketOdds(odds);
    if (type) {
      setMarketType(type);
    }
  };

  const smartWeights = weights;

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
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Forecast Engine</h1>
              <p className="text-gray-400 text-sm">
                Multi-source prediction engine analyzing market signals
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Analyzing Event</div>
              <div className="text-xl text-white font-semibold break-words">{event}</div>
            </div>

            {/* BINARY: Show AI Prediction Card */}
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
            )}

            {/* CATEGORICAL OR BINARY: Polymarket Comparison */}
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

            {/* BINARY: Show Signal Contribution */}
            {marketType === 'binary' && intelligence && (
              <>
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
              </>
            )}

            {/* CATEGORICAL: Different explanatory text */}
            {marketType === 'categorical' && polymarketOdds && (
              <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">Market Race Analysis</h2>
                <p className="text-gray-300 leading-relaxed">
                  This is a competitive race market with multiple outcomes. The leader currently holds {polymarketOdds}% market probability. 
                  AI signals analyze each competitor's momentum, news sentiment, and social trends to identify the strongest conviction picks.
                </p>
              </div>
            )}

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
