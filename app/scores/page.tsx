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
  const [showSources, setShowSources] = useState(false);
  const [sourceTab, setSourceTab] = useState<'weights'|'marketplace'>('weights');
  const [mktTab, setMktTab]       = useState<'news'|'social'|'technical'>('news');
  const [showDeep, setShowDeep]   = useState(false);
  const [activeSources, setActiveSources] = useState<any[]>([]);
  const DEFAULT_W = { news: 35, social: 40, technical: 25 };
  const [weights, setWeights]     = useState(DEFAULT_W);

  const SOURCES = {
    news: [
      { name: 'Reuters', desc: 'Global newswire', url: 'https://reuters.com' },
      { name: 'Bloomberg', desc: 'Financial news', url: 'https://bloomberg.com' },
      { name: 'Associated Press', desc: 'Breaking news', url: 'https://apnews.com' },
      { name: 'BBC News', desc: 'International coverage', url: 'https://bbc.com/news' },
      { name: 'CoinDesk', desc: 'Crypto and blockchain', url: 'https://coindesk.com' },
      { name: 'Politico', desc: 'Politics and policy', url: 'https://politico.com' },
    ],
    social: [
      { name: 'Twitter/X', desc: 'Real-time sentiment', url: 'https://twitter.com' },
      { name: 'r/politics', desc: 'Political discussion', url: 'https://reddit.com/r/politics' },
      { name: 'r/investing', desc: 'Investment sentiment', url: 'https://reddit.com/r/investing' },
      { name: 'r/cryptocurrency', desc: 'Crypto community', url: 'https://reddit.com/r/cryptocurrency' },
    ],
    technical: [
      { name: 'Kalshi', desc: 'Prediction market', url: 'https://kalshi.com' },
      { name: 'Metaculus', desc: 'Forecasting community', url: 'https://metaculus.com' },
      { name: 'Manifold', desc: 'Play-money markets', url: 'https://manifold.markets' },
    ],
  };

  useEffect(() => {
    setHasUrl(event.includes('polymarket.com/event/'));
    try {
      const sw = localStorage.getItem('signalWeights');
      if (sw) setWeights(JSON.parse(sw));
      const cs = localStorage.getItem('customSources');
      if (cs) setActiveSources(JSON.parse(cs));
    } catch {}
  }, []);

  const runAnalysis = () => {
    if (mtype === 'categorical') return;
    setIntel(calculateIntelligence(54, weights, activeSources.length, odds, event));
  };

  useEffect(() => { runAnalysis(); }, [event, odds, mtype]);

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

  const isActive = (name: string) => activeSources.some(s => s.name === name);
  const toggle   = (source: any, type: string) => {
    if (isActive(source.name)) setActiveSources(activeSources.filter(s => s.name !== source.name));
    else setActiveSources([...activeSources, { ...source, type }]);
  };

  const isPlain    = hasUrl === false;
  const top        = outcomes[0] || { name: '', odds: 0, aiConfidence: 0, edge: 0, weekChange: 0 };
  const unitLabel  = otype === 'candidates' ? 'candidates' : otype === 'companies' ? 'companies' : otype === 'dates' ? 'dates' : 'outcomes';
  const binaryAI   = intel?.confidence || 0;
  const binaryEdge = binaryAI - (odds || 0);

  const eventTitle = (() => {
    const idx = event.indexOf('polymarket.com/event/');
    if (idx >= 0) {
      const slug = event.slice(idx + 21).split('/')[0].split('?')[0];
      return slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return event.length > 100 ? event.slice(0, 100) : event;
  })();

  const edgeVal    = mtype === 'categorical' ? (top.edge || 0) : binaryEdge;
  const edgeColor  = edgeVal >= 5 ? 'text-green-400' : edgeVal >= 2 ? 'text-yellow-400' : edgeVal >= -2 ? 'text-gray-400' : 'text-red-400';
  const edgeLabel  = edgeVal >= 10 ? 'Very High' : edgeVal >= 5 ? 'High' : edgeVal >= 2 ? 'Medium' : edgeVal >= -2 ? 'Low' : 'Very Low';
  const edgeBg     = edgeVal >= 5 ? 'bg-green-900/20 border-green-700/30' : edgeVal >= 2 ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-gray-900/50 border-gray-700/50';

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-white text-sm transition-colors">
          Back
        </button>
        <div className="text-white font-bold text-sm tracking-tight">PlayPicks AI</div>
        <div className="flex items-center gap-4">
          <button onClick={runAnalysis} className="text-gray-500 hover:text-white text-sm transition-colors">Refresh</button>
          <button onClick={() => setShowSources(!showSources)}
            className={'text-sm font-medium px-3 py-1.5 rounded-lg transition-all ' + (showSources ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white bg-gray-800/50')}>
            Tune sources
          </button>
          <button onClick={() => router.push('/journal')} className="text-gray-500 hover:text-white text-sm transition-colors">Journal</button>
        </div>
      </nav>

      {/* Market banner */}
      <div className="border-b border-gray-800/50 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs text-gray-600 uppercase tracking-widest font-semibold mb-1">Analyzing</div>
          <div className="text-white font-bold text-lg leading-snug">{eventTitle}</div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-600">Polymarket</span>
            {outcomes.length > 0 && (
              <span className="text-xs text-gray-700">{outcomes.length} competing {unitLabel}</span>
            )}
            {isPlain && <span className="text-xs text-yellow-600/70">No live market URL</span>}
          </div>
        </div>
      </div>

      {/* Tune sources panel */}
      {showSources && (
        <div className="border-b border-purple-800/30 bg-purple-950/20 px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-2 mb-6">
              {(['weights', 'marketplace'] as const).map(tab => (
                <button key={tab} onClick={() => setSourceTab(tab)}
                  className={'px-4 py-2 rounded-lg text-sm font-semibold transition-all ' + (sourceTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
                  {tab === 'weights' ? 'Adjust weights' : 'Add sources' + (activeSources.length > 0 ? ' (' + activeSources.length + ')' : '')}
                </button>
              ))}
            </div>

            {sourceTab === 'weights' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: 'news', label: 'News', desc: 'Reuters, Bloomberg, AP...' },
                  { key: 'social', label: 'Social', desc: 'Twitter, Reddit...' },
                  { key: 'technical', label: 'Market probability', desc: 'Polymarket, Kalshi...' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="bg-gray-900/50 rounded-xl p-4">
                    <div className="flex justify-between mb-3">
                      <span className="text-white text-sm font-medium">{label}</span>
                      <span className="text-purple-400 font-black text-lg">{weights[key as keyof typeof weights]}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={weights[key as keyof typeof weights]}
                      onChange={e => handleWeightChange(key, parseInt(e.target.value))}
                      className="w-full accent-purple-500 mb-2" />
                    <p className="text-xs text-gray-600">{desc}</p>
                  </div>
                ))}
                <div className="md:col-span-3 flex gap-3">
                  <button onClick={() => setWeights(DEFAULT_W)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700">
                    Reset defaults
                  </button>
                  <button onClick={() => { runAnalysis(); setShowSources(false); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500">
                    Apply and refresh
                  </button>
                </div>
              </div>
            )}

            {sourceTab === 'marketplace' && (
              <div>
                <div className="flex gap-2 mb-4">
                  {(['news', 'social', 'technical'] as const).map(cat => (
                    <button key={cat} onClick={() => setMktTab(cat)}
                      className={'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (mktTab === cat ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
                      {cat === 'technical' ? 'Markets' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SOURCES[mktTab].map(source => (
                    <div key={source.name} className={'p-3 rounded-xl border transition-all ' + (isActive(source.name) ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800/30 hover:border-gray-600')}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-white text-sm font-medium">{source.name}</div>
                          <div className="text-gray-500 text-xs">{source.desc}</div>
                        </div>
                        <button onClick={() => toggle(source, mktTab)}
                          className={'text-xs px-2 py-1 rounded-lg font-semibold shrink-0 ' + (isActive(source.name) ? 'bg-red-600/80 text-white' : 'bg-purple-600/80 text-white')}>
                          {isActive(source.name) ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {isPlain ? (
          <PlainTextAnalysis
            question={event}
            confidence={intel?.confidence || 50}
            direction={intel?.direction || 'YES'}
            weights={weights}
            activeSources={activeSources}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT - Market standings */}
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
                onTradeReady={(data: TradeReadyData) => setTradeData(data)}
              />
            </div>

            {/* RIGHT - Verdict + Conviction + Trade */}
            <div className="lg:col-span-2 space-y-4">

              {/* AI Verdict */}
              <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-5">
                <div className="text-xs text-purple-400 font-semibold uppercase tracking-widest mb-4">AI Verdict</div>

                {mtype === 'categorical' && top.name ? (
                  <div>
                    <div className="text-2xl font-black text-white mb-1">{top.name}</div>
                    <div className="text-gray-500 text-sm mb-5">
                      {otype === 'prices' ? 'Most uncertain price level' : 'Most likely outcome by AI analysis'}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-black/30 rounded-xl">
                        <span className="text-gray-400 text-sm">Bettors say</span>
                        <span className="text-white font-bold text-lg">{top.odds}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                        <span className="text-gray-400 text-sm">AI thinks</span>
                        <span className="text-purple-400 font-bold text-lg">{top.aiConfidence}%</span>
                      </div>
                      {(top.weekChange || 0) !== 0 && (
                        <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl">
                          <span className="text-gray-400 text-sm">7-day trend</span>
                          <span className={(top.weekChange || 0) > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                            {(top.weekChange || 0) > 0 ? '+' : ''}{top.weekChange || 0}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : intel ? (
                  <div>
                    <div className="text-2xl font-black text-white mb-1">{intel.direction}</div>
                    <div className="text-gray-500 text-sm mb-5">AI prediction for this market</div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-black/30 rounded-xl">
                        <span className="text-gray-400 text-sm">Bettors say</span>
                        <span className="text-white font-bold text-lg">{odds ?? 0}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-900/20 border border-purple-800/30 rounded-xl">
                        <span className="text-gray-400 text-sm">AI thinks</span>
                        <span className="text-purple-400 font-bold text-lg">{intel.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-600 text-sm py-6 text-center">Loading analysis...</div>
                )}

                {/* Edge / Conviction */}
                {(mtype === 'categorical' ? top.name : intel) && (
                  <div className={'mt-4 p-4 border rounded-xl ' + edgeBg}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Conviction</span>
                      <span className={'text-sm font-black ' + edgeColor}>{edgeLabel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                        <div className={'h-1.5 rounded-full transition-all ' + (edgeVal >= 5 ? 'bg-green-500' : edgeVal >= 2 ? 'bg-yellow-500' : 'bg-gray-600')}
                          style={{ width: Math.min(Math.max((edgeVal + 10) / 20 * 100, 0), 100) + '%' }} />
                      </div>
                      <span className={'text-xs font-bold ' + edgeColor}>
                        {edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(1)}% edge
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Trade Panel */}
              {tradeData && (mtype === 'categorical' || intel) && (
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
              )}

              {/* Signal breakdown toggle */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button onClick={() => setShowDeep(!showDeep)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-white text-left">Signal breakdown</div>
                    <div className="text-xs text-gray-600 text-left">How each source contributed</div>
                  </div>
                  <span className="text-purple-400 font-bold text-lg">{showDeep ? '-' : '+'}</span>
                </button>
                {showDeep && (
                  <div className="border-t border-gray-800 p-5 space-y-3">
                    {[
                      { label: 'News sentiment', val: Math.round((odds || 50) * (weights.news / 100)), color: 'bg-purple-500' },
                      { label: 'Community signal', val: Math.round((odds || 50) * (weights.social / 100)), color: 'bg-blue-500' },
                      { label: 'Market probability', val: Math.round((odds || 50) * (weights.technical / 100)), color: 'bg-green-500' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs w-32 shrink-0">{s.label}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                          <div className={s.color + ' h-1.5 rounded-full'} style={{ width: Math.min((s.val / 30) * 100, 100) + '%' }} />
                        </div>
                        <span className="text-white text-xs font-bold w-10 text-right">+{s.val}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Config */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <div className="text-xs text-gray-600 font-semibold uppercase tracking-widest mb-3">Configuration</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'News', val: weights.news, c: 'text-purple-400' },
                    { label: 'Social', val: weights.social, c: 'text-blue-400' },
                    { label: 'Market', val: weights.technical, c: 'text-green-400' },
                  ].map(w => (
                    <div key={w.label} className="bg-black/30 rounded-xl p-2.5 text-center">
                      <div className={'text-lg font-black ' + w.c}>{w.val}%</div>
                      <div className="text-gray-600 text-xs">{w.label}</div>
                    </div>
                  ))}
                </div>
                {activeSources.length > 0 && (
                  <div className="mt-2 text-xs text-purple-500">{activeSources.length} custom sources active</div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>


      {/* Footer */}
      <div className="border-t border-gray-800/50 px-6 py-3 mt-8">
        <p className="text-gray-800 text-xs text-center">Not financial advice. Research purposes only.</p>
      </div>

    </div>
  </div>
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
