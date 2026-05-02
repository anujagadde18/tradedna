'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg0:'#06060a', bg1:'#0e0e14', bg2:'#14141c', bg3:'#1a1a24',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.12)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78', t4:'#2e2c44',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)', purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a', amber:'#f5a623', red:'#ef4f6a',
};

export default function PicksPage() {
  const router = useRouter();
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState('');

  useEffect(() => {
    fetch('/api/daily-pick')
      .then(r => r.json())
      .then(d => {
        setPicks(d.picks || []);
        setToday(d.date || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:C.purpleL,cursor:'pointer',fontSize:13,fontWeight:600}}>← PlayPicks AI</button>
        <div style={{fontSize:13,fontWeight:700}}>🎯 Daily Picks</div>
        <button onClick={()=>router.push('/accuracy')} style={{background:'none',border:'none',color:C.t3,cursor:'pointer',fontSize:12}}>Record →</button>
      </nav>

      <div style={{maxWidth:640,margin:'0 auto',padding:'72px 24px 48px'}}>
        
        {/* Header */}
        <div style={{marginBottom:28}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(46,204,138,0.1)',border:'1px solid rgba(46,204,138,0.2)',color:C.green,padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,marginBottom:14}}>
            <span style={{width:5,height:5,background:C.green,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #2ecc8a'}}/>
            Today's Picks
          </div>
          <h1 style={{fontSize:28,fontWeight:800,letterSpacing:'-0.8px',marginBottom:6}}>
            {today ? fmt(today) : 'Today'}
          </h1>
          <p style={{fontSize:13,color:C.t2,lineHeight:1.6}}>
            One high conviction pick per sport. Only posted when the edge is real. 
            We track every prediction publicly — wins and losses.
          </p>
        </div>

        {/* How it works */}
        <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:14,padding:'16px',marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:12}}>How Daily Picks work</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {n:'1',t:'AI analyzes',d:'Live data, form, venue stats, market odds'},
              {n:'2',t:'Edge filter',d:'Only published when confidence is 65%+'},
              {n:'3',t:'Public record',d:'Every pick tracked — wins and losses'},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:'center' as const}}>
                <div style={{width:24,height:24,background:C.purpleBg,border:'1px solid '+C.purpleBorder,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:C.purple,margin:'0 auto 8px'}}>{s.n}</div>
                <div style={{fontSize:11,fontWeight:600,color:C.t1,marginBottom:3}}>{s.t}</div>
                <div style={{fontSize:10,color:C.t3,lineHeight:1.5}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Picks */}
        {loading ? (
          <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
            {[1,2].map(i=><div key={i} style={{height:200,background:C.bg2,borderRadius:16,border:'1px solid '+C.border,opacity:0.3}}/>)}
          </div>
        ) : picks.length === 0 ? (
          <div style={{textAlign:'center' as const,padding:'48px 0',color:C.t3}}>
            <div style={{fontSize:32,marginBottom:12}}>🔍</div>
            <div style={{fontSize:15,fontWeight:600,color:C.t2,marginBottom:6}}>No picks today yet</div>
            <div style={{fontSize:13,color:C.t3}}>We only pick when the edge is real. Check back soon.</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:16}}>
            {picks.map((pick,i)=>(
              <div key={i} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:16,overflow:'hidden'}}>
                {/* Pick header */}
                <div style={{padding:'16px 18px',borderBottom:'1px solid '+C.border}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:20}}>{pick.icon}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:C.t1}}>{pick.title}</div>
                        <div style={{fontSize:11,color:C.t3,marginTop:2}}>{pick.subtitle}</div>
                      </div>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:pick.verdictColor,padding:'3px 10px',borderRadius:100,background:pick.verdictColor+'15',border:'1px solid '+pick.verdictColor+'30',whiteSpace:'nowrap' as const}}>
                      {pick.verdict}
                    </span>
                  </div>

                  {/* Prediction + confidence */}
                  <div style={{display:'flex',alignItems:'center',gap:12,background:C.bg3,borderRadius:10,padding:'12px 14px'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,color:C.t3,marginBottom:3}}>AI Prediction</div>
                      <div style={{fontSize:16,fontWeight:700,color:C.t1}}>{pick.prediction}</div>
                    </div>
                    <div style={{textAlign:'right' as const}}>
                      <div style={{fontSize:32,fontWeight:900,fontFamily:'monospace',color:pick.confidence>=70?C.green:pick.confidence>=55?C.amber:C.t2}}>{pick.confidence}%</div>
                      <div style={{fontSize:10,color:C.t3}}>AI confidence</div>
                    </div>
                  </div>

                  {/* Market vs AI */}
                  {pick.marketOdds && (
                    <div style={{display:'flex',gap:8,marginTop:10}}>
                      <div style={{flex:1,background:C.bg3,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                        <div style={{fontSize:11,color:C.t3,marginBottom:2}}>Market</div>
                        <div style={{fontSize:16,fontWeight:700,fontFamily:'monospace',color:C.t2}}>{pick.marketOdds}%</div>
                      </div>
                      <div style={{flex:1,background:C.bg3,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                        <div style={{fontSize:11,color:C.t3,marginBottom:2}}>AI</div>
                        <div style={{fontSize:16,fontWeight:700,fontFamily:'monospace',color:C.green}}>{pick.aiOdds}%</div>
                      </div>
                      <div style={{flex:1,background:C.bg3,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                        <div style={{fontSize:11,color:C.t3,marginBottom:2}}>Edge</div>
                        <div style={{fontSize:16,fontWeight:700,fontFamily:'monospace',color:pick.edge>0?C.green:pick.edge<0?C.red:C.t3}}>
                          {pick.edge>0?'+':''}{pick.edge}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reasoning */}
                <div style={{padding:'14px 18px',borderBottom:'1px solid '+C.border}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:8}}>✅ Why we like this</div>
                  {pick.reasoning.map((r:string,j:number)=>(
                    <div key={j} style={{fontSize:12,color:C.t2,marginBottom:5,paddingLeft:10,borderLeft:'2px solid '+C.green,lineHeight:1.5}}>{r}</div>
                  ))}
                  
                  <div style={{fontSize:10,fontWeight:700,color:C.red,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:8,marginTop:12}}>⚠️ Risks</div>
                  {pick.risks.map((r:string,j:number)=>(
                    <div key={j} style={{fontSize:12,color:C.t2,marginBottom:5,paddingLeft:10,borderLeft:'2px solid '+C.red,lineHeight:1.5}}>{r}</div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{padding:'12px 18px',display:'flex',gap:8}}>
                  <button onClick={()=>router.push('/scores?event='+encodeURIComponent(pick.url))}
                    style={{flex:2,padding:'10px',borderRadius:10,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,cursor:'pointer',fontSize:12,fontWeight:600}}>
                    🤖 Full AI analysis →
                  </button>
                  <button onClick={()=>{
                    const text = `🎯 PlayPicks Daily Pick\n\n${pick.icon} ${pick.title}\nPrediction: ${pick.prediction} (${pick.confidence}% confidence)\n\n${pick.reasoning[0]}\n\ntradedna.vercel.app/picks\n\n#PlayPicks #AIodds`;
                    navigator.share ? navigator.share({text}) : navigator.clipboard.writeText(text);
                  }} style={{flex:1,padding:'10px',borderRadius:10,background:C.bg3,border:'1px solid '+C.border,color:C.t2,cursor:'pointer',fontSize:12}}>
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accuracy teaser */}
        <div style={{marginTop:24,background:C.bg2,border:'1px solid '+C.border,borderRadius:14,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.t1,marginBottom:3}}>Public accuracy record</div>
            <div style={{fontSize:12,color:C.t3}}>Every pick tracked. Wins and losses both.</div>
          </div>
          <button onClick={()=>router.push('/accuracy')}
            style={{padding:'8px 16px',borderRadius:8,background:C.purpleBg,border:'1px solid '+C.purpleBorder,color:C.purpleL,cursor:'pointer',fontSize:12,fontWeight:600,whiteSpace:'nowrap' as const}}>
            View record →
          </button>
        </div>

        <div style={{textAlign:'center' as const,fontSize:11,color:C.t4,marginTop:20}}>
          Not financial advice. For research and entertainment only.
        </div>
      </div>
    </div>
  );
}
