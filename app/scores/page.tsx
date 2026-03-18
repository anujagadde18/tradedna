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
  const [outcomeType, setOutcomeType] = useState<string>('options');
  const [hasPolymarketUrl, setHasPolymarketUrl] = useState<boolean | null>(null);

  const DEFAULT_WEIGHTS = { news: 35, social: 40, technical: 25 };
  const [weights] = useState(DEFAULT_WEIGHTS);

  useEffect(() => {
    setHasPolymarketUrl(/polymarket\.com\/event\//.test(event));
  }, [event]);

  useEffect(() => {
    if (marketType === 'categorical') return;
    const result = calculateIntelligence(54, weights, 0, polymarketOdds, event);
    setIntelligence(result);
  }, [event, polymarketOdds, marketType]);

  const handlePolymarketData = (odds: number, type?: 'binary' | 'categorical', outcomes?: any[], oType?: string) => {
    setPolymarketOdds(odds);
    if (type) setMarketType(type);
    if (outcomes) setCategoricalOutcomes(outcomes);
    if (oType) setOutcomeType(oType);
    setHasPolymarketUrl(true);
  };

  const isPlainTextQuery = hasPolymarketUrl === false;

  const topOutcome = categoricalOutcomes.length > 0 ? categoricalOutcomes[0] : { name: 'Unknown', odds: 0, aiConfidence: 0, edge: 0 };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white text-sm">
            Back
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/journal')} className="text-gray-400 hover:text-white text-sm">
              Journal
            </button>
            <button onClick={() => router.push('/profile')} className="text-gray-400 hover:text-white text-sm">
              View Profile
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">PlayPicks AI</h1>
            <p className="text-gray-400 text-sm">AI-powered prediction analysis</p>
          </div>
          <button
            onClick={() => {
              if (marketType === 'categorical') return;
              const result = calculateIntelligence(54, weights, 0, polymarketOdds, event);
              setIntelligence(result);
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold"
          >
            Refresh results
          </button>
        </div>

        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Analyzing prediction market</div>
          <div className="text-white font-semibold text-sm">{event.length > 80 ? event.slice(0, 80) + '...' : event}</div>
          <div className="text-xs text-gray-500 mt-1">Source: Polymarket</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          <div className="lg:col-span-3">
            <PolymarketComparison
              userQuestion={event}
              aiPrediction={intelligence?.confidence || 0}
              onDataReceived={handlePolymarketData}
              onTradeReady={() => {}}
            />
          </div>

          <div className="lg:col-span-2 space-y-4">
            {isPlainTextQuery ? (
              <div className="border border-gray-700 rounded-xl p-5">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">AI verdict</div>
                {intelligence ? (
                  <>
                    <div className="text-2xl font-bold text-white mb-1">{intelligence.direction}</div>
                    <div className="text-sm text-gray-400 mb-2">General AI signal only</div>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-gray-400">AI confidence</span>
                      <span className="text-purple-400 font-medium">{intelligence.confidence}%</span>
                    </div>
                    <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                      <div className="text-xs text-yellow-300 font-medium mb-1">Limited accuracy</div>
                      <div className="text-xs text-yellow-200/70">
                        Paste a Polymarket URL for live analysis with real betting odds.
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 text-sm">Analyzing...</div>
                )}
              </div>
            ) : (
              <div className="border border-gray-700 rounded-xl p-5">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">AI verdict</div>
                {marketType === 'categorical' ? (
                  <>
                    <div className="text-2xl font-bold text-white mb-1">{topOutcome.name}</div>
                    <div className="text-sm text-gray-400 mb-4">Most likely to win, based on AI analysis</div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Bettors say</span>
                        <span className="text-white font-medium">{topOutcome.odds}% chance</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">AI thinks</span>
                        <span className="text-purple-400 font-medium">{topOutcome.aiConfidence}% chance</span>
                      </div>
                    </div>
                  </>
                ) : intelligence ? (
                  <>
                    <div className="text-2xl font-bold text-white mb-1">{intelligence.direction}</div>
                    <div className="text-sm text-gray-400 mb-4">AI prediction for this market</div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Bettors say</span>
                        <span className="text-white font-medium">{polymarketOdds ?? 0}% chance</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">AI thinks</span>
                        <span className="text-purple-400 font-medium">{intelligence.confidence}% chance</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 text-sm">Analyzing...</div>
                )}
                <div className="border border-gray-700 rounded-lg p-3 mt-2">
                  <div className="text-xs text-gray-500">
                    Market shows {polymarketOdds ?? 0}% probability. Review all signals before deciding.
                  </div>
                </div>
              </div>
            )}

            <div className="border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-400 font-medium mb-3">Current configuration</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">News sources</span>
                  <span className="text-white">{weights.news}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Social sources</span>
                  <span className="text-white">{weights.social}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Market probability</span>
                  <span className="text-white">{weights.technical}%</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-600">
          Not financial advice. Research purposes only.
        </div>
      </div>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-purple-400 text-sm">Loading...</div>
      </div>
    }>
      <ScoresPageContent />
    </Suspense>
  );
}
