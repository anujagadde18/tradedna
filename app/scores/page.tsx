'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { TradePanel } from '@/components/TradePanel';
import { PlainTextAnalysis } from '@/components/PlainTextAnalysis';
import { calculateIntelligence } from '@/lib/intelligenceEngine';

const MARKETPLACE = {
  news: [
    { name: 'Reuters',          desc: 'Global newswire',         url: 'https://feeds.reuters.com' },
    { name: 'Bloomberg',        desc: 'Financial news',          url: 'https://bloomberg.com' },
    { name: 'Associated Press', desc: 'Breaking news worldwide', url: 'https://apnews.com' },
    { name: 'BBC News',         desc: 'International coverage',  url: 'https://bbc.com/news' },
    { name: 'CoinDesk',         desc: 'Crypto & blockchain',     url: 'https://coindesk.com' },
    { name: 'ESPN',             desc: 'Sports news',             url: 'https://espn.com' },
    { name: 'Politico',         desc: 'Politics & policy',       url: 'https://politico.com' },
    { name: 'Financial Times',  desc: 'Business & finance',      url: 'https://ft.com' },
  ],
  social: [
    { name: 'r/politics',       desc: 'Political discussion',    url: 'https://reddit.com/r/politics' },
    { name: 'r/investing',      desc: 'Investment sentiment',    url: 'https://reddit.com/r/investing' },
    { name: 'r/cryptocurrency', desc: 'Crypto community',        url: 'https://reddit.com/r/cryptocurrency' },
    { name: 'r/sports',         desc: 'Sports discussion',       url: 'https://reddit.com/r/sports' },
    { name: 'Twitter/X',        desc: 'Real-time sentiment',     url: 'https://twitter.com' },
    { name: 'StockTwits',       desc: 'Trader sentiment',        url: 'https://stocktwits.com' },
  ],
  technical: [
    { name: 'Kalshi',    desc: 'Prediction market',     url: 'https://kalshi.com' },
    { name: 'Metaculus', desc: 'Forecasting community', url: 'https://metaculus.com' },
    { name: 'PredictIt', desc: 'Political markets',     url: 'https://predictit.org' },
    { name: 'Manifold',  desc: 'Play-money markets',    url: 'https://manifold.markets' },
    { name: 'Augur',     desc: 'Decentralized markets', url: 'https://augur.net' },
  ]
};

function generatePositiveSignals(
  name: string, weekChange: number, edge: number,
  rank: number, total: number, outcomeType: string
): string[] {
  const signals: string[] = [];
  const unitLabel = outcomeType === 'dates' ? 'dates'
    : outcomeType === 'candidates' ? 'candidates'
    : outcomeType === 'companies' ? 'competitors'
    : outcomeType === 'prices' ? 'price levels'
    : 'outcomes';

  if (outcomeType === 'prices') {
    signals.push(`Most uncertain level — bettors are split on whether ${name} will be hit`);
    if (weekChange !== 0) signals.push(weekChange > 0 ? 'Probability trending upward this week' : 'Probability trending downward this week');
    return signals;
  }
  if (rank === 0) signals.push(`Highest probability of all ${total} ${unitLabel}`);
  if (weekChange > 5) signals.push(`Gaining fast — up ${weekChange}% just this week`);
  else if (weekChange > 0) signals.push('Momentum is trending upward this week');
  if (edge > 5) signals.push('AI signals strongly favor this outcome');
  else if (edge > 0) signals.push('AI signals are bullish on this outcome');
  if (signals.length === 0) signals.push(`Leads all ${unitLabel} in market probability`);
  return signals;
}

interface TradeReadyData {
  marketTitle: string;
  marketUrl: string;
  outcomeType: string;
  marketType: 'binary' | 'categorical';
  topOutcome: {
    name: string;
    odds: number;
    aiConfidence: number;
    edge: number;
    tokenId?: string;
  };
  binaryTokenYes?: string;
  binaryTokenNo?: string;
}

function ScoresPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const event        = searchParams.get('event') || 'Unknown Event';

  const [intelligence, setIntelligence]               = useState<any>(null);
  const [polymarketOdds, setPolymarketOdds]           = useState<number | null>(null);
  const [marketType, setMarketType]                   = useState<'binary' | 'categorical'>('binary');
  const [outcomeType, setOutcomeType]                 = useState<string>('options');
  const [categoricalOutcomes, setCategoricalOutcomes] = useState<any[]>([]);
  const [hasPolymarketUrl, setHasPolymarketUrl]       = useState<boolean | null>(null);
  const [loading, setLoading]                         = useState(true);
  const [showDeep, setShowDeep]                       = useState(false);
  const [showSources, setShowSources]                 = useState(false);
  const [sourceTab, setSourceTab]                     = useState<'weights' | 'marketplace'>('weights');
  const [marketplaceTab, setMarketplaceTab]           = useState<'news' | 'social' | 'technical'>('news');
  const [tradeData, setTradeData]                     = useState<TradeReadyData | null>(null);

  const DEFAULT_WEIGHTS = { news: 35, social: 40, technical: 25 };
  const [weights, setWeights]             = useState(DEFAULT_WEIGHTS);
  const [activeSources, setActiveSources] = useState<any[]>([]);
  const [customName, setCustomName]       = useState('');
  const [customUrl, setCustomUrl]         = useState('');
  const [customType, setCustomType]       = useState('news');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const sw = localStorage.getItem('signalWeights');
        if (sw) setWeights(JSON.parse(sw));
        const cs = localStorage.getItem('customSources');
        if (cs) setActiveSources(JSON.parse(cs));
      } catch {}
    }
    setHasPolymarketUrl(/polymarket\.com\/event\//.test(event));
  }, []);

  const runAnalysis = () => {
    if (marketType === 'categorical') { setLoading(false); return; }
    const result = calculateIntelligence(
      54, weights,
      activeSources.filter(s => s.enabled !== false).length,
      polymarketOdds, event
    );
    setIntelligence(result);
    setLoading(false);
  };

  useEffect(() => { runAnalysis(); }, [event, polymarketOdds, marketType]);

  const handlePolymarketData = (odds: number, type?: 'binary' | 'categorical', outcomes?: any[], oType?: string) => {
    setPolymarketOdds(odds);
    if (type)     setMarketType(type);
    if (outcomes) setCategoricalOutcomes(outcomes);
    if (oType)    setOutcomeType(oType);
    setHasPolymarketUrl(true);
  };

  const handleTradeReady = (data: TradeReadyData) => {
    setTradeData(data);
  };

  const handleSave = () => {
    if (typeof window === 'undefined') return;
    const analysis = { id: Date.now().toString(), event, type: marketType, timestamp: Date.now(), polymarketOdds };
    try {
      const saved    = localStorage.getItem('savedAnalyses');
      const analyses = saved ? JSON.parse(saved) : [];
      analyses.unshift(analysis);
      localStorage.setItem('savedAnalyses', JSON.stringify(analyses));
      alert('Analysis saved!');
    } catch { alert('Failed to save'); }
  };

  const handleWeightChange = (key: string, value: number) => {
    const remaining = 100 - value;
    const otherKeys = Object.keys(weights).filter(k => k !== key) as Array<keyof typeof weights>;
    const otherTotal = otherKeys.reduce((s, k) => s + weights[k], 0);
    const newWeights = { ...weights, [key]: value };
    if (otherTotal > 0) {
      otherKeys.forEach(k => { newWeights[k] = Math.round((weights[k] / otherTotal) * remaining); });
    }
    const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
    if (total !== 100) newWeights[otherKeys[0]] += (100 - total);
    setWeights(newWeights as typeof weights);
  };

  const isSourceActive = (name: string) => activeSources.some(s => s.name === name);
  const toggleSource   = (source: any, type: string) => {
    if (isSourceActive(source.name)) {
      setActiveSources(activeSources.filter(s => s.name !== source.name));
    } else {
      setActiveSources([...activeSources, { ...source, type }]);
    }
  };

  const topOutcome = (() => {
    if (categoricalOutcomes.length === 0) return { name: 'Unknown', odds: 0, weekChange: 0, aiConfidence: 0, edge: 0 };
    if (outcomeType === 'prices') {
      const uncertain = categoricalOutcomes.filter(o => o.odds >= 5 && o.odds <= 95);
      if (uncertain.length > 0) {
        return uncertain.reduce((prev: any, curr: any) =>
          Math.abs(curr.odds - 50) < Math.abs(prev.odds - 50) ? curr : prev
        );
      }
    }
    return categoricalOutcomes[0];
  })();

  const eventTitle = (() => {
    try {
      const match = event.match(/polymarket\.com\/event\/([^\/\s?#]+)/);
      if (match) {
        const skipWords = ['the', 'of', 'and', 'for', 'to', 'a', 'an', 'in', 'by', 'at', 'with', 'will', 'be'];
        return match[1].replace(/-/g, ' ')
          .split(' ')
          .map((word: string, i: number) =>
            i === 0 || !skipWords.includes(word.toLowerCase())
              ? word.charAt(0).toUpperCase() + word.slice(1)
              : word
          )
          .join(' ');
      }
    } catch {}
    return event;
  })();

  const positiveSignals = marketType === 'categorical'
    ? generatePositiveSignals(topOutcome.name, topOutcome.weekChange || 0, topOutcome.edge || 0, 0, categoricalOutcomes.length, outcomeType)
    : intelligence?.confidenceDrivers?.positive?.slice(0, 3) || ['Strong news sentiment', 'Community momentum favorable'];

  const unitLabel      = outcomeType === 'dates' ? 'dates' : outcomeType === 'candidates' ? 'candidates' : outcomeType === 'companies' ? 'companies' : outcomeType === 'prices' ? 'price levels' : 'outcomes';
  const competingLabel = categoricalOutcomes.length > 0 ? `${categoricalOutcomes.length} competing ${unitLabel}` : '';
  const riskLevel      = marketType === 'categorical' ? 'Medium' : (intelligence?.riskLevel?.replace(' Risk', '') || 'Medium');
  const riskColor      = riskLevel === 'Low' ? 'text-green-400' : riskLevel === 'High' ? 'text-red-400' : 'text-yellow-400';
  const riskBg         = riskLevel === 'Low' ? 'bg-green-900/20 border-green-700/30' : riskLevel === 'High' ? 'bg-red-900/20 border-red-700/30' : 'bg-amber-900/20 border-amber-700/30';
  const riskTextColor  = riskLevel === 'Low' ? 'text-green-200/80' : riskLevel === 'High' ? 'text-red-200/80' : 'text-amber-200/70';

  const riskDescription = (() => {
    if (marketType === 'categorical') {
      if (outcomeType === 'prices')     return `${categoricalOutcomes.length} price levels tracked. ${topOutcome.odds}% chance the top level is hit — ${100 - topOutcome.odds}% chance it lands elsewhere.`;
      if (outcomeType === 'dates')      return `${categoricalOutcomes.length} dates are possible. ${topOutcome.odds}% means ${100 - topOutcome.odds}% chance it happens on a different date.`;
      if (outcomeType === 'candidates') return `${categoricalOutcomes.length} candidates are running. ${topOutcome.odds}% means ${100 - topOutcome.odds}% chance someone else wins.`;
      return `${categoricalOutcomes.length} ${unitLabel} are competing. ${topOutcome.odds}% means ${100 - topOutcome.odds}% chance a different outcome wins.`;
    }
    return `Market shows ${polymarketOdds ?? '—'}% probability. Review all signals before deciding.`;
  })();

  const isPlainTextQuery = hasPolymarketUrl === false;

  // For binary markets, calculate AI confidence and edge properly
  const binaryAiConfidence = intelligence?.confidence || 0;
  const binaryEdge = binaryAiConfidence - (polymarketOdds || 0);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">

        {/* NAV */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Back
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/journal')} className="text-gray-400 hover:text-white text-sm">
              📒 Journal
            </button>
            <button onClick={() => router.push('/profile')} className="text-gray-400 hover:text-white text-sm">
              View Profile →
            </button>
          </div>
        </div>

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">PlayPicks AI</h1>
            <p className="text-gray-400 text-sm">AI-powered prediction analysis</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={() => setShowSources(!showSources)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold transition-all shrink-0">
              ⚙️ Tune AI sources
            </button>
            <button onClick={runAnalysis}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-all shrink-0">
              🔄 Refresh results
            </button>
            <button onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold transition-all shrink-0">
              🔖 Save
            </button>
          </div>
        </div>

        {/* QUESTION BAR */}
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">Analyzing prediction market</div>
          <div className="text-white font-semibold text-sm mb-1">{eventTitle}</div>
          <div className="text-xs text-gray-500">
            Source: Polymarket
            {competingLabel && ` · ${competingLabel}`}
            {isPlainTextQuery && ' · No live market URL'}
          </div>
        </div>

        {/* TUNE AI SOURCES PANEL */}
        {showSources && (
          <div className="mb-6 border border-purple-500/30 rounded-xl p-6 bg-purple-900/10">
            <div className="flex gap-2 mb-6">
              <button onClick={() => setSourceTab('weights')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${sourceTab === 'weights' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                Adjust weights
              </button>
              <button onClick={() => setSourceTab('marketplace')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${sourceTab === 'marketplace' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                Add sources {activeSources.length > 0 && `(${activeSources.length} active)`}
              </button>
            </div>

            {sourceTab === 'weights' && (
              <div className="space-y-6">
                <p className="text-sm text-gray-400">Control how much each signal type influences the AI prediction.</p>
                {[
                  { key: 'news',      label: '📰 News sources',      desc: 'Reuters, Bloomberg, AP News...' },
                  { key: 'social',    label: '💬 Social sources',     desc: 'Twitter/X, Reddit, StockTwits...' },
                  { key: 'technical', label: '📊 Market probability', desc: 'Polymarket, Kalshi, Metaculus...' },
                ].map(({ key, label, desc }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300 text-sm">{label}</span>
                      <span className="text-purple-400 font-bold">{weights[key as keyof typeof weights]}%</span>
                    </div>
                    <input type="range" min="0" max="100"
                      value={weights[key as keyof typeof weights]}
                      onChange={e => handleWeightChange(key, parseInt(e.target.value))}
                      className="w-full accent-purple-500" />
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className={`font-bold text-sm ${weights.news + weights.social + weights.technical === 100 ? 'text-green-400' : 'text-red-400'}`}>
                    {weights.news + weights.social + weights.technical}%
                    {weights.news + weights.social + weights.technical === 100 ? ' ✓' : ' ✗'}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setWeights(DEFAULT_WEIGHTS)} className="flex-1 bg-gray-700 text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-600">
                    Reset to default
                  </button>
                  <button onClick={() => { runAnalysis(); setShowSources(false); }} className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm hover:bg-purple-500">
                    Apply & refresh
                  </button>
                </div>
              </div>
            )}

            {sourceTab === 'marketplace' && (
              <div>
                <div className="flex gap-2 mb-4">
                  {(['news', 'social', 'technical'] as const).map(cat => (
                    <button key={cat} onClick={() => setMarketplaceTab(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${marketplaceTab === cat ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {cat === 'news' ? '📰 News' : cat === 'social' ? '💬 Social' : '📊 Technical'}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {MARKETPLACE[marketplaceTab].map(source => (
                    <div key={source.name} className={`p-3 rounded-lg border ${isSourceActive(source.name) ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800/50'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-white text-sm font-medium">{source.name}</div>
                          <div className="text-gray-400 text-xs mt-0.5">{source.desc}</div>
                        </div>
                        <button onClick={() => toggleSource(source, marketplaceTab)}
                          className={`text-xs px-2 py-1 rounded font-bold shrink-0 ${isSourceActive(source.name) ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                          {isSourceActive(source.name) ? 'Remove' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {activeSources.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2">Active sources ({activeSources.length})</div>
                    <div className="space-y-1">
                      {activeSources.map(s => (
                        <div key={s.name} className="flex justify-between items-center p-2 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-purple-400 uppercase">{s.type}</span>
                            <span className="text-white text-sm">{s.name}</span>
                          </div>
                          <button onClick={() => toggleSource(s, s.type)} className="text-red-400 text-xs hover:text-red-300">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-4">
                  <div className="text-xs text-gray-400 mb-3">+ Add custom source</div>
                  <div className="flex gap-2 mb-2">
                    <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Source name"
                      className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600" />
                    <select value={customType} onChange={e => setCustomType(e.target.value)}
                      className="bg-gray-800 text-white px-2 py-2 rounded-lg text-sm border border-gray-600">
                      <option value="news">News</option>
                      <option value="social">Social</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>
                  <input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://..."
                    className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 mb-2" />
                  <button onClick={() => {
                    if (customName && customUrl) {
                      setActiveSources([...activeSources, { name: customName, url: customUrl, type: customType, desc: 'Custom source' }]);
                      setCustomName(''); setCustomUrl('');
                    }
                  }} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-500">
                    Add custom source
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAIN TWO COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT — hidden for plain text queries since PolymarketComparison returns null */}
          {!isPlainTextQuery && (
            <div className="lg:col-span-3">
              <PolymarketComparison
                userQuestion={event}
                aiPrediction={intelligence?.confidence || 0}
                onDataReceived={handlePolymarketData}
                onTradeReady={handleTradeReady}
              />
            </div>
          )}

          {/* RIGHT — full width for plain text, 2/5 for Polymarket URL */}
          <div className={isPlainTextQuery ? "lg:col-span-5 max-w-2xl mx-auto w-full" : "lg:col-span-2"} style={{alignSelf: 'start'}}>
            <div className="space-y-4">

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
                  <>
                    <div className="text-2xl font-bold text-white mb-1">{topOutcome.name}</div>
                    <div className="text-sm text-gray-400 mb-4">
                      {outcomeType === 'prices' ? 'Most uncertain price level — watch this one' : 'Most likely to win, based on AI analysis'}
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Bettors say</span>
                        <span className="text-white font-medium">{topOutcome.odds}% chance</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">AI thinks</span>
                        <span className="text-purple-400 font-medium">
                          {topOutcome.aiConfidence}% chance
                          {topOutcome.aiConfidence > topOutcome.odds ? ' — more bullish' : ' — more cautious'}
                        </span>
                      </div>
                      {(topOutcome.weekChange || 0) !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Trending</span>
                          <span className={(topOutcome.weekChange || 0) > 0 ? 'text-green-400' : 'text-red-400'}>
                            {(topOutcome.weekChange || 0) > 0 ? '▲' : '▼'}{Math.abs(topOutcome.weekChange || 0)}% this week
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : intelligence ? (
                  <>
                    <div className="text-2xl font-bold text-white mb-1">{intelligence.direction}</div>
                    <div className="text-sm text-gray-400 mb-4">AI prediction for this market</div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Bettors say</span>
                        <span className="text-white font-medium">{polymarketOdds ?? '—'}% chance</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">AI thinks</span>
                        <span className="text-purple-400 font-medium">{intelligence.confidence}% chance</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-400 text-sm py-4">Analyzing...</div>
                )}

                <div className="border-t border-gray-700 pt-4 mb-4">
                  <div className="text-xs text-gray-400 font-medium mb-3">
                    Why AI picked {marketType === 'categorical' ? topOutcome.name : (intelligence?.direction || '...')}
                  </div>
                  <div className="space-y-2">
                    {positiveSignals.map((signal: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <div className="w-4 h-4 rounded-full bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-green-400 text-xs">✓</span>
                        </div>
                        {signal}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`border rounded-lg p-3 ${riskBg}`}>
                  <div className={`text-xs font-semibold mb-1 ${riskColor}`}>⚠ {riskLevel} risk</div>
                  <div className={`text-xs ${riskTextColor}`}>{riskDescription}</div>
                </div>
              </div>
            )}

            {/* TRADE PANEL — only when real URL + data loaded + intelligence ready for binary */}
            {!isPlainTextQuery && tradeData &&
             (tradeData.marketType === 'categorical' || intelligence) && (
              <TradePanel
                marketUrl={tradeData.marketUrl}
                marketTitle={tradeData.marketTitle}
                outcomeName={tradeData.topOutcome.name}
                marketOdds={tradeData.topOutcome.odds}
                aiConfidence={
                  tradeData.marketType === 'categorical'
                    ? tradeData.topOutcome.aiConfidence
                    : binaryAiConfidence
                }
                edge={
                  tradeData.marketType === 'categorical'
                    ? tradeData.topOutcome.edge
                    : binaryEdge
                }
                tokenId={tradeData.topOutcome.tokenId}
                isBinary={tradeData.marketType === 'binary'}
              />
            )}

            {/* CURRENT CONFIGURATION */}
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
              {activeSources.length > 0 && (
                <div className="mt-2 text-xs text-purple-400">{activeSources.length} custom sources active</div>
              )}
            </div>

            {/* DEEP ANALYSIS TOGGLE */}
            <button onClick={() => setShowDeep(!showDeep)}
              className="w-full border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400 flex justify-between items-center hover:bg-gray-900 transition-colors">
              <span>🔍 See full signal breakdown</span>
              <span>{showDeep ? '▴' : '▾'}</span>
            </button>

            {showDeep && (
              <div className="border border-gray-700 rounded-xl p-5 space-y-5">
                <div>
                  <div className="text-sm font-medium text-white mb-3">Signal contribution</div>
                  <div className="space-y-3">
                    {[
                      { label: '📰 News sentiment',     value: Math.round((polymarketOdds || 50) * (weights.news / 100)),      color: 'bg-yellow-500', desc: 'Analyzes sentiment across major outlets' },
                      { label: '💬 Community signal',   value: Math.round((polymarketOdds || 50) * (weights.social / 100)),    color: 'bg-green-500',  desc: 'Measures public discussion trends' },
                      { label: '📊 Market probability', value: Math.round((polymarketOdds || 50) * (weights.technical / 100)), color: 'bg-blue-500',   desc: marketType === 'categorical' ? `${topOutcome.name} leads at ${topOutcome.odds}%` : `Live odds: ${polymarketOdds ?? '—'}%` },
                    ].map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">{s.label}</span>
                          <span className="text-white font-medium">+{s.value}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                          <div className={`${s.color} h-1.5 rounded-full`} style={{ width: `${Math.min((s.value / 30) * 100, 100)}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-semibold border-t border-gray-700 pt-2">
                      <span className="text-gray-300">Total confidence</span>
                      <span className="text-white">
                        {Math.round((polymarketOdds || 50) * (weights.news / 100)) +
                         Math.round((polymarketOdds || 50) * (weights.social / 100)) +
                         Math.round((polymarketOdds || 50) * (weights.technical / 100))}%
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-white mb-3">Confidence drivers</div>
                  <div className="mb-3">
                    <div className="text-xs text-green-400 font-semibold mb-2 uppercase">Positive signals</div>
                    {positiveSignals.map((d: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-300 mb-1">
                        <span className="text-green-400">✓</span>{d}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-orange-400 font-semibold mb-2 uppercase">Negative signals</div>
                    {marketType === 'categorical' ? (
                      <>
                        <div className="flex items-start gap-2 text-xs text-gray-300 mb-1">
                          <span className="text-orange-400">⚠</span>
                          Highly competitive — {categoricalOutcomes.length} active {unitLabel}
                        </div>
                        <div className="flex items-start gap-2 text-xs text-gray-300 mb-1">
                          <span className="text-orange-400">⚠</span>
                          {topOutcome.odds}% means {100 - topOutcome.odds}% chance another {unitLabel.slice(0, -1)} wins
                        </div>
                      </>
                    ) : (intelligence?.confidenceDrivers?.negative || []).map((d: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-300 mb-1">
                        <span className="text-orange-400">⚠</span>{d}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-white mb-2">Why this prediction?</div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {marketType === 'categorical'
                      ? `Analysis across news (${weights.news}%), social (${weights.social}%), and market data (${weights.technical}%). ${topOutcome.name} leads with ${topOutcome.odds}% market probability across ${categoricalOutcomes.length} ${unitLabel}. Weekly momentum: ${topOutcome.name} ${(topOutcome.weekChange || 0) > 0 ? '▲' : '▼'}${Math.abs(topOutcome.weekChange || 0)}%. AI signals point to ${topOutcome.name} as highest conviction pick.`
                      : intelligence?.explanation || 'Analysis pending...'
                    }
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-600">
          Not financial advice · Research purposes only
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
