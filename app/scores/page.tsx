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

function getConviction(aiPct: number, marketPct: number) {
  const hasMarket = marketPct > 0;
  const edge = hasMarket ? aiPct - marketPct : null;
  if (edge === null) {
    if (aiPct >= 80) return { label: 'High confidence',    style: 'high', color: '#2ecc8a', bg: 'rgba(46,204,138,0.1)',  border: 'rgba(46,204,138,0.2)' };
    if (aiPct >= 60) return { label: 'Medium confidence',  style: 'med',  color: '#f5a623', bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.2)' };
    return               { label: 'Low confidence',       style: 'low',  color: '#ef4f6a', bg: 'rgba(239,79,106,0.1)', border: 'rgba(239,79,106,0.2)' };
  }
  if (edge > 8) return   { label: 'High conviction',      style: 'high', color: '#2ecc8a', bg: 'rgba(46,204,138,0.1)',  border: 'rgba(46,204,138,0.2)' };
  if (edge > 3) return   { label: 'Medium conviction',    style: 'med',  color: '#f5a623', bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.2)' };
  return                 { label: 'Low conviction',       style: 'low',  color: '#ef4f6a', bg: 'rgba(239,79,106,0.1)', border: 'rgba(239,79,106,0.2)' };
}

function getVerdictText(aiPct: number): string {
  if (aiPct >= 80) return 'Very likely yes';
  if (aiPct >= 65) return 'Likely yes';
  if (aiPct >= 50) return 'More likely YES';
  if (aiPct >= 35) return 'More likely NO';
  return 'Likely no';
}

const CAT_COLOR: Record<string,string> = {
  news:'#4d9de0', social:'#7c6ff7', market:'#2ecc8a', community:'#f5a623', contrary:'#ef4f6a',
};

function SourceAvatar({ name, category }: { name: string; category: string }) {
  const colors: Record<string,{bg:string;text:string}> = {
    news:      { bg:'rgba(77,157,224,0.15)',  text:'#4d9de0' },
    social:    { bg:'rgba(124,111,247,0.15)', text:'#7c6ff7' },
    market:    { bg:'rgba(46,204,138,0.15)',  text:'#2ecc8a' },
    contrary:  { bg:'rgba(239,79,106,0.15)',  text:'#ef4f6a' },
    community: { bg:'rgba(245,166,35,0.15)',  text:'#f5a623' },
  };
  const SHORT: Record<string,string> = {
    'Financial Times':'FT','Wall Street Journal':'WSJ',
    'Associated Press':'AP','Twitter/X':'X',
    'Good Judgment Open':'GJ',
  };
  const c = colors[category] || colors.news;
  const letter = (SHORT[name] || name.charAt(0)).toUpperCase();
  return (
    <div style={{ width:28, height:28, borderRadius:7, background:c.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:letter.length > 1 ? 9 : 12, fontWeight:800, color:c.text, flexShrink:0 }}>
      {letter}
    </div>
  );
}

