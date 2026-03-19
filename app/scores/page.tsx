'use client';
import { Suspense, useEffect, useState } from 'react';
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

const SOURCES = {
  news: [
    { name: 'Reuters', desc: 'Global newswire', url: 'https://reuters.com' },
    { name: 'Bloomberg', desc: 'Financial news', url: 'https://bloomberg.com' },
    { name: 'Associated Press', desc: 'Breaking news', url: 'https://apnews.com' },
    { name: 'BBC News', desc: 'International coverage', url: 'https://bbc.com/news' },
    { name: 'CoinDesk', desc: 'Crypto and blockchain', url: 'https://coindesk.com' },
    { name: 'Politico', desc: 'Politics and policy', url: 'https://politico.com' },
    { name: 'Financial Times', desc: 'Business and finance', url: 'https://ft.com' },
  ],
  social: [
    { name: 'Twitter/X', desc: 'Real-time sentiment', url: 'https://twitter.com' },
    { name: 'r/politics', desc: 'Political discussion', url: 'https://reddit.com/r/politics' },
    { name: 'r/investing', desc: 'Investment sentiment', url: 'https://reddit.com/r/investing' },
    { name: 'r/cryptocurrency', desc: 'Crypto community', url: 'https://reddit.com/r/cryptocurrency' },
    { name: 'StockTwits', desc: 'Trader sentiment', url: 'https://stocktwits.com' },
  ],
  technical: [
    { name: 'Kalshi', desc: 'Prediction market', url: 'https://kalshi.com' },
    { name: 'Metaculus', desc: 'Forecasting community', url: 'https://metaculus.com' },
    { name: 'Manifold', desc: 'Play-money markets', url: 'https://manifold.markets' },
  ]
};

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || '';

  const [intel, setIntel] = useState<any>(null);
  const [odds, setOdds] = useState<number | null>(null);
  const [mtype, setMtype] = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [otype, setOtype] = useState('options');
  const [hasUrl, setHasUrl] = useState<boolean|null>(null);
  const [tradeData, setTradeData] = useState<TradeReadyData|null>(null);
  const [showSources, setShowSources] = useState(false);
  const [sourceTab, setSourceTab] = useState<'weights'|'marketplace'>('weights');
  const [mktTab, setMktTab] = useState<'news'|'social'|'technical'>('news');
  const [showDeep, setShowDeep] = useState(false);
  const [activeSources, setActiveSources] = useState<any[]>([]);
  const DEFAULT_W = { news: 35, social: 40, technical: 25 };
  const [weights, setWeights] = useState(DEFAULT_W);

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
  const toggle = (source: any, type: string) => {
    if (isActive(source.name)) setActiveSources(activeSources.filter(s => s.name !== source.name));
    else setActiveSources([...activeSources, { ...source, type }]);
  };

  const isPlain = hasUrl === false;
  const top = outcomes[0] || { name: '', odds: 0, aiConfidence: 0, edge: 0, weekChange: 0 };
  const unitLabel = otype === 'candidates' ? 'candidates' : otype === 'companies' ? 'companies' : otype === 'dates' ? 'dates' : 'outcomes';
  const binaryAI = intel?.confidence || 0;
  const binaryEdge = binaryAI - (odds || 0);

  const eventTitle = (() => {
    const idx = event.indexOf('polymarket.com/event/');
    if (idx >= 0) {
      const slug = event.slice(idx + 21).split('/')[0].split('?')[0];
      return slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return event.length > 80 ? event.slice(0, 80) : event;
  })();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white text-sm">Back</button>
          <div className="flex gap-4">
            <button onClick={() => router.push('/journal')} className="text-gray-400 hover:text-white text-sm">Journal</button>
            <button onClick={() => router.push('/profile')} className="text-gray-400 hover:text-white text-sm">View Profile</button>
          </div>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">PlayPicks AI</h1>
            <p className="text-gray-400 text-sm">AI-powered prediction analysis</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setShowSources(!showSources)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold">
              Tune AI sources
            </button>
            <button onClick={runAnalysis} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold">
              Refresh results
            </button>
            <button onClick={() => {
              try {
                const saved = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
                saved.unshift({ id: Date.now(), event, type: mtype, timestamp: Date.now(), odds });
                localStorage.setItem('savedAnalyses', JSON.stringify(saved));
                alert('Saved!');
              } catch {}
            }} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold">
              Save
            </button>
          </div>
        </div>

        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Analyzing prediction market</div>
          <div className="text-white font-semibold text-sm">{eventTitle}</div>
          <div className="text-xs text-gray-500 mt-1">
            Source: Polymarket
            {outcomes.length > 0 ? ' - ' + outcomes.length + ' competing ' + unitLabel : ''}
            {isPlain ? ' - No live market URL' : ''}
          </div>
        </div>

        {showSources && (
          <div className="mb-6 border border-purple-500/30 rounded-xl p-6 bg-purple-900/10">
            <div className="flex gap-2 mb-6">
              <button onClick={() => setSourceTab('weights')} className={'px-4 py-2 rounded-lg text-sm font-semibold ' + (sourceTab === 'weights' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400')}>
                Adjust weights
              </button>
              <button onClick={() => setSourceTab('marketplace')} className={'px-4 py-2 rounded-lg text-sm font-semibold ' + (sourceTab === 'marketplace' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400')}>
                {'Add sources' + (activeSources.length > 0 ? ' (' + activeSources.length + ' active)' : '')}
              </button>
            </div>
            {sourceTab === 'weights' && (
              <div className="space-y-6">
                <p className="text-sm text-gray-400">Control how much each signal type influences the AI prediction.</p>
                {[
                  { key: 'news', label: 'News sources', desc: 'Reuters, Bloomberg, AP News...' },
                  { key: 'social', label: 'Social sources', desc: 'Twitter/X, Reddit, StockTwits...' },
                  { key: 'technical', label: 'Market probability', desc: 'Polymarket, Kalshi, Metaculus...' },
                ].map(({ key, label, desc }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300 text-sm">{label}</span>
                      <span className="text-purple-400 font-bold">{weights[key as keyof typeof weights]}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={weights[key as keyof typeof weights]}
                      onChange={e => handleWeightChange(key, parseInt(e.target.value))}
                      className="w-full accent-purple-500" />
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className={'font-bold text-sm ' + (weights.news + weights.social + weights.technical === 100 ? 'text-green-400' : 'text-red-400')}>
                    {weights.news + weights.social + weights.technical}%
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setWeights(DEFAULT_W)} className="flex-1 bg-gray-700 text-gray-300 py-2 rounded-lg text-sm">Reset to default</button>
                  <button onClick={() => { runAnalysis(); setShowSources(false); }} className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm">Apply and refresh</button>
                </div>
              </div>
            )}
            {sourceTab === 'marketplace' && (
              <div>
                <div className="flex gap-2 mb-4">
                  {(['news', 'social', 'technical'] as const).map(cat => (
                    <button key={cat} onClick={() => setMktTab(cat)}
                      className={'px-3 py-1.5 rounded-lg text-xs font-semibold ' + (mktTab === cat ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400')}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {SOURCES[mktTab].map(source => (
                    <div key={source.name} className={'p-3 rounded-lg border ' + (isActive(source.name) ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800/50')}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-white text-sm font-medium">{source.name}</div>
                          <div className="text-gray-400 text-xs">{source.desc}</div>
                        </div>
                        <button onClick={() => toggle(source, mktTab)} className={'text-xs px-2 py-1 rounded font-bold ' + (isActive(source.name) ? 'bg-red-600 text-white' : 'bg-green-600 text-white')}>
                          {isActive(source.name) ? 'Remove' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={isPlain ? "max-w-2xl mx-auto" : "grid grid-cols-1 lg:grid-cols-5 gap-6"}>
          {!isPlain && (
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
          )}

          <div className={isPlain ? "space-y-4" : "lg:col-span-2 space-y-4"}>
            {isPlain ? (
              <PlainTextAnalysis
                question={event}
                confidence={intel?.confidence || 50}
                direction={intel?.direction || 'YES'}
                weights={weights}
                activeSources={activeSources}
              />
            ) : (
              <div className="border border-gray-700 rounded-xl p-5">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">AI verdict</div>
                {mtype === 'categorical' && top.name ? (
                  <div>
                    <div className="text-2xl font-bold mb-1">{top.name}</div>
                    <div className="text-sm text-gray-400 mb-4">Most likely to win, based on AI analysis</div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Bettors say</span>
                        <span className="text-white">{top.odds}% chance</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">AI thinks</span>
                        <span className="text-purple-400">{top.aiConfidence}% chance {top.aiConfidence > top.odds ? '(more bullish)' : '(more cautious)'}</span>
                      </div>
                      {(top.weekChange || 0) !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Trending</span>
                          <span className={(top.weekChange || 0) > 0 ? 'text-green-400' : 'text-red-400'}>
                            {(top.weekChange || 0) > 0 ? 'up' : 'down'} {Math.abs(top.weekChange || 0)}% this week
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : intel ? (
                  <div>
                    <div className="text-2xl font-bold mb-1">{intel.direction}</div>
                    <div className="text-sm text-gray-400 mb-4">AI prediction for this market</div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Bettors say</span>
                        <span className="text-white">{odds ?? 0}% chance</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">AI thinks</span>
                        <span className="text-purple-400">{intel.confidence}% chance</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm py-4">Analyzing...</div>
                )}
                <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                  <div className="text-xs text-yellow-400 font-semibold mb-1">Medium risk</div>
                  <div className="text-xs text-amber-200/70">
                    {mtype === 'categorical'
                      ? outcomes.length + ' ' + unitLabel + ' competing. ' + top.odds + '% means ' + (100 - top.odds) + '% chance a different outcome wins.'
                      : 'Market shows ' + (odds ?? 0) + '% probability. Review all signals before deciding.'}
                  </div>
                </div>
              </div>
            )}

            {!isPlain && tradeData && (mtype === 'categorical' || intel) && (
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

            <div className="border border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-400 font-medium mb-3">Current configuration</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">News sources</span><span className="text-white">{weights.news}%</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Social sources</span><span className="text-white">{weights.social}%</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Market probability</span><span className="text-white">{weights.technical}%</span></div>
              </div>
              {activeSources.length > 0 && <div className="mt-2 text-xs text-purple-400">{activeSources.length} custom sources active</div>}
            </div>

            <button onClick={() => setShowDeep(!showDeep)}
              className="w-full border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400 flex justify-between items-center hover:bg-gray-900">
              <span>See full signal breakdown</span>
              <span>{showDeep ? '-' : '+'}</span>
            </button>

            {showDeep && (
              <div className="border border-gray-700 rounded-xl p-5 space-y-3">
                <div className="text-sm font-medium text-white">Signal contribution</div>
                {[
                  { label: 'News sentiment', value: Math.round((odds || 50) * (weights.news / 100)), color: 'bg-yellow-500' },
                  { label: 'Community signal', value: Math.round((odds || 50) * (weights.social / 100)), color: 'bg-green-500' },
                  { label: 'Market probability', value: Math.round((odds || 50) * (weights.technical / 100)), color: 'bg-blue-500' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{s.label}</span>
                      <span className="text-white">+{s.value}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div className={s.color + ' h-1.5 rounded-full'} style={{ width: Math.min((s.value / 30) * 100, 100) + '%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-600">Not financial advice. Research purposes only.</div>
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
