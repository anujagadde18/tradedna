'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { TradePanel } from '@/components/TradePanel';
import { PlainTextAnalysis } from '@/components/PlainTextAnalysis';
import { calculateIntelligence } from '@/lib/intelligenceEngine';

interface TradeReadyData {
  marketTitle: string; marketUrl: string; outcomeType: string;
  marketType: 'binary'|'categorical';
  topOutcome: { name: string; odds: number; aiConfidence: number; edge: number; tokenId?: string; };
}

const C = {
  bg0:'#06060a', bg1:'#0e0e14', bg2:'#14141c', bg3:'#1a1a24', bg4:'#22222e', bg5:'#2a2a38',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)', border3:'rgba(255,255,255,0.15)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78', t4:'#3a3858',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)',
  green:'#2ecc8a', greenBg:'rgba(46,204,138,0.1)',
  amber:'#f5a623', amberBg:'rgba(245,166,35,0.1)',
  red:'#ef4f6a', redBg:'rgba(239,79,106,0.1)',
  blue:'#4d9de0', blueBg:'rgba(77,157,224,0.1)',
};

type SigType = 'strong'|'mixed'|'contrary'|'priced';
function SigPill({ type }: { type: SigType }) {
  const m = { strong:{bg:'rgba(46,204,138,0.12)',c:C.green}, mixed:{bg:'rgba(245,166,35,0.12)',c:C.amber}, contrary:{bg:'rgba(239,79,106,0.12)',c:C.red}, priced:{bg:'rgba(77,157,224,0.12)',c:C.blue} }[type];
  const l = { strong:'Strong', mixed:'Mixed', contrary:'Contrary', priced:'Priced in' }[type];
  return <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,background:m.bg,color:m.c}}><span style={{width:5,height:5,borderRadius:'50%',background:m.c,display:'inline-block'}}></span>{l}</span>;
}

