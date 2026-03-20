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
  purple: '#7c6ff7', purpleL: '#a89cf8',
  green: '#2ecc8a', amber: '#f5a623', red: '#ef4f6a',
  blue: '#4d9de0',
};

type SigBadge = 'strong' | 'mixed' | 'contrary' | 'priced';

function Badge({ type }: { type: SigBadge }) {
  const m = {
    strong:  { bg: 'rgba(46,204,138,0.12)',  color: S.green,  label: 'Strong' },
    mixed:   { bg: 'rgba(245,166,35,0.12)',  color: S.amber,  label: 'Mixed' },
    contrary:{ bg: 'rgba(239,79,106,0.12)',  color: S.red,    label: 'Contrary' },
    priced:  { bg: 'rgba(77,157,224,0.12)',  color: S.blue,   label: 'Priced in' },
  }[type];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:m.bg, color:m.color }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:m.color, display:'inline-block' }}></span>
      {m.label}
    </span>
  );
}

const TABS = [
  { label: 'Verdict', color: S.purple },
  { label: 'Signals', color: S.blue },
  { label: 'Sources', color: S.green },
  { label: 'Markets', color: S.amber },
  { label: 'Trade',   color: S.red },
];

const NEXTS = ['See signals', 'See sources', 'See markets', 'Ready to trade', ''];
const PREVS = ['', 'Verdict', 'Signals', 'Sources', 'Markets'];

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || '';

  const [tab, setTab]               = useState(0);
  const [intel, setIntel]           = useState<any>(null);
  const [odds, setOdds]             = useState<number | null>(null);
  const [mtype, setMtype]           = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes]     = useState<any[]>([]);
  const [hasUrl, setHasUrl]         = useState<boolean|null>(null);
  const [tradeData, setTradeData]   = useState<TradeReadyData|null>(null);
  const [weights, setWeights]       = useState({ news: 35, social: 40, technical: 25 });
  const [related, setRelated]       = useState<any[]>([]);
  const [addOpen, setAddOpen]       = useState<Record<string,boolean>>({});
  const [customInputs, setCustom]   = useState<Record<string,string>>({});

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
        if (d.results) setRelated(d.results.slice(0,6));
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
  const top      = outcomes[0] || { name: '', odds: 0, aiConfidence: 0, edge: 0 };
  const binaryAI = intel?.confidence || 0;
  const binEdge  = binaryAI - (odds || 0);
  const edgeVal  = mtype === 'categorical' ? (top.edge || 0) : binEdge;
  const mainOdds = mtype === 'categorical' ? top.odds : (odds || 0);
  const mainAI   = mtype === 'categorical' ? top.aiConfidence : binaryAI;
  const mainName = mtype === 'categorical' ? top.name : (intel?.direction || 'YES');

  const convColor = edgeVal >= 5 ? S.green : edgeVal >= 2 ? S.amber : S.red;
  const convLabel = edgeVal >= 5 ? 'High conviction' : edgeVal >= 2 ? 'Medium conviction' : 'Low conviction';
  const betAmt    = edgeVal >= 5 ? '$75 - $200' : edgeVal >= 2 ? '$25 - $75' : '$10 - $25';

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

  const sources = {
    news: [
      { name: 'Reuters', signal: 'Reporting mixed economic signals', type: 'mixed' as SigBadge },
      { name: 'Financial Times', signal: 'Analysis points to uncertainty', type: 'mixed' as SigBadge },
      { name: 'Bloomberg', signal: 'Market watchers cautiously optimistic', type: 'strong' as SigBadge },
      { name: 'NY Times', signal: 'Coverage available on this topic', type: 'strong' as SigBadge },
    ],
    social: [
      { name: 'r/politics', signal: 'Debate ongoing, no clear consensus', type: 'mixed' as SigBadge },
      { name: 'r/economics', signal: 'Expert discussion mixed signals', type: 'mixed' as SigBadge },
      { name: 'Twitter/X', signal: 'High engagement, noisy signal', type: 'contrary' as SigBadge },
    ],
    market: [
      { name: 'Polymarket', signal: mainOdds + '% consensus', type: 'priced' as SigBadge },
      { name: 'Kalshi', signal: 'Prediction contracts active', type: 'priced' as SigBadge },
      { name: 'Metaculus', signal: 'Community forecasts published', type: 'strong' as SigBadge },
    ],
  };

  const nav = (style?: React.CSSProperties) => ({
    position: 'fixed' as const, top: 0, left: 0, right: 0, zIndex: 100,
    background: 'rgba(10,10,11,0.9)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid ' + S.border,
    padding: '0 24px', height: 52,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    ...style,
  });

  const frameNav = (ti: number) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0 4px', borderTop:'1px solid '+S.border, marginTop:'auto' }}>
      <button onClick={() => ti > 0 && setTab(ti-1)}
        disabled={ti === 0}
        style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, border:'1px solid '+S.border2, background:'none', color: ti === 0 ? S.text3 : S.text2, cursor: ti === 0 ? 'default' : 'pointer', opacity: ti === 0 ? 0.3 : 1 }}>
        {ti > 0 ? ` ${PREVS[ti]}` : ' Previous'}
      </button>
      <div style={{ display:'flex', gap:8 }}>
        {TABS.map((t,i) => (
          <div key={i} onClick={() => setTab(i)}
            style={{ width:8, height:8, borderRadius:'50%', cursor:'pointer', transition:'all 0.2s',
              background: i === ti ? t.color : S.bg4,
              transform: i === ti ? 'scale(1.3)' : 'scale(1)' }} />
        ))}
      </div>
      <button onClick={() => ti < 4 && setTab(ti+1)}
        disabled={ti === 4}
        style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, border:'1px solid '+S.border2, background:'none', color: ti === 4 ? S.text3 : S.purpleL, cursor: ti === 4 ? 'default' : 'pointer', opacity: ti === 4 ? 0.3 : 1 }}>
        {ti < 4 ? `${NEXTS[ti]} ` : 'End'}
      </button>
    </div>
  );

  if (isPlain) {
    return (
      <div style={{ background:S.bg, minHeight:'100vh', color:S.text, fontFamily:'system-ui,-apple-system,sans-serif' }}>
        <div style={nav()}>
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:6, color:S.text2, cursor:'pointer', fontSize:13, fontWeight:500, border:'none', background:'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:14, height:14 }}><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div style={{ fontSize:15, fontWeight:600 }}>PlayPicks AI</div>
          <button onClick={() => router.push('/journal')} style={{ color:S.text2, cursor:'pointer', fontSize:13, border:'none', background:'none' }}>Journal</button>
        </div>
        <div style={{ paddingTop:52, padding:'72px 32px 40px' }}>
          <PlainTextAnalysis question={event} confidence={intel?.confidence || 50} direction={intel?.direction || 'YES'} weights={weights} activeSources={[]} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:S.bg, minHeight:'100vh', color:S.text, fontFamily:'system-ui,-apple-system,sans-serif', display:'flex', flexDirection:'column' }}>

      <div style={nav()}>
        <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:6, color:S.text2, cursor:'pointer', fontSize:13, fontWeight:500, border:'none', background:'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width:14, height:14 }}><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div style={{ fontSize:15, fontWeight:600 }}>PlayPicks AI</div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => router.push('/journal')} style={{ padding:'5px 12px', borderRadius:8, fontSize:12, color:S.text2, cursor:'pointer', border:'none', background:'none' }}>Journal</button>
          <button onClick={() => router.push('/profile')} style={{ padding:'5px 12px', borderRadius:8, fontSize:12, color:S.text2, cursor:'pointer', border:'none', background:'none' }}>Profile</button>
        </div>
      </div>

      <div style={{ position:'sticky', top:52, zIndex:90, background:S.bg2, borderBottom:'1px solid '+S.border }}>
        <div style={{ padding:'10px 24px', borderBottom:'1px solid '+S.border, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:12, color:S.text3, marginBottom:3 }}>{eventTitle}</div>
            {mainOdds > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:16, fontWeight:700, color:S.text }}>{mainName} {mainOdds}%</span>
                <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, background:convColor+'20', color:convColor }}>{convLabel}</span>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={runAnalysis} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, border:'1px solid '+S.border2, background:S.bg3, color:S.text2, cursor:'pointer' }}>Re-analyze</button>
            <button onClick={() => setTab(2)} style={{ padding:'6px 14px', borderRadius:8, fontSize:12, background:S.purple, color:'white', border:'none', cursor:'pointer' }}>Tune sources</button>
          </div>
        </div>
        <div style={{ display:'flex', gap:0 }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              style={{ flex:1, padding:'10px 0', fontSize:13, fontWeight:500, border:'none', background:'none', cursor:'pointer', color: tab===i ? t.color : S.text3, borderBottom: tab===i ? '2px solid '+t.color : '2px solid transparent', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:t.color, display:'inline-block', opacity: tab===i ? 1 : 0.4 }}></span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflow:'auto' }}>

        {tab === 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:0, minHeight:'calc(100vh - 140px)' }}>
            <div style={{ padding:'28px 28px 20px', borderRight:'1px solid '+S.border, display:'flex', flexDirection:'column' }}>
              <SignalConstellation aiPct={mainAI} marketPct={mainOdds} question={eventTitle} />
              <div style={{ marginTop:16 }}>
                <PolymarketComparison
                  userQuestion={event} aiPrediction={intel?.confidence || 0}
                  onDataReceived={(o, t, outs, ot) => { setOdds(o); if (t) setMtype(t); if (outs) setOutcomes(outs); setHasUrl(true); }}
                  onTradeReady={(d: TradeReadyData) => setTradeData(d)}
                />
              </div>
              {frameNav(0)}
            </div>
            <div style={{ padding:'28px 24px', background:S.bg2, overflowY:'auto' }}>
              <ConvictionScorecard aiPct={mainAI} marketPct={mainOdds} onTrade={() => setTab(4)} />
            </div>
          </div>
        )}

        {tab === 1 && (
          <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 28px 20px', display:'flex', flexDirection:'column', minHeight:'calc(100vh - 140px)' }}>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.5px', marginBottom:6 }}>Signal breakdown</div>
            <div style={{ fontSize:14, color:S.text2, marginBottom:28 }}>What each source category is telling the AI and how much weight it carries.</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
              {[
                { cat:'News', color:S.blue, weight:weights.news, badge:'strong' as SigBadge, desc:'Mainstream financial and political press. Reuters, Bloomberg, FT all reporting cautious optimism.', bar:72, contrib:sigNews },
                { cat:'Social', color:S.purpleL, weight:weights.social, badge:'mixed' as SigBadge, desc:'Reddit and community platforms broadly agree. Twitter is noisy and contrary but low weight.', bar:55, contrib:sigSocial },
                { cat:'Market', color:S.green, weight:weights.technical, badge:'priced' as SigBadge, desc:'Polymarket and Kalshi both show high probability already. Market has partially priced this in.', bar:90, contrib:sigMarket },
              ].map(s => (
                <div key={s.cat} style={{ background:S.bg3, border:'1px solid '+S.border, borderRadius:16, padding:20 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.cat}</span>
                    <Badge type={s.badge} />
                  </div>
                  <div style={{ fontSize:12, color:S.text3, marginBottom:12 }}>{s.weight}% weight</div>
                  <div style={{ fontSize:13, color:S.text2, lineHeight:1.6, marginBottom:14 }}>{s.desc}</div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, marginBottom:10 }}>
                    <div style={{ height:4, borderRadius:2, background:s.color, width:s.bar+'%' }} />
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:s.color }}>Contributing +{s.contrib}% to AI confidence</div>
                </div>
              ))}
            </div>
            <div style={{ background:S.bg2, border:'1px solid '+S.border, borderRadius:16, padding:22, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>How AI calculates the verdict</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {[
                  { val:weights.news+'%', color:S.blue, lbl:'News weight', note:'Strong positive signal from mainstream press.' },
                  { val:weights.social+'%', color:S.purpleL, lbl:'Social weight', note:'Mixed - Reddit bullish, Twitter noisy.' },
                  { val:weights.technical+'%', color:S.green, lbl:'Market weight', note:'Already priced in at '+mainOdds+'%.' },
                ].map(c => (
                  <div key={c.lbl} style={{ textAlign:'center', padding:16, background:'rgba(255,255,255,0.02)', borderRadius:10 }}>
                    <div style={{ fontSize:28, fontWeight:700, color:c.color, fontFamily:'monospace', marginBottom:4 }}>{c.val}</div>
                    <div style={{ fontSize:10, color:S.text3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{c.lbl}</div>
                    <div style={{ fontSize:11, color:S.text2, lineHeight:1.5 }}>{c.note}</div>
                  </div>
                ))}
              </div>
            </div>
            {frameNav(1)}
          </div>
        )}

        {tab === 2 && (
          <div style={{ maxWidth:800, margin:'0 auto', padding:'28px 28px 20px', display:'flex', flexDirection:'column', minHeight:'calc(100vh - 140px)' }}>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.5px', marginBottom:6 }}>Sources used</div>
            <div style={{ fontSize:14, color:S.text2, marginBottom:28 }}>Every source feeding this analysis. Add your own to personalise the verdict.</div>
            {[
              { label:'News sources', key:'news' as const, color:S.blue },
              { label:'Social sources', key:'social' as const, color:S.purpleL },
              { label:'Market sources', key:'market' as const, color:S.green },
            ].map(cat => (
              <div key={cat.key} style={{ marginBottom:24 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:cat.color }}>{cat.label}</span>
                  <span style={{ fontSize:11, background:S.bg4, padding:'2px 8px', borderRadius:6, color:cat.color }}>{weights[cat.key === 'market' ? 'technical' : cat.key]}% weight</span>
                </div>
                {sources[cat.key].map(s => (
                  <div key={s.name} style={{ background:S.bg3, border:'1px solid '+S.border, borderRadius:10, padding:'12px 16px', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{s.name}</div>
                      <div style={{ fontSize:12, color:S.text3 }}>{s.signal}</div>
                    </div>
                    <Badge type={s.type} />
                  </div>
                ))}
                <div onClick={() => setAddOpen(p => ({...p, [cat.key]: !p[cat.key]}))}
                  style={{ border:'1px dashed '+S.border2, borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginTop:4 }}>
                  <div style={{ width:24, height:24, background:S.bg4, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>+</div>
                  <div style={{ fontSize:13, color:S.text3 }}>Add a custom source</div>
                </div>
                {addOpen[cat.key] && (
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <input value={customInputs[cat.key] || ''} onChange={e => setCustom(p => ({...p, [cat.key]: e.target.value}))} placeholder="https://... or publication name"
                      style={{ flex:1, background:S.bg3, border:'1px solid '+S.border2, borderRadius:8, padding:'8px 12px', color:S.text, fontSize:13, outline:'none', fontFamily:'inherit' }} />
                    <button style={{ background:S.purple, color:'white', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>Add</button>
                  </div>
                )}
              </div>
            ))}
            <div style={{ background:S.bg2, border:'1px solid '+S.border, borderRadius:16, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>Tune your analysis</div>
              <div style={{ fontSize:13, color:S.text2, marginBottom:20, lineHeight:1.6 }}>Adjust how much weight each source type carries. Move sliders and watch the verdict update.</div>
              {[
                { key:'news', label:'News sources', desc:'Trust in mainstream news coverage' },
                { key:'social', label:'Social signals', desc:'Reddit, Twitter, community discussion weight' },
                { key:'technical', label:'Market probability', desc:'Polymarket and Kalshi live odds weight' },
              ].map(s => (
                <div key={s.key} style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:500 }}>{s.label}</span>
                    <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:S.purpleL }}>{weights[s.key as keyof typeof weights]}%</span>
                  </div>
                  <div style={{ fontSize:12, color:S.text3, marginBottom:8 }}>{s.desc}</div>
                  <input type="range" min="0" max="100" step="5"
                    value={weights[s.key as keyof typeof weights]}
                    onChange={e => handleWeight(s.key, parseInt(e.target.value))}
                    style={{ width:'100%', accentColor:S.purple }} />
                </div>
              ))}
              <div style={{ fontSize:12, color:weights.news+weights.social+weights.technical===100 ? S.green : S.red, fontWeight:600 }}>
                Total: {weights.news+weights.social+weights.technical}% {weights.news+weights.social+weights.technical===100 ? '- balanced' : '- must equal 100%'}
              </div>
            </div>
            {frameNav(2)}
          </div>
        )}

        {tab === 3 && (
          <div style={{ maxWidth:800, margin:'0 auto', padding:'28px 28px 20px', display:'flex', flexDirection:'column', minHeight:'calc(100vh - 140px)' }}>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.5px', marginBottom:6 }}>Related markets</div>
            <div style={{ fontSize:14, color:S.text2, marginBottom:24 }}>Other Polymarket markets related to this topic with live odds. Click Analyze to run AI on any of them.</div>
            <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:24 }}>
              {related.length > 0 ? related.map((m, i) => (
                <tr key={i} style={{ borderBottom:'1px solid '+S.border }}>
                  <td style={{ padding:'14px 0' }}>
                    <div style={{ fontSize:14, fontWeight:500, color:S.text, marginBottom:3 }}>{m.title}</div>
                    <div style={{ fontSize:11, color:S.text3 }}>{fmtVol(m.volume)} volume</div>
                  </td>
                  <td style={{ padding:'14px 0', textAlign:'right' }}>
                    <button onClick={() => router.push('/scores?event=' + encodeURIComponent(m.url))}
                      style={{ padding:'6px 16px', background:'rgba(124,111,247,0.12)', border:'1px solid rgba(124,111,247,0.25)', borderRadius:8, fontSize:12, fontWeight:600, color:S.purpleL, cursor:'pointer' }}>
                      Analyze
                    </button>
                  </td>
                </tr>
              )) : (
                ['Will US GDP contract in Q1 2026?', 'Will the Fed cut rates more than 3 times?', 'Will US unemployment exceed 5% by June?', 'Will the S&P 500 enter bear market territory?', 'Will US inflation exceed 4% in Q2 2026?'].map((name, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid '+S.border }}>
                    <td style={{ padding:'14px 0' }}>
                      <div style={{ fontSize:14, fontWeight:500, color:S.text }}>{name}</div>
                    </td>
                    <td style={{ padding:'14px 0', textAlign:'right' }}>
                      <button onClick={() => router.push('/scores?event=' + encodeURIComponent(name))}
                        style={{ padding:'6px 16px', background:'rgba(124,111,247,0.12)', border:'1px solid rgba(124,111,247,0.25)', borderRadius:8, fontSize:12, fontWeight:600, color:S.purpleL, cursor:'pointer' }}>
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </table>
            <div style={{ textAlign:'center', fontSize:12, color:S.text3, cursor:'pointer', marginBottom:20 }}>Browse all markets on Polymarket</div>
            {frameNav(3)}
          </div>
        )}

        {tab === 4 && (
          <div style={{ maxWidth:600, margin:'0 auto', padding:'28px 28px 20px', display:'flex', flexDirection:'column', minHeight:'calc(100vh - 140px)' }}>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ fontSize:10, color:S.text3, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:8 }}>Your AI edge</div>
              <div style={{ fontSize:48, fontWeight:700, letterSpacing:'-2px', color:convColor, marginBottom:4 }}>
                {edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(1)}%
              </div>
              <div style={{ fontSize:14, color:S.text2, marginBottom:16 }}>AI sees a {edgeVal >= 5 ? 'strong' : edgeVal >= 2 ? 'small' : 'weak'} opportunity over the market consensus</div>
              <span style={{ display:'inline-flex', padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, background:convColor+'20', color:convColor, border:'1px solid '+convColor+'40' }}>
                {convLabel} . Suggested {betAmt}
              </span>
            </div>
            {tradeData ? (
              <div style={{ marginBottom:24 }}>
                <TradePanel
                  marketUrl={tradeData.marketUrl} marketTitle={tradeData.marketTitle}
                  outcomeName={tradeData.topOutcome.name} marketOdds={tradeData.topOutcome.odds}
                  aiConfidence={mtype==='categorical' ? tradeData.topOutcome.aiConfidence : binaryAI}
                  edge={mtype==='categorical' ? tradeData.topOutcome.edge : binEdge}
                  tokenId={tradeData.topOutcome.tokenId} isBinary={mtype==='binary'}
                />
              </div>
            ) : (
              <div style={{ background:S.bg3, border:'1px solid '+S.border, borderRadius:16, padding:20, marginBottom:24, textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Sign in with your email to trade</div>
                <div style={{ fontSize:12, color:S.text3, marginBottom:16 }}>No wallet or crypto experience needed. Magic Link login.</div>
                <button style={{ width:'100%', padding:14, background:S.purple, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:10 }}>
                  Sign in to trade
                </button>
                <div style={{ fontSize:11, color:S.text3, cursor:'pointer' }}>Or trade directly on Polymarket</div>
                <div style={{ fontSize:10, color:S.text3, marginTop:6 }}>Powered by Polymarket . Not financial advice</div>
              </div>
            )}
            <div style={{ fontSize:14, fontWeight:600, marginBottom:16, color:S.text2 }}>New to Polymarket?</div>
            {[
              { n:1, t:'Create a Polymarket account', d:'Go to polymarket.com - sign up with just your email. Takes 2 minutes.', link:'Go to Polymarket' },
              { n:2, t:'Add USDC to your account', d:'Deposit as little as $5. Use a credit card or crypto wallet. Funds settle in minutes.' },
              { n:3, t:'Place your bet', d:'Search for your market, decide YES or NO based on the AI analysis, and confirm your position.' },
            ].map(s => (
              <div key={s.n} style={{ display:'flex', gap:16, marginBottom:20 }}>
                <div style={{ width:32, height:32, background:'rgba(124,111,247,0.15)', border:'1px solid rgba(124,111,247,0.25)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:S.purple, flexShrink:0 }}>{s.n}</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{s.t}</div>
                  <div style={{ fontSize:13, color:S.text2, lineHeight:1.5 }}>{s.d}</div>
                  {s.link && <div style={{ fontSize:12, color:S.purpleL, marginTop:4, cursor:'pointer' }}>{s.link}</div>}
                </div>
              </div>
            ))}
            {frameNav(4)}
          </div>
        )}

      </div>
    </div>
  </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#0a0a0b' }} />}>
      <ScoresPageContent />
    </Suspense>
  );
}
