'use client';
import React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { TradePanel } from '@/components/TradePanel';
import { calculateIntelligence } from '@/lib/intelligenceEngine';

interface TradeReadyData {
  marketTitle: string; marketUrl: string; outcomeType: string;
  marketType: 'binary' | 'categorical';
  topOutcome: { name: string; odds: number; aiConfidence: number; edge: number; tokenId?: string; };
}

const C = {
  bg0:'#07070c', bg1:'#0d0d15', bg2:'#13131e', bg3:'#191926', bg4:'#20202e', bg5:'#28283c',
  border:'rgba(255,255,255,0.055)', border2:'rgba(255,255,255,0.09)', border3:'rgba(255,255,255,0.15)',
  t1:'#eeeeff', t2:'#9896b2', t3:'#565470', t4:'#2e2c44',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)',
  green:'#2ecc8a', greenBg:'rgba(46,204,138,0.1)',
  amber:'#f5a623', amberBg:'rgba(245,166,35,0.1)',
  red:'#ef4f6a', redBg:'rgba(239,79,106,0.1)',
  blue:'#4d9de0', blueBg:'rgba(77,157,224,0.1)',
};

type Frame = 'verdict'|'signals'|'sources'|'markets'|'trade';

const FRAMES: Frame[] = ['verdict','signals','sources','markets','trade'];
const FRAME_LABELS = ['Verdict','Signals','Sources','Related markets','Trade'];

function SigPill({ type }: { type: 'strong'|'mixed'|'priced'|'contrary' }) {
  const m = {
    strong:  { bg: C.greenBg,  color: C.green,  label: 'Strong' },
    mixed:   { bg: C.amberBg,  color: C.amber,  label: 'Mixed' },
    priced:  { bg: C.blueBg,   color: C.blue,   label: 'Priced in' },
    contrary:{ bg: C.redBg,    color: C.red,    label: 'Contrary' },
  }[type];
  return <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:8, background:m.bg, color:m.color }}>{m.label}</span>;
}

