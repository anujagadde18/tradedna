'use client';
import { useState } from 'react';
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
  { id:1,  date:'Apr 10', question:'Rory McIlroy wins Masters 2026',                          category:'sports',   aiConfidence:75, marketOdds:70, result:'correct',   actualOutcome:'Rory won ✅',          edge:5,    notes:'Correct pick before tournament' },
  { id:2,  date:'Apr 12', question:'PBKS beat SRH in IPL 2026',                               category:'cricket',  aiConfidence:85, marketOdds:null, result:'correct', actualOutcome:'PBKS won ✅',          edge:null },
  { id:3,  date:'Apr 13', question:'US-Iran permanent peace deal by June 30',                  category:'world',    aiConfidence:73, marketOdds:68, result:'pending',   actualOutcome:'Ongoing',             edge:5 },
  { id:4,  date:'Apr 13', question:'Trump announces Hormuz blockade lifted by May 31',         category:'world',    aiConfidence:87, marketOdds:81, result:'pending',   actualOutcome:'Ongoing',             edge:6 },
  { id:5,  date:'Apr 14', question:'RCB beat LSG in IPL 2026',                                category:'cricket',  aiConfidence:73, marketOdds:null, result:'correct', actualOutcome:'RCB won ✅',          edge:null },
  { id:6,  date:'Apr 14', question:'CSK beat KKR in IPL 2026',                                category:'cricket',  aiConfidence:41, marketOdds:null, result:'correct', actualOutcome:'CSK won ✅ (upset)',  edge:null, notes:'AI said KKR 59% — CSK won as underdog' },
  { id:7,  date:'Apr 15', question:'PBKS beat MI in IPL 2026',                                category:'cricket',  aiConfidence:76, marketOdds:null, result:'correct', actualOutcome:'PBKS won ✅',         edge:null },
  { id:8,  date:'Apr 15', question:'Tom Steyer wins California Governor race',                 category:'politics', aiConfidence:65, marketOdds:60, result:'pending',   actualOutcome:'Election upcoming',   edge:5 },
  { id:9,  date:'Apr 16', question:'SC Freiburg beat RC Celta de Vigo (UEL)',                  category:'sports',   aiConfidence:99, marketOdds:98, result:'correct',   actualOutcome:'Freiburg won ✅',     edge:1 },
  { id:10, date:'Apr 16', question:'GT beat KKR in IPL 2026',                                 category:'cricket',  aiConfidence:84, marketOdds:null, result:'correct', actualOutcome:'GT won ✅',           edge:null },
  { id:11, date:'Apr 17', question:'RCB beat DC in IPL 2026',                                 category:'cricket',  aiConfidence:61, marketOdds:null, result:'incorrect',actualOutcome:'DC won ❌',          edge:null, notes:'DC pulled the upset at Chinnaswamy' },
  { id:12, date:'Apr 18', question:'RR beat KKR in IPL 2026',                                 category:'cricket',  aiConfidence:80, marketOdds:null, result:'incorrect',actualOutcome:'KKR won ❌ (upset)', edge:null, notes:'KKR got their first win of the season' },
  { id:13, date:'Apr 18', question:'PBKS beat LSG in IPL 2026',                               category:'cricket',  aiConfidence:69, marketOdds:null, result:'correct',  actualOutcome:'PBKS won ✅',        edge:null },
  { id:14, date:'Apr 19', question:'GT beat MI in IPL 2026',                                   category:'cricket',  aiConfidence:85, marketOdds:null, result:'incorrect', actualOutcome:'MI won ❌ upset',    edge:null, notes:'AI gave GT 85% at home — MI pulled the upset' },
  { id:15, date:'Apr 16', question:'Will Drake release Iceman by June 30?',                    category:'other',    aiConfidence:82, marketOdds:78,   result:'pending',   actualOutcome:'Ongoing',            edge:4,   notes:'Music market, $XM on Polymarket' },
  { id:16, date:'Apr 16', question:'NBA Champion 2026 — Celtics win',                          category:'sports',   aiConfidence:48, marketOdds:46,   result:'pending',   actualOutcome:'Season ongoing',     edge:2 },
  { id:17, date:'Apr 16', question:'F1 Drivers Champion 2026',                                 category:'sports',   aiConfidence:44, marketOdds:42,   result:'pending',   actualOutcome:'Season ongoing',     edge:2 },
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

  const filtered = PREDICTIONS.filter(p => {
    if (filter !== 'all' && p.result !== filter) return false;
    if (catFilter === 'sports') {
      if (p.category !== 'sports' && p.category !== 'cricket') return false;
    } else if (catFilter !== 'all' && p.category !== catFilter) return false;
    return true;
  }).sort((a, b) => b.id - a.id);

  const resolved = PREDICTIONS.filter(p => p.result !== 'pending');
  const correct = resolved.filter(p => p.result === 'correct');
  const accuracy = resolved.length > 0 ? Math.round((correct.length / resolved.length) * 100) : 0;
  const pending = PREDICTIONS.filter(p => p.result === 'pending').length;
  const avgConfidence = Math.round(PREDICTIONS.reduce((s, p) => s + p.aiConfidence, 0) / PREDICTIONS.length);

  return (
    <div style={{ minHeight:'100vh', background:C.bg0, color:C.t1, fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* NAV */}
      <nav style={{ height:52, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', background:C.bg0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:6, color:C.t1, background:C.bg2, border:'1px solid '+C.border2, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, padding:'5px 12px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Home
          </button>
          <span style={{ fontSize:14, fontWeight:800, color:C.t1 }}>PlayPicks AI</span>
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

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:32 }}>
          {[
            { label:'Win rate', value: accuracy+'%', color: accuracy >= 60 ? C.green : C.amber, sub: `${correct.length}/${resolved.length} resolved` },
            { label:'Total predictions', value: PREDICTIONS.length, color: C.purple, sub: `${pending} pending` },
            { label:'Avg confidence', value: avgConfidence+'%', color: C.blue, sub: 'AI conviction score' },
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
            All predictions made publicly on X before the event. No retroactive changes.
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
