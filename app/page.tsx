'use client';
/* PP-HOME-V2 — professional homepage: 4 content bands, no stale hardcoded sections */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult { slug:string; title:string; url:string; volume:number; endDate:string; markets:number; }
interface TrendingEvent {
  slug:string; title:string; url:string; volume:number; volumeFormatted:string;
  category:string; icon:string; yesPrice:number|null; marketCount:number;
  image:string|null; volume24h:number; volume24hFormatted:string;
  team1:string|null; team2:string|null; endDate:string;
  topOutcome?: { name: string; prob: number } | null;
}

const C = {
  bg0:'#06060a', bg1:'#0e0e14', bg2:'#14141c', bg3:'#1a1a24', bg4:'#22222e',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78', t4:'#2e2c44',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)', purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a', amber:'#f5a623', red:'#ef4f6a', blue:'#4d9de0',
};

const FONT_SANS = "var(--font-geist-sans), 'Inter', system-ui, sans-serif";
const FONT_MONO = "var(--font-geist-mono), ui-monospace, monospace";

const CATS = [
  { id:'all',        label:'All' },
  { id:'sports',     label:'Sports' },
  { id:'crypto',     label:'Crypto' },
  { id:'politics',   label:'Politics' },
  { id:'technology', label:'Tech' },
  { id:'economics',  label:'Economics' },
  { id:'world',      label:'World' },
];

const CAT_COLORS: Record<string,{color:string;bg:string}> = {
  sports:     {color:'#2ecc8a', bg:'rgba(46,204,138,0.1)'},
  crypto:     {color:'#f5a623', bg:'rgba(245,166,35,0.1)'},
  politics:   {color:'#ef4f6a', bg:'rgba(239,79,106,0.1)'},
  technology: {color:'#7c6ff7', bg:'rgba(124,111,247,0.1)'},
  economics:  {color:'#4d9de0', bg:'rgba(77,157,224,0.1)'},
  world:      {color:'#a89cf8', bg:'rgba(168,156,248,0.1)'},
  other:      {color:'#9996b8', bg:'rgba(153,150,184,0.08)'},
};

