'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  slug: string; title: string; url: string; volume: number; endDate: string; markets: number;
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery]             = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults]         = useState<SearchResult[]>([]);
  const [searching, setSearching]     = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timer                         = useRef<NodeJS.Timeout | null>(null);

  const isUrl = (q: string) => q.includes('polymarket.com/event/');

  useEffect(() => {
    if (!query.trim() || isUrl(query) || query.trim().length < 3) {
      setResults([]); setShowResults(false); return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch('/api/search?q=' + encodeURIComponent(query.trim()));
        const d = await r.json();
        if (d.results?.length > 0) { setResults(d.results); setShowResults(true); }
        else { setResults([]); setShowResults(false); }
      } catch {}
      setSearching(false);
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const go = (q: string) => {
    setIsAnalyzing(true); setShowResults(false);
    router.push('/scores?event=' + encodeURIComponent(q));
  };

  const fmtVol = (v: number) => v >= 1_000_000 ? '$'+(v/1_000_000).toFixed(1)+'M' : v >= 1_000 ? '$'+(v/1_000).toFixed(0)+'K' : '$'+v;

  const examples = [
    { cat: 'Technology', q: 'Which company will have the top AI model by June 2026?' },
    { cat: 'Geopolitics', q: 'Will there be a US-Iran ceasefire?' },
    { cat: 'Crypto', q: 'Will Bitcoin hit $100k before April?' },
    { cat: 'Economics', q: 'Will the Fed cut rates in May?' },
  ];

  return (
    <div style={{ background: '#0a0a0b', minHeight: '100vh', color: '#f0eff4', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px' }}>PlayPicks AI</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => router.push('/journal')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#9998a8', cursor: 'pointer', border: 'none', background: 'none' }}>Trade Journal</button>
          <button onClick={() => router.push('/profile')} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#9998a8', cursor: 'pointer', border: 'none', background: 'none' }}>Profile</button>
        </div>
      </nav>

      <div style={{ paddingTop: 56 }}>
        <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px 60px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse at center, rgba(124,111,247,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124,111,247,0.12)', border: '1px solid rgba(124,111,247,0.25)', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#9d98f8', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, background: '#7c6ff7', borderRadius: '50%', display: 'inline-block' }}></span>
            AI-powered prediction markets
          </div>

          <h1 style={{ fontSize: 'clamp(48px, 8vw, 80px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 20, color: '#f0eff4' }}>
            Pick Feeds.<br /><em style={{ fontStyle: 'italic', color: '#7c6ff7' }}>Craft Conviction.</em>
          </h1>
          <p style={{ fontSize: 17, color: '#9998a8', maxWidth: 520, lineHeight: 1.6, marginBottom: 40 }}>
            Ask any prediction question. Get AI analysis from news, social, and market signals. Trade with conviction.
          </p>

          <div style={{ width: '100%', maxWidth: 600, position: 'relative', marginBottom: 12 }}>
            <div style={{ display: 'flex', background: '#111113', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, overflow: 'visible', boxShadow: '0 0 0 0', position: 'relative' }}>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && query.trim() && go(query.trim())}
                placeholder="What do you want to predict? Ask anything..."
                autoFocus
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '16px 20px', fontSize: 15, color: '#f0eff4', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={() => query.trim() && go(query.trim())} disabled={isAnalyzing || !query.trim()}
                style={{ margin: 6, padding: '0 24px', background: '#7c6ff7', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (!query.trim() || isAnalyzing) ? 0.5 : 1 }}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            {showResults && results.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#111113', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden', zIndex: 50, boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#5e5d6e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Polymarket markets</span>
                  {searching && <span style={{ fontSize: 11, color: '#7c6ff7' }}>Searching...</span>}
                </div>
                {results.map((r, i) => (
                  <button key={i} onClick={() => go(r.url)} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#18181c')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <div style={{ fontSize: 13, color: '#f0eff4', fontWeight: 500, marginBottom: 2 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: '#5e5d6e' }}>{fmtVol(r.volume)} volume</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#5e5d6e', marginBottom: 48 }}>Type a question or paste a Polymarket URL</p>

          <p style={{ fontSize: 12, color: '#5e5d6e', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, marginBottom: 16 }}>Not sure where to start?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 560, width: '100%' }}>
            {examples.map((ex, i) => (
              <button key={i} onClick={() => go(ex.q)}
                style={{ padding: '16px 18px', background: '#111113', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget.style.background = '#18181c'); (e.currentTarget.style.borderColor = 'rgba(124,111,247,0.3)'); }}
                onMouseLeave={e => { (e.currentTarget.style.background = '#111113'); (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'); }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#7c6ff7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{ex.cat}</div>
                <div style={{ fontSize: 13, color: '#9998a8', lineHeight: 1.4 }}>{ex.q}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '80px 40px', borderTop: '1px solid rgba(255,255,255,0.07)', maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', letterSpacing: '-0.5px', marginBottom: 48 }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { n: '1', t: 'Analyze the market', d: 'Ask any prediction question or paste a Polymarket URL. AI figures out the rest and pulls live signals.' },
              { n: '2', t: 'See your conviction score', d: 'AI calculates an edge - where it disagrees with the market and why. Tune the weights to match your strategy.' },
              { n: '3', t: 'Trade with conviction', d: 'Place orders directly through PlayPicks. Every trade is logged with the AI conviction snapshot that justified it.' },
            ].map(s => (
              <div key={s.n} style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px' }}>
                <div style={{ width: 36, height: 36, background: 'rgba(124,111,247,0.15)', border: '1px solid rgba(124,111,247,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#7c6ff7', marginBottom: 16 }}>{s.n}</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{s.t}</div>
                <div style={{ fontSize: 13, color: '#9998a8', lineHeight: 1.6 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 40px 80px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {[
              { icon: 'Multi-Source Intelligence', desc: 'News sentiment, community signals, and live Polymarket odds - all in one analysis.' },
              { icon: 'Custom Weighting', desc: 'Adjust signal weights to match your strategy. Trust markets more? Increase market weight.' },
              { icon: 'Conviction-Gated Trading', desc: 'Only trade after AI analysis runs. See your edge before placing a single dollar.' },
              { icon: 'Trade Journal', desc: 'Every trade logged with the AI conviction snapshot. Track your win rate when you followed the edge.', link: true },
            ].map((f, i) => (
              <div key={i} style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#f0eff4' }}>{f.icon}</div>
                <div style={{ fontSize: 12, color: '#9998a8', lineHeight: 1.6 }}>{f.desc}</div>
                {f.link && (
                  <button onClick={() => router.push('/journal')} style={{ marginTop: 12, fontSize: 12, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View journal</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#5e5d6e' }}>Not financial advice. Research purposes only.</span>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <button onClick={() => router.push('/journal')} style={{ fontSize: 12, color: '#5e5d6e', background: 'none', border: 'none', cursor: 'pointer' }}>Trade Journal</button>
            <button onClick={() => router.push('/profile')} style={{ fontSize: 12, color: '#5e5d6e', background: 'none', border: 'none', cursor: 'pointer' }}>Profile</button>
            <span style={{ fontSize: 12, color: '#5e5d6e' }}>Powered by TradeDNA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
