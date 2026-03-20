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
}

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || '';

  const [intel, setIntel]         = useState<any>(null);
  const [odds, setOdds]           = useState<number | null>(null);
  const [mtype, setMtype]         = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes]   = useState<any[]>([]);
  const [otype, setOtype]         = useState('options');
  const [hasUrl, setHasUrl]       = useState<boolean|null>(null);
  const [tradeData, setTradeData] = useState<TradeReadyData|null>(null);
  const [weights, setWeights]     = useState({ news: 35, social: 40, technical: 25 });
  const [activeSources]           = useState<any[]>([]);
  const [showWeights, setShowWeights] = useState(false);

  useEffect(() => {
    setHasUrl(event.includes('polymarket.com/event/'));
  }, []);

  const runAnalysis = () => {
    if (mtype === 'categorical') return;
    setIntel(calculateIntelligence(54, weights, 0, odds, event));
  };

  useEffect(() => { runAnalysis(); }, [event, odds, mtype]);

  const isPlain    = hasUrl === false;
  const top        = outcomes[0] || { name: '', odds: 0, aiConfidence: 0, edge: 0 };
  const binaryAI   = intel?.confidence || 0;
  const binaryEdge = binaryAI - (odds || 0);
  const edgeVal    = mtype === 'categorical' ? (top.edge || 0) : binaryEdge;
  const edgeLabel  = edgeVal >= 10 ? 'HIGH' : edgeVal >= 5 ? 'HIGH' : edgeVal >= 2 ? 'MEDIUM' : 'LOW';
  const edgeColor  = edgeVal >= 5 ? 'text-green-400' : edgeVal >= 2 ? 'text-yellow-400' : 'text-red-400';
  const edgeDot    = edgeVal >= 5 ? 'bg-green-400' : edgeVal >= 2 ? 'bg-yellow-400' : 'bg-red-400';

  const mainOdds   = mtype === 'categorical' ? top.odds : (odds || 0);
  const mainAI     = mtype === 'categorical' ? top.aiConfidence : binaryAI;
  const mainName   = mtype === 'categorical' ? top.name : (intel?.direction || 'YES');

  const eventTitle = (() => {
    const idx = event.indexOf('polymarket.com/event/');
    if (idx >= 0) {
      const slug = event.slice(idx + 21).split('/')[0].split('?')[0];
      return slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return event.length > 80 ? event.slice(0, 80) : event;
  })();

  const handleWeightChange = (key: string, val: number) => {
    const rem = 100 - val;
    const others = Object.keys(weights).filter(k => k !== key) as Array<keyof typeof weights>;
    const otherTotal = others.reduce((s, k) => s + weights[k], 0);
    const nw = { ...weights, [key]: val };
    if (otherTotal > 0) others.forEach(k => { nw[k] = Math.round((weights[k] / otherTotal) * rem); });
    const total = Object.values(nw).reduce((s, v) => s + v, 0);
    if (total !== 100) nw[others[0]] += (100 - total);
    setWeights(nw as typeof weights);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-32">

      <nav className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-white text-sm transition-colors">
          Back
        </button>
        <span className="text-white font-bold text-sm">PlayPicks AI</span>
        <button onClick={() => router.push('/journal')} className="text-zinc-500 hover:text-white text-sm transition-colors">
          Journal
        </button>
      </nav>

      <div className="px-5 pt-3 pb-2 border-b border-zinc-800/40">
        <div className="text-xs text-zinc-600 uppercase tracking-widest mb-0.5">Analyzing</div>
        <div className="text-white text-sm font-medium leading-snug">{eventTitle}</div>
      </div>

      {isPlain ? (
        <div className="px-5 pt-6">
          <PlainTextAnalysis
            question={event}
            confidence={intel?.confidence || 50}
            direction={intel?.direction || 'YES'}
            weights={weights}
            activeSources={activeSources}
          />
        </div>
      ) : (
        <div>

          <div className="text-center px-5 py-12 space-y-3">
            {mainName && (
              <p className="text-zinc-400 text-sm tracking-widest uppercase">{mainName}</p>
            )}
            <div className="text-8xl font-black text-white leading-none">
              {mainOdds > 0 ? mainOdds + '%' : '--'}
            </div>
            <p className="text-zinc-600 text-sm">
              AI {mainAI}% &nbsp;|&nbsp; Market {mainOdds}%
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <span className={'w-2 h-2 rounded-full ' + edgeDot}></span>
              <span className={'text-sm font-semibold ' + edgeColor}>
                {edgeLabel} CONVICTION
              </span>
              <span className="text-zinc-600 text-xs">
                {edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(1)}% edge
              </span>
            </div>
          </div>

          <div className="px-5 space-y-2 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Market</span>
                <span className="text-white font-semibold">{mainOdds}%</span>
              </div>
              <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-3 rounded-full bg-zinc-400 transition-all duration-500"
                  style={{ width: Math.min(mainOdds, 100) + '%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">AI</span>
                <span className="text-purple-400 font-semibold">{mainAI}%</span>
              </div>
              <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                  style={{ width: Math.min(mainAI, 100) + '%' }} />
              </div>
            </div>
          </div>

          <div className="px-5 mb-6">
            <button onClick={() => setShowWeights(!showWeights)}
              className="w-full flex items-center justify-between py-3 border-t border-b border-zinc-800/60">
              <span className="text-sm font-semibold text-white">Signal breakdown</span>
              <span className="text-zinc-500 text-sm">{showWeights ? 'Hide' : 'Adjust weights'}</span>
            </button>
            {showWeights && (
              <div className="pt-4 space-y-5">
                {[
                  { key: 'news', label: 'News' },
                  { key: 'social', label: 'Social' },
                  { key: 'technical', label: 'Market' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">{label}</span>
                      <span className="text-white font-semibold">{weights[key as keyof typeof weights]}%</span>
                    </div>
                    <input type="range" min="0" max="100"
                      value={weights[key as keyof typeof weights]}
                      onChange={e => { handleWeightChange(key, parseInt(e.target.value)); runAnalysis(); }}
                      className="w-full accent-purple-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {outcomes.length > 0 && (
            <div className="px-5 mb-6">
              <div className="text-xs text-zinc-600 uppercase tracking-widest mb-4">Market standings</div>
              <div className="space-y-3">
                {outcomes.slice(0, 6).map((o: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-300">{o.name}</span>
                      <span className="text-white font-semibold">{o.odds}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={'h-2.5 rounded-full transition-all ' + (i === 0 ? 'bg-purple-500' : 'bg-zinc-600')}
                        style={{ width: Math.min(o.odds, 100) + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5">
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
              onTradeReady={(data: TradeReadyData) => setTradeData(data)}
            />
          </div>

        </div>
      )}

      {!isPlain && tradeData && (
        <div className="fixed bottom-0 left-0 w-full px-4 pb-4 pt-3 bg-black border-t border-zinc-800/60">
          <TradePanel
            marketUrl={tradeData.marketUrl}
            marketTitle={tradeData.marketTitle}
            outcomeName={tradeData.topOutcome.name}
            marketOdds={tradeData.topOutcome.odds}
            aiConfidence={mtype === 'categorical' ? tradeData.topOutcome.aiConfidence : binaryAI}
            edge={mtype === 'categorical' ? tradeData.topOutcome.edge : binaryEdge}
            tokenId={tradeData.topOutcome.tokenId}
            isBinary={mtype === 'binary'}
          />
        </div>
      )}

    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ScoresPageContent />
    </Suspense>
  );
}
