'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg0:'#06060a', bg2:'#14141c', bg3:'#1a1a24',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.12)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78', t4:'#2e2c44',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)', purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a', amber:'#f5a623', red:'#ef4f6a', blue:'#4d9de0',
};

export default function PicksPage() {
  const router = useRouter();
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    fetch('/api/daily-pick')
      .then(r => r.json())
      .then(d => {
        setPicks(d.picks || []);
        setDate(d.date || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:C.purpleL,cursor:'pointer',fontSize:13,fontWeight:600}}>← PlayPicks</button>
        <div style={{fontSize:13,fontWeight:700}}>🎯 Daily Picks</div>
        <button onClick={()=>router.push('/accuracy')} style={{background:'none',border:'none',color:C.t3,cursor:'pointer',fontSize:12}}>Record →</button>
      </nav>

      <div style={{maxWidth:640,margin:'0 auto',padding:'72px 24px 48px'}}>

        <div style={{marginBottom:24}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(46,204,138,0.1)',border:'1px solid rgba(46,204,138,0.2)',color:C.green,padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.5px',textTransform:'uppercase' as const,marginBottom:12}}>
            <span style={{width:5,height:5,background:C.green,borderRadius:'50%',display:'block'}}/>
            Auto-generated · Updates daily
          </div>
          <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.8px',marginBottom:4}}>
            Today's AI Picks
          </h1>
          <p style={{fontSize:13,color:C.t2}}>{date ? fmt(date) : 'Loading...'} · Only high conviction picks published</p>
        </div>

        <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px 16px',marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:10}}>How this works</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {[
              {icon:'🤖',title:'Auto-generated',desc:'AI scans all Polymarket markets every morning'},
              {icon:'🎯',title:'High conviction only',desc:'Only published when odds are 65%+ or 35%-'},
              {icon:'✅',title:'Public record',desc:'Every pick tracked — wins and losses'},
            ].map((s,i)=>(
              <div key={i} style={{background:C.bg3,borderRadius:10,padding:'10px',textAlign:'center' as const}}>
                <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
                <div style={{fontSize:11,fontWeight:600,color:C.t1,marginBottom:3}}>{s.title}</div>
                <div style={{fontSize:10,color:C.t3,lineHeight:1.5}}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
            {[1,2,3].map(i=><div key={i} style={{height:160,background:C.bg2,borderRadius:16,border:'1px solid '+C.border,opacity:0.3}}/>)}
          </div>
        ) : picks.length === 0 ? (
          <div style={{textAlign:'center' as const,padding:'48px 0'}}>
            <div style={{fontSize:40,marginBottom:12}}>🔍</div>
            <div style={{fontSize:16,fontWeight:600,color:C.t2,marginBottom:6}}>No picks today</div>
            <div style={{fontSize:13,color:C.t3,marginBottom:20}}>Markets are too uncertain today. We only pick when the edge is real.</div>
            <button onClick={()=>router.push('/')} style={{padding:'10px 24px',borderRadius:10,background:C.purple,border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>
              Browse all markets →
            </button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
            {picks.map((pick,i)=>(
              <div key={i} style={{background:C.bg2,border:'1px solid '+(pick.verdict==='HIGH CONVICTION'?'rgba(46,204,138,0.25)':C.border),borderRadius:16,overflow:'hidden'}}>
                
                <div style={{padding:'16px 18px',borderBottom:'1px solid '+C.border}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:22}}>{pick.icon}</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:C.t1,lineHeight:1.3}}>{pick.title}</div>
                        <div style={{fontSize:10,color:C.t3,marginTop:2}}>{pick.subtitle}</div>
                      </div>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:pick.verdictColor,padding:'3px 10px',borderRadius:100,background:pick.verdictColor+'15',border:'1px solid '+pick.verdictColor+'30',whiteSpace:'nowrap' as const,flexShrink:0,marginLeft:8}}>
                      {pick.verdict}
                    </span>
                  </div>

                  <div style={{display:'flex',alignItems:'center',gap:12,background:C.bg3,borderRadius:10,padding:'12px 14px'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:C.t3,marginBottom:3}}>Market says</div>
                      <div style={{fontSize:15,fontWeight:700,color:C.t1}}>{pick.prediction}</div>
                    </div>
                    <div style={{textAlign:'right' as const}}>
                      <div style={{fontSize:34,fontWeight:900,fontFamily:'monospace',color:pick.confidence>=65?C.green:pick.confidence<=35?C.red:C.amber}}>{pick.confidence}%</div>
                      <div style={{fontSize:10,color:C.t3}}>market odds</div>
                    </div>
                  </div>

                  {pick.edge > 0 && (
                    <div style={{marginTop:10,display:'flex',gap:8}}>
                      <div style={{flex:1,background:C.bg3,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                        <div style={{fontSize:10,color:C.t3,marginBottom:2}}>Market</div>
                        <div style={{fontSize:15,fontWeight:700,color:C.t2,fontFamily:'monospace'}}>{pick.marketOdds}%</div>
                      </div>
                      <div style={{flex:1,background:C.bg3,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                        <div style={{fontSize:10,color:C.t3,marginBottom:2}}>AI</div>
                        <div style={{fontSize:15,fontWeight:700,color:C.green,fontFamily:'monospace'}}>{pick.aiOdds}%</div>
                      </div>
                      <div style={{flex:1,background:C.bg3,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                        <div style={{fontSize:10,color:C.t3,marginBottom:2}}>Edge</div>
                        <div style={{fontSize:15,fontWeight:700,color:C.green,fontFamily:'monospace'}}>+{pick.edge}%</div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{padding:'14px 18px',borderBottom:'1px solid '+C.border}}>
                  <button onClick={()=>setExpanded(expanded===pick.id?null:pick.id)}
                    style={{width:'100%',background:'none',border:'none',cursor:'pointer',textAlign:'left' as const,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>Why this pick</span>
                    <span style={{fontSize:12,color:C.t3}}>{expanded===pick.id?'▲':'▼'}</span>
                  </button>

                  {expanded===pick.id && (
                    <div style={{marginTop:12}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:8}}>✅ Bull case</div>
                      {pick.reasoning.map((r:string,j:number)=>(
                        <div key={j} style={{fontSize:12,color:C.t2,marginBottom:6,paddingLeft:10,borderLeft:'2px solid '+C.green,lineHeight:1.5}}>{r}</div>
                      ))}
                      <div style={{fontSize:10,fontWeight:700,color:C.red,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:8,marginTop:12}}>⚠️ Risks</div>
                      {pick.risks.map((r:string,j:number)=>(
                        <div key={j} style={{fontSize:12,color:C.t2,marginBottom:6,paddingLeft:10,borderLeft:'2px solid '+C.red,lineHeight:1.5}}>{r}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{padding:'12px 18px',display:'flex',gap:8}}>
                  <button onClick={()=>router.push('/scores?event='+encodeURIComponent(pick.title))}
                    style={{flex:2,padding:'10px',borderRadius:10,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,cursor:'pointer',fontSize:12,fontWeight:600}}>
                    🤖 Full AI analysis →
                  </button>
                  <button onClick={()=>{
                    const text = `🎯 PlayPicks Daily Pick\n\n${pick.icon} ${pick.title}\n${pick.confidence}% market odds\n\n${pick.reasoning[0]}\n\ntradedna.vercel.app/picks\n\n#PlayPicks #Polymarket`;
                    if (navigator.share) navigator.share({text});
                    else navigator.clipboard.writeText(text);
                  }} style={{flex:1,padding:'10px',borderRadius:10,background:C.bg3,border:'1px solid '+C.border,color:C.t2,cursor:'pointer',fontSize:12}}>
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:20,background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:2}}>Public accuracy record</div>
            <div style={{fontSize:11,color:C.t3}}>Every pick tracked — wins and losses both</div>
          </div>
          <button onClick={()=>router.push('/accuracy')}
            style={{padding:'8px 16px',borderRadius:8,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap' as const}}>
            View record →
          </button>
        </div>

        <div style={{textAlign:'center' as const,fontSize:11,color:C.t4,marginTop:16}}>
          Not financial advice · Picks auto-generated from Polymarket data
        </div>
      </div>
    </div>
  );
}
