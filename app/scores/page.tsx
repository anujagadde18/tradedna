'use client';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { calculateIntelligence } from '@/lib/intelligenceEngine';
import { useEffect, useState } from 'react';

function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || '';
  const [intel, setIntel] = useState<any>(null);
  const [odds, setOdds] = useState<number | null>(null);
  const [mtype, setMtype] = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [otype, setOtype] = useState('options');
  const [hasUrl, setHasUrl] = useState<boolean|null>(null);
  const weights = { news: 35, social: 40, technical: 25 };

  useEffect(() => {
    setHasUrl(event.includes('polymarket.com/event/'));
  }, []);

  useEffect(() => {
    if (mtype === 'categorical') return;
    setIntel(calculateIntelligence(54, weights, 0, odds, event));
  }, [event, odds, mtype]);

  const top = outcomes[0] || { name: '', odds: 0, aiConfidence: 0, edge: 0 };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-gray-400 text-sm">Back</button>
          <div className="flex gap-4">
            <button onClick={() => router.push('/journal')} className="text-gray-400 text-sm">Journal</button>
            <button onClick={() => router.push('/profile')} className="text-gray-400 text-sm">View Profile</button>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-1">PlayPicks AI</h1>
        <p className="text-gray-400 text-sm mb-6">AI-powered prediction analysis</p>
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Analyzing</div>
          <div className="text-white text-sm font-semibold">{event.slice(0, 100)}</div>
        </div>
        <div className={hasUrl === false ? "max-w-2xl mx-auto" : "grid grid-cols-1 lg:grid-cols-5 gap-6"}>
          {hasUrl !== false && (
            <div className="lg:col-span-3">
              <PolymarketComparison
                userQuestion={event}
                aiPrediction={intel?.confidence || 0}
                onDataReceived={(o, t, outs, ot) => {
                  setOdds(o);
                  if (t) setMtype(t);
                  if (outs) setOutcomes(outs);
                  if (ot) setOtype(ot);
                  setHasUrl(true);
                }}
                onTradeReady={() => {}}
              />
            </div>
          )}
          <div className={hasUrl === false ? "space-y-4" : "lg:col-span-2 space-y-4"}>
            <div className="border border-gray-700 rounded-xl p-5">
              <div className="text-xs text-gray-400 uppercase mb-3">AI Verdict</div>
              {mtype === 'categorical' && top.name ? (
                <div>
                  <div className="text-2xl font-bold mb-1">{top.name}</div>
                  <div className="text-sm text-gray-400 mb-3">Most likely outcome</div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Bettors say</span>
                    <span>{top.odds}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">AI thinks</span>
                    <span className="text-purple-400">{top.aiConfidence}%</span>
                  </div>
                </div>
              ) : intel ? (
                <div>
                  <div className="text-2xl font-bold mb-1">{intel.direction}</div>
                  <div className="text-sm text-gray-400 mb-3">AI prediction</div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Bettors say</span>
                    <span>{odds ?? 0}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">AI thinks</span>
                    <span className="text-purple-400">{intel.confidence}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  {hasUrl === false ? 'Paste a Polymarket URL for live analysis' : 'Analyzing...'}
                </div>
              )}
            </div>
            <div className="border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-2">Configuration</div>
              <div className="text-sm text-gray-500">News 35% / Social 40% / Market 25%</div>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-gray-600">Not financial advice.</div>
      </div>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <Page />
    </Suspense>
  );
}

