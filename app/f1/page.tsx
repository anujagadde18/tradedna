'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg0:'#06060a', bg1:'#0e0e14', bg2:'#14141c', bg3:'#1a1a24',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.12)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78', t4:'#2e2c44',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)', purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a', amber:'#f5a623', red:'#ef4f6a',
};

const DRIVERS = [
  { pos:1, name:'Kimi Antonelli', team:'Mercedes', flag:'🇮🇹', winPct:26, podiumPct:78, champPct:36, pts:97, champPos:1, color:'#00d2be', verdict:'STRONG PICK', verdictColor:'#2ecc8a',
    bull:['GP POLE POSITION — starts P1 Sunday','Won last 2 races','Championship leader 72pts','Recovered from sprint qualifying P2'],
    bear:['McLaren upgrades now matching Mercedes','Verstappen starting alongside on front row'] },
  { pos:2, name:'Lando Norris', team:'McLaren', flag:'🇬🇧', winPct:29, podiumPct:75, champPct:14, pts:30, champPos:5, color:'#ff8000', verdict:'STRONG PICK', verdictColor:'#2ecc8a',
    bull:['SPRINT POLE — McLaren upgrades working','Won Miami Sprint race','2025 World Champion knows Miami','McLaren strongest car this weekend'],
    bear:['Starting further back in GP after sprint','Points deficit hard to overcome'] },
  { pos:3, name:'Oscar Piastri', team:'McLaren', flag:'🇦🇺', winPct:15, podiumPct:62, champPct:9, pts:41, champPos:4, color:'#ff8000', verdict:'STRONG PICK', verdictColor:'#2ecc8a',
    bull:['P3 in sprint qualifying','McLaren fastest car this weekend','Strong race pace','Big upgrade package working'],
    bear:['Needs others to make mistakes','Points gap too large for title'] },
  { pos:4, name:'Max Verstappen', team:'Red Bull', flag:'🇳🇱', winPct:8, podiumPct:35, champPct:4, pts:22, champPos:7, color:'#1e41ff', verdict:'WATCH', verdictColor:'#f5a623',
    bull:['GP QUALIFYING P2 — front row start!','Best result of 2026 season','Red Bull upgrades working in heat'],
    bear:['Still 60pts behind Antonelli','Inconsistent season so far'] },
  { pos:5, name:'Charles Leclerc', team:'Ferrari', flag:'🇲🇨', winPct:5, podiumPct:30, champPct:4, pts:49, champPos:5, color:'#dc0000', verdict:'WATCH', verdictColor:'#f5a623',
    bull:['GP Qualifying P3 — strong Ferrari','Ferrari upgrades working','Consistent podium finisher'],
    bear:['Race pace slightly behind McLaren/Mercedes','Hamilton pressure internally'] },
  { pos:6, name:'George Russell', team:'Mercedes', flag:'🇬🇧', winPct:15, podiumPct:65, champPct:38, pts:81, champPos:2, color:'#00d2be', verdict:'WATCH', verdictColor:'#f5a623',
    bull:['Championship P2 — still in title fight','Won Australia Round 1','Same car as Antonelli'],
    bear:['P6 in sprint qualifying — off pace','Battery issue recurring concern'] },
  { pos:7, name:'Lewis Hamilton', team:'Ferrari', flag:'🇬🇧', winPct:3, podiumPct:20, champPct:2, pts:40, champPos:4, color:'#dc0000', verdict:'LONGSHOT', verdictColor:'#9996b8',
    bull:['7x World Champion — experience','Ferrari P3 on grid','Miami street circuit experience'],
    bear:['P7 in sprint qualifying','Ruined promising lap at Turn 17','Leclerc faster this weekend'] },
];

