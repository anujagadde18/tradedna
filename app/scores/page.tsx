'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { TradePanel } from '@/components/TradePanel';
import { PlainTextAnalysis } from '@/components/PlainTextAnalysis';
import { calculateIntelligence } from '@/lib/intelligenceEngine';
import SignalConstellation from '@/components/SignalConstellation';
import ConvictionScorecard from '@/components/ConvictionScorecard';

interface TradeReadyData {
  marketTitle: string; marketUrl: string; outcomeType: string;
  marketType: 'binary' | 'categorical';
  topOutcome: { name: string; odds: number; aiConfidence: number; edge: number; tokenId?: string; };
}

const S = {
  bg: '#0a0a0b', bg2: '#111113', bg3: '#18181c', bg4: '#1f1f25',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#f0eff4', text2: '#9998a8', text3: '#5e5d6e',
  purple: '#7c6ff7', purple2: '#9d98f8',
  green: '#34d399', amber: '#fbbf24', red: '#f87171', blue: '#60a5fa',
};

type SigType = 'strong' | 'mixed' | 'contrary' | 'priced';
function SignalBadge({ type }: { type: SigType }) {
  const map = {
    strong:  { bg: 'rgba(52,211,153,0.12)',  color: S.green, dot: S.green,  label: 'Strong' },
    mixed:   { bg: 'rgba(251,191,36,0.12)',  color: S.amber, dot: S.amber,  label: 'Mixed' },
    contrary:{ bg: 'rgba(248,113,113,0.12)', color: S.red,   dot: S.red,    label: 'Contrary' },
    priced:  { bg: 'rgba(96,165,250,0.12)',  color: S.blue,  dot: S.blue,   label: 'Priced in' },
  };
  const m = map[type];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, display: 'inline-block' }}></span>
      {m.label}
    </span>
  );
}

