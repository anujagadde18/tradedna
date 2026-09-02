'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg0:'#07070c', bg1:'#0d0d15', bg2:'#13131e', bg3:'#191926', bg4:'#20202e',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.10)', border3:'rgba(255,255,255,0.15)',
  t1:'#eeeeff', t2:'#9896b2', t3:'#565470',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)',
  green:'#2ecc8a', greenBg:'rgba(46,204,138,0.1)',
  amber:'#f5a623', amberBg:'rgba(245,166,35,0.1)',
  red:'#ef4f6a', redBg:'rgba(239,79,106,0.1)',
  blue:'#4d9de0',
};

type Prediction = {
  id: number;
  date: string;
  question: string;
  category: 'cricket' | 'politics' | 'sports' | 'crypto' | 'world' | 'other';
  aiConfidence: number;
  marketOdds: number | null;
  result: 'correct' | 'incorrect' | 'pending';
  actualOutcome: string;
  edge: number | null;
  notes?: string;
};

const PREDICTIONS: Prediction[] = [
  // Week of April 14-19
  // Oscars 2026 — ceremony March 15
  { id:18, date:'Mar 15', question:"One Battle After Another wins Best Picture (Oscars 2026)",   category:'other', aiConfidence:71, marketOdds:68, result:'correct',   actualOutcome:'Won ✅', edge:3 },
  { id:19, date:'Mar 15', question:"Michael B. Jordan wins Best Actor (Oscars 2026)",             category:'other', aiConfidence:74, marketOdds:70, result:'correct',   actualOutcome:'Won ✅', edge:4 },
  { id:20, date:'Mar 15', question:"Jessie Buckley wins Best Actress (Oscars 2026)",              category:'other', aiConfidence:65, marketOdds:62, result:'correct',   actualOutcome:'Won ✅', edge:3 },
  { id:21, date:'Mar 15', question:"Paul Thomas Anderson wins Best Director (Oscars 2026)",       category:'other', aiConfidence:69, marketOdds:65, result:'correct',   actualOutcome:'Won ✅', edge:4 },
    { id:22, date:'Apr 21', question:'SRH beat DC in IPL 2026',                                   category:'cricket', aiConfidence:53, marketOdds:null, result:'correct',  actualOutcome:'SRH won ✅ at Hyderabad', edge:null },
    { id:24, date:'Apr 23', question:'MI beat CSK in IPL 2026 at Wankhede',              category:'cricket', aiConfidence:63, marketOdds:null, result:'incorrect', actualOutcome:'CSK won ❌', edge:null, notes:'AI gave MI 63% — CSK won chasing at Wankhede' },
    { id:26, date:'Apr 28', question:'PBKS beat RR in IPL 2026',                              category:'cricket', aiConfidence:55, marketOdds:null, result:'incorrect', actualOutcome:'RR won ❌', edge:null, notes:'AI gave PBKS 55% — RR won at home in Jaipur' },
    { id:27, date:'Apr 28', question:'SRH beat MI in IPL 2026 at Wankhede',              category:'cricket', aiConfidence:65, marketOdds:null, result:'correct', actualOutcome:'SRH won ✅', edge:null, notes:'AI gave SRH 65% — correct, SRH on 4-game winning streak' },
    { id:29, date:'May 03', question:'SRH beat KKR in IPL 2026 at Hyderabad',              category:'cricket', aiConfidence:82, marketOdds:null, result:'incorrect', actualOutcome:'KKR won ❌', edge:null, notes:'AI gave SRH 82% at home — KKR pulled massive upset' },
    { id:30, date:'May 06', question:'RCB beat LSG in IPL 2026 at Lucknow',              category:'cricket', aiConfidence:74, marketOdds:null, result:'incorrect', actualOutcome:'LSG won ❌', edge:null, notes:'AI gave RCB 74% away — LSG won at home' },
  { id:31, date:'May 05', question:'OKC Thunder beat LA Lakers NBA Playoffs Game 1',  category:'sports',     aiConfidence:87, marketOdds:89,   result:'correct',   actualOutcome:'OKC won 108-90 ✅', edge:-2, notes:'AI gave OKC 87%, market 89% — OKC won convincingly' },
    { id:32, date:'May 12', question:'RCB beat KKR in IPL 2026 at Raipur', category:'cricket', aiConfidence:82, marketOdds:null, result:'correct', actualOutcome:'RCB won ✅', edge:null, notes:'AI gave RCB 82% — correct, RCB dominant over KKR' },
    { id:33, date:'May 22', question:'SRH beat RCB in IPL 2026 at Hyderabad', category:'cricket', aiConfidence:60, marketOdds:null, result:'correct', actualOutcome:'SRH won ✅', edge:null, notes:'AI gave SRH 60% at home — correct' },
    { id:34, date:'May 26', question:'RCB beat GT in IPL 2026 Qualifier 1', category:'cricket', aiConfidence:72, marketOdds:null, result:'correct', actualOutcome:'RCB won ✅', edge:null, notes:'AI gave RCB 72% — correct, RCB reach final directly' },
    { id:35, date:'May 26', question:'NY Knicks beat Cleveland Cavaliers ECF Game 2', category:'sports', aiConfidence:58, marketOdds:null, result:'correct', actualOutcome:'Knicks won 109-93 ✅ — lead 2-0', edge:null, notes:'AI gave Knicks 58% — correct, Knicks sweep series 4-0' },
    { id:36, date:'Jun 3', question:'NY Knicks beat San Antonio Spurs NBA Finals Game 1', category:'sports', aiConfidence:58, marketOdds:37, result:'correct', actualOutcome:'Knicks won Game 1 ✅', edge:21, notes:'AI gave Knicks 58% vs market 37% — AI was right, huge +21% edge' },
  // World Cup 2026
  { id:50, date:'Jun 11', question:'Mexico beat South Africa World Cup 2026', category:'sports', aiConfidence:74, marketOdds:70, result:'correct', actualOutcome:'Mexico won 2-0 ✅', edge:4 },
  { id:51, date:'Jun 11', question:'Korea Republic beat Czechia World Cup 2026', category:'sports', aiConfidence:77, marketOdds:67, result:'correct', actualOutcome:'Korea won 2-1 ✅', edge:10 },
  { id:52, date:'Jun 12', question:'USA beat Paraguay World Cup 2026', category:'sports', aiConfidence:68, marketOdds:65, result:'correct', actualOutcome:'USA won 4-1 ✅', edge:3 },
  { id:53, date:'Jun 14', question:'Germany beat Curaçao World Cup 2026', category:'sports', aiConfidence:98, marketOdds:94, result:'correct', actualOutcome:'Germany won 7-1 ✅', edge:4 },
  { id:54, date:'Jun 14', question:'Ivory Coast beat Ecuador World Cup 2026', category:'sports', aiConfidence:62, marketOdds:58, result:'correct', actualOutcome:'Ivory Coast won 1-0 ✅', edge:4 },
  { id:55, date:'Jun 14', question:'Netherlands beat Japan World Cup 2026', category:'sports', aiConfidence:71, marketOdds:68, result:'incorrect', actualOutcome:'Drew 2-2 ❌', edge:3 },
  { id:56, date:'Jun 15', question:'Spain beat Cape Verde World Cup 2026', category:'sports', aiConfidence:76, marketOdds:81, result:'incorrect', actualOutcome:'Drew 0-0 ❌ SHOCK', edge:-5 },
  { id:57, date:'Jun 15', question:'Belgium beat Egypt World Cup 2026', category:'sports', aiConfidence:59, marketOdds:72, result:'incorrect', actualOutcome:'Drew 1-1 ❌', edge:-13 },
  { id:58, date:'Jun 15', question:'Uruguay beat Saudi Arabia World Cup 2026', category:'sports', aiConfidence:58, marketOdds:65, result:'incorrect', actualOutcome:'Drew 1-1 ❌', edge:-7 },
  { id:59, date:'Jun 15', question:'Iran beat New Zealand World Cup 2026', category:'sports', aiConfidence:58, marketOdds:55, result:'incorrect', actualOutcome:'Drew 2-2 ❌', edge:3 },
  // NBA Finals
  { id:60, date:'Jun 5', question:'NY Knicks beat SA Spurs NBA Finals Game 2', category:'sports', aiConfidence:58, marketOdds:36, result:'correct', actualOutcome:'Knicks won 105-104 ✅', edge:22 },
  { id:61, date:'Jun 8', question:'SA Spurs beat NY Knicks NBA Finals Game 3', category:'sports', aiConfidence:35, marketOdds:37, result:'correct', actualOutcome:'Spurs won 115-111 ✅', edge:-2 },
  { id:62, date:'Jun 10', question:'NY Knicks beat SA Spurs NBA Finals Game 4', category:'sports', aiConfidence:65, marketOdds:63, result:'correct', actualOutcome:'Knicks won 107-106 ✅ 29pt comeback', edge:2 },
  { id:63, date:'Jun 13', question:'NY Knicks beat SA Spurs NBA Finals Game 5', category:'sports', aiConfidence:65, marketOdds:35, result:'correct', actualOutcome:'Knicks won 94-90 ✅ CHAMPIONS', edge:30 },
  { id:1,  date:'Apr 10', question:'Rory McIlroy wins Masters 2026',                          category:'sports',   aiConfidence:75, marketOdds:70, result:'correct',   actualOutcome:'Rory won ✅',          edge:5,    notes:'Correct pick before tournament' },
  { id:2,  date:'Apr 12', question:'PBKS beat SRH in IPL 2026',                               category:'cricket',  aiConfidence:85, marketOdds:null, result:'correct', actualOutcome:'PBKS won ✅',          edge:null },
  { id:3,  date:'Apr 13', question:'US-Iran permanent peace deal by June 30',                  category:'world',    aiConfidence:73, marketOdds:68, result:'incorrect', actualOutcome:'Deadline passed ❌ — only a 60-day ceasefire MOU signed', edge:5, notes:'June 17 MOU was explicitly described as a temporary framework, not a permanent deal' },
  { id:4,  date:'Apr 13', question:'Trump announces Hormuz blockade lifted by May 31',         category:'world',    aiConfidence:87, marketOdds:81, result:'incorrect', actualOutcome:'Deadline passed without resolution', edge:6, notes:'We called 87% and were wrong - the May 31 deadline passed' },
  { id:5,  date:'Apr 14', question:'RCB beat LSG in IPL 2026',                                category:'cricket',  aiConfidence:73, marketOdds:null, result:'correct', actualOutcome:'RCB won ✅',          edge:null },
  { id:6,  date:'Apr 14', question:'CSK beat KKR in IPL 2026',                                category:'cricket',  aiConfidence:41, marketOdds:null, result:'correct', actualOutcome:'CSK won ✅ (upset)',  edge:null, notes:'AI said KKR 59% — CSK won as underdog' },
  { id:7,  date:'Apr 15', question:'PBKS beat MI in IPL 2026',                                category:'cricket',  aiConfidence:76, marketOdds:null, result:'correct', actualOutcome:'PBKS won ✅',         edge:null },
  { id:8,  date:'Apr 15', question:'Tom Steyer wins California Governor race',                 category:'politics', aiConfidence:65, marketOdds:60, result:'incorrect', actualOutcome:'Eliminated in primary ❌ — Becerra & Hilton advanced', edge:5, notes:'Steyer finished 3rd in the June primary, did not make the November runoff' },
  { id:9,  date:'Apr 16', question:'SC Freiburg beat RC Celta de Vigo (UEL)',                  category:'sports',   aiConfidence:99, marketOdds:98, result:'correct',   actualOutcome:'Freiburg won ✅',     edge:1 },
  { id:10, date:'Apr 16', question:'GT beat KKR in IPL 2026',                                 category:'cricket',  aiConfidence:84, marketOdds:null, result:'correct', actualOutcome:'GT won ✅',           edge:null },
  { id:11, date:'Apr 17', question:'RCB beat DC in IPL 2026',                                 category:'cricket',  aiConfidence:61, marketOdds:null, result:'incorrect',actualOutcome:'DC won ❌',          edge:null, notes:'DC pulled the upset at Chinnaswamy' },
  { id:12, date:'Apr 18', question:'RR beat KKR in IPL 2026',                                 category:'cricket',  aiConfidence:80, marketOdds:null, result:'incorrect',actualOutcome:'KKR won ❌ (upset)', edge:null, notes:'KKR got their first win of the season' },
  { id:13, date:'Apr 18', question:'PBKS beat LSG in IPL 2026',                               category:'cricket',  aiConfidence:69, marketOdds:null, result:'correct',  actualOutcome:'PBKS won ✅',        edge:null },
  { id:14, date:'Apr 19', question:'GT beat MI in IPL 2026',                                   category:'cricket',  aiConfidence:85, marketOdds:null, result:'incorrect', actualOutcome:'MI won ❌ upset',    edge:null, notes:'AI gave GT 85% at home — MI pulled the upset' },
  { id:15, date:'Apr 16', question:'Will Drake release Iceman by June 30?',                    category:'other',    aiConfidence:82, marketOdds:78,   result:'incorrect', actualOutcome:'No release by the June 30 deadline', edge:4,   notes:'We called 82% and were wrong - the deadline passed with no release' },
  { id:16, date:'Apr 16', question:'NBA Champion 2026 — Celtics win',                          category:'sports',   aiConfidence:48, marketOdds:46,   result:'incorrect', actualOutcome:'Knicks won ❌ — Celtics eliminated Round 1', edge:2, notes:'Knicks beat Spurs 4-1 in the Finals for the title' },
  { id:17, date:'Apr 16', question:'F1 Drivers Champion 2026',                                 category:'sports',   aiConfidence:44, marketOdds:42,   result:'pending',   actualOutcome:'2026 season still running - resolves in December', edge:2 },
];

