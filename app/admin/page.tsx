'use client';
import { useState, useEffect } from 'react';

const C = {
  bg0:'#07070c', bg2:'#13131e', bg3:'#191926',
  border:'rgba(255,255,255,0.06)', t1:'#eeeeff', t2:'#9896b2', t3:'#565470',
  purple:'#7c6ff7', green:'#2ecc8a', amber:'#f5a623', red:'#ef4f6a', blue:'#4d9de0',
};

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/kpi');
      const json = await res.json();
      if (json.error) { setError(json.error); setLoading(false); return; }
      setData(json);
      setUpdated(new Date().toLocaleTimeString());
      setError('');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const k = data?.kpis;

  const fillDays = (rows: any[], key: string, n: number) => {
    const map: Record<string, number> = {};
    (rows||[]).forEach((r: any) => { const d = (r.day||'').toString().split('T')[0]; map[d] = parseInt(r[key]||0); });
    return Array.from({length:n}, (_, i) => {
      const d = new Date(Date.now() - (n-1-i)*86400000);
      const dk = d.toISOString().split('T')[0];
      return { day: dk.slice(5), val: map[dk]||0 };
    });
  };

  const dauData = fillDays(data?.trends?.dau, 'users', 14);
  const anlData = fillDays(data?.trends?.analyses, 'count', 14);
  const maxDau = Math.max(...dauData.map(d => d.val), 1);
  const maxAnl = Math.max(...anlData.map(d => d.val), 1);

  return (
    <div style={{ minHeight:'100vh', background:C.bg0, color:C.t1, fontFamily:'system-ui, sans-serif', padding:'32px 24px' }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:32 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.5px' }}>PlayPicks AI — KPIs</div>
            <div style={{ fontSize:12, color:C.t3, marginTop:4 }}>Live from Neon Postgres · auto-refreshes every 30s</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {updated && <span style={{ fontSize:12, color:C.t3 }}>Updated {updated}</span>}
            <button onClick={load} style={{ padding:'8px 16px', background:C.purple, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background:'rgba(239,79,106,0.1)', border:'1px solid rgba(239,79,106,0.3)', borderRadius:10, padding:'12px 16px', marginBottom:24, color:C.red, fontSize:13 }}>
            {error.includes('missing_connection') ? 'Database not connected — check POSTGRES_URL or DATABASE_URL env var in Vercel' : error}
          </div>
        )}

        {loading && !data && (
          <div style={{ textAlign:'center', padding:'60px 0', color:C.t3 }}>Loading...</div>
        )}

        {k && (
          <>
            {/* KPI cards row 1 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
              {[
                { label:'Total users', value: k.totalUsers, color: C.purple },
                { label:'Active today', value: k.activeToday, color: C.green },
                { label:'Analyses today', value: k.analysesToday, color: C.amber },
                { label:'Avg per user', value: k.avgAnalysesPerUser?.toFixed(1), color: C.blue },
              ].map(c => (
                <div key={c.label} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px' }}>
                  <div style={{ fontSize:11, color:C.t3, textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:8 }}>{c.label}</div>
                  <div style={{ fontSize:32, fontWeight:700, color:c.color, fontFamily:'monospace', letterSpacing:'-1px' }}>{c.value ?? '0'}</div>
                </div>
              ))}
            </div>

            {/* KPI cards row 2 */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
              {[
                { label:'New this week', value: k.newWeek },
                { label:'Active this week', value: k.activeWeek },
                { label:'Analyses (week)', value: k.analysesWeek },
                { label:'Returning users', value: k.retained },
              ].map(c => (
                <div key={c.label} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'14px 18px' }}>
                  <div style={{ fontSize:11, color:C.t3, textTransform:'uppercase' as const, letterSpacing:'0.5px', marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:24, fontWeight:700, color:C.t2, fontFamily:'monospace' }}>{c.value ?? '0'}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              {[
                { title:'Daily active users — 14 days', data:dauData, max:maxDau, color:C.purple },
                { title:'Analyses per day — 14 days', data:anlData, max:maxAnl, color:C.green },
              ].map(chart => (
                <div key={chart.title} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.t2, marginBottom:16 }}>{chart.title}</div>
                  {chart.data.every(d => d.val === 0) ? (
                    <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', color:C.t3, fontSize:12 }}>No data yet — start using the app</div>
                  ) : (
                    <div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:80, marginBottom:6 }}>
                        {chart.data.map((d, i) => (
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column' as const, alignItems:'center', gap:0 }}>
                            <div style={{
                              width:'100%', borderRadius:'2px 2px 0 0',
                              background: chart.color,
                              opacity: i === chart.data.length-1 ? 1 : 0.5,
                              height: Math.max(2, (d.val/chart.max)*76)
                            }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:C.t3 }}>
                        <span>{chart.data[0]?.day}</span>
                        <span>{chart.data[6]?.day}</span>
                        <span>{chart.data[13]?.day}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Top queries */}
              <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.t2, marginBottom:12 }}>Top queries</div>
                {!data.topQueries?.length ? (
                  <div style={{ color:C.t3, fontSize:12 }}>No analyses yet</div>
                ) : data.topQueries.map((q: any, i: number) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid '+C.border }}>
                    <div style={{ fontSize:12, color:C.t1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, maxWidth:'80%' }}>{i+1}. {q.query}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.purple, flexShrink:0, marginLeft:8 }}>{q.count}x</div>
                  </div>
                ))}
              </div>

              {/* Traffic sources */}
              <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'16px 18px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.t2, marginBottom:12 }}>Traffic sources</div>
                {!data.referrers?.length ? (
                  <div style={{ color:C.t3, fontSize:12 }}>No traffic data yet</div>
                ) : (() => {
                  const max = Math.max(...data.referrers.map((r: any) => parseInt(r.count)));
                  return data.referrers.map((r: any, i: number) => {
                    const pct = Math.round(parseInt(r.count)/max*100);
                    const label = r.ref === 'direct' ? 'Direct' : r.ref.replace(/https?:\/\//,'').split('/')[0];
                    return (
                      <div key={i} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                          <span style={{ color:C.t1 }}>{label}</span>
                          <span style={{ color:C.t3 }}>{r.count}</span>
                        </div>
                        <div style={{ height:4, background:C.bg3, borderRadius:2 }}>
                          <div style={{ height:'100%', width:pct+'%', background:C.purple, borderRadius:2 }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
