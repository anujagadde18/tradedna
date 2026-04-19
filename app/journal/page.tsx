'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const S = {
  bg:'#0a0a0b', bg2:'#111113', bg3:'#18181c', bg4:'#1f1f25',
  border:'rgba(255,255,255,0.07)', border2:'rgba(255,255,255,0.12)',
  text:'#f0eff4', text2:'#9998a8', text3:'#5e5d6e',
  purple:'#7c6ff7', purple2:'#9d98f8',
  green:'#34d399', amber:'#fbbf24', red:'#f87171', blue:'#60a5fa',
};

type JournalEntry = {
  id: string;
  question: string;
  aiConfidence: number;
  marketOdds: number | null;
  edge: number | null;
  weights: { news: number; social: number; technical: number };
  sources: { name: string; type: string; contribution: number }[];
  result: 'correct' | 'incorrect' | 'pending';
  timestamp: number;
  notes?: string;
};

function saveEntry(entry: JournalEntry) {
  try {
    const existing = localStorage.getItem('pp_journal');
    const journal = existing ? JSON.parse(existing) : [];
    const idx = journal.findIndex((e: JournalEntry) => e.id === entry.id);
    if (idx >= 0) journal[idx] = entry;
    else journal.unshift(entry);
    if (journal.length > 200) journal.splice(200);
    localStorage.setItem('pp_journal', JSON.stringify(journal));
  } catch {}
}

