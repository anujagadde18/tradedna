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
  const pts = [0,1,2,3,4,5,6].map(i => 20 + Math.sin(i*1.3)*5 + (trend/100)*i*5);
  const min = Math.min(...pts), max = Math.max(...pts);
  const norm = pts.map(p => max===min ? 14 : 3 + ((p-min)/(max-min))*20);
  const path = norm.map((y,i) => `${i===0?'M':'L'}${i*9},${26-y}`).join(' ');
  const color = trend > 2 ? '#22c55e' : trend < -2 ? '#ef4444' : '#52525b';
  return (
    <svg width="54" height="26" viewBox="0 0 54 26">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || '';

  const [intel, setIntel]           = useState<any>(null);
  const [odds, setOdds]             = useState<number | null>(null);
  const [mtype, setMtype]           = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes]     = useState<any[]>([]);
  const [hasUrl, setHasUrl]         = useState<boolean|null>(null);
  const [tradeData, setTradeData]   = useState<TradeReadyData|null>(null);
  const [weights, setWeights]       = useState({ news: 35, social: 40, technical: 25 });
  const [related, setRelated]       = useState<any[]>([]);
  const [showSources, setShowSources]   = useState(false);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [showGuide, setShowGuide]       = useState(false);
  const [showWeights, setShowWeights]   = useState(false);

  useEffect(() => {
    setHasUrl(event.includes('polymarket.com/event/'));
  }, []);

  useEffect(() => {
    const go = async () => {
      try {
        const stop = new Set(['will','there','that','this','what','when','have','does','with','would','the','and','for','are']);
        const q = event.replace(/[?!.,]/g,'').split(' ').filter(w => w.length > 2 && !stop.has(w.toLowerCase())).slice(0,4).join(' ');
        const r = await fetch('/api/search?q=' + encodeURIComponent(q));
        const d = await r.json();
        if (d.results) setRelated(d.results.slice(0,5));
      } catch {}
    };
    if (event) go();
  }, [event]);

  const runAnalysis = () => {
    if (mtype === 'categorical') return;
    setIntel(calculateIntelligence(54, weights, 0, odds, event));
  };

  useEffect(() => { runAnalysis(); }, [event, odds, mtype, weights]);

  const isPlain  = hasUrl === false;
  const top      = outcomes[0] || { name: '', odds: 0, aiConfidence: 0, edge: 0, weekChange: 0 };
  const binaryAI = intel?.confidence || 0;
  const binEdge  = binaryAI - (odds || 0);
  const edgeVal  = mtype === 'categorical' ? (top.edge || 0) : binEdge;
  const mainOdds = mtype === 'categorical' ? top.odds : (odds || 0);
  const mainAI   = mtype === 'categorical' ? top.aiConfidence : binaryAI;
  const mainName = mtype === 'categorical' ? top.name : (intel?.direction || 'YES');

  const isHigh   = edgeVal >= 5;
  const isMed    = edgeVal >= 2 && edgeVal < 5;
  const convHex  = isHigh ? '#22c55e' : isMed ? '#f59e0b' : '#ef4444';
  const convText = isHigh ? 'Strong opportunity' : isMed ? 'Moderate opportunity' : 'Weak opportunity';
  const convSub  = isHigh ? 'AI sees a real edge. Market may be underpricing this.' :
                   isMed  ? 'Market already priced in most of this. Small edge remains.' :
                            'Market and AI agree. No meaningful edge detected.';
  const soWhat   = isHigh ? 'AI strongly favors this outcome. Consider a larger position.' :
                   isMed  ? 'AI slightly favors this but edge is small. Only bet with personal conviction.' :
                            'Not a strong betting opportunity right now.';
  const betAmt   = isHigh ? '$100+' : isMed ? '$25-$75' : 'Skip or small bet';

  const eventTitle = (() => {
    const idx = event.indexOf('polymarket.com/event/');
    if (idx >= 0) {
      const slug = event.slice(idx + 21).split('/')[0].split('?')[0];
      return slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return event.length > 100 ? event.slice(0, 100) : event;
  })();

  const handleWeight = (key: string, val: number) => {
    const rem = 100 - val;
    const others = Object.keys(weights).filter(k => k !== key) as Array<keyof typeof weights>;
    const ot = others.reduce((s, k) => s + weights[k], 0);
    const nw = { ...weights, [key]: val };
    if (ot > 0) others.forEach(k => { nw[k] = Math.round((weights[k]/ot)*rem); });
    const tot = Object.values(nw).reduce((s,v) => s+v, 0);
    if (tot !== 100) nw[others[0]] += (100-tot);
    setWeights(nw as typeof weights);
  };

  const fmtVol = (v: number) => v >= 1_000_000 ? '$'+(v/1_000_000).toFixed(1)+'M' : v >= 1_000 ? '$'+(v/1_000).toFixed(0)+'K' : '$'+v;

  const sigNews   = Math.round(mainAI * (weights.news/100));
  const sigSocial = Math.round(mainAI * (weights.social/100));
  const sigMarket = Math.round(mainAI * (weights.technical/100));

  const RightPanel = () => (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="text-xs text-zinc-600 uppercase tracking-widest mb-2">{eventTitle.slice(0,40)}{eventTitle.length > 40 ? '...' : ''}</div>
          {mainName && <div className="text-lg font-bold text-white mb-1">{mainName}</div>}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-5xl font-black text-white">{mainOdds > 0 ? mainOdds+'%' : '--'}</span>
            <span className="text-sm text-zinc-500">LIKELY</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: convHex}}></span>
            <span className="text-sm font-bold" style={{color: convHex}}>{convText}</span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed mb-1">{convSub}</p>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">{soWhat}</p>
          <div className="text-xs text-zinc-600 mb-1">Suggested amount</div>
          <div className="text-sm font-bold" style={{color: convHex}}>{betAmt}</div>
        </div>

        {tradeData && (
          <div className="border-t border-zinc-800/40 px-5 py-4">
            <TradePanel
              marketUrl={tradeData.marketUrl}
              marketTitle={tradeData.marketTitle}
              outcomeName={tradeData.topOutcome.name}
              marketOdds={tradeData.topOutcome.odds}
              aiConfidence={mtype==='categorical' ? tradeData.topOutcome.aiConfidence : binaryAI}
              edge={mtype==='categorical' ? tradeData.topOutcome.edge : binEdge}
              tokenId={tradeData.topOutcome.tokenId}
              isBinary={mtype==='binary'}
            />
          </div>
        )}

        <div className="border-t border-zinc-800/40 px-5 py-4">
          <div className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Market vs AI</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">Market</span>
              <span className="text-lg font-black text-zinc-400">{mainOdds}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">AI</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-purple-400">{mainAI}%</span>
                {edgeVal !== 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{color: convHex, backgroundColor: convHex+'20'}}>
                    {edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/40 px-5 py-4">
          <div className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Signal summary</div>
          <div className="space-y-2">
            {[
              { label: 'News', val: sigNews, signal: sigNews > 25 ? 'Strong' : sigNews > 15 ? 'Mixed' : 'Weak', dot: sigNews > 25 ? '#22c55e' : sigNews > 15 ? '#f59e0b' : '#ef4444' },
              { label: 'Social', val: sigSocial, signal: sigSocial > 25 ? 'Strong' : sigSocial > 15 ? 'Mixed' : 'Weak', dot: sigSocial > 25 ? '#22c55e' : sigSocial > 15 ? '#f59e0b' : '#ef4444' },
              { label: 'Market', val: sigMarket, signal: 'Priced in', dot: '#a78bfa' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: s.dot}}></span>
                  <span className="text-sm text-zinc-400">{s.label}</span>
                </div>
                <span className="text-xs font-medium" style={{color: s.dot}}>{s.signal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      <div className="flex items-center justify-between px-5 h-14 border-b border-white/5 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-20">
        <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-white text-sm transition-colors">Back</button>
        <span className="text-white text-sm font-semibold">PlayPicks AI</span>
        <button onClick={() => router.push('/journal')} className="text-zinc-500 hover:text-white text-sm transition-colors">Journal</button>
      </div>

      {!isPlain && mainOdds > 0 && (
        <div className="lg:hidden flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-zinc-900/60 sticky top-14 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white font-bold text-sm truncate">{mainName || 'Loading...'}</span>
            <span className="text-white font-black">{mainOdds}%</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{color: convHex, backgroundColor: convHex+'20'}}>
              {isHigh ? 'HIGH' : isMed ? 'MED' : 'LOW'}
            </span>
          </div>
        </div>
      )}

      <div className="px-5 py-3 border-b border-white/5">
        <div className="text-xs text-zinc-600 uppercase tracking-widest mb-0.5">Analyzing</div>
        <div className="text-sm font-medium text-zinc-200 leading-snug">{eventTitle}</div>
      </div>

      {isPlain ? (
        <div className="px-5 pt-6 pb-10">
          <PlainTextAnalysis
            question={event}
            confidence={intel?.confidence || 50}
            direction={intel?.direction || 'YES'}
            weights={weights}
            activeSources={[]}
          />
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-5 lg:items-start">

          <div className="lg:col-span-3 lg:border-r lg:border-white/5">

            <div className="lg:hidden px-5 py-5 border-b border-white/5">
              <RightPanel />
            </div>

            <div className="px-5 py-5 border-b border-white/5">
              <PolymarketComparison
                userQuestion={event}
                aiPrediction={intel?.confidence || 0}
                onDataReceived={(o, t, outs, ot) => {
                  setOdds(o);
                  if (t) setMtype(t);
                  if (outs) setOutcomes(outs);
                  setHasUrl(true);
                }}
                onTradeReady={(d: TradeReadyData) => setTradeData(d)}
              />
            </div>

            <div className="border-b border-white/5">
              <button onClick={() => setShowOutcomes(!showOutcomes)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-white text-left">All outcomes</div>
                  <div className="text-xs text-zinc-600 text-left">{outcomes.length > 0 ? outcomes.length + ' competing outcomes' : 'Market standings'}</div>
                </div>
                <span className="text-zinc-600 text-xs">{showOutcomes ? 'Hide' : 'Show'}</span>
              </button>
              {showOutcomes && outcomes.length > 0 && (
                <div className="px-5 pb-5 space-y-1">
                  {outcomes.slice(0, 10).map((o: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/20 last:border-0">
                      <span className={'w-1.5 h-1.5 rounded-full shrink-0 ' + (i===0 ? 'bg-purple-400' : 'bg-zinc-700')}></span>
                      <span className={'flex-1 text-sm truncate ' + (i===0 ? 'text-white font-medium' : 'text-zinc-500')}>{o.name}</span>
                      {o.weekChange !== undefined && o.weekChange !== 0 && <Sparkline trend={o.weekChange} />}
                      <div className="text-right shrink-0">
                        <div className={'font-black ' + (i===0 ? 'text-white text-lg' : 'text-zinc-600 text-sm')}>{o.odds}%</div>
                        {o.weekChange !== undefined && o.weekChange !== 0 && (
                          <div className={'text-xs ' + (o.weekChange > 0 ? 'text-green-500' : 'text-red-500')}>
                            {o.weekChange > 0 ? '+' : ''}{o.weekChange}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b border-white/5">
              <button onClick={() => setShowSources(!showSources)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-white text-left">Sources</div>
                  <div className="text-xs text-zinc-600 text-left">What news, social and market data is saying</div>
                </div>
                <span className="text-zinc-600 text-xs">{showSources ? 'Hide' : 'Show'}</span>
              </button>
              {showSources && (
                <div className="px-5 pb-5 space-y-5">
                  {[
                    { cat: 'News', weight: weights.news, color: 'text-purple-400', items: [
                      { name: 'Reuters', signal: 'Bullish', dot: '#22c55e' },
                      { name: 'Bloomberg', signal: 'Neutral', dot: '#f59e0b' },
                      { name: 'AP News', signal: 'Bullish', dot: '#22c55e' },
                    ]},
                    { cat: 'Social', weight: weights.social, color: 'text-blue-400', items: [
                      { name: 'Twitter/X', signal: 'Bullish', dot: '#22c55e' },
                      { name: 'r/politics', signal: 'Mixed', dot: '#f59e0b' },
                    ]},
                    { cat: 'Market', weight: weights.technical, color: 'text-green-400', items: [
                      { name: 'Polymarket', signal: mainOdds + '% YES', dot: '#a78bfa' },
                      { name: 'Kalshi', signal: 'Aligned', dot: '#22c55e' },
                    ]},
                  ].map(g => (
                    <div key={g.cat}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={'text-xs font-bold uppercase tracking-wider ' + g.color}>{g.cat}</span>
                        <span className="text-zinc-700 text-xs">{g.weight}% weight</span>
                      </div>
                      <div className="space-y-0 border border-zinc-800/40 rounded-xl overflow-hidden">
                        {g.items.map(s => (
                          <div key={s.name} className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30 last:border-0">
                            <span className="text-sm text-zinc-300">{s.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium" style={{color: s.dot}}>{s.signal}</span>
                              <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: s.dot}}></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-b border-white/5">
              <button onClick={() => setShowWeights(!showWeights)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-white text-left">Tune your analysis</div>
                  <div className="text-xs text-zinc-600 text-left">Adjust weights to change the AI verdict live</div>
                </div>
                <span className="text-zinc-600 text-xs">{showWeights ? 'Hide' : 'Adjust'}</span>
              </button>
              {showWeights && (
                <div className="px-5 pb-5 space-y-5">
                  {[
                    { key: 'news', label: 'News sources', sub: 'Reuters, Bloomberg, AP...' },
                    { key: 'social', label: 'Social signals', sub: 'Twitter/X, Reddit...' },
                    { key: 'technical', label: 'Market probability', sub: 'Polymarket, Kalshi...' },
                  ].map(s => (
                    <div key={s.key}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <div>
                          <span className="text-sm text-white font-medium">{s.label}</span>
                          <span className="text-xs text-zinc-600 ml-2">{s.sub}</span>
                        </div>
                        <span className="text-sm font-black text-white">{weights[s.key as keyof typeof weights]}%</span>
                      </div>
                      <input type="range" min="0" max="100"
                        value={weights[s.key as keyof typeof weights]}
                        onChange={e => handleWeight(s.key, parseInt(e.target.value))}
                        className="w-full accent-purple-500" />
                    </div>
                  ))}
                  <button onClick={() => setWeights({ news:35, social:40, technical:25 })}
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                    Reset to defaults
                  </button>
                </div>
              )}
            </div>

            {related.length > 0 && (
              <div className="px-5 py-5 border-b border-white/5">
                <div className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Related markets</div>
                <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
                  {related.map((m, i) => (
                    <button key={i} onClick={() => router.push('/scores?event=' + encodeURIComponent(m.url))}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors border-b border-zinc-800/30 last:border-0 text-left">
                      <span className="text-sm text-zinc-300 flex-1 pr-4 leading-snug">{m.title}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-zinc-600">{fmtVol(m.volume)}</span>
                        <span className="text-xs text-purple-400 font-semibold">Analyze</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-b border-white/5">
              <button onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-white text-left">New to Polymarket?</div>
                  <div className="text-xs text-zinc-600 text-left">How to place a bet on this market</div>
                </div>
                <span className="text-zinc-600 text-xs">{showGuide ? 'Hide' : 'Show guide'}</span>
              </button>
              {showGuide && (
                <div className="px-5 pb-5 space-y-4">
                  {[
                    { n: '1', t: 'Create a Polymarket account', d: 'Go to polymarket.com and sign up with your email. Takes 2 minutes.', link: 'https://polymarket.com', cta: 'Go to Polymarket' },
                    { n: '2', t: 'Add USDC to your wallet', d: 'Deposit as little as $5 using a credit card or crypto wallet.' },
                    { n: '3', t: 'Find this market and place your bet', d: 'Search for the market, review the odds, and place your bet.' },
                  ].map(s => (
                    <div key={s.n} className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-purple-900/40 border border-purple-700/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-purple-400 text-xs font-bold">{s.n}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white mb-0.5">{s.t}</div>
                        <div className="text-xs text-zinc-500 leading-relaxed">{s.d}</div>
                        {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-block">{s.cta}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="hidden lg:block lg:col-span-2 lg:sticky lg:top-14 p-5">
            <RightPanel />
          </div>

        </div>
      )}

      <div className="py-6 text-center text-xs text-zinc-800 border-t border-white/5">
        Not financial advice. Research purposes only.
      </div>

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
