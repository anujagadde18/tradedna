"use client";

// -----------------------------------------
// SignalConstellation.tsx
// Drop into: components/SignalConstellation.tsx
// Usage: <SignalConstellation aiPct={97} marketPct={95} sources={sources} question="Will..." />
// -----------------------------------------

import { useState } from "react";

interface Source {
  name: string;
  category: "news" | "social" | "market" | "contrary";
  signal: "strong" | "mixed" | "weak" | "contrary";
  contribution: number; // e.g. 22 means +22%
  orbitRing: "inner" | "mid" | "outer";
}

interface Props {
  aiPct: number;
  marketPct: number;
  question: string;
  sources?: Source[];
}

// Default sources if none passed in
const DEFAULT_SOURCES: Source[] = [
  { name: "Reuters",    category: "news",     signal: "strong",   contribution: 22, orbitRing: "inner" },
  { name: "Reddit",     category: "social",   signal: "strong",   contribution: 18, orbitRing: "inner" },
  { name: "Bloomberg",  category: "news",     signal: "mixed",    contribution: 15, orbitRing: "mid"   },
  { name: "Polymarket", category: "market",   signal: "mixed",    contribution: 12, orbitRing: "mid"   },
  { name: "Kalshi",     category: "market",   signal: "weak",     contribution: 8,  orbitRing: "outer" },
  { name: "Twitter",    category: "contrary", signal: "contrary", contribution: -3, orbitRing: "outer" },
  { name: "Metaculus",  category: "social",   signal: "weak",     contribution: 6,  orbitRing: "outer" },
];

// Color per category
const CAT_COLOR: Record<string, string> = {
  news:     "#4d9de0",
  social:   "#7c6ff7",
  market:   "#f5a623",
  contrary: "#ef4f6a",
};

// Tooltip descriptions per signal type
const SIG_DESC: Record<string, string> = {
  strong:   "Strong signal pulling toward this outcome.",
  mixed:    "Mixed signal - some evidence on both sides.",
  weak:     "Weak signal - low confidence contribution.",
  contrary: "Contrary signal - pulling away from outcome.",
};

// Fixed positions for up to 7 nodes on the constellation
// cx, cy relative to 500x290 viewBox, center at 250,145
const NODE_POSITIONS = [
  { cx: 250, cy: 50  },  // top center - inner
  { cx: 326, cy: 74  },  // top right - inner
  { cx: 340, cy: 178 },  // right mid
  { cx: 160, cy: 178 },  // left mid
  { cx: 166, cy: 112 },  // left outer
  { cx: 320, cy: 216 },  // bottom right outer
  { cx: 174, cy: 230 },  // bottom left outer
];

function getBadgeStyle(edge: number): { label: string; bg: string; color: string } {
  if (edge > 6)  return { label: "High conviction",   bg: "rgba(46,204,138,0.15)",  color: "#2ecc8a" };
  if (edge > 2)  return { label: "Medium conviction", bg: "rgba(245,166,35,0.15)",  color: "#f5a623" };
  if (edge > 0)  return { label: "Low conviction",    bg: "rgba(239,79,106,0.15)",  color: "#ef4f6a" };
  return           { label: "No edge",               bg: "rgba(239,79,106,0.15)",  color: "#ef4f6a" };
}

function getSuggestion(edge: number): string {
  if (edge > 6) return "Suggested position: $75 - $200";
  if (edge > 2) return "Suggested position: $25 - $75";
  if (edge > 0) return "Suggested position: $10 - $25";
  return "Suggested position: Skip";
}

function getSoWhat(aiPct: number, marketPct: number, edge: number): string {
  if (edge > 6)  return `AI at ${aiPct}% vs market at ${marketPct}%. Strong edge detected - AI significantly disagrees with the crowd. High confidence opportunity.`;
  if (edge > 2)  return `AI at ${aiPct}% vs market at ${marketPct}%. Small but real edge - keep position modest and only bet with personal conviction.`;
  if (edge > 0)  return `AI at ${aiPct}% vs market at ${marketPct}%. Very small edge. Skip unless you have strong independent conviction.`;
  return           `AI aligns with the market at ${marketPct}%. No betting advantage detected - skip this market.`;
}

