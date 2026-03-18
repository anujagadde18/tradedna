'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { TradePanel } from '@/components/TradePanel';
import { PlainTextAnalysis } from '@/components/PlainTextAnalysis';
import { calculateIntelligence } from '@/lib/intelligenceEngine';

interface TradeReadyData {
  marketTitle: string;
  marketUrl: string;
  outcomeType: string;
  marketType: 'binary' | 'categorical';
  topOutcome: { name: string; odds: number; aiConfidence: number; edge: number; tokenId?: string; };
  binaryTokenYes?: string;
  binaryTokenNo?: string;
}

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || 'Unknown Event';
  const [intelligence, setIntelligence] = useState<any>(null);
  const [polymarketOdds, setPolymarketOdds] = useState<number | null>(null);
  const [marketType, setMarketType] = useState<'binary' | 'categorical'>('binary');
  const [outcomeType, setOutcomeType] = useState<string>('options');
  const [categoricalOutcomes, setCategoricalOutcomes] = useState<any[]>([]);
  const [hasPolymarketUrl, setHasPolymarketUrl] = useState<boolean | null>(null);
  const [tradeData, setTradeData] = useState<TradeReadyData | null>(null);
  const DEFAULT_WEIGHTS = { news: 35, social: 40, technical: 25 };
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [activeSources, setActiveSources] = useState<any[]>([]);

  useEffect(() => {
    setHasPolymarketUrl(/polymarket\.com\/event\//.test(event));
  }, []);

  const runAnalysis = () => {
    if (marketType === 'categorical') return;
    const result = calculateIntelligence(54, weights, 0, polymarketOdds, event);
    setIntelligence(result);
  };

  useEffect(() => { runAnalysis(); }, [event, polymarketOdds, marketType]);

  const handlePolymarketData = (odds: number, type?: 'binary' | 'categorical', outcomes?: any[], oType?: string) => {
    setPolymarketOdds(odds);
    if (type) setMarketType(type);
    if (outcomes) setCategoricalOutcomes(outcomes);
    if (oType) setOutcomeType(oType);
    setHasPolymarketUrl(true);
  };

  const isPlainTextQuery = hasPolymarketUrl === false;
  const binaryAiConfidence = intelligence?.confidence || 0;
  const binaryEdge = binaryAiConfidence - (polymarketOdds || 0);
  const topOutcome = categoricalOutcomes.length > 0 ? categoricalOutcomes[0] : { name: 'Unknown', odds: 0, aiConfidence: 0, edge: 0 };
  const unitLabel = outcomeType === 'candidates' ? 'candidates' : outcomeType === 'companies' ? 'companies' : 'outcomes';

  const riskDescription = marketType === 'categorical'
    ? (categoricalOutcomes.length + ' ' + unitLabel + ' competing. ' + topOutcome.odds + '% means ' + (100 - topOutcome.odds) + '% chance a different outcome wins.')
    : ('Market shows ' + (polymarketOdds ?? 0) + '% probability.');

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white text-sm">Back</button>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/journal')} className="text-gray-400 hover:text-white text-sm">Journal</button>
            <button onClick={() => router.push('/profile')} className="text-gray-400 hover:text-white text-sm">View Profile</button>
          </div>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">PlayPicks AI</h1>
            <p className="text-gray-400 text-sm">AI-powered prediction analysis</p>
          </div>
          <button onClick={runAnalysis} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold">
            Refresh results
          </button>
        </div>

        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Analyzing prediction market</div>
          <div className="text-white font-semibold text-sm">{event.length > 100 ? event.slice(0, 100) + '...' : event}</div>
          <div className="text-xs text-gray-500 mt-1">Source: Polymarket</div>
        </div>

        <div className={isPlainTextQuery ? "max-w-2xl mx-auto" : "grid grid-cols-1 lg:grid-cols-5 gap-6"}>
          {!isPlainTextQuery && (
            <div className="lg:col-span-3">
              <PolymarketComparison
                userQuestion={event}
                aiPrediction={intelligence?.confidence || 0}
                onDataReceived={handlePolymarketData}
                onTradeReady={(data: TradeReadyData) => setTradeData(data)}
              />
            </div>
          )}

          <div className={isPlainTextQuery ? "space-y-4" : "lg:col-span-2 space-y-4"}>
            {isPlainTextQuery ? (
              <PlainTextAnalysis
                question={event}
                confidence={intelligence?.confidence || 50}
                direction={intelligence?.direction || 'YES'}
                weights={weights}
                activeSources={activeSources}
              />
            ) : (
              <div className="border border-gray-700 rounded-xl p-5">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">AI verdict</div>
                {marketType === 'categorical' ? (
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">{topOutcome.name}</div>
                    <div className="text-sm text-gray-400 mb-4">Most likely to win, based on AI analysis</div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Bettors say</span>
                      <span className="text-white">{topOutcome.odds}% chance</span>
                    </div>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-gray-400">AI thinks</span>
                      <span className="text-purple-400">{topOutcome.aiConfidence}% chance</span>
                    </div>
                  </div>
                ) : intelligence ? (
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">{intelligence.direction}</div>
                    <div className="text-sm text-gray-400 mb-4">AI prediction for this market</div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Bettors say</span>
                      <span className="text-white">{polymarketOdds ?? 0}%</span>
                    </div>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-gray-400">AI thinks</span>
                      <span className="text-purple-400">{intelligence.confidence}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm py-4">Analyzing...</div>
                )}
                <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                  <div className="text-xs text-yellow-400 font-semibold mb-1">Medium risk</div>
                  <div className="text-xs text-amber-200/70">{riskDescription}</div>
                </div>
              </div>
            )}

            {!isPlainTextQuery && tradeData && (tradeData.marketType === 'categorical' || intelligence) && (
              <TradePanel
                marketUrl={tradeData.marketUrl}
                marketTitle={tradeData.marketTitle}
                outcomeName={tradeData.topOutcome.name}
                marketOdds={tradeData.topOutcome.odds}
                aiConfidence={tradeData.marketType === 'categorical' ? tradeData.topOutcome.aiConfidence : binaryAiConfidence}
                edge={tradeData.marketType === 'categorical' ? tradeData.topOutcome.edge : binaryEdge}
                tokenId={tradeData.topOutcome.tokenId}
                isBinary={tradeData.marketType === 'binary'}
              />
            )}

            <div className="border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-400 font-medium mb-3">Current configuration</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">News sources</span><span className="text-white">{weights.news}%</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Social sources</span><span className="text-white">{weights.social}%</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Market probability</span><span className="text-white">{weights.technical}%</span></div>
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
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="text-purple-400 text-sm">Loading...</div></div>}>
      <ScoresPageContent />
    </Suspense>
  );
}
