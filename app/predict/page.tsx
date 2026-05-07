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

const TODAY_MATCHES = [
  {id:'srh-pbks-ipl-may6-2026',title:'SRH vs PBKS — IPL 2026',team1:'Sunrisers Hyderabad',team2:'Punjab Kings',time:'May 6 · 7:30 PM IST',venue:'Rajiv Gandhi Stadium, Hyderabad',aiPrediction:'Too close to call',aiConfidence:49,sport:'🏏',date:'2026-05-06'},
  {id:'okc-lal-nba-may5-2026',title:'OKC Thunder vs LA Lakers — NBA Playoffs',team1:'OKC Thunder',team2:'LA Lakers',time:'May 5 · 8:30 PM CDT',venue:'Paycom Center, Oklahoma City',aiPrediction:'OKC Thunder',aiConfidence:87,sport:'🏀',date:'2026-05-05'},
];

export default function PredictPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameSet, setUsernameSet] = useState(false);
  const [predictions, setPredictions] = useState<Record<string,string>>({});
  const [confidences, setConfidences] = useState<Record<string,number>>({});
  const [submitted, setSubmitted] = useState<Record<string,boolean>>({});
  const [loading, setLoading] = useState<Record<string,boolean>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pp_username');
      if (saved) { setUsername(saved); setUsernameSet(true); }
      const savedPreds = localStorage.getItem('pp_submitted_matches');
      if (savedPreds) setSubmitted(JSON.parse(savedPreds));
    } catch {}
  }, []);

  const saveUsername = () => {
    if (!usernameInput.trim() || usernameInput.length < 2) { setError('Min 2 characters'); return; }
    const clean = usernameInput.trim().replace(/[^a-zA-Z0-9_]/g,'').slice(0,20);
    try { localStorage.setItem('pp_username', clean); } catch {}
    setUsername(clean); setUsernameSet(true); setError('');
  };

  const submitPrediction = async (match: typeof TODAY_MATCHES[0]) => {
    if (!predictions[match.id]) { setError('Pick a team first'); return; }
    if (!usernameSet) { setError('Set your name first'); return; }
    setLoading(l=>({...l,[match.id]:true}));
    try {
      const res = await fetch('/api/predict', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({username,matchId:match.id,matchTitle:match.title,matchDate:match.date,team1:match.team1,team2:match.team2,predictedWinner:predictions[match.id],confidence:confidences[match.id]||60,aiPrediction:match.aiPrediction,aiConfidence:match.aiConfidence}),
      });
      const data = await res.json();
      if (data.success || data.alreadyPredicted) {
        const newSubmitted = {...submitted,[match.id]:true};
        setSubmitted(newSubmitted);
        try { localStorage.setItem('pp_submitted_matches', JSON.stringify(newSubmitted)); } catch {}
      } else { setError(data.error||'Failed'); }
    } catch { setError('Network error'); }
    setLoading(l=>({...l,[match.id]:false}));
  };

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:C.purpleL,cursor:'pointer',fontSize:13,fontWeight:600}}>← PlayPicks AI</button>
        <div style={{fontSize:13,fontWeight:700}}>🎯 Make Your Picks</div>
        <button onClick={()=>router.push('/leaderboard')} style={{background:'none',border:'none',color:C.amber,cursor:'pointer',fontSize:12,fontWeight:600}}>🏆 Leaderboard</button>
      </nav>

      <div style={{maxWidth:560,margin:'0 auto',padding:'72px 24px 48px'}}>
        <div style={{textAlign:'center' as const,marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:8}}>🎯</div>
          <h1 style={{fontSize:24,fontWeight:800,letterSpacing:'-0.6px',marginBottom:6}}>Today's Picks</h1>
          <p style={{fontSize:13,color:C.t2}}>Pick before the match · Earn points · Climb the leaderboard</p>
        </div>

        {!usernameSet ? (
          <div style={{background:C.bg2,border:'1px solid '+C.purpleBorder,borderRadius:16,padding:'20px',marginBottom:24}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:4}}>👋 Pick a display name</div>
            <div style={{fontSize:12,color:C.t3,marginBottom:14}}>Shows on the leaderboard</div>
            <div style={{display:'flex',gap:8}}>
              <input value={usernameInput} onChange={e=>setUsernameInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveUsername()} placeholder="e.g. CricketFan99" maxLength={20}
                style={{flex:1,padding:'10px 14px',borderRadius:10,border:'1px solid '+C.border2,background:C.bg3,color:C.t1,fontSize:13,outline:'none'}}/>
              <button onClick={saveUsername} style={{padding:'10px 20px',borderRadius:10,background:C.purple,border:'none',color:'white',fontSize:13,fontWeight:600,cursor:'pointer'}}>Set</button>
            </div>
            {error&&<div style={{fontSize:11,color:C.red,marginTop:6}}>{error}</div>}
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,padding:'8px 14px',background:C.bg2,borderRadius:10,border:'1px solid '+C.border}}>
            <span style={{fontSize:13,color:C.t2}}>Predicting as</span>
            <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{username}</span>
            <button onClick={()=>{setUsernameSet(false);setUsernameInput('');}} style={{marginLeft:'auto',fontSize:11,color:C.t3,background:'none',border:'none',cursor:'pointer'}}>Change</button>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column' as const,gap:16}}>
          {TODAY_MATCHES.map(match=>(
            <div key={match.id} style={{background:C.bg2,border:'1px solid '+(submitted[match.id]?'rgba(46,204,138,0.3)':C.border),borderRadius:16,overflow:'hidden'}}>
              <div style={{padding:'14px 16px',borderBottom:'1px solid '+C.border}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontSize:16}}>{match.sport}</span>
                  <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{match.title}</span>
                </div>
                <div style={{fontSize:11,color:C.t3}}>{match.time} · {match.venue}</div>
              </div>

              {submitted[match.id] ? (
                <div style={{padding:'20px 16px',textAlign:'center' as const}}>
                  <div style={{fontSize:24,marginBottom:8}}>✅</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.green,marginBottom:4}}>Pick locked in!</div>
                  <div style={{fontSize:12,color:C.t2}}>You picked <strong>{predictions[match.id]||'your team'}</strong></div>
                  <div style={{fontSize:11,color:C.t3,marginTop:4}}>Results after match · Check leaderboard</div>
                </div>
              ) : (
                <div style={{padding:'16px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:10}}>Who wins?</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                    {[match.team1,match.team2].map(team=>(
                      <button key={team} onClick={()=>setPredictions(p=>({...p,[match.id]:team}))}
                        style={{padding:'14px 10px',borderRadius:12,cursor:'pointer',border:'2px solid '+(predictions[match.id]===team?C.purple:'rgba(255,255,255,0.08)'),background:predictions[match.id]===team?C.purpleBg:C.bg3,color:predictions[match.id]===team?C.t1:C.t2,fontSize:13,fontWeight:600,transition:'all 0.15s',textAlign:'center' as const}}>
                        {predictions[match.id]===team&&<div style={{fontSize:16,marginBottom:4}}>✓</div>}
                        {team}
                      </button>
                    ))}
                  </div>

                  {predictions[match.id]&&(
                    <div style={{marginBottom:14}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:11,color:C.t3}}>Your confidence</span>
                        <span style={{fontSize:12,fontWeight:700,color:C.purple}}>{confidences[match.id]||60}%</span>
                      </div>
                      <input type="range" min="51" max="99" value={confidences[match.id]||60}
                        onChange={e=>setConfidences(c=>({...c,[match.id]:parseInt(e.target.value)}))}
                        style={{width:'100%',accentColor:C.purple}}/>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:C.t4}}>
                        <span>Slight edge</span><span>Very confident</span>
                      </div>
                    </div>
                  )}

                  <div style={{padding:'8px 12px',background:C.bg3,borderRadius:8,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12}}>🤖</span>
                    <span style={{fontSize:11,color:C.t2}}>AI: <strong style={{color:C.purpleL}}>{match.aiPrediction} {match.aiConfidence}%</strong></span>
                    <button onClick={()=>router.push('/scores?event=Will+'+encodeURIComponent(match.team1)+'+beat+'+encodeURIComponent(match.team2)+'?')}
                      style={{marginLeft:'auto',fontSize:10,color:C.purpleL,background:'none',border:'none',cursor:'pointer'}}>Full analysis →</button>
                  </div>

                  {error&&<div style={{fontSize:11,color:C.red,marginBottom:8}}>{error}</div>}

                  <button onClick={()=>submitPrediction(match)} disabled={!predictions[match.id]||loading[match.id]}
                    style={{width:'100%',padding:'12px',borderRadius:10,background:predictions[match.id]?C.purple:'rgba(124,111,247,0.2)',border:'none',color:'white',fontSize:13,fontWeight:600,cursor:predictions[match.id]?'pointer':'not-allowed',opacity:loading[match.id]?0.7:1}}>
                    {loading[match.id]?'Saving...':`🎯 Lock in ${predictions[match.id]||'pick'}`}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{marginTop:24,textAlign:'center' as const}}>
          <button onClick={()=>router.push('/leaderboard')} style={{padding:'10px 24px',borderRadius:10,background:'transparent',border:'1px solid '+C.border,color:C.t2,fontSize:13,cursor:'pointer'}}>🏆 View leaderboard</button>
        </div>
      </div>
    </div>
  );
}
