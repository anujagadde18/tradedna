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
  const [showDetails, setShowDetails] = useState(false);

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

  const conviction = edgeVal >= 10 ? 'HIGH' : edgeVal >= 5 ? 'HIGH' : edgeVal >= 2 ? 'MEDIUM' : 'LOW';
  const convColor  = edgeVal >= 5 ? '#22c55e' : edgeVal >= 2 ? '#eab308' : '#ef4444';
  const convDot    = edgeVal >= 5 ? 'bg-green-400' : edgeVal >= 2 ? 'bg-yellow-400' : 'bg-red-400';

  const betGuide = edgeVal >= 12 ? 'Strong opportunity - consider $150+' :
                   edgeVal >= 7  ? 'Good opportunity - consider $50-$150' :
                   edgeVal >= 2  ? 'Small opportunity - consider $10-$50' :
                   'Low edge - consider skipping this one';

  const summary = (() => {
    if (!mainOdds) return 'Loading market data...';
    if (edgeVal >= 5) return 'AI significantly favors this outcome - market may be underpricing it';
    if (edgeVal >= 2) return 'AI slightly favors this outcome - small edge detected';
    if (Math.abs(edgeVal) < 2) return 'AI aligns with market - no strong edge either way';
    return 'AI is more cautious than market - consider smaller position or skip';
  })();

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
    <div className="min-h-screen bg-black text-white pb-36">

      <nav className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-white text-sm transition-colors">Back</button>
        <span className="text-white font-bold text-sm">PlayPicks AI</span>
        <button onClick={() => router.push('/journal')} className="text-zinc-500 hover:text-white text-sm transition-colors">Journal</button>
      </nav>

      <div className="px-5 pt-3 pb-3 border-b border-zinc-800/40">
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
        <div className="px-5">

          <div className="text-center py-10 space-y-2">
            {mainName && (
              <p className="text-zinc-500 text-xs tracking-widest uppercase">{mainName}</p>
            )}
            <div className="text-9xl font-black leading-none" style={{ color: mainOdds > 0 ? 'white' : '#52525b' }}>
              {mainOdds > 0 ? mainOdds + '%' : '--'}
            </div>
            <p className="text-zinc-600 text-sm">LIKELY</p>
          </div>

          <div className="bg-zinc-900/60 rounded-2xl p-5 mb-5 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-2">
              <span className={'w-2.5 h-2.5 rounded-full shrink-0 ' + convDot}></span>
              <span className="font-black text-lg" style={{ color: convColor }}>{conviction} CONVICTION</span>
              <span className="text-zinc-600 text-sm ml-auto">{edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(1)}% edge</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-3">{summary}</p>
            <div className="border-t border-zinc-800 pt-3">
              <p className="text-xs text-zinc-600 uppercase tracking-wide mb-1">Suggested action</p>
              <p className="text-sm font-semibold" style={{ color: convColor }}>{betGuide}</p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-zinc-500">Market says</span>
                <span className="text-white font-bold">{mainOdds}%</span>
              </div>
              <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-4 rounded-full bg-zinc-500 transition-all duration-700"
                  style={{ width: Math.min(mainOdds, 100) + '%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-zinc-500">AI thinks</span>
                <span className="font-bold" style={{ color: convColor }}>{mainAI}%</span>
              </div>
              <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-4 rounded-full transition-all duration-700"
                  style={{ width: Math.min(mainAI, 100) + '%', backgroundColor: convColor }} />
              </div>
            </div>
          </div>

          <button onClick={() => setShowDetails(!showDetails)}
            className="w-full py-3 border-t border-b border-zinc-800/60 flex items-center justify-between mb-5">
            <span className="text-sm font-semibold text-white">Why this verdict?</span>
            <span className="text-zinc-500 text-sm">{showDetails ? 'Hide' : 'Show signals'}</span>
          </button>

          {showDetails && (
            <div className="mb-5 space-y-5">
              <div className="space-y-3">
                <div className="text-xs text-zinc-600 uppercase tracking-widest">Signal weights</div>
                {[
                  { key: 'news', label: 'News sources', val: Math.round(mainAI * (weights.news / 100)) },
                  { key: 'social', label: 'Social signals', val: Math.round(mainAI * (weights.social / 100)) },
                  { key: 'technical', label: 'Market data', val: Math.round(mainAI * (weights.technical / 100)) },
                ].map(s => (
                  <div key={s.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">{s.label}</span>
                      <span className="text-white font-semibold">+{s.val}%</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full bg-purple-500"
                        style={{ width: Math.min((s.val / 35) * 100, 100) + '%' }} />
                    </div>
                    <input type="range" min="0" max="100"
                      value={weights[s.key as keyof typeof weights]}
                      onChange={e => { handleWeightChange(s.key, parseInt(e.target.value)); setTimeout(runAnalysis, 100); }}
                      className="w-full accent-purple-500 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {outcomes.length > 0 && (
            <div className="mb-5">
              <div className="text-xs text-zinc-600 uppercase tracking-widest mb-4">All outcomes</div>
              <div className="space-y-3">
                {outcomes.slice(0, 8).map((o: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={i === 0 ? 'text-white font-semibold' : 'text-zinc-400'}>{o.name}</span>
                      <span className={i === 0 ? 'font-bold text-white' : 'text-zinc-500'}>{o.odds}%</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={'h-3 rounded-full transition-all ' + (i === 0 ? 'bg-purple-500' : 'bg-zinc-700')}
                        style={{ width: Math.min(o.odds, 100) + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5">
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
        <div className="fixed bottom-0 left-0 w-full bg-black border-t border-zinc-800/60 px-5 py-4">
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
