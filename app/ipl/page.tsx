'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg0:'#06060a', bg2:'#14141c', bg3:'#1a1a24',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)', purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a', amber:'#f5a623', red:'#ef4f6a',
};

const TEAM_COLORS: Record<string, { primary: string; bg: string; short: string }> = {
  'Royal Challengers Bengaluru': { primary: '#ef4f6a', bg: 'rgba(239,79,106,0.15)', short: 'RCB' },
  'Mumbai Indians':               { primary: '#4d9de0', bg: 'rgba(77,157,224,0.15)', short: 'MI'  },
  'Chennai Super Kings':          { primary: '#f5a623', bg: 'rgba(245,166,35,0.15)',  short: 'CSK' },
  'Kolkata Knight Riders':        { primary: '#a89cf8', bg: 'rgba(168,156,248,0.15)', short: 'KKR' },
  'Delhi Capitals':               { primary: '#4d9de0', bg: 'rgba(77,157,224,0.15)', short: 'DC'  },
  'Punjab Kings':                 { primary: '#ef4f6a', bg: 'rgba(239,79,106,0.15)', short: 'PBKS'},
  'Rajasthan Royals':             { primary: '#a89cf8', bg: 'rgba(168,156,248,0.15)', short: 'RR'  },
  'Sunrisers Hyderabad':          { primary: '#f5a623', bg: 'rgba(245,166,35,0.15)',  short: 'SRH' },
  'Gujarat Titans':               { primary: '#2ecc8a', bg: 'rgba(46,204,138,0.15)', short: 'GT'  },
  'Lucknow Super Giants':         { primary: '#4d9de0', bg: 'rgba(77,157,224,0.15)', short: 'LSG' },
};