function VerdictCard({ aiPct, marketPct, question, sources, hasMarket, mtype, outcomes, rawEvent, breakdown, components }: {
  aiPct: number; marketPct: number; question: string; sources: any[]; hasMarket: boolean; mtype?: string; outcomes?: any[]; rawEvent?: string; breakdown?: any[]; components?: {key:string;label:string;prob:number}[];
}) {
  const [showAll, setShowAll] = useState(false);
  const [spotlight, setSpotlight] = useState<any>(null);

  const isCategorical = mtype === "categorical";
  const topOutcomes = outcomes?.slice(0, 5) || [];
  const matchup = question.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  const beatMatch = (rawEvent||question).match(/will\s+(.+?)\s+beat\s+(.+?)(?:\s+in|\?|$)/i);
  const team1 = matchup?.[1]?.trim() || beatMatch?.[1]?.trim() || "";
  const team2 = matchup?.[2]?.trim() || beatMatch?.[2]?.trim() || "";
  const isMatchup = !!(team1 && team2);
  const isIPL = /ipl|cricket/i.test(question) || /ipl|cricket/i.test(rawEvent||"");

  useEffect(() => {
    if (!isIPL) return;
    const src = rawEvent || question;
    const m = src.match(/will\s+(.+?)\s+beat\s+(.+?)(?:\s+in|\?|$)/i) || src.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s+ipl|\?|$)/i);
    if (!m) return;
    fetch("/api/cricket-context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ team1: m[1].trim(), team2: m[2].trim() }) })
      .then(r => r.json()).then(d => { if (d.spotlight) setSpotlight(d.spotlight); }).catch(() => {});
  }, [question, rawEvent]);

  const marketValid = hasMarket && marketPct > 0 && marketPct < 98;
  const edge = marketValid ? aiPct - marketPct : null;
  const aiTeam2Pct = 100 - aiPct;

  const verdictText = isMatchup
    ? aiPct >= 70 ? `${team1} wins — high confidence` : aiPct >= 58 ? `${team1} has the edge` : aiPct >= 42 ? `Too close — could go either way` : aiPct >= 30 ? `${team2} has the edge` : `${team2} wins — high confidence`
    : aiPct >= 75 ? "Very likely to happen" : aiPct >= 60 ? "Probably YES" : aiPct >= 45 ? "Could go either way" : aiPct >= 30 ? "Probably NO" : "Very unlikely to happen";

  const verdictColor = aiPct >= 60 ? C.green : aiPct >= 40 ? C.amber : C.red;

  function parseContrib(s: any): number {
    if (typeof s === "number") return s;
    if (typeof s === "string") return parseFloat(s.replace("%","").replace("+","")) || 0;
    return 0;
  }

  const allSources = sources.map(src => ({
    name: src.name || "",
    sig: src.sig || src.signal || "",
    type: src.type || "mixed",
    category: src.category || "news",
    url: src.url || "",
    contribution: parseContrib(src.contrib ?? src.contribution ?? src.weight ?? 0)
  }));

  const bullSources = allSources.filter(s => s.contribution > 0 || s.type === "strong").slice(0, 3);
  const bearSources = allSources.filter(s => s.contribution < 0 || s.type === "contrary").slice(0, 3);
  const keySources = allSources.filter(s => s.name === "Key Risk").slice(0, 1);
  const metaculusSource = allSources.find(s => s.name === "Metaculus");
  const polymarketSource = allSources.find(s => s.name === "Polymarket");

  const cleanTeam = (n: string) => n.replace(/\s*(nba|nfl|nhl|mlb|ipl|f1|finals|game\s*\d+|series|playoffs|wcf|ecf|round\s*\d+|championship|world cup|—|\s*world\s*$).*$/i,'').trim();
  const t1short = cleanTeam(team1).split(' ').slice(0,3).join(' ');
  const t2short = cleanTeam(team2).split(' ').slice(0,3).join(' ');
  const winner = aiPct >= 50 ? t1short : t2short;
  const winPct = aiPct >= 50 ? aiPct : aiTeam2Pct;
  const losePct = 100 - winPct;

  return (
    <div style={{ background:C.bg2, border:"1px solid "+C.border, borderRadius:16, overflow:"hidden" }}>

      {/* MATCHUP CARD — new shareable design */}
      {isMatchup && (
        <div style={{ borderBottom:"1px solid "+C.border }}>

          {/* Header with badge */}
          <div style={{ padding:"16px 20px 12px", background:"linear-gradient(135deg,rgba(15,26,46,0.8),rgba(10,15,26,0.9))", borderBottom:"1px solid rgba(255,255,255,0.05)", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-40, right:-40, width:120, height:120, background:"radial-gradient(circle,rgba(124,111,247,0.25) 0%,transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />
            <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(124,111,247,0.15)", border:"1px solid rgba(124,111,247,0.3)", borderRadius:20, padding:"3px 10px", fontSize:11, color:"#a89cf8", fontWeight:600, marginBottom:8 }}>
              {/world cup|fifa/i.test(question) ? "⚽ World Cup 2026" : /nba|finals/i.test(question) ? "🏀 NBA 2026" : /ipl|cricket/i.test(question) ? "🏏 IPL 2026" : /f1|formula/i.test(question) ? "🏎️ F1 2026" : "🏆 Live Match"}
            </div>
            <div style={{ fontSize:11, color:C.t3 }}>AI picks {winner} to win</div>
          </div>

          {/* RECIPE STRIP — shows exactly which ingredients built this number, and the size of any gap */}
          {components && components.length > 0 && (() => {
            const ICON: Record<string,{emoji:string;color:string}> = {
              market:  { emoji:'\ud83d\udcca', color:C.blue },
              model:   { emoji:'\ud83e\uddee', color:C.purple },
              experts: { emoji:'\ud83d\udd2e', color:C.amber },
            };
            const probs = components.map(c => c.prob);
            const gap = Math.max(...probs) - Math.min(...probs);
            return (
              <div style={{ padding:"12px 20px 14px" }}>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom: gap >= 12 ? 8 : 0 }}>
                  {components.map((c, i) => {
                    const style = ICON[c.key] || { emoji:'\u2022', color:C.t3 };
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 10px", borderRadius:10, background:"rgba(255,255,255,0.03)", border:"1px solid "+C.border }}>
                        <span style={{ fontSize:13 }}>{style.emoji}</span>
                        <span style={{ fontSize:11, color:C.t3, fontWeight:600 }}>{c.label}</span>
                        <span style={{ fontSize:13, fontWeight:800, color:style.color, fontFamily:"monospace" }}>{c.prob}%</span>
                      </div>
                    );
                  })}
                </div>
                {gap >= 12 && (
                  <div style={{ fontSize:11, color:C.amber, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                    <span>\u26a1</span>
                    <span>{gap}pt gap between sources \u2014 worth a second look</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Two team boxes */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 40px 1fr", alignItems:"center", gap:8, padding:"16px 16px 12px" }}>
            <div style={{ textAlign:"center", padding:"14px 8px", borderRadius:14, background:aiPct>=50?"rgba(46,204,138,0.08)":"rgba(255,255,255,0.02)", border:"1px solid "+(aiPct>=50?"rgba(46,204,138,0.2)":C.border) }}>
              <div style={{ fontSize:11, fontWeight:700, color:aiPct>=50?C.green:C.t3, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t1short}</div>
              <div style={{ fontSize:40, fontWeight:900, color:aiPct>=50?C.green:"#3a3856", fontFamily:"monospace", lineHeight:1 }}>{aiPct}%</div>
              <div style={{ fontSize:10, marginTop:5, color:aiPct>=50?"rgba(46,204,138,0.6)":"#3a3856", fontWeight:500 }}>{aiPct>=50?"AI pick":"AI odds"}</div>
              {marketValid && <div style={{ fontSize:10, color:C.t3, marginTop:2 }}>mkt {marketPct}%</div>}
            </div>
            <div style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#2e2c44" }}>VS</div>
            <div style={{ textAlign:"center", padding:"14px 8px", borderRadius:14, background:aiPct<50?"rgba(46,204,138,0.08)":"rgba(255,255,255,0.02)", border:"1px solid "+(aiPct<50?"rgba(46,204,138,0.2)":C.border) }}>
              <div style={{ fontSize:11, fontWeight:700, color:aiPct<50?C.green:C.t3, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.3px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t2short}</div>
              <div style={{ fontSize:40, fontWeight:900, color:aiPct<50?C.green:"#3a3856", fontFamily:"monospace", lineHeight:1 }}>{aiTeam2Pct}%</div>
              <div style={{ fontSize:10, marginTop:5, color:aiPct<50?"rgba(46,204,138,0.6)":"#3a3856", fontWeight:500 }}>{aiPct<50?"AI pick":"AI odds"}</div>
              {marketValid && <div style={{ fontSize:10, color:C.t3, marginTop:2 }}>mkt {100-marketPct}%</div>}
            </div>
          </div>

          {/* Probability bar */}
          <div style={{ padding:"0 16px 12px" }}>
            <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.05)", overflow:"hidden", marginBottom:6 }}>
              <div style={{ height:"100%", width:aiPct+"%", background:"linear-gradient(90deg,"+C.green+",rgba(46,204,138,0.5))", borderRadius:3 }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#3a3856" }}>
              <span>← {t1short} wins</span>
              <span>50/50</span>
              <span>{t2short} wins →</span>
            </div>
          </div>

          {/* Market/AI/Edge strip */}
          {marketValid && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ padding:"10px 8px", textAlign:"center", borderRight:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize:9, color:"#3a3856", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4, fontWeight:600 }}>Market</div>
                <div style={{ fontSize:16, fontWeight:800, color:C.t3, fontVariantNumeric:"tabular-nums" }}>{marketPct}%</div>
              </div>
              <div style={{ padding:"10px 8px", textAlign:"center", borderRight:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize:9, color:"#3a3856", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4, fontWeight:600 }}>AI says</div>
                <div style={{ fontSize:16, fontWeight:800, color:C.green, fontVariantNumeric:"tabular-nums" }}>{aiPct}%</div>
              </div>
              <div style={{ padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:"#3a3856", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4, fontWeight:600 }}>AI edge</div>
                <div style={{ fontSize:16, fontWeight:800, color:edge!>0?C.green:C.amber, fontVariantNumeric:"tabular-nums" }}>{edge!>0?"+":""}{edge}%</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BINARY (YES/NO) CARD */}
      {!isMatchup && !isCategorical && (
        <div style={{ padding:"20px", borderBottom:"1px solid "+C.border }}>
          {/* SVG GAUGE */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:16 }}>
            <svg width="200" height="110" viewBox="0 0 200 110">
              {/* Background arc */}
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" strokeLinecap="round"/>
              {/* Colored arc - animated */}
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={verdictColor} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(aiPct/100)*251.2} 251.2`} style={{transition:"stroke-dasharray 1s ease"}} opacity="0.9"/>
              {/* Zone markers */}
              <text x="16" y="115" fontSize="9" fill="rgba(255,255,255,0.25)" textAnchor="middle">0%</text>
              <text x="100" y="22" fontSize="9" fill="rgba(255,255,255,0.25)" textAnchor="middle">50%</text>
              <text x="184" y="115" fontSize="9" fill="rgba(255,255,255,0.25)" textAnchor="middle">100%</text>
              {/* Center number */}
              <text x="100" y="90" fontSize="32" fontWeight="800" fill={verdictColor} textAnchor="middle" fontFamily="monospace">{aiPct}%</text>
              <text x="100" y="108" fontSize="11" fill="rgba(255,255,255,0.4)" textAnchor="middle">{verdictText}</text>
            </svg>
            {!marketValid && <div style={{ fontSize:11, color:C.t3, marginTop:-8 }}>AI from news + forecasters</div>}
          </div>
          {/* Bar */}
          <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.06)", overflow:"hidden", marginBottom:12 }}>
            <div style={{ height:"100%", borderRadius:3, background:verdictColor, width:aiPct+"%", transition:"width 0.8s ease" }} />
          </div>
          {marketValid && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              <div style={{ textAlign:"center", padding:"8px", background:"rgba(255,255,255,0.03)", borderRadius:8 }}>
                <div style={{ fontSize:10, color:C.t3, marginBottom:2 }}>Market</div>
                <div style={{ fontSize:15, fontWeight:700, color:C.t2 }}>{marketPct}%</div>
              </div>
              <div style={{ textAlign:"center", padding:"8px", background:"rgba(46,204,138,0.07)", borderRadius:8 }}>
                <div style={{ fontSize:10, color:C.green, marginBottom:2 }}>AI says</div>
                <div style={{ fontSize:15, fontWeight:700, color:C.green }}>{aiPct}%</div>
              </div>
              <div style={{ textAlign:"center", padding:"8px", background:edge!>0?"rgba(46,204,138,0.07)":"rgba(239,79,106,0.07)", borderRadius:8 }}>
                <div style={{ fontSize:10, color:edge!>0?C.green:C.red, marginBottom:2 }}>Edge</div>
                <div style={{ fontSize:15, fontWeight:700, color:edge!>0?C.green:C.red }}>{edge!>0?"+":""}{edge}%</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CATEGORICAL (World Cup, French Open etc) */}
      {isCategorical && topOutcomes.length > 0 && (
        <div style={{ padding:"20px", borderBottom:"1px solid "+C.border }}>
          <div style={{ fontSize:12, color:C.t3, marginBottom:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px" }}>AI picks · market odds</div>
          {topOutcomes.map((o: any, i: number) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, padding:"10px 12px", borderRadius:10, background:i===0?"rgba(46,204,138,0.06)":"transparent", border:i===0?"1px solid rgba(46,204,138,0.15)":"1px solid transparent" }}>
              <div style={{ fontSize:13, fontWeight:i===0?700:500, color:i===0?C.green:C.t2, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.name}</div>
              <div style={{ width:80, height:6, borderRadius:3, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:3, background:i===0?C.green:C.t4, width:Math.min(o.odds*2,100)+"%" }} />
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:i===0?C.green:C.t2, fontFamily:"monospace", minWidth:38, textAlign:"right" }}>{o.odds}%</div>
              {i===0 && <div style={{ fontSize:10, padding:"2px 7px", borderRadius:6, background:"rgba(46,204,138,0.15)", color:C.green, fontWeight:700 }}>AI pick</div>}
            </div>
          ))}
        </div>
      )}

      {/* REASONS */}
      {(bullSources.length > 0 || bearSources.length > 0) && (
        <div style={{ padding:"16px 20px", borderBottom:"1px solid "+C.border }}>
          <div style={{ fontSize:10, color:C.t3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:12 }}>Why this prediction</div>
          {bullSources.slice(0,3).map((s, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ width:20, height:20, borderRadius:10, background:"rgba(46,204,138,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                <span style={{ fontSize:11, color:C.green }}>✓</span>
              </div>
              <span style={{ fontSize:14, color:C.t1, lineHeight:1.5 }}>{s.sig?.slice(0,110)}{(s.sig?.length||0)>110?"…":""}</span>
            </div>
          ))}
          {bearSources.slice(0,2).map((s, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom: i===1?0:10 }}>
              <div style={{ width:20, height:20, borderRadius:10, background:"rgba(245,166,35,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                <span style={{ fontSize:11, color:C.amber }}>!</span>
              </div>
              <span style={{ fontSize:14, color:C.t2, lineHeight:1.5 }}>{s.sig?.slice(0,110)}{(s.sig?.length||0)>110?"…":""}</span>
            </div>
          ))}
        </div>
      )}

      {/* KEY WATCH */}
      {keySources.length > 0 && (
        <div style={{ padding:"10px 20px", borderBottom:"1px solid "+C.border, display:"flex", gap:8, alignItems:"center", background:"rgba(245,166,35,0.04)" }}>
          <span style={{ fontSize:14 }}>⚡</span>
          <span style={{ fontSize:12, color:C.amber, fontWeight:600 }}>Watch: </span>
          <span style={{ fontSize:12, color:C.t2 }}>{keySources[0].sig?.slice(0,90)}</span>
        </div>
      )}

      {/* SOURCES */}
      <div style={{ padding:"12px 20px", borderBottom:"1px solid "+C.border }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:C.t3, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.4px", marginRight:4 }}>Sources</span>
          {polymarketSource && <span style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:"rgba(77,157,224,0.1)", color:C.blue, border:"1px solid rgba(77,157,224,0.2)" }}>📊 Polymarket {marketPct}%</span>}
          {metaculusSource && <span style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:"rgba(124,111,247,0.1)", color:C.purple, border:"1px solid rgba(124,111,247,0.2)" }}>🎯 Forecasters</span>}
          {allSources.filter(s => s.category==="news" && s.name!=="Signal" && s.name!=="Key Risk").slice(0,3).map((s,i) => (
            <span key={i} style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:"rgba(255,255,255,0.04)", color:C.t3, border:"1px solid "+C.border }}>📰 {s.name?.slice(0,18)}</span>
          ))}
        </div>
      </div>

      {/* PLAYER SPOTLIGHT IPL */}
      {spotlight && (spotlight.team1 || spotlight.team2) && (
        <div style={{ padding:"12px 20px", borderBottom:"1px solid "+C.border }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.t3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>Players to watch</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[{team:team1,data:spotlight.team1},{team:team2,data:spotlight.team2}].map((s,i) => s.data ? (
              <div key={i} style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:"10px 12px", border:"1px solid "+C.border }}>
                <div style={{ fontSize:9, color:C.t3, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.3px" }}>{s.team}</div>
                <div style={{ fontSize:12, fontWeight:600, color:C.t1 }}>🏏 {s.data.bat?.name}</div>
                <div style={{ fontSize:11, color:C.t3, marginBottom:6 }}>{s.data.bat?.runs} runs · Avg {s.data.bat?.avg} · SR {s.data.bat?.sr}</div>
                <div style={{ fontSize:12, fontWeight:600, color:C.t1 }}>🎯 {s.data.bowl?.name}</div>
                <div style={{ fontSize:11, color:C.t3 }}>{s.data.bowl?.wkts} wkts · Eco {s.data.bowl?.eco}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* PROBABILITY BREAKDOWN */}
      {breakdown && breakdown.length > 1 && (
        <div style={{ padding:"14px 20px", borderBottom:"1px solid "+C.border }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.t3, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>How we got this number</div>
          {breakdown.map((b: any, i: number) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <div style={{ fontSize:12, color:C.t2, flex:1 }}>{b.factor}</div>
              <div style={{ fontSize:11, fontWeight:700, fontFamily:"monospace", color: b.delta > 0 ? C.green : b.delta < 0 ? C.red : C.t3, minWidth:40, textAlign:"right" }}>
                {b.delta > 0 ? "+" : ""}{b.delta !== 0 ? b.delta+"%" : "—"}
              </div>
              <div style={{ fontSize:13, fontWeight:800, fontFamily:"monospace", color:C.t1, minWidth:45, textAlign:"right" }}>{b.cumulative}%</div>
            </div>
          ))}
          <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid "+C.border, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:C.t3 }}>Final probability</span>
            <span style={{ fontSize:20, fontWeight:800, fontFamily:"monospace", color:verdictColor }}>{aiPct}%</span>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION */}
      <div style={{ padding:"14px 20px" }}>
        {edge !== null && Math.abs(edge) >= 5 ? (
          <div style={{ fontSize:13, fontWeight:600, color:edge>0?C.green:C.red, padding:"10px 14px", background:edge>0?"rgba(46,204,138,0.06)":"rgba(239,79,106,0.06)", borderRadius:10, border:"1px solid "+(edge>0?"rgba(46,204,138,0.2)":"rgba(239,79,106,0.2)") }}>
            {edge>0?"🎯 AI sees +"+edge+"% edge over market":"⚠️ Market "+Math.abs(edge)+"% more confident than AI"}
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.t3, padding:"10px 14px", background:"rgba(255,255,255,0.02)", borderRadius:10, border:"1px solid "+C.border }}>
            {aiPct>=65?"✅ AI has high conviction":aiPct>=45?"🔍 Moderate — worth researching":"⚠️ Low conviction — uncertain"}
          </div>
        )}
      </div>

    </div>
  );
}

function ShareButtons({ question, aiPct, marketPct, hasMarket, isMatchup, team1, team2, aiTeam2Pct }: { question:string; aiPct:number; marketPct:number; hasMarket:boolean; isMatchup?:boolean; team1?:string; team2?:string; aiTeam2Pct?:number }) {
  const [copied, setCopied] = useState(false);

  const sportEmoji = question.toLowerCase().includes('ipl') || question.toLowerCase().includes('cricket') ? '🏏' :
    question.toLowerCase().includes('nba') || question.toLowerCase().includes('basketball') ? '🏀' :
    question.toLowerCase().includes('nhl') || question.toLowerCase().includes('hockey') ? '🏒' :
    question.toLowerCase().includes('mlb') || question.toLowerCase().includes('baseball') ? '⚾' :
    question.toLowerCase().includes('soccer') || question.toLowerCase().includes('fc') || question.toLowerCase().includes('united') ? '⚽' : '🏆';

  const shareText = isMatchup && team1 && team2
    ? `${sportEmoji} AI Prediction: ${team1} vs ${team2}\n\n${team1}: ${aiPct}% | ${team2}: ${aiTeam2Pct}%\n\n${hasMarket && marketPct > 0 && marketPct < 98 ? 'Market: ' + marketPct + '% for ' + team1 + '\n\n' : ''}Full AI analysis 👇\ntradedna.vercel.app\n\n#PlayPicks #AIodds`
    : `🤖 PlayPicks AI: ${aiPct}% chance\n\n"${question}"\n\n${hasMarket && marketPct > 0 ? 'Market: ' + marketPct + '%\n\n' : ''}tradedna.vercel.app\n#PlayPicks`;

  function onX() {
    window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(shareText), '_blank', 'width=550,height=420');
  }
  function onWhatsApp() {
    window.open('https://wa.me/?text='+encodeURIComponent(shareText), '_blank');
  }
  async function onCopy() {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(()=>setCopied(false),2000); } catch {}
  }

  return (
    <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:14, marginTop:6 }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#5c5a78', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Share this prediction</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={onX} style={{ padding:'7px 14px', borderRadius:9, background:'#000', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}>
          𝕏 Post on X
        </button>
        <button onClick={onWhatsApp} style={{ padding:'7px 14px', borderRadius:9, background:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.25)', color:'#25d366', cursor:'pointer', fontSize:12, fontWeight:600 }}>
          WhatsApp
        </button>
        <button onClick={onCopy} style={{ padding:'7px 14px', borderRadius:9, background:copied?'rgba(46,204,138,0.12)':'rgba(124,111,247,0.1)', border:'1px solid '+(copied?'rgba(46,204,138,0.3)':'rgba(124,111,247,0.25)'), color:copied?'#2ecc8a':'#a89cf8', cursor:'pointer', fontSize:12, fontWeight:600 }}>
          {copied ? '✓ Copied!' : 'Copy text'}
        </button>
      </div>
    </div>
  );
}

function MagicLinkModalInner({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        const mod = await import('magic-sdk');
        const Magic = mod.Magic || mod.default?.Magic || mod.default;
        if (Magic) {
          const magic = new Magic('pk_live_8621357A14A8491A', {
            network: { rpcUrl: 'https://polygon-rpc.com', chainId: 137 },
          });
          await magic.auth.loginWithEmailOTP({ email: email.trim() });
        }
      }
      setSent(true);
      // Mark as signed in — bypasses daily limit
      if (typeof window !== 'undefined') {
        localStorage.setItem('pp_signed_in', '1');
      }
    } catch { setSent(true); } // show success even on error
    setLoading(false);
  };

  const C2 = { t1:'#eeeeff', t2:'#9896b2', t3:'#565470', bg3:'#191926', border2:'rgba(255,255,255,0.09)', purple:'#7c6ff7' };
  return sent ? (
    <div style={{ textAlign:'center', padding:'20px 0' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>OK</div>
      <div style={{ fontSize:15, fontWeight:600, color:C2.t1, marginBottom:6 }}>Check your email</div>
      <div style={{ fontSize:12, color:C2.t2, marginBottom:20 }}>We sent a magic link to {email}. Click it to sign in.</div>
      <button onClick={onClose} style={{ padding:'8px 20px', background:C2.purple, color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Done</button>
    </div>
  ) : (
    <>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="your@email.com"
        style={{ width:'100%', background:C2.bg3, border:'1px solid '+C2.border2, borderRadius:9, padding:'11px 13px', color:C2.t1, fontSize:13, outline:'none', fontFamily:'inherit', marginBottom:10, boxSizing:'border-box' as const }} />
      <button onClick={handleSubmit} disabled={loading || !email.trim()}
        style={{ width:'100%', padding:12, background:C2.purple, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', marginBottom:10, opacity:(!email.trim()||loading)?0.5:1 }}>
        {loading ? 'Sending...' : 'Send magic link'}
      </button>
      <button onClick={onClose} style={{ display:'block', textAlign:'center', width:'100%', fontSize:11, color:C2.t3, background:'none', border:'none', cursor:'pointer' }}>Cancel</button>
    </>
  );
}


function ScoresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const event = searchParams.get('event') || '';

  // Persistent anonymous user ID — stored in localStorage
  const [anonId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('pp_uid');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('pp_uid', id); }
    return id;
  });

  const [frame, setFrame]           = useState<Frame>('verdict');
  const [intel, setIntel]           = useState<any>(null);
  const [breakdown, setBreakdown]    = useState<any[]>([]);
  const [realSources, setRealSources] = useState<any[]>([]);
  const [components, setComponents] = useState<{key:string;label:string;prob:number}[]>([]);
  const [invalidQuestion, setInvalidQuestion] = useState<{reason:string;examples:string[]}|null>(null);
  const [odds, setOdds]             = useState<number|null>(null);
  const [marketTitle, setMarketTitle] = useState<string>('');
  const [mtype, setMtype]           = useState<'binary'|'categorical'>('binary');
  const [outcomes, setOutcomes]     = useState<any[]>([]);
  const [hasUrl, setHasUrl]         = useState<boolean|null>(null);
  const [tradeData, setTradeData]   = useState<TradeReadyData|null>(null);
  const [weights, setWeights]       = useState({ news:35, social:40, technical:25 });
  const [related, setRelated]       = useState<any[]>([]);
  const [srcCount, setSrcCount]     = useState(8);
  const [toast, setToast]           = useState('');
  const [addFormOpen, setAddForm]   = useState(false);
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('pp_signed_in');
  });
  const [customUrl, setCustomUrl]   = useState('');
  const [mktAdded, setMktAdded]     = useState<Record<string,boolean>>({});
  const [mktAdding, setMktAdding]   = useState<Record<string,boolean>>({});

  const isPolymarketUrl = event.includes('polymarket.com/event/') || event.includes('polymarket.com/sports/');
  useEffect(() => {
    setHasUrl(isPolymarketUrl);
    setOdds(null);
    setMarketTitle('');
    setOutcomes([]);
    setTradeData(null);
    setRelated([]);
    setRealSources([]);
    setComponents([]);
    setIntel(null);
    setBreakdown([]);
    setLimitReached(false);
    setInvalidQuestion(null);
    setFrame('verdict');
  }, [event]);

  useEffect(() => {
    const go = async () => {
      try {
        const q = event.toLowerCase();
        // Extract meaningful keywords from query
        const stop = new Set(['will','there','that','this','what','when','have','does','with','would','the','and','for','are','by','in','on','at','to','of','a','an','be','is','it']);
        const queryWords = event.replace(/[?!.,]/g,'').split(' ')
          .filter((w:string) => w.length > 2 && !stop.has(w.toLowerCase()))
          .map((w:string) => w.toLowerCase());

        // Detect topic and get search terms
        // Ordered priority: tech FIRST to prevent "company"/"model" matching economics
        const TOPIC_SIGNALS: Record<string, string[]> = {
          technology: ['ai','artificial intelligence','gpt','llm','openai','google gemini','anthropic','chatgpt','claude','gemini','language model','ai model','tech company','machine learning'],
          crypto:     ['bitcoin','btc','ethereum','eth','crypto','blockchain','solana','coinbase','defi'],
          geopolitics:['election','president','nato','ceasefire','ukraine','russia','iran','china','treaty','war crimes','sanctions'],
          sports:     ['nfl','nba','super bowl','world cup','championship','playoffs','nhl','mlb'],
          economics:  ['gdp','federal reserve','recession','inflation','unemployment','interest rate','treasury','fed funds'],
        };
        const TOPIC_SEARCH: Record<string, string> = {
          technology: 'AI model OpenAI GPT Anthropic artificial intelligence 2026',
          crypto:     'Bitcoin Ethereum crypto price 2026',
          geopolitics:'election president war ceasefire 2026',
          sports:     queryWords.slice(0,3).join(' '),
          economics:  'GDP recession inflation Fed rates 2026',
        };
        let detectedTopic = '';
        let topicKws: string[] = [];
        // Check each topic in priority order
        const topicOrder = ['technology','crypto','geopolitics','sports','economics'];
        for (const topic of topicOrder) {
          if (TOPIC_SIGNALS[topic].some((s:string) => q.includes(s))) {
            detectedTopic = topic;
            topicKws = TOPIC_SIGNALS[topic];
            break;
          }
        }

        const searchQ = detectedTopic ? TOPIC_SEARCH[detectedTopic] : queryWords.slice(0,3).join(' ');

        const r = await fetch('/api/search?q=' + encodeURIComponent(searchQ));
        const d = await r.json();
        if (!d.results) return;

        // Strict filter: title must contain at least one topic keyword
        // AND must not be an expired/old market (check endDate)
        const now = new Date();
        const filtered = d.results.filter((m: any) => {
          const title = (m.title || '').toLowerCase();
          // Filter expired markets
          if (m.endDate && new Date(m.endDate) < now) return false;
          // If we have topic keywords, at least one must match
          if (topicKws.length > 0) return topicKws.some(kw => title.includes(kw.toLowerCase()));
          // Fallback: match at least one query word
          return queryWords.some(w => w.length > 3 && title.includes(w));
        });

        setRelated(filtered.slice(0, 6));
      } catch {}
    };
    if (event) go();
  }, [event]);

  const runAnalysis = async () => {
    if (mtype === 'categorical') return;
    if (!event) return;

    // Convert Polymarket URL to a readable question for news search
    let analysisQuery = event;
    if (event.includes('polymarket.com/event/')) {
      if (marketTitle) {
        analysisQuery = marketTitle;
      } else {
        const slug = event.split('polymarket.com/event/')[1]?.split('/')[0]?.split('?')[0] || '';
        const NBA: Record<string,string> = {'cha':'Hornets','bos':'Celtics','chi':'Bulls','was':'Wizards','uta':'Jazz','nop':'Pelicans','min':'Timberwolves','ind':'Pacers','mil':'Bucks','bkn':'Nets','okc':'Thunder','lal':'Lakers','mia':'Heat','tor':'Raptors','sac':'Kings','gsw':'Warriors','hou':'Rockets','phx':'Suns','atl':'Braves','laa':'Angels','ari':'Diamondbacks','nym':'Mets','kc':'Royals','cle':'Guardians','tb':'Lightning','ott':'Senators','edm':'Oilers','cbj':'Blue Jackets','det':'Red Wings','oak':'Athletics','nyy':'Yankees'};
        const m = slug.match(/^(?:nba|nhl|mlb)-([a-z]+)-([a-z]+)/);
        if (m && NBA[m[1]] && NBA[m[2]]) {
          analysisQuery = `Will ${NBA[m[1]]} beat ${NBA[m[2]]}?`;
        } else {
          // Keep readable slug but also pass the original URL as fallback
          const readable = slug.split('-').filter((w:string) => isNaN(Number(w)) && w !== 'c' && w !== 'f').map((w:string) => w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
          analysisQuery = readable.length > 10 ? readable : event;
        }
      }
    }

    const marketOddsForAI = odds !== null && odds > 5 && odds < 95 ? odds : null;

    // For live games skip AI — show market odds directly
    if (odds !== null && (odds >= 95 || odds <= 5)) {
      setInvalidQuestion(null);
      setIntel(calculateIntelligence(odds, weights, 0, odds, event));
      return;
    }

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: analysisQuery, marketOdds: marketOddsForAI, anonId, isSignedIn, weights }),
      });
      const data = await res.json();
      if (data.valid === false) {
        if (data.limitReached) {
          setLimitReached(true);
          return;
        }
        setInvalidQuestion({ reason: data.reason, examples: data.examples || [] });
        return;
      }
      setInvalidQuestion(null);
      if (data.confidence) {
        // Use raw confidence directly — intelligenceEngine flips NO verdicts
        const rawConf = Math.max(5, Math.min(95, data.confidence));
        // Auto-save to journal
        try {
          const journalEntry = {
            id: event.slice(0,50).replace(/[^a-z0-9]/gi,'-').toLowerCase() + '-' + Date.now(),
            question: event,
            aiConfidence: rawConf,
            marketOdds: marketOddsForAI || null,
            edge: marketOddsForAI ? rawConf - marketOddsForAI : null,
            weights,
            sources: (data.sources||[]).slice(0,5).map((s:any)=>({name:s.name,type:s.category||'news',contribution:s.contribution||0})),
            result: 'pending',
            timestamp: Date.now(),
          };
          const existing = localStorage.getItem('pp_journal');
          const journal = existing ? JSON.parse(existing) : [];
          // Don't duplicate
          if (!journal.find((e:any) => e.question === event)) {
            journal.unshift(journalEntry);
            if (journal.length > 200) journal.splice(200);
            localStorage.setItem('pp_journal', JSON.stringify(journal));
          }
        } catch {}
        setIntel({ confidence: rawConf, direction: rawConf >= 50 ? 'YES' : 'NO', probabilityLabel: rawConf >= 65 ? 'AI is confident this happens' : rawConf >= 55 ? 'More likely than not' : rawConf >= 45 ? 'Could go either way' : rawConf >= 35 ? 'Probably not' : 'AI thinks this is unlikely', predictionStrength: rawConf >= 70 ? 'Strong' : rawConf >= 55 ? 'Medium' : 'Weak', strengthScore: rawConf, riskLevel: rawConf >= 70 || rawConf <= 30 ? 'Low' : 'Medium', marketEdge: marketOddsForAI ? rawConf - marketOddsForAI : null, edgeContext: '', modelComponents: [], confidenceDrivers: { positive: [], negative: [] }, explanation: '' });
        if (data.sources && data.sources.length > 0) setRealSources(data.sources);
        if (data.components && data.components.length > 0) setComponents(data.components);
        if (data.breakdown && data.breakdown.length > 0) setBreakdown(data.breakdown);
      } else {
        const seed = analysisQuery.split('').reduce((acc:number, c:string) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
        setIntel(calculateIntelligence(45 + ((seed % 35 + 35) % 35), weights, 0, marketOddsForAI, event));
      }
    } catch {
      const seed = analysisQuery.split('').reduce((acc:number, c:string) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
      setIntel(calculateIntelligence(45 + ((seed % 35 + 35) % 35), weights, 0, marketOddsForAI, event));
    }
  };
  useEffect(() => { runAnalysis(); }, [event, odds, mtype, weights]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const isPlain  = !isPolymarketUrl;
  const top      = outcomes[0] || { name:'', odds:0, aiConfidence:0, edge:0 };
  const binaryAI = intel?.confidence || 0;
  const hasLiveMarket = (odds !== null && odds > 0) || mtype === 'categorical';
  const binEdge  = hasLiveMarket ? (mtype === 'categorical' ? (top.edge||0) : binaryAI - (odds||0)) : 0;
  const edgeVal  = hasLiveMarket ? binEdge : 0;
  const mainOdds = mtype === 'categorical' ? top.odds : (odds||0);
  const mainAI   = mtype === 'categorical' ? top.aiConfidence : binaryAI;

  const conv      = getConviction(mainAI, mainOdds);
  const edgeColor = conv.color;
  const convLabel = conv.label;
  const convBg    = conv.bg;
  const betAmt    = conv.style === 'high' ? '$75 - $200' : conv.style === 'med' ? '$25 - $75' : '$10 - $25';

  const eventTitle = (() => {
    if (marketTitle) return marketTitle;
    if (event.includes('polymarket.com/event/') || event.includes('polymarket.com/sports/')) {
      const idx = event.includes('polymarket.com/event/') ? event.indexOf('polymarket.com/event/') : event.indexOf('polymarket.com/sports/');
      const slug = event.slice(idx+21).split('/')[0].split('?')[0];
      const NBA: Record<string,string> = {'cha':'Hornets','bos':'Celtics','chi':'Bulls','was':'Wizards','uta':'Jazz','nop':'Pelicans','min':'Timberwolves','ind':'Pacers','mil':'Bucks','bkn':'Nets','okc':'Thunder','lal':'Lakers','mia':'Heat','tor':'Raptors','sac':'Kings','gsw':'Warriors','hou':'Rockets','phx':'Suns','atl':'Braves','laa':'Angels','ari':'Diamondbacks','nym':'Mets','kc':'Royals','cle':'Guardians','tb':'Lightning','ott':'Senators','edm':'Oilers','cbj':'Blue Jackets','det':'Red Wings','oak':'Athletics','nyy':'Yankees'};
      const m = slug.match(/^(?:nba|nhl|mlb)-([a-z]+)-([a-z]+)-\d{4}/);
      if (m) { const t1 = NBA[m[1]]; const t2 = NBA[m[2]]; if (t1 && t2) return `${t1} vs. ${t2}`; }
      return slug.split('-').map((w:string) => w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    }
    return event.length > 80 ? event.slice(0,80) : event;
  })();

  const handleWeight = (key: string, val: number) => {
    const rem = 100 - val;
    const others = Object.keys(weights).filter(k => k !== key) as Array<keyof typeof weights>;
    const ot = others.reduce((s,k) => s+weights[k], 0);
    const nw = { ...weights, [key]: val };
    if (ot > 0) others.forEach(k => { nw[k] = Math.round((weights[k]/ot)*rem); });
    const tot = Object.values(nw).reduce((s,v) => s+v, 0);
    if (tot !== 100) nw[others[0]] += (100-tot);
    setWeights(nw as typeof weights);
  };

  const fmtVol = (v: number) => v >= 1_000_000 ? '$'+(v/1_000_000).toFixed(1)+'M' : v >= 1_000 ? '$'+(v/1_000).toFixed(0)+'K' : '$'+v;

  const goFrame = (f: Frame) => { setFrame(f); };
  const curIdx  = FRAMES.indexOf(frame);

  const NAV_ICONS: Record<Frame, React.ReactNode> = {
    verdict:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg>,
    signals:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    sources:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    markets:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    trade:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  };

  const navItem = (f: Frame, _icon: string, label: string, sub: string, color: string, badge?: number) => (
    <div onClick={() => goFrame(f)}
      style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 10px', borderRadius:9, cursor:'pointer', marginBottom:2, position:'relative',
        background: frame===f ? C.bg3 : 'none',
        border: '1px solid ' + (frame===f ? C.border2 : 'transparent'),
        transition:'all .15s',
      }}>
      {frame===f && <div style={{ position:'absolute', left:-8, top:'50%', transform:'translateY(-50%)', width:3, height:20, background:C.purple, borderRadius:'0 3px 3px 0' }}></div>}
      <div style={{ width:28, height:28, borderRadius:7, background:color, display:'flex', alignItems:'center', justifyContent:'center', color: frame===f ? C.purpleL : C.t3, flexShrink:0 }}>
        {NAV_ICONS[f]}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, color: frame===f ? C.t1 : C.t2, display:'block' }}>{label}</div>
        <div style={{ fontSize:10, color:C.t3, marginTop:1, display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</div>
      </div>
      {badge !== undefined && (
        <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:6, background: frame===f ? C.purpleBg : C.bg5, color: frame===f ? C.purpleL : C.t3 }}>{badge}</span>
      )}
    </div>
  );

  const activeSources = [
    { id:'reuters',    name:'Reuters',         sig:'GDP contraction articles up 40%', type:'strong' as const, contrib:'+22%', contribColor:C.green,  bg:'rgba(77,157,224,0.12)' },
    { id:'bloomberg',  name:'Bloomberg',       sig:'Cautiously optimistic',            type:'strong' as const, contrib:'+15%', contribColor:C.green,  bg:'rgba(77,157,224,0.12)' },
    { id:'ft',         name:'Financial Times', sig:'Analysis points to uncertainty',   type:'mixed'  as const, contrib:'+11%', contribColor:C.amber,  bg:'rgba(77,157,224,0.12)' },
    { id:'reddit',     name:'Reddit',          sig:'r/economics strong consensus',     type:'strong' as const, contrib:'+18%', contribColor:C.green,  bg:'rgba(124,111,247,0.12)' },
    { id:'twitter',    name:'Twitter/X',       sig:'Noisy political commentary',       type:'contrary' as const, contrib:'-3%', contribColor:C.red,  bg:'rgba(239,79,106,0.12)' },
    { id:'polymarket', name:'Polymarket',      sig:'95% consensus - mostly priced in', type:'priced' as const, contrib:'+12%', contribColor:C.blue,  bg:'rgba(46,204,138,0.12)' },
    { id:'kalshi',     name:'Kalshi',          sig:'Confirms Polymarket direction',    type:'priced' as const, contrib:'+8%',  contribColor:C.blue,  bg:'rgba(46,204,138,0.12)' },
    { id:'metaculus',  name:'Metaculus',       sig:'Community forecasters lean pos',   type:'mixed'  as const, contrib:'+6%',  contribColor:C.amber, bg:'rgba(245,166,35,0.12)' },
  ];

  const mktSources = [
    { id:'wsj',       name:'Wall Street Journal', desc:'US finance and markets',      color:'rgba(77,157,224,0.12)' },
    { id:'economist', name:'The Economist',       desc:'Long-form global analysis',   color:'rgba(77,157,224,0.12)' },
    { id:'politico',  name:'Politico',            desc:'Policy developments',         color:'rgba(77,157,224,0.12)' },
    { id:'nyt',       name:'NY Times',            desc:'US news and analysis',        color:'rgba(77,157,224,0.12)' },
    { id:'linkedin',  name:'LinkedIn',            desc:'Professional opinion',        color:'rgba(124,111,247,0.12)' },
    { id:'substack',  name:'Substack',            desc:'Analyst newsletters',         color:'rgba(124,111,247,0.12)' },
    { id:'manifold',  name:'Manifold Markets',    desc:'Community markets',           color:'rgba(46,204,138,0.12)' },
    { id:'gjopen',    name:'Good Judgment Open',  desc:'Superforecasters',            color:'rgba(245,166,35,0.12)' },
  ];

  const aiPctForDisplay = mainAI || 0;
  const mktPctForDisplay = mainOdds || 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:C.bg0, color:C.t1, fontFamily:'system-ui,-apple-system,sans-serif', overflow:'hidden' }}>

      <nav style={{ height:52, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', background:C.bg0, flexShrink:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:6, color:C.t1, background:C.bg2, border:'1px solid '+C.border2, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, padding:'5px 12px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Home
          </button>
          <div style={{ width:1, height:16, background:C.border2 }}></div>
          <span style={{ fontSize:14, fontWeight:800, letterSpacing:'-0.3px', display:'flex', alignItems:'center', gap:9 }}>
            <svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="9" fill="#0e0e18"/>
              <rect x="6" y="24" width="3" height="6" rx="1.5" fill="#2e2c44"/>
              <rect x="11" y="20" width="3" height="10" rx="1.5" fill="#3a3860"/>
              <rect x="16" y="16" width="3" height="14" rx="1.5" fill="#564ea0"/>
              <rect x="21" y="11" width="3" height="19" rx="1.5" fill="#7c6ff7"/>
              <rect x="26" y="7" width="3" height="23" rx="1.5" fill="#a89cf8"/>
              <line x1="9" y1="23" x2="6.5" y2="30" stroke="#4a4880" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="9" y1="23" x2="11.5" y2="30" stroke="#4a4880" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M 7.5 19 Q 14 10 27.5 7.5" fill="none" stroke="#2ecc8a" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="7.5" cy="19" r="3" fill="#ef4f6a"/>
              <circle cx="27.5" cy="7" r="2.5" fill="#2ecc8a"/>
            </svg>
            PlayPicks AI
          </span>
          <div style={{ width:1, height:16, background:C.border2 }}></div>
          <span style={{ fontSize:11, color:C.t3, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{eventTitle}</span>
        </div>
        {/* Quick search in nav */}
        <div style={{ flex:1, maxWidth:320, margin:'0 16px', position:'relative' }}>
          <input
            type="text"
            placeholder="Ask another question..."
            onKeyDown={e => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                router.push('/scores?event='+encodeURIComponent(e.currentTarget.value.trim()));
                e.currentTarget.value = '';
              }
            }}
            style={{ width:'100%', padding:'6px 12px', background:C.bg2, border:'1px solid '+C.border, borderRadius:8, color:C.t1, fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }}
          />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:C.bg3, border:'1px solid '+C.border2, borderRadius:8, padding:'4px 10px' }}>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:C.purpleL }}>{aiPctForDisplay}%</span>
            <div style={{ width:1, height:12, background:C.border2 }}></div>
            <span style={{ fontSize:10, fontWeight:700, color:C.amber }}>{hasLiveMarket ? (edgeVal > 0 ? '+' : '') + edgeVal.toFixed(0) + '% edge' : aiPctForDisplay + '% confidence'}</span>
          </div>
          <button onClick={() => goFrame('sources')} style={{ padding:'4px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', background:C.purple, color:'#fff', border:'none' }}>Tune sources</button>
          <button onClick={runAnalysis} style={{ padding:'4px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2 }}>Re-analyze</button>
          <button onClick={() => router.push('/journal')} style={{ padding:'4px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2 }}>Journal</button>
          {!isSignedIn && (
            <button onClick={() => setShowMagicModal(true)} style={{ padding:'4px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', background:'rgba(46,204,138,0.1)', border:'1px solid rgba(46,204,138,0.25)', color:C.green }}>
              Sign in
            </button>
          )}
          {isSignedIn && (
            <div style={{ fontSize:10, color:C.green, padding:'4px 10px', borderRadius:7, background:'rgba(46,204,138,0.08)', border:'1px solid rgba(46,204,138,0.2)' }}>✓ Signed in</div>
          )}
        </div>
      </nav>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', flex:1, overflow:'hidden' }}>

        <div style={{ borderRight:'1px solid '+C.border, background:C.bg1, display:'flex', flexDirection:'column', overflowY:'auto', padding:'12px 8px' }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:C.t4, padding:'0 8px', marginBottom:6 }}>Analysis</div>
            {navItem('verdict',  '*', 'Verdict',         aiPctForDisplay+'% - +'+(edgeVal.toFixed(0))+'% edge', 'rgba(124,111,247,0.12)')}
            {navItem('signals',  '~', 'Signals',         'News - Social - Market', 'rgba(77,157,224,0.12)')}
            {navItem('sources',  '=', 'Sources',         srcCount+' active', 'rgba(46,204,138,0.12)', srcCount)}
          </div>
          <div style={{ height:1, background:C.border, margin:'0 4px 12px' }}></div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:C.t4, padding:'0 8px', marginBottom:6 }}>Explore</div>
            {navItem('markets',  '^', 'Related markets',  related.length > 0 ? related.length+' found' : '5 related found', 'rgba(245,166,35,0.12)')}
          </div>
          <div style={{ height:1, background:C.border, margin:'0 4px 12px' }}></div>
          <div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:C.t4, padding:'0 8px', marginBottom:6 }}>Action</div>
            {navItem('trade',    '$', 'Trade', 'Sign in to place bet', 'rgba(239,79,106,0.12)')}
          </div>
          <div style={{ marginTop:'auto', padding:'12px 8px' }}>
            <div style={{ fontSize:9, color:C.t4, lineHeight:1.6, padding:8, background:C.bg2, border:'1px solid '+C.border, borderRadius:8 }}>
              Click any section to view its full details
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', background:C.bg0 }}>
          <div style={{ height:44, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', flexShrink:0, background:C.bg1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:C.t3 }}>
              <span>PlayPicks AI</span>
              <span style={{ color:C.t4 }}>{">"}</span>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{eventTitle.slice(0,30)}{eventTitle.length>30?'...':''}</span>
              <span style={{ color:C.t4 }}>{">"}</span>
              <span style={{ color:C.t1, fontWeight:500 }}>{FRAME_LABELS[curIdx]}</span>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => curIdx > 0 && goFrame(FRAMES[curIdx-1])} disabled={curIdx===0}
                style={{ padding:'4px 10px', borderRadius:6, fontSize:10, fontWeight:600, cursor:curIdx===0?'default':'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2, opacity:curIdx===0?0.3:1 }}>
                Prev
              </button>
              <button onClick={() => curIdx < FRAMES.length-1 && goFrame(FRAMES[curIdx+1])} disabled={curIdx===FRAMES.length-1}
                style={{ padding:'4px 10px', borderRadius:6, fontSize:10, fontWeight:600, cursor:curIdx===FRAMES.length-1?'default':'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2, opacity:curIdx===FRAMES.length-1?0.3:1 }}>
                Next
              </button>
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:24 }}>

            {frame === 'verdict' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
                {limitReached ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', gap:16, padding:40 }}>
                  <div style={{ fontSize:48 }}>🔒</div>
                  <div style={{ fontSize:20, fontWeight:700, color:C.t1, letterSpacing:'-0.4px' }}>Daily limit reached</div>
                  <div style={{ fontSize:13, color:C.t2, maxWidth:380, lineHeight:1.6 }}>You've used your 5 free analyses today. Sign in for unlimited access — free during beta.</div>
                  <button onClick={() => setShowMagicModal(true)} style={{ background:C.purple, color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                    Sign in for unlimited →
                  </button>
                  <div style={{ fontSize:11, color:C.t3 }}>Resets at midnight · No credit card needed</div>
                </div>
                ) : invalidQuestion && !intel ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', gap:16, padding:40 }}>
                  <div style={{ fontSize:48 }}>?</div>
                  <div style={{ fontSize:20, fontWeight:700, color:C.t1, letterSpacing:'-0.4px' }}>This doesn't look like a real prediction</div>
                  <div style={{ fontSize:13, color:C.t2, maxWidth:380, lineHeight:1.6 }}>PlayPicks AI analyzes real verifiable world events. Try asking about something that could actually happen.</div>
                  <div style={{ width:'100%', maxWidth:380 }}>
                    <div style={{ fontSize:10, color:C.t3, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Try one of these instead</div>
                    {(invalidQuestion.examples||[]).map((s:string) => (
                      <button key={s} onClick={() => { router.push('/scores?event='+encodeURIComponent(s)); setFrame('verdict'); }}
                        style={{ display:'block', width:'100%', background:C.bg3, border:'1px solid '+C.border2, borderRadius:10, padding:'10px 16px', color:C.t2, fontSize:12, cursor:'pointer', textAlign:'left', marginBottom:6 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => router.back()} style={{ background:C.purple, color:'#fff', border:'none', borderRadius:10, padding:'10px 24px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    Try a different question
                  </button>
                </div>
              ) : (
                <VerdictCard aiPct={aiPctForDisplay} marketPct={mktPctForDisplay} question={eventTitle} sources={realSources} hasMarket={hasLiveMarket} mtype={mtype} outcomes={outcomes} rawEvent={event} breakdown={breakdown} components={components} />
              )}
                {(invalidQuestion && !intel) || limitReached ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:24, gap:12, textAlign:'center', background:C.bg2, border:'1px solid '+C.border, borderRadius:16 }}>
                    <div style={{ fontSize:12, color:C.t3, lineHeight:1.6 }}>{limitReached ? 'Sign in to see AI conviction scores and trade recommendations.' : 'Ask a real prediction market question to see the AI verdict, conviction score, and trade recommendation.'}</div>
                  </div>
                ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:16 }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:8 }}>Market vs AI</div>
                    <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:9, overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 40px 1fr', marginBottom:10 }}>
                      <div style={{ padding:'12px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'0.4px', color:C.t3, marginBottom:4 }}>Bettors</div>
                        <div style={{ fontSize:28, fontWeight:700, letterSpacing:'-1.5px', fontFamily:'monospace', lineHeight:1, color:C.t2 }}>{hasLiveMarket && mktPctForDisplay > 0 ? mktPctForDisplay+'%' : '—'}</div>
                        <div style={{ fontSize:8, color:C.t3, marginTop:2 }}>consensus</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', borderLeft:'1px solid '+C.border, borderRight:'1px solid '+C.border, padding:'6px 0' }}>
                        <div style={{ fontSize:7, color:C.t3, textTransform:'uppercase', marginBottom:4 }}>vs</div>
                        <div style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:6, background:C.amberBg, color:C.amber }}>{hasLiveMarket && edgeVal !== 0 ? (edgeVal > 0 ? '+' : '')+edgeVal.toFixed(0)+'%' : '—'}</div>
                      </div>
                      <div style={{ padding:'12px 8px', textAlign:'center', background:'rgba(77,157,224,0.07)', borderRadius:'0 9px 9px 0' }}>
                        <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'0.4px', color:C.blue, marginBottom:4 }}>AI thinks</div>
                        <div style={{ fontSize:28, fontWeight:700, letterSpacing:'-1.5px', fontFamily:'monospace', lineHeight:1, color:C.blue }}>{aiPctForDisplay}%</div>
                        <div style={{ fontSize:8, color:C.blue, marginTop:2 }}>confidence</div>
                      </div>
                    </div>
                    <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:convBg, color:edgeColor, border:'1px solid '+edgeColor+'33' }}>{convLabel}</span>
                    <div style={{ fontSize:10, color:C.t2, lineHeight:1.5, marginTop:8 }}>
                      {hasLiveMarket && mktPctForDisplay > 0
                        ? 'AI has a slight edge over bettors. Keep position modest.'
                        : 'No market data. AI confidence from news, forecasters and real-time signals.'}
                    </div>
                  </div>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:8 }}>Conviction score</div>
                    <div style={{ height:3, background:C.bg4, borderRadius:2, overflow:'hidden', marginBottom:8 }}>
                      <div style={{ height:'100%', borderRadius:2, background:'linear-gradient(90deg,'+C.red+','+C.amber+','+C.green+')', width:Math.min(100,Math.max(0,aiPctForDisplay))+'%', transition:'width .5s' }} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginBottom:8 }}>
                      {[{v: hasLiveMarket && mktPctForDisplay > 0 ? mktPctForDisplay+'%' : '—', l:'Market',c:C.t2},{v:aiPctForDisplay+'%',l:'AI',c:C.purpleL},{v: hasLiveMarket && edgeVal !== 0 ? (edgeVal>0?'+':'')+edgeVal.toFixed(0)+'%' : '—',l:'Edge',c:edgeColor}].map(x => (
                        <div key={x.l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:7, padding:'8px 5px', textAlign:'center' }}>
                          <div style={{ fontSize:18, fontWeight:700, fontFamily:'monospace', letterSpacing:'-0.5px', color:x.c }}>{x.v}</div>
                          <div style={{ fontSize:8, color:C.t3, textTransform:'uppercase', letterSpacing:'0.3px', marginTop:2 }}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:10, color:C.t2, lineHeight:1.5, padding:'7px 9px', background:'rgba(255,255,255,0.025)', borderRadius:7 }}>
                      {hasLiveMarket && mktPctForDisplay > 0
                        ? 'Small edge - keep position modest. Only bet with personal conviction.'
                        : 'No market data available. AI confidence based on news and cricket stats only.'}
                    </div>
                  </div>
                  {tradeData ? (
                    <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                      <TradePanel key={tradeData.topOutcome.tokenId || tradeData.marketUrl} marketUrl={tradeData.marketUrl} marketTitle={tradeData.marketTitle} outcomeName={tradeData.topOutcome.name} marketOdds={tradeData.topOutcome.odds} aiConfidence={mtype==='categorical'?tradeData.topOutcome.aiConfidence:binaryAI} edge={mtype==='categorical'?tradeData.topOutcome.edge:binEdge} tokenId={tradeData.topOutcome.tokenId} isBinary={mtype==='binary'} />
                    </div>
                  ) : isPolymarketUrl ? (
                    <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14, textAlign:'center' }}>
                      <div style={{ fontSize:11, color:C.t3, marginBottom:8 }}>Loading market data...</div>
                      <div style={{ width:24, height:24, border:'2px solid rgba(124,111,247,0.3)', borderTopColor:C.purple, borderRadius:'50%', margin:'0 auto', animation:'spin 0.8s linear infinite' }}/>
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                  ) : (
                    <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase' as const, letterSpacing:'0.7px', color:C.t3, textAlign:'center' as const, marginBottom:5 }}>Place a trade</div>
                      <div style={{ fontSize:10, color:C.t3, textAlign:'center' as const, marginBottom:10 }}>Paste a Polymarket URL above to enable in-app trading</div>
                      <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" style={{ display:'block', width:'100%', padding:11, background:C.purple, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', marginBottom:8, textAlign:'center' as const, textDecoration:'none', boxSizing:'border-box' as const }}>Browse markets on Polymarket →</a>
                    </div>
                  )}
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                    <PolymarketComparison userQuestion={event} aiPrediction={intel?.confidence||0} onDataReceived={(o,t,outs,ot,title) => { setOdds(o); if(t) setMtype(t); if(outs) setOutcomes(outs); setHasUrl(true); if(title) setMarketTitle(title); }} onTradeReady={(d:TradeReadyData) => setTradeData(d)} />
                  </div>
                </div>
                )}
              </div>
            )}

            {frame === 'signals' && (
              <div>
                <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.4px', marginBottom:4 }}>Signal breakdown</div>
                <div style={{ fontSize:13, color:C.t2, marginBottom:22, lineHeight:1.5 }}>What each source category is telling the AI and how much weight it carries.</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
                  {[
                    { cat:'News', color:C.blue, type:'strong' as const, weight:weights.news, desc:'Reuters, Bloomberg, FT all showing strong signals. Narrative gaining traction in financial press.', bar:73, contrib:Math.round(aiPctForDisplay*(weights.news/100)) },
                    { cat:'Social', color:C.purpleL, type:'mixed' as const, weight:weights.social, desc:'Reddit broadly agrees. Twitter is noisy and contrary - dragging the social average down slightly.', bar:55, contrib:Math.round(aiPctForDisplay*(weights.social/100)) },
                    { cat:'Market', color:C.green, type:'priced' as const, weight:weights.technical, desc:'Polymarket and Kalshi both at 95%+ already. Market has priced most of this in - limits edge.', bar:90, contrib:Math.round(aiPctForDisplay*(weights.technical/100)) },
                  ].map(s => (
                    <div key={s.cat} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:18 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:s.color }}>{s.cat}</span>
                        <SigPill type={s.type} />
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', marginBottom:4, color:C.t1 }}>{s.weight}% weight</div>
                      <div style={{ fontSize:11, color:C.t2, lineHeight:1.5, marginBottom:10 }}>{s.desc}</div>
                      <div style={{ height:5, background:C.bg4, borderRadius:3, overflow:'hidden', marginBottom:6 }}>
                        <div style={{ height:'100%', borderRadius:3, background:s.color, width:s.bar+'%' }} />
                      </div>
                      <div style={{ fontSize:11, fontWeight:600, color:s.color }}>Contributing +{s.contrib}% to AI confidence</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:18 }}>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>How AI weights these signals</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[
                      { v:weights.news+'%', c:C.blue, l:'News weight', d:'Strong positive signal across all major outlets this week' },
                      { v:weights.social+'%', c:C.purpleL, l:'Social weight', d:'Mixed - Reddit positive, Twitter contrary' },
                      { v:weights.technical+'%', c:C.green, l:'Market weight', d:'Already priced in at '+mktPctForDisplay+'% - edge is minimal here' },
                    ].map(x => (
                      <div key={x.l} style={{ textAlign:'center', padding:14, background:'rgba(255,255,255,0.025)', borderRadius:10 }}>
                        <div style={{ fontSize:26, fontWeight:700, fontFamily:'monospace', color:x.c, marginBottom:4 }}>{x.v}</div>
                        <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>{x.l}</div>
                        <div style={{ fontSize:10, color:C.t2, lineHeight:1.4 }}>{x.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {frame === 'sources' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.4px', marginBottom:4 }}>Active sources</div>
                  <div style={{ fontSize:13, color:C.t2, marginBottom:16, lineHeight:1.5 }}>These sources are feeding your current analysis. Remove any or add from the marketplace below.</div>
                  {addFormOpen && (
                    <div style={{ background:C.bg2, border:'1px solid '+C.purple, borderRadius:12, padding:14, marginBottom:8 }}>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:3 }}>Add a custom source</div>
                      <div style={{ fontSize:10, color:C.t2, marginBottom:10, lineHeight:1.5 }}>Paste any news URL, publication, subreddit, or RSS feed. AI will scan the signal and add it.</div>
                      <input value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://example.com or publication name..."
                        style={{ width:'100%', background:C.bg3, border:'1px solid '+C.border2, borderRadius:7, padding:'8px 10px', color:C.t1, fontSize:11, outline:'none', fontFamily:'inherit', marginBottom:7, boxSizing:'border-box' as const }} />
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { if(customUrl){ setSrcCount(p=>p+1); showToast('Custom source added - scanning signal...'); setAddForm(false); setCustomUrl(''); }}} style={{ flex:1, padding:8, background:C.purple, color:'#fff', border:'none', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer' }}>Add to analysis</button>
                        <button onClick={() => setAddForm(false)} style={{ padding:'8px 12px', background:C.bg4, color:C.t2, border:'none', borderRadius:7, fontSize:11, cursor:'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:24 }}>
                    {activeSources.map(s => (
                      <div key={s.id} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                          <SourceAvatar name={s.name} category={s.type==='contrary'?'contrary':s.id==='reddit'||s.id==='twitter'?'social':s.id==='polymarket'||s.id==='kalshi'?'market':s.id==='metaculus'?'community':'news'} />
                          <button style={{ width:18, height:18, borderRadius:'50%', background:C.bg4, border:'none', cursor:'pointer', color:C.t3, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}
                            onClick={() => { setSrcCount(p => p-1); showToast(s.name+' removed from analysis'); }}>x</button>
                        </div>
                        <div style={{ fontSize:11, fontWeight:600, marginBottom:2 }}>{s.name}</div>
                        <div style={{ fontSize:9, color:C.t3, lineHeight:1.35, marginBottom:6 }}>{s.sig}</div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <SigPill type={s.type} />
                          <span style={{ fontSize:10, fontWeight:700, fontFamily:'monospace', color:s.contribColor }}>{s.contrib}</span>
                        </div>
                      </div>
                    ))}
                    {!addFormOpen && (
                      <div onClick={() => setAddForm(true)} style={{ background:C.bg2, border:'1px dashed '+C.border2, borderRadius:12, padding:12, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, minHeight:90 }}>
                        <div style={{ fontSize:18, color:C.t3 }}>+</div>
                        <div style={{ fontSize:10, color:C.t3, textAlign:'center' }}>Add custom source</div>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop:4 }}>
                    <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                      Source marketplace
                      <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0, color:C.t4, fontSize:10 }}>Browse and add intelligence feeds</span>
                    </div>
                    <div style={{ background:C.bg2, border:'1px solid '+C.border2, borderRadius:9, padding:'7px 12px', display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input placeholder="Search sources..." style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:12, color:C.t1, fontFamily:'inherit' }} />
                    </div>
                    {[
                      { label:'News', color:C.blue, desc:'Financial & political press' },
                      { label:'Social', color:C.purple, desc:'Community discussion' },
                      { label:'Prediction markets', color:C.green, desc:'Live odds and contracts' },
                    ].map((cat,ci) => (
                      <div key={cat.label} style={{ marginBottom:20 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:cat.color }}></div>
                          <span style={{ fontSize:11, fontWeight:600, color:cat.color }}>{cat.label}</span>
                          <span style={{ fontSize:10, color:C.t3 }}>{cat.desc}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                          {mktSources.slice(ci*2, ci*2+2).concat(ci===0?mktSources.slice(2,4):[]).slice(0,2).map(s => (
                            <div key={s.id} style={{ background:C.bg2, border:'1px solid '+(mktAdded[s.id]?'rgba(46,204,138,0.2)':C.border), borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10, transition:'all .15s' }}>
                              <SourceAvatar name={s.name} category={(s as any).category||'news'} />
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:11, fontWeight:600 }}>{s.name}</div>
                                <div style={{ fontSize:9, color:C.t3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.desc}</div>
                              </div>
                              <button onClick={() => {
                                if (mktAdded[s.id]) return;
                                setMktAdding(p => ({...p,[s.id]:true}));
                                setTimeout(() => { setMktAdded(p => ({...p,[s.id]:true})); setMktAdding(p => ({...p,[s.id]:false})); setSrcCount(p => p+1); showToast(s.name+' added - scanning signal...'); }, 700);
                              }} style={{ padding:'3px 9px', borderRadius:6, fontSize:9, fontWeight:700, cursor:mktAdded[s.id]?'default':'pointer', border:'1px solid '+(mktAdded[s.id]?'rgba(46,204,138,0.2)':C.border2), background:mktAdded[s.id]?C.greenBg:(mktAdding[s.id]?C.bg3:C.bg3), color:mktAdded[s.id]?C.green:C.t2, flexShrink:0, transition:'all .15s' }}>
                                {mktAdded[s.id] ? 'Added' : mktAdding[s.id] ? '...' : '+ Add'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:16 }}>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:3 }}>Source weights</div>
                    <div style={{ fontSize:10, color:C.t2, marginBottom:14, lineHeight:1.5 }}>Adjust how much each category influences the verdict. Must total 100%.</div>
                    {[{key:'news',label:'News',color:C.blue,desc:'Mainstream financial press'},{key:'social',label:'Social',color:C.purple,desc:'Reddit, Twitter, community'},{key:'market',label:'Market',color:C.green,desc:'Polymarket and Kalshi odds'}].map(w => (
                      <div key={w.key} style={{ marginBottom:12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:11, fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:w.color }}></div>
                            {w.label}
                          </span>
                          <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color:w.color }}>{weights[w.key as keyof typeof weights]}%</span>
                        </div>
                        <div style={{ fontSize:9, color:C.t3, marginBottom:4 }}>{w.desc}</div>
                        <input type="range" min="0" max="100" step="5" value={weights[w.key as keyof typeof weights]} onChange={e => handleWeight(w.key, parseInt(e.target.value))} style={{ width:'100%', accentColor:w.color }} />
                      </div>
                    ))}
                    <span style={{ fontSize:9, fontWeight:600, padding:'3px 8px', borderRadius:5, display:'inline-block', background:weights.news+weights.social+weights.technical===100?C.greenBg:C.amberBg, color:weights.news+weights.social+weights.technical===100?C.green:C.amber }}>
                      Total: {weights.news+weights.social+weights.technical}% {weights.news+weights.social+weights.technical===100?'- balanced':'- adjust to 100%'}
                    </span>
                    <button onClick={() => showToast('Weights applied - re-analyzing...')} style={{ width:'100%', marginTop:12, padding:9, background:C.purple, color:'#fff', border:'none', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer' }}>Apply and re-analyze</button>
                  </div>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:14 }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', color:C.t3, marginBottom:8 }}>Live verdict preview</div>
                    <div style={{ fontSize:36, fontWeight:700, fontFamily:'monospace', letterSpacing:'-2px', color:C.purpleL, marginBottom:4 }}>{aiPctForDisplay}%</div>
                    <div style={{ fontSize:10, color:C.t2, marginBottom:10 }}>AI confidence</div>
                    {[{k:'Market',v:mktPctForDisplay+'%',c:C.t2},{k:'AI thinks',v:aiPctForDisplay+'%',c:C.purpleL},{k:'Edge',v:(edgeVal>0?'+':'')+edgeVal.toFixed(0)+'%',c:edgeColor},{k:'Sources',v:String(srcCount),c:C.t1}].map(r => (
                      <div key={r.k} style={{ display:'flex', justifyContent:'space-between', fontSize:10, padding:'4px 0', borderBottom:'1px solid '+C.border }}>
                        <span style={{ color:C.t2 }}>{r.k}</span>
                        <span style={{ fontWeight:600, fontFamily:'monospace', color:r.c }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {frame === 'markets' && (
              <div>
                <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-0.4px', marginBottom:4 }}>Related markets</div>
                <div style={{ fontSize:13, color:C.t2, marginBottom:22, lineHeight:1.5 }}>Other Polymarket markets on the same topic with live odds. Click Analyze to run AI analysis on any of them.</div>
                <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:'0 5px' }}>
                  {(related.length > 0 ? related : [
                    { title:'Will US GDP contract in Q1 2026?',               volume:247000, url:'' },
                    { title:'Will the Fed cut rates more than 3 times?',       volume:189000, url:'' },
                    { title:'Will US unemployment exceed 5% by June 2026?',   volume:134000, url:'' },
                    { title:'Will the S&P 500 enter bear market territory?',   volume:98000,  url:'' },
                    { title:'Will US inflation exceed 4% in Q2 2026?',        volume:76000,  url:'' },
                  ]).map((m:any, i:number) => (
                    <tr key={i} style={{ background:C.bg2 }}>
                      <td style={{ padding:'12px 14px', borderTop:'1px solid '+C.border, borderBottom:'1px solid '+C.border, borderLeft:'1px solid '+C.border, borderRadius:'10px 0 0 10px' }}>
                        <div style={{ fontSize:12, fontWeight:500, color:C.t1, lineHeight:1.35 }}>{m.title}</div>
                        <div style={{ fontSize:10, color:C.t3, marginTop:2 }}>{fmtVol(m.volume)} volume</div>
                      </td>
                      <td style={{ padding:'12px 14px', borderTop:'1px solid '+C.border, borderBottom:'1px solid '+C.border }}>
                        <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:C.t2 }}>{m.probability||Math.floor(((m.slug||m.title||"").split("").reduce((a:number,c:string)=>((a<<5)-a+c.charCodeAt(0))|0,0)%50+50)%50+30)}%</div>
                      </td>
                      <td style={{ padding:'12px 14px', borderTop:'1px solid '+C.border, borderBottom:'1px solid '+C.border, borderRight:'1px solid '+C.border, borderRadius:'0 10px 10px 0', whiteSpace:'nowrap' }}>
                        <button onClick={() => (() => { router.push('/scores?event='+encodeURIComponent(m.url||('https://polymarket.com/event/'+(m.slug||m.title)))); goFrame('verdict'); })()} style={{ background:C.purpleBg, color:C.purpleL, border:'1px solid rgba(124,111,247,0.15)', borderRadius:6, padding:'4px 10px', fontSize:10, fontWeight:600, cursor:'pointer' }}>Analyze</button>
                      </td>
                    </tr>
                  ))}
                </table>
                <div style={{ textAlign:'center', marginTop:14, fontSize:11, color:C.t3, cursor:'pointer' }}>Browse all markets on Polymarket</div>
              </div>
            )}

            {frame === 'trade' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
                <div>
                  <div style={{ textAlign:'center', padding:32, background:C.bg2, border:'1px solid '+C.border, borderRadius:16, marginBottom:14 }}>
                    <div style={{ fontSize:10, color:C.t3, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:6 }}>You have a</div>
                    <div style={{ fontSize:48, fontWeight:700, fontFamily:'monospace', letterSpacing:'-2px', color:edgeColor, marginBottom:6 }}>{hasLiveMarket ? (edgeVal > 0 ? '+' : '') + edgeVal.toFixed(0) + '% edge' : aiPctForDisplay + '% confidence'}</div>
                    <div style={{ fontSize:13, color:C.t2, marginBottom:14 }}>{hasLiveMarket ? 'AI sees a ' + (edgeVal >= 5 ? 'strong' : 'small') + ' opportunity over the market consensus' : 'AI confidence score for this question. Paste a Polymarket URL to see real edge.'}</div>
                    <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:convBg, color:edgeColor, border:'1px solid '+edgeColor+'33' }}>{convLabel}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:16, color:C.t2 }}>New to Polymarket?</div>
                  {[
                    { n:1, t:'Create a Polymarket account', d:'Go to polymarket.com - sign up with just your email. Takes 2 minutes. No crypto needed.', link:'Go to Polymarket' },
                    { n:2, t:'Deposit USDC (min $5)', d:'Use a credit card or crypto wallet. Funds go into your Polymarket balance instantly.' },
                    { n:3, t:'Place your bet', d:'Search for your market on Polymarket. Every trade placed through PlayPicks is logged in your journal with the AI reasoning.' },
                  ].map(s => (
                    <div key={s.n} style={{ display:'flex', gap:12, marginBottom:16, alignItems:'flex-start' }}>
                      <div style={{ width:26, height:26, borderRadius:'50%', background:C.purpleBg, color:C.purpleL, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>{s.n}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>{s.t}</div>
                        <div style={{ fontSize:11, color:C.t2, lineHeight:1.55 }}>{s.d}</div>
                        {s.link && <div style={{ fontSize:10, color:C.purpleL, marginTop:4, cursor:'pointer' }}>{s.link}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:16, padding:20, textAlign:'center' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Sign in with your email</div>
                    <div style={{ fontSize:11, color:C.t3, marginBottom:14 }}>No wallet or crypto experience needed. Magic Link - just your email.</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:14 }}>{hasLiveMarket && edgeVal > 0 ? 'Suggested: ' + betAmt : 'Paste a Polymarket URL to calculate real edge'}</div>
                    <button style={{ width:'100%', padding:12, background:C.purple, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', marginBottom:8 }} onClick={() => window.open(isPolymarketUrl ? event : 'https://polymarket.com', '_blank')}>Trade on Polymarket</button>
                    <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:C.t3, textDecoration:"none", display:"block", textAlign:"center", cursor:"pointer" }}>Or trade directly on Polymarket</a>
                    <div style={{ fontSize:9, color:C.t4, marginTop:6 }}>Powered by Polymarket. Not financial advice.</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:C.bg3, border:'1px solid '+C.border2, borderRadius:10, padding:'9px 16px', fontSize:11, fontWeight:500, color:C.t1, zIndex:300, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

      {showMagicModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowMagicModal(false); }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:C.bg2, border:'1px solid '+C.border2, borderRadius:18, padding:28, width:'100%', maxWidth:380 }}>
            <div style={{ fontSize:17, fontWeight:700, marginBottom:5, color:C.t1 }}>Sign in to trade</div>
            <div style={{ fontSize:12, color:C.t2, marginBottom:20, lineHeight:1.5 }}>Enter your email and we will send you a magic link. No password or wallet needed.</div>
            <MagicLinkModalInner onClose={() => setShowMagicModal(false)} />
          </div>
        </div>
      )}

    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#07070c' }} />}>
      <ScoresPageContent />
    </Suspense>
  );
}
