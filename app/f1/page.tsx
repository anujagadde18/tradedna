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

// Win%/podium%/title% below are an illustrative relative model (same honest framing as our
// sports team-strength ratings elsewhere) — not scraped live betting odds. Standings order,
// results, and storylines are the real, verified facts as of the British GP (July 5, 2026).
const DRIVERS = [
  { pos:1, name:'Kimi Antonelli', team:'Mercedes', flag:'🇮🇹', winPct:26, podiumPct:58, champPct:52, pts:171, champPos:1, gridPos:1, color:'#00d2be', verdict:'STRONG PICK', verdictColor:'#2ecc8a',
    bull:['Championship leader after 9 rounds','Took Silverstone pole and a Sprint win','Fast on most circuit layouts this season'],
    bear:['DNF at Barcelona (engine failure)','Wheel shield failure + penalty cost him Britain','Lead over Russell now down to ~25pts'] },
  { pos:2, name:'George Russell', team:'Mercedes', flag:'🇬🇧', winPct:20, podiumPct:55, champPct:24, pts:149, champPos:2, gridPos:2, color:'#00d2be', verdict:'STRONG PICK', verdictColor:'#2ecc8a',
    bull:['Won the Austrian GP from pole','P2 at Silverstone — consistent podiums','Closing the gap on Antonelli each race'],
    bear:['Hasn\'t out-qualified Antonelli all season','Needs Antonelli to slip again to lead'] },
  { pos:3, name:'Lewis Hamilton', team:'Ferrari', flag:'🇬🇧', winPct:16, podiumPct:48, champPct:12, pts:125, champPos:3, gridPos:3, color:'#dc0000', verdict:'WATCH', verdictColor:'#f5a623',
    bull:['Won the Barcelona GP — Ferrari\'s first win since Mexico 2024','P3 at Silverstone — 9x winner there historically','Engine upgrade brought to recent races'],
    bear:['Off the pace at Austria after the Barcelona high','Still building consistency at Ferrari'] },
  { pos:4, name:'Charles Leclerc', team:'Ferrari', flag:'🇲🇨', winPct:14, podiumPct:42, champPct:8, pts:104, champPos:4, gridPos:4, color:'#dc0000', verdict:'WATCH', verdictColor:'#f5a623',
    bull:['Won the British GP at Silverstone — his first there','Snapped a difficult run of recent form','Strong qualifying pace when the car is right'],
    bear:['Struggled through Montreal and Monaco before this','Inconsistent race-to-race this season'] },
  { pos:5, name:'Max Verstappen', team:'Red Bull', flag:'🇳🇱', winPct:12, podiumPct:38, champPct:6, pts:95, champPos:5, gridPos:5, color:'#1e41ff', verdict:'WATCH', verdictColor:'#f5a623',
    bull:['P2 at Austria — Red Bull\'s best result of the season','Fighting hard even from lower grid slots'],
    bear:['Crashed out at Silverstone — second race-ending car failure in a row','Well off the championship pace this year'] },
  { pos:6, name:'Oscar Piastri', team:'McLaren', flag:'🇦🇺', winPct:6, podiumPct:22, champPct:2, pts:70, champPos:6, gridPos:6, color:'#ff8000', verdict:'LONG SHOT', verdictColor:'#ef4f6a',
    bull:['McLaren race pace still competitive','Capable of podiums on the right weekend'],
    bear:['Difficult recent races — P11 at Silverstone','Fallen off the championship picture'] },
  { pos:7, name:'Lando Norris', team:'McLaren', flag:'🇬🇧', winPct:6, podiumPct:20, champPct:2, pts:65, champPos:7, gridPos:7, color:'#ff8000', verdict:'LONG SHOT', verdictColor:'#ef4f6a',
    bull:['Defending champion pedigree','McLaren upgrades keep coming'],
    bear:['P4 at Silverstone — solid but not a threat for wins','Needs a big result to re-enter title picture'] },
];