function DonutChart({ value, color }: { value: number; color: string }) {
  const r = 38, circ = 2 * Math.PI * r;
  const fill = (Math.min(value,100)/100) * circ;
  return (
    <div style={{position:'relative',width:120,height:120}}>
      <svg viewBox="0 0 100 100" width={120} height={120}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={C.bg4} strokeWidth="10"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${fill} ${circ}`}
          transform="rotate(-90 50 50)" style={{transition:'stroke-dasharray 0.6s ease'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <div style={{fontSize:20,fontWeight:700,color:C.t1,fontFamily:'monospace',letterSpacing:-0.5}}>{value}%</div>
        <div style={{fontSize:9,color:C.t3,textTransform:'uppercase',letterSpacing:'0.5px'}}>AI confidence</div>
      </div>
    </div>
  );
}

function SignalBar({ label, pct, type, color }: { label: string; pct: number; type: SigType; color: string }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
        <span style={{fontSize:12,fontWeight:500,color:C.t1}}>{label}</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <SigPill type={type} />
          <span style={{fontSize:12,fontWeight:600,fontFamily:'monospace',color}}>{pct > 0 ? '+' : ''}{pct}%</span>
        </div>
      </div>
      <div style={{height:4,background:C.bg4,borderRadius:2,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:2,background:color,width:Math.min((pct/35)*100,100)+'%',transition:'width 0.5s ease'}}></div>
      </div>
    </div>
  );
}

function ScoresPageContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const event = sp.get('event') || '';

  const [intel, setIntel]         = useState<any>(null);
  const [odds, setOdds]           = useState<number|null>(null);
  const [mtype, setMtype]         = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes]   = useState<any[]>([]);
  const [hasUrl, setHasUrl]       = useState<boolean|null>(null);
  const [tradeData, setTradeData] = useState<TradeReadyData|null>(null);
  const [weights, setWeights]     = useState({news:35,social:40,technical:25});
  const [related, setRelated]     = useState<any[]>([]);
  const [addSrcOpen, setAddSrcOpen] = useState(false);
  const [customSrc, setCustomSrc] = useState('');
  const [srcCount, setSrcCount]   = useState(10);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [showOutcomes, setShowOutcomes] = useState(false);

  useEffect(() => { setHasUrl(event.includes('polymarket.com/event/')); }, []);

  useEffect(() => {
    const go = async () => {
      try {
        const stop = new Set(['will','there','that','this','what','when','have','does','with','would','the','and','for','are']);
        const q = event.replace(/[?!.,]/g,'').split(' ').filter(w => w.length>2 && !stop.has(w.toLowerCase())).slice(0,4).join(' ');
        const r = await fetch('/api/search?q='+encodeURIComponent(q));
        const d = await r.json();
        if (d.results) setRelated(d.results.slice(0,5));
      } catch {}
    };
    if (event) go();
  }, [event]);

  const runAnalysis = () => {
    if (mtype === 'categorical') return;
    setIntel(calculateIntelligence(54, weights, 0, odds, event));
  };

  useEffect(() => { runAnalysis(); }, [event, odds, mtype, weights]);

  const doReanalyze = () => {
    setReanalyzing(true); setProgress(0);
    const t = setInterval(() => setProgress(p => { if (p >= 95) { clearInterval(t); return p; } return p + 15; }), 120);
    setTimeout(() => { runAnalysis(); setReanalyzing(false); setProgress(100); setTimeout(()=>setProgress(0),300); clearInterval(t); }, 900);
  };

  const isPlain  = hasUrl === false;
  const top      = outcomes[0] || {name:'',odds:0,aiConfidence:0,edge:0,weekChange:0};
  const binaryAI = intel?.confidence || 0;
  const binEdge  = binaryAI - (odds||0);
  const edgeVal  = mtype==='categorical' ? (top.edge||0) : binEdge;
  const mainOdds = mtype==='categorical' ? top.odds : (odds||0);
  const mainAI   = mtype==='categorical' ? top.aiConfidence : binaryAI;
  const mainName = mtype==='categorical' ? top.name : (intel?.direction||'YES');

  const isHigh  = edgeVal >= 5, isMed = edgeVal >= 2 && edgeVal < 5;
  const convC   = isHigh ? C.green : isMed ? C.amber : C.red;
  const convBg  = isHigh ? C.greenBg : isMed ? C.amberBg : C.redBg;
  const convBdr = isHigh ? 'rgba(46,204,138,0.2)' : isMed ? 'rgba(245,166,35,0.2)' : 'rgba(239,79,106,0.2)';
  const convLbl = isHigh ? 'Strong opportunity' : isMed ? 'Moderate opportunity' : 'Low opportunity';
  const soWhat  = isHigh ? 'AI sees a real edge here. Market may be underpricing this outcome.' :
                  isMed  ? 'AI slightly favors this outcome but signals are mixed. Market has partially priced this in. Only bet if you have a specific macro view.' :
                           'AI agrees with the market. No meaningful edge detected. Not a strong betting opportunity right now.';
  const betAmt  = isHigh ? '$75 - $200' : isMed ? '$25 - $75' : 'Skip or small bet';
  const convBar = isHigh ? 85 : isMed ? 50 : 20;

  const sigN = Math.round(mainAI*(weights.news/100));
  const sigS = Math.round(mainAI*(weights.social/100));
  const sigM = Math.round(mainAI*(weights.technical/100));

  const eventTitle = (() => {
    const idx = event.indexOf('polymarket.com/event/');
    if (idx >= 0) { const slug = event.slice(idx+21).split('/')[0].split('?')[0]; return slug.split('-').map((w:string) => w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }
    return event.length > 80 ? event.slice(0,80) : event;
  })();

  const handleW = (key:string, val:number) => {
    const rem = 100-val;
    const others = Object.keys(weights).filter(k=>k!==key) as Array<keyof typeof weights>;
    const ot = others.reduce((s,k)=>s+weights[k],0);
    const nw = {...weights,[key]:val};
    if (ot>0) others.forEach(k=>{nw[k]=Math.round((weights[k]/ot)*rem);});
    const tot = Object.values(nw).reduce((s,v)=>s+v,0);
    if (tot!==100) nw[others[0]]+=(100-tot);
    setWeights(nw as typeof weights);
  };

  const fmtVol = (v:number) => v>=1_000_000?'$'+(v/1_000_000).toFixed(1)+'M':v>=1_000?'$'+(v/1_000).toFixed(0)+'K':'$'+v;

  const navStyle: React.CSSProperties = {position:'fixed',top:0,left:0,right:0,zIndex:200,height:52,background:'rgba(6,6,10,0.9)',backdropFilter:'blur(16px)',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px'};
  const slblStyle: React.CSSProperties = {fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.t3,marginBottom:10,display:'flex',alignItems:'center',gap:6};

  const sources = {
    news: [{nm:'Reuters',sig:'Mixed economic signals',type:'mixed'},{nm:'Financial Times',sig:'Points to uncertainty',type:'mixed'},{nm:'Bloomberg',sig:'Cautiously optimistic',type:'strong'},{nm:'Politico',sig:'Policy developments',type:'strong'}],
    social: [{nm:'r/politics',sig:'No clear consensus',type:'mixed'},{nm:'r/economics',sig:'Expert discussion mixed',type:'mixed'},{nm:'Twitter/X',sig:'High engagement',type:'strong'}],
    market: [{nm:'Polymarket',sig:'Related markets active',type:'priced'},{nm:'Kalshi',sig:'Contracts available',type:'priced'},{nm:'Metaculus',sig:'Community forecasts',type:'strong'}],
  };

  return (
    <div style={{background:C.bg0,minHeight:'100vh',color:C.t1,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <nav style={navStyle}>
        <button onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:5,color:C.t2,border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:500}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>Back
        </button>
        <div style={{fontSize:14,fontWeight:700,letterSpacing:'-0.3px'}}>PlayPicks AI</div>
        <div style={{display:'flex',gap:4}}>
          <button onClick={()=>router.push('/journal')} style={{padding:'5px 14px',borderRadius:8,fontSize:13,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Journal</button>
          <button onClick={()=>router.push('/profile')} style={{padding:'5px 14px',borderRadius:8,fontSize:13,fontWeight:500,color:C.t2,border:'none',background:'none',cursor:'pointer'}}>Profile</button>
        </div>
      </nav>

      {reanalyzing && progress > 0 && (
        <div style={{position:'fixed',top:52,left:0,right:0,zIndex:150,height:3,background:C.bg3}}>
          <div style={{height:'100%',background:C.purple,width:progress+'%',transition:'width 0.12s linear',borderRadius:'0 2px 2px 0'}}></div>
        </div>
      )}

      <div style={{paddingTop:52}}>
        <div style={{padding:'10px 20px',borderBottom:'1px solid '+C.border,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.t1,lineHeight:1.3}}>{eventTitle}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:2}}>
              {isPlain ? 'General signals only - no live Polymarket URL' : 'Live Polymarket data'}
            </div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={doReanalyze} style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:600,background:C.purple,color:'white',border:'none',cursor:'pointer'}}>Re-analyze</button>
            <button style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:500,background:C.bg3,color:C.t2,border:'1px solid '+C.border2,cursor:'pointer'}}>Save</button>
          </div>
        </div>

        {isPlain ? (
          <div style={{padding:24}}>
            <PlainTextAnalysis question={event} confidence={mainAI||50} direction={intel?.direction||'YES'} weights={weights} activeSources={[]} />
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'280px 1fr 300px',minHeight:'calc(100vh - 92px)'}}>

            <div style={{borderRight:'1px solid '+C.border,padding:'20px 16px',overflowY:'auto',maxHeight:'calc(100vh - 92px)'}}>
              <div style={slblStyle}>
                Sources <span style={{background:C.bg4,color:C.t3,padding:'1px 6px',borderRadius:8,fontSize:9}}>{srcCount}</span>
                <span style={{marginLeft:'auto',fontSize:9,color:C.t3,textTransform:'none' as const,letterSpacing:0,fontWeight:400,cursor:'pointer'}}>{srcCount} active</span>
              </div>

              {[
                {cat:'News',color:C.blue,wkey:'news',items:sources.news},
                {cat:'Social',color:C.purpleL,wkey:'social',items:sources.social},
                {cat:'Market',color:C.green,wkey:'market',items:sources.market},
              ].map(g => (
                <div key={g.cat} style={{marginBottom:8}}>
                  <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase' as const,letterSpacing:'0.5px',display:'flex',justifyContent:'space-between',padding:'6px 0 4px',marginTop:8}}>
                    <span style={{color:g.color}}>{g.cat}</span>
                    <span style={{color:C.t3}}>{weights[g.wkey==='market'?'technical':g.wkey as keyof typeof weights]}%</span>
                  </div>
                  {g.items.map((s:any) => (
                    <div key={s.nm} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid '+C.border}}>
                      <div>
                        <div style={{fontSize:11,fontWeight:500,color:C.t1,marginBottom:1}}>{s.nm}</div>
                        <div style={{fontSize:10,color:C.t3}}>{s.sig}</div>
                      </div>
                      <SigPill type={s.type as SigType} />
                    </div>
                  ))}
                </div>
              ))}

              <div onClick={()=>setAddSrcOpen(!addSrcOpen)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 10px',border:'1px dashed '+C.border2,borderRadius:8,cursor:'pointer',marginTop:8,fontSize:11,color:C.t3}}>
                <span style={{fontSize:14}}>+</span> Add custom source
              </div>
              {addSrcOpen && (
                <div style={{display:'flex',gap:5,marginTop:6}}>
                  <input value={customSrc} onChange={e=>setCustomSrc(e.target.value)} placeholder="URL or publication..."
                    style={{flex:1,background:C.bg3,border:'1px solid '+C.border2,borderRadius:6,padding:'6px 10px',color:C.t1,fontSize:11,outline:'none',fontFamily:'inherit'}} />
                  <button onClick={()=>{if(customSrc.trim()){setSrcCount(c=>c+1);setCustomSrc('');setAddSrcOpen(false);}}} style={{background:C.purple,color:'white',border:'none',borderRadius:6,padding:'6px 12px',fontSize:11,fontWeight:600,cursor:'pointer'}}>Add</button>
                </div>
              )}

              <div style={{height:1,background:C.border,margin:'16px 0'}}></div>

              <div style={slblStyle}>Tune your analysis</div>
              <p style={{fontSize:10,color:C.t2,marginBottom:12,lineHeight:1.6}}>Move sliders and watch the verdict update live in real time.</p>

              {[
                {key:'news',label:'News sources',desc:'Trust in mainstream news coverage'},
                {key:'social',label:'Social signals',desc:'Reddit, Twitter, community discussion'},
                {key:'technical',label:'Market probability',desc:'Polymarket and Kalshi live odds'},
              ].map(s => (
                <div key={s.key} style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                    <span style={{fontSize:11,fontWeight:500,color:C.t1}}>{s.label}</span>
                    <span style={{fontSize:11,fontWeight:600,fontFamily:'monospace',color:C.purpleL}}>{weights[s.key as keyof typeof weights]}%</span>
                  </div>
                  <div style={{fontSize:10,color:C.t3,marginBottom:5}}>{s.desc}</div>
                  <input type="range" min="0" max="100" step="5"
                    value={weights[s.key as keyof typeof weights]}
                    onChange={e=>handleW(s.key,parseInt(e.target.value))}
                    style={{width:'100%',accentColor:C.purple}} />
                </div>
              ))}
              <div style={{fontSize:10,fontWeight:600,color:weights.news+weights.social+weights.technical===100?C.green:C.red}}>
                Total: {weights.news+weights.social+weights.technical}% {weights.news+weights.social+weights.technical===100?'- balanced':'- must equal 100%'}
              </div>
            </div>

            <div style={{padding:'20px 20px',overflowY:'auto',maxHeight:'calc(100vh - 92px)'}}>
              <PolymarketComparison
                userQuestion={event} aiPrediction={mainAI}
                onDataReceived={(o,t,outs,ot)=>{setOdds(o);if(t)setMtype(t);if(outs)setOutcomes(outs);setHasUrl(true);}}
                onTradeReady={(d:TradeReadyData)=>setTradeData(d)}
              />

              <div style={{marginTop:20,background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px 20px',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',color:C.t3,marginBottom:8}}>AI Verdict</div>
                    <div style={{fontSize:11,color:C.t2,marginBottom:4}}>{eventTitle.slice(0,50)}{eventTitle.length>50?'...':''}</div>
                    <div style={{fontSize:44,fontWeight:700,letterSpacing:-2,lineHeight:1,color:C.t1,marginBottom:4}}>{mainOdds>0?mainOdds+'%':'--'}</div>
                    <div style={{fontSize:12,color:C.t3,marginBottom:10}}>{mainOdds>=65?'Likely yes':mainOdds>=40?'Uncertain':'Likely no'}</div>
                    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:8,fontSize:12,fontWeight:600,background:convBg,color:convC,border:'1px solid '+convBdr}}>{convLbl}</span>
                  </div>
                  <DonutChart value={mainAI||0} color={convC} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:12}}>
                  {[{val:(odds||0)+'%',lbl:'Market',c:C.t2},{val:mainAI+'%',lbl:'AI thinks',c:C.purpleL},{val:(edgeVal>0?'+':'')+edgeVal.toFixed(1)+'%',lbl:'Edge',c:convC}].map((x,i)=>(
                    <div key={i} style={{background:C.bg3,borderRadius:8,padding:10,textAlign:'center'}}>
                      <div style={{fontSize:22,fontWeight:700,letterSpacing:-0.5,color:x.c}}>{x.val}</div>
                      <div style={{fontSize:10,color:C.t3,textTransform:'uppercase',letterSpacing:'0.4px',marginTop:3}}>{x.lbl}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:'10px 12px',background:C.bg3,borderRadius:8,borderLeft:'3px solid '+convBdr,fontSize:12,color:C.t2,lineHeight:1.6}}>{soWhat}</div>
                <div style={{marginTop:8,fontSize:12,fontWeight:600,color:convC}}>Suggested position: {betAmt}</div>
              </div>

              <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px 20px',marginBottom:14}}>
                <div style={slblStyle}>Signal breakdown</div>
                <SignalBar label="News sentiment" pct={sigN} type={sigN>20?'strong':'mixed'} color={sigN>20?C.green:C.amber} />
                <SignalBar label="Community signal" pct={sigS} type={sigS>20?'strong':'mixed'} color={sigS>20?C.green:C.amber} />
                <SignalBar label="Market probability" pct={sigM} type="priced" color={C.blue} />
              </div>

              {outcomes.length > 0 && (
                <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px 20px',marginBottom:14}}>
                  <div style={{...slblStyle,cursor:'pointer'}} onClick={()=>setShowOutcomes(!showOutcomes)}>
                    All outcomes <span style={{background:C.bg4,color:C.t3,padding:'1px 6px',borderRadius:8,fontSize:9}}>{outcomes.length}</span>
                    <span style={{marginLeft:'auto',fontSize:9,color:C.t3,textTransform:'none' as const,letterSpacing:0,fontWeight:400}}>{showOutcomes?'Hide':'Show'}</span>
                  </div>
                  {showOutcomes && outcomes.slice(0,10).map((o:any,i:number)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid '+C.border}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                        <span style={{width:6,height:6,borderRadius:'50%',background:i===0?C.purple:C.bg5,display:'inline-block',flexShrink:0}}></span>
                        <span style={{fontSize:12,color:i===0?C.t1:C.t2,fontWeight:i===0?600:400}}>{o.name}</span>
                      </div>
                      <span style={{fontSize:i===0?16:12,fontWeight:700,color:i===0?C.t1:C.t3,fontFamily:'monospace'}}>{o.odds}%</span>
                    </div>
                  ))}
                </div>
              )}

              {related.length > 0 && (
                <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px 20px',marginBottom:14}}>
                  <div style={slblStyle}>People are betting on this</div>
                  {related.map((m,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<related.length-1?'1px solid '+C.border:'none'}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:500,color:C.t1,lineHeight:1.3}}>{m.title}</div>
                        <div style={{fontSize:10,color:C.t3,marginTop:2}}>{fmtVol(m.volume)}</div>
                      </div>
                      <button onClick={()=>router.push('/scores?event='+encodeURIComponent(m.url))}
                        style={{padding:'4px 12px',background:C.purpleBg,border:'1px solid rgba(124,111,247,0.25)',borderRadius:6,fontSize:11,fontWeight:600,color:C.purpleL,cursor:'pointer'}}>
                        Analyze
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px 20px'}}>
                <div style={slblStyle}>New to Polymarket?</div>
                {[{n:1,t:'Create a Polymarket account',d:'Sign up at polymarket.com with just your email',link:'https://polymarket.com'},{n:2,t:'Deposit USDC (min $5)',d:'Use a credit card or crypto wallet'},{n:3,t:'Paste a Polymarket URL here',d:'Get full live-odds analysis before placing a bet'}].map(s=>(
                  <div key={s.n} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:12}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:C.purpleBg,color:C.purpleL,fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}>{s.n}</div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{s.t}</div>
                      <div style={{fontSize:11,color:C.t2,lineHeight:1.5}}>{s.d}</div>
                      {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.purpleL,marginTop:3,display:'block'}}>Go to Polymarket</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{borderLeft:'1px solid '+C.border,padding:'20px 16px',overflowY:'auto',maxHeight:'calc(100vh - 92px)'}}>
              <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px',marginBottom:12}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.8px',color:C.t3,marginBottom:12}}>AI Verdict</div>
                <div style={{fontSize:11,color:C.t2,marginBottom:4}}>{eventTitle.slice(0,40)}</div>
                <div style={{fontSize:36,fontWeight:700,letterSpacing:-1.5,color:C.t1,lineHeight:1,marginBottom:4}}>{mainOdds>0?mainOdds+'%':'--'}</div>
                <div style={{fontSize:11,color:C.t3,marginBottom:10}}>{mainOdds>=65?'Likely yes':mainOdds>=40?'Uncertain':'Likely no'}</div>
                <div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:600,background:convBg,color:convC,border:'1px solid '+convBdr,marginBottom:12}}>{convLbl}</div>
                {[{lbl:'Bettors say',val:(odds||0)+'%',c:C.t2},{lbl:'AI thinks',val:mainAI+'%',c:C.purpleL},{lbl:'Edge',val:(edgeVal>0?'+':'')+edgeVal.toFixed(1)+'%',c:convC}].map((x,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<2?'1px solid '+C.border:'none'}}>
                    <span style={{fontSize:11,color:C.t2}}>{x.lbl}</span>
                    <span style={{fontSize:12,fontWeight:700,fontFamily:'monospace',color:x.c}}>{x.val}</span>
                  </div>
                ))}
                {isPlain && (
                  <div style={{marginTop:10,padding:'8px 10px',background:C.bg3,borderRadius:8,borderLeft:'2px solid '+C.border2}}>
                    <div style={{fontSize:10,fontWeight:600,color:C.amber,marginBottom:3}}>General signals only</div>
                    <div style={{fontSize:10,color:C.t3,lineHeight:1.5}}>For much more accurate analysis with live betting odds, paste a Polymarket URL.</div>
                  </div>
                )}
              </div>

              <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px',marginBottom:12}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.8px',color:C.t3,marginBottom:4}}>Your conviction score</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:9,color:C.t3}}>Signal strength</span>
                  <span style={{fontSize:10,fontWeight:700,color:convC}}>{isHigh?'High':isMed?'Medium':'Low'}</span>
                </div>
                <div style={{height:4,background:C.bg4,borderRadius:2,overflow:'hidden',marginBottom:10}}>
                  <div style={{height:'100%',borderRadius:2,background:'linear-gradient(90deg,'+C.red+','+C.amber+','+C.green+')',width:convBar+'%',transition:'width 0.5s'}}></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',textAlign:'center'}}>
                  {[{lbl:'Market',val:(odds||0)+'%',c:C.t2},{lbl:'AI',val:mainAI+'%',c:C.purpleL},{lbl:'Edge',val:(edgeVal>0?'+':'')+edgeVal.toFixed(1)+'%',c:convC}].map((x,i)=>(
                    <div key={i} style={{padding:'6px 0',borderLeft:i>0?'1px solid '+C.border:'none'}}>
                      <div style={{fontSize:9,color:C.t3,textTransform:'uppercase' as const,letterSpacing:'0.4px',marginBottom:3}}>{x.lbl}</div>
                      <div style={{fontSize:14,fontWeight:700,fontFamily:'monospace',color:x.c}}>{x.val}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:10,color:C.t3,textAlign:'center',marginTop:8,lineHeight:1.5}}>
                  {isHigh?'Strong edge - consider a larger position':isMed?'Small edge detected - keep position modest':'No clear edge - skip or bet small'}
                </div>
              </div>

              {tradeData && (
                <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'16px',marginBottom:12}}>
                  <TradePanel
                    marketUrl={tradeData.marketUrl} marketTitle={tradeData.marketTitle}
                    outcomeName={tradeData.topOutcome.name} marketOdds={tradeData.topOutcome.odds}
                    aiConfidence={mtype==='categorical'?tradeData.topOutcome.aiConfidence:mainAI}
                    edge={mtype==='categorical'?tradeData.topOutcome.edge:binEdge}
                    tokenId={tradeData.topOutcome.tokenId} isBinary={mtype==='binary'}
                  />
                </div>
              )}

              <div style={{background:C.bg2,border:'1px solid '+C.border,borderRadius:12,padding:'12px 14px'}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase' as const,letterSpacing:'0.8px',color:C.t3,marginBottom:8}}>Current config</div>
                {[{lbl:'News',val:weights.news},{lbl:'Social',val:weights.social},{lbl:'Market',val:weights.technical}].map((x,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:i<2?'1px solid '+C.border:'none'}}>
                    <span style={{fontSize:11,color:C.t2}}>{x.lbl}</span>
                    <span style={{fontSize:11,fontWeight:600,fontFamily:'monospace',color:C.t1}}>{x.val}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#06060a'}}/>}>
      <ScoresPageContent />
    </Suspense>
  );
}