export default function SignalConstellation({
  aiPct,
  marketPct,
  question,
  sources = DEFAULT_SOURCES,
}: Props) {
  const [tooltip, setTooltip] = useState<{ name: string; body: string; color: string } | null>(null);

  const edge = aiPct - marketPct;
  const edgeStr = (edge >= 0 ? "+" : "") + edge + "%";
  const badge = getBadgeStyle(edge);
  const edgeColor = edge > 4 ? "#2ecc8a" : edge > 0 ? "#f5a623" : "#ef4f6a";
  const edgeLbl = edge > 6 ? "strong opportunity" : edge > 2 ? "small opportunity" : edge === 0 ? "no edge" : "AI below market";

  const nodes = sources.slice(0, 7);

  function handleNodeClick(src: Source) {
    setTooltip({
      name: `${src.name} . ${src.category}`,
      body: `${SIG_DESC[src.signal]} Contribution: ${src.contribution >= 0 ? "+" : ""}${src.contribution}%`,
      color: CAT_COLOR[src.category],
    });
    setTimeout(() => setTooltip(null), 5000);
  }

  // Node radius based on contribution magnitude
  function nodeRadius(contribution: number): number {
    const abs = Math.abs(contribution);
    if (abs >= 20) return 16;
    if (abs >= 14) return 13;
    if (abs >= 8)  return 11;
    return 9;
  }

  return (
    <div style={{
      background: "var(--card-bg, #14141c)",
      border: "1px solid var(--border, rgba(255,255,255,0.07))",
      borderRadius: 16,
      padding: 24,
    }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "#5c5a78", marginBottom: 5 }}>
            AI Analysis
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#9998a8", marginBottom: 6 }}>
            {question}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-2px", lineHeight: 1, color: "#f2f0ff" }}>
            {aiPct}%
          </div>
          <div style={{ fontSize: 12, color: "#9998a8", marginTop: 3, marginBottom: 8 }}>
            {aiPct >= 70 ? "likely yes" : aiPct >= 50 ? "uncertain lean yes" : "uncertain lean no"}
          </div>
          <span style={{
            display: "inline-flex", padding: "4px 10px", borderRadius: 20,
            fontSize: 10, fontWeight: 700,
            background: badge.bg, color: badge.color,
            border: `1px solid ${badge.color}33`,
          }}>
            {badge.label}
          </span>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: "#5c5a78", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>
            Edge over market
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1px", color: edgeColor }}>
            {edgeStr}
          </div>
          <div style={{ fontSize: 9, color: "#5c5a78", marginTop: 2 }}>
            {edgeLbl}
          </div>
        </div>
      </div>

      {/* SVG Constellation */}
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 9, color: "#5c5a78", marginBottom: 8, letterSpacing: "0.3px" }}>
          Each signal orbits the verdict &middot; closer = stronger pull &middot; click any signal to inspect
        </div>

        <svg width="100%" viewBox="0 0 500 290" style={{ display: "block" }}>
          <defs>
            <radialGradient id="ppRg1" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#7c6ff7" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#7c6ff7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ppRg2" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#7c6ff7" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#7c6ff7" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient glow */}
          <circle cx="250" cy="145" r="100" fill="url(#ppRg1)" />
          <circle cx="250" cy="145" r="150" fill="url(#ppRg2)" />

          {/* Orbit rings */}
          <circle cx="250" cy="145" r="62"  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="4 5" />
          <circle cx="250" cy="145" r="100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="3 6" />
          <circle cx="250" cy="145" r="132" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" strokeDasharray="2 7" />

          {/* Ring labels */}
          <text x="315" y="143" fontSize="7" fill="rgba(255,255,255,0.12)" fontFamily="inherit">strong</text>
          <text x="353" y="143" fontSize="7" fill="rgba(255,255,255,0.12)" fontFamily="inherit">mixed</text>
          <text x="385" y="143" fontSize="7" fill="rgba(255,255,255,0.12)" fontFamily="inherit">weak</text>

          {/* Connector lines from each node to center */}
          {nodes.map((src, i) => {
            const pos = NODE_POSITIONS[i];
            const color = CAT_COLOR[src.category];
            return (
              <line
                key={`ln-${i}`}
                x1={pos.cx} y1={pos.cy}
                x2="250"   y2="145"
                stroke={color} strokeWidth="0.8" opacity="0.28"
              />
            );
          })}

          {/* Signal nodes */}
          {nodes.map((src, i) => {
            const pos = NODE_POSITIONS[i];
            const color = CAT_COLOR[src.category];
            const r = nodeRadius(src.contribution);
            const contribStr = (src.contribution >= 0 ? "+" : "") + src.contribution + "%";
            return (
              <g
                key={`node-${i}`}
                style={{ cursor: "pointer" }}
                onClick={() => handleNodeClick(src)}
              >
                <circle cx={pos.cx} cy={pos.cy} r={r + 5} fill={color} opacity="0.1" />
                <circle cx={pos.cx} cy={pos.cy} r={r}     fill={color} opacity="0.92" />
                <text
                  x={pos.cx} y={pos.cy - 1}
                  textAnchor="middle" fontSize="6.5" fontWeight="500"
                  fill="white" fontFamily="inherit"
                >
                  {src.name}
                </text>
                <text
                  x={pos.cx} y={pos.cy + 8}
                  textAnchor="middle" fontSize="6"
                  fill="rgba(255,255,255,0.75)" fontFamily="inherit"
                >
                  {contribStr}
                </text>
              </g>
            );
          })}

          {/* Center verdict node */}
          <circle cx="250" cy="145" r="40" fill="#7c6ff7" opacity="0.08" />
          <circle cx="250" cy="145" r="27" fill="#7c6ff7" opacity="0.16" />
          <circle cx="250" cy="145" r="20" fill="#7c6ff7" />
          <text x="250" y="141" textAnchor="middle" fontSize="12" fontWeight="500" fill="white" fontFamily="inherit">
            {aiPct}%
          </text>
          <text x="250" y="153" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.6)" fontFamily="inherit">
            AI verdict
          </text>

          {/* Legend */}
          <circle cx="16"  cy="272" r="4" fill="#4d9de0" />
          <text x="23"  y="276" fontSize="7" fill="#5c5a78" fontFamily="inherit">News</text>
          <circle cx="56"  cy="272" r="4" fill="#7c6ff7" />
          <text x="63"  y="276" fontSize="7" fill="#5c5a78" fontFamily="inherit">Social</text>
          <circle cx="96"  cy="272" r="4" fill="#f5a623" />
          <text x="103" y="276" fontSize="7" fill="#5c5a78" fontFamily="inherit">Market</text>
          <circle cx="136" cy="272" r="4" fill="#ef4f6a" />
          <text x="143" y="276" fontSize="7" fill="#5c5a78" fontFamily="inherit">Contrary</text>
          <text x="200" y="276" fontSize="7" fill="#5c5a78" fontFamily="inherit">Tap any signal bubble to inspect</text>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: "absolute", top: 8, right: 0,
            background: "#14141c",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "10px 14px",
            width: 200, zIndex: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: tooltip.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#f2f0ff" }}>{tooltip.name}</span>
            </div>
            <div style={{ fontSize: 11, color: "#9998a8", lineHeight: 1.55 }}>{tooltip.body}</div>
            <div
              style={{ fontSize: 10, color: "#5c5a78", marginTop: 8, cursor: "pointer" }}
              onClick={() => setTooltip(null)}
            >
              Dismiss
            </div>
          </div>
        )}
      </div>

      {/* So what summary */}
      <div style={{
        fontSize: 11, color: "#9998a8", lineHeight: 1.65,
        marginTop: 12, padding: "10px 12px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 8, borderLeft: "2px solid rgba(255,255,255,0.08)",
      }}>
        {getSoWhat(aiPct, marketPct, edge)}
      </div>

      {/* Suggested position */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#f5a623", marginTop: 8 }}>
        {getSuggestion(edge)}
      </div>
    </div>
  );
}