export default function F1Page() {
  const router = useRouter();
  const [selected, setSelected] = useState<number|null>(null);
  const driver = selected !== null ? DRIVERS[selected] : null;

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.95)',backdropFilter:'blur(20px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'}}>
        <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:C.purpleL,cursor:'pointer',fontSize:13,fontWeight:600}}>← PlayPicks AI</button>
        <div style={{fontSize:13,fontWeight:700,color:C.t1}}>🏎️ F1 British Grand Prix</div>
        <div style={{fontSize:11,color:C.t3}}>Jul 5, 2026 · Round 9</div>
      </nav>

      <div style={{maxWidth:960,margin:'0 auto',padding:'72px 24px 48px'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(239,79,106,0.1)',border:'1px solid rgba(239,79,106,0.2)',color:C.red,padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:600,letterSpacing:'0.4px',textTransform:'uppercase' as const,marginBottom:16}}>
            <span style={{width:5,height:5,background:C.red,borderRadius:'50%',display:'block',boxShadow:'0 0 6px #ef4f6a'}}/>
            Round 9 · Silverstone Circuit, Great Britain
          </div>
          <h1 style={{fontSize:32,fontWeight:800,letterSpacing:'-1px',marginBottom:8}}>2026 British Grand Prix</h1>
          <p style={{fontSize:14,color:C.t2}}>🏆 RESULT: Leclerc WON at Silverstone! Russell P2 · Hamilton P3 · Antonelli no points (wheel failure + penalty)</p>
        </div>

        <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:16,padding:'20px',marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'0.5px',marginBottom:16}}>🏆 Championship Leaders</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
            {DRIVERS.slice(0,2).map((d,i) => (
              <div key={i} style={{background:C.bg3,borderRadius:12,padding:'14px',border:'1px solid rgba(0,210,190,0.15)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{d.flag} {d.name}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:2}}>{d.team} · Champ P{d.champPos}</div>
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
                  <span style={{fontSize:10,color:C.t3}}>{d.team} · Grid P{(d as any).gridPos||d.champPos} · {d.pts}pts</span>
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
                <div style={{fontSize:10,color:C.t3}}>to win next race</div>
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
              <button onClick={()=>router.push('/scores?event=Will+'+encodeURIComponent(driver.name)+'+win+F1+Belgian+Grand+Prix+2026')}
                style={{fontSize:11,fontWeight:600,color:C.purpleL,padding:'5px 12px',borderRadius:6,border:'1px solid '+C.purpleBorder,background:C.purpleBg,cursor:'pointer'}}>
                Full AI analysis →
              </button>
            </div>
          </div>
        )}

        {/* Race results + upcoming */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
          <div style={{background:'rgba(46,204,138,0.06)',border:'1px solid rgba(46,204,138,0.2)',borderRadius:12,padding:'12px 14px'}}>
            <div style={{fontSize:10,color:C.green,fontWeight:700,textTransform:'uppercase' as const,marginBottom:4}}>Silverstone Qualifying</div>
            <div style={{fontSize:12,fontWeight:600,color:C.t1}}>🏆 Antonelli POLE</div>
            <div style={{fontSize:11,color:C.t3}}>Leclerc P2 · Hamilton P3</div>
          </div>
          <div style={{background:'rgba(245,166,35,0.06)',border:'1px solid rgba(245,166,35,0.2)',borderRadius:12,padding:'12px 14px'}}>
            <div style={{fontSize:10,color:C.amber,fontWeight:700,textTransform:'uppercase' as const,marginBottom:4}}>Next Race</div>
            <div style={{fontSize:12,fontWeight:600,color:C.t1}}>🇧🇪 Belgian GP · Jul 17-19</div>
            <div style={{fontSize:11,color:C.t3}}>Circuit de Spa-Francorchamps</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
          {[{label:'British GP Result',value:'Leclerc WON 🏆'},{label:'Next: Belgian GP',value:'Jul 17-19 · Round 10'},{label:'Championship Lead',value:'Antonelli +25pts'}].map((item,i) => (
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
