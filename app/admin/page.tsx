'use client';
import { useState } from 'react';

// These are the current odds — update weekly by checking Polymarket
// Format: { q, odds, url }
const CURRENT_ODDS = [
  { q: 'Will Bitcoin hit $100k before July 2025?',      odds: 32, cat: 'crypto',      emoji: '₿',  url: 'https://polymarket.com/event/will-bitcoin-hit-100k' },
  { q: 'Will the Fed cut rates in May 2025?',           odds: 17, cat: 'economics',   emoji: '📈', url: 'https://polymarket.com/event/fed-cut-may-2025' },
  { q: 'Will Trump impose tariffs above 10% in April?', odds: 78, cat: 'politics',    emoji: '🗳️', url: 'https://polymarket.com/event/trump-tariffs-april-2025' },
  { q: 'Will Ethereum reach $4k in 2025?',              odds: 28, cat: 'crypto',      emoji: '⟠',  url: 'https://polymarket.com/event/ethereum-4k-2025' },
  { q: 'Will there be a US recession in 2025?',         odds: 45, cat: 'economics',   emoji: '📉', url: 'https://polymarket.com/event/us-recession-2025' },
  { q: 'Will Ukraine ceasefire happen in 2025?',        odds: 52, cat: 'geopolitics', emoji: '🌍', url: 'https://polymarket.com/event/ukraine-ceasefire-2025' },
  { q: 'Will OpenAI release GPT-5 in 2025?',            odds: 71, cat: 'technology',  emoji: '🤖', url: 'https://polymarket.com/event/openai-gpt5-2025' },
  { q: 'Will Dogecoin hit $1 in 2025?',                 odds: 19, cat: 'crypto',      emoji: '🐕', url: 'https://polymarket.com/event/dogecoin-1-dollar-2025' },
  { q: 'Will US avoid a government shutdown in 2025?',  odds: 63, cat: 'politics',    emoji: '🏛️', url: 'https://polymarket.com/event/government-shutdown-2025' },
];

const C = {
  bg0:'#06060a', bg2:'#14141c', bg3:'#1a1a24',
  border:'rgba(255,255,255,0.08)', border2:'rgba(255,255,255,0.12)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78',
  purple:'#7c6ff7', green:'#2ecc8a', red:'#ef4f6a', amber:'#f5a623',
};

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed]     = useState(false);
  const [odds, setOdds]         = useState(CURRENT_ODDS.map(o => ({ ...o })));
  const [saved, setSaved]       = useState(false);
  const [copied, setCopied]     = useState(false);

  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASS || 'playpicks2025';

  function login() {
    if (password === ADMIN_PASS) setAuthed(true);
    else alert('Wrong password');
  }

  function updateOdds(i: number, val: number) {
    setOdds(prev => prev.map((o, idx) => idx === i ? { ...o, odds: val } : o));
  }

  function generateCode() {
    const lines = odds.map(o =>
      `  { q:'${o.q}', cat:'${o.cat}', emoji:'${o.emoji}', odds:${o.odds}, url:'${o.url}' },`
    ).join('\n');
    return `const FEATURED: {q:string;cat:string;emoji:string;odds:number|null;url:string}[] = [\n${lines}\n];`;
  }

  async function copyCode() {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!authed) return (
    <div style={{ background:C.bg0, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui' }}>
      <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:16, padding:32, width:320 }}>
        <div style={{ fontSize:16, fontWeight:700, color:C.t1, marginBottom:20 }}>PlayPicks Admin</div>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&login()}
          placeholder="Password"
          style={{ width:'100%', padding:'10px 14px', background:C.bg3, border:'1px solid '+C.border2, borderRadius:10, color:C.t1, fontSize:14, outline:'none', marginBottom:12, boxSizing:'border-box' as const }}/>
        <button onClick={login}
          style={{ width:'100%', padding:'10px', background:C.purple, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
          Login
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', color:C.t1, fontFamily:'system-ui', padding:32 }}>
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700 }}>Update Homepage Odds</div>
            <div style={{ fontSize:12, color:C.t3, marginTop:4 }}>Check Polymarket weekly and update these. Then copy the code into app/page.tsx FEATURED array.</div>
          </div>
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer"
            style={{ padding:'8px 16px', background:'rgba(124,111,247,0.1)', border:'1px solid rgba(124,111,247,0.25)', borderRadius:10, color:'#a89cf8', fontSize:12, fontWeight:600, textDecoration:'none' }}>
            Open Polymarket →
          </a>
        </div>

        <div style={{ display:'grid', gap:8, marginBottom:24 }}>
          {odds.map((o, i) => {
            const isYes = o.odds >= 50;
            return (
              <div key={i} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:18, minWidth:24 }}>{o.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:C.t1, marginBottom:4 }}>{o.q}</div>
                  <div style={{ fontSize:10, color:C.t3 }}>{o.cat}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input type="number" min="1" max="99" value={o.odds}
                    onChange={e => updateOdds(i, parseInt(e.target.value)||0)}
                    style={{ width:64, padding:'6px 10px', background:C.bg3, border:'1px solid '+C.border2, borderRadius:8, color:isYes?C.green:C.red, fontSize:16, fontWeight:700, textAlign:'center', outline:'none' }}/>
                  <span style={{ fontSize:11, color:C.t3 }}>% YES</span>
                </div>
                <a href={o.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:11, color:'#a89cf8', textDecoration:'none', whiteSpace:'nowrap' }}>
                  Check →
                </a>
              </div>
            );
          })}
        </div>

        {/* Generated code */}
        <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.t2 }}>Generated code — paste into app/page.tsx</div>
            <button onClick={copyCode}
              style={{ padding:'6px 14px', background:copied?'rgba(46,204,138,0.12)':'rgba(124,111,247,0.1)', border:'1px solid '+(copied?'rgba(46,204,138,0.3)':'rgba(124,111,247,0.25)'), borderRadius:8, color:copied?C.green:'#a89cf8', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              {copied ? '✓ Copied!' : 'Copy code'}
            </button>
          </div>
          <pre style={{ fontSize:11, color:C.t3, lineHeight:1.6, overflow:'auto', margin:0, whiteSpace:'pre-wrap' }}>
            {generateCode()}
          </pre>
        </div>

        <div style={{ fontSize:11, color:C.t3, lineHeight:1.8 }}>
          <div style={{ fontWeight:600, color:C.t2, marginBottom:6 }}>How to update weekly:</div>
          1. Go to Polymarket and find each question<br/>
          2. Update the % YES number above<br/>
          3. Click "Copy code"<br/>
          4. Open app/page.tsx and replace the FEATURED array<br/>
          5. git commit + push → live in 1 minute
        </div>
      </div>
    </div>
  );
}