function Sparkline({ trend }: { trend: number }) {
  const pts = [0,1,2,3,4,5,6].map(i => 14 + Math.sin(i*1.3)*4 + (trend/100)*i*4);
  const min = Math.min(...pts), max = Math.max(...pts);
  const norm = pts.map(p => max===min ? 13 : 2 + ((p-min)/(max-min))*18);
  const path = norm.map((y,i) => `${i===0?'M':'L'}${i*9},${24-y}`).join(' ');
  const color = trend > 2 ? S.green : trend < -2 ? S.red : S.text3;
  return <svg width="54" height="24" viewBox="0 0 54 24"><path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
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
  const [showSources, setShowSources]   = useState(true);
  const [showOutcomes, setShowOutcomes] = useState(false);
  const [showGuide, setShowGuide]       = useState(false);
  const [showWeights, setShowWeights]   = useState(true);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [customUrl, setCustomUrl]       = useState('');

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
  const convColor = isHigh ? S.green : isMed ? S.amber : S.red;
  const convBg    = isHigh ? 'rgba(52,211,153,0.1)' : isMed ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)';
  const convBorder = isHigh ? 'rgba(52,211,153,0.2)' : isMed ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)';
  const convLabel = isHigh ? 'Strong opportunity' : isMed ? 'Moderate opportunity' : 'Low opportunity';
  const soWhat   = isHigh ? 'AI sees a real edge here. Market may be underpricing this outcome. Consider a position.' :
                   isMed  ? 'AI slightly favors this outcome, but signals are mixed. Market has partially priced this in. Only bet if you have a specific view.' :
                            'AI agrees with the market. No meaningful edge detected. Not a strong betting opportunity right now.';
  const betAmt   = isHigh ? '$75 - $200' : isMed ? '$25 - $75' : 'Skip or small bet';

  const sigNews   = Math.round(mainAI * (weights.news/100));
  const sigSocial = Math.round(mainAI * (weights.social/100));
  const sigMarket = Math.round(mainAI * (weights.technical/100));

  const eventTitle = (() => {
    const idx = event.indexOf('polymarket.com/event/');
    if (idx >= 0) {
      const slug = event.slice(idx + 21).split('/')[0].split('?')[0];
      return slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return event.length > 120 ? event.slice(0, 120) : event;
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

  const sources = {
    news: [
      { name: 'Reuters', signal: 'Reporting mixed economic signals', type: 'mixed' as SigType },
      { name: 'Financial Times', signal: 'Analysis points to uncertainty', type: 'mixed' as SigType },
      { name: 'Bloomberg', signal: 'Market watchers cautiously optimistic', type: 'strong' as SigType },
      { name: 'AP News', signal: 'Coverage available on this topic', type: 'strong' as SigType },
    ],
    social: [
      { name: 'r/politics', signal: 'Debate ongoing, no clear consensus', type: 'mixed' as SigType },
      { name: 'r/economics', signal: 'Expert discussion mixed signals', type: 'mixed' as SigType },
      { name: 'Twitter/X', signal: 'High engagement on this topic', type: 'strong' as SigType },
    ],
    market: [
      { name: 'Polymarket', signal: 'Related markets active', type: 'priced' as SigType },
      { name: 'Kalshi', signal: 'Prediction contracts available', type: 'priced' as SigType },
      { name: 'Metaculus', signal: 'Community forecasts published', type: 'strong' as SigType },
    ],
  };

  const navStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid ' + S.border, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

  const RightPanel = () => (
    <ConvictionScorecard
      aiPct={mainAI}
      marketPct={mainOdds}
      onTrade={() => {}}
    />
  );



  const sectionHd = (title: string, count?: string, right?: React.ReactNode) => (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.8px', color: S.text3, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      {title}
      {count && <span style={{ background: S.bg4, color: S.text3, padding: '2px 7px', borderRadius: 10, fontSize: 10 }}>{count}</span>}
      {right}
    </div>
  );

  return (
    <div style={{ background: S.bg, minHeight: '100vh', color: S.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <nav style={navStyle}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: S.text2, cursor: 'pointer', fontSize: 13, fontWeight: 500, border: 'none', background: 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px' }}>PlayPicks AI</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/journal')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: S.text2, cursor: 'pointer', border: 'none', background: 'none' }}>Journal</button>
          <button onClick={() => router.push('/profile')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: S.text2, cursor: 'pointer', border: 'none', background: 'none' }}>View Profile</button>
        </div>
      </nav>

      {!isPlain && mainOdds > 0 && (
        <div style={{ position: 'sticky', top: 56, zIndex: 50, background: S.bg2, borderBottom: '1px solid ' + S.border, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: S.text }}>{mainName || eventTitle.slice(0,30)}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: S.text }}>{mainOdds}%</span>
            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: convBg, color: convColor }}>{isHigh ? 'High' : isMed ? 'Medium' : 'Low'}</span>
          </div>
        </div>
      )}

      <div style={{ paddingTop: 56 }}>
        {isPlain ? (
          <div style={{ padding: '32px 32px 80px' }}>
            <PlainTextAnalysis question={event} confidence={intel?.confidence || 50} direction={intel?.direction || 'YES'} weights={weights} activeSources={[]} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', minHeight: 'calc(100vh - 56px)' }}>
            <div style={{ padding: '32px 32px 80px', borderRight: '1px solid ' + S.border, overflowY: 'auto' }}>

              <div style={{ background: S.bg3, border: '1px solid ' + S.border, borderRadius: 12, padding: '18px 22px', marginBottom: 28 }}>
                <div style={{ fontSize: 11, color: S.text3, textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: 6 }}>Analyzing prediction market</div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.2px', lineHeight: 1.4, marginBottom: 4 }}>{eventTitle}</div>
                <div style={{ fontSize: 12, color: S.text3 }}>Source: Polymarket</div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
                <button style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: S.purple, color: 'white', border: 'none' }} onClick={() => setShowWeights(!showWeights)}>Tune AI sources</button>
                <button style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid ' + S.border2, background: S.bg3, color: S.text2 }} onClick={runAnalysis}>Refresh results</button>
              </div>

              <PolymarketComparison
                userQuestion={event} aiPrediction={intel?.confidence || 0}
                onDataReceived={(o, t, outs, ot) => { setOdds(o); if (t) setMtype(t); if (outs) setOutcomes(outs); setHasUrl(true); }}
                onTradeReady={(d: TradeReadyData) => setTradeData(d)}
              />
              <div style={{ marginTop: 24 }}>
                <SignalConstellation
                  aiPct={mainAI}
                  marketPct={mainOdds}
                  question={eventTitle}
                />
              </div>

              <div style={{ height: 1, background: S.border, margin: '28px 0' }} />

              <div style={{ marginBottom: 28 }}>
                {sectionHd('All outcomes', outcomes.length > 0 ? outcomes.length + ' total' : undefined,
                  <button onClick={() => setShowOutcomes(!showOutcomes)} style={{ marginLeft: 'auto', fontSize: 11, color: S.text3, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 0, textTransform: 'none' as const, fontWeight: 400 }}>{showOutcomes ? 'Hide' : 'Show'}</button>
                )}
                {showOutcomes && outcomes.map((o: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid ' + S.border }}>
                    <span style={{ fontSize: 13, color: i===0 ? S.text : S.text2, fontWeight: i===0 ? 600 : 400, flex: 1 }}>{o.name}</span>
                    {o.weekChange !== undefined && o.weekChange !== 0 && <Sparkline trend={o.weekChange} />}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: i===0 ? 18 : 13, fontWeight: 700, color: i===0 ? S.text : S.text3 }}>{o.odds}%</div>
                      {o.weekChange !== undefined && o.weekChange !== 0 && (
                        <div style={{ fontSize: 10, color: o.weekChange > 0 ? S.green : S.red }}>{o.weekChange > 0 ? '+' : ''}{o.weekChange}%</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: S.border, margin: '28px 0' }} />

              <div style={{ marginBottom: 28 }}>
                {sectionHd('Sources used in this analysis', '10 active',
                  <button onClick={() => setShowSources(!showSources)} style={{ marginLeft: 'auto', fontSize: 11, color: S.text3, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 0, textTransform: 'none' as const, fontWeight: 400 }}>{showSources ? 'Hide' : 'Show'}</button>
                )}
                {showSources && (
                  <>
                    {[
                      { label: 'News sources', key: 'news' as const, color: S.blue },
                      { label: 'Social sources', key: 'social' as const, color: S.purple2 },
                      { label: 'Market sources', key: 'market' as const, color: S.green },
                    ].map(cat => (
                      <div key={cat.key} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ color: cat.color }}>{cat.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 500, background: S.bg4, padding: '2px 8px', borderRadius: 6, color: cat.color }}>{weights[cat.key === 'market' ? 'technical' : cat.key]}% weight</span>
                        </div>
                        {sources[cat.key].map(s => (
                          <div key={s.name} style={{ background: S.bg3, border: '1px solid ' + S.border, borderRadius: 10, padding: '12px 16px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{s.name}</div>
                              <div style={{ fontSize: 12, color: S.text3 }}>{s.signal}</div>
                            </div>
                            <SignalBadge type={s.type} />
                          </div>
                        ))}
                      </div>
                    ))}
                    <div onClick={() => setAddSourceOpen(!addSourceOpen)}
                      style={{ border: '1px dashed ' + S.border2, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4, transition: 'all 0.2s' }}>
                      <div style={{ width: 24, height: 24, background: S.bg4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>+</div>
                      <div style={{ fontSize: 13, color: S.text3 }}>Add a custom source - paste any URL or publication name</div>
                    </div>
                    {addSourceOpen && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://... or publication name"
                          style={{ flex: 1, background: S.bg3, border: '1px solid ' + S.border2, borderRadius: 8, padding: '8px 12px', color: S.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                        <button style={{ background: S.purple, color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ height: 1, background: S.border, margin: '28px 0' }} />

              <div style={{ marginBottom: 28 }}>
                {sectionHd('Tune your analysis')}
                <p style={{ fontSize: 13, color: S.text2, marginBottom: 20, lineHeight: 1.6 }}>
                  Adjust how much weight each signal type gets. Move the sliders and watch your verdict update live in the right panel.
                </p>
                {[
                  { key: 'news', label: 'News sources', desc: 'Confidence in mainstream news coverage' },
                  { key: 'social', label: 'Social signals', desc: 'Weight given to Reddit, Twitter discussion' },
                  { key: 'technical', label: 'Market probability', desc: 'Weight given to Polymarket / Kalshi odds' },
                ].map(s => (
                  <div key={s.key} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: S.text }}>{s.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace', color: S.purple2 }}>{weights[s.key as keyof typeof weights]}%</span>
                    </div>
                    <div style={{ fontSize: 12, color: S.text3, marginBottom: 8 }}>{s.desc}</div>
                    <input type="range" min="0" max="100" step="5"
                      value={weights[s.key as keyof typeof weights]}
                      onChange={e => handleWeight(s.key, parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: S.purple }} />
                  </div>
                ))}
                <div style={{ fontSize: 12, color: weights.news + weights.social + weights.technical === 100 ? S.green : S.red, fontWeight: 600 }}>
                  Total: {weights.news + weights.social + weights.technical}% {weights.news + weights.social + weights.technical === 100 ? '- weights balanced' : '- must equal 100%'}
                </div>
              </div>

              <div style={{ height: 1, background: S.border, margin: '28px 0' }} />

              {related.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  {sectionHd('People are betting on this')}
                  <p style={{ fontSize: 13, color: S.text2, marginBottom: 16 }}>Related Polymarket markets with live odds</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    {related.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid ' + S.border }}>
                        <td style={{ padding: '12px 0' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: S.text, marginBottom: 2 }}>{m.title}</div>
                          <div style={{ fontSize: 11, color: S.text3 }}>{fmtVol(m.volume)} volume</div>
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>
                          <button onClick={() => router.push('/scores?event=' + encodeURIComponent(m.url))}
                            style={{ padding: '5px 14px', background: 'rgba(124,111,247,0.1)', border: '1px solid rgba(124,111,247,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: S.purple2, cursor: 'pointer' }}>
                            Analyze
                          </button>
                        </td>
                      </tr>
                    ))}
                  </table>
                  <div style={{ marginTop: 12, fontSize: 12, color: S.text3, cursor: 'pointer' }}>Browse all markets on Polymarket</div>
                </div>
              )}

              <div style={{ height: 1, background: S.border, margin: '28px 0' }} />

              <div>
                {sectionHd('Want to bet on this?')}
                <p style={{ fontSize: 13, color: S.text2, marginBottom: 20 }}>Polymarket lets you put real money on predictions like this one. Here is how to get started:</p>
                {[
                  { n: 1, t: 'Create a Polymarket account', d: 'Go to polymarket.com - sign up with just your email. Takes 2 minutes.', link: 'https://polymarket.com', cta: 'Go to Polymarket' },
                  { n: 2, t: 'Add USDC to your account', d: 'Deposit as little as $5. Use a credit card or crypto wallet.' },
                  { n: 3, t: 'Find your market and place your bet', d: 'Search for your topic on Polymarket, paste the URL here for AI analysis first.' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, background: 'rgba(124,111,247,0.15)', border: '1px solid rgba(124,111,247,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: S.purple, flexShrink: 0 }}>{s.n}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.t}</div>
                      <div style={{ fontSize: 13, color: S.text2, lineHeight: 1.5 }}>{s.d}</div>
                      {s.link && <div style={{ fontSize: 13, color: S.purple2, marginTop: 4, cursor: 'pointer' }}>{s.cta}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'sticky', top: 56, height: 'calc(100vh - 56px)', overflowY: 'auto', padding: '32px 28px', background: S.bg2 }}>
              <RightPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0b' }} />}>
      <ScoresPageContent />
    </Suspense>
  );
}
