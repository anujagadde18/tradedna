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


function Sparkline({ trend }: { trend: number }) {
  // Generate a simple 7-point trend line from the trend value
  const pts = [50, 50, 50, 50, 50, 50, 50].map((v, i) => {
    const noise = Math.sin(i * 1.3) * 8;
    return v + noise + (trend / 100) * i * 6;
  });
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const norm = pts.map(p => max === min ? 30 : 5 + ((p - min) / (max - min)) * 30);
  const path = norm.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * 10},${35 - y}`).join(' ');
  const color = trend > 3 ? '#22c55e' : trend < -3 ? '#ef4444' : '#71717a';
  return (
    <svg width="60" height="28" viewBox="0 0 60 40" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoresPageContent() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const event         = searchParams.get('event') || '';

  const [intel, setIntel]             = useState<any>(null);
  const [odds, setOdds]               = useState<number | null>(null);
  const [mtype, setMtype]             = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes]       = useState<any[]>([]);
  const [hasUrl, setHasUrl]           = useState<boolean|null>(null);
  const [tradeData, setTradeData]     = useState<TradeReadyData|null>(null);
  const [weights, setWeights]         = useState({ news: 35, social: 40, technical: 25 });
  const [showWhy, setShowWhy]         = useState(false);

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
  const mainOdds   = mtype === 'categorical' ? top.odds : (odds || 0);
  const mainAI     = mtype === 'categorical' ? top.aiConfidence : binaryAI;
  const mainName   = mtype === 'categorical' ? top.name : (intel?.direction || 'YES');

  const isHigh   = edgeVal >= 5;
  const isMed    = edgeVal >= 2 && edgeVal < 5;
  const isLow    = edgeVal < 2;
  const convText = isHigh ? 'HIGH' : isMed ? 'MEDIUM' : 'LOW';
  const convHex  = isHigh ? '#22c55e' : isMed ? '#f59e0b' : '#ef4444';

  const betGuide = isHigh ? 'Strong edge - consider $100+' :
                   isMed  ? 'Moderate edge - consider $25-$100' :
                            'Weak edge - consider skipping';

  const summary  = isHigh ? 'AI sees a real edge here. Market may be underpricing this outcome.' :
                   isMed  ? 'AI slightly disagrees with market. Small opportunity exists.' :
                            'AI agrees with market. No meaningful edge detected.';

  const eventTitle = (() => {
    const idx = event.indexOf('polymarket.com/event/');
    if (idx >= 0) {
      const slug = event.slice(idx + 21).split('/')[0].split('?')[0];
      return slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return event.length > 100 ? event.slice(0, 100) : event;
  })();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-36">

      <div className="flex items-center justify-between px-5 h-14 border-b border-white/5">
        <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-white text-sm transition-colors">
          Back
        </button>
        <span className="text-white text-sm font-semibold tracking-tight">PlayPicks AI</span>
        <button onClick={() => router.push('/journal')} className="text-zinc-500 hover:text-white text-sm transition-colors">
          Journal
        </button>
      </div>

      {isPlain ? (
        <div className="px-5 pt-6">
          <PlainTextAnalysis
            question={event}
            confidence={intel?.confidence || 50}
            direction={intel?.direction || 'YES'}
            weights={weights}
            activeSources={[]}
          />
        </div>
      ) : (
        <div>

          <div className="px-5 pt-8 pb-6 border-b border-white/5">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">{eventTitle}</p>
            {mainName && (
              <h1 className="text-2xl font-black text-white leading-tight mb-1">{mainName}</h1>
            )}
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-6xl font-black text-white leading-none">{mainOdds > 0 ? mainOdds + '%' : '--'}</span>
              <span className="text-zinc-500 text-sm">market probability</span>
            </div>
          </div>

          <div className="px-5 py-5 border-b border-white/5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500 uppercase tracking-widest">AI Edge Analysis</span>
            </div>
            <div className="grid grid-cols-3 mt-4">
              <div>
                <div className="text-3xl font-black text-zinc-300">{mainOdds}%</div>
                <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wide">Market</div>
              </div>
              <div>
                <div className="text-3xl font-black text-purple-400">{mainAI}%</div>
                <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wide">AI thinks</div>
              </div>
              <div>
                <div className="text-3xl font-black" style={{ color: convHex }}>
                  {edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(1)}%
                </div>
                <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wide">Edge</div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 border-b border-white/5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: convHex }}></span>
                  <span className="text-sm font-black tracking-wider" style={{ color: convHex }}>{convText} CONVICTION</span>
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">{summary}</p>
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <span className="text-xs text-zinc-500">Suggested:</span>
              <span className="text-sm font-semibold" style={{ color: convHex }}>{betGuide}</span>
            </div>
          </div>

          {outcomes.length > 0 && (
            <div className="px-5 py-5 border-b border-white/5">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">All outcomes</div>
              <div className="space-y-3">
                {outcomes.slice(0, 8).map((o: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={'w-2 h-2 rounded-full shrink-0 ' + (i === 0 ? 'bg-purple-400' : 'bg-zinc-700')}></div>
                      <span className={'text-sm truncate ' + (i === 0 ? 'text-white font-medium' : 'text-zinc-500')}>{o.name}</span>
                    </div>
                    {(o.weekChange !== undefined && o.weekChange !== 0) && (
                      <Sparkline trend={o.weekChange || 0} />
                    )}
                    <div className="text-right shrink-0">
                      <div className={'font-black ' + (i === 0 ? 'text-white text-xl' : 'text-zinc-600 text-sm')}>{o.odds}%</div>
                      {o.weekChange !== undefined && o.weekChange !== 0 && (
                        <div className={'text-xs font-medium ' + (o.weekChange > 0 ? 'text-green-500' : 'text-red-500')}>
                          {o.weekChange > 0 ? '+' : ''}{o.weekChange}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-5 border-b border-white/5">
            <button onClick={() => setShowWhy(!showWhy)}
              className="w-full flex items-center justify-between">
              <span className="text-xs text-zinc-500 uppercase tracking-widest">Why this verdict?</span>
              <span className="text-xs text-zinc-600">{showWhy ? 'Hide' : 'Show signals'}</span>
            </button>
            {showWhy && (
              <div className="mt-4 grid grid-cols-3">
                {[
                  { label: 'News', val: Math.round(mainAI * (weights.news / 100)), color: 'text-purple-400' },
                  { label: 'Social', val: Math.round(mainAI * (weights.social / 100)), color: 'text-blue-400' },
                  { label: 'Market', val: Math.round(mainAI * (weights.technical / 100)), color: 'text-green-400' },
                ].map(s => (
                  <div key={s.label}>
                    <div className={'text-2xl font-black ' + s.color}>+{s.val}%</div>
                    <div className="text-xs text-zinc-600 mt-1 uppercase tracking-wide">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 pt-4">
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
              onTradeReady={(d: TradeReadyData) => setTradeData(d)}
            />
          </div>

        </div>
      )}

      {!isPlain && tradeData && (
        <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-white/5 px-5 py-4">
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
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <ScoresPageContent />
    </Suspense>
  );
}
