'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult { slug:string; title:string; url:string; volume:number; endDate:string; markets:number; }
interface TrendingEvent {
  slug:string; title:string; url:string; volume:number; volumeFormatted:string;
  category:string; icon:string; yesPrice:number|null; marketCount:number;
}

const C = {
  bg0:'#06060a',bg1:'#0e0e14',bg2:'#14141c',bg3:'#1a1a24',bg4:'#22222e',
  border:'rgba(255,255,255,0.06)',border2:'rgba(255,255,255,0.1)',
  t1:'#f2f0ff',t2:'#9996b8',t3:'#5c5a78',t4:'#2e2c44',
  purple:'#7c6ff7',purpleL:'#a89cf8',purpleBg:'rgba(124,111,247,0.1)',purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a',amber:'#f5a623',red:'#ef4f6a',blue:'#4d9de0',
};

const CATEGORIES = [
  { id:'all', label:'All' },
  { id:'sports', label:'🏆 Sports' },
  { id:'crypto', label:'₿ Crypto' },
  { id:'politics', label:'🗳️ Politics' },
  { id:'technology', label:'🤖 Tech' },
  { id:'economics', label:'📈 Economics' },
  { id:'geopolitics', label:'🌍 World' },
];

const CAT_COLORS: Record<string,{color:string;bg:string}> = {
  sports:     {color:'#2ecc8a',bg:'rgba(46,204,138,0.1)'},
  crypto:     {color:'#f5a623',bg:'rgba(245,166,35,0.1)'},
  politics:   {color:'#ef4f6a',bg:'rgba(239,79,106,0.1)'},
  technology: {color:'#7c6ff7',bg:'rgba(124,111,247,0.1)'},
  economics:  {color:'#4d9de0',bg:'rgba(77,157,224,0.1)'},
  geopolitics:{color:'#a89cf8',bg:'rgba(168,156,248,0.1)'},
  other:      {color:'#9996b8',bg:'rgba(153,150,184,0.08)'},
};

