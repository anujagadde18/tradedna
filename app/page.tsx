'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult { slug:string; title:string; url:string; volume:number; endDate:string; markets:number; }
interface TrendingEvent {
  slug:string; title:string; url:string; volume:number; volumeFormatted:string;
  category:string; icon:string; yesPrice:number|null; marketCount:number;
  image:string|null; volume24h:number; volume24hFormatted:string;
  team1:string|null; team2:string|null; endDate:string;
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
  const [iplMatches, setIplMatches] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [followedTeams, setFollowedTeams] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pp_followed_teams');
      if (saved) setFollowedTeams(JSON.parse(saved));
      const seen = localStorage.getItem('pp_onboarded');
      if (!seen) setShowOnboarding(true);
    } catch {}
  }, []);

  const toggleFollow = (team: string) => {
    try {
      const current = JSON.parse(localStorage.getItem('pp_followed_teams') || '[]');
      const updated = current.includes(team)
        ? current.filter((t: string) => t !== team)
        : [...current, team];
      localStorage.setItem('pp_followed_teams', JSON.stringify(updated));
      setFollowedTeams(updated);
    } catch {}
  };

  const dismissOnboarding = () => {
    try { localStorage.setItem('pp_onboarded', '1'); } catch {}
    setShowOnboarding(false);
  };
  const timer = useRef<NodeJS.Timeout|null>(null);

  const go = (q: string) => {
    setAnalyzing(true);
    setShowResults(false);
    router.push('/scores?event=' + encodeURIComponent(q));
  };

  // Autocomplete
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

  // Load trending — fetch directly from Polymarket on client to bypass server geoblock
  useEffect(() => {
    setLoading(true);
    setEvents([]);

    const catFilter: Record<string,string[]> = {
      sports:     ['nba','nfl','ipl','cricket','basketball','football','soccer','tennis','golf','nhl','mlb','ufc','fifa','masters','champions league','f1','formula'],
      crypto:     ['bitcoin','btc','ethereum','eth','crypto','solana','doge','coinbase'],
      politics:   ['election','president','trump','biden','congress','senate','governor','vote','democrat','republican'],
      tech:       ['ai','openai','apple','google','tesla','spacex','microsoft','meta','nvidia'],
      economics:  ['fed','rate','gdp','inflation','recession','tariff','oil','market','s&p','nasdaq'],
      world:      ['iran','china','russia','ukraine','war','ceasefire','nato','israel','india'],
    };

    const keywords = category !== 'all' ? (catFilter[category] || []) : [];

    fetch('/api/trending?category=' + category)
      .then(r => r.json())
      .then(d => { setEvents(d.results || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    // Fetch upcoming matches - show next 4 regardless of timezone
    fetch('/api/ipl').then(r=>r.json()).then(d=>{
      const todayStr = new Date().toISOString().slice(0,10);
      const filtered = (d.matches||[]).filter((m:any) => m.date >= todayStr).slice(0,4);
      setIplMatches(filtered);
    }).catch(()=>{});
  }, []);

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
          <button onClick={()=>router.push('/predict')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:600,color:C.green,border:'1px solid rgba(46,204,138,0.2)',background:'rgba(46,204,138,0.08)',cursor:'pointer'}}>🎯 Pick</button>
          <button onClick={()=>router.push('/leaderboard')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:600,color:C.amber,border:'1px solid rgba(245,166,35,0.2)',background:'rgba(245,166,35,0.08)',cursor:'pointer'}}>🏆 Board</button>
          <button onClick={()=>router.push('/journal')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Journal</button>
          <button onClick={()=>router.push('/sources')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Sources</button>
          <button onClick={()=>router.push('/profile')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Profile</button>
          <button onClick={()=>router.push('/f1')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:600,color:'#f5a623',border:'1px solid rgba(245,166,35,0.2)',background:'rgba(245,166,35,0.08)',cursor:'pointer'}}>🏎️ F1</button>
        </div>
      </nav>

      <div style={{paddingTop:52}}>

        {/* HERO */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'48px 24px 28px',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:900,height:600,background:'radial-gradient(ellipse,rgba(124,111,247,0.08) 0%,transparent 65%)',pointerEvents:'none'}}/>
          
          {/* Live badge */}
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,padding:'5px 14px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,marginBottom:20}}>
            <span style={{width:6,height:6,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 8px #ef4f6a'}}/>
            Live AI predictions · {new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})}
          </div>

          <h1 style={{fontSize:'clamp(40px,6vw,72px)',fontWeight:900,letterSpacing:'-3px',lineHeight:1.0,marginBottom:16,maxWidth:700}}>
            AI odds for any sport,<br/><span style={{color:C.purpleL}}>any market, right now.</span>
          </h1>
          <p style={{fontSize:15,color:C.t2,maxWidth:480,lineHeight:1.7,marginBottom:24}}>
            Cricket · NBA · F1 · Polymarket · Politics · Crypto<br/>
            Real signals. Public accuracy record. No black box.
          </p>

          {/* Feature pills — clickable */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,justifyContent:'center',marginBottom:28}}>
            {[
              {icon:'📊',text:'Probability breakdown',link:'/scores?event=Will+RCB+beat+KKR+in+IPL+2026%3F',color:'rgba(124,111,247,0.15)',border:'rgba(124,111,247,0.3)',tc:C.purpleL},
              {icon:'🎯',text:'Daily picks',link:'/picks',color:'rgba(46,204,138,0.1)',border:'rgba(46,204,138,0.25)',tc:C.green},
              {icon:'✅',text:'Public accuracy record',link:'/accuracy',color:'rgba(77,157,224,0.1)',border:'rgba(77,157,224,0.25)',tc:'#4d9de0'},
              {icon:'🔔',text:'Team alerts',link:'/predict',color:'rgba(245,166,35,0.1)',border:'rgba(245,166,35,0.25)',tc:C.amber},
            ].map((f,i)=>(
              <button key={i} onClick={()=>router.push(f.link)} style={{display:'flex',alignItems:'center',gap:6,background:f.color,border:'1px solid '+f.border,borderRadius:100,padding:'7px 14px',fontSize:12,fontWeight:600,color:f.tc,cursor:'pointer'}}>
                <span style={{fontSize:14}}>{f.icon}</span><span>{f.text}</span>
              </button>
            ))}
          </div>

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

          {/* UPCOMING MATCHES — next games across all sports */}
          {(() => {
            const now = new Date();
            const upcoming = events.filter(e => {
              if (e.category !== 'sports') return false;
              if (!e.title.toLowerCase().includes(' vs')) return false;
              if (e.marketCount < 2) return false;
              // Filter out finished games
              if (e.yesPrice === null || e.yesPrice === 0) return false;
              if (e.yesPrice >= 95 || e.yesPrice <= 5) return false;
              // Filter out ended games
              if (e.endDate && new Date(e.endDate) < now) return false;
              // Filter out completed IPL matches
              const etitle = e.title.toLowerCase();
              if (etitle.includes('lucknow super giants vs rajasthan royals')) return false;
              if (etitle.includes('sunrisers hyderabad vs delhi capitals')) return false;
              if (etitle.includes('gujarat titans vs mumbai indians')) return false;
              if (etitle.includes('punjab kings vs lucknow super giants')) return false;
              if (etitle.includes('kolkata knight riders vs rajasthan royals')) return false;
              if (etitle.includes('mumbai indians vs chennai super kings')) return false;
              // Filter out esports and individual sports (tennis, chess, boxing)
              const title = e.title.toLowerCase();
              const badTerms = ['lol:','league of legends','counter-strike','dota','bo3','bo5','lec','lpl','lck','esport','yi zhou','kotov','chess','busan','boxing','ufc','mma','vs pavel','vs yi','tennis','table tennis'];
              if (badTerms.some(t => title.includes(t))) return false;
              // Show all major team sports
              const goodSports = ['nba','nhl','mlb','nfl','ipl','cricket','premier league','champions league','la liga','bundesliga','serie a','madrid open','wimbledon','french open','atp','wta','formula','f1','grand prix','ufc 3','bellator'];
              const hasGoodSport = goodSports.some(s => e.slug?.includes(s.replace(/ /g,'-')) || title.includes(s));
              if (!hasGoodSport && !e.team1) return false;
              return true;
            }).slice(0, 6);
            if (upcoming.length === 0) return null;
            return (
              <div style={{marginBottom:28}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <span style={{fontSize:16}}>🔥</span>
                  <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Upcoming matches</span>
                  <span style={{fontSize:11,color:C.t3}}>· live odds from Polymarket</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {upcoming.map(e => {
                    const parts = e.title.split(/\s+vs\.?\s+/i);
                    const team1 = e.team1 || parts[0]?.trim() || e.title;
                    const team2 = e.team2 || parts[1]?.trim() || '';
                    const isYes = e.yesPrice !== null && e.yesPrice >= 50;
                    const winnerTeam = e.yesPrice !== null ? (isYes ? team1 : team2) : null;
                    const winnerOdds = e.yesPrice !== null ? (isYes ? e.yesPrice : 100 - e.yesPrice) : null;
                    const waMsg = encodeURIComponent(
                      `🏀 *${e.title}*\n\n` +
                      (winnerOdds ? `Market gives *${winnerTeam} ${winnerOdds}%* to win tonight\n\n` : '') +
                      `Get full AI prediction 👇\nhttps://tradedna-8sn1.vercel.app/scores?event=${encodeURIComponent(e.url)}\n\n#PlayPicks #AIodds`
                    );
                    return (
                      <div key={e.slug} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'12px 14px',display:'flex',flexDirection:'column' as const,gap:8}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:6}}>
                          <div style={{textAlign:'center' as const}}>
                            <div style={{fontSize:12,fontWeight:600,color:C.t1,lineHeight:1.3}}>{team1}</div>
                            {e.yesPrice !== null && <div style={{fontSize:13,fontWeight:800,color:isYes?C.green:C.t3,fontFamily:'monospace',marginTop:2}}>{e.yesPrice}%</div>}
                          </div>
                          <div style={{fontSize:10,fontWeight:800,color:C.t4,padding:'3px 8px',borderRadius:6,background:C.bg3}}>VS</div>
                          <div style={{textAlign:'center' as const}}>
                            <div style={{fontSize:12,fontWeight:600,color:C.t1,lineHeight:1.3}}>{team2}</div>
                            {e.yesPrice !== null && <div style={{fontSize:13,fontWeight:800,color:!isYes?C.red:C.t3,fontFamily:'monospace',marginTop:2}}>{100-e.yesPrice}%</div>}
                          </div>
                        </div>
                        <div style={{fontSize:9,color:C.t3,textAlign:'center' as const}}>{e.volume24hFormatted} traded today · {e.marketCount} outcomes</div>
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

          {/* FEATURED 3 — one sport, one world, one crypto */}
          {events.length > 0 && (() => {
            const sport = events.find(e => e.category === 'sports' && e.yesPrice !== null && e.title.toLowerCase().includes(' vs'))
              || events.find(e => e.category === 'sports' && e.yesPrice !== null)
              || events.find(e => e.category === 'sports');
            const world = events.find(e => e.category === 'economics')
              || events.find(e => e.category === 'world' && e.volume24h > 1000000);
            const crypto = events.find(e => e.category === 'crypto' && e.yesPrice !== null && e.yesPrice > 10 && e.yesPrice < 90)
              || events.find(e => e.category === 'politics' && e.yesPrice !== null)
              || events.find(e => e.category === 'crypto');
            const featured = [sport, world, crypto].filter(Boolean) as typeof events;
            if (featured.length === 0) return null;
            return (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                {featured.map((e,i) => {
                  const cs = CAT_COLORS[e.category]||CAT_COLORS.other;
                  const isYes = e.yesPrice !== null && e.yesPrice >= 50;
                  return (
                    <button key={e.slug} onClick={()=>go(e.url)}
                      style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:14,padding:'14px',cursor:'pointer',textAlign:'left' as const,transition:'all 0.15s'}}
                      onMouseEnter={ev=>{ev.currentTarget.style.borderColor=C.border2;ev.currentTarget.style.transform='translateY(-2px)';}}
                      onMouseLeave={ev=>{ev.currentTarget.style.borderColor=C.border;ev.currentTarget.style.transform='translateY(0)';}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                        <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:6,background:cs.bg,color:cs.color}}>{e.icon} {e.category}</span>
                        {e.yesPrice !== null && (
                          <span style={{fontSize:18,fontWeight:800,fontFamily:'monospace',color:isYes?C.green:C.red}}>{e.yesPrice}%</span>
                        )}
                      </div>
                      <div style={{fontSize:12,fontWeight:600,color:C.t1,lineHeight:1.4,marginBottom:8}}>
                        {e.title.slice(0,50)}{e.title.length>50?'…':''}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:10,color:C.t3}}>{e.volume24hFormatted}/24h</span>
                        <span style={{fontSize:10,fontWeight:600,color:C.purpleL}}>Get AI edge →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* PERSONALIZED — Your Teams */}
          {followedTeams.length > 0 && (() => {
            const myMatches = iplMatches.filter(m => 
              followedTeams.includes(m.home) || followedTeams.includes(m.away)
            );
            if (myMatches.length === 0) return null;
            return (
              <div style={{marginBottom:20,background:'linear-gradient(135deg,rgba(124,111,247,0.08),rgba(46,204,138,0.05))',border:'1px solid rgba(124,111,247,0.2)',borderRadius:14,padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <span style={{fontSize:14}}>🔔</span>
                  <span style={{fontSize:13,fontWeight:700,color:C.purpleL}}>Your teams today</span>
                  <span style={{fontSize:10,color:C.t3}}>· {followedTeams.join(', ')}</span>
                </div>
                {myMatches.map((m:any) => {
                  const waMsg = encodeURIComponent(
                    `🏏 Your team is playing today!

*${m.home} vs ${m.away}*
📍 ${m.venue} · ${m.time} IST

Get AI prediction 👇
https://tradedna.vercel.app/scores?event=${encodeURIComponent(`Will ${m.home} beat ${m.away} in IPL 2026?`)}

#PlayPicks #IPL2026`
                  );
                  return (
                    <div key={m.no} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{m.home} vs {m.away}</div>
                        <div style={{fontSize:11,color:C.t3}}>{m.time} IST · {m.venue}</div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>go(`Will ${m.home} beat ${m.away} in IPL 2026?`)}
                          style={{padding:'6px 12px',borderRadius:8,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,cursor:'pointer',fontSize:11,fontWeight:600,whiteSpace:'nowrap' as const}}>
                          🤖 AI pick
                        </button>
                        <button onClick={()=>window.open('https://wa.me/?text='+waMsg,'_blank')}
                          style={{padding:'6px 12px',borderRadius:8,background:'rgba(37,211,102,0.08)',border:'1px solid rgba(37,211,102,0.2)',color:'#25d366',cursor:'pointer',fontSize:11,whiteSpace:'nowrap' as const}}>
                          📲 Alert me
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* NBA PLAYOFFS — Round 2 */}
          {/* LIVE SPORTS CARDS — auto from Polymarket */}
          {(() => {
            const bad = ['esport','counter-strike','dota','lol:','valorant','prelim','ufc fight night','indian premier league:','roland garros atp:','roland garros wta:','atp:','wta:'];
            const liveCards = events.filter(e => {
              if (e.category !== 'sports') return false;
              const t = (e.title||'').toLowerCase();
              if (!t.includes(' vs')) return false;
              if (e.yesPrice === null || e.yesPrice === 0) return false;
              if (e.yesPrice >= 95 || e.yesPrice <= 5) return false;
              if (bad.some(b => t.includes(b))) return false;
              return true;
            }).slice(0,4).map(e => {
              const parts = e.title.split(/\s+vs\.?\s+/i);
              const yes = e.yesPrice ?? 50;
              return {
                home: parts[0]?.trim().slice(0,22) || e.title.slice(0,22),
                away: (parts[1]||'?').trim().slice(0,22),
                time: e.volume24hFormatted + ' traded',
                homePct: yes,
                awayPct: 100-yes,
                game: e.category,
                q: e.title,
              };
            });
            if (liveCards.length === 0) return null;
            return (
              <div style={{marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                  <span style={{fontSize:16}}>🏆</span>
                  <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Live Sports Markets</span>
                  <span style={{fontSize:11,color:C.t3}}>· from Polymarket</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                  {liveCards.map((m,i)=>(
                    <div key={i} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'12px 14px'}}>
                      <div style={{fontSize:9,color:C.t3,marginBottom:6,fontWeight:600}}>{m.game} · {m.time}</div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:6,marginBottom:10}}>
                        <div style={{textAlign:'center' as const}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.t1,lineHeight:1.3}}>{m.home}</div>
                          <div style={{fontSize:14,fontWeight:800,color:C.green,fontFamily:'monospace',marginTop:2}}>{m.homePct}%</div>
                        </div>
                        <div style={{fontSize:9,fontWeight:700,color:C.t4,padding:'3px 6px',borderRadius:4,background:C.bg3}}>VS</div>
                        <div style={{textAlign:'center' as const}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.t1,lineHeight:1.3}}>{m.away}</div>
                          <div style={{fontSize:14,fontWeight:800,color:C.t3,fontFamily:'monospace',marginTop:2}}>{m.awayPct}%</div>
                        </div>
                      </div>
                      <button onClick={()=>go(m.q)}
                        style={{width:'100%',padding:'6px',borderRadius:7,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,cursor:'pointer',fontSize:11,fontWeight:600}}>
                        🤖 AI prediction
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* PREDICTION CHALLENGE WIDGET */}
          <div style={{marginBottom:20,background:'linear-gradient(135deg,rgba(46,204,138,0.08),rgba(124,111,247,0.06))',border:'1px solid rgba(46,204,138,0.25)',borderRadius:16,padding:'18px 20px',cursor:'pointer'}} onClick={()=>router.push('/predict')}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:C.t1,marginBottom:3}}>🎯 Daily Prediction Challenge</div>
                <div style={{fontSize:12,color:C.t2}}>Pick winners · Earn points · Climb the leaderboard</div>
              </div>
              <div style={{textAlign:'right' as const}}>
                <div style={{fontSize:11,color:C.green,fontWeight:600}}>Make pick →</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {sport:'🏀',match:'Knicks vs Spurs G3',time:'Mon Jun 8 · 8:30 PM ET · MSG'},
                {sport:'⚽',match:'World Cup 2026',time:'Starts June 11!'},
              ].map((m,i)=>(
                <div key={i} style={{background:C.bg2,borderRadius:10,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:16}}>{m.sport}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:C.t1}}>{m.match}</div>
                    <div style={{fontSize:10,color:C.t3}}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* F1 CANADA RESULT + MONACO NEXT */}
          <div style={{marginBottom:20,background:'linear-gradient(135deg,rgba(245,166,35,0.06),rgba(124,111,247,0.04))',border:'1px solid rgba(245,166,35,0.15)',borderRadius:14,padding:'14px 16px',cursor:'pointer'}} onClick={()=>router.push('/f1')}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:24}}>🏎️</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1}}>🏎️ Antonelli WON Canada GP · Now Monaco June 5-7</div>
                  <div style={{fontSize:12,color:C.amber,fontWeight:600}}>4 wins from 5 races · Leads championship by 43pts</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>Circuit de Monaco · Round 6 · See driver odds</div>
                </div>
              </div>
              <span style={{fontSize:11,color:C.purpleL,fontWeight:600}}>Driver odds →</span>
            </div>
          </div>

          {/* IPL 2026 MATCHES — auto-updating from API */}
          {iplMatches.length > 0 && (
            <div style={{marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <span style={{fontSize:16}}>🏏</span>
                <span style={{fontSize:13,fontWeight:700,color:C.t1}}>IPL 2026</span>
                <span style={{fontSize:11,color:C.t3}}>· PLAYOFFS May 26-31</span>
                <button onClick={()=>router.push('/ipl')} style={{marginLeft:'auto',fontSize:10,color:C.purpleL,background:C.purpleBg,border:'1px solid '+C.purpleBorder,borderRadius:6,padding:'3px 10px',cursor:'pointer'}}>Full schedule →</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                {iplMatches.map((m:any) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isToday = m.date === today;
                  const waMsg = encodeURIComponent(`🏏 IPL 2026 Match ${m.no}\n\n*${m.home} vs ${m.away}*\n📍 ${m.venue} · ${m.time} IST\n\nGet AI prediction 👇\nhttps://tradedna-8sn1.vercel.app/scores?event=${encodeURIComponent(`Will ${m.home} beat ${m.away} in IPL 2026?`)}\n\n#IPL2026 #Cricket`);
                  return (
                    <div key={m.no} style={{background:C.bg2,border:'1px solid '+(isToday?'rgba(239,79,106,0.4)':C.border),borderRadius:12,padding:'12px 14px'}}>
                      {isToday && <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:8}}>
                        <span style={{width:5,height:5,borderRadius:'50%',background:C.red,display:'block',boxShadow:'0 0 4px #ef4f6a'}}/>
                        <span style={{fontSize:9,fontWeight:700,color:C.red,textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>Today · Match {m.no}</span>
                      </div>}
                      {!isToday && <div style={{fontSize:9,color:C.t3,marginBottom:6}}>Match {m.no} · {new Date(m.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</div>}
                      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:6,marginBottom:10}}>
                        <div style={{fontSize:11,fontWeight:600,color:C.t1,textAlign:'center' as const,lineHeight:1.3}}>{m.home}</div>
                        <div style={{fontSize:9,fontWeight:700,color:C.t4}}>VS</div>
                        <div style={{fontSize:11,fontWeight:600,color:C.t1,textAlign:'center' as const,lineHeight:1.3}}>{m.away}</div>
                      </div>
                      <div style={{fontSize:9,color:C.t3,textAlign:'center' as const,marginBottom:10}}>📍 {m.venue} · {m.time} IST</div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>go(`Will ${m.home} beat ${m.away} in IPL 2026?`)}
                          style={{flex:2,padding:'6px',borderRadius:7,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,cursor:'pointer',fontSize:11,fontWeight:600}}>
                          🤖 AI prediction
                        </button>
                        <button onClick={()=>window.open('https://wa.me/?text='+waMsg,'_blank')}
                          style={{flex:1,padding:'6px',borderRadius:7,background:'rgba(37,211,102,0.08)',border:'1px solid rgba(37,211,102,0.2)',color:'#25d366',cursor:'pointer',fontSize:11}}>
                          Share
                        </button>
                        <button onClick={()=>toggleFollow(m.home)}
                          style={{flex:1,padding:'6px',borderRadius:7,background:followedTeams.includes(m.home)?'rgba(124,111,247,0.2)':'rgba(124,111,247,0.08)',border:'1px solid '+(followedTeams.includes(m.home)?'rgba(124,111,247,0.4)':'rgba(124,111,247,0.2)'),color:C.purpleL,cursor:'pointer',fontSize:11}}>
                          {followedTeams.includes(m.home) ? '✓ Following' : '+ Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


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

          {loading ? (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[...Array(8)].map((_,i)=>(
                <div key={i} style={{height:52,background:C.bg2,borderRadius:8,border:'1px solid '+C.border,opacity:0.15+i*0.08}}/>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:C.t3,fontSize:13}}>No live markets found.</div>
          ) : (
            <div style={{border:'1px solid '+C.border,borderRadius:12,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'28px 1fr 72px 80px 88px',padding:'8px 14px',background:C.bg3,borderBottom:'1px solid '+C.border}}>
                {['#','Market','Odds','Volume',''].map((h,i)=>(
                  <div key={i} style={{fontSize:9,fontWeight:700,color:C.t4,textTransform:'uppercase' as const,letterSpacing:'0.5px',textAlign:i>=2?'center' as const:'left' as const}}>{h}</div>
                ))}
              </div>
              {events.slice(0,20).map((e,i)=>{
                const cs = CAT_COLORS[e.category]||CAT_COLORS.other;
                const isYes = e.yesPrice!==null && e.yesPrice>=50;
                const isStrong = e.yesPrice!==null && (e.yesPrice>=70||e.yesPrice<=30);
                return (
                  <button key={e.slug} onClick={()=>go(e.url)}
                    style={{width:'100%',display:'grid',gridTemplateColumns:'28px 1fr 72px 80px 88px',padding:'10px 14px',background:'transparent',border:'none',borderBottom:i<events.slice(0,20).length-1?'1px solid rgba(255,255,255,0.04)':'none',cursor:'pointer',textAlign:'left' as const,transition:'background 0.1s',alignItems:'center'}}
                    onMouseEnter={ev=>{ev.currentTarget.style.background=C.bg3;}}
                    onMouseLeave={ev=>{ev.currentTarget.style.background='transparent';}}>
                    <div style={{fontSize:10,fontWeight:600,color:C.t4}}>{i+1}</div>
                    <div style={{minWidth:0,paddingRight:8}}>
                      <div style={{fontSize:12,fontWeight:500,color:C.t1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const,marginBottom:2}}>
                        {e.title.slice(0,55)}{e.title.length>55?'…':''}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <span style={{fontSize:9,fontWeight:600,padding:'1px 6px',borderRadius:4,background:cs.bg,color:cs.color}}>{e.category}</span>
                
                      </div>
                    </div>
                    <div style={{textAlign:'center' as const}}>
                      {e.yesPrice!==null?(
                        <div>
                          <div style={{fontSize:13,fontWeight:800,fontFamily:'monospace',color:isStrong?(isYes?C.green:C.red):C.t2}}>{e.yesPrice}%</div>
                          <div style={{width:40,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,margin:'2px auto 0',overflow:'hidden'}}>
                            <div style={{height:'100%',background:isYes?C.green:C.red,width:e.yesPrice+'%',borderRadius:2}}/>
                          </div>
                        </div>
                      ):<span style={{fontSize:10,color:C.t4}}>—</span>}
                    </div>
                    <div style={{textAlign:'right' as const}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.t2,fontFamily:'monospace'}}>{e.volume24hFormatted}</div>
                      <div style={{fontSize:9,color:C.t4}}>24h</div>
                    </div>
                    <div style={{textAlign:'right' as const}}>
                      <span style={{fontSize:10,fontWeight:600,color:C.purpleL,padding:'4px 10px',borderRadius:6,border:'1px solid '+C.purpleBorder,background:C.purpleBg,whiteSpace:'nowrap' as const}}>
                        Get edge →
                      </span>
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