function getJournal(): JournalEntry[] {
  try {
    const saved = localStorage.getItem('pp_journal');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filter, setFilter] = useState<'all'|'correct'|'incorrect'|'pending'>('all');
  const [expanded, setExpanded] = useState<string|null>(null);

  useEffect(() => {
    const journal = getJournal();
    // Seed with real predictions if journal is empty
    if (journal.length === 0) {
      const seed: JournalEntry[] = [
        { id:'rcb-lsg-apr15', question:'Will Royal Challengers Bengaluru beat Lucknow Super Giants in IPL 2026?', aiConfidence:73, marketOdds:null, edge:null, weights:{news:35,social:40,technical:25}, sources:[{name:'IPL Stats',type:'market',contribution:8},{name:'NewsAPI',type:'news',contribution:5},{name:'Form Guide',type:'technical',contribution:4}], result:'correct', timestamp:1744675200000, notes:'RCB won at Chinnaswamy. Home advantage was key factor.' },
        { id:'pbks-mi-apr16', question:'Will Punjab Kings beat Mumbai Indians in IPL 2026?', aiConfidence:76, marketOdds:null, edge:null, weights:{news:35,social:40,technical:25}, sources:[{name:'IPL Stats',type:'market',contribution:10},{name:'GDELT',type:'news',contribution:6}], result:'correct', timestamp:1744761600000, notes:'PBKS won by 7 wickets at Wankhede.' },
        { id:'gt-kkr-apr17', question:'Will Gujarat Titans beat Kolkata Knight Riders in IPL 2026?', aiConfidence:84, marketOdds:null, edge:null, weights:{news:35,social:40,technical:25}, sources:[{name:'IPL Stats',type:'market',contribution:12},{name:'NewsAPI',type:'news',contribution:7}], result:'correct', timestamp:1744848000000, notes:'GT won convincingly. KKR still winless.' },
        { id:'iran-peace-apr13', question:'US x Iran permanent peace deal by June 30', aiConfidence:73, marketOdds:68, edge:5, weights:{news:35,social:40,technical:25}, sources:[{name:'Polymarket',type:'market',contribution:8},{name:'NewsAPI',type:'news',contribution:6},{name:'GDELT',type:'social',contribution:4}], result:'pending', timestamp:1744588800000 },
        { id:'rory-masters-apr10', question:'Rory McIlroy wins Masters 2026', aiConfidence:75, marketOdds:70, edge:5, weights:{news:35,social:40,technical:25}, sources:[{name:'Polymarket',type:'market',contribution:7},{name:'NewsAPI',type:'news',contribution:8}], result:'correct', timestamp:1744329600000, notes:'Rory won his career Grand Slam.' },
        { id:'rcb-dc-apr17', question:'Will RCB beat Delhi Capitals in IPL 2026?', aiConfidence:61, marketOdds:null, edge:null, weights:{news:35,social:40,technical:25}, sources:[{name:'IPL Stats',type:'market',contribution:5},{name:'NewsAPI',type:'news',contribution:3}], result:'incorrect', timestamp:1744848000000, notes:'DC pulled the upset at Chinnaswamy.' },
      ];
      seed.forEach(saveEntry);
      setEntries(seed);
    } else {
      setEntries(journal);
    }
  }, []);

  const filtered = entries.filter(e => filter === 'all' || e.result === filter);
  const resolved = entries.filter(e => e.result !== 'pending');
  const correct = resolved.filter(e => e.result === 'correct');
  const winRate = resolved.length > 0 ? Math.round((correct.length/resolved.length)*100) : 0;

  const updateResult = (id: string, result: 'correct'|'incorrect'|'pending') => {
    const updated = entries.map(e => e.id === id ? {...e, result} : e);
    updated.forEach(saveEntry);
    setEntries(updated);
  };

  return (
    <div style={{background:S.bg, minHeight:'100vh', color:S.text, fontFamily:'system-ui, sans-serif'}}>
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:'rgba(10,10,11,0.9)',backdropFilter:'blur(12px)',borderBottom:'1px solid '+S.border,padding:'0 24px',height:52,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:6,color:S.text2,cursor:'pointer',fontSize:13,border:'none',background:'none'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><polyline points="15 18 9 12 15 6"/></svg>
            Home
          </button>
          <span style={{fontSize:14,fontWeight:700,color:S.text}}>PlayPicks AI</span>
          <span style={{fontSize:11,color:S.text3}}>/ Journal</span>
        </div>
        <button onClick={()=>router.push('/accuracy')} style={{padding:'5px 14px',background:'transparent',border:'1px solid '+S.border2,borderRadius:8,color:S.text2,fontSize:12,cursor:'pointer'}}>
          Public accuracy →
        </button>
      </nav>

      <div style={{paddingTop:52}}>
        <div style={{maxWidth:820,margin:'0 auto',padding:'32px 20px 80px'}}>

          {/* Header */}
          <div style={{marginBottom:28}}>
            <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.5px',margin:'0 0 6px'}}>Prediction Journal</h1>
            <p style={{fontSize:13,color:S.text2,margin:0}}>Every analysis saved with source breakdown and weights used</p>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:24}}>
            {[
              {val:entries.length,label:'Total predictions',color:S.text},
              {val:winRate+'%',label:'Win rate',color:winRate>=60?S.green:S.amber},
              {val:correct.length+'/'+resolved.length,label:'Resolved',color:S.blue},
              {val:entries.filter(e=>e.edge&&e.edge>0).length,label:'With market edge',color:S.purple2},
            ].map((s,i)=>(
              <div key={i} style={{background:S.bg3,border:'1px solid '+S.border,borderRadius:12,padding:'14px 16px'}}>
                <div style={{fontSize:24,fontWeight:800,color:s.color,fontFamily:'monospace',marginBottom:4}}>{s.val}</div>
                <div style={{fontSize:11,color:S.text3}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {(['all','correct','incorrect','pending'] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{padding:'5px 14px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid '+(filter===f?S.purple:S.border),background:filter===f?'rgba(124,111,247,0.1)':'transparent',color:filter===f?S.purple2:S.text2}}>
                {f==='correct'?'✅ Correct':f==='incorrect'?'❌ Incorrect':f==='pending'?'⏳ Pending':'All'}
              </button>
            ))}
          </div>

          {/* Entries */}
          {filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px 20px',color:S.text3}}>
              <div style={{fontSize:32,marginBottom:12}}>📋</div>
              <div style={{fontSize:15,fontWeight:600,marginBottom:8,color:S.text2}}>No predictions yet</div>
              <div style={{fontSize:13,marginBottom:20}}>Start analyzing markets to build your journal</div>
              <button onClick={()=>router.push('/')} style={{padding:'8px 20px',background:S.purple,color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Analyze a market</button>
            </div>
          ) : filtered.map(e => {
            const isExpanded = expanded === e.id;
            const resultColor = e.result==='correct'?S.green:e.result==='incorrect'?S.red:S.amber;
            const resultIcon = e.result==='correct'?'✅':e.result==='incorrect'?'❌':'⏳';

            return (
              <div key={e.id} style={{background:S.bg3,border:'1px solid '+S.border,borderRadius:14,marginBottom:10,overflow:'hidden'}}>
                <div onClick={()=>setExpanded(isExpanded?null:e.id)} style={{padding:'16px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{fontSize:20,flexShrink:0}}>{resultIcon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:S.text,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.question}</div>
                    <div style={{display:'flex',gap:12,fontSize:11,color:S.text3}}>
                      <span>{new Date(e.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                      {e.edge !== null && e.edge > 0 && <span style={{color:S.purple2}}>+{e.edge}% edge</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:22,fontWeight:800,color:resultColor,fontFamily:'monospace'}}>{e.aiConfidence}%</div>
                    <div style={{fontSize:10,color:S.text3}}>AI confidence</div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{padding:'0 20px 20px',borderTop:'1px solid '+S.border}}>

                    {/* Source breakdown */}
                    <div style={{marginTop:16,marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.5px',color:S.text3,marginBottom:10}}>Source breakdown</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                        {[
                          {label:'News weight',val:e.weights.news+'%',color:S.blue},
                          {label:'Social weight',val:e.weights.social+'%',color:S.green},
                          {label:'Technical weight',val:e.weights.technical+'%',color:S.purple2},
                        ].map(w=>(
                          <div key={w.label} style={{background:S.bg4,borderRadius:8,padding:'10px 12px'}}>
                            <div style={{fontSize:16,fontWeight:700,color:w.color,fontFamily:'monospace'}}>{w.val}</div>
                            <div style={{fontSize:10,color:S.text3}}>{w.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sources */}
                    {e.sources.length > 0 && (
                      <div style={{marginBottom:16}}>
                        <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.5px',color:S.text3,marginBottom:8}}>Active sources</div>
                        {e.sources.map((s,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid '+S.border,fontSize:12}}>
                            <span style={{color:S.text2}}>{s.name}</span>
                            <span style={{color:s.contribution>0?S.green:s.contribution<0?S.red:S.text3,fontWeight:600}}>
                              {s.contribution>0?'+':''}{s.contribution}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Market comparison */}
                    {e.marketOdds && (
                      <div style={{background:S.bg4,borderRadius:10,padding:'12px 14px',marginBottom:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                          <span style={{color:S.text3}}>Market odds</span>
                          <span style={{color:S.text2,fontWeight:600}}>{e.marketOdds}%</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginTop:4}}>
                          <span style={{color:S.text3}}>AI confidence</span>
                          <span style={{color:S.purple2,fontWeight:600}}>{e.aiConfidence}%</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginTop:4}}>
                          <span style={{color:S.text3}}>Edge</span>
                          <span style={{color:e.edge&&e.edge>0?S.green:S.red,fontWeight:700}}>{e.edge&&e.edge>0?'+':''}{e.edge}%</span>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {e.notes && (
                      <div style={{fontSize:12,color:S.text2,lineHeight:1.6,padding:'10px 12px',background:S.bg4,borderRadius:8,borderLeft:'3px solid rgba(124,111,247,0.4)',marginBottom:16}}>
                        {e.notes}
                      </div>
                    )}

                    {/* Update result */}
                    {e.result === 'pending' && (
                      <div style={{display:'flex',gap:8}}>
                        <div style={{fontSize:11,color:S.text3,marginRight:4,alignSelf:'center'}}>Mark result:</div>
                        <button onClick={()=>updateResult(e.id,'correct')} style={{padding:'5px 12px',background:'rgba(52,211,153,0.1)',border:'1px solid rgba(52,211,153,0.3)',borderRadius:6,color:S.green,fontSize:12,fontWeight:600,cursor:'pointer'}}>✅ Correct</button>
                        <button onClick={()=>updateResult(e.id,'incorrect')} style={{padding:'5px 12px',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:6,color:S.red,fontSize:12,fontWeight:600,cursor:'pointer'}}>❌ Incorrect</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{textAlign:'center',marginTop:24}}>
            <button onClick={()=>router.push('/accuracy')} style={{padding:'10px 24px',background:'transparent',border:'1px solid '+S.border2,borderRadius:10,color:S.text2,fontSize:13,fontWeight:600,cursor:'pointer'}}>
              View public accuracy record →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
