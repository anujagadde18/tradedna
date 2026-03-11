'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';

// Import the NEW dynamic intelligence engine
import { calculateIntelligence } from '@/lib/intelligenceEngine';

export default function ScoresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || 'Unknown Event';
  
  const [intelligence, setIntelligence] = useState<any>(null);
  const [polymarketOdds, setPolymarketOdds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const getWeights = () => {
    if (typeof window === 'undefined') return { social: 40, news: 35, technical: 25 };
    try {
      const saved = localStorage.getItem('signalWeights');
      return saved ? JSON.parse(saved) : { social: 40, news: 35, technical: 25 };
    } catch {
      return { social: 40, news: 35, technical: 25 };
    }
  };

  const getCustomSourcesCount = () => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem('customSources');
      const sources = saved ? JSON.parse(saved) : [];
      return sources.filter((s: any) => s.enabled).length;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    const baseConfidence = 54;
    const weights = getWeights();
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
  }, [event, polymarketOdds]);

  const handlePolymarketData = (odds: number) => {
    console.log('Received Polymarket odds:', odds);
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
        
        {/* Header */}
        <div className="mb-6">
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            
            {/* Event Question */}
            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-lg p-6">
              <div className="text-gray-400 text-sm mb-2">Analyzing Event</div>
              <div className="text-xl text-white font-semibold break-words">{event}</div>
            </div>

            {/* Main Prediction */}
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
                {/* Progress Bar */}
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

            {/* Polymarket Comparison */}
            <PolymarketComparison 
              userQuestion={event}
              aiPrediction={intelligence.confidence}
              onDataReceived={handlePolymarketData}
            />

            {/* Risk Level */}
            <div className="bg-gradient-to-br from-red-900/20 to-black border border-red-500/30 rounded-lg p-6">
              <h2 className={`text-2xl font-bold ${getRiskColor(intelligence.riskLevel)}`}>
                {intelligence.riskLevel}
              </h2>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* Sources Used */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-2">Sources Used in This Analysis</h2>
              <p className="text-gray-400 text-sm mb-4">
                {getCustomSourcesCount()} sources ({Math.max(0, getCustomSourcesCount() - 1)} custom)
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">News Sources:</span>
                  <span className="text-white">{Math.round(getWeights().news)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Social Sources:</span>
                  <span className="text-white">{Math.round(getWeights().social)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Technical Sources:</span>
                  <span className="text-white">{Math.round(getWeights().technical)}%</span>
                </div>
              </div>
            </div>

            {/* Signal Contribution */}
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

            {/* Confidence Drivers */}
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

            {/* Why This Prediction */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Why This Prediction?</h2>
              <p className="text-gray-300 leading-relaxed">
                {intelligence.explanation}
              </p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Analysis saved to profile • Not financial advice • Research purposes only
        </div>
      </div>
    </div>
  );
}
