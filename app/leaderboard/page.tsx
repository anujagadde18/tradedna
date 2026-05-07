'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg0:'#06060a',bg2:'#14141c',bg3:'#1a1a24',
  border:'rgba(255,255,255,0.06)',border2:'rgba(255,255,255,0.12)',
  t1:'#f2f0ff',t2:'#9996b8',t3:'#5c5a78',t4:'#2e2c44',
  purple:'#7c6ff7',purpleL:'#a89cf8',purpleBg:'rgba(124,111,247,0.1)',purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a',amber:'#f5a623',red:'#ef4f6a',
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [username, setUsername] = useState('');

  useEffect(() => {
    try { setUsername(localStorage.getItem('pp_username') || ''); } catch {}
    fetch('/api/leaderboard').then(r=>r.json()).then(d=>{
      setLeaders(d.leaders||[]);
      setTotal(d.totalPredictions||0);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:C.purpleL,cursor:'pointer',fontSize:13,fontWeight:600}}>← PlayPicks AI</button>
        <div style={{fontSize:13,fontWeight:700}}>🏆 Leaderboard</div>
        <button onClick={()=>router.push('/predict')} style={{padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:600,color:C.green,border:'1px solid rgba(46,204,138,0.2)',background:'rgba(46,204,138,0.08)',cursor:'pointer'}}>🎯 Make Pick</button>
      </nav>

      <div style={{maxWidth:600,margin:'0 auto',padding:'72px 24px 48px'}}>
        <div style={{textAlign:'center' as const,marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:8}}>🏆</div>
          <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.8px',marginBottom:6}}>Weekly Leaderboard</h1>
          <p style={{fontSize:13,color:C.t2}}>{total} predictions made · Earn points for correct picks</p>
        </div>

        <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:14,padding:'16px',marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:12}}>How points work</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[{pts:'+10',label:'Correct pick',color:C.green},{pts:'+5',label:'High confidence bonus',color:C.amber},{pts:'🔥',label:'Streak multiplier',color:C.red}].map((p,i)=>(
              <div key={i} style={{background:C.bg3,borderRadius:10,padding:'10px',textAlign:'center' as const}}>
                <div style={{fontSize:18,fontWeight:800,color:p.color,fontFamily:'monospace',marginBottom:4}}>{p.pts}</div>
                <div style={{fontSize:10,color:C.t3}}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
            {[...Array(5)].map((_,i)=><div key={i} style={{height:60,background:C.bg2,borderRadius:12,border:'1px solid '+C.border,opacity:0.3}}/>)}
          </div>
        ) : leaders.length === 0 ? (
          <div style={{textAlign:'center' as const,padding:'48px 0'}}>
            <div style={{fontSize:40,marginBottom:12}}>🎯</div>
            <div style={{fontSize:16,fontWeight:600,color:C.t2,marginBottom:6}}>No predictions yet</div>
            <div style={{fontSize:13,color:C.t3,marginBottom:20}}>Be the first to make a pick!</div>
            <button onClick={()=>router.push('/predict')} style={{padding:'10px 24px',borderRadius:10,background:C.purple,border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>Make first prediction →</button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column' as const,gap:6}}>
            {leaders.map((leader,i)=>(
              <div key={i} style={{background:leader.username===username?'rgba(124,111,247,0.08)':C.bg2,border:'1px solid '+(leader.username===username?C.purpleBorder:C.border),borderRadius:12,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:i<3?22:14,minWidth:32,textAlign:'center' as const,fontWeight:700,color:C.t4}}>{i<3?medals[i]:`#${i+1}`}</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{leader.username}</span>
                    {leader.current_streak>2&&<span style={{fontSize:11,color:C.red}}>🔥{leader.current_streak}</span>}
                    {leader.username===username&&<span style={{fontSize:9,color:C.purpleL,fontWeight:700,padding:'1px 6px',background:C.purpleBg,borderRadius:4}}>YOU</span>}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:60,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
                      <div style={{height:'100%',background:C.green,width:leader.accuracy+'%',borderRadius:2}}/>
                    </div>
                    <span style={{fontSize:11,color:C.t3}}>{leader.accuracy}% · {leader.correct_predictions}/{leader.total_predictions}</span>
                  </div>
                </div>
                <div style={{textAlign:'right' as const}}>
                  <div style={{fontSize:20,fontWeight:800,color:i===0?C.amber:C.t1,fontFamily:'monospace'}}>{leader.total_points}</div>
                  <div style={{fontSize:9,color:C.t3}}>pts</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:24,textAlign:'center' as const}}>
          <button onClick={()=>router.push('/predict')} style={{padding:'12px 32px',borderRadius:12,background:C.purple,border:'none',color:'white',fontSize:14,fontWeight:600,cursor:'pointer'}}>🎯 Make today's prediction</button>
        </div>
      </div>
    </div>
  );
}
