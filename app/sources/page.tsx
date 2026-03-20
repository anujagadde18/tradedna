'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const S = {
  bg: '#0a0a0b', bg2: '#111113', bg3: '#18181c', bg4: '#1f1f25',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#f0eff4', text2: '#9998a8', text3: '#5e5d6e',
  purple: '#7c6ff7', purpleL: '#a89cf8',
  green: '#2ecc8a', amber: '#f5a623', red: '#ef4f6a', blue: '#4d9de0',
};

type SigType = 'strong' | 'mixed' | 'contrary' | 'priced';
type CatType = 'news' | 'social' | 'market' | 'community';

interface ActiveSource {
  id: string;
  name: string;
  category: CatType;
  signal: string;
  type: SigType;
  contribution: number;
}

interface MarketSource {
  id: string;
  name: string;
  desc: string;
  category: CatType;
  added: boolean;
}

const INITIAL_ACTIVE: ActiveSource[] = [
  { id: 'reuters',    name: 'Reuters',         category: 'news',      signal: 'GDP contraction articles up 40% this week', type: 'strong',   contribution: 22 },
  { id: 'ft',         name: 'Financial Times', category: 'news',      signal: 'Analysis points to uncertainty, leans toward outcome', type: 'mixed', contribution: 11 },
  { id: 'bloomberg',  name: 'Bloomberg',       category: 'news',      signal: 'Market watchers cautiously optimistic', type: 'strong', contribution: 15 },
  { id: 'reddit',     name: 'Reddit',          category: 'social',    signal: 'r/economics - strong consensus forming', type: 'strong', contribution: 18 },
  { id: 'twitter',    name: 'Twitter/X',       category: 'social',    signal: 'Noisy - political commentary drowning signal', type: 'contrary', contribution: -3 },
  { id: 'polymarket', name: 'Polymarket',      category: 'market',    signal: '95% consensus - already mostly priced in', type: 'priced', contribution: 12 },
  { id: 'kalshi',     name: 'Kalshi',          category: 'market',    signal: 'Contracts confirm Polymarket direction', type: 'priced', contribution: 8 },
  { id: 'metaculus',  name: 'Metaculus',       category: 'community', signal: 'Community forecasters lean positive', type: 'mixed', contribution: 6 },
];

const MARKETPLACE: MarketSource[] = [
  { id: 'reuters',    name: 'Reuters',              desc: 'Global financial newswire',           category: 'news',      added: true },
  { id: 'bloomberg',  name: 'Bloomberg',            desc: 'Markets and finance coverage',        category: 'news',      added: true },
  { id: 'ft',         name: 'Financial Times',      desc: 'Global business press',               category: 'news',      added: true },
  { id: 'wsj',        name: 'Wall Street Journal',  desc: 'US business and financial news',      category: 'news',      added: false },
  { id: 'economist',  name: 'The Economist',        desc: 'Long-form economic analysis',         category: 'news',      added: false },
  { id: 'politico',   name: 'Politico',             desc: 'Policy and political coverage',       category: 'news',      added: false },
  { id: 'reddit',     name: 'Reddit',               desc: 'r/economics, r/investing threads',    category: 'social',    added: true },
  { id: 'twitter',    name: 'Twitter/X',            desc: 'Real-time sentiment and discussion',  category: 'social',    added: true },
  { id: 'linkedin',   name: 'LinkedIn',             desc: 'Professional network signals',        category: 'social',    added: false },
  { id: 'hn',         name: 'Hacker News',          desc: 'Tech-adjacent community discussion',  category: 'social',    added: false },
  { id: 'discord',    name: 'Discord communities',  desc: 'Crypto and prediction market servers', category: 'social',   added: false },
  { id: 'substack',   name: 'Substack newsletters', desc: 'Expert analyst newsletters',          category: 'social',    added: false },
  { id: 'polymarket', name: 'Polymarket',           desc: 'Largest prediction market',           category: 'market',    added: true },
  { id: 'kalshi',     name: 'Kalshi',               desc: 'Regulated prediction contracts',      category: 'market',    added: true },
  { id: 'manifold',   name: 'Manifold Markets',     desc: 'Play-money forecasting',              category: 'market',    added: false },
  { id: 'futuur',     name: 'Futuur',               desc: 'Global prediction marketplace',       category: 'market',    added: false },
  { id: 'metaculus',  name: 'Metaculus',            desc: 'Expert forecasting community',        category: 'community', added: true },
  { id: 'gjopen',     name: 'Good Judgment Open',   desc: 'Superforecaster community',           category: 'community', added: false },
  { id: 'cbo',        name: 'CBO Reports',          desc: 'Congressional Budget Office data',    category: 'community', added: false },
  { id: 'fred',       name: 'Fed Economic Data',    desc: 'Federal Reserve economic datasets',   category: 'community', added: false },
];