const MATCHES = [
  { no:1,  date:'2026-03-28', home:'Royal Challengers Bengaluru', away:'Sunrisers Hyderabad',   venue:'Bengaluru',       time:'7:30 PM' },
  { no:2,  date:'2026-03-29', home:'Mumbai Indians',              away:'Kolkata Knight Riders',  venue:'Mumbai',          time:'7:30 PM' },
  { no:3,  date:'2026-03-30', home:'Rajasthan Royals',            away:'Chennai Super Kings',    venue:'Guwahati',        time:'7:30 PM' },
  { no:4,  date:'2026-03-31', home:'Punjab Kings',                away:'Gujarat Titans',         venue:'New Chandigarh',  time:'7:30 PM' },
  { no:5,  date:'2026-04-01', home:'Lucknow Super Giants',        away:'Delhi Capitals',         venue:'Lucknow',         time:'7:30 PM' },
  { no:6,  date:'2026-04-02', home:'Kolkata Knight Riders',       away:'Sunrisers Hyderabad',    venue:'Kolkata',         time:'7:30 PM' },
  { no:7,  date:'2026-04-03', home:'Chennai Super Kings',         away:'Punjab Kings',           venue:'Chennai',         time:'7:30 PM' },
  { no:8,  date:'2026-04-04', home:'Delhi Capitals',              away:'Mumbai Indians',         venue:'Delhi',           time:'3:30 PM' },
  { no:9,  date:'2026-04-04', home:'Gujarat Titans',              away:'Rajasthan Royals',       venue:'Ahmedabad',       time:'7:30 PM' },
  { no:10, date:'2026-04-05', home:'Sunrisers Hyderabad',         away:'Lucknow Super Giants',   venue:'Hyderabad',       time:'3:30 PM' },
  { no:11, date:'2026-04-05', home:'Royal Challengers Bengaluru', away:'Chennai Super Kings',    venue:'Bengaluru',       time:'7:30 PM' },
  { no:12, date:'2026-04-06', home:'Kolkata Knight Riders',       away:'Punjab Kings',           venue:'Kolkata',         time:'7:30 PM' },
  { no:13, date:'2026-04-07', home:'Rajasthan Royals',            away:'Mumbai Indians',         venue:'Guwahati',        time:'7:30 PM' },
  { no:14, date:'2026-04-08', home:'Delhi Capitals',              away:'Gujarat Titans',         venue:'Delhi',           time:'7:30 PM' },
  { no:15, date:'2026-04-09', home:'Kolkata Knight Riders',       away:'Lucknow Super Giants',   venue:'Kolkata',         time:'7:30 PM' },
  { no:16, date:'2026-04-10', home:'Rajasthan Royals',            away:'Royal Challengers Bengaluru', venue:'Guwahati',  time:'7:30 PM' },
  { no:17, date:'2026-04-11', home:'Punjab Kings',                away:'Sunrisers Hyderabad',    venue:'New Chandigarh',  time:'3:30 PM' },
  { no:18, date:'2026-04-11', home:'Chennai Super Kings',         away:'Delhi Capitals',         venue:'Chennai',         time:'7:30 PM' },
  { no:19, date:'2026-04-12', home:'Lucknow Super Giants',        away:'Gujarat Titans',         venue:'Lucknow',         time:'3:30 PM' },
  { no:20, date:'2026-04-12', home:'Mumbai Indians',              away:'Royal Challengers Bengaluru', venue:'Mumbai',    time:'7:30 PM' },
  { no:21, date:'2026-04-13', home:'Sunrisers Hyderabad',         away:'Rajasthan Royals',       venue:'Hyderabad',       time:'7:30 PM' },
  { no:22, date:'2026-04-14', home:'Chennai Super Kings',         away:'Kolkata Knight Riders',  venue:'Chennai',         time:'7:30 PM' },
  { no:23, date:'2026-04-15', home:'Royal Challengers Bengaluru', away:'Lucknow Super Giants',   venue:'Bengaluru',       time:'7:30 PM' },
  { no:24, date:'2026-04-16', home:'Mumbai Indians',              away:'Punjab Kings',           venue:'Mumbai',          time:'7:30 PM' },
  { no:25, date:'2026-04-17', home:'Gujarat Titans',              away:'Kolkata Knight Riders',  venue:'Ahmedabad',       time:'7:30 PM' },
  { no:26, date:'2026-04-18', home:'Royal Challengers Bengaluru', away:'Delhi Capitals',         venue:'Bengaluru',       time:'3:30 PM' },
  { no:27, date:'2026-04-18', home:'Sunrisers Hyderabad',         away:'Chennai Super Kings',    venue:'Hyderabad',       time:'7:30 PM' },
  { no:28, date:'2026-04-19', home:'Kolkata Knight Riders',       away:'Rajasthan Royals',       venue:'Kolkata',         time:'3:30 PM' },
  { no:29, date:'2026-04-19', home:'Punjab Kings',                away:'Lucknow Super Giants',   venue:'New Chandigarh',  time:'7:30 PM' },
  { no:30, date:'2026-04-20', home:'Gujarat Titans',              away:'Mumbai Indians',         venue:'Ahmedabad',       time:'7:30 PM' },
  { no:31, date:'2026-04-21', home:'Sunrisers Hyderabad',         away:'Delhi Capitals',         venue:'Hyderabad',       time:'7:30 PM' },
  { no:32, date:'2026-04-22', home:'Lucknow Super Giants',        away:'Rajasthan Royals',       venue:'Lucknow',         time:'7:30 PM' },
  { no:33, date:'2026-04-23', home:'Mumbai Indians',              away:'Chennai Super Kings',    venue:'Mumbai',          time:'7:30 PM' },
  { no:34, date:'2026-04-24', home:'Royal Challengers Bengaluru', away:'Gujarat Titans',         venue:'Bengaluru',       time:'7:30 PM' },
  { no:35, date:'2026-04-25', home:'Delhi Capitals',              away:'Punjab Kings',           venue:'Delhi',           time:'3:30 PM' },
  { no:36, date:'2026-04-25', home:'Rajasthan Royals',            away:'Sunrisers Hyderabad',    venue:'Jaipur',          time:'7:30 PM' },
  { no:37, date:'2026-04-26', home:'Gujarat Titans',              away:'Chennai Super Kings',    venue:'Ahmedabad',       time:'3:30 PM' },
  { no:38, date:'2026-04-26', home:'Lucknow Super Giants',        away:'Kolkata Knight Riders',  venue:'Lucknow',         time:'7:30 PM' },
  { no:39, date:'2026-04-27', home:'Delhi Capitals',              away:'Royal Challengers Bengaluru', venue:'Delhi',     time:'7:30 PM' },
  { no:40, date:'2026-04-28', home:'Punjab Kings',                away:'Rajasthan Royals',       venue:'New Chandigarh',  time:'7:30 PM' },
  { no:41, date:'2026-04-29', home:'Mumbai Indians',              away:'Sunrisers Hyderabad',    venue:'Mumbai',          time:'7:30 PM' },
  { no:42, date:'2026-04-30', home:'Gujarat Titans',              away:'Royal Challengers Bengaluru', venue:'Ahmedabad', time:'7:30 PM' },
  { no:43, date:'2026-05-01', home:'Rajasthan Royals',            away:'Delhi Capitals',         venue:'Jaipur',          time:'7:30 PM' },
  { no:44, date:'2026-05-02', home:'Chennai Super Kings',         away:'Mumbai Indians',         venue:'Chennai',         time:'7:30 PM' },
  { no:45, date:'2026-05-03', home:'Sunrisers Hyderabad',         away:'Kolkata Knight Riders',  venue:'Hyderabad',       time:'3:30 PM' },
  { no:46, date:'2026-05-03', home:'Gujarat Titans',              away:'Punjab Kings',           venue:'Ahmedabad',       time:'7:30 PM' },
  { no:47, date:'2026-05-04', home:'Mumbai Indians',              away:'Lucknow Super Giants',   venue:'Mumbai',          time:'7:30 PM' },
  { no:48, date:'2026-05-05', home:'Delhi Capitals',              away:'Chennai Super Kings',    venue:'Delhi',           time:'7:30 PM' },
  { no:49, date:'2026-05-06', home:'Sunrisers Hyderabad',         away:'Punjab Kings',           venue:'Hyderabad',       time:'7:30 PM' },
  { no:50, date:'2026-05-07', home:'Lucknow Super Giants',        away:'Royal Challengers Bengaluru', venue:'Lucknow',   time:'7:30 PM' },
  { no:51, date:'2026-05-08', home:'Delhi Capitals',              away:'Kolkata Knight Riders',  venue:'Delhi',           time:'7:30 PM' },
  { no:52, date:'2026-05-09', home:'Rajasthan Royals',            away:'Gujarat Titans',         venue:'Jaipur',          time:'7:30 PM' },
  { no:53, date:'2026-05-10', home:'Chennai Super Kings',         away:'Lucknow Super Giants',   venue:'Chennai',         time:'3:30 PM' },
  { no:54, date:'2026-05-10', home:'Royal Challengers Bengaluru', away:'Mumbai Indians',         venue:'Raipur',          time:'7:30 PM' },
  { no:55, date:'2026-05-11', home:'Punjab Kings',                away:'Delhi Capitals',         venue:'Dharamshala',     time:'7:30 PM' },
  { no:56, date:'2026-05-12', home:'Gujarat Titans',              away:'Sunrisers Hyderabad',    venue:'Ahmedabad',       time:'7:30 PM' },
  { no:57, date:'2026-05-13', home:'Royal Challengers Bengaluru', away:'Kolkata Knight Riders',  venue:'Raipur',          time:'7:30 PM' },
  { no:58, date:'2026-05-14', home:'Punjab Kings',                away:'Mumbai Indians',         venue:'Dharamshala',     time:'7:30 PM' },
  { no:59, date:'2026-05-15', home:'Lucknow Super Giants',        away:'Chennai Super Kings',    venue:'Lucknow',         time:'7:30 PM' },
  { no:60, date:'2026-05-16', home:'Kolkata Knight Riders',       away:'Gujarat Titans',         venue:'Kolkata',         time:'7:30 PM' },
  { no:61, date:'2026-05-17', home:'Punjab Kings',                away:'Royal Challengers Bengaluru', venue:'Dharamshala', time:'3:30 PM' },
  { no:62, date:'2026-05-17', home:'Delhi Capitals',              away:'Rajasthan Royals',       venue:'Delhi',           time:'7:30 PM' },
  { no:63, date:'2026-05-18', home:'Chennai Super Kings',         away:'Sunrisers Hyderabad',    venue:'Chennai',         time:'7:30 PM' },
  { no:64, date:'2026-05-19', home:'Rajasthan Royals',            away:'Lucknow Super Giants',   venue:'Jaipur',          time:'7:30 PM' },
  { no:65, date:'2026-05-20', home:'Kolkata Knight Riders',       away:'Mumbai Indians',         venue:'Kolkata',         time:'7:30 PM' },
  { no:66, date:'2026-05-21', home:'Chennai Super Kings',         away:'Gujarat Titans',         venue:'Chennai',         time:'7:30 PM' },
  { no:67, date:'2026-05-22', home:'Sunrisers Hyderabad',         away:'Royal Challengers Bengaluru', venue:'Hyderabad', time:'7:30 PM' },
  { no:68, date:'2026-05-23', home:'Lucknow Super Giants',        away:'Punjab Kings',           venue:'Lucknow',         time:'7:30 PM' },
  { no:69, date:'2026-05-24', home:'Mumbai Indians',              away:'Rajasthan Royals',       venue:'Mumbai',          time:'3:30 PM' },
  { no:70, date:'2026-05-24', home:'Kolkata Knight Riders',       away:'Delhi Capitals',         venue:'Kolkata',         time:'7:30 PM' },
];

