'use client';
import React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PolymarketComparison } from '@/components/PolymarketComparison';
import { TradePanel } from '@/components/TradePanel';
import { calculateIntelligence } from '@/lib/intelligenceEngine';

interface TradeReadyData {
  marketTitle: string; marketUrl: string; outcomeType: string;
  marketType: 'binary' | 'categorical';
  topOutcome: { name: string; odds: number; aiConfidence: number; edge: number; tokenId?: string; };
}

const C = {
  bg0:'#07070c', bg1:'#0d0d15', bg2:'#13131e', bg3:'#191926', bg4:'#20202e', bg5:'#28283c',
  border:'rgba(255,255,255,0.055)', border2:'rgba(255,255,255,0.09)', border3:'rgba(255,255,255,0.15)',
  t1:'#eeeeff', t2:'#9896b2', t3:'#565470', t4:'#2e2c44',
  purple:'#7c6ff7', purpleL:'#a89cf8', purpleBg:'rgba(124,111,247,0.1)',
  green:'#2ecc8a', greenBg:'rgba(46,204,138,0.1)',
  amber:'#f5a623', amberBg:'rgba(245,166,35,0.1)',
  red:'#ef4f6a', redBg:'rgba(239,79,106,0.1)',
  blue:'#4d9de0', blueBg:'rgba(77,157,224,0.1)',
};

type Frame = 'verdict'|'signals'|'sources'|'markets'|'trade';

const FRAMES: Frame[] = ['verdict','signals','sources','markets','trade'];
const FRAME_LABELS = ['Verdict','Signals','Sources','Related markets','Trade'];

function SigPill({ type }: { type: 'strong'|'mixed'|'priced'|'contrary' }) {
  const m = {
    strong:  { bg: C.greenBg,  color: C.green,  label: 'Strong' },
    mixed:   { bg: C.amberBg,  color: C.amber,  label: 'Mixed' },
    priced:  { bg: C.blueBg,   color: C.blue,   label: 'Priced in' },
    contrary:{ bg: C.redBg,    color: C.red,    label: 'Contrary' },
  }[type];
  return <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:8, background:m.bg, color:m.color }}>{m.label}</span>;
}