// Hot questions always visible — no loading needed
const HOT_QUESTIONS = [
  { q:'Will Mumbai Indians win IPL 2025?',      cat:'sports',     emoji:'🏏' },
  { q:'Will OKC Thunder win the NBA championship?', cat:'sports',  emoji:'🏀' },
  { q:'Will Bitcoin hit $100k before June?',    cat:'crypto',     emoji:'₿'  },
  { q:'Will Trump impose new tariffs in April?', cat:'politics',  emoji:'🗳️' },
  { q:'Which AI company will lead by end of 2025?', cat:'technology', emoji:'🤖' },
  { q:'Will the Fed cut rates in May 2025?',    cat:'economics',  emoji:'📈' },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery]             = useState('');
  const [isAnalyzing, setAnalyzing]   = useState(false);
  const [results, setResults]         = useState<SearchResult[]>([]);
  const [searching, setSearching]     = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [trending, setTrending]       = useState<TrendingEvent[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [activeCategory, setActiveCategory]   = useState('all');
  const timer = useRef<NodeJS.Timeout|null>(null);

  const isUrl = (q:string) => q.includes('polymarket.com/event/');

  useEffect(() => {
    if (!query.trim() || isUrl(query) || query.trim().length < 3) { setResults([]); setShowResults(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch('/api/search?q='+encodeURIComponent(query.trim()));
        const d = await r.json();
        if (d.results?.length > 0) { setResults(d.results); setShowResults(true); }
        else { setResults([]); setShowResults(false); }
      } catch {}
      setSearching(false);
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  useEffect(() => {
    setTrendingLoading(true);
    const url = '/api/trending' + (activeCategory !== 'all' ? '?category='+activeCategory : '');
    fetch(url)
      .then(r => r.json())
      .then(d => { setTrending(d.results || []); setTrendingLoading(false); })
      .catch(() => setTrendingLoading(false));
  }, [activeCategory]);

  const go = (q:string) => { setAnalyzing(true); setShowResults(false); router.push('/scores?event='+encodeURIComponent(q)); };
  const fmtVol = (v:number) => v>=1_000_000?'$'+(v/1_000_000).toFixed(1)+'M':v>=1_000?'$'+(v/1_000).toFixed(0)+'K':'$'+v;

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>router.push('/')}>
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
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
            <div style={{fontSize:14,fontWeight:800,letterSpacing:'-0.4px',lineHeight:1}}>PlayPicks</div>
            <div style={{fontSize:8,fontWeight:600,color:C.purpleL,letterSpacing:'1px',textTransform:'uppercase',lineHeight:1,marginTop:2}}>AI</div>
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
                style={{width:'100%',padding:'15px 130px 15px 18px',background:C.bg2,border:'1px solid '+C.border2,borderRadius:14,color:C.t1,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
              <button onClick={()=>query.trim()&&go(query.trim())} disabled={isAnalyzing||!query.trim()}
                style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:C.purple,color:'white',border:'none',borderRadius:10,padding:'8px 18px',fontSize:13,fontWeight:600,cursor:'pointer',opacity:(!query.trim()||isAnalyzing)?0.5:1,whiteSpace:'nowrap'}}>
                {isAnalyzing?'...':'Analyze'}
              </button>
            </div>
            {showResults && results.length > 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:C.bg2,border:'1px solid '+C.border2,borderRadius:12,overflow:'hidden',zIndex:50,boxShadow:'0 16px 40px rgba(0,0,0,0.6)'}}>
                {results.map((r,i)=>(
                  <button key={i} onClick={()=>go(r.url)} style={{width:'100%',padding:'10px 16px',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left'}}
                    onMouseEnter={e=>(e.currentTarget.style.background=C.bg3)} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                    <div style={{fontSize:12,color:C.t1,fontWeight:500,marginBottom:1}}>{r.title}</div>
                    <div style={{fontSize:10,color:C.t3}}>{fmtVol(r.volume)} vol</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={{fontSize:11,color:C.t3,marginBottom:0}}>Type anything or paste a Polymarket URL</p>
        </div>

        {/* HOT QUESTIONS — always visible, no loading */}
        <div style={{maxWidth:960,margin:'0 auto',padding:'0 24px 32px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
            <span style={{fontSize:12,fontWeight:700,color:C.t2}}>🔥 Try these</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {HOT_QUESTIONS.map((hq,i)=>{
              const cs = CAT_COLORS[hq.cat] || CAT_COLORS.other;
              return (
                <button key={i} onClick={()=>go(hq.q)}
                  style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'12px 14px',textAlign:'left',cursor:'pointer',transition:'all 0.15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.background=C.bg3;e.currentTarget.style.borderColor=C.border2;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=C.bg2;e.currentTarget.style.borderColor=C.border;}}>
                  <div style={{fontSize:16,marginBottom:6}}>{hq.emoji}</div>
                  <div style={{fontSize:12,fontWeight:500,color:C.t1,lineHeight:1.4,marginBottom:6}}>{hq.q}</div>
                  <div style={{display:'inline-block',fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:6,background:cs.bg,color:cs.color}}>{hq.cat}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* LIVE MARKETS FEED */}
        <div style={{maxWidth:960,margin:'0 auto',padding:'0 24px 80px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:6,height:6,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #ef4f6a'}}/>
              <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Live markets</span>
              <span style={{fontSize:11,color:C.t3}}>· from Polymarket</span>
            </div>
          </div>

          {/* Category tabs */}
          <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
            {CATEGORIES.map(cat=>(
              <button key={cat.id} onClick={()=>setActiveCategory(cat.id)}
                style={{padding:'5px 14px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid '+(activeCategory===cat.id?C.purpleBorder:C.border),background:activeCategory===cat.id?C.purpleBg:'transparent',color:activeCategory===cat.id?C.purpleL:C.t2,transition:'all 0.15s'}}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Markets list */}
          {trendingLoading ? (
            <div style={{display:'grid',gap:8}}>
              {[...Array(6)].map((_,i)=>(
                <div key={i} style={{height:64,background:C.bg2,borderRadius:12,border:'1px solid '+C.border,opacity:0.2+i*0.12}}/>
              ))}
            </div>
          ) : trending.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0'}}>
              <div style={{fontSize:13,color:C.t3,marginBottom:12}}>No live markets found right now</div>
              <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                {HOT_QUESTIONS.filter(h=>activeCategory==='all'||h.cat===activeCategory).slice(0,3).map((hq,i)=>(
                  <button key={i} onClick={()=>go(hq.q)}
                    style={{padding:'8px 16px',borderRadius:10,background:C.bg2,border:'1px solid '+C.border2,color:C.t2,fontSize:12,cursor:'pointer'}}>
                    {hq.emoji} {hq.q.slice(0,30)}...
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{display:'grid',gap:8}}>
              {trending.map((event,i)=>{
                const cs = CAT_COLORS[event.category] || CAT_COLORS.other;
                const isYes = event.yesPrice !== null && event.yesPrice >= 50;
                return (
                  <button key={i} onClick={()=>go(event.url)}
                    style={{width:'100%',background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px 16px',cursor:'pointer',textAlign:'left',transition:'all 0.15s',display:'flex',alignItems:'center',gap:14}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.bg3;e.currentTarget.style.borderColor=C.border2;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=C.bg2;e.currentTarget.style.borderColor=C.border;}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.t4,minWidth:18,textAlign:'right'}}>{i+1}</div>
                    <div style={{fontSize:16,minWidth:24,textAlign:'center'}}>{event.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:C.t1,lineHeight:1.35,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{event.title}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                        <span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:6,background:cs.bg,color:cs.color}}>{event.category}</span>
                        <span style={{fontSize:10,color:C.t3}}>{event.volumeFormatted} vol</span>
                        {event.marketCount > 1 && <span style={{fontSize:10,color:C.t3}}>{event.marketCount} outcomes</span>}
                      </div>
                    </div>
                    {/* YES odds pill — human friendly */}
                    {event.yesPrice !== null && !isNaN(event.yesPrice) && (
                      <div style={{flexShrink:0,textAlign:'center',padding:'6px 12px',borderRadius:10,background:isYes?'rgba(46,204,138,0.1)':'rgba(239,79,106,0.1)',border:'1px solid '+(isYes?'rgba(46,204,138,0.2)':'rgba(239,79,106,0.2)')}}>
                        <div style={{fontSize:15,fontWeight:800,color:isYes?C.green:C.red,fontFamily:'monospace'}}>{event.yesPrice}%</div>
                        <div style={{fontSize:9,color:C.t3,marginTop:1}}>chance YES</div>
                      </div>
                    )}
                    <div style={{flexShrink:0,fontSize:11,fontWeight:600,color:C.purple,padding:'6px 12px',borderRadius:8,border:'1px solid '+C.purpleBorder,background:C.purpleBg}}>
                      Get AI odds →
                    </div>
                  </button>
                );
              })}
            </div>
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
              {t:'Custom weights',d:'Trust markets more? Bump the weight. Sports fan? Weight Cricbuzz higher. Your call.'},
              {t:'Any question',d:'Sports, crypto, politics, tech — if the world is predicting it, PlayPicks can analyze it.'},
              {t:'Prediction journal',d:'Every analysis logged with AI conviction snapshot. Track your edge over time.',link:true},
            ].map((f,i)=>(
              <div key={i} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px'}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:5,color:C.t1}}>{f.t}</div>
                <div style={{fontSize:11,color:C.t2,lineHeight:1.6}}>{f.d}</div>
                {f.link&&<button onClick={()=>router.push('/journal')} style={{marginTop:8,fontSize:11,color:C.amber,background:'none',border:'none',cursor:'pointer',padding:0}}>View journal →</button>}
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