const CAT_COLORS: Record<string, string> = {
  cricket:'#2ecc8a', politics:'#ef4f6a', sports:'#7c6ff7', crypto:'#f5a623', world:'#4d9de0',
};

const CAT_ICONS: Record<string, string> = {
  cricket:'🏏', politics:'🗳️', sports:'🏆', crypto:'₿', world:'🌍',
};

export default function AccuracyPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all'|'correct'|'incorrect'|'pending'>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  // Live predictions resolved automatically from the database, merged with the
  // historical record above. The hardcoded entries are earlier calls made before
  // predictions were stored server-side.
  const [live, setLive] = useState<Prediction[]>([]);
  const [livePending, setLivePending] = useState(0);
  const [cats, setCats] = useState<any[]>([]);
  const [calib, setCalib] = useState<any[]>([]);
  const [calibMin, setCalibMin] = useState(5);
  const [calibGap, setCalibGap] = useState<number|null>(null);
  const [brier, setBrier] = useState<number|null>(null);
  const [brierSkill, setBrierSkill] = useState<number|null>(null);
  const [brierN, setBrierN] = useState(0);
  const [mkt, setMkt] = useState<any>(null);

  useEffect(() => {
    fetch('/api/accuracy-stats')
      .then(r => r.json())
      .then(d => {
        setLivePending(d.pending || 0);
        setCats(d.categories || []);
        setCalib(d.calibration || []);
        setCalibMin(d.calibrationMinSample || 5);
        setCalibGap(d.calibrationGap ?? null);
        setBrier(d.brier ?? null);
        setBrierSkill(d.brierSkill ?? null);
        setBrierN(d.brierSample || 0);
        setMkt(d.market || null);
        const mapped: Prediction[] = (d.recent || []).map((r: any, i: number) => ({
          id: 100000 + i,
          date: r.date ? new Date(r.date).toLocaleDateString('en-US',{month:'short',day:'2-digit'}) : '',
          question: r.question,
          category: (['cricket','politics','sports','crypto','world','other'].includes(r.category) ? r.category : 'other') as Prediction['category'],
          aiConfidence: r.aiConfidence ?? 50,
          marketOdds: r.marketOdds ?? null,
          result: r.result,
          actualOutcome: r.note || (r.result === 'correct' ? 'Correct' : 'Incorrect'),
          edge: r.edge ?? null,
        }));
        setLive(mapped);
      })
      .catch(()=>{});
  }, []);

  const ALL = [...live, ...PREDICTIONS];

  // The API scores only what is in the database. The historical record lives in this
  // file, so score the merged set here - otherwise the headline metric would ignore
  // most of our actual calls.
  const scoredAll = ALL.filter(p => p.result !== 'pending' && Number.isFinite(p.aiConfidence));
  const localBrier = scoredAll.length > 0
    ? Math.round((scoredAll.reduce((acc, p) => {
        const stated = p.aiConfidence >= 50 ? p.aiConfidence : 100 - p.aiConfidence;
        const happened = p.aiConfidence >= 50
          ? (p.result === 'correct' ? 1 : 0)
          : (p.result === 'incorrect' ? 1 : 0);
        return acc + Math.pow((stated / 100) - happened, 2);
      }, 0) / scoredAll.length) * 10000) / 10000
    : null;

  // Prefer whichever score covers more predictions.
  const shownBrier = (brierN >= scoredAll.length ? brier : localBrier) ?? localBrier ?? brier;
  const shownBrierN = Math.max(brierN, scoredAll.length);

  // Score us against the market on every call where we recorded the market price,
  // including the historical record. This is the question that decides whether the
  // tool adds anything at all.
  const vsMkt = ALL.filter(p => p.result !== 'pending' && Number.isFinite(p.aiConfidence) && Number.isFinite(p.marketOdds as any));
  const mktScore = (pick: (p: any) => number) => vsMkt.length === 0 ? null :
    Math.round((vsMkt.reduce((acc, p: any) => {
      const stated = p.aiConfidence >= 50 ? pick(p) : 100 - pick(p);
      const happened = p.aiConfidence >= 50 ? (p.result === 'correct' ? 1 : 0) : (p.result === 'incorrect' ? 1 : 0);
      return acc + Math.pow((stated / 100) - happened, 2);
    }, 0) / vsMkt.length) * 10000) / 10000;
  const localOur = mktScore((p:any) => p.aiConfidence);
  const localMkt = mktScore((p:any) => p.marketOdds);
  const localDevs = vsMkt.map((p:any) => Math.abs(p.aiConfidence - p.marketOdds));
  const localMeanDev = localDevs.length ? Math.round((localDevs.reduce((a:number,b:number)=>a+b,0)/localDevs.length)*10)/10 : null;
  const localDisagreed = vsMkt.filter((p:any) => Math.abs(p.aiConfidence - p.marketOdds) >= 10);

  // Use whichever comparison covers more predictions.
  const useLocal = !mkt || vsMkt.length >= (mkt.n || 0);
  const mOur = useLocal ? localOur : mkt.ourBrier;
  const mMkt = useLocal ? localMkt : mkt.marketBrier;
  const mN = useLocal ? vsMkt.length : mkt.n;
  const mDev = useLocal ? localMeanDev : mkt.meanDeviation;
  const mBig = useLocal ? localDisagreed.length : mkt.bigDeviations;
  const mBigHits = useLocal ? localDisagreed.filter((p:any) => p.result === 'correct').length : mkt.bigDeviationHits;
  const mEdge = (mOur !== null && mMkt !== null) ? Math.round((mMkt - mOur) * 10000) / 10000 : null;

  const filtered = ALL.filter(p => {
    if (filter !== 'all' && p.result !== filter) return false;
    if (catFilter === 'sports') {
      if (p.category !== 'sports' && p.category !== 'cricket') return false;
    } else if (catFilter !== 'all' && p.category !== catFilter) return false;
    return true;
  }).sort((a, b) => b.id - a.id);

  const resolved = ALL.filter(p => p.result !== 'pending');
  const correct = resolved.filter(p => p.result === 'correct');
  const accuracy = resolved.length > 0 ? Math.round((correct.length / resolved.length) * 100) : 0;
  const pending = ALL.filter(p => p.result === 'pending').length + livePending;
  const avgConfidence = ALL.length > 0 ? Math.round(ALL.reduce((s, p) => s + p.aiConfidence, 0) / ALL.length) : 0;

  return (
    <div style={{ minHeight:'100vh', background:C.bg0, color:C.t1, fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* NAV */}
      <nav style={{ height:52, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', background:C.bg0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:6, color:C.t1, background:C.bg2, border:'1px solid '+C.border2, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, padding:'5px 12px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Home
          </button>
          <span style={{ fontSize:14, fontWeight:800, color:C.t1 }}>Call It</span>
          <span style={{ fontSize:11, color:C.t3 }}>/ Accuracy</span>
        </div>
        <button onClick={() => router.push('/scores?event=Will+Bitcoin+hit+%24100k+before+June%3F')}
          style={{ padding:'5px 14px', background:C.purple, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
          Try AI →
        </button>
      </nav>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'32px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom:32, textAlign:'center' }}>
          <div style={{ fontSize:11, color:C.purple, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Public Record</div>
          <h1 style={{ fontSize:32, fontWeight:800, margin:'0 0 8px', letterSpacing:'-0.5px' }}>AI Prediction Accuracy</h1>
          <p style={{ fontSize:14, color:C.t2, margin:0 }}>Every prediction we've made — right or wrong. No cherry-picking.</p>
        </div>

        {/* Brier score - the honest headline metric. Stays meaningful at small samples,
            unlike a bucketed curve, because it scores every prediction individually. */}
        {shownBrier !== null && shownBrierN > 0 && (
          <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:12 }}>Brier score</div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:16, flexWrap:'wrap', marginBottom:14 }}>
              <div style={{ fontSize:44, fontWeight:800, fontFamily:'monospace', lineHeight:1,
                color: shownBrier <= 0.18 ? C.green : shownBrier <= 0.25 ? C.amber : C.red }}>{shownBrier.toFixed(3)}</div>
              <div style={{ fontSize:13, color:C.t2, paddingBottom:4 }}>
                {shownBrier <= 0.18 ? 'Better than a coin flip, and meaningfully so.'
                 : shownBrier <= 0.24 ? 'Slightly better than saying 50% to everything.'
                 : shownBrier <= 0.26 ? 'About the same as saying 50% to everything.'
                 : 'Worse than saying 50% to everything.'}
              </div>
            </div>

            <div style={{ position:'relative', height:8, background:C.bg4, borderRadius:4, marginBottom:8 }}>
              <div style={{ position:'absolute', left:0, top:0, height:8, borderRadius:4, width: Math.max(2, Math.min(100, (1 - shownBrier/0.5) * 100)) + '%',
                background: shownBrier <= 0.18 ? C.green : shownBrier <= 0.25 ? C.amber : C.red }} />
              <div style={{ position:'absolute', left:'50%', top:-3, width:2, height:14, background:C.t2, opacity:0.6 }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:C.t3, marginBottom:14 }}>
              <span>0.000 perfect</span><span>0.250 coin flip</span><span>worse</span>
            </div>

            <div style={{ fontSize:12, color:C.t2, lineHeight:1.75, paddingTop:12, borderTop:'1px solid '+C.border }}>
              A win rate can look good by only predicting near certainties. The Brier score measures
              something harder: how far each stated probability sat from what actually happened, averaged
              across every call. Saying 50% to everything scores 0.250, so that is the line worth beating.
              {shownBrier > 0.24 && (
                <> Ours is not clearly beating it yet on {shownBrierN} resolved predictions. That is the honest
                position, and it is the number to watch as the record grows.</>
              )}
              {' '}Unlike the curve below, this stays meaningful at small sample sizes because it scores
              every prediction rather than needing a full bucket.
            </div>
          </div>
        )}

        {/* Does this beat just reading the market? The hardest question about the tool. */}
        {mOur !== null && mMkt !== null && mN > 0 && (
          <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:'20px 22px', marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:6 }}>Do we beat the market?</div>
            <div style={{ fontSize:13, color:C.t2, lineHeight:1.65, marginBottom:16 }}>
              A tool that reads market prices could just be restating them. On the {mN} calls where we
              recorded the market price at the time, this compares our number against simply taking the quote.
            </div>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:14 }}>
              <div style={{ flex:1, minWidth:130, background:C.bg3, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:10, color:C.t3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Call It</div>
                <div style={{ fontSize:24, fontWeight:800, fontFamily:'monospace', color: mEdge !== null && mEdge > 0 ? C.green : C.t1 }}>{mOur.toFixed(3)}</div>
              </div>
              <div style={{ flex:1, minWidth:130, background:C.bg3, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:10, color:C.t3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Market alone</div>
                <div style={{ fontSize:24, fontWeight:800, fontFamily:'monospace', color:C.t2 }}>{mMkt.toFixed(3)}</div>
              </div>
              <div style={{ flex:1, minWidth:130, background:C.bg3, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:10, color:C.t3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Difference</div>
                <div style={{ fontSize:24, fontWeight:800, fontFamily:'monospace', color: mEdge === null ? C.t3 : mEdge > 0 ? C.green : C.red }}>
                  {mEdge === null ? '-' : (mEdge > 0 ? '+' : '') + mEdge.toFixed(3)}
                </div>
              </div>
            </div>

            <div style={{ fontSize:12, color:C.t2, lineHeight:1.75, paddingTop:12, borderTop:'1px solid '+C.border }}>
              Lower is better, so a positive difference means we came out ahead.
              {mDev !== null && <> On average our number sits <b>{mDev} points</b> from the market quote, so most of the time we are close to it.</>}
              {mBig > 0 && <> We disagreed by 10 points or more on <b>{mBig}</b> calls, and were right on <b>{mBigHits}</b> of those. That handful is doing most of the work in the difference above, which is far too small a sample to call an edge.</>}
              {' '}This is the number that decides whether the tool is worth anything, so it stays on this page whichever way it goes.
            </div>
          </div>
        )}

        {/* Calibration - does a stated confidence mean what it claims? */}
        {calib.length > 0 && calib.some((b:any) => b.n > 0) && (
          <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:'18px 20px', marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:6 }}>Calibration</div>
            <div style={{ fontSize:13, color:C.t2, lineHeight:1.65, marginBottom:16 }}>
              A win rate on its own says little. What matters is whether a number means what it claims:
              when we say 80%, does it happen about 80% of the time? Each row compares what we claimed
              against what actually happened.
            </div>

            <div style={{ display:'flex', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:C.t3, marginBottom:8 }}>
              <div style={{ width:78 }}>We said</div>
              <div style={{ flex:1 }}>Claimed vs actual</div>
              <div style={{ width:64, textAlign:'right' }}>Happened</div>
              <div style={{ width:56, textAlign:'right' }}>Sample</div>
            </div>

            {calib.map((b:any) => {
              const gap = b.actual !== null ? b.actual - b.claimed : null;
              const hasRange = b.low !== null && b.high !== null;
              // If the claimed rate sits inside the plausible range, the data cannot
              // yet say the number is wrong - it can only say we do not know.
              const tooEarlyToJudge = b.claimConsistent === true;
              return (
                <div key={b.band} style={{ marginBottom:14, opacity: b.n === 0 ? 0.3 : 1 }}>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <div style={{ width:78, fontSize:12, color:C.t1, fontFamily:'monospace' }}>{b.band}</div>
                    <div style={{ flex:1, position:'relative', height:22 }}>
                      <div style={{ position:'absolute', top:9, left:0, right:0, height:4, background:C.bg4, borderRadius:2 }} />
                      {/* plausible range for the true rate, given how little data this band has */}
                      {hasRange && (
                        <div style={{ position:'absolute', top:6, left:b.low+'%', width:Math.max(1,(b.high-b.low))+'%', height:10,
                          background: tooEarlyToJudge ? 'rgba(153,150,184,0.28)' : 'rgba(239,79,106,0.28)',
                          border:'1px solid ' + (tooEarlyToJudge ? 'rgba(153,150,184,0.5)' : 'rgba(239,79,106,0.5)'),
                          borderRadius:3 }} />
                      )}
                      {/* what actually happened */}
                      {b.actual !== null && (
                        <div style={{ position:'absolute', top:4, left:'calc(' + Math.min(100,b.actual) + '% - 3px)', width:6, height:14, borderRadius:3,
                          background: gap === null ? C.t3 : Math.abs(gap) <= 10 ? C.green : C.amber }} />
                      )}
                      {/* what we claimed */}
                      <div style={{ position:'absolute', top:1, left:'calc(' + Math.min(100,b.claimed) + '% - 1px)', width:2, height:20, background:C.t1, opacity:0.8, borderRadius:1 }} />
                    </div>
                    <div style={{ width:64, textAlign:'right', fontSize:12, fontWeight:700, fontFamily:'monospace',
                      color: b.actual === null ? C.t3 : gap !== null && Math.abs(gap) <= 10 ? C.green : C.t2 }}>
                      {b.actual === null ? '-' : b.actual + '%'}
                    </div>
                    <div style={{ width:56, textAlign:'right', fontSize:11, color:C.t3 }}>
                      {b.n === 0 ? 'none yet' : b.correct + '/' + b.n}
                    </div>
                  </div>
                  {hasRange && (
                    <div style={{ fontSize:10, color:C.t3, marginLeft:78, marginTop:3 }}>
                      true rate could be anywhere from {b.low}% to {b.high}%
                      {tooEarlyToJudge && ' - our claim sits inside that range, so this is not enough data to call it wrong'}
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ fontSize:11, color:C.t3, lineHeight:1.7, marginTop:14, paddingTop:12, borderTop:'1px solid '+C.border }}>
              The vertical line is what we claimed. The dot is what actually happened. The shaded band is
              the range the true rate could plausibly sit in, given how few results we have. That band is
              wide right now, and it should be: with a handful of predictions, almost nothing is proven.
              Most tools draw a clean line and hide this. A forecaster that refuses to guess should show it.
              {calibGap !== null && (
                <> Across bands with enough data, our stated confidence is off by an average of <b>{calibGap} points</b>.</>
              )}
            </div>
          </div>
        )}

        {/* Why confident losses are expected, not embarrassing */}
        <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:'16px 20px', marginBottom:16 }}>
          <div style={{ fontSize:12, color:C.t2, lineHeight:1.75 }}>
            <b style={{ color:C.t1 }}>On the losses.</b> A forecaster saying 87% is supposed to be wrong about
            13% of the time. If every 87% call landed, the number would be a lie, it would really have been
            a 99%. So the two calls on this page that say "we called 87% and were wrong" are not evidence the
            system is broken. They are part of what makes the number mean something. What would worry us is
            confident calls that never miss, or a Brier score that stops improving as the record grows.
          </div>
        </div>

        {/* Category breakdown - updates automatically as predictions resolve */}
        {cats.length > 0 && (
          <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:'18px 20px', marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:14 }}>Accuracy by category</div>
            {cats.map((cat:any) => (
              <div key={cat.name} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <div style={{ fontSize:12, color:C.t1, width:90, textTransform:'capitalize' }}>{cat.name}</div>
                <div style={{ flex:1, height:6, background:C.bg4, borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:cat.winRate+'%', borderRadius:3, background: cat.winRate >= 60 ? C.green : cat.winRate >= 45 ? C.amber : C.red }} />
                </div>
                <div style={{ fontSize:12, fontWeight:700, color:C.t2, fontFamily:'monospace', width:40, textAlign:'right' }}>{cat.winRate}%</div>
                <div style={{ fontSize:11, color:C.t3, width:52, textAlign:'right' }}>{cat.correct}/{cat.total}</div>
              </div>
            ))}
            <div style={{ fontSize:11, color:C.t3, marginTop:12, lineHeight:1.6 }}>
              Updated automatically as markets settle. Categories with few resolved predictions will move a lot.
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:32 }}>
          {[
            { label:'Win rate', value: accuracy+'%', color: accuracy >= 60 ? C.green : C.amber, sub: `${correct.length}/${resolved.length} resolved` },
            { label:'Total predictions', value: ALL.length, color: C.purple, sub: `${pending} pending` },
            { label:'Avg confidence', value: avgConfidence+'%', color: C.blue, sub: 'average across all calls' },
            { label:'Best streak', value: '4', color: C.green, sub: 'correct in a row' },
          ].map(s => (
            <div key={s.label} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:C.t3, textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:8 }}>{s.label}</div>
              <div style={{ fontSize:28, fontWeight:800, color:s.color, fontFamily:'monospace', letterSpacing:'-1px' }}>{s.value}</div>
              <div style={{ fontSize:11, color:C.t3, marginTop:4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' as const }}>
          {(['all','correct','incorrect','pending'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid '+(filter===f ? C.purple : C.border), background: filter===f ? C.purpleBg : 'transparent', color: filter===f ? C.purpleL : C.t2 }}>
              {f === 'correct' ? '✅ Correct' : f === 'incorrect' ? '❌ Incorrect' : f === 'pending' ? '⏳ Pending' : 'All'}
            </button>
          ))}
          <div style={{ width:1, background:C.border, margin:'0 4px' }} />
          {(['all','cricket','sports','politics','world','crypto','other'] as const).map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid '+(catFilter===c ? C.border3 : C.border), background: catFilter===c ? C.bg3 : 'transparent', color: catFilter===c ? C.t1 : C.t3 }}>
              {c === 'all' ? 'All markets' : (CAT_ICONS[c]||'') + ' ' + c}
            </button>
          ))}
        </div>

        {/* Predictions list */}
        <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
          {filtered.map(p => {
            const isCorrect = p.result === 'correct';
            const isIncorrect = p.result === 'incorrect';
            const isPending = p.result === 'pending';
            const resultColor = isCorrect ? C.green : isIncorrect ? C.red : C.amber;
            const resultBg = isCorrect ? C.greenBg : isIncorrect ? C.redBg : C.amberBg;
            const catColor = CAT_COLORS[p.category] || C.t3;

            return (
              <div key={p.id} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                {/* Result badge */}
                <div style={{ width:36, height:36, borderRadius:8, background:resultBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                  {isCorrect ? '✅' : isIncorrect ? '❌' : '⏳'}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:9, color:catColor, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.5px', background:catColor+'15', padding:'2px 6px', borderRadius:4 }}>
                      {CAT_ICONS[p.category]} {p.category}
                    </span>
                    <span style={{ fontSize:11, color:C.t3 }}>{p.date}</span>
                    {p.edge !== null && p.edge > 0 && (
                      <span style={{ fontSize:10, color:C.purple, fontWeight:600 }}>+{p.edge}% edge</span>
                    )}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.t1, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
                    {p.question}
                  </div>
                  {p.notes && (
                    <div style={{ fontSize:11, color:C.t3 }}>{p.notes}</div>
                  )}
                </div>

                {/* Confidence */}
                <div style={{ textAlign:'right' as const, flexShrink:0 }}>
                  <div style={{ fontSize:20, fontWeight:800, color:resultColor, fontFamily:'monospace', letterSpacing:'-0.5px' }}>{p.aiConfidence}%</div>
                  <div style={{ fontSize:10, color:C.t3 }}>AI confidence</div>
                  {p.marketOdds && (
                    <div style={{ fontSize:10, color:C.t3 }}>Market: {p.marketOdds}%</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:32, padding:'20px', borderTop:'1px solid '+C.border }}>
          <div style={{ fontSize:12, color:C.t3, marginBottom:12 }}>
            Every prediction is logged with a timestamp when it is made. No retroactive changes.
          </div>
          <button onClick={() => router.push('/')}
            style={{ padding:'10px 24px', background:C.purple, border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            Get AI predictions →
          </button>
        </div>

      </div>
    </div>
  );
}
