'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult { slug:string; title:string; url:string; volume:number; endDate:string; markets:number; }
interface TrendingEvent {
  slug:string; title:string; url:string; volume:number; volumeFormatted:string;
  category:string; icon:string; yesPrice:number|null; marketCount:number;
  image:string|null; volume24h:number; volume24hFormatted:string;
}

const C = {
  bg0:'#06060a', bg1:'#0e0e14', bg2:'#14141c', bg3:'#1a1a24', bg4:'#22222e',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78', t4:'#2e2c44',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)', purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a', amber:'#f5a623', red:'#ef4f6a', blue:'#4d9de0',
};

const CATS = [
  { id:'all',        label:'All',        emoji:'' },
  { id:'sports',     label:'Sports',     emoji:'🏆' },
  { id:'crypto',     label:'Crypto',     emoji:'₿' },
  { id:'politics',   label:'Politics',   emoji:'🗳️' },
  { id:'technology', label:'Tech',       emoji:'🤖' },
  { id:'economics',  label:'Economics',  emoji:'📈' },
  { id:'world',      label:'World',      emoji:'🌍' },
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
    router.push('/scores?event=' + encodeURIComponent(q));
  };

  // Autocomplete
  useEffect(() => {
    const q = query.trim();
    if (!q || q.includes('polymarket.com') || q.length < 3) { setResults([]); setShowResults(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch('/api/search?q=' + encodeURIComponent(q));
        const d = await r.json();
        if (d.results?.length > 0) { setResults(d.results); setShowResults(true); }
        else { setResults([]); setShowResults(false); }
      } catch {}
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  // Load trending by category
  useEffect(() => {
    setLoading(true);
    setEvents([]);
    fetch('/api/trending?category=' + category)
      .then(r => r.json())
      .then(d => { setEvents(d.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  const fmtVol = (v: number) => v >= 1_000_000 ? '$' + (v/1_000_000).toFixed(1) + 'M' : v >= 1_000 ? '$' + (v/1_000).toFixed(0) + 'K' : '$' + v;

  return (
    <div style={{background:C.bg0, minHeight:'100vh', color:C.t1, fontFamily:"'Inter',system-ui,sans-serif"}}>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>router.push('/')}>
          <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="9" fill="#0e0e18"/>
            <rect x="6" y="24" width="3" height="6" rx="1.5" fill="#2e2c44"/>
            <rect x="11" y="20" width="3" height="10" rx="1.5" fill="#3a3860"/>
            <rect x="16" y="16" width="3" height="14" rx="1.5" fill="#564ea0"/>
            <rect x="21" y="11" width="3" height="19" rx="1.5" fill="#7c6ff7"/>
            <rect x="26" y="7" width="3" height="23" rx="1.5" fill="#a89cf8"/>
            <line x1="9" y1="23" x2="6.5" y2="30" stroke="#4a4880" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="23" x2="11.5" y2="30" stroke="#4a4880" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M 7.5 19 Q 14 10 27.5 7.5" fill="none" stroke="#2ecc8a" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="7.5" cy="19" r="3" fill="#ef4f6a"/>
            <circle cx="27.5" cy="7" r="2.5" fill="#2ecc8a"/>
          </svg>
          <div>
            <div style={{fontSize:17,fontWeight:900,letterSpacing:'-0.6px',lineHeight:1}}>PlayPicks</div>
            <div style={{fontSize:9,fontWeight:700,color:C.purpleL,letterSpacing:'1.5px',textTransform:'uppercase',lineHeight:1,marginTop:3}}>AI</div>
          </div>
        </div>
        <div style={{display:'flex',gap:4}}>
          <button onClick={()=>router.push('/journal')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Journal</button>
          <button onClick={()=>router.push('/sources')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Sources</button>
          <button onClick={()=>router.push('/profile')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Profile</button>
        </div>
      </nav>

      <div style={{paddingTop:52}}>

        {/* HERO */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'56px 24px 36px',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:800,height:500,background:'radial-gradient(ellipse,rgba(124,111,247,0.07) 0%,transparent 65%)',pointerEvents:'none'}}/>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase',marginBottom:20}}>
            <span style={{width:5,height:5,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #ef4f6a'}}/>
            Live AI predictions
          </div>
          <h1 style={{fontSize:'clamp(36px,5.5vw,64px)',fontWeight:800,letterSpacing:'-2.5px',lineHeight:1.02,marginBottom:14,maxWidth:640}}>
            AI odds for anything<br/><span style={{color:C.purpleL}}>happening right now.</span>
          </h1>
          <p style={{fontSize:15,color:C.t2,maxWidth:420,lineHeight:1.7,marginBottom:28}}>
            Ask any question. Get AI probability from real news, social signals and live market data.
          </p>

          {/* SEARCH */}
          <div style={{width:'100%',maxWidth:580,position:'relative',marginBottom:8}}>
            <div style={{position:'relative'}}>
              <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&query.trim()&&go(query.trim())}
                placeholder="Ask anything — Will India win? Will Bitcoin hit $100k?"
                autoFocus
                style={{width:'100%',padding:'15px 130px 15px 18px',background:C.bg2,border:'1px solid '+C.border2,borderRadius:14,color:C.t1,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}/>
              <button onClick={()=>query.trim()&&go(query.trim())} disabled={isAnalyzing||!query.trim()}
                style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:C.purple,color:'white',border:'none',borderRadius:10,padding:'8px 18px',fontSize:13,fontWeight:600,cursor:'pointer',opacity:(!query.trim()||isAnalyzing)?0.5:1,whiteSpace:'nowrap' as const}}>
                {isAnalyzing ? '...' : 'Analyze'}
              </button>
            </div>
            {showResults && results.length > 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:C.bg2,border:'1px solid '+C.border2,borderRadius:12,overflow:'hidden',zIndex:50,boxShadow:'0 16px 40px rgba(0,0,0,0.6)'}}>
                {results.map((r,i)=>(
                  <button key={i} onClick={()=>go(r.url)} style={{width:'100%',padding:'10px 16px',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left' as const}}
                    onMouseEnter={e=>(e.currentTarget.style.background=C.bg3)} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                    <div style={{fontSize:12,color:C.t1,fontWeight:500,marginBottom:1}}>{r.title}</div>
                    <div style={{fontSize:10,color:C.t3}}>{fmtVol(r.volume)} vol</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={{fontSize:11,color:C.t3}}>Type anything or paste a Polymarket URL</p>
        </div>

        {/* SCROLLING TICKER - uses live events, no hardcoded bias */}
        {events.length > 0 && (
        <div style={{overflow:'hidden',borderTop:'1px solid '+C.border,borderBottom:'1px solid '+C.border,padding:'10px 0',position:'relative'}}>
          <style>{`@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
          <div style={{display:'flex',gap:8,animation:'tickerScroll 60s linear infinite',width:'max-content'}}
            onMouseEnter={e=>(e.currentTarget.style.animationPlayState='paused')}
            onMouseLeave={e=>(e.currentTarget.style.animationPlayState='running')}>
            {[...events,...events].map((item,i)=>{
              const catC:Record<string,string> = {sports:'#2ecc8a',crypto:'#f5a623',politics:'#ef4f6a',technology:'#7c6ff7',economics:'#4d9de0',world:'#a89cf8',other:'#9996b8'};
              const col = catC[item.category] || '#9996b8';
              return (
                <button key={i} onClick={()=>go(item.url)}
                  style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',borderRadius:100,border:'1px solid '+C.border,background:C.bg2,cursor:'pointer',whiteSpace:'nowrap' as const,flexShrink:0,transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.background=C.bg3;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.bg2;}}>
                  <span style={{fontSize:13}}>{item.icon}</span>
                  <span style={{fontSize:11,fontWeight:500,color:C.t1,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis'}}>{item.title}</span>
                  <span style={{fontSize:9,color:col,fontWeight:600,padding:'1px 5px',borderRadius:4,background:col+'15'}}>{item.category}</span>
                  {item.yesPrice !== null && <span style={{fontSize:10,fontWeight:700,color:item.yesPrice>=50?'#2ecc8a':'#ef4f6a',fontFamily:'monospace'}}>{item.yesPrice}%</span>}
                  <span style={{fontSize:9,color:C.t3}}>{item.volume24hFormatted}</span>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* LIVE MARKETS */}
        <div style={{maxWidth:960,margin:'0 auto',padding:'0 24px 48px'}}>

          {/* TONIGHT'S MATCHES — today's games across all sports */}
          {(() => {
            const tonight = events.filter(e =>
              e.category === 'sports' &&
              e.title.toLowerCase().includes(' vs') &&
              e.marketCount >= 2
            ).slice(0, 6);
            if (tonight.length === 0) return null;
            return (
              <div style={{marginBottom:28}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <span style={{fontSize:16}}>🔥</span>
                  <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Tonight's matches</span>
                  <span style={{fontSize:11,color:C.t3}}>· click to get AI prediction + share</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {tonight.map(e => {
                    const parts = e.title.split(/\s+vs\.?\s+/i);
                    const team1 = parts[0]?.trim() || e.title;
                    const team2 = parts[1]?.trim() || '';
                    const waMsg = encodeURIComponent(`🏀 *${e.title}*\n\nGet AI prediction for tonight's match 👇\n${e.url}\n\n#PlayPicks`);
                    return (
                      <div key={e.slug} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column' as const,gap:8}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:6}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.t1,textAlign:'center' as const,lineHeight:1.3}}>{team1}</div>
                          <div style={{fontSize:10,fontWeight:800,color:C.t4,padding:'3px 8px',borderRadius:6,background:C.bg3}}>VS</div>
                          <div style={{fontSize:12,fontWeight:600,color:C.t1,textAlign:'center' as const,lineHeight:1.3}}>{team2}</div>
                        </div>
                        {e.yesPrice !== null && (
                          <div style={{textAlign:'center' as const,fontSize:10,color:C.t3}}>
                            Market: <span style={{color:e.yesPrice>=50?C.green:C.red,fontWeight:700}}>{e.yesPrice}%</span> {team1}
                          </div>
                        )}
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>go(e.url)}
                            style={{flex:2,padding:'7px',borderRadius:8,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,cursor:'pointer',fontSize:11,fontWeight:600}}>
                            🤖 AI prediction
                          </button>
                          <button onClick={()=>window.open('https://wa.me/?text='+waMsg,'_blank')}
                            style={{flex:1,padding:'7px',borderRadius:8,background:'rgba(37,211,102,0.08)',border:'1px solid rgba(37,211,102,0.2)',color:'#25d366',cursor:'pointer',fontSize:11,fontWeight:600}}>
                            Share
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Header + category tabs */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap' as const,gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:6,height:6,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #ef4f6a'}}/>
              <span style={{fontSize:13,fontWeight:700}}>Live markets</span>
              <span style={{fontSize:11,color:C.t3}}>· from Polymarket</span>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
              {CATS.map(c=>(
                <button key={c.id} onClick={()=>setCategory(c.id)}
                  style={{padding:'5px 14px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',
                    border:'1px solid '+(category===c.id ? C.purpleBorder : C.border),
                    background:category===c.id ? C.purpleBg : 'transparent',
                    color:category===c.id ? C.purpleL : C.t2}}>
                  {c.emoji ? c.emoji + ' ' : ''}{c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Events list */}
          {loading ? (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[...Array(6)].map((_,i)=>(
                <div key={i} style={{height:64,background:C.bg2,borderRadius:12,border:'1px solid '+C.border,opacity:0.2+i*0.1}}/>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:C.t3,fontSize:13}}>
              No live markets found for this category right now.
            </div>
          ) : (
            <>
              {/* TOP FEATURED — big image cards for top 3 */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
                {events.slice(0,3).map((e,i)=>{
                  const cs = CAT_COLORS[e.category] || CAT_COLORS.other;
                  const isYes = e.yesPrice !== null && e.yesPrice >= 50;
                  return (
                    <button key={e.slug} onClick={()=>go(e.url)}
                      style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:16,overflow:'hidden',cursor:'pointer',textAlign:'left' as const,transition:'all 0.15s',padding:0,display:'block',width:'100%'}}
                      onMouseEnter={ev=>{ev.currentTarget.style.borderColor=C.border2;ev.currentTarget.style.transform='translateY(-2px)';}}
                      onMouseLeave={ev=>{ev.currentTarget.style.borderColor=C.border;ev.currentTarget.style.transform='translateY(0)';}}>
                      {/* Image */}
                      <div style={{height:120,background:'linear-gradient(135deg,'+C.bg3+','+C.bg4+')',position:'relative',overflow:'hidden'}}>
                        {e.image ? (
                          <img src={e.image} alt={e.title} style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.85}} onError={ev=>{(ev.target as HTMLImageElement).style.display='none';}}/>
                        ) : (
                          <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48}}>{e.icon}</div>
                        )}
                        <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(6,6,10,0.9) 0%,transparent 60%)'}}/>
                        {/* Live badge */}
                        <div style={{position:'absolute',top:8,left:8,display:'flex',alignItems:'center',gap:4,background:'rgba(0,0,0,0.6)',padding:'3px 8px',borderRadius:100}}>
                          <span style={{width:5,height:5,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 4px #ef4f6a'}}/>
                          <span style={{fontSize:9,fontWeight:700,color:'#fff',textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>Live</span>
                        </div>
                        {/* YES price on image */}
                        {e.yesPrice !== null && (
                          <div style={{position:'absolute',top:8,right:8,background:isYes?'rgba(46,204,138,0.9)':'rgba(239,79,106,0.9)',padding:'4px 10px',borderRadius:8}}>
                            <span style={{fontSize:14,fontWeight:900,color:'#fff',fontFamily:'monospace'}}>{e.yesPrice}%</span>
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div style={{padding:'12px 14px'}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.t1,lineHeight:1.35,marginBottom:8,minHeight:32}}>{e.title}</div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:6,background:cs.bg,color:cs.color}}>{e.category}</span>
                            <span style={{fontSize:10,color:C.t3}}>{e.volume24hFormatted}/24h</span>
                          </div>
                          <span style={{fontSize:11,fontWeight:600,color:C.purple}}>AI odds →</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* REST — compact list */}
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {events.slice(3).map((e,i)=>{
                  const cs = CAT_COLORS[e.category] || CAT_COLORS.other;
                  const isYes = e.yesPrice !== null && e.yesPrice >= 50;
                  return (
                    <button key={e.slug} onClick={()=>go(e.url)}
                      style={{width:'100%',background:C.bg2,border:'1px solid '+C.border,borderRadius:10,padding:'10px 14px',cursor:'pointer',textAlign:'left' as const,transition:'all 0.1s',display:'flex',alignItems:'center',gap:12}}
                      onMouseEnter={ev=>{ev.currentTarget.style.background=C.bg3;ev.currentTarget.style.borderColor=C.border2;}}
                      onMouseLeave={ev=>{ev.currentTarget.style.background=C.bg2;ev.currentTarget.style.borderColor=C.border;}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.t4,minWidth:20,textAlign:'right' as const}}>{i+4}</div>
                      {e.image ? (
                        <img src={e.image} alt="" style={{width:32,height:32,borderRadius:6,objectFit:'cover',flexShrink:0}} onError={ev=>{(ev.target as HTMLImageElement).style.display='none';}}/>
                      ) : (
                        <div style={{fontSize:16,minWidth:32,textAlign:'center' as const}}>{e.icon}</div>
                      )}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:500,color:C.t1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{e.title}</div>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                          <span style={{fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:4,background:cs.bg,color:cs.color}}>{e.category}</span>
                          <span style={{fontSize:9,color:C.t3}}>{e.volume24hFormatted}/24h</span>
                          {e.marketCount > 1 && <span style={{fontSize:9,color:C.t3}}>{e.marketCount} outcomes</span>}
                        </div>
                      </div>
                      {e.yesPrice !== null && (
                        <div style={{flexShrink:0,textAlign:'center' as const,padding:'4px 10px',borderRadius:8,background:isYes?'rgba(46,204,138,0.1)':'rgba(239,79,106,0.1)',border:'1px solid '+(isYes?'rgba(46,204,138,0.2)':'rgba(239,79,106,0.2)')}}>
                          <div style={{fontSize:14,fontWeight:800,color:isYes?C.green:C.red,fontFamily:'monospace'}}>{e.yesPrice}%</div>
                        </div>
                      )}
                      <div style={{flexShrink:0,fontSize:10,fontWeight:600,color:C.purple,padding:'4px 10px',borderRadius:6,border:'1px solid '+C.purpleBorder,background:C.purpleBg}}>
                        AI odds →
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* HOW IT WORKS */}
        <div style={{borderTop:'1px solid '+C.border,padding:'64px 40px'}}>
          <h2 style={{fontSize:22,fontWeight:700,letterSpacing:'-0.5px',textAlign:'center',marginBottom:6}}>How it works</h2>
          <p style={{textAlign:'center',color:C.t2,fontSize:14,marginBottom:40}}>Three steps from question to conviction</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,maxWidth:900,margin:'0 auto 40px'}}>
            {[
              {n:'1',t:'Ask anything',d:'Type any question or paste a Polymarket URL. AI pulls live signals from news, social, and market data instantly.'},
              {n:'2',t:'Get AI probability',d:'See a confidence score with every source behind it. Plain English — no trader jargon. Tune signal weights yourself.'},
              {n:'3',t:'Track your record',d:'Every prediction saved in your journal with the AI snapshot. See if your picks actually work over time.'},
            ].map(s=>(
              <div key={s.n} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'22px'}}>
                <div style={{width:30,height:30,background:C.purpleBg,border:'1px solid '+C.purpleBorder,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:C.purple,marginBottom:14}}>{s.n}</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{s.t}</div>
                <div style={{fontSize:12,color:C.t2,lineHeight:1.65}}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,maxWidth:900,margin:'0 auto'}}>
            {[
              {t:'Multi-source signals',d:'NewsAPI, GDELT, HackerNews, Metaculus and live Polymarket odds — all in one place.'},
              {t:'Custom weights',d:'Trust markets more? Bump the weight. Sports fan? Weight your sources higher.'},
              {t:'Any question',d:'Sports, crypto, politics, tech — if the world is predicting it, PlayPicks can analyze it.'},
              {t:'Prediction journal',d:'Every analysis logged with AI conviction snapshot. Track your edge over time.',link:true},
            ].map((f,i)=>(
              <div key={i} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px'}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:5,color:C.t1}}>{f.t}</div>
                <div style={{fontSize:11,color:C.t2,lineHeight:1.6}}>{f.d}</div>
                {f.link && <button onClick={()=>router.push('/journal')} style={{marginTop:8,fontSize:11,color:C.amber,background:'none',border:'none',cursor:'pointer',padding:0}}>View journal →</button>}
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{borderTop:'1px solid '+C.border,padding:'14px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:C.t3}}>Not financial advice. Research only.</span>
          <div style={{display:'flex',gap:16}}>
            <button onClick={()=>router.push('/journal')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer'}}>Journal</button>
            <button onClick={()=>router.push('/sources')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer'}}>Sources</button>
            <span style={{fontSize:11,color:C.t4}}>PlayPicks AI</span>
          </div>
        </div>

      </div>
    </div>
  );
}
