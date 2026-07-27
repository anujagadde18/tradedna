'use client';
/* PP-SOURCES-HONEST-V1 - documents the real data pipeline; the old page here showed demo data */
import { useRouter } from 'next/navigation';

const C = {
  bg0:'#06060a', bg2:'#14141c', border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78',
  purple:'#7c6ff7', purpleL:'#a89cf8', green:'#2ecc8a', blue:'#4d9de0', amber:'#f5a623',
};

const SOURCES = [
  { name:'Polymarket live prices', color:'#2ecc8a', what:'The price people trading real money are paying for each outcome, fetched live for every question. For multi-outcome questions we rank every possible outcome by its live price.', when:'Used whenever a matching live market exists. Market prices override everything else, because real money is the strongest signal.' },
  { name:'Team strength model', color:'#4d9de0', what:'A relative strength rating for teams, converted into a win probability using a Bradley-Terry calculation.', when:'Used for head-to-head questions ("X vs Y") when both teams are in our data - mainly as a cross-check against the market price.' },
  { name:'Forecaster data', color:'#a89cf8', what:'Published probability estimates from the Metaculus forecasting community.', when:'Used for world events, politics, and economics questions when a matching forecast exists.' },
  { name:'News articles', color:'#f5a623', what:'Recent articles matched to your question. These inform the written reasons for and against - never the number itself.', when:'Shown as supporting sources under the analysis, each one named and linked.' },
];

export default function SourcesPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight:'100vh', background:C.bg0, color:C.t1, fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <nav style={{ height:52, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', gap:12, padding:'0 16px' }}>
        <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:6, color:C.t1, background:C.bg2, border:'1px solid '+C.border2, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, padding:'6px 11px' }}>Home</button>
        <span style={{ fontSize:13, fontWeight:700 }}>Where our numbers come from</span>
      </nav>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 16px 80px' }}>
        <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.8px', marginBottom:10 }}>Where our numbers come from</h1>
        <p style={{ fontSize:14, color:C.t2, lineHeight:1.7, marginBottom:8 }}>
          Every probability PlayPicks shows is blended from the sources below - and every analysis
          shows you exactly which ones were used and how much each contributed. If none of them
          have real data for your question, we say so instead of inventing a number.
        </p>
        <p style={{ fontSize:13, color:C.t3, lineHeight:1.7, marginBottom:28 }}>
          You can also change how much weight each source gets on any analysis - or add your own
          sources - using the "Adjust this yourself" button on the answer page.
        </p>
        {SOURCES.map(s => (
          <div key={s.name} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:'18px 20px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ width:10, height:10, borderRadius:3, background:s.color }} />
              <span style={{ fontSize:15, fontWeight:700 }}>{s.name}</span>
            </div>
            <div style={{ fontSize:13, color:C.t2, lineHeight:1.65, marginBottom:8 }}>{s.what}</div>
            <div style={{ fontSize:12, color:C.t3, lineHeight:1.6 }}>{s.when}</div>
          </div>
        ))}
        <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:'18px 20px', marginBottom:24 }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>What we never do</div>
          <div style={{ fontSize:13, color:C.t2, lineHeight:1.7 }}>
            The AI never invents its own probability - the number is fixed by the sources above
            before any text is written. If we cannot find real data, you get an honest
            "no data" answer, not a guess. And every past call sits on our public accuracy page,
            wins and losses alike.
          </div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <button onClick={() => router.push('/')} style={{ padding:'11px 20px', background:C.purple, color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>Try an analysis</button>
          <button onClick={() => router.push('/accuracy')} style={{ padding:'11px 20px', background:'none', color:C.purpleL, border:'1px solid rgba(124,111,247,0.3)', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>See the accuracy record</button>
        </div>
      </div>
    </div>
  );
}
