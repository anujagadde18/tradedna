'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult { slug:string; title:string; url:string; volume:number; endDate:string; markets:number; }

const C = {
  bg0:'#06060a',bg1:'#0e0e14',bg2:'#14141c',bg3:'#1a1a24',bg4:'#22222e',
  border:'rgba(255,255,255,0.06)',border2:'rgba(255,255,255,0.1)',
  t1:'#f2f0ff',t2:'#9996b8',t3:'#5c5a78',
  purple:'#7c6ff7',purpleL:'#a89cf8',purpleBg:'rgba(124,111,247,0.1)',
  amber:'#f5a623',
};

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery]           = useState('');
  const [isAnalyzing, setAnalyzing] = useState(false);
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [showResults, setShowResults] = useState(false);
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

  const go = (q:string) => { setAnalyzing(true); setShowResults(false); router.push('/scores?event='+encodeURIComponent(q)); };
  const fmtVol = (v:number) => v>=1_000_000?'$'+(v/1_000_000).toFixed(1)+'M':v>=1_000?'$'+(v/1_000).toFixed(0)+'K':'$'+v;

  const examples = [
    {cat:'Technology',q:'Which company will have the top AI model by June 2026?'},
    {cat:'Geopolitics',q:'Will there be a US-Iran ceasefire?'},
    {cat:'Crypto',q:'Will Bitcoin hit $100k before April?'},
    {cat:'Economics',q:'Will the Fed cut rates in May?'},
  ];

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.9)',backdropFilter:'blur(16px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <div style={{fontSize:14,fontWeight:700,letterSpacing:'-0.3px'}}>PlayPicks AI</div>
        <div style={{display:'flex',gap:4}}>
          <button onClick={()=>router.push('/journal')} style={{padding:'5px 14px',borderRadius:8,fontSize:13,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Trade Journal</button>
          <button onClick={()=>router.push('/profile')} style={{padding:'5px 14px',borderRadius:8,fontSize:13,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Profile</button>
        </div>
      </nav>

      <div style={{paddingTop:52}}>
        <div style={{minHeight:'calc(100vh - 52px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 24px 40px',textAlign:'center',position:'relative'}}>
          <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:800,height:500,background:'radial-gradient(ellipse,rgba(124,111,247,0.07) 0%,transparent 65%)',pointerEvents:'none'}}></div>

          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:C.purpleBg,border:'1px solid rgba(124,111,247,0.18)',color:C.purpleL,padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase',marginBottom:32}}>
            <i style={{width:5,height:5,background:C.purple,borderRadius:'50%',display:'block'}}></i>
            AI-powered prediction markets
          </div>

          <h1 style={{fontSize:'clamp(44px,7vw,78px)',fontWeight:700,letterSpacing:'-2.5px',lineHeight:1.02,marginBottom:18}}>
            Pick Feeds.<br /><span style={{color:C.purpleL}}>Craft Conviction.</span>
          </h1>
          <p style={{fontSize:16,color:C.t2,maxWidth:440,lineHeight:1.65,marginBottom:44}}>
            Ask any prediction question. Get AI analysis from news, social, and market signals. Trade with conviction.
          </p>

          <div style={{width:'100%',maxWidth:600,position:'relative',marginBottom:12}}>
            <div style={{position:'relative'}}>
              <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&query.trim()&&go(query.trim())}
                placeholder="What do you want to predict? Ask anything..."
                autoFocus
                style={{width:'100%',padding:'16px 120px 16px 20px',background:C.bg2,border:'1px solid '+C.border2,borderRadius:16,color:C.t1,fontSize:14,outline:'none',fontFamily:'inherit'}} />
              <button onClick={()=>query.trim()&&go(query.trim())} disabled={isAnalyzing||!query.trim()}
                style={{position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',background:C.purple,color:'white',border:'none',borderRadius:10,padding:'8px 20px',fontSize:13,fontWeight:600,cursor:'pointer',opacity:(!query.trim()||isAnalyzing)?0.5:1}}>
                {isAnalyzing?'Analyzing...':'Analyze'}
              </button>
            </div>
            {showResults && results.length > 0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:C.bg2,border:'1px solid '+C.border2,borderRadius:12,overflow:'hidden',zIndex:50,boxShadow:'0 16px 40px rgba(0,0,0,0.5)'}}>
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
          <p style={{fontSize:11,color:C.t3,marginBottom:48}}>Type a question or paste a Polymarket URL</p>

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,width:'100%',maxWidth:600}}>
            {examples.map((ex,i)=>(
              <button key={i} onClick={()=>go(ex.q)}
                style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px 16px',textAlign:'left',cursor:'pointer',transition:'all 0.2s'}}
                onMouseEnter={e=>{(e.currentTarget.style.borderColor='rgba(124,111,247,0.3)');(e.currentTarget.style.background=C.bg3);}}
                onMouseLeave={e=>{(e.currentTarget.style.borderColor=C.border);(e.currentTarget.style.background=C.bg2);}}>
                <div style={{fontSize:10,fontWeight:700,color:C.purple,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>{ex.cat}</div>
                <div style={{fontSize:12,color:C.t2,lineHeight:1.4}}>{ex.q}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:'80px 40px',borderTop:'1px solid '+C.border}}>
          <h2 style={{fontSize:26,fontWeight:700,letterSpacing:'-0.5px',textAlign:'center',marginBottom:40}}>{`How it works`}</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,maxWidth:960,margin:'0 auto 40px'}}>
            {[
              {n:'1',t:'Analyze the market',d:'Ask any prediction question or paste a Polymarket URL. AI pulls live signals from news, social, and market sources.'},
              {n:'2',t:'See your conviction score',d:'AI calculates an edge - where it disagrees with the market and why. Tune the weights to match your strategy.'},
              {n:'3',t:'Trade with conviction',d:'Place orders directly through PlayPicks. Every trade is logged with the AI conviction snapshot that justified it.'},
            ].map(s=>(
              <div key={s.n} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'20px'}}>
                <div style={{width:32,height:32,background:C.purpleBg,border:'1px solid rgba(124,111,247,0.2)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:C.purple,marginBottom:12}}>{s.n}</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{s.t}</div>
                <div style={{fontSize:12,color:C.t2,lineHeight:1.6}}>{s.d}</div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,maxWidth:960,margin:'0 auto'}}>
            {[
              {t:'Multi-Source Intelligence',d:'News sentiment, community signals, and live Polymarket odds all in one view.'},
              {t:'Custom Weighting',d:'Adjust signal weights to match your strategy. Trust markets more? Increase market weight.'},
              {t:'Conviction-Gated Trading',d:'Only trade after AI analysis runs. See your edge before placing a single dollar.'},
              {t:'Trade Journal',d:'Every trade logged with the AI conviction snapshot. Track win rate when you followed the edge.',link:true},
            ].map((f,i)=>(
              <div key={i} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px'}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:6,color:C.t1}}>{f.t}</div>
                <div style={{fontSize:11,color:C.t2,lineHeight:1.6}}>{f.d}</div>
                {f.link&&<button onClick={()=>router.push('/journal')} style={{marginTop:8,fontSize:11,color:C.amber,background:'none',border:'none',cursor:'pointer',padding:0}}>View journal</button>}
              </div>
            ))}
          </div>
        </div>

        <div style={{borderTop:'1px solid '+C.border,padding:'16px 40px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:C.t3}}>Not financial advice. Research purposes only.</span>
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <button onClick={()=>router.push('/journal')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer'}}>Trade Journal</button>
            <button onClick={()=>router.push('/profile')} style={{fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer'}}>Profile</button>
            <span style={{fontSize:11,color:C.t3}}>Powered by TradeDNA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
