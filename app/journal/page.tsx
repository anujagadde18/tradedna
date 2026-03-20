'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTradeJournal } from '@/lib/polymarket-trade';

const S = {
  bg: '#0a0a0b', bg2: '#111113', bg3: '#18181c', bg4: '#1f1f25',
  border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.12)',
  text: '#f0eff4', text2: '#9998a8', text3: '#5e5d6e',
  purple: '#7c6ff7', purple2: '#9d98f8',
  green: '#34d399', amber: '#fbbf24', red: '#f87171',
};

export default function JournalPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    try { setTrades(getTradeJournal()); } catch {}
  }, []);

  const won     = trades.filter(t => t.outcome === 'won').length;
  const winRate = trades.length > 0 ? Math.round((won / trades.length) * 100) : 0;
  const pnl     = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const avgEdge = trades.length > 0 ? (trades.reduce((s, t) => s + Math.abs(t.edge || 0), 0) / trades.length).toFixed(1) : '0.0';

  const demoTrades = [
    { id: '1', marketTitle: '2026 Pro Football Draft - First Overall Pick', outcomeName: 'YES - Fernando Mendoza', outcome: 'won', pnl: 47, aiConfidence: 99, marketOdds: 97, edge: 2, convictionScore: 60, timestamp: 1742000000000, reasoning: 'AI had 99% conviction vs market 97% - +2% edge. News sources showed strong media consensus around Mendoza. Social signals broadly positive with no major contrary views.' },
    { id: '2', marketTitle: 'Will US GDP contract in Q1 2026?', outcomeName: 'YES - GDP contracts', outcome: 'pending', pnl: 0, aiConfidence: 65, marketOdds: 62, edge: 3, convictionScore: 55, timestamp: 1742500000000, reasoning: 'AI shows 65% vs market 62% - +3% edge. Medium conviction. Reuters and Bloomberg both reporting rising recession signals. Fed rate trajectory supports contraction thesis.' },
    { id: '3', marketTitle: 'Will Bitcoin hit $100k before April 2026?', outcomeName: 'NO - Below $100k', outcome: 'lost', pnl: -25, aiConfidence: 71, marketOdds: 78, edge: -7, convictionScore: 30, timestamp: 1741000000000, reasoning: 'AI had 71% confidence market was overpriced at 78% for YES. Took NO position at $25. Market moved against position before resolution. Edge was real but timing was off.' },
  ];

  const displayTrades = trades.length > 0 ? trades : demoTrades;
  const displayStats = trades.length > 0
    ? { total: trades.length, winRate, pnl: pnl >= 0 ? '+$'+pnl : '-$'+Math.abs(pnl), avgEdge: '+'+avgEdge+'%' }
    : { total: 12, winRate: 67, pnl: '+$184', avgEdge: '+4.2%' };

  const pillStyle = (type: string) => {
    const map: any = {
      yes: { bg: 'rgba(52,211,153,0.1)', color: S.green },
      no:  { bg: 'rgba(248,113,113,0.1)', color: S.red },
      won: { bg: 'rgba(52,211,153,0.1)', color: S.green },
      pending: { bg: 'rgba(251,191,36,0.1)', color: S.amber },
      lost: { bg: 'rgba(248,113,113,0.1)', color: S.red },
    };
    return map[type] || map.pending;
  };

  return (
    <div style={{ background: S.bg, minHeight: '100vh', color: S.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid ' + S.border, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: S.text2, cursor: 'pointer', fontSize: 13, fontWeight: 500, border: 'none', background: 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px' }}>PlayPicks AI</div>
        <button onClick={() => router.push('/profile')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, color: S.text2, cursor: 'pointer', border: 'none', background: 'none' }}>View Profile</button>
      </nav>

      <div style={{ paddingTop: 56 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 40px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4 }}>Trade Journal</div>
              <div style={{ fontSize: 14, color: S.text2 }}>Every trade logged with AI conviction snapshot</div>
            </div>
            <button onClick={() => router.push('/')} style={{ padding: '7px 16px', background: S.purple, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>New analysis</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
            {[
              { val: String(displayStats.total), label: 'Total trades', color: S.text },
              { val: displayStats.winRate+'%', label: 'Win rate (followed edge)', color: S.green },
              { val: displayStats.pnl, label: 'Total P&L', color: S.green },
              { val: displayStats.avgEdge, label: 'Avg edge when traded', color: S.amber },
            ].map((s, i) => (
              <div key={i} style={{ background: S.bg3, border: '1px solid ' + S.border, borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 12, color: S.text3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            Recent trades
            <span style={{ fontSize: 12, color: S.text3, fontWeight: 400 }}>Sorted by date</span>
          </div>

          {displayTrades.map((t: any) => (
            <div key={t.id} style={{ background: S.bg3, border: '1px solid ' + S.border, borderRadius: 14, padding: '20px 24px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>{t.marketTitle}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 6, background: pillStyle(t.outcomeName?.toLowerCase().includes('yes') ? 'yes' : 'no').bg, color: pillStyle(t.outcomeName?.toLowerCase().includes('yes') ? 'yes' : 'no').color }}>{t.outcomeName}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 6, background: pillStyle(t.outcome).bg, color: pillStyle(t.outcome).color }}>{t.outcome?.charAt(0).toUpperCase() + t.outcome?.slice(1)}</span>
                    <span style={{ fontSize: 11, color: S.text3 }}>{new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: (t.pnl || 0) >= 0 ? S.green : S.red }}>
                    {(t.pnl || 0) >= 0 ? '+' : ''}${Math.abs(t.pnl || 0)}
                  </div>
                  <div style={{ fontSize: 11, color: S.text3 }}>P&L</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: S.text2, lineHeight: 1.6, padding: '12px 14px', background: S.bg4, borderRadius: 10, borderLeft: '3px solid rgba(124,111,247,0.3)' }}>
                {t.reasoning || `AI had ${t.aiConfidence}% conviction vs market ${t.marketOdds}% - ${t.edge > 0 ? '+' : ''}${t.edge?.toFixed(1)}% edge. Conviction score: ${t.convictionScore || 0}/100.`}
              </div>
            </div>
          ))}

          {trades.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: S.text3 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}></div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: S.text2 }}>No trades yet</div>
              <div style={{ fontSize: 13 }}>Start analyzing markets to build your journal</div>
              <button onClick={() => router.push('/')} style={{ marginTop: 20, padding: '8px 20px', background: S.purple, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Analyze a market</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