function ConstellationSVG({ aiPct, marketPct }: { aiPct: number; marketPct: number }) {
  const [tip, setTip] = useState<{name:string;body:string;color:string}|null>(null);
  const edge = aiPct - marketPct;
  const edgeStr = (edge >= 0 ? '+' : '') + edge + '%';
  const edgeColor = edge > 4 ? C.green : edge > 0 ? C.amber : C.red;
  const convLabel = edge > 6 ? 'High conviction' : edge > 2 ? 'Medium conviction' : 'Low conviction';
  const convBg = edge > 6 ? C.greenBg : edge > 2 ? C.amberBg : C.redBg;
  const convColor = edge > 6 ? C.green : edge > 2 ? C.amber : C.red;

  const NODE_POSITIONS = [
    { cx:260, cy:48  },
    { cx:354, cy:74  },
    { cx:370, cy:188 },
    { cx:150, cy:188 },
    { cx:156, cy:106 },
    { cx:352, cy:224 },
    { cx:170, cy:238 },
  ];
  const CAT_COLOR_MAP: Record<string, string> = {
    news: '#4d9de0', social: '#7c6ff7', market: '#2ecc8a', community: '#f5a623', contrary: '#ef4f6a',
  };
  function nodeRadius(name: string, contribution: number): number {
    const abs = Math.abs(contribution);
    const baseRadius = abs >= 20 ? 28 : abs >= 14 ? 24 : abs >= 8 ? 20 : 17;
    const longestWord = name.split(' ').reduce((a: string, b: string) => a.length > b.length ? a : b, '');
    const minForName = Math.ceil(longestWord.length * 5.2 / 2) + 10;
    const minForContrib = Math.ceil(5 * 5.2 / 2) + 8;
    return Math.max(baseRadius, minForName, minForContrib);
  }
  // FIX 5: Sort by contribution descending so strongest signals get inner positions
  const sortedSources = [...activeSources]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 7);
  const nodes = sortedSources.map((src, i) => {
    const pos = NODE_POSITIONS[i];
    const r = nodeRadius(src.name, src.contribution);
    const color = src.type === 'contrary' ? '#ef4f6a' : CAT_COLOR_MAP[src.category] || '#7c6ff7';
    return {
      cx: pos.cx, cy: pos.cy, r, glow: r + 7,
      color, name: src.name,
      contrib: (src.contribution >= 0 ? '+' : '') + src.contribution + '%',
      tip: src.sig,
    };
  });

  return (
    <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:16, padding:22 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:8 }}>AI Analysis</div>
          <div style={{ fontSize:52, fontWeight:700, letterSpacing:'-3px', lineHeight:1, fontFamily:'monospace', marginBottom:4 }}>{aiPct}%</div>
          <div style={{ fontSize:12, color:C.t2, marginBottom:8 }}>Fernando Mendoza - likely</div>
          <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:convBg, color:convColor, border:'1px solid '+convColor+'33' }}>{convLabel}</span>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>Edge over market</div>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:'monospace', letterSpacing:'-1px', color:edgeColor }}>{edgeStr}</div>
          <div style={{ fontSize:9, color:C.t3, marginTop:2 }}>{edge > 6 ? 'strong opportunity' : edge > 1 ? 'small opportunity' : edge > 0 ? 'small opportunity' : 'no edge'}</div>
        </div>
      </div>
      <div style={{ fontSize:9, color:C.t3, marginBottom:6 }}>Each signal orbits the verdict. Closer = stronger pull. Click any bubble to inspect.</div>
      <div style={{ position:'relative' }}>
        <svg width="100%" viewBox="0 0 520 290" style={{ display:'block' }}>
          <defs>
            <radialGradient id="rg1b" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7c6ff7" stopOpacity="0.14"/>
              <stop offset="100%" stopColor="#7c6ff7" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="260" cy="140" r="105" fill="url(#rg1b)"/>
          <circle cx="260" cy="140" r="65"  fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.5" strokeDasharray="4 5"/>
          <circle cx="260" cy="140" r="105" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.5" strokeDasharray="3 6"/>
          <circle cx="260" cy="140" r="135" fill="none" stroke="rgba(255,255,255,0.04)"  strokeWidth="0.5" strokeDasharray="2 7"/>
          <text x="328" y="138" fontSize="7.5" fill="rgba(255,255,255,0.1)" fontFamily="Inter,sans-serif">strong</text>
          <text x="368" y="138" fontSize="7.5" fill="rgba(255,255,255,0.1)" fontFamily="Inter,sans-serif">mixed</text>
          <text x="400" y="138" fontSize="7.5" fill="rgba(255,255,255,0.1)" fontFamily="Inter,sans-serif">weak</text>
          {nodes.map((n,i) => {
            const cx2 = 260, cy2 = 140;
            const angle = Math.atan2(cy2 - n.cy, cx2 - n.cx);
            const x1 = n.cx + n.r * Math.cos(angle);
            const y1 = n.cy + n.r * Math.sin(angle);
            return <line key={'l'+i} x1={x1} y1={y1} x2={cx2} y2={cy2} stroke={n.color} strokeWidth="0.8" opacity="0.28"/>;
          })}
          {nodes.map((n,i) => {
            // Split name into two lines if long
            const words = n.name.split(' ');
            const line1 = words.length > 1 ? words.slice(0, Math.ceil(words.length/2)).join(' ') : n.name;
            const line2 = words.length > 1 ? words.slice(Math.ceil(words.length/2)).join(' ') : null;
            return (
              <g key={'n'+i} style={{ cursor:'pointer' }} onClick={() => setTip({ name:n.name, body:n.tip, color:n.color })}>
                <circle cx={n.cx} cy={n.cy} r={n.glow} fill={n.color} opacity="0.08"/>
                <circle cx={n.cx} cy={n.cy} r={n.r}    fill={n.color} opacity="0.92"/>
                {line2 ? (
                  <>
                    <text x={n.cx} y={n.cy-6} textAnchor="middle" fontSize="8" fontWeight="600" fill="white" fontFamily="Inter,sans-serif">{line1}</text>
                    <text x={n.cx} y={n.cy+4} textAnchor="middle" fontSize="8" fontWeight="600" fill="white" fontFamily="Inter,sans-serif">{line2}</text>
                    <text x={n.cx} y={n.cy+14} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontFamily="Inter,sans-serif">{n.contrib}</text>
                  </>
                ) : (
                  <>
                    <text x={n.cx} y={n.cy-2} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="white" fontFamily="Inter,sans-serif">{n.name}</text>
                    <text x={n.cx} y={n.cy+9} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontFamily="Inter,sans-serif">{n.contrib}</text>
                  </>
                )}
              </g>
            );
          })}
          <circle cx="260" cy="140" r="42" fill="#7c6ff7" opacity="0.08"/>
          <circle cx="260" cy="140" r="30" fill="#7c6ff7" opacity="0.15"/>
          <circle cx="260" cy="140" r="22" fill="#7c6ff7"/>
          <text x="260" y="136" textAnchor="middle" fontSize="12" fontWeight="700" fill="white" fontFamily="Inter,sans-serif">{aiPct}%</text>
          <text x="260" y="148" textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.6)" fontFamily="Inter,sans-serif">AI verdict</text>
          <circle cx="18"  cy="268" r="4" fill="#4d9de0"/><text x="26"  y="272" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">News</text>
          <circle cx="60"  cy="268" r="4" fill="#7c6ff7"/><text x="68"  y="272" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">Social</text>
          <circle cx="102" cy="268" r="4" fill="#f5a623"/><text x="110" y="272" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">Market</text>
          <circle cx="148" cy="268" r="4" fill="#ef4f6a"/><text x="156" y="272" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">Contrary</text>
          <text x="210" y="272" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">Click any signal to inspect</text>
        </svg>
        {tip && (
          <div style={{ position:'absolute', top:8, right:0, background:C.bg3, border:'1px solid '+C.border2, borderRadius:10, padding:'10px 12px', width:190, zIndex:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:tip.color }}></div>
              <span style={{ fontSize:11, fontWeight:600, color:C.t1 }}>{tip.name}</span>
            </div>
            <div style={{ fontSize:10, color:C.t2, lineHeight:1.5 }}>{tip.body}</div>
            <div style={{ fontSize:9, color:C.t3, marginTop:6, cursor:'pointer' }} onClick={() => setTip(null)}>Dismiss</div>
          </div>
        )}
      </div>
      <div style={{ fontSize:11, color:C.t2, lineHeight:1.65, padding:'10px 12px', background:'rgba(255,255,255,0.025)', borderRadius:8, borderLeft:'2px solid '+C.border2, marginTop:10 }}>
        AI sees a {edgeStr} edge over market consensus. Reuters and Reddit are the strongest signals. Polymarket has mostly priced this in.
      </div>
      <div style={{ fontSize:11, fontWeight:700, color:C.amber, marginTop:8 }}>
        Suggested position: {edge > 6 ? '$75 - $200' : edge > 2 ? '$25 - $75' : '$10 - $25'}
      </div>
    </div>
  );
}