function getStatus(date: string): 'today' | 'upcoming' | 'past' {
  const today = new Date();
  const matchDate = new Date(date);
  const todayStr = today.toISOString().split('T')[0];
  if (date === todayStr) return 'today';
  if (matchDate > today) return 'upcoming';
  return 'past';
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
}

export default function IPLPage() {
  const router = useRouter();
  const [copied, setCopied] = useState<number|null>(null);
  const [filter, setFilter] = useState<'upcoming'|'all'>('upcoming');

  const today = new Date().toISOString().split('T')[0];

  const filtered = filter === 'upcoming'
    ? MATCHES.filter(m => m.date >= today)
    : MATCHES;

  const todayMatches = MATCHES.filter(m => m.date === today);
  const upcomingMatches = MATCHES.filter(m => m.date > today).slice(0, 5);

  function analyze(match: typeof MATCHES[0]) {
    const q = `Will ${match.home} beat ${match.away} in IPL 2026 on ${formatDate(match.date)}?`;
    router.push('/scores?event=' + encodeURIComponent(q));
  }

  async function shareWhatsApp(match: typeof MATCHES[0]) {
    const home = TEAM_COLORS[match.home];
    const away = TEAM_COLORS[match.away];
    const msg = `🏏 *IPL 2026 Match ${match.no} Prediction*\n\n*${match.home} vs ${match.away}*\n📍 ${match.venue} · ${formatDate(match.date)} ${match.time} IST\n\nGet AI odds for this match 👇\nhttps://tradedna.vercel.app/scores?event=${encodeURIComponent(`Will ${match.home} beat ${match.away} in IPL 2026?`)}\n\n#IPL2026 #${home?.short}vs${away?.short} #Cricket`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  }

  async function copyLink(match: typeof MATCHES[0], i: number) {
    const url = `https://tradedna.vercel.app/scores?event=${encodeURIComponent(`Will ${match.home} beat ${match.away} in IPL 2026?`)}`;
    await navigator.clipboard.writeText(url);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div style={{ background:C.bg0, minHeight:'100vh', color:C.t1, fontFamily:"'Inter',system-ui,sans-serif" }}>

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:100, height:52, background:'rgba(6,6,10,0.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px' }}>
        <button onClick={()=>router.push('/')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', color:C.t2, fontSize:13 }}>
          ← Home
        </button>
        <div style={{ fontSize:14, fontWeight:700, color:C.t1 }}>🏏 IPL 2026 Match Predictions</div>
        <div style={{ fontSize:11, color:C.t3 }}>70 matches · Mar–May 2026</div>
      </nav>

      <div style={{ maxWidth:800, margin:'0 auto', padding:'24px 24px 48px' }}>

        {/* TODAY */}
        {todayMatches.length > 0 && (
          <div style={{ marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <span style={{ width:6, height:6, background:C.red, borderRadius:'50%', display:'block', boxShadow:'0 0 6px #ef4f6a' }}/>
              <span style={{ fontSize:13, fontWeight:700, color:C.t1 }}>Today's match</span>
            </div>
            {todayMatches.map(m => <MatchCard key={m.no} match={m} isToday onAnalyze={()=>analyze(m)} onWhatsApp={()=>shareWhatsApp(m)} onCopy={()=>copyLink(m,m.no)} copied={copied===m.no} />)}
          </div>
        )}

        {/* UPCOMING */}
        {upcomingMatches.length > 0 && (
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.t2, marginBottom:14 }}>Coming up next</div>
            {upcomingMatches.map(m => <MatchCard key={m.no} match={m} isToday={false} onAnalyze={()=>analyze(m)} onWhatsApp={()=>shareWhatsApp(m)} onCopy={()=>copyLink(m,m.no)} copied={copied===m.no} />)}
          </div>
        )}

        {/* ALL MATCHES */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontSize:13, fontWeight:700, color:C.t2 }}>Full schedule</span>
          <div style={{ display:'flex', gap:6 }}>
            {(['upcoming','all'] as const).map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                style={{ padding:'4px 12px', borderRadius:100, fontSize:11, fontWeight:600, cursor:'pointer',
                  border:'1px solid '+(filter===f?C.purpleBorder:C.border),
                  background:filter===f?C.purpleBg:'transparent',
                  color:filter===f?C.purpleL:C.t2 }}>
                {f === 'upcoming' ? 'Upcoming' : 'All matches'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map(m => {
            const status = getStatus(m.date);
            return (
              <MatchCard key={m.no} match={m} isToday={status==='today'} isPast={status==='past'}
                onAnalyze={()=>analyze(m)} onWhatsApp={()=>shareWhatsApp(m)}
                onCopy={()=>copyLink(m,m.no)} copied={copied===m.no} compact />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match, isToday, isPast, onAnalyze, onWhatsApp, onCopy, copied, compact }: {
  match: typeof MATCHES[0]; isToday?: boolean; isPast?: boolean;
  onAnalyze: ()=>void; onWhatsApp: ()=>void; onCopy: ()=>void;
  copied: boolean; compact?: boolean;
}) {
  const home = TEAM_COLORS[match.home] || { primary:'#7c6ff7', bg:'rgba(124,111,247,0.15)', short:'??' };
  const away = TEAM_COLORS[match.away] || { primary:'#9996b8', bg:'rgba(153,150,184,0.1)', short:'??' };

  if (compact) return (
    <div style={{ background:'#14141c', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:12, opacity:isPast?0.45:1 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#2e2c44', minWidth:24, textAlign:'center' as const }}>M{match.no}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color:'#f2f0ff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
          <span style={{ color:home.primary }}>{home.short}</span>
          <span style={{ color:'#5c5a78', margin:'0 6px' }}>vs</span>
          <span style={{ color:away.primary }}>{away.short}</span>
          <span style={{ color:'#5c5a78', fontSize:11, marginLeft:8 }}>{match.venue}</span>
        </div>
        <div style={{ fontSize:10, color:'#5c5a78', marginTop:2 }}>{formatDate(match.date)} · {match.time} IST</div>
      </div>
      {isToday && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:100, background:'rgba(239,79,106,0.15)', color:'#ef4f6a', border:'1px solid rgba(239,79,106,0.3)' }}>TODAY</span>}
      {!isPast && (
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={onAnalyze} style={{ padding:'5px 10px', borderRadius:7, background:'rgba(124,111,247,0.1)', border:'1px solid rgba(124,111,247,0.25)', color:'#a89cf8', cursor:'pointer', fontSize:11, fontWeight:600, whiteSpace:'nowrap' as const }}>AI odds</button>
          <button onClick={onWhatsApp} style={{ padding:'5px 8px', borderRadius:7, background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.2)', color:'#25d366', cursor:'pointer', fontSize:11 }}>WA</button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ background:'#14141c', border:'1px solid '+(isToday?'rgba(239,79,106,0.4)':'rgba(255,255,255,0.06)'), borderRadius:14, overflow:'hidden', marginBottom:8 }}>
      {isToday && <div style={{ background:'rgba(239,79,106,0.1)', padding:'6px 16px', display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ width:5, height:5, background:'#ef4f6a', borderRadius:'50%', display:'block', boxShadow:'0 0 4px #ef4f6a' }}/>
        <span style={{ fontSize:10, fontWeight:700, color:'#ef4f6a', textTransform:'uppercase' as const, letterSpacing:'0.5px' }}>Today · Match {match.no}</span>
      </div>}
      <div style={{ padding:'16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', marginBottom:14 }}>
          <div style={{ textAlign:'center' as const, padding:'12px', borderRadius:10, background:home.bg }}>
            <div style={{ fontSize:11, fontWeight:700, color:home.primary, marginBottom:2 }}>{home.short}</div>
            <div style={{ fontSize:12, fontWeight:500, color:'#f2f0ff', lineHeight:1.3 }}>{match.home}</div>
          </div>
          <div style={{ textAlign:'center' as const }}>
            <div style={{ fontSize:13, fontWeight:800, color:'#5c5a78' }}>VS</div>
            <div style={{ fontSize:10, color:'#5c5a78', marginTop:4 }}>{match.time}</div>
          </div>
          <div style={{ textAlign:'center' as const, padding:'12px', borderRadius:10, background:away.bg }}>
            <div style={{ fontSize:11, fontWeight:700, color:away.primary, marginBottom:2 }}>{away.short}</div>
            <div style={{ fontSize:12, fontWeight:500, color:'#f2f0ff', lineHeight:1.3 }}>{match.away}</div>
          </div>
        </div>
        <div style={{ fontSize:11, color:'#5c5a78', textAlign:'center' as const, marginBottom:14 }}>
          📍 {match.venue} · {formatDate(match.date)} · {match.time} IST
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onAnalyze}
            style={{ flex:2, padding:'10px', borderRadius:9, background:'rgba(124,111,247,0.1)', border:'1px solid rgba(124,111,247,0.25)', color:'#a89cf8', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            🤖 Get AI odds
          </button>
          <button onClick={onWhatsApp}
            style={{ flex:1, padding:'10px', borderRadius:9, background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.2)', color:'#25d366', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            WhatsApp
          </button>
          <button onClick={onCopy}
            style={{ flex:1, padding:'10px', borderRadius:9, background:copied?'rgba(46,204,138,0.1)':'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:copied?'#2ecc8a':'#9996b8', cursor:'pointer', fontSize:13, fontWeight:600 }}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
