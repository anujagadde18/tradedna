'use client';
/* PP-SCORES-PLAIN-V1 - honest sources + plain language */
/* PP-DATA-V1B - multi-outcome display consistency */
// PP-DATA-V1 - real data for any question: event search, multi-outcome support, no invented numbers
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

const FRAMES: Frame[] = ['verdict','signals','markets','trade'];
const FRAME_LABELS = ['Answer','How it was built','Related questions','Trade'];

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
  const [openFactor, setOpenFactor] = useState<number|null>(null);
  const [componentWeights, setComponentWeights] = useState<Record<string, number>>({});
  const [customSources, setCustomSources] = useState<{id:string; label:string; prob:number; weight:number}[]>([]);

  const isCategorical = mtype === "categorical";
  const topOutcomes = outcomes?.slice(0, 8) || [];
  const [showAdjust, setShowAdjust] = useState(false);
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

      {/* MATCHUP CARD — narrative headline redesign */}
      {isMatchup && (
        <div style={{ padding:"18px 20px 16px", borderBottom:"1px solid "+C.border }}>

          {(() => {
            const gap = components && components.length > 1
              ? Math.max(...components.map(c => c.prob)) - Math.min(...components.map(c => c.prob))
              : 0;
            const marketComp = components?.find(c => c.key === 'market');
            const modelComp = components?.find(c => c.key === 'model');
            const headline = aiPct >= 65 ? winner + " strongly favored to beat " + (aiPct >= 50 ? t2short : t1short)
              : winner + " favored to beat " + (aiPct >= 50 ? t2short : t1short);
            const subline = (marketComp && modelComp && gap >= 8)
              ? "People betting real money lean " + (marketComp.prob > modelComp.prob ? "more strongly" : "less strongly") + " toward " + winner + " than the stats do - a " + gap + "-point gap worth knowing about."
              : (marketComp && modelComp)
              ? "The bettors and the stats agree on this one."
              : "Based on team strength and recent form - no live market data found for this match.";
            return (
              <>
                <div style={{ fontSize:20, fontWeight:700, color:C.t1, lineHeight:1.3, marginBottom:6 }}>{headline}</div>
                <div style={{ fontSize:13, color:C.t2, lineHeight:1.5, marginBottom:18 }}>{subline}</div>
                <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ flex:1, height:8, borderRadius:4, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:aiPct+"%", background:C.t1 }} />
                  </div>
                  <div style={{ fontSize:12, color:C.t3, whiteSpace:"nowrap" }}>
                    {marketComp && modelComp ? "Bettors: " + marketComp.prob + "% - Stats: " + modelComp.prob + "%" : "Our estimate: " + aiPct + "%"}
                  </div>
                </div>
              </>
            );
          })()}
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
              <text x="100" y="92" fontSize="34" fontWeight="800" fill={verdictColor} textAnchor="middle" fontFamily="monospace">{aiPct}%</text>
            </svg>
            <div style={{ fontSize:15, fontWeight:700, color:C.t1, marginTop:6 }}>{verdictText}</div>
            {!marketValid && <div style={{ fontSize:11, color:C.t3, marginTop:5 }}>Estimated from news and forecasters - no live market found</div>}
          </div>
          {/* Bar */}
          <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.06)", overflow:"hidden", marginBottom:12 }}>
            <div style={{ height:"100%", borderRadius:3, background:verdictColor, width:aiPct+"%", transition:"width 0.8s ease" }} />
          </div>
          {marketValid && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              <div style={{ textAlign:"center", padding:"8px", background:"rgba(255,255,255,0.03)", borderRadius:8 }}>
                <div style={{ fontSize:10, color:C.t3, marginBottom:2 }}>Bettors say</div>
                <div style={{ fontSize:15, fontWeight:700, color:C.t2 }}>{marketPct}%</div>
              </div>
              <div style={{ textAlign:"center", padding:"8px", background:"rgba(46,204,138,0.07)", borderRadius:8 }}>
                <div style={{ fontSize:10, color:C.green, marginBottom:2 }}>Our estimate</div>
                <div style={{ fontSize:15, fontWeight:700, color:C.green }}>{aiPct}%</div>
              </div>
              <div style={{ textAlign:"center", padding:"8px", background:edge!>0?"rgba(46,204,138,0.07)":"rgba(239,79,106,0.07)", borderRadius:8 }}>
                <div style={{ fontSize:10, color:edge!>0?C.green:C.red, marginBottom:2 }}>Gap</div>
                <div style={{ fontSize:15, fontWeight:700, color:edge!>0?C.green:C.red }}>{edge!>0?"+":""}{edge}%</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CATEGORICAL - ranked outcomes, Robinhood-style: one big answer, detail below */}
      {isCategorical && topOutcomes.length > 0 && (
        <div style={{ padding:"22px 20px", borderBottom:"1px solid "+C.border }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.t3, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:10 }}>Most likely right now</div>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:12, marginBottom:6 }}>
            <div style={{ fontSize:24, fontWeight:800, color:C.t1, letterSpacing:"-0.6px", lineHeight:1.15 }}>{topOutcomes[0].name}</div>
            <div style={{ fontSize:40, fontWeight:800, color:C.green, fontFamily:"monospace", lineHeight:1 }}>{topOutcomes[0].odds}%</div>
          </div>
          <div style={{ fontSize:12, color:C.t2, marginBottom:18 }}>
            {topOutcomes[0].odds >= 60 ? "A clear favorite - people betting real money strongly agree." : topOutcomes[0].odds >= 35 ? "The front-runner, but this race is far from decided." : "A slight lead in a wide-open race - nobody really knows yet."}
          </div>
          {topOutcomes.map((o: any, i: number) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, padding:"9px 12px", borderRadius:10, background:i===0?"rgba(46,204,138,0.06)":"rgba(255,255,255,0.02)", border:i===0?"1px solid rgba(46,204,138,0.18)":"1px solid transparent" }}>
              <div style={{ fontSize:11, fontWeight:700, color:i===0?C.green:C.t4, fontFamily:"monospace", minWidth:16 }}>{i+1}</div>
              <div style={{ fontSize:13, fontWeight:i===0?700:500, color:i===0?C.t1:C.t2, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.name}</div>
              <div style={{ width:90, height:5, borderRadius:3, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:3, background:i===0?C.green:C.t4, width:Math.min(o.odds,100)+"%" }} />
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:i===0?C.green:C.t2, fontFamily:"monospace", minWidth:40, textAlign:"right" }}>{o.odds}%</div>
            </div>
          ))}
          <div style={{ fontSize:11, color:C.t3, marginTop:12 }}>Live prices from people betting real money on Polymarket - they update every minute.</div>
        </div>
      )}

      {/* REASONS — tap to expand factors, clear at a glance and deep on demand */}
      {(bullSources.length > 0 || bearSources.length > 0) && (() => {
        const factors = [
          ...bullSources.slice(0,3).map(s => ({ ...s, kind: "bull" as const })),
          ...bearSources.slice(0,2).map(s => ({ ...s, kind: "bear" as const })),
        ];
        return (
          <div style={{ padding:"14px 20px", borderBottom:"1px solid "+C.border }}>
            <div style={{ fontSize:11, color:C.t3, fontWeight:600, marginBottom:10 }}>Tap a factor for the full reasoning</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {factors.map((f, i) => {
                const isOpen = openFactor === i;
                const isBull = f.kind === "bull";
                const full = f.sig || "";
                const preview = full.length > 46 ? full.slice(0,46) + "..." : full;
                return (
                  <div key={i} style={{ border:"1px solid "+C.border, borderRadius:9, overflow:"hidden" }}>
                    <div onClick={() => setOpenFactor(isOpen ? null : i)}
                      style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", cursor:"pointer" }}>
                      <span style={{ fontSize:12, color:isBull?C.green:C.amber, flexShrink:0 }}>{isBull?"+":"!"}</span>
                      <span style={{ fontSize:13, color:C.t1, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{isOpen ? full : preview}</span>
                      <span style={{ fontSize:11, color:C.t3, flexShrink:0, transform: isOpen ? "rotate(180deg)" : "none", transition:"transform 0.15s" }}>&darr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ADJUST TOGGLE - story stays simple; tools open on demand */}
      <div style={{ padding:"14px 20px", borderBottom:"1px solid "+C.border }}>
        <button onClick={() => setShowAdjust(v => !v)}
          style={{ width:"100%", padding:"12px", borderRadius:10, border:"1px solid rgba(124,111,247,0.3)", background:showAdjust?"rgba(124,111,247,0.16)":"rgba(124,111,247,0.08)", color:"#a89cf8", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          {showAdjust ? "Hide the adjustment tools" : "Don't fully agree? Adjust this yourself"}
        </button>
      </div>
      {showAdjust && (<>
      {/* YOUR PREDICTION - weight sources yourself, add your own, works for any kind of question */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid "+C.border }}>
        {(() => {
          const existingRows = (components||[]).map(c => ({
            id: c.key,
            label: c.label,
            prob: c.prob,
            weight: componentWeights[c.key] ?? 100,
          }));
          const customRows = customSources.map(s => ({ id: s.id, label: s.label, prob: s.prob, weight: s.weight }));
          const allRows = [...existingRows, ...customRows];
          const totalWeight = allRows.reduce((sum, r) => sum + r.weight, 0);
          const blended = totalWeight > 0
            ? Math.round(allRows.reduce((sum, r) => sum + r.prob * r.weight, 0) / totalWeight)
            : aiPct;
          const hasCustomizations = customSources.length > 0 || Object.keys(componentWeights).length > 0;
          const contrib = (prob:number, weight:number) => totalWeight > 0 ? Math.round((prob - 50) * weight / totalWeight) : 0;
          const addPreset = (label:string) => setCustomSources(list => [...list, { id: "custom-"+Date.now(), label, prob:50, weight:50 }]);

          return (
            <>
              <div style={{ fontSize:11, color:C.t3, fontWeight:600, marginBottom:4 }}>Your prediction</div>
              <div style={{ fontSize:12, color:C.t3, marginBottom:14 }}>Adjust how much you trust each source, or add your own</div>

              {existingRows.map(row => (
                <div key={row.id} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                    <span style={{ color:C.t1 }}>{row.label}</span>
                    <span style={{ display:"flex", gap:8 }}>
                      <span style={{ color:C.t3, fontFamily:"monospace" }}>{row.prob}%</span>
                      <span style={{ color: contrib(row.prob,row.weight)>=0 ? C.green : C.amber, fontFamily:"monospace", fontSize:11 }}>
                        {contrib(row.prob,row.weight)>=0?"+":""}{contrib(row.prob,row.weight)}pt
                      </span>
                    </span>
                  </div>
                  <input type="range" min={0} max={100} value={row.weight}
                    onChange={e => setComponentWeights(w => ({ ...w, [row.id]: parseInt(e.target.value) }))}
                    style={{ width:"100%" }} />
                </div>
              ))}

              {customSources.map(s => (
                <div key={s.id} style={{ marginBottom:14, padding:10, border:"1px solid "+C.border, borderRadius:9 }}>
                  <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                    <input type="text" value={s.label} placeholder="What's your source? A person, article, gut feeling..."
                      onChange={e => setCustomSources(list => list.map(x => x.id===s.id ? {...x, label:e.target.value} : x))}
                      style={{ flex:1, fontSize:12, padding:"6px 8px", background:C.bg1, border:"1px solid "+C.border, borderRadius:6, color:C.t1 }} />
                    <span style={{ color: contrib(s.prob,s.weight)>=0 ? C.green : C.amber, fontFamily:"monospace", fontSize:11, alignSelf:"center", whiteSpace:"nowrap" }}>
                      {contrib(s.prob,s.weight)>=0?"+":""}{contrib(s.prob,s.weight)}pt
                    </span>
                    <button onClick={() => setCustomSources(list => list.filter(x => x.id !== s.id))}
                      style={{ fontSize:12, color:C.t3, background:"none", border:"none", cursor:"pointer", padding:"0 6px" }}>remove</button>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.t3, marginBottom:3 }}>
                    <span>Their estimate</span><span>{s.prob}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={s.prob}
                    onChange={e => setCustomSources(list => list.map(x => x.id===s.id ? {...x, prob:parseInt(e.target.value)} : x))}
                    style={{ width:"100%", marginBottom:8 }} />
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.t3, marginBottom:3 }}>
                    <span>How much you trust it</span><span>{s.weight}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={s.weight}
                    onChange={e => setCustomSources(list => list.map(x => x.id===s.id ? {...x, weight:parseInt(e.target.value)} : x))}
                    style={{ width:"100%" }} />
                </div>
              ))}

              <div style={{ fontSize:11, color:C.t3, marginBottom:8 }}>Add a source:</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                <button onClick={() => addPreset("A news article I read: ")}
                  style={{ fontSize:12, color:C.purpleL, background:C.purpleBg, border:"1px solid rgba(124,111,247,0.25)", borderRadius:8, padding:"7px 12px", cursor:"pointer" }}>
                  News or article
                </button>
                <button onClick={() => addPreset("An expert forecaster: ")}
                  style={{ fontSize:12, color:C.purpleL, background:C.purpleBg, border:"1px solid rgba(124,111,247,0.25)", borderRadius:8, padding:"7px 12px", cursor:"pointer" }}>
                  Expert forecaster
                </button>
                <button onClick={() => addPreset("Someone I trust: ")}
                  style={{ fontSize:12, color:C.purpleL, background:C.purpleBg, border:"1px solid rgba(124,111,247,0.25)", borderRadius:8, padding:"7px 12px", cursor:"pointer" }}>
                  Someone I trust
                </button>
                <button onClick={() => addPreset("My own take: ")}
                  style={{ fontSize:12, color:C.purpleL, background:C.purpleBg, border:"1px solid rgba(124,111,247,0.25)", borderRadius:8, padding:"7px 12px", cursor:"pointer" }}>
                  My own take
                </button>
              </div>

              {hasCustomizations && (
                <div style={{ padding:"12px 14px", background:"rgba(46,204,138,0.06)", border:"1px solid rgba(46,204,138,0.2)", borderRadius:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, color:C.t1 }}>Your blended prediction</span>
                  <span style={{ fontSize:22, fontWeight:800, color:C.green, fontFamily:"monospace" }}>{blended}%</span>
                </div>
              )}
            </>
          );
        })()}
      </div>

      </>)}
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
          {metaculusSource && <span style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:"rgba(124,111,247,0.1)", color:C.purple, border:"1px solid rgba(124,111,247,0.2)" }}>Expert forecasts</span>}
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
                <div style={{ fontSize:12, fontWeight:600, color:C.t1 }}>{s.data.bowl?.name}</div>
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
            {edge>0?"Our estimate is "+edge+" points higher than what bettors are paying":"Bettors are paying "+Math.abs(edge)+" points more than our estimate"}
          </div>
        ) : (
          <div style={{ fontSize:12, color:C.t3, padding:"10px 14px", background:"rgba(255,255,255,0.02)", borderRadius:10, border:"1px solid "+C.border }}>
            {aiPct>=65?"High confidence in this number":aiPct>=45?"Moderate confidence - worth a closer look":"Genuinely uncertain - a close call"}
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
  const event = (searchParams.get('event') || '')
    .replace(/\s*-\s*More Markets\s*$/i, '')
    .replace(/\s*-\s*Exact Score\s*$/i, '')
    .trim();

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
  const [noRealData, setNoRealData]  = useState(false);
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
    setNoRealData(false);
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
      setNoRealData(false);
      if (data.mtype === 'categorical' && Array.isArray(data.outcomes) && data.outcomes.length > 1) {
        setOutcomes(data.outcomes.map((o: any) => ({ name: o.name, odds: o.prob })));
        setOdds(data.outcomes[0].prob);
        if (data.title) setMarketTitle(data.title);
        if (data.components && data.components.length > 0) setComponents(data.components);
        if (data.sources && data.sources.length > 0) setRealSources(data.sources);
        setIntel({ confidence: data.outcomes[0].prob, direction: 'YES', probabilityLabel: 'Most likely outcome', predictionStrength: 'Market', strengthScore: data.outcomes[0].prob, riskLevel: 'Medium', marketEdge: null, edgeContext: '', modelComponents: [], confidenceDrivers: { positive: [], negative: [] }, explanation: '' });
        setMtype('categorical');
        return;
      }
      if (data.noData) {
        if (data.sources && data.sources.length > 0) setRealSources(data.sources);
        setIntel(null);
        setNoRealData(true);
        return;
      }
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
        if (data.components && data.components.length > 0) {
          setComponents(data.components);
          const marketComponent = data.components.find((c: any) => c.key === 'market');
          if (marketComponent && odds === null) {
            setOdds(marketComponent.prob);
            setHasUrl(true);
          }
        }
        if (data.breakdown && data.breakdown.length > 0) setBreakdown(data.breakdown);
      } else {
        setIntel(null);
        setNoRealData(true);
      }
    } catch {
      setIntel(null);
      setNoRealData(true);
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
  const mainAI   = mtype === 'categorical' ? (top?.aiConfidence ?? top?.odds ?? null) : binaryAI;

  const conv      = getConviction(mainAI, mainOdds);
  const edgeColor = conv.color;
  const convLabel = conv.label;
  const convBg    = conv.bg;

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

  const aiPctForDisplay = mainAI || 0;
  const mktPctForDisplay = mainOdds || 0;

  /* PP-FLOW-V1 - single-scroll, answer-first, phone-first layout */
  return (
    <div style={{ minHeight:'100vh', background:C.bg0, color:C.t1, fontFamily:'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .ppFlowMain{max-width:780px;margin:0 auto;padding:20px 16px 90px}
        .ppHideMobile{display:flex}
        @media (max-width:720px){ .ppHideMobile{display:none} }
      `}</style>

      {/* SLIM STICKY NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:100, height:52, borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', background:'rgba(6,6,10,0.94)', backdropFilter:'blur(18px)', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:6, color:C.t1, background:C.bg2, border:'1px solid '+C.border2, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, padding:'6px 11px', flexShrink:0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Home
          </button>
          <span style={{ fontSize:12, color:C.t3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>{eventTitle}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <div className="ppHideMobile" style={{ position:'relative' }}>
            <input type="text" placeholder="Ask another question..."
              onKeyDown={e => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { router.push('/scores?event='+encodeURIComponent(e.currentTarget.value.trim())); e.currentTarget.value = ''; } }}
              style={{ width:220, padding:'7px 12px', background:C.bg2, border:'1px solid '+C.border, borderRadius:8, color:C.t1, fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
          </div>
          <button onClick={runAnalysis} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid '+C.border2, background:'none', color:C.t2 }}>Re-analyze</button>
          {!isSignedIn ? (
            <button onClick={() => setShowMagicModal(true)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', background:'rgba(46,204,138,0.1)', border:'1px solid rgba(46,204,138,0.25)', color:C.green }}>Sign in</button>
          ) : (
            <div className="ppHideMobile" style={{ fontSize:10, color:C.green, padding:'6px 10px', borderRadius:8, background:'rgba(46,204,138,0.08)', border:'1px solid rgba(46,204,138,0.2)' }}>Signed in</div>
          )}
        </div>
      </nav>

      <div className="ppFlowMain">

        {limitReached ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', gap:16, padding:40, background:C.bg2, border:'1px solid '+C.border, borderRadius:16 }}>
            <div style={{ fontSize:20, fontWeight:700, color:C.t1, letterSpacing:'-0.4px' }}>Daily limit reached</div>
            <div style={{ fontSize:13, color:C.t2, maxWidth:380, lineHeight:1.6 }}>You have used your 5 free analyses today. Sign in for unlimited access - free during beta.</div>
            <button onClick={() => setShowMagicModal(true)} style={{ background:C.purple, color:'#fff', border:'none', borderRadius:10, padding:'12px 28px', fontSize:14, fontWeight:700, cursor:'pointer' }}>Sign in for unlimited</button>
            <div style={{ fontSize:11, color:C.t3 }}>Resets at midnight - no credit card needed</div>
          </div>
        ) : invalidQuestion && !intel ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', gap:16, padding:40, background:C.bg2, border:'1px solid '+C.border, borderRadius:16 }}>
            <div style={{ fontSize:20, fontWeight:700, color:C.t1, letterSpacing:'-0.4px' }}>This does not look like a real prediction</div>
            <div style={{ fontSize:13, color:C.t2, maxWidth:380, lineHeight:1.6 }}>PlayPicks analyzes real, verifiable world events. Try asking about something that could actually happen.</div>
            <div style={{ width:'100%', maxWidth:380 }}>
              <div style={{ fontSize:10, color:C.t3, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>Try one of these instead</div>
              {(invalidQuestion.examples||[]).map((s:string) => (
                <button key={s} onClick={() => { router.push('/scores?event='+encodeURIComponent(s)); }}
                  style={{ display:'block', width:'100%', background:C.bg3, border:'1px solid '+C.border2, borderRadius:10, padding:'10px 16px', color:C.t2, fontSize:12, cursor:'pointer', textAlign:'left', marginBottom:6 }}>{s}</button>
              ))}
            </div>
          </div>
        ) : noRealData && !intel ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, textAlign:'center', gap:16, padding:40, background:C.bg2, border:'1px solid '+C.border, borderRadius:16 }}>
            <div style={{ fontSize:20, fontWeight:700, color:C.t1, letterSpacing:'-0.4px' }}>We could not find real data for this one</div>
            <div style={{ fontSize:13, color:C.t2, maxWidth:400, lineHeight:1.6 }}>No live market, no model data, no forecaster data - so we will not invent a number or reasons. That is the deal with PlayPicks: if we show a number, something real is behind it.</div>
            <div style={{ width:'100%', maxWidth:380 }}>
              <div style={{ fontSize:10, color:C.t3, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:8 }}>These have real data right now</div>
              {['Will the Fed cut rates in September?','Will Bitcoin hit $150k in 2026?','Chiefs vs Bills'].map((s:string) => (
                <button key={s} onClick={() => { router.push('/scores?event='+encodeURIComponent(s)); }}
                  style={{ display:'block', width:'100%', background:C.bg3, border:'1px solid '+C.border2, borderRadius:10, padding:'10px 16px', color:C.t2, fontSize:12, cursor:'pointer', textAlign:'left', marginBottom:6 }}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 1. THE ANSWER */}
            <VerdictCard aiPct={aiPctForDisplay} marketPct={mktPctForDisplay} question={eventTitle} sources={realSources} hasMarket={hasLiveMarket} mtype={mtype} outcomes={outcomes} rawEvent={event} breakdown={breakdown} components={components} />

            {/* 2. HOW THIS NUMBER WAS BUILT */}
            {components.length > 0 && (
              <div style={{ marginTop:22 }}>
                <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.3px', marginBottom:4 }}>How this number was built</div>
                <div style={{ fontSize:12, color:C.t2, marginBottom:14, lineHeight:1.5 }}>Blended from the sources below. Use "Adjust this yourself" above to change how much each one counts.</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
                  {components.map(comp => {
                    const meta: Record<string,{color:string; desc:string}> = {
                      market:  { color:C.green,   desc:'What people trading real money currently pay for this outcome. Updates every minute.' },
                      model:   { color:C.blue,    desc:'Calculated from relative team strength data, before looking at the market.' },
                      experts: { color:C.purpleL, desc:'The average of published forecasts on this kind of question.' },
                    };
                    const m = meta[comp.key] || { color:C.t2, desc:'Additional source used for this question.' };
                    return (
                      <div key={comp.key} style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:16 }}>
                        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:m.color, marginBottom:8 }}>{comp.label}</div>
                        <div style={{ fontSize:22, fontWeight:700, fontFamily:'monospace', marginBottom:6, color:C.t1 }}>{comp.prob}%</div>
                        <div style={{ height:5, background:C.bg4, borderRadius:3, overflow:'hidden', marginBottom:8 }}>
                          <div style={{ height:'100%', borderRadius:3, background:m.color, width:Math.min(100,Math.max(0,comp.prob))+'%' }} />
                        </div>
                        <div style={{ fontSize:11, color:C.t2, lineHeight:1.5 }}>{m.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. TRADE */}
            <div style={{ marginTop:22 }}>
              {tradeData ? (
                <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:16 }}>
                  <TradePanel key={tradeData.topOutcome.tokenId || tradeData.marketUrl} marketUrl={tradeData.marketUrl} marketTitle={tradeData.marketTitle} outcomeName={tradeData.topOutcome.name} marketOdds={tradeData.topOutcome.odds} aiConfidence={mtype==='categorical'?tradeData.topOutcome.aiConfidence:binaryAI} edge={mtype==='categorical'?tradeData.topOutcome.edge:binEdge} tokenId={tradeData.topOutcome.tokenId} isBinary={mtype==='binary'} />
                </div>
              ) : isPolymarketUrl ? (
                <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:16, textAlign:'center' }}>
                  <div style={{ fontSize:11, color:C.t3, marginBottom:8 }}>Loading market data...</div>
                  <div style={{ width:24, height:24, border:'2px solid rgba(124,111,247,0.3)', borderTopColor:C.purple, borderRadius:'50%', margin:'0 auto', animation:'spin 0.8s linear infinite' }}/>
                </div>
              ) : (
                <div style={{ background:C.bg2, border:'1px solid '+C.border, borderRadius:14, padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.t1, marginBottom:3 }}>Want to act on this?</div>
                    <div style={{ fontSize:11, color:C.t3 }}>This market trades on Polymarket. Decide your own amount - PlayPicks does not size bets.</div>
                  </div>
                  <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" style={{ padding:'10px 18px', background:C.purple, color:'#fff', borderRadius:9, fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>Open Polymarket</a>
                </div>
              )}
            </div>

            {/* 4. RELATED QUESTIONS (real only - no fillers, no invented numbers) */}
            {related.length > 0 && (
              <div style={{ marginTop:22 }}>
                <div style={{ fontSize:16, fontWeight:700, letterSpacing:'-0.3px', marginBottom:4 }}>Related questions</div>
                <div style={{ fontSize:12, color:C.t2, marginBottom:12 }}>Live markets on the same topic.</div>
                {related.slice(0,6).map((m:any, i:number) => (
                  <button key={i} onClick={() => router.push('/scores?event='+encodeURIComponent(m.url||m.title))}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, width:'100%', background:C.bg2, border:'1px solid '+C.border, borderRadius:12, padding:'12px 14px', marginBottom:6, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, color:C.t1, lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</div>
                      <div style={{ fontSize:10, color:C.t3, marginTop:2 }}>{fmtVol(m.volume)} traded</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:C.t2, flexShrink:0 }}>{m.probability ? m.probability+'%' : '→'}</div>
                  </button>
                ))}
              </div>
            )}

            {/* hidden data bridge: fetches market/trade data when a Polymarket URL is analyzed */}
            <div style={{ display:'none' }}>
              <PolymarketComparison userQuestion={event} aiPrediction={intel?.confidence||0} onDataReceived={(o,t,outs,ot,title) => { setOdds(o); if(t) setMtype(t); if(outs) setOutcomes(outs); setHasUrl(true); if(title) setMarketTitle(title); }} onTradeReady={(d:TradeReadyData) => setTradeData(d)} />
            </div>

            <div style={{ marginTop:28, textAlign:'center', fontSize:10, color:C.t4 }}>For research only. Not financial advice.</div>
          </>
        )}
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
