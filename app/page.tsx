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

const CAT_COLORS: Record<string, { color:string; bg:string }> = {
  sports:     { color:'#2ecc8a', bg:'rgba(46,204,138,0.12)' },
  crypto:     { color:'#f5a623', bg:'rgba(245,166,35,0.12)' },
  politics:   { color:'#ef4f6a', bg:'rgba(239,79,106,0.12)' },
  technology: { color:'#7c6ff7', bg:'rgba(124,111,247,0.12)' },
  economics:  { color:'#4d9de0', bg:'rgba(77,157,224,0.12)' },
  geopolitics:{ color:'#a89cf8', bg:'rgba(168,156,248,0.12)' },
  other:      { color:'#9996b8', bg:'rgba(153,150,184,0.1)' },
};

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
    // For sports use the dedicated sports API which has better sport detection
    const url = activeCategory === 'sports'
      ? '/api/sports'
      : activeCategory === 'all'
      ? '/api/trending'
      : '/api/trending?category='+activeCategory;
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
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:56,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px'}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>router.push('/')}>
          <div style={{
            width:32,height:32,borderRadius:9,
            background:'linear-gradient(135deg,#7c6ff7 0%,#a89cf8 100%)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:16,fontWeight:900,color:'white',
            boxShadow:'0 0 16px rgba(124,111,247,0.4)',
            letterSpacing:'-0.5px',
          }}>P</div>
          <div>
            <div style={{fontSize:15,fontWeight:800,letterSpacing:'-0.5px',lineHeight:1}}>PlayPicks</div>
            <div style={{fontSize:9,fontWeight:600,color:C.purpleL,letterSpacing:'0.8px',textTransform:'uppercase',lineHeight:1,marginTop:2}}>AI</div>
          </div>
        </div>
        <div style={{display:'flex',gap:2}}>
          <button onClick={()=>router.push('/journal')} style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Journal</button>
          <button onClick={()=>router.push('/sources')} style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Sources</button>
          <button onClick={()=>router.push('/profile')} style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Profile</button>
        </div>
      </nav>

      <div style={{paddingTop:56}}>
        {/* HERO */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'68px 24px 44px',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:900,height:600,background:'radial-gradient(ellipse,rgba(124,111,247,0.08) 0%,transparent 65%)',pointerEvents:'none'}}></div>

          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase',marginBottom:24}}>
            <span style={{width:5,height:5,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #ef4f6a'}}></span>
            Live AI predictions
          </div>

          <h1 style={{fontSize:'clamp(38px,6vw,68px)',fontWeight:800,letterSpacing:'-2.5px',lineHeight:1.02,marginBottom:14,maxWidth:680}}>
            AI odds for anything<br /><span style={{color:C.purpleL}}>happening right now.</span>
          </h1>
          <p style={{fontSize:15,color:C.t2,maxWidth:440,lineHeight:1.75,marginBottom:36}}>
            Ask any question or paste a Polymarket link. Get AI-powered probability from real news, social, and market signals. Tune the weights yourself.
          </p>

          {/* SEARCH */}
          <div style={{width:'100%',maxWidth:620,position:'relative',marginBottom:10}}>
            <div style={{position:'relative'}}>
              <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&query.trim()&&go(query.trim())}
                placeholder="Ask anything — IPL, NBA, crypto, politics..."
                autoFocus
                style={{width:'100%',padding:'16px 140px 16px 20px',background:C.bg2,border:'1px solid '+C.border2,borderRadius:16,color:C.t1,fontSize:14,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}} />
              <button onClick={()=>query.trim()&&go(query.trim())} disabled={isAnalyzing||!query.trim()}
                style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',background:C.purple,color:'white',border:'none',borderRadius:10,padding:'8px 20px',fontSize:13,fontWeight:600,cursor:'pointer',opacity:(!query.trim()||isAnalyzing)?0.5:1,whiteSpace:'nowrap'}}>
                {isAnalyzing?'Analyzing...':'Analyze'}
              </button>
            </div>
            {showResults && results.length > 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:C.bg2,border:'1px solid '+C.border2,borderRadius:12,overflow:'hidden',zIndex:50,boxShadow:'0 16px 40px rgba(0,0,0,0.6)'}}>
                <div style={{padding:'7px 16px',borderBottom:'1px solid '+C.border,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:10,color:C.t3,textTransform:'uppercase',letterSpacing:'0.5px'}}>Live Polymarket markets</span>
                  {searching&&<span style={{fontSize:10,color:C.purple}}>Searching...</span>}
                </div>
                {results.map((r,i)=>(
                  <button key={i} onClick={()=>go(r.url)} style={{width:'100%',padding:'10px 16px',background:'none',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left'}}
                    onMouseEnter={e=>(e.currentTarget.style.background=C.bg3)} onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                    <div style={{fontSize:12,color:C.t1,fontWeight:500,marginBottom:2}}>{r.title}</div>
                    <div style={{fontSize:10,color:C.t3}}>{fmtVol(r.volume)} volume</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={{fontSize:11,color:C.t3}}>Type a question or paste a Polymarket URL</p>
        </div>

        {/* UNIFIED FEED */}
        <div style={{maxWidth:960,margin:'0 auto',padding:'0 24px 80px'}}>
          {/* Header */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
            <span style={{width:6,height:6,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #ef4f6a'}}></span>
            <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Trending now</span>
            <span style={{fontSize:11,color:C.t3}}>· live markets</span>
          </div>

          {/* Category tabs */}
          <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
            {CATEGORIES.map(cat=>(
              <button key={cat.id} onClick={()=>setActiveCategory(cat.id)}
                style={{padding:'5px 14px',borderRadius:100,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid '+(activeCategory===cat.id?C.purpleBorder:C.border),background:activeCategory===cat.id?C.purpleBg:'transparent',color:activeCategory===cat.id?C.purpleL:C.t2,transition:'all 0.15s'}}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Cards */}
          {trendingLoading ? (
            <div style={{display:'grid',gap:8}}>
              {[...Array(8)].map((_,i)=>(
                <div key={i} style={{height:72,background:C.bg2,borderRadius:12,border:'1px solid '+C.border,opacity:0.2+i*0.08}}/>
              ))}
            </div>
          ) : trending.length === 0 ? (
            <div style={{textAlign:'center',padding:'48px 0',color:C.t3,fontSize:13}}>
              No live markets in this category right now.
            </div>
          ) : (
            <div style={{display:'grid',gap:8}}>
              {trending.map((event,i)=>{
                const catStyle = CAT_COLORS[event.category] || CAT_COLORS.other;
                return (
                  <button key={i} onClick={()=>go(event.url)}
                    style={{width:'100%',background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px 16px',cursor:'pointer',textAlign:'left',transition:'all 0.15s',display:'flex',alignItems:'center',gap:14}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.bg3;e.currentTarget.style.borderColor=C.border2;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=C.bg2;e.currentTarget.style.borderColor=C.border;}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.t3,minWidth:20,textAlign:'right'}}>{i+1}</div>
                    <div style={{fontSize:18,minWidth:26,textAlign:'center'}}>{event.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:500,color:C.t1,lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{event.title}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                        <span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:6,background:catStyle.bg,color:catStyle.color}}>{event.category}</span>
                        <span style={{fontSize:10,color:C.t3}}>{event.volumeFormatted} vol</span>
                        {event.marketCount > 1 && <span style={{fontSize:10,color:C.t3}}>{event.marketCount} markets</span>}
                      </div>
                    </div>
                    {event.yesPrice !== null && (
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:16,fontWeight:700,color:event.yesPrice>=50?C.green:C.red}}>{event.yesPrice}%</div>
                        <div style={{fontSize:9,color:C.t3,marginTop:1}}>YES odds</div>
                      </div>
                    )}
                    <div style={{flexShrink:0,fontSize:11,fontWeight:600,color:C.purple,padding:'5px 10px',borderRadius:8,border:'1px solid '+C.purpleBorder,background:C.purpleBg,whiteSpace:'nowrap'}}>
                      Analyze
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* HOW IT WORKS */}
        <div style={{borderTop:'1px solid '+C.border,padding:'72px 40px'}}>
          <h2 style={{fontSize:22,fontWeight:700,letterSpacing:'-0.5px',textAlign:'center',marginBottom:8}}>How it works</h2>
          <p style={{textAlign:'center',color:C.t2,fontSize:14,marginBottom:40}}>Three steps from question to conviction</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,maxWidth:900,margin:'0 auto 48px'}}>
            {[
              {n:'1',t:'Ask anything',d:'Type any question or paste a Polymarket URL. AI pulls live signals from news, social, and market data.'},
              {n:'2',t:'Get AI probability',d:'See a confidence score with the sources behind it. Tune signal weights to match what you trust.'},
              {n:'3',t:'Track your record',d:'Every prediction logged in your journal. See if following the AI edge actually works over time.'},
            ].map(s=>(
              <div key={s.n} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'20px'}}>
                <div style={{width:30,height:30,background:C.purpleBg,border:'1px solid '+C.purpleBorder,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:C.purple,marginBottom:12}}>{s.n}</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{s.t}</div>
                <div style={{fontSize:12,color:C.t2,lineHeight:1.6}}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,maxWidth:900,margin:'0 auto'}}>
            {[
              {t:'Multi-source signals',d:'NewsAPI, GDELT, HackerNews, Metaculus and live Polymarket odds all in one view.'},
              {t:'Custom weights',d:'Trust markets more? Bump the market weight. Sports fan? Weight your sources higher.'},
              {t:'Any question',d:'Sports, crypto, politics, tech — if the world is predicting it, PlayPicks can analyze it.'},
              {t:'Prediction journal',d:'Every analysis logged with the AI conviction snapshot. Track your edge over time.',link:true},
            ].map((f,i)=>(
              <div key={i} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px'}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:5,color:C.t1}}>{f.t}</div>
                <div style={{fontSize:11,color:C.t2,lineHeight:1.6}}>{f.d}</div>
                {f.link&&<button onClick={()=>router.push('/journal')} style={{marginTop:8,fontSize:11,color:C.amber,background:'none',border:'none',cursor:'pointer',padding:0}}>View journal</button>}
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{borderTop:'1px solid '+C.border,padding:'16px 28px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:C.t3}}>Not financial advice. Research purposes only.</span>
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <button onClick={()=>router.push('/journal')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer'}}>Journal</button>
            <button onClick={()=>router.push('/sources')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer'}}>Sources</button>
            <button onClick={()=>router.push('/profile')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer'}}>Profile</button>
            <span style={{fontSize:11,color:C.t4}}>PlayPicks AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