function ConstellationSVG({ aiPct, marketPct, question, sources, hasMarket }: {
  aiPct: number; marketPct: number; question: string; sources: any[]; hasMarket: boolean;
}) {
  const [tip, setTip] = useState<{name:string;body:string;color:string}|null>(null);

  // Edge only meaningful when comparing against a real live market
  const edge = hasMarket ? (aiPct - marketPct) : null;
  const edgeStr = edge !== null ? ((edge >= 0 ? '+' : '') + edge + '%') : null;
  const edgeColor = edge !== null ? (edge > 4 ? C.green : edge > 0 ? C.amber : C.red) : C.t3;
  const convLabel = edge === null ? 'General signals' : edge > 6 ? 'High conviction' : edge > 2 ? 'Medium conviction' : 'Low conviction';
  const convBg    = edge === null ? C.bg4 : edge > 6 ? C.greenBg : edge > 2 ? C.amberBg : C.redBg;
  const convColor = edge === null ? C.t3  : edge > 6 ? C.green   : edge > 2 ? C.amber   : C.red;

  // Plain English verdict from aiPct
  const verdictText = aiPct >= 80 ? 'Very likely yes' : aiPct >= 65 ? 'Likely yes' : aiPct >= 50 ? 'Uncertain - lean yes' : aiPct >= 35 ? 'Uncertain - lean no' : 'Likely no';

  const CENTER_X = 260, CENTER_Y = 140;
  const CAT_COLOR: Record<string,string> = {
    news:'#4d9de0', social:'#7c6ff7', market:'#2ecc8a', community:'#f5a623', contrary:'#ef4f6a',
  };

  // nodeRadius based on name + contribution
  function nodeRadius(name: string, contrib: number): number {
    const abs = Math.abs(contrib);
    const base = abs >= 20 ? 26 : abs >= 14 ? 22 : abs >= 8 ? 19 : 16;
    const longest = name.split(' ').reduce((a:string,b:string) => a.length>b.length?a:b,'');
    const minName = Math.ceil(longest.length * 5.0 / 2) + 10;
    return Math.max(base, minName, 16);
  }

  // Orbit positions - angular, spaced to avoid overlap
  const ORBIT_R = { inner:82, mid:118, outer:148 };
  const ORBIT_ANGLES = {
    inner: [270, 30, 150],
    mid:   [10, 130, 250],
    outer: [70, 190, 310],
  };
  function getPos(ring: 'inner'|'mid'|'outer', idx: number) {
    const r = ORBIT_R[ring];
    const deg = ORBIT_ANGLES[ring][idx] || 0;
    const rad = deg * Math.PI / 180;
    return { cx: CENTER_X + r * Math.cos(rad), cy: CENTER_Y + r * Math.sin(rad) };
  }

  // Sort sources by contribution desc, assign orbit rings
  const sorted = [...sources]
    .sort((a,b) => Math.abs(b.contribution ?? b.weight ?? 0) - Math.abs(a.contribution ?? a.weight ?? 0))
    .slice(0, 7);

  const orbitCounts = { inner:0, mid:0, outer:0 };
  const nodes = sorted.map((src) => {
    const contrib = src.contribution ?? src.weight ?? src.impact ?? src.score ?? 0;
    const abs = Math.abs(contrib);
    const ring: 'inner'|'mid'|'outer' = abs >= 15 ? 'inner' : abs >= 7 ? 'mid' : 'outer';
    const idx = orbitCounts[ring];
    orbitCounts[ring]++;
    if (idx > 2) return null;
    const pos = getPos(ring, idx);
    const r = nodeRadius(src.name, contrib);
    const color = src.type === 'contrary' ? '#ef4f6a' : CAT_COLOR[src.category] || '#7c6ff7';
    const contribStr = (contrib >= 0 ? '+' : '') + contrib + '%';
    return { ...pos, r, glow: r+6, color, name: src.name, contrib: contribStr, tip: src.sig || src.signal || '' };
  }).filter(Boolean) as any[];

  return (
    <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:16, padding:22 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div style={{ flex:1, minWidth:0, paddingRight:16 }}>
          <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:4 }}>AI Analysis</div>
          <div style={{ fontSize:11, color:C.t2, marginBottom:8, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:280 }}>{question}</div>
          <div style={{ fontSize:40, fontWeight:700, letterSpacing:'-2px', lineHeight:1, fontFamily:'monospace', color:C.t1, marginBottom:4 }}>{aiPct}%</div>
          <div style={{ fontSize:13, fontWeight:600, color:C.t2, marginBottom:8 }}>{verdictText}</div>
          <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:convBg, color:convColor, border:'1px solid '+convColor+'33' }}>{convLabel}</span>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          {edgeStr !== null ? (
            <>
              <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>Edge over market</div>
              <div style={{ fontSize:28, fontWeight:700, fontFamily:'monospace', letterSpacing:'-1px', color:edgeColor }}>{edgeStr}</div>
              <div style={{ fontSize:9, color:C.t3, marginTop:2 }}>{edge! > 6 ? 'strong opportunity' : edge! > 2 ? 'small opportunity' : 'no edge'}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>Confidence</div>
              <div style={{ fontSize:28, fontWeight:700, fontFamily:'monospace', color:C.purpleL }}>{aiPct}%</div>
              <div style={{ fontSize:9, color:C.t3, marginTop:2, lineHeight:1.4, maxWidth:90 }}>Paste a Polymarket URL for live edge</div>
            </>
          )}
        </div>
      </div>
      <div style={{ fontSize:9, color:C.t3, marginBottom:6 }}>Signals orbit the verdict. Closer = stronger pull. Click any bubble to inspect.</div>
      <div style={{ position:'relative' }}>
        <svg width="100%" viewBox="0 0 520 290" style={{ display:'block' }}>
          <defs>
            <radialGradient id="rg1b" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7c6ff7" stopOpacity="0.14"/>
              <stop offset="100%" stopColor="#7c6ff7" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx={CENTER_X} cy={CENTER_Y} r="110" fill="url(#rg1b)"/>
          <circle cx={CENTER_X} cy={CENTER_Y} r={ORBIT_R.inner} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.5" strokeDasharray="4 5"/>
          <circle cx={CENTER_X} cy={CENTER_Y} r={ORBIT_R.mid}   fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.5" strokeDasharray="3 6"/>
          <circle cx={CENTER_X} cy={CENTER_Y} r={ORBIT_R.outer} fill="none" stroke="rgba(255,255,255,0.04)"  strokeWidth="0.5" strokeDasharray="2 7"/>
          {nodes.map((n:any,i:number) => {
            const angle = Math.atan2(CENTER_Y - n.cy, CENTER_X - n.cx);
            const x1 = n.cx + n.r * Math.cos(angle);
            const y1 = n.cy + n.r * Math.sin(angle);
            return <line key={'l'+i} x1={x1} y1={y1} x2={CENTER_X} y2={CENTER_Y} stroke={n.color} strokeWidth="0.8" opacity="0.28"/>;
          })}
          {nodes.map((n:any,i:number) => {
            const words = n.name.split(' ');
            const mid = Math.ceil(words.length/2);
            const line1 = words.length > 1 ? words.slice(0,mid).join(' ') : n.name;
            const line2 = words.length > 1 ? words.slice(mid).join(' ') : null;
            return (
              <g key={'n'+i} style={{ cursor:'pointer' }} onClick={() => setTip({ name:n.name, body:n.tip, color:n.color })}>
                <circle cx={n.cx} cy={n.cy} r={n.glow} fill={n.color} opacity="0.08"/>
                <circle cx={n.cx} cy={n.cy} r={n.r}    fill={n.color} opacity="0.92"/>
                {line2 ? (
                  <>
                    <text x={n.cx} y={n.cy-5}  textAnchor="middle" fontSize="8"   fontWeight="600" fill="white" fontFamily="Inter,sans-serif">{line1}</text>
                    <text x={n.cx} y={n.cy+5}  textAnchor="middle" fontSize="8"   fontWeight="600" fill="white" fontFamily="Inter,sans-serif">{line2}</text>
                    <text x={n.cx} y={n.cy+15} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontFamily="Inter,sans-serif">{n.contrib}</text>
                  </>
                ) : (
                  <>
                    <text x={n.cx} y={n.cy-1}  textAnchor="middle" fontSize="8.5" fontWeight="600" fill="white" fontFamily="Inter,sans-serif">{n.name}</text>
                    <text x={n.cx} y={n.cy+10} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontFamily="Inter,sans-serif">{n.contrib}</text>
                  </>
                )}
              </g>
            );
          })}
          <circle cx={CENTER_X} cy={CENTER_Y} r="42" fill="#7c6ff7" opacity="0.08"/>
          <circle cx={CENTER_X} cy={CENTER_Y} r="30" fill="#7c6ff7" opacity="0.15"/>
          <circle cx={CENTER_X} cy={CENTER_Y} r="22" fill="#7c6ff7"/>
          <text x={CENTER_X} y={CENTER_Y-4} textAnchor="middle" fontSize="12" fontWeight="700" fill="white" fontFamily="Inter,sans-serif">{aiPct}%</text>
          <text x={CENTER_X} y={CENTER_Y+7} textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.6)" fontFamily="Inter,sans-serif">AI verdict</text>
          <circle cx="18"  cy="276" r="4" fill="#4d9de0"/><text x="26"  y="280" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">News</text>
          <circle cx="60"  cy="276" r="4" fill="#7c6ff7"/><text x="68"  y="280" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">Social</text>
          <circle cx="102" cy="276" r="4" fill="#2ecc8a"/><text x="110" y="280" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">Market</text>
          <circle cx="148" cy="276" r="4" fill="#ef4f6a"/><text x="156" y="280" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">Contrary</text>
          <text x="210" y="280" fontSize="7.5" fill="#5a5878" fontFamily="Inter,sans-serif">Click any signal to inspect</text>
        </svg>
        {tip && (
          <div style={{ position:'absolute', top:8, right:0, background:C.bg3, border:'1px solid '+C.border2, borderRadius:10, padding:'10px 12px', width:190, zIndex:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:tip.color }}></div>
              <span style={{ fontSize:11, fontWeight:600, color:C.t1 }}>{tip.name}</span>
            </div>
            <div style={{ fontSize:10, color:C.t2, lineHeight:1.5 }}>{tip.body}</div>
            <div style={{ fontSize:9, color:C.t3, marginTop:6, cursor:'pointer' }} onClick={() => setTip(null)}>Dismiss</div>
          </div>
        )}
      </div>
      <div style={{ fontSize:11, color:C.t2, lineHeight:1.65, padding:'10px 12px', background:'rgba(255,255,255,0.025)', borderRadius:8, borderLeft:'2px solid '+C.border2, marginTop:10 }}>
        {edge !== null
          ? `AI sees a ${edgeStr} edge over market consensus. Strongest signals are pulling toward this outcome.`
          : `AI analyzed ${sources.length} sources for this question. Paste a Polymarket URL to compare against live market odds and calculate your edge.`
        }
      </div>
      {edge !== null && edge > 2 && (
        <div style={{ fontSize:11, fontWeight:700, color:C.amber, marginTop:8 }}>
          Suggested position: {edge > 6 ? '$75 - $200' : '$25 - $75'}
        </div>
      )}
    </div>
  );
}
;