const CAT_COLORS: Record<CatType, string> = {
  news: S.blue, social: S.purple, market: S.green, community: S.amber,
};
const CAT_ICONS: Record<CatType, string> = {
  news: 'N', social: 'S', market: 'M', community: 'C',
};

function SigPill({ type }: { type: SigType }) {
  const m = {
    strong:  { bg: 'rgba(46,204,138,0.12)',  color: S.green,  label: 'Strong' },
    mixed:   { bg: 'rgba(245,166,35,0.12)',  color: S.amber,  label: 'Mixed' },
    contrary:{ bg: 'rgba(239,79,106,0.12)',  color: S.red,    label: 'Contrary' },
    priced:  { bg: 'rgba(77,157,224,0.12)',  color: S.blue,   label: 'Priced in' },
  }[type];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:m.bg, color:m.color }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:m.color, display:'inline-block' }}></span>
      {m.label}
    </span>
  );
}

export default function SourcesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const market = searchParams.get('market') || '';

  const [active, setActive]         = useState<ActiveSource[]>(INITIAL_ACTIVE);
  const [market_srcs, setMktSrcs]   = useState<MarketSource[]>(MARKETPLACE);
  const [weights, setWeights]       = useState({ news: 35, social: 40, market: 25 });
  const [filter, setFilter]         = useState<CatType | 'all'>('all');
  const [search, setSearch]         = useState('');
  const [aiPct, setAiPct]           = useState(97);
  const [adding, setAdding]         = useState<Record<string,boolean>>({});
  const [showCustom, setShowCustom] = useState(false);
  const [customUrl, setCustomUrl]   = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [toast, setToast]           = useState('');

  const marketPct = 95;
  const edge      = aiPct - marketPct;
  const edgeColor = edge > 0 ? S.green : S.red;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const updateVerdict = useCallback((delta: number) => {
    setAiPct(prev => Math.min(99, Math.max(50, prev + delta)));
  }, []);

  const removeSource = (id: string) => {
    setActive(prev => prev.filter(s => s.id !== id));
    setMktSrcs(prev => prev.map(s => s.id === id ? { ...s, added: false } : s));
    showToast(id.charAt(0).toUpperCase() + id.slice(1) + ' removed from analysis');
    updateVerdict(-2);
  };

  const addFromMarket = (src: MarketSource) => {
    if (src.added) return;
    setAdding(prev => ({ ...prev, [src.id]: true }));
    setTimeout(() => {
      setMktSrcs(prev => prev.map(s => s.id === src.id ? { ...s, added: true } : s));
      setAdding(prev => ({ ...prev, [src.id]: false }));
      const newActive: ActiveSource = {
        id: src.id, name: src.name, category: src.category,
        signal: src.name + ' added - scanning for signals',
        type: 'mixed', contribution: Math.floor(Math.random() * 8) + 3,
      };
      setActive(prev => [...prev, newActive]);
      showToast(src.name + ' added - scanning for signals');
      updateVerdict(1);
    }, 800);
  };

  const handleWeightChange = (key: string, val: number) => {
    const rem = 100 - val;
    const others = Object.keys(weights).filter(k => k !== key) as Array<keyof typeof weights>;
    const ot = others.reduce((s, k) => s + weights[k], 0);
    const nw = { ...weights, [key]: val };
    if (ot > 0) others.forEach(k => { nw[k] = Math.round((weights[k] / ot) * rem); });
    const tot = Object.values(nw).reduce((s, v) => s + v, 0);
    if (tot !== 100) nw[others[0]] += (100 - tot);
    setWeights(nw as typeof weights);
    updateVerdict(Math.floor((val - weights[key as keyof typeof weights]) / 20));
  };

  const filteredActive = active.filter(s => {
    const matchCat  = filter === 'all' || s.category === filter;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.signal.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredMarket = market_srcs.filter(s => {
    const matchCat  = filter === 'all' || s.category === filter;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const cats: { key: CatType; label: string }[] = [
    { key: 'news', label: 'News' },
    { key: 'social', label: 'Social' },
    { key: 'market', label: 'Market' },
    { key: 'community', label: 'Community' },
  ];

  const grouped = cats.map(cat => ({
    ...cat,
    items: filteredMarket.filter(s => s.category === cat.key),
  })).filter(g => g.items.length > 0);

  const topSignals = [...active].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 5);

  return (
    <div style={{ background: S.bg, minHeight: '100vh', color: S.text, fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid ' + S.border, padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, color: S.text2, cursor: 'pointer', fontSize: 13, fontWeight: 500, border: 'none', background: 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6"/></svg>
          Back to analysis
        </button>
        <div style={{ fontSize: 15, fontWeight: 600 }}>PlayPicks AI</div>
        <div style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(124,111,247,0.12)', color: S.purpleL, border: '1px solid rgba(124,111,247,0.2)' }}>
          {active.length} sources active
        </div>
      </nav>

      <div style={{ paddingTop: 52 }}>
        <div style={{ padding: '16px 24px 14px', background: S.bg2, borderBottom: '1px solid ' + S.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 3 }}>Sources & Intelligence</div>
            <div style={{ fontSize: 13, color: S.text2 }}>Choose which sources feed your AI analysis. Add from the marketplace or paste any URL.</div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: S.purpleL }}>{aiPct}%</div>
              <div style={{ fontSize: 10, color: S.text3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current verdict</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: edgeColor }}>{edge > 0 ? '+' : ''}{edge}%</div>
              <div style={{ fontSize: 10, color: S.text3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edge</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 24px', background: S.bg2, borderBottom: '1px solid ' + S.border, display: 'flex', gap: 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: S.bg3, border: '1px solid ' + S.border2, borderRadius: 8, padding: '6px 12px', flex: 1, maxWidth: 300 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: S.text3, flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources..."
              style={{ background: 'none', border: 'none', color: S.text, fontSize: 13, outline: 'none', width: '100%', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {[{ key: 'all', label: 'All' }, ...cats].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as CatType | 'all')}
                style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid ' + (filter === f.key ? 'transparent' : S.border2), background: filter === f.key ? S.purple : 'none', color: filter === f.key ? 'white' : S.text2, transition: 'all 0.15s' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 'calc(100vh - 130px)' }}>

          <div style={{ padding: '24px 24px 60px', borderRight: '1px solid ' + S.border, overflowY: 'auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.8px', color: S.text3, marginBottom: 14 }}>
              Active sources
              <span style={{ background: S.bg4, color: S.text3, padding: '2px 7px', borderRadius: 10, fontSize: 10 }}>{active.length}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: S.text3, fontWeight: 400, textTransform: 'none' as const, cursor: 'pointer' }}>Sorted by contribution</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 32 }}>
              {filteredActive.map(src => (
                <div key={src.id} style={{ background: S.bg3, border: '1px solid ' + S.border, borderRadius: 12, padding: 14, position: 'relative', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: CAT_COLORS[src.category] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: CAT_COLORS[src.category] }}>
                      {CAT_ICONS[src.category]}
                    </div>
                    <button onClick={() => removeSource(src.id)}
                      style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,79,106,0.1)', border: 'none', cursor: 'pointer', fontSize: 10, color: S.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      x
                    </button>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{src.name}</div>
                  <div style={{ fontSize: 11, color: S.text3, marginBottom: 8, lineHeight: 1.4 }}>{src.signal}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <SigPill type={src.type} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: src.contribution >= 0 ? S.green : S.red }}>{src.contribution >= 0 ? '+' : ''}{src.contribution}%</span>
                  </div>
                </div>
              ))}

              <div onClick={() => setShowCustom(true)}
                style={{ border: '1px dashed ' + S.border2, borderRadius: 12, padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', minHeight: 120 }}
                onMouseEnter={e => { (e.currentTarget.style.borderColor = S.purple); (e.currentTarget.style.background = 'rgba(124,111,247,0.05)'); }}
                onMouseLeave={e => { (e.currentTarget.style.borderColor = S.border2); (e.currentTarget.style.background = 'none'); }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: S.bg4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: S.text3 }}>+</div>
                <div style={{ fontSize: 12, color: S.text3, textAlign: 'center', lineHeight: 1.4 }}>Add custom source<br/>Paste any URL</div>
              </div>
            </div>

            {showCustom && (
              <div style={{ background: S.bg2, border: '1px solid ' + S.border2, borderRadius: 14, padding: 20, marginBottom: 28 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Add a custom source</div>
                <div style={{ fontSize: 12, color: S.text2, marginBottom: 16, lineHeight: 1.5 }}>Paste any news URL, publication name, subreddit, or RSS feed. AI will scrape it and add signals to your analysis.</div>
                <input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://example.com/article or publication name..."
                  style={{ width: '100%', background: S.bg3, border: '1px solid ' + S.border2, borderRadius: 8, padding: '10px 14px', color: S.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' as const }} />
                <input value={customLabel} onChange={e => setCustomLabel(e.target.value)} placeholder="Optional: give it a custom label (e.g. My research)"
                  style={{ width: '100%', background: S.bg3, border: '1px solid ' + S.border2, borderRadius: 8, padding: '10px 14px', color: S.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' as const }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { if (customUrl) { showToast('Custom source added'); setShowCustom(false); setCustomUrl(''); setCustomLabel(''); updateVerdict(1); } }}
                    style={{ padding: '8px 18px', background: S.purple, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Add to analysis
                  </button>
                  <button onClick={() => setShowCustom(false)}
                    style={{ padding: '8px 18px', background: 'none', color: S.text2, border: '1px solid ' + S.border2, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.8px', color: S.text3, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Source marketplace
              <span style={{ fontSize: 10, color: S.text3, fontWeight: 400, textTransform: 'none' as const }}>{market_srcs.filter(s => !s.added).length} available to add</span>
            </div>

            {grouped.map(cat => (
              <div key={cat.key} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[cat.key] }}></div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: CAT_COLORS[cat.key] }}>
                      {cat.key === 'news' ? 'News sources' : cat.key === 'social' ? 'Social sources' : cat.key === 'market' ? 'Prediction markets' : 'Community & Research'}
                    </div>
                    <div style={{ fontSize: 11, color: S.text3 }}>
                      {cat.key === 'news' ? 'Financial and political press' : cat.key === 'social' ? 'Community discussion and sentiment' : cat.key === 'market' ? 'Live odds and contract data' : 'Forecasters, researchers, think tanks'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {cat.items.map(src => (
                    <div key={src.id} style={{ background: src.added ? 'rgba(124,111,247,0.05)' : S.bg3, border: '1px solid ' + (src.added ? 'rgba(124,111,247,0.2)' : S.border), borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: CAT_COLORS[src.category] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: CAT_COLORS[src.category], flexShrink: 0 }}>
                        {CAT_ICONS[src.category]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 1 }}>{src.name}</div>
                        <div style={{ fontSize: 10, color: S.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{src.desc}</div>
                      </div>
                      <button
                        onClick={() => src.added ? removeSource(src.id) : addFromMarket(src)}
                        disabled={adding[src.id]}
                        style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: src.added ? 'pointer' : 'pointer', border: '1px solid', flexShrink: 0, transition: 'all 0.2s',
                          background: src.added ? 'rgba(46,204,138,0.1)' : adding[src.id] ? 'rgba(124,111,247,0.1)' : 'rgba(124,111,247,0.12)',
                          color: src.added ? S.green : adding[src.id] ? S.text3 : S.purpleL,
                          borderColor: src.added ? 'rgba(46,204,138,0.2)' : adding[src.id] ? S.border : 'rgba(124,111,247,0.25)',
                        }}>
                        {src.added ? 'Added' : adding[src.id] ? 'Adding...' : '+ Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'sticky', top: 130, height: 'calc(100vh - 130px)', overflowY: 'auto', padding: '20px 20px 40px', background: S.bg2 }}>

            <div style={{ background: S.bg3, border: '1px solid ' + S.border, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.7px', color: S.text3, marginBottom: 4 }}>Source weights</div>
              <div style={{ fontSize: 11, color: S.text3, marginBottom: 16, lineHeight: 1.5 }}>Control how much each category influences the verdict. Must total 100%.</div>
              {[
                { key: 'news', label: 'News', sub: 'Mainstream financial press', color: S.blue },
                { key: 'social', label: 'Social', sub: 'Reddit, Twitter, community', color: S.purple },
                { key: 'market', label: 'Market', sub: 'Prediction market odds', color: S.green },
              ].map(w => (
                <div key={w.key} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: w.color }}></div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{w.label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: w.color }}>{weights[w.key as keyof typeof weights]}%</span>
                  </div>
                  <div style={{ fontSize: 10, color: S.text3, marginBottom: 4 }}>{w.sub}</div>
                  <input type="range" min="0" max="100" step="5"
                    value={weights[w.key as keyof typeof weights]}
                    onChange={e => handleWeightChange(w.key, parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: w.color }} />
                </div>
              ))}
              <div style={{ fontSize: 11, fontWeight: 600, color: weights.news + weights.social + weights.market === 100 ? S.green : S.red, marginBottom: 12 }}>
                Total: {weights.news + weights.social + weights.market}% {weights.news + weights.social + weights.market === 100 ? '- balanced' : '- must equal 100%'}
              </div>
              <button style={{ width: '100%', padding: '10px 0', background: S.purple, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Apply and re-analyze
              </button>
            </div>

            <div style={{ background: S.bg3, border: '1px solid ' + S.border, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.7px', color: S.text3, marginBottom: 16 }}>Live verdict preview</div>
              <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-2px', color: S.purpleL, lineHeight: 1, marginBottom: 4 }}>{aiPct}%</div>
              <div style={{ fontSize: 12, color: S.text2, marginBottom: 14 }}>AI confidence</div>
              {[
                { key: 'Market', val: marketPct + '%', color: S.text2 },
                { key: 'AI thinks', val: aiPct + '%', color: S.purpleL },
                { key: 'Edge', val: (edge > 0 ? '+' : '') + edge + '%', color: edgeColor },
                { key: 'Sources active', val: String(active.length), color: S.text },
              ].map(r => (
                <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid ' + S.border }}>
                  <span style={{ color: S.text2 }}>{r.key}</span>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', color: r.color }}>{r.val}</span>
                </div>
              ))}
            </div>

            <div style={{ background: S.bg3, border: '1px solid ' + S.border, borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.7px', color: S.text3, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: S.purple }}></div>
                Signal contribution
              </div>
              {topSignals.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[s.category], flexShrink: 0 }}></div>
                  <div style={{ fontSize: 11, color: S.text2, width: 64, flexShrink: 0 }}>{s.name}</div>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: 4, borderRadius: 2, background: CAT_COLORS[s.category], width: Math.min(Math.abs(s.contribution) / 25 * 100, 100) + '%' }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, width: 32, textAlign: 'right', flexShrink: 0, color: s.contribution >= 0 ? CAT_COLORS[s.category] : S.red }}>
                    {s.contribution >= 0 ? '+' : ''}{s.contribution}%
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: S.bg3, border: '1px solid ' + S.border2, borderRadius: 10, padding: '10px 20px', fontSize: 13, color: S.text, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' as const }}>
          {toast}
        </div>
      )}

    </div>
  );
}
