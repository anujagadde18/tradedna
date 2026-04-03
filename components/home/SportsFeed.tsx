'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SportEvent {
  slug: string; title: string; url: string;
  volume: number; volumeFormatted: string;
  league: string; emoji: string; priority: number;
  yesPrice: number | null; marketCount: number; isMulti: boolean;
  endDate: string;
}

const C = {
  bg0:'#06060a', bg2:'#14141c', bg3:'#1a1a24',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  t1:'#f2f0ff', t2:'#9996b8', t3:'#5c5a78',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)', purpleBorder:'rgba(124,111,247,0.25)',
  green:'#2ecc8a', greenBg:'rgba(46,204,138,0.1)',
  amber:'#f5a623', amberBg:'rgba(245,166,35,0.1)',
  red:'#ef4f6a',
};

const LEAGUE_COLORS: Record<string, { color: string; bg: string }> = {
  'IPL':     { color: '#f5a623', bg: 'rgba(245,166,35,0.12)' },
  'Cricket': { color: '#f5a623', bg: 'rgba(245,166,35,0.12)' },
  'NBA':     { color: '#ef4f6a', bg: 'rgba(239,79,106,0.12)' },
  'NFL':     { color: '#4d9de0', bg: 'rgba(77,157,224,0.12)' },
  'Soccer':  { color: '#2ecc8a', bg: 'rgba(46,204,138,0.12)' },
  'EPL':     { color: '#2ecc8a', bg: 'rgba(46,204,138,0.12)' },
  'UCL':     { color: '#2ecc8a', bg: 'rgba(46,204,138,0.12)' },
  'NHL':     { color: '#a89cf8', bg: 'rgba(168,156,248,0.12)' },
  'MLB':     { color: '#7c6ff7', bg: 'rgba(124,111,247,0.12)' },
  'UFC':     { color: '#ef4f6a', bg: 'rgba(239,79,106,0.12)' },
  'Tennis':  { color: '#2ecc8a', bg: 'rgba(46,204,138,0.12)' },
  'F1':      { color: '#f5a623', bg: 'rgba(245,166,35,0.12)' },
  'Sports':  { color: '#9996b8', bg: 'rgba(153,150,184,0.1)' },
};

export function SportsFeed() {
  const router = useRouter();
  const [events, setEvents]       = useState<SportEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [leagues, setLeagues]     = useState<string[]>([]);
  const [activeLeague, setActiveLeague] = useState('all');
  const [error, setError]         = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const url = activeLeague === 'all' ? '/api/sports' : '/api/sports?league=' + activeLeague;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setEvents(d.results || []);
        setLeagues(d.leagues || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [activeLeague]);

  const go = (url: string) => router.push('/scores?event=' + encodeURIComponent(url));

  const daysLeft = (endDate: string) => {
    if (!endDate) return null;
    const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return null;
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day left';
    if (diff <= 7) return diff + ' days left';
    return null;
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 20 }}>🏆</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.t1, letterSpacing: '-0.2px' }}>Live sports markets</span>
        <span style={{ fontSize: 11, color: C.t3 }}>· AI odds on every match</span>
      </div>

      {/* League tabs — dynamically populated */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveLeague('all')}
          style={{ padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (activeLeague === 'all' ? C.purpleBorder : C.border), background: activeLeague === 'all' ? C.purpleBg : 'transparent', color: activeLeague === 'all' ? C.purpleL : C.t2 }}>
          All sports
        </button>
        {leagues.map(lg => (
          <button key={lg} onClick={() => setActiveLeague(lg)}
            style={{ padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid ' + (activeLeague === lg ? C.purpleBorder : C.border), background: activeLeague === lg ? C.purpleBg : 'transparent', color: activeLeague === lg ? C.purpleL : C.t2 }}>
            {LEAGUE_COLORS[lg] ? '' : ''}{lg}
          </button>
        ))}
      </div>

      {/* Events */}
      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 76, background: C.bg2, borderRadius: 12, border: '1px solid ' + C.border, opacity: 0.3 + i * 0.1 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.t3, fontSize: 13 }}>
          Could not load sports markets. Try again later.
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.t3, fontSize: 13 }}>
          No live {activeLeague !== 'all' ? activeLeague : 'sports'} markets right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {events.map((event, i) => {
            const lgStyle = LEAGUE_COLORS[event.league] || LEAGUE_COLORS.Sports;
            const days    = daysLeft(event.endDate);
            return (
              <button key={i} onClick={() => go(event.url)}
                style={{ width: '100%', background: C.bg2, border: '1px solid ' + C.border, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={e => { e.currentTarget.style.background = C.bg3; e.currentTarget.style.borderColor = C.border2; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.bg2; e.currentTarget.style.borderColor = C.border; }}>

                {/* Rank */}
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, minWidth: 20, textAlign: 'right' }}>{i + 1}</div>

                {/* Emoji */}
                <div style={{ fontSize: 20, minWidth: 28, textAlign: 'center' }}>{event.emoji}</div>

                {/* Title + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.t1, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: lgStyle.bg, color: lgStyle.color }}>
                      {event.league}
                    </span>
                    <span style={{ fontSize: 10, color: C.t3 }}>{event.volumeFormatted} vol</span>
                    {event.isMulti && <span style={{ fontSize: 10, color: C.t3 }}>{event.marketCount} outcomes</span>}
                    {days && <span style={{ fontSize: 10, color: C.amber }}>{days}</span>}
                  </div>
                </div>

                {/* YES odds — only for binary markets */}
                {event.yesPrice !== null && !event.isMulti && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: event.yesPrice >= 50 ? C.green : C.red }}>{event.yesPrice}%</div>
                    <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>YES odds</div>
                  </div>
                )}

                {/* Multi-outcome badge */}
                {event.isMulti && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: C.amber, fontWeight: 600 }}>{event.marketCount} picks</div>
                    <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>multi-outcome</div>
                  </div>
                )}

                {/* CTA */}
                <div style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: C.purple, padding: '5px 10px', borderRadius: 8, border: '1px solid ' + C.purpleBorder, background: C.purpleBg, whiteSpace: 'nowrap' }}>
                  Analyze
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {!loading && events.length > 0 && (
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: C.t3 }}>
          Showing {events.length} live sports markets · Click any to get AI analysis
        </div>
      )}
    </div>
  );
}