export default function F1Page() {
  const router = useRouter();
  const [selected, setSelected] = useState<number|null>(null);
  const driver = selected !== null ? DRIVERS[selected] : null;

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:C.purpleL,cursor:'pointer',fontSize:13,fontWeight:600}}>← PlayPicks AI</button>
        <div style={{fontSize:13,fontWeight:700,color:C.t1}}>🏎️ F1 Miami Grand Prix</div>
        <div style={{fontSize:11,color:C.t3}}>May 3, 2026</div>
      </nav>

      <div style={{maxWidth:960,margin:'0 auto',padding:'72px 24px 48px'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(239,79,106,0.1)',border:'1px solid rgba(239,79,106,0.2)',color:C.red,padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,marginBottom:16}}>
            <span style={{width:5,height:5,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #ef4f6a'}}/>
            Round 4 · Miami International Autodrome
          </div>
          <h1 style={{fontSize:32,fontWeight:800,letterSpacing:'-1px',marginBottom:8}}>2026 Miami Grand Prix</h1>
          <p style={{fontSize:14,color:C.t2}}>🏆 RESULT: Antonelli WON! Norris P2, Piastri P3 — AI top 2 picks finished 1-2!</p>
        </div>

        <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:16,padding:'20px',marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:16}}>🏆 Championship Leaders</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
            {DRIVERS.slice(0,2).map((d,i) => (
              <div key={i} style={{background:C.bg3,borderRadius:12,padding:'14px',border:'1px solid rgba(0,210,190,0.15)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{d.flag} {d.name}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:2}}>{d.team} · P{d.champPos}</div>
                  </div>
                  <div style={{textAlign:'right' as const}}>
                    <div style={{fontSize:22,fontWeight:800,fontFamily:'monospace',color:'#00d2be'}}>{d.pts}</div>
                    <div style={{fontSize:9,color:C.t3}}>points</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <div style={{flex:1,background:C.bg0,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                    <div style={{fontSize:16,fontWeight:800,color:C.green,fontFamily:'monospace'}}>{d.winPct}%</div>
                    <div style={{fontSize:9,color:C.t3}}>win race</div>
                  </div>
                  <div style={{flex:1,background:C.bg0,borderRadius:8,padding:'8px',textAlign:'center' as const}}>
                    <div style={{fontSize:16,fontWeight:800,color:C.amber,fontFamily:'monospace'}}>{d.champPct}%</div>
                    <div style={{fontSize:9,color:C.t3}}>win title</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{border:'1px solid '+C.border,borderRadius:12,overflow:'hidden',marginBottom:24}}>
          <div style={{display:'grid',gridTemplateColumns:'32px 1fr 70px 80px 80px 90px',padding:'8px 16px',background:C.bg3,borderBottom:'1px solid '+C.border}}>
            {['#','Driver','Win%','Podium%','Title%','Signal'].map((h,i) => (
              <div key={i} style={{fontSize:9,fontWeight:700,color:C.t4,textTransform:'uppercase' as const,letterSpacing:'0.5px',textAlign:i>1?'center' as const:'left' as const}}>{h}</div>
            ))}
          </div>
          {DRIVERS.map((d,i) => (
            <button key={i} onClick={()=>setSelected(selected===i?null:i)}
              style={{width:'100%',display:'grid',gridTemplateColumns:'32px 1fr 70px 80px 80px 90px',padding:'12px 16px',background:selected===i?C.bg3:'transparent',border:'none',borderBottom:i<DRIVERS.length-1?'1px solid rgba(255,255,255,0.04)':'none',cursor:'pointer',textAlign:'left' as const,transition:'background 0.1s',alignItems:'center'}}
              onMouseEnter={ev=>{ev.currentTarget.style.background=C.bg2;}}
              onMouseLeave={ev=>{ev.currentTarget.style.background=selected===i?C.bg3:'transparent';}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t4}}>{i+1}</div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{d.flag} {d.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:d.color,display:'inline-block'}}/>
                  <span style={{fontSize:10,color:C.t3}}>{d.team} · P{d.champPos} · {d.pts}pts</span>
                </div>
              </div>
              <div style={{textAlign:'center' as const}}>
                <div style={{fontSize:15,fontWeight:800,fontFamily:'monospace',color:d.winPct>=30?C.green:d.winPct>=10?C.amber:C.t3}}>{d.winPct}%</div>
                <div style={{width:48,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,margin:'3px auto 0',overflow:'hidden'}}>
                  <div style={{height:'100%',background:d.color,width:(d.winPct/45*100)+'%',borderRadius:2}}/>
                </div>
              </div>
              <div style={{textAlign:'center' as const}}><div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:C.t2}}>{d.podiumPct}%</div></div>
              <div style={{textAlign:'center' as const}}><div style={{fontSize:13,fontWeight:700,fontFamily:'monospace',color:C.t2}}>{d.champPct}%</div></div>
              <div style={{textAlign:'center' as const}}>
                <span style={{fontSize:10,fontWeight:700,color:d.verdictColor,padding:'3px 8px',borderRadius:6,background:d.verdictColor+'15',whiteSpace:'nowrap' as const}}>{d.verdict}</span>
              </div>
            </button>
          ))}
        </div>

        {driver && (
          <div style={{background:C.bg2,border:'1px solid '+C.border2,borderRadius:16,padding:'20px',marginBottom:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
              <div>
                <div style={{fontSize:20,fontWeight:800}}>{driver.flag} {driver.name}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:driver.color,display:'inline-block'}}/>
                  <span style={{fontSize:12,color:C.t2}}>{driver.team} · {driver.pts} championship points</span>
                </div>
              </div>
              <div style={{textAlign:'right' as const}}>
                <div style={{fontSize:32,fontWeight:900,fontFamily:'monospace',color:driver.winPct>=30?C.green:driver.winPct>=10?C.amber:C.t3}}>{driver.winPct}%</div>
                <div style={{fontSize:10,color:C.t3}}>to win Miami</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div style={{background:C.bg3,borderRadius:10,padding:'12px'}}>
                <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:8}}>✅ Bull factors</div>
                {driver.bull.map((b,i) => (
                  <div key={i} style={{fontSize:12,color:C.t2,marginBottom:6,paddingLeft:8,borderLeft:'2px solid '+C.green}}>{b}</div>
                ))}
              </div>
              <div style={{background:C.bg3,borderRadius:10,padding:'12px'}}>
                <div style={{fontSize:10,fontWeight:700,color:C.red,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:8}}>⚠️ Bear factors</div>
                {driver.bear.map((b,i) => (
                  <div key={i} style={{fontSize:12,color:C.t2,marginBottom:6,paddingLeft:8,borderLeft:'2px solid '+C.red}}>{b}</div>
                ))}
              </div>
            </div>
            <div style={{padding:'10px 14px',borderRadius:8,background:driver.verdictColor+'15',border:'1px solid '+driver.verdictColor+'30',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:12,fontWeight:700,color:driver.verdictColor}}>AI Signal: {driver.verdict}</span>
              <button onClick={()=>router.push('/scores?event=Will+'+encodeURIComponent(driver.name)+'+win+F1+Miami+Grand+Prix+2026')}
                style={{fontSize:11,fontWeight:600,color:C.purpleL,padding:'5px 12px',borderRadius:6,border:'1px solid '+C.purpleBorder,background:C.purpleBg,cursor:'pointer'}}>
                Full AI analysis →
              </button>
            </div>
          </div>
        )}

        {/* Monaco GP coming up */}
        <div style={{background:'linear-gradient(135deg,rgba(245,166,35,0.08),rgba(124,111,247,0.05))',border:'1px solid rgba(245,166,35,0.2)',borderRadius:12,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:3}}>🏎️ Next: Monaco Grand Prix</div>
            <div style={{fontSize:11,color:C.t3}}>May 22-25 · Circuit de Monaco · Round 5</div>
          </div>
          <div style={{textAlign:'right' as const}}>
            <div style={{fontSize:11,color:C.amber,fontWeight:600}}>18 days away</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
          {[{label:'Miami GP Result',value:'Antonelli WON 🏆'},{label:'Championship Leader',value:'Antonelli — 97pts'},{label:'Next Race',value:'Monaco May 25'}].map((item,i) => (
            <div key={i} style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:10,padding:'12px',textAlign:'center' as const}}>
              <div style={{fontSize:10,color:C.t3,marginBottom:4}}>{item.label}</div>
              <div style={{fontSize:12,fontWeight:600,color:C.t1}}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{textAlign:'center' as const,fontSize:11,color:C.t3}}>Not financial advice. Probabilities based on championship data and betting markets.</div>
      </div>
    </div>
  );
}