// The three signals behind every PlayPicks probability — shown as the hero demo.
const SIGNALS = [
  { label:'Market price',      note:'what people trading real money think', pct:55, color:'#7c6ff7' },
  { label:'Statistical model', note:'strength and form data',               pct:30, color:'#4d9de0' },
  { label:'Expert forecasts',  note:'published predictions',                pct:15, color:'#2ecc8a' },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery]       = useState('');
  const [isAnalyzing, setAnalyzing] = useState(false);
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [category, setCategory] = useState('all');
  const [events, setEvents]     = useState<TrendingEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const timer = useRef<NodeJS.Timeout|null>(null);

  const go = (q: string) => {
    setAnalyzing(true);
    setShowResults(false);
    const clean = q.replace(' - More Markets','').replace(/\s+vs\.\s+/i,' vs ').trim();
    router.push('/scores?event=' + encodeURIComponent(clean));
  };

  // Track page visit
  useEffect(() => {
    try {
      let id = localStorage.getItem('pp_uid');
      if (!id) { id = crypto.randomUUID(); localStorage.setItem('pp_uid', id); }
      fetch('/api/track', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ anonId: id, name: 'page_view', props: { page: 'home', ref: document.referrer } })
      }).catch(()=>{});
    } catch {}
  }, []);

  // Autocomplete
  useEffect(() => {
    if (!query || query.includes('polymarket.com') || query.length < 3) { setResults([]); setShowResults(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch('/api/search?q=' + encodeURIComponent(query));
        const d = await r.json();
        if (d.results?.length > 0) { setResults(d.results); setShowResults(true); }
        else { setResults([]); setShowResults(false); }
      } catch {}
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  // Load live markets
  useEffect(() => {
    setLoading(true);
    setEvents([]);
    fetch('/api/trending?category=' + category)
      .then(r => r.json())
      .then(d => { setEvents(d.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  const fmtVol = (v: number) => v >= 1_000_000 ? '$' + (v/1_000_000).toFixed(1) + 'M' : v >= 1_000 ? '$' + (v/1_000).toFixed(0) + 'K' : '$' + v;

  const cleanEvents = events.filter(e => {
    const t = (e.title||'').toLowerCase();
    return !t.includes('more markets') && !t.includes('exact score');
  });

  // On the All tab, game days flood the volume ranking with sports.
  // Interleave so the top of the list stays diverse: two non-sports rows per sports row.
  const balanced = (() => {
    if (category !== 'all') return cleanEvents;
    const sports = cleanEvents.filter(e => e.category === 'sports');
    const rest   = cleanEvents.filter(e => e.category !== 'sports');
    const out: TrendingEvent[] = [];
    let si = 0, ri = 0;
    while (si < sports.length || ri < rest.length) {
      if (ri < rest.length) out.push(rest[ri++]);
      if (ri < rest.length) out.push(rest[ri++]);
      if (si < sports.length) out.push(sports[si++]);
    }
    return out;
  })();

  const navLinks = [
    { label:'Picks',       path:'/picks' },
    { label:'Challenge',   path:'/predict' },
    { label:'Leaderboard', path:'/leaderboard' },
    { label:'Accuracy',    path:'/accuracy' },
    { label:'Journal',     path:'/journal' },
    { label:'Sources',     path:'/sources' },
    { label:'F1',          path:'/f1' },
    { label:'Profile',     path:'/profile' },
  ];

  return (
    <div style={{background:C.bg0, minHeight:'100vh', color:C.t1, fontFamily:FONT_SANS}}>
      <style>{`
        .ppNavLinks{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}
        .ppNavLinks::-webkit-scrollbar{display:none}
        .ppHowGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:900px;margin:0 auto 32px}
        .ppFeatGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;max-width:900px;margin:0 auto}
        .ppTrendRow{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
        .ppTrendRow::-webkit-scrollbar{display:none}
        .ppMktRow{display:grid;grid-template-columns:28px 1fr 92px 80px 84px;align-items:center}
        @media (max-width:720px){
          .ppHowGrid{grid-template-columns:1fr}
          .ppFeatGrid{grid-template-columns:repeat(2,1fr)}
          .ppMktRow{grid-template-columns:24px 1fr 76px 70px}
          .ppMktCta{display:none}
        }
      `}</style>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',flexShrink:0}} onClick={()=>router.push('/')}>
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="9" fill="#0e0e18"/>
            <rect x="6" y="24" width="3" height="6" rx="1.5" fill="#2e2c44"/>
            <rect x="11" y="20" width="3" height="10" rx="1.5" fill="#3a3860"/>
            <rect x="16" y="16" width="3" height="14" rx="1.5" fill="#564ea0"/>
            <rect x="21" y="11" width="3" height="19" rx="1.5" fill="#7c6ff7"/>
            <rect x="26" y="7" width="3" height="23" rx="1.5" fill="#a89cf8"/>
            <path d="M 7.5 19 Q 14 10 27.5 7.5" fill="none" stroke="#2ecc8a" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="7.5" cy="19" r="3" fill="#ef4f6a"/>
            <circle cx="27.5" cy="7" r="2.5" fill="#2ecc8a"/>
          </svg>
          <div>
            <div style={{fontSize:15,fontWeight:800,letterSpacing:'-0.4px',lineHeight:1}}>PlayPicks</div>
            <div style={{fontSize:8,fontWeight:700,color:C.purpleL,letterSpacing:'1.5px',textTransform:'uppercase',lineHeight:1,marginTop:3}}>AI</div>
          </div>
        </div>
        <div className="ppNavLinks">
          {navLinks.map(l=>(
            <button key={l.path} onClick={()=>router.push(l.path)}
              style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.color=C.t1;}}
              onMouseLeave={e=>{e.currentTarget.style.color=C.t2;}}>
              {l.label}
            </button>
          ))}
        </div>
      </nav>

      <div style={{paddingTop:52}}>

        {/* HERO */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'56px 24px 36px',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:900,height:600,background:'radial-gradient(ellipse,rgba(124,111,247,0.07) 0%,transparent 65%)',pointerEvents:'none'}}/>

          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,padding:'5px 14px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,marginBottom:22}}>
            <span style={{width:6,height:6,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 8px #ef4f6a'}}/>
            Live analysis · {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}
          </div>

          <h1 style={{fontSize:'clamp(36px,5.5vw,64px)',fontWeight:800,letterSpacing:'-2.5px',lineHeight:1.05,marginBottom:16,maxWidth:720}}>
            Ask any question.<br/><span style={{color:C.purpleL}}>See every source behind the answer.</span>
          </h1>
          <p style={{fontSize:15,color:C.t2,maxWidth:520,lineHeight:1.7,marginBottom:28}}>
            PlayPicks blends live market prices, statistical models, and expert forecasts
            into one probability — and shows how much each source contributed.
            Economics, politics, sports, crypto. Nothing hidden.
          </p>

          {/* SEARCH */}
          <div style={{width:'100%',maxWidth:580,position:'relative',marginBottom:10}}>
            <div style={{position:'relative'}}>
              <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&query.trim()&&go(query.trim())}
                placeholder="Will the Fed cut rates in September? Chiefs vs Bills?"
                autoFocus
                style={{width:'100%',padding:'15px 120px 15px 18px',background:C.bg2,border:'1px solid '+C.border2,borderRadius:14,color:C.t1,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}/>
              <button onClick={()=>query.trim()&&go(query.trim())} disabled={isAnalyzing||!query.trim()}
                style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:C.purple,color:'white',border:'none',borderRadius:10,padding:'9px 18px',fontSize:13,fontWeight:600,cursor:'pointer',opacity:(!query.trim()||isAnalyzing)?0.5:1,whiteSpace:'nowrap' as const,fontFamily:'inherit'}}>
                {isAnalyzing ? '...' : 'Analyze'}
              </button>
            </div>
            {showResults && results.length > 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:C.bg2,border:'1px solid '+C.border2,borderRadius:12,overflow:'hidden',zIndex:50,boxShadow:'0 16px 40px rgba(0,0,0,0.6)'}}>
                {results.map((r,i)=>(
                  <button key={i} onClick={()=>go(r.title)} style={{width:'100%',padding:'10px 16px',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left' as const,fontFamily:'inherit'}}
                    onMouseEnter={e=>(e.currentTarget.style.background=C.bg3)} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                    <div style={{fontSize:12,color:C.t1,fontWeight:500,marginBottom:1}}>{r.title}</div>
                    <div style={{fontSize:10,color:C.t3}}>{fmtVol(r.volume)} traded</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={{fontSize:11,color:C.t3,marginBottom:34}}>Type a question or paste a Polymarket link</p>

          {/* SIGNATURE — how every probability is built */}
          <div style={{width:'100%',maxWidth:560,textAlign:'left' as const}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'1px',marginBottom:10,textAlign:'center' as const}}>
              What builds every number
            </div>
            <div style={{display:'flex',height:8,borderRadius:100,overflow:'hidden',gap:2,marginBottom:12}}>
              {SIGNALS.map(s=>(
                <div key={s.label} style={{width:s.pct+'%',background:s.color,opacity:0.85}}/>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,flexWrap:'wrap' as const}}>
              {SIGNALS.map(s=>(
                <div key={s.label} style={{display:'flex',alignItems:'flex-start',gap:7,flex:1,minWidth:140}}>
                  <span style={{width:8,height:8,borderRadius:2,background:s.color,marginTop:3,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.t1,lineHeight:1.3}}>{s.label}</div>
                    <div style={{fontSize:10,color:C.t3,lineHeight:1.4}}>{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,color:C.t3,textAlign:'center' as const,marginTop:12}}>
              You can change how much weight each source gets — or add your own.
            </div>
          </div>
        </div>

        {/* EXPLAINER — plain-language intro using a real live number */}
        {cleanEvents.length > 0 && (() => {
          const usable = cleanEvents.filter(e => e.yesPrice !== null && e.yesPrice >= 10 && e.yesPrice <= 90);
          const example = usable.find(e => e.category !== 'sports') || usable[0];
          if (!example) return null;
          const pct = example.yesPrice as number;
          const isMatch = /\s+vs\.?\s+/i.test(example.title);
          const parts = isMatch ? example.title.split(/\s+vs\.?\s+/i) : [];
          return (
            <div style={{maxWidth:640,margin:'0 auto',padding:'0 24px'}}>
              <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:16,padding:'20px 22px',marginBottom:28}}>
                <div style={{fontSize:11,fontWeight:700,color:C.purpleL,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:10}}>New to prediction markets?</div>
                <p style={{fontSize:14,color:C.t2,lineHeight:1.7,marginBottom:12}}>
                  A prediction market is a place where people put real money on things that will
                  actually happen — a game, an election, a Fed decision. The trading price is the
                  crowd's live estimate, updated every minute.
                </p>
                <p style={{fontSize:14,color:C.t1,lineHeight:1.7,marginBottom:12}}>
                  {isMatch ? (
                    <>Right now, traders give <b>{parts[0]?.trim()}</b> a <b>{pct}%</b> chance against <b>{parts[1]?.trim()}</b>.</>
                  ) : example.topOutcome?.name ? (
                    <>Right now, for "<b>{example.title}</b>", traders give <b>{example.topOutcome.name}</b> a <b>{pct}%</b> chance.</>
                  ) : (
                    <>Right now, traders put a <b>{pct}%</b> chance on: <b>{example.title}</b></>
                  )}
                  {' '}PlayPicks checks numbers like this against models and expert forecasts, then
                  tells you in plain English whether the crowd looks right — or whether there is a
                  gap worth knowing about.
                </p>
                <p style={{fontSize:13,color:C.t3,lineHeight:1.6}}>
                  Every answer shows the sources behind it, so you can see exactly why.
                </p>
              </div>
            </div>
          );
        })()}

        <div style={{maxWidth:960,margin:'0 auto',padding:'0 24px 48px'}}>

          {/* TRENDING NOW */}
          {(() => {
            const trending = (() => {
              const byVol = cleanEvents.slice().sort((a,b) => (b.volume24h||0) - (a.volume24h||0));
              const t: TrendingEvent[] = []; let s = 0;
              for (const e of byVol) {
                if (e.category === 'sports') { if (s >= 2) continue; s++; }
                t.push(e); if (t.length === 6) break;
              }
              return t.length >= 3 ? t : byVol.slice(0,6);
            })();
            if (trending.length === 0) return null;
            return (
              <div style={{marginBottom:32}}>
                <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:12}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.t1}}>Trending now</span>
                  <span style={{fontSize:11,color:C.t3}}>ranked by money traded in the last 24 hours</span>
                </div>
                <div className="ppTrendRow">
                  {trending.map((e,i) => {
                    const cs = CAT_COLORS[e.category] || CAT_COLORS.other;
                    return (
                      <button key={e.slug} onClick={()=>go(e.title)}
                        style={{flexShrink:0,width:190,textAlign:'left' as const,background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'12px 14px',cursor:'pointer',fontFamily:'inherit',transition:'border-color 0.15s'}}
                        onMouseEnter={ev=>{ev.currentTarget.style.borderColor=C.border2;}}
                        onMouseLeave={ev=>{ev.currentTarget.style.borderColor=C.border;}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                          <span style={{fontSize:9,fontWeight:700,color:cs.color,padding:'2px 6px',borderRadius:4,background:cs.bg,textTransform:'uppercase' as const,letterSpacing:'0.3px'}}>{e.category}</span>
                          {e.yesPrice !== null ? <span style={{fontSize:13,fontWeight:700,color:e.yesPrice>=50?C.green:C.red,fontFamily:FONT_MONO}}>{e.yesPrice}%</span> : e.topOutcome ? <span style={{fontSize:12,fontWeight:700,color:C.t2,fontFamily:FONT_MONO}}>{e.topOutcome.prob}%</span> : null}
                        </div>
                        <div style={{fontSize:12,fontWeight:600,color:C.t1,marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as const,lineHeight:1.35,minHeight:32}}>{e.title}</div>
                        <div style={{fontSize:10,color:C.t3}}>{e.volume24hFormatted} today</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* LIVE MARKETS TABLE */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:6,height:6,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #ef4f6a'}}/>
              <span style={{fontSize:14,fontWeight:700}}>Live markets</span>
              <span style={{fontSize:11,color:C.t3}}>from Polymarket</span>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
              {CATS.map(c=>(
                <button key={c.id} onClick={()=>setCategory(c.id)}
                  style={{padding:'5px 14px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                    border:'1px solid '+(category===c.id ? C.purpleBorder : C.border),
                    background:category===c.id ? C.purpleBg : 'transparent',
                    color:category===c.id ? C.purpleL : C.t2}}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[...Array(8)].map((_,i)=>(
                <div key={i} style={{height:52,background:C.bg2,borderRadius:8,border:'1px solid '+C.border,opacity:0.15+i*0.08}}/>
              ))}
            </div>
          ) : cleanEvents.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:C.t3,fontSize:13}}>
              No live markets in this category right now. Try another tab, or ask a question above.
            </div>
          ) : (
            <div style={{border:'1px solid '+C.border,borderRadius:12,overflow:'hidden'}}>
              <div className="ppMktRow" style={{padding:'8px 14px',background:C.bg3,borderBottom:'1px solid '+C.border}}>
                <div style={{fontSize:9,fontWeight:700,color:C.t4,textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>#</div>
                <div style={{fontSize:9,fontWeight:700,color:C.t4,textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>Market</div>
                <div style={{fontSize:9,fontWeight:700,color:C.t4,textTransform:'uppercase' as const,letterSpacing:'0.5px',textAlign:'center' as const}}>Chance</div>
                <div style={{fontSize:9,fontWeight:700,color:C.t4,textTransform:'uppercase' as const,letterSpacing:'0.5px',textAlign:'right' as const}}>Traded</div>
                <div className="ppMktCta"/>
              </div>
              {balanced.slice(0,20).map((e,i)=>{
                const cs = CAT_COLORS[e.category]||CAT_COLORS.other;
                const isYes = e.yesPrice!==null && e.yesPrice>=50;
                const isStrong = e.yesPrice!==null && (e.yesPrice>=70||e.yesPrice<=30);
                return (
                  <button key={e.slug} onClick={()=>go(e.title)} className="ppMktRow"
                    style={{width:'100%',padding:'10px 14px',background:'transparent',border:'none',borderBottom:i<Math.min(balanced.length,20)-1?'1px solid rgba(255,255,255,0.04)':'none',cursor:'pointer',textAlign:'left' as const,transition:'background 0.1s',fontFamily:'inherit'}}
                    onMouseEnter={ev=>{ev.currentTarget.style.background=C.bg3;}}
                    onMouseLeave={ev=>{ev.currentTarget.style.background='transparent';}}>
                    <div style={{fontSize:10,fontWeight:600,color:C.t4,fontFamily:FONT_MONO}}>{i+1}</div>
                    <div style={{minWidth:0,paddingRight:8}}>
                      <div style={{fontSize:12,fontWeight:500,color:C.t1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,marginBottom:2}}>
                        {e.title.slice(0,55)}{e.title.length>55?'…':''}
                      </div>
                      <span style={{fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:4,background:cs.bg,color:cs.color}}>{e.category}</span>
                    </div>
                    <div style={{textAlign:'center' as const}}>
                      {e.yesPrice!==null?(
                        <div>
                          <div style={{fontSize:13,fontWeight:700,fontFamily:FONT_MONO,color:isStrong?(isYes?C.green:C.red):C.t2}}>{e.yesPrice}%</div>
                          {e.topOutcome?.name && <div style={{fontSize:8,color:C.t3,maxWidth:88,margin:'2px auto 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{e.topOutcome.name}</div>}
                          <div style={{width:40,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,margin:'2px auto 0',overflow:'hidden'}}>
                            <div style={{height:'100%',background:isYes?C.green:C.red,width:e.yesPrice+'%',borderRadius:2}}/>
                          </div>
                        </div>
                      ): e.topOutcome ? (
                        <div>
                          <div style={{fontSize:13,fontWeight:700,fontFamily:FONT_MONO,color:C.t2}}>{e.topOutcome.prob}%</div>
                          <div style={{fontSize:8,color:C.t3,maxWidth:88,margin:'2px auto 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{e.topOutcome.name} leads</div>
                        </div>
                      ): e.marketCount > 1 ? (
                        <span style={{fontSize:9,fontWeight:600,color:C.t3,padding:'2px 7px',borderRadius:4,background:'rgba(255,255,255,0.04)',whiteSpace:'nowrap' as const}}>{e.marketCount} possible answers</span>
                      ) : (
                        <span style={{fontSize:10,color:C.t4}}>—</span>
                      )}
                    </div>
                    <div style={{textAlign:'right' as const}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.t2,fontFamily:FONT_MONO}}>{e.volume24hFormatted}</div>
                      <div style={{fontSize:9,color:C.t4}}>24h</div>
                    </div>
                    <div className="ppMktCta" style={{textAlign:'right' as const}}>
                      <span style={{fontSize:10,fontWeight:600,color:C.purpleL,padding:'4px 10px',borderRadius:6,border:'1px solid '+C.purpleBorder,background:C.purpleBg,whiteSpace:'nowrap' as const}}>
                        Analyze
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* DAILY CHALLENGE — single compact strip */}
          <button onClick={()=>router.push('/predict')}
            style={{width:'100%',marginTop:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'13px 16px',cursor:'pointer',fontFamily:'inherit',textAlign:'left' as const,transition:'border-color 0.15s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.border2;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;}}>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Daily prediction challenge</span>
              <span style={{fontSize:12,color:C.t3,marginLeft:10}}>Make picks, earn points, climb the leaderboard</span>
            </div>
            <span style={{fontSize:12,fontWeight:600,color:C.green,whiteSpace:'nowrap' as const}}>Play</span>
          </button>

        </div>

        {/* HOW IT WORKS */}
        <div style={{borderTop:'1px solid '+C.border,padding:'56px 24px'}}>
          <h2 style={{fontSize:22,fontWeight:700,letterSpacing:'-0.5px',textAlign:'center',marginBottom:6}}>How it works</h2>
          <p style={{textAlign:'center',color:C.t2,fontSize:14,marginBottom:36}}>Three steps from question to answer</p>
          <div className="ppHowGrid">
            {[
              {n:'1',t:'Ask a question',d:'Type any question or paste a Polymarket link. PlayPicks pulls live market prices, model data, and expert forecasts.'},
              {n:'2',t:'See the full breakdown',d:'One probability, with every source behind it listed in plain English. Adjust how much weight each source gets, or add your own.'},
              {n:'3',t:'Check the record',d:'Every analysis is saved to your journal, and our public accuracy page shows how past calls turned out.'},
            ].map(s=>(
              <div key={s.n} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'22px'}}>
                <div style={{width:30,height:30,background:C.purpleBg,border:'1px solid '+C.purpleBorder,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:C.purple,marginBottom:14,fontFamily:FONT_MONO}}>{s.n}</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{s.t}</div>
                <div style={{fontSize:12,color:C.t2,lineHeight:1.65}}>{s.d}</div>
              </div>
            ))}
          </div>
          <div className="ppFeatGrid">
            {[
              {t:'Real sources',d:'News, expert forecasts, and live Polymarket prices — every input named, nothing invented.'},
              {t:'Your weights',d:'Trust the market more than the model? Move a slider and watch the number change.'},
              {t:'Any question',d:'Sports, economics, politics, crypto — if people are predicting it, you can analyze it.'},
              {t:'Public record',d:'Every call is logged and scored in the open, so you can judge us on results.',link:true},
            ].map((f,i)=>(
              <div key={i} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px'}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:5,color:C.t1}}>{f.t}</div>
                <div style={{fontSize:11,color:C.t2,lineHeight:1.6}}>{f.d}</div>
                {f.link && <button onClick={()=>router.push('/accuracy')} style={{marginTop:8,fontSize:11,color:C.purpleL,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}>See the accuracy record</button>}
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{borderTop:'1px solid '+C.border,padding:'14px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap' as const,gap:8}}>
          <span style={{fontSize:11,color:C.t3}}>For research only. Not financial advice.</span>
          <div style={{display:'flex',gap:16}}>
            <button onClick={()=>router.push('/journal')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Journal</button>
            <button onClick={()=>router.push('/sources')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Sources</button>
            <span style={{fontSize:11,color:C.t4}}>PlayPicks AI</span>
          </div>
        </div>

      </div>
    </div>
  );
}