function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || '';

  const [frame, setFrame]           = useState<Frame>('verdict');
  const [intel, setIntel]           = useState<any>(null);
  const [odds, setOdds]             = useState<number|null>(null);
  const [mtype, setMtype]           = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes]     = useState<any[]>([]);
  const [hasUrl, setHasUrl]         = useState<boolean|null>(null);
  const [tradeData, setTradeData]   = useState<TradeReadyData|null>(null);
  const [weights, setWeights]       = useState({ news:35, social:40, market:25 });
  const [related, setRelated]       = useState<any[]>([]);
  const [srcCount, setSrcCount]     = useState(8);
  const [toast, setToast]           = useState('');
  const [addFormOpen, setAddForm]   = useState(false);
  const [customUrl, setCustomUrl]   = useState('');
  const [mktAdded, setMktAdded]     = useState<Record<string,boolean>>({});
  const [mktAdding, setMktAdding]   = useState<Record<string,boolean>>({});

  const isPolymarketUrl = event.includes('polymarket.com/event/');
  useEffect(() => { setHasUrl(isPolymarketUrl); }, []);

  useEffect(() => {
    const go = async () => {
      try {
        // Classify query topic
        const q = event.toLowerCase();
        const TOPICS: Record<string, string[]> = {
          technology: ['ai','model','company','tech','gpt','llm','software','openai','google','microsoft','apple','meta','amazon'],
          economics:  ['gdp','fed','rates','recession','inflation','unemployment','economy','treasury','dollar','market'],
          crypto:     ['bitcoin','eth','crypto','blockchain','btc','ethereum','solana','coin','defi','nft'],
          geopolitics:['war','ceasefire','election','treaty','president','minister','nato','china','russia','iran','ukraine'],
          sports:     ['nfl','nba','nhl','mlb','soccer','football','basketball','baseball','hockey','tennis','golf','ufc','chess','nascar','super bowl'],
        };
        let detectedTopic = '';
        for (const [topic, kws] of Object.entries(TOPICS)) {
          if (kws.some(kw => q.includes(kw))) { detectedTopic = topic; break; }
        }
        // Build search query from key content words
        const stop = new Set(['will','there','that','this','what','when','have','does','with','would','the','and','for','are','by','in','on','at','to','of']);
        const words = event.replace(/[?!.,]/g,'').split(' ').filter((w:string) => w.length > 2 && !stop.has(w.toLowerCase()));
        const searchQ = words.slice(0,4).join(' ');
        const r = await fetch('/api/search?q=' + encodeURIComponent(searchQ));
        const d = await r.json();
        if (d.results) {
          const sportTerms = TOPICS.sports;
          const isSports = detectedTopic === 'sports';
          const topicKws = detectedTopic ? TOPICS[detectedTopic] : [];
          const filtered = d.results.filter((m: any) => {
            const title = (m.title || '').toLowerCase();
            // Always remove sports from non-sports queries
            if (!isSports && sportTerms.some(t => title.includes(t))) return false;
            // If we have a detected topic, prefer markets matching it
            if (topicKws.length > 0) return topicKws.some(kw => title.includes(kw));
            return true;
          });
          setRelated((filtered.length > 0 ? filtered : d.results.filter((m:any) => {
            const title = (m.title||'').toLowerCase();
            return !sportTerms.some(t => title.includes(t));
          })).slice(0, 6));
        }
      } catch {}
    };
    if (event) go();
  }, [event]);

  const runAnalysis = () => {
    if (mtype === 'categorical') return;
    setIntel(calculateIntelligence(54, weights, 0, odds, event));
  };
  useEffect(() => { runAnalysis(); }, [event, odds, mtype, weights]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const isPlain  = !isPolymarketUrl;
  const top      = outcomes[0] || { name:'', odds:0, aiConfidence:0, edge:0 };
  const binaryAI = intel?.confidence || 0;
  const binEdge  = binaryAI - (odds || 0);
  const edgeVal  = mtype === 'categorical' ? (top.edge||0) : binEdge;
  const mainOdds = mtype === 'categorical' ? top.odds : (odds||0);
  const mainAI   = mtype === 'categorical' ? top.aiConfidence : binaryAI;

  const edgeColor = edgeVal >= 5 ? C.green : edgeVal >= 2 ? C.amber : C.red;
  const convLabel = edgeVal >= 5 ? 'High conviction' : edgeVal >= 2 ? 'Medium conviction' : 'Low conviction';
  const convBg    = edgeVal >= 5 ? C.greenBg : edgeVal >= 2 ? C.amberBg : C.redBg;
  const betAmt    = edgeVal >= 5 ? '$75 - $200' : edgeVal >= 2 ? '$25 - $75' : '$10 - $25';

  const eventTitle = (() => {
    const idx = event.indexOf('polymarket.com/event/');
    if (idx >= 0) {
      const slug = event.slice(idx+21).split('/')[0].split('?')[0];
      return slug.split('-').map((w:string) => w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    }
    return event.length > 80 ? event.slice(0,80) : event;
  })();

  const handleWeight = (key: string, val: number) => {
    const rem = 100 - val;
    const others = Object.keys(weights).filter(k => k !== key) as Array<keyof typeof weights>;
    const ot = others.reduce((s,k) => s+weights[k], 0);
    const nw = { ...weights, [key]: val };
    if (ot > 0) others.forEach(k => { nw[k] = Math.round((weights[k]/ot)*rem); });
    const tot = Object.values(nw).reduce((s,v) => s+v, 0);
    if (tot !== 100) nw[others[0]] += (100-tot);
    setWeights(nw as typeof weights);
  };

  const fmtVol = (v: number) => v >= 1_000_000 ? '$'+(v/1_000_000).toFixed(1)+'M' : v >= 1_000 ? '$'+(v/1_000).toFixed(0)+'K' : '$'+v;

  const goFrame = (f: Frame) => { setFrame(f); };
  const curIdx  = FRAMES.indexOf(frame);

  const NAV_ICONS: Record<Frame, React.ReactNode> = {
    verdict:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>,
    signals:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    sources:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    markets:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    trade:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  };

  const navItem = (f: Frame, _icon: string, label: string, sub: string, color: string, badge?: number) => (
    <div onClick={() => goFrame(f)}
      style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 10px', borderRadius:9, cursor:'pointer', marginBottom:2, position:'relative',
        background: frame===f ? C.bg3 : 'none',
        border: '1px solid ' + (frame===f ? C.border2 : 'transparent'),
        transition:'all .15s',
      }}>
      {frame===f && <div style={{ position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)', width:3, height:20, background:C.purple, borderRadius:'0 3px 3px 0' }}></div>}
      <div style={{ width:28, height:28, borderRadius:7, background:color, display:'flex', alignItems:'center', justifyContent:'center', color: frame===f ? C.purpleL : C.t3, flexShrink:0 }}>
        {NAV_ICONS[f]}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color: frame===f ? C.t1 : C.t2, display:'block' }}>{label}</div>
        <div style={{ fontSize:10, color:C.t3, marginTop:1, display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</div>
      </div>
      {badge !== undefined && (
        <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:6, background: frame===f ? C.purpleBg : C.bg5, color: frame===f ? C.purpleL : C.t3 }}>{badge}</span>
      )}
    </div>
  );

  const activeSources = [
    { id:'reuters',    name:'Reuters',         sig:'GDP contraction articles up 40%', type:'strong' as const, contrib:'+22%', contribColor:C.green,  bg:'rgba(77,157,224,0.12)' },
    { id:'bloomberg',  name:'Bloomberg',       sig:'Cautiously optimistic',            type:'strong' as const, contrib:'+15%', contribColor:C.green,  bg:'rgba(77,157,224,0.12)' },
    { id:'ft',         name:'Financial Times', sig:'Analysis points to uncertainty',   type:'mixed'  as const, contrib:'+11%', contribColor:C.amber,  bg:'rgba(77,157,224,0.12)' },
    { id:'reddit',     name:'Reddit',          sig:'r/economics strong consensus',     type:'strong' as const, contrib:'+18%', contribColor:C.green,  bg:'rgba(124,111,247,0.12)' },
    { id:'twitter',    name:'Twitter/X',       sig:'Noisy political commentary',       type:'contrary' as const, contrib:'-3%', contribColor:C.red,  bg:'rgba(239,79,106,0.12)' },
    { id:'polymarket', name:'Polymarket',      sig:'95% consensus - mostly priced in', type:'priced' as const, contrib:'+12%', contribColor:C.blue,  bg:'rgba(46,204,138,0.12)' },
    { id:'kalshi',     name:'Kalshi',          sig:'Confirms Polymarket direction',    type:'priced' as const, contrib:'+8%',  contribColor:C.blue,  bg:'rgba(46,204,138,0.12)' },
    { id:'metaculus',  name:'Metaculus',       sig:'Community forecasters lean pos',   type:'mixed'  as const, contrib:'+6%',  contribColor:C.amber, bg:'rgba(245,166,35,0.12)' },
  ];

  const mktSources = [
    { id:'wsj',       name:'Wall Street Journal', desc:'US finance and markets',      color:'rgba(77,157,224,0.12)' },
    { id:'economist', name:'The Economist',       desc:'Long-form global analysis',   color:'rgba(77,157,224,0.12)' },
    { id:'politico',  name:'Politico',            desc:'Policy developments',         color:'rgba(77,157,224,0.12)' },
    { id:'nyt',       name:'NY Times',            desc:'US news and analysis',        color:'rgba(77,157,224,0.12)' },
    { id:'linkedin',  name:'LinkedIn',            desc:'Professional opinion',        color:'rgba(124,111,247,0.12)' },
    { id:'substack',  name:'Substack',            desc:'Analyst newsletters',         color:'rgba(124,111,247,0.12)' },
    { id:'manifold',  name:'Manifold Markets',    desc:'Community markets',           color:'rgba(46,204,138,0.12)' },
    { id:'gjopen',    name:'Good Judgment Open',  desc:'Superforecasters',            color:'rgba(245,166,35,0.12)' },
  ];

  const aiPctForDisplay = mainAI || 97;
  const mktPctForDisplay = mainOdds || 95;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg0, color:C.t1, fontFamily:'system-ui,-apple-system,sans-serif', overflow:'hidden' }}>

      <nav style={{ height:48, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', background:C.bg0, flexShrink:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:4, color:C.t3, background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:500 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div style={{ width:1, height:16, background:C.border2 }}></div>
          <span style={{ fontSize:13, fontWeight:700, letterSpacing:'-0.3px' }}>PlayPicks AI</span>
          <div style={{ width:1, height:16, background:C.border2 }}></div>
          <span style={{ fontSize:11, color:C.t3, maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{eventTitle}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:C.bg3, border:'1px solid '+C.border2, borderRadius:8, padding:'4px 10px' }}>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:C.purpleL }}>{aiPctForDisplay}%</span>
            <div style={{ width:1, height:12, background:C.border2 }}></div>
            <span style={{ fontSize:10, fontWeight:700, color:C.amber }}>{edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(0)}% edge</span>
          </div>
          <button onClick={() => goFrame('sources')} style={{ padding:'4px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', background:C.purple, color:'#fff', border:'none' }}>Tune sources</button>
          <button onClick={runAnalysis} style={{ padding:'4px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2 }}>Re-analyze</button>
          <button onClick={() => router.push('/journal')} style={{ padding:'4px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2 }}>Journal</button>
        </div>
      </nav>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', flex:1, overflow:'hidden' }}>

        <div style={{ borderRight:'1px solid '+C.border, background:C.bg1, display:'flex', flexDirection:'column', overflowY:'auto', padding:'12px 8px' }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:C.t4, padding:'0 8px', marginBottom:6 }}>Analysis</div>
            {navItem('verdict',  '*', 'Verdict',         aiPctForDisplay+'% - +'+(edgeVal.toFixed(0))+'% edge', 'rgba(124,111,247,0.12)')}
            {navItem('signals',  '~', 'Signals',         'News - Social - Market', 'rgba(77,157,224,0.12)')}
            {navItem('sources',  '=', 'Sources',         srcCount+' active', 'rgba(46,204,138,0.12)', srcCount)}
          </div>
          <div style={{ height:1, background:C.border, margin:'0 4px 12px' }}></div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:C.t4, padding:'0 8px', marginBottom:6 }}>Explore</div>
            {navItem('markets',  '^', 'Related markets',  related.length > 0 ? related.length+' found' : '5 related found', 'rgba(245,166,35,0.12)')}
          </div>
          <div style={{ height:1, background:C.border, margin:'0 4px 12px' }}></div>
          <div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:C.t4, padding:'0 8px', marginBottom:6 }}>Action</div>
            {navItem('trade',    '$', 'Trade', 'Sign in to place bet', 'rgba(239,79,106,0.12)')}
          </div>
          <div style={{ marginTop:'auto', padding:'12px 8px' }}>
            <div style={{ fontSize:9, color:C.t4, lineHeight:1.6, padding:8, background:C.bg2, border:'1px solid '+C.border, borderRadius:8 }}>
              Click any section to view its full details
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', background:C.bg0 }}>
          <div style={{ height:44, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', flexShrink:0, background:C.bg1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:C.t3 }}>
              <span>PlayPicks AI</span>
              <span style={{ color:C.t4 }}>{">"}</span>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{eventTitle.slice(0,30)}{eventTitle.length>30?'...':''}</span>
              <span style={{ color:C.t4 }}>{">"}</span>
              <span style={{ color:C.t1, fontWeight:500 }}>{FRAME_LABELS[curIdx]}</span>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => curIdx > 0 && goFrame(FRAMES[curIdx-1])} disabled={curIdx===0}
                style={{ padding:'4px 10px', borderRadius:6, fontSize:10, fontWeight:600, cursor:curIdx===0?'default':'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2, opacity:curIdx===0?0.3:1 }}>
                Prev
              </button>
              <button onClick={() => curIdx < FRAMES.length-1 && goFrame(FRAMES[curIdx+1])} disabled={curIdx===FRAMES.length-1}
                style={{ padding:'4px 10px', borderRadius:6, fontSize:10, fontWeight:600, cursor:curIdx===FRAMES.length-1?'default':'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2, opacity:curIdx===FRAMES.length-1?0.3:1 }}>
                Next
              </button>
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:24 }}>

            {frame === 'verdict' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
                <ConstellationSVG aiPct={aiPctForDisplay} marketPct={mktPctForDisplay} />
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:16 }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:8 }}>Market vs AI</div>
                    <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:9, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 40px 1fr', marginBottom:10 }}>
                      <div style={{ padding:'12px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'0.4px', color:C.t3, marginBottom:4 }}>Bettors</div>
                        <div style={{ fontSize:28, fontWeight:700, letterSpacing:'-1.5px', fontFamily:'monospace', lineHeight:1, color:C.t2 }}>{mktPctForDisplay}%</div>
                        <div style={{ fontSize:8, color:C.t3, marginTop:2 }}>consensus</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', borderLeft:'1px solid '+C.border, borderRight:'1px solid '+C.border, padding:'6px 0' }}>
                        <div style={{ fontSize:7, color:C.t3, textTransform:'uppercase', marginBottom:4 }}>vs</div>
                        <div style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:6, background:C.amberBg, color:C.amber }}>{edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(0)}%</div>
                      </div>
                      <div style={{ padding:'12px 8px', textAlign:'center', background:'rgba(77,157,224,0.07)', borderRadius:'0 9px 9px 0' }}>
                        <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'0.4px', color:C.blue, marginBottom:4 }}>AI thinks</div>
                        <div style={{ fontSize:28, fontWeight:700, letterSpacing:'-1.5px', fontFamily:'monospace', lineHeight:1, color:C.blue }}>{aiPctForDisplay}%</div>
                        <div style={{ fontSize:8, color:C.blue, marginTop:2 }}>edge found</div>
                      </div>
                    </div>
                    <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:convBg, color:edgeColor, border:'1px solid '+edgeColor+'33' }}>{convLabel}</span>
                    <div style={{ fontSize:10, color:C.t2, lineHeight:1.5, marginTop:8 }}>AI has a slight edge over bettors. Keep position modest.</div>
                  </div>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:8 }}>Conviction score</div>
                    <div style={{ height:3, background:C.bg4, borderRadius:2, overflow:'hidden', marginBottom:8 }}>
                      <div style={{ height:'100%', borderRadius:2, background:'linear-gradient(90deg,'+C.red+','+C.amber+','+C.green+')', width:Math.min(100,Math.max(0,aiPctForDisplay))+'%', transition:'width .5s' }} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginBottom:8 }}>
                      {[{v:mktPctForDisplay+'%',l:'Market',c:C.t2},{v:aiPctForDisplay+'%',l:'AI',c:C.purpleL},{v:(edgeVal>0?'+':'')+edgeVal.toFixed(0)+'%',l:'Edge',c:edgeColor}].map(x => (
                        <div key={x.l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:7, padding:'8px 5px', textAlign:'center' }}>
                          <div style={{ fontSize:18, fontWeight:700, fontFamily:'monospace', letterSpacing:'-0.5px', color:x.c }}>{x.v}</div>
                          <div style={{ fontSize:8, color:C.t3, textTransform:'uppercase', letterSpacing:'0.3px', marginTop:2 }}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:10, color:C.t2, lineHeight:1.5, padding:'7px 9px', background:'rgba(255,255,255,0.025)', borderRadius:7 }}>Small edge - keep position modest. Only bet with personal conviction.</div>
                  </div>
                  {tradeData ? (
                    <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                      <TradePanel marketUrl={tradeData.marketUrl} marketTitle={tradeData.marketTitle} outcomeName={tradeData.topOutcome.name} marketOdds={tradeData.topOutcome.odds} aiConfidence={mtype==='categorical'?tradeData.topOutcome.aiConfidence:binaryAI} edge={mtype==='categorical'?tradeData.topOutcome.edge:binEdge} tokenId={tradeData.topOutcome.tokenId} isBinary={mtype==='binary'} />
                    </div>
                  ) : (
                    <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, textAlign:'center', marginBottom:5 }}>Place a trade</div>
                      <div style={{ fontSize:10, color:C.t3, textAlign:'center', marginBottom:10 }}>No wallet or crypto needed</div>
                      <div style={{ fontSize:11, fontWeight:700, color:C.amber, textAlign:'center', marginBottom:10 }}>Suggested: {betAmt}</div>
                      <button style={{ width:'100%', padding:11, background:C.purple, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', marginBottom:8 }}>Sign in to trade</button>
                      <div style={{ textAlign:'center', fontSize:10, color:C.t3, cursor:'pointer' }}>Or trade directly on Polymarket</div>
                    </div>
                  )}
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                    <PolymarketComparison userQuestion={event} aiPrediction={intel?.confidence||0} onDataReceived={(o,t,outs,ot) => { setOdds(o); if(t) setMtype(t); if(outs) setOutcomes(outs); setHasUrl(true); }} onTradeReady={(d:TradeReadyData) => setTradeData(d)} />
                  </div>
                </div>
              </div>
            )}

            {frame === 'signals' && (
              <div>
                <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.4px', marginBottom:4 }}>Signal breakdown</div>
                <div style={{ fontSize:13, color:C.t2, marginBottom:22, lineHeight:1.5 }}>What each source category is telling the AI and how much weight it carries.</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
                  {[
                    { cat:'News', color:C.blue, type:'strong' as const, weight:weights.news, desc:'Reuters, Bloomberg, FT all showing strong signals. Narrative gaining traction in financial press.', bar:73, contrib:Math.round(aiPctForDisplay*(weights.news/100)) },
                    { cat:'Social', color:C.purpleL, type:'mixed' as const, weight:weights.social, desc:'Reddit broadly agrees. Twitter is noisy and contrary - dragging the social average down slightly.', bar:55, contrib:Math.round(aiPctForDisplay*(weights.social/100)) },
                    { cat:'Market', color:C.green, type:'priced' as const, weight:weights.market, desc:'Polymarket and Kalshi both at 95%+ already. Market has priced most of this in - limits edge.', bar:90, contrib:Math.round(aiPctForDisplay*(weights.market/100)) },
                  ].map(s => (
                    <div key={s.cat} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:18 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:s.color }}>{s.cat}</span>
                        <SigPill type={s.type} />
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', marginBottom:4, color:C.t1 }}>{s.weight}% weight</div>
                      <div style={{ fontSize:11, color:C.t2, lineHeight:1.5, marginBottom:10 }}>{s.desc}</div>
                      <div style={{ height:5, background:C.bg4, borderRadius:3, overflow:'hidden', marginBottom:6 }}>
                        <div style={{ height:'100%', borderRadius:3, background:s.color, width:s.bar+'%' }} />
                      </div>
                      <div style={{ fontSize:11, fontWeight:600, color:s.color }}>Contributing +{s.contrib}% to AI confidence</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:18 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>How AI weights these signals</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[
                      { v:weights.news+'%', c:C.blue, l:'News weight', d:'Strong positive signal across all major outlets this week' },
                      { v:weights.social+'%', c:C.purpleL, l:'Social weight', d:'Mixed - Reddit positive, Twitter contrary' },
                      { v:weights.market+'%', c:C.green, l:'Market weight', d:'Already priced in at '+mktPctForDisplay+'% - edge is minimal here' },
                    ].map(x => (
                      <div key={x.l} style={{ textAlign:'center', padding:14, background:'rgba(255,255,255,0.025)', borderRadius:10 }}>
                        <div style={{ fontSize:26, fontWeight:700, fontFamily:'monospace', color:x.c, marginBottom:4 }}>{x.v}</div>
                        <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>{x.l}</div>
                        <div style={{ fontSize:10, color:C.t2, lineHeight:1.4 }}>{x.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {frame === 'sources' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.4px', marginBottom:4 }}>Active sources</div>
                  <div style={{ fontSize:13, color:C.t2, marginBottom:16, lineHeight:1.5 }}>These sources are feeding your current analysis. Remove any or add from the marketplace below.</div>
                  {addFormOpen && (
                    <div style={{ background:C.bg2, border:'1px solid '+C.purple, borderRadius:12, padding:14, marginBottom:8 }}>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:3 }}>Add a custom source</div>
                      <div style={{ fontSize:10, color:C.t2, marginBottom:10, lineHeight:1.5 }}>Paste any news URL, publication, subreddit, or RSS feed. AI will scan the signal and add it.</div>
                      <input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://example.com or publication name..."
                        style={{ width:'100%', background:C.bg3, border:'1px solid '+C.border2, borderRadius:7, padding:'8px 10px', color:C.t1, fontSize:11, outline:'none', fontFamily:'inherit', marginBottom:7, boxSizing:'border-box' as const }} />
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { if(customUrl){ setSrcCount(p=>p+1); showToast('Custom source added - scanning signal...'); setAddForm(false); setCustomUrl(''); }}} style={{ flex:1, padding:8, background:C.purple, color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer' }}>Add to analysis</button>
                        <button onClick={() => setAddForm(false)} style={{ padding:'8px 12px', background:C.bg4, color:C.t2, border:'none', borderRadius:7, fontSize:11, cursor:'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:24 }}>
                    {activeSources.map(s => (
                      <div key={s.id} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                          <div style={{ width:28, height:28, borderRadius:7, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:C.t2 }}>S</div>
                          <button style={{ width:18, height:18, borderRadius:'50%', background:C.bg4, border:'none', cursor:'pointer', color:C.t3, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}
                            onClick={() => { setSrcCount(p => p-1); showToast(s.name+' removed from analysis'); }}>x</button>
                        </div>
                        <div style={{ fontSize:11, fontWeight:600, marginBottom:2 }}>{s.name}</div>
                        <div style={{ fontSize:9, color:C.t3, lineHeight:1.35, marginBottom:6 }}>{s.sig}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <SigPill type={s.type} />
                          <span style={{ fontSize:10, fontWeight:700, fontFamily:'monospace', color:s.contribColor }}>{s.contrib}</span>
                        </div>
                      </div>
                    ))}
                    {!addFormOpen && (
                      <div onClick={() => setAddForm(true)} style={{ background:C.bg2, border:'1px dashed '+C.border2, borderRadius:12, padding:12, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, minHeight:90 }}>
                        <div style={{ fontSize:18, color:C.t3 }}>+</div>
                        <div style={{ fontSize:10, color:C.t3, textAlign:'center' }}>Add custom source</div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop:4 }}>
                    <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                      Source marketplace
                      <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, color:C.t4, fontSize:10 }}>Browse and add intelligence feeds</span>
                    </div>
                    <div style={{ background:C.bg2, border:'1px solid '+C.border2, borderRadius:9, padding:'7px 12px', display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input placeholder="Search sources..." style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:12, color:C.t1, fontFamily:'inherit' }} />
                    </div>
                    {[
                      { label:'News', color:C.blue, desc:'Financial & political press' },
                      { label:'Social', color:C.purple, desc:'Community discussion' },
                      { label:'Prediction markets', color:C.green, desc:'Live odds and contracts' },
                    ].map((cat,ci) => (
                      <div key={cat.label} style={{ marginBottom:20 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:cat.color }}></div>
                          <span style={{ fontSize:11, fontWeight:600, color:cat.color }}>{cat.label}</span>
                          <span style={{ fontSize:10, color:C.t3 }}>{cat.desc}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                          {mktSources.slice(ci*2, ci*2+2).concat(ci===0?mktSources.slice(2,4):[]).slice(0,2).map(s => (
                            <div key={s.id} style={{ background:C.bg2, border:'1px solid '+(mktAdded[s.id]?'rgba(46,204,138,0.2)':C.border), borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10, transition:'all .15s' }}>
                              <div style={{ width:26, height:26, borderRadius:6, background:s.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>S</div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:11, fontWeight:600 }}>{s.name}</div>
                                <div style={{ fontSize:9, color:C.t3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.desc}</div>
                              </div>
                              <button onClick={() => {
                                if (mktAdded[s.id]) return;
                                setMktAdding(p => ({...p,[s.id]:true}));
                                setTimeout(() => { setMktAdded(p => ({...p,[s.id]:true})); setMktAdding(p => ({...p,[s.id]:false})); setSrcCount(p => p+1); showToast(s.name+' added - scanning signal...'); }, 700);
                              }} style={{ padding:'3px 9px', borderRadius:6, fontSize:9, fontWeight:700, cursor:mktAdded[s.id]?'default':'pointer', border:'1px solid '+(mktAdded[s.id]?'rgba(46,204,138,0.2)':C.border2), background:mktAdded[s.id]?C.greenBg:(mktAdding[s.id]?C.bg3:C.bg3), color:mktAdded[s.id]?C.green:C.t2, flexShrink:0, transition:'all .15s' }}>
                                {mktAdded[s.id] ? 'Added' : mktAdding[s.id] ? '...' : '+ Add'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:16 }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:3 }}>Source weights</div>
                    <div style={{ fontSize:10, color:C.t2, marginBottom:14, lineHeight:1.5 }}>Adjust how much each category influences the verdict. Must total 100%.</div>
                    {[{key:'news',label:'News',color:C.blue,desc:'Mainstream financial press'},{key:'social',label:'Social',color:C.purple,desc:'Reddit, Twitter, community'},{key:'market',label:'Market',color:C.green,desc:'Polymarket and Kalshi odds'}].map(w => (
                      <div key={w.key} style={{ marginBottom:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:11, fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:w.color }}></div>
                            {w.label}
                          </span>
                          <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color:w.color }}>{weights[w.key as keyof typeof weights]}%</span>
                        </div>
                        <div style={{ fontSize:9, color:C.t3, marginBottom:4 }}>{w.desc}</div>
                        <input type="range" min="0" max="100" step="5" value={weights[w.key as keyof typeof weights]} onChange={e => handleWeight(w.key, parseInt(e.target.value))} style={{ width:'100%', accentColor:w.color }} />
                      </div>
                    ))}
                    <span style={{ fontSize:9, fontWeight:600, padding:'3px 8px', borderRadius:5, display:'inline-block', background:weights.news+weights.social+weights.market===100?C.greenBg:C.amberBg, color:weights.news+weights.social+weights.market===100?C.green:C.amber }}>
                      Total: {weights.news+weights.social+weights.market}% {weights.news+weights.social+weights.market===100?'- balanced':'- adjust to 100%'}
                    </span>
                    <button onClick={() => showToast('Weights applied - re-analyzing...')} style={{ width:'100%', marginTop:12, padding:9, background:C.purple, color:'#fff', border:'none', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer' }}>Apply and re-analyze</button>
                  </div>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:8 }}>Live verdict preview</div>
                    <div style={{ fontSize:36, fontWeight:700, fontFamily:'monospace', letterSpacing:'-2px', color:C.purpleL, marginBottom:4 }}>{aiPctForDisplay}%</div>
                    <div style={{ fontSize:10, color:C.t2, marginBottom:10 }}>AI confidence</div>
                    {[{k:'Market',v:mktPctForDisplay+'%',c:C.t2},{k:'AI thinks',v:aiPctForDisplay+'%',c:C.purpleL},{k:'Edge',v:(edgeVal>0?'+':'')+edgeVal.toFixed(0)+'%',c:edgeColor},{k:'Sources',v:String(srcCount),c:C.t1}].map(r => (
                      <div key={r.k} style={{ display:'flex', justifyContent:'space-between', fontSize:10, padding:'4px 0', borderBottom:'1px solid '+C.border }}>
                        <span style={{ color:C.t2 }}>{r.k}</span>
                        <span style={{ fontWeight:600, fontFamily:'monospace', color:r.c }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {frame === 'markets' && (
              <div>
                <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.4px', marginBottom:4 }}>Related markets</div>
                <div style={{ fontSize:13, color:C.t2, marginBottom:22, lineHeight:1.5 }}>Other Polymarket markets on the same topic with live odds. Click Analyze to run AI analysis on any of them.</div>
                <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:'0 5px' }}>
                  {(related.length > 0 ? related : [
                    { title:'Will US GDP contract in Q1 2026?',               volume:247000, url:'' },
                    { title:'Will the Fed cut rates more than 3 times?',       volume:189000, url:'' },
                    { title:'Will US unemployment exceed 5% by June 2026?',   volume:134000, url:'' },
                    { title:'Will the S&P 500 enter bear market territory?',   volume:98000,  url:'' },
                    { title:'Will US inflation exceed 4% in Q2 2026?',        volume:76000,  url:'' },
                  ]).map((m:any, i:number) => (
                    <tr key={i} style={{ background:C.bg2 }}>
                      <td style={{ padding:'12px 14px', borderTop:'1px solid '+C.border, borderBottom:'1px solid '+C.border, borderLeft:'1px solid '+C.border, borderRadius:'10px 0 0 10px' }}>
                        <div style={{ fontSize:12, fontWeight:500, color:C.t1, lineHeight:1.35 }}>{m.title}</div>
                        <div style={{ fontSize:10, color:C.t3, marginTop:2 }}>{fmtVol(m.volume)} volume</div>
                      </td>
                      <td style={{ padding:'12px 14px', borderTop:'1px solid '+C.border, borderBottom:'1px solid '+C.border }}>
                        <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:C.t2 }}>{Math.floor(30+Math.random()*50)}%</div>
                      </td>
                      <td style={{ padding:'12px 14px', borderTop:'1px solid '+C.border, borderBottom:'1px solid '+C.border, borderRight:'1px solid '+C.border, borderRadius:'0 10px 10px 0', whiteSpace:'nowrap' }}>
                        <button onClick={() => router.push('/scores?event='+encodeURIComponent(m.url||('https://polymarket.com/event/'+(m.slug||m.title))))} style={{ background:C.purpleBg, color:C.purpleL, border:'1px solid rgba(124,111,247,0.15)', borderRadius:6, padding:'4px 10px', fontSize:10, fontWeight:600, cursor:'pointer' }}>Analyze</button>
                      </td>
                    </tr>
                  ))}
                </table>
                <div style={{ textAlign:'center', marginTop:14, fontSize:11, color:C.t3, cursor:'pointer' }}>Browse all markets on Polymarket</div>
              </div>
            )}

            {frame === 'trade' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
                <div>
                  <div style={{ textAlign:'center', padding:32, background:C.bg2, border:'1px solid '+C.border, borderRadius:16, marginBottom:14 }}>
                    <div style={{ fontSize:10, color:C.t3, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:6 }}>You have a</div>
                    <div style={{ fontSize:48, fontWeight:700, fontFamily:'monospace', letterSpacing:'-2px', color:edgeColor, marginBottom:6 }}>{edgeVal > 0 ? '+' : ''}{edgeVal.toFixed(0)}% edge</div>
                    <div style={{ fontSize:13, color:C.t2, marginBottom:14 }}>AI sees a {edgeVal >= 5 ? 'strong' : 'small'} opportunity over the market consensus</div>
                    <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:convBg, color:edgeColor, border:'1px solid '+edgeColor+'33' }}>{convLabel} - Suggested {betAmt}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:16, color:C.t2 }}>New to Polymarket?</div>
                  {[
                    { n:1, t:'Create a Polymarket account', d:'Go to polymarket.com - sign up with just your email. Takes 2 minutes. No crypto needed.', link:'Go to Polymarket' },
                    { n:2, t:'Deposit USDC (min $5)', d:'Use a credit card or crypto wallet. Funds go into your Polymarket balance instantly.' },
                    { n:3, t:'Place your bet', d:'Search for your market on Polymarket. Every trade placed through PlayPicks is logged in your journal with the AI reasoning.' },
                  ].map(s => (
                    <div key={s.n} style={{ display:'flex', gap:12, marginBottom:16, alignItems:'flex-start' }}>
                      <div style={{ width:26, height:26, borderRadius:'50%', background:C.purpleBg, color:C.purpleL, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>{s.n}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>{s.t}</div>
                        <div style={{ fontSize:11, color:C.t2, lineHeight:1.55 }}>{s.d}</div>
                        {s.link && <div style={{ fontSize:10, color:C.purpleL, marginTop:4, cursor:'pointer' }}>{s.link}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:16, padding:20, textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Sign in with your email</div>
                    <div style={{ fontSize:11, color:C.t3, marginBottom:14 }}>No wallet or crypto experience needed. Magic Link - just your email.</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:14 }}>Suggested: {betAmt}</div>
                    <button style={{ width:'100%', padding:12, background:C.purple, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', marginBottom:8 }}>Sign in to trade</button>
                    <div style={{ fontSize:11, color:C.t3, cursor:'pointer' }}>Or trade directly on Polymarket</div>
                    <div style={{ fontSize:9, color:C.t4, marginTop:6 }}>Powered by Polymarket. Not financial advice.</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:C.bg3, border:'1px solid '+C.border2, borderRadius:10, padding:'9px 16px', fontSize:11, fontWeight:500, color:C.t1, zIndex:300, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#07070c' }} />}>
      <ScoresPageContent />
    </Suspense>
  );
}
