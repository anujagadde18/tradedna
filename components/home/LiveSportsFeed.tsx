'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MatchGame {
  slug: string; title: string; url: string;
  volume: number; volumeFormatted: string;
  sport: string; emoji: string; type: 'match';
  homeTeam: string; awayTeam: string;
  homeOdds: number; awayOdds: number;
  endDate: string;
}

interface FuturesMarket {
  slug: string; title: string; url: string;
  volume: number; volumeFormatted: string;
  sport: string; emoji: string; type: 'futures';
  topOutcomes: { name: string; pct: number }[];
}

type SportEvent = MatchGame | FuturesMarket;

const C = {
  bg0:'#06060a', bg2:'#14141c', bg3:'#1a1a24',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)', purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a', amber:'#f5a623', red:'#ef4f6a',
};

export function LiveSportsFeed() {
  const router = useRouter();
  const [games, setGames]     = useState<MatchGame[]>([]);
  const [futures, setFutures] = useState<FuturesMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'all'|'ipl'|'nba'>('all');

  useEffect(() => {
    setLoading(true);
    fetch('/api/live-sports?sport=' + tab)
      .then(r => r.json())
      .then(d => {
        setGames(d.liveGames || []);
        setFutures(d.futures || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab]);

  const goAnalyze = (q: string) => router.push('/scores?event=' + encodeURIComponent(q));

  const hasData = games.length > 0 || futures.length > 0;

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px 48px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:6, height:6, background:C.red, borderRadius:'50%', display:'block', boxShadow:'0 0 6px #ef4f6a' }}/>
          <span style={{ fontSize:13, fontWeight:700, color:C.t1 }}>Live sports markets</span>
          <span style={{ fontSize:11, color:C.t3 }}>· real odds from Polymarket</span>
        </div>
        {/* Sport tabs */}
        <div style={{ display:'flex', gap:6 }}>
          {(['all','ipl','nba'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'4px 12px', borderRadius:100, fontSize:11, fontWeight:600, cursor:'pointer',
                border:'1px solid '+(tab===t ? C.purpleBorder : C.border),
                background:tab===t ? C.purpleBg : 'transparent',
                color:tab===t ? C.purpleL : C.t2 }}>
              {t === 'all' ? 'All' : t === 'ipl' ? '🏏 IPL' : '🏀 NBA'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display:'grid', gap:8 }}>
          {[...Array(4)].map((_,i) => (
            <div key={i} style={{ height:80, background:C.bg2, borderRadius:12, border:'1px solid '+C.border, opacity:0.3+i*0.15 }}/>
          ))}
        </div>
      ) : !hasData ? (
        <div style={{ textAlign:'center', padding:'32px 0', color:C.t3, fontSize:13 }}>
          No live markets found right now. Try searching for a specific team or match above.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>

          {/* LIVE MATCH CARDS — binary markets with real odds */}
          {games.map((game, i) => (
            <div key={game.slug} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, overflow:'hidden' }}>
              {/* Sport label */}
              <div style={{ padding:'8px 16px 0', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12 }}>{game.emoji}</span>
                <span style={{ fontSize:10, fontWeight:700, color:C.t3, textTransform:'uppercase', letterSpacing:'0.5px' }}>{game.sport}</span>
                <span style={{ fontSize:10, color:C.t3 }}>· {game.volumeFormatted} traded</span>
              </div>
              {/* Match odds */}
              <div style={{ padding:'10px 16px 14px', display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center' }}>
                {/* Home team */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.t1, marginBottom:4, lineHeight:1.3 }}>{game.homeTeam}</div>
                  <div style={{ fontSize:24, fontWeight:900, fontFamily:'monospace', color:game.homeOdds >= 50 ? C.green : C.t2 }}>{game.homeOdds}%</div>
                  <div style={{ fontSize:9, color:C.t3, marginTop:2 }}>chance to win</div>
                </div>
                {/* VS */}
                <div style={{ textAlign:'center', padding:'0 4px' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.t3 }}>VS</div>
                </div>
                {/* Away team */}
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.t1, marginBottom:4, lineHeight:1.3 }}>{game.awayTeam}</div>
                  <div style={{ fontSize:24, fontWeight:900, fontFamily:'monospace', color:game.awayOdds >= 50 ? C.green : C.t2 }}>{game.awayOdds}%</div>
                  <div style={{ fontSize:9, color:C.t3, marginTop:2 }}>chance to win</div>
                </div>
              </div>
              {/* Actions */}
              <div style={{ borderTop:'1px solid '+C.border, padding:'10px 16px', display:'flex', gap:8 }}>
                <button onClick={() => goAnalyze(game.url)}
                  style={{ flex:1, padding:'7px', borderRadius:8, background:C.purpleBg, border:'1px solid '+C.purpleBorder, color:C.purpleL, cursor:'pointer', fontSize:12, fontWeight:600 }}>
                  Get AI analysis
                </button>
                <a href={game.url} target="_blank" rel="noopener noreferrer"
                  style={{ flex:1, padding:'7px', borderRadius:8, background:'rgba(46,204,138,0.1)', border:'1px solid rgba(46,204,138,0.2)', color:C.green, cursor:'pointer', fontSize:12, fontWeight:600, textAlign:'center', textDecoration:'none', display:'block' }}>
                  Bet on Polymarket →
                </a>
              </div>
            </div>
          ))}

          {/* FUTURES MARKETS — top outcomes */}
          {futures.length > 0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.t3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Tournament markets</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
                {futures.map(f => (
                  <div key={f.slug} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                      <span style={{ fontSize:14 }}>{f.emoji}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:C.t1, lineHeight:1.3 }}>{f.title}</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
                      {f.topOutcomes.map((o, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:12, color:C.t2 }}>{o.name}</span>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:60, height:4, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:2, background:i===0?C.green:C.t3, width:o.pct+'%' }}/>
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, fontFamily:'monospace', color:i===0?C.green:C.t2, minWidth:32, textAlign:'right' }}>{o.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => goAnalyze(f.url)}
                        style={{ flex:1, padding:'6px', borderRadius:7, background:C.purpleBg, border:'1px solid '+C.purpleBorder, color:C.purpleL, cursor:'pointer', fontSize:11, fontWeight:600 }}>
                        AI analysis
                      </button>
                      <a href={f.url} target="_blank" rel="noopener noreferrer"
                        style={{ flex:1, padding:'6px', borderRadius:7, background:'rgba(46,204,138,0.08)', border:'1px solid rgba(46,204,138,0.15)', color:C.green, cursor:'pointer', fontSize:11, fontWeight:600, textAlign:'center', textDecoration:'none', display:'block' }}>
                        Trade →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
