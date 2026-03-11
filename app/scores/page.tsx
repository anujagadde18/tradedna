'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
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

  // Get user's custom weights from localStorage
  const getWeights = () => {
    if (typeof window === 'undefined') return { social: 40, news: 35, technical: 25 };
    
    try {
      const saved = localStorage.getItem('signalWeights');
      return saved ? JSON.parse(saved) : { social: 40, news: 35, technical: 25 };
    } catch {
      return { social: 40, news: 35, technical: 25 };
    }
  };

  // Get custom sources count
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
    // Simulate base analysis (in production, this would be real data)
    const baseConfidence = 54; // This could come from your existing analysis
    const weights = getWeights();
    const customSourcesCount = getCustomSourcesCount();
    
    // IMPORTANT: Intelligence will be recalculated when polymarketOdds updates!
    const result = calculateIntelligence(
      baseConfidence,
      weights,
      customSourcesCount,
      polymarketOdds, // Pass Polymarket odds here!
      event
    );
    
    setIntelligence(result);
    setLoading(false);
  }, [event, polymarketOdds]); // Recalculate when Polymarket odds change!

  // Callback to receive Polymarket odds from the comparison component
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
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-8 w-8 text-purple-400" />
            <h1 className="text-3xl font-bold">AI Forecast Engine</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Multi-source prediction engine analyzing news sentiment, market probability signals, and community trends
          </p>
        </div>

        {/* Main Grid - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            
            {/* Event Question */}
            <Card className="bg-gradient-to-br from-purple-900/20 to-black border-purple-500/30">
              <CardHeader>
                <CardDescription className="text-gray-400">Analyzing Event</CardDescription>
                <CardTitle className="text-xl text-white break-words">{event}</CardTitle>
              </CardHeader>
            </Card>

            {/* Main Prediction */}
            <Card className="bg-gradient-to-br from-purple-900/20 to-black border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white">AI Prediction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-6xl font-bold mb-2">
                    {intelligence.direction}
                  </div>
                  <div className={`text-4xl font-bold mb-2 ${getConfidenceColor(intelligence.confidence)}`}>
                    {intelligence.confidence}% Confidence
                  </div>
                  <div className="text-gray-400">{intelligence.probabilityLabel}</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg">
                    <span className="text-gray-300">NO</span>
                    <Progress 
                      value={intelligence.direction === 'NO' ? intelligence.confidence : (100 - intelligence.confidence)} 
                      className="flex-1 mx-4 h-2"
                    />
                    <span className="text-gray-300">YES</span>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-1">PREDICTION STRENGTH</div>
                    <div className="text-lg font-semibold text-white">{intelligence.predictionStrength}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Polymarket Comparison */}
            <PolymarketComparison 
              userQuestion={event}
              aiPrediction={intelligence.confidence}
              onDataReceived={handlePolymarketData}
            />

            {/* Risk Level */}
            <Card className="bg-gradient-to-br from-red-900/20 to-black border-red-500/30">
              <CardHeader>
                <CardTitle className={getRiskColor(intelligence.riskLevel)}>
                  {intelligence.riskLevel}
                </CardTitle>
              </CardHeader>
            </Card>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* Sources Used */}
            <Card className="bg-gradient-to-br from-blue-900/20 to-black border-blue-500/30">
              <CardHeader>
                <CardTitle>Sources Used in This Analysis</CardTitle>
                <CardDescription>
                  {getCustomSourcesCount()} sources ({getCustomSourcesCount() > 0 ? getCustomSourcesCount() - 1 : 0} custom)
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Signal Contribution */}
            <Card className="bg-gradient-to-br from-green-900/20 to-black border-green-500/30">
              <CardHeader>
                <CardTitle>Signal Contribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {intelligence.modelComponents.map((component: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{component.name}</span>
                      <span className="text-white font-semibold">
                        {component.contribution > 0 ? '+' : ''}{component.contribution}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.abs(component.contribution)} 
                      className="h-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">{component.description}</p>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-white font-semibold">Total Confidence</span>
                    <span className="text-white font-bold">{intelligence.confidence}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confidence Drivers */}
            <Card className="bg-gradient-to-br from-purple-900/20 to-black border-purple-500/30">
              <CardHeader>
                <CardTitle>Confidence Drivers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-2 uppercase">
                    Positive Signals
                  </h4>
                  <ul className="space-y-2">
                    {intelligence.confidenceDrivers.positive.map((driver: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
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
                        <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Why This Prediction */}
            <Card className="bg-gradient-to-br from-blue-900/20 to-black border-blue-500/30">
              <CardHeader>
                <CardTitle>Why This Prediction?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">
                  {intelligence.explanation}
                </p>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Analysis saved to profile • Not financial advice • Research purposes only
        </div>
      </div>
    </div>
  );
}
