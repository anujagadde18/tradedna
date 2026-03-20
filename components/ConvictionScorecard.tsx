"use client";

// -----------------------------------------
// ConvictionScorecard.tsx
// Drop into: components/ConvictionScorecard.tsx
// Usage: <ConvictionScorecard aiPct={97} marketPct={95} onTrade={() => openModal()} />
// -----------------------------------------

interface Props {
  aiPct: number;
  marketPct: number;
  onTrade?: () => void;
}

function getConviction(edge: number) {
  if (edge > 6)  return {
    label: "High conviction",
    badge: { bg: "rgba(46,204,138,0.15)",  color: "#2ecc8a", border: "rgba(46,204,138,0.25)" },
    note:  "Strong edge detected. AI significantly disagrees with the crowd. Meaningful opportunity.",
    suggestion: "$75 - $200",
  };
  if (edge > 2)  return {
    label: "Medium conviction",
    badge: { bg: "rgba(245,166,35,0.15)",  color: "#f5a623", border: "rgba(245,166,35,0.25)" },
    note:  "Small but real edge. Keep position modest and only bet with personal conviction.",
    suggestion: "$25 - $75",
  };
  if (edge > 0)  return {
    label: "Low conviction",
    badge: { bg: "rgba(239,79,106,0.15)",  color: "#ef4f6a", border: "rgba(239,79,106,0.25)" },
    note:  "Very small edge. Skip unless you have strong independent conviction.",
    suggestion: "$10 - $25",
  };
  return {
    label: "No edge",
    badge: { bg: "rgba(239,79,106,0.15)",  color: "#ef4f6a", border: "rgba(239,79,106,0.25)" },
    note:  "AI aligns with the market. No betting advantage detected.",
    suggestion: "Skip",
  };
}

export default function ConvictionScorecard({ aiPct, marketPct, onTrade }: Props) {
  const edge = aiPct - marketPct;
  const edgeStr = (edge >= 0 ? "+" : "") + edge + "%";
  const conv = getConviction(edge);
  const hasEdge = edge > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* -- SCORECARD -- */}
      <div style={{
        background: "var(--card-bg, #14141c)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, padding: 18,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.7px", color: "#5c5a78", marginBottom: 12,
        }}>
          Market vs AI
        </div>

        {/* Head to head grid */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10, overflow: "hidden", marginBottom: 12,
          display: "grid", gridTemplateColumns: "1fr 44px 1fr",
        }}>

          {/* Market side */}
          <div style={{ padding: "14px 10px", textAlign: "center" }}>
            <div style={{
              fontSize: 9, color: "#5c5a78", textTransform: "uppercase",
              letterSpacing: "0.4px", marginBottom: 5,
            }}>
              Bettors
            </div>
            <div style={{
              fontSize: 32, fontWeight: 700, letterSpacing: "-1.5px",
              lineHeight: 1, color: "#9998a8",
            }}>
              {marketPct}%
            </div>
            <div style={{ fontSize: 9, color: "#5c5a78", marginTop: 3 }}>
              consensus
            </div>
          </div>

          {/* VS center */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "8px 0",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              fontSize: 8, color: "#5c5a78", textTransform: "uppercase",
              letterSpacing: "0.3px", marginBottom: 6,
            }}>
              vs
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, padding: "3px 6px",
              borderRadius: 8, whiteSpace: "nowrap",
              color: hasEdge ? "#2ecc8a" : "#ef4f6a",
              background: hasEdge ? "rgba(46,204,138,0.15)" : "rgba(239,79,106,0.15)",
            }}>
              {edgeStr}
            </div>
          </div>

          {/* AI side - lights up blue when edge exists */}
          <div style={{
            padding: "14px 10px", textAlign: "center",
            borderRadius: "0 10px 10px 0",
            background: hasEdge ? "rgba(77,157,224,0.08)" : "transparent",
            transition: "background 0.3s",
          }}>
            <div style={{
              fontSize: 9, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5,
              color: hasEdge ? "#4d9de0" : "#5c5a78",
            }}>
              AI thinks
            </div>
            <div style={{
              fontSize: 32, fontWeight: 700, letterSpacing: "-1.5px",
              lineHeight: 1,
              color: hasEdge ? "#4d9de0" : "#9998a8",
            }}>
              {aiPct}%
            </div>
            <div style={{
              fontSize: 9, marginTop: 3, opacity: 0.75,
              color: hasEdge ? "#4d9de0" : "#5c5a78",
            }}>
              {hasEdge ? "edge found" : "no edge"}
            </div>
          </div>
        </div>

        {/* Conviction badge */}
        <span style={{
          display: "inline-flex", padding: "4px 10px",
          borderRadius: 20, fontSize: 10, fontWeight: 700,
          background: conv.badge.bg, color: conv.badge.color,
          border: `1px solid ${conv.badge.border}`,
        }}>
          {conv.label}
        </span>

        {/* Note */}
        <div style={{ fontSize: 11, color: "#9998a8", lineHeight: 1.6, marginTop: 10 }}>
          {conv.note}
        </div>
      </div>

      {/* -- CONVICTION NUMBERS -- */}
      <div style={{
        background: "var(--card-bg, #14141c)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, padding: 16,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.7px", color: "#5c5a78", marginBottom: 12,
        }}>
          Conviction score
        </div>

        {/* Gradient bar */}
        <div style={{
          height: 4, background: "rgba(255,255,255,0.06)",
          borderRadius: 2, overflow: "hidden", marginBottom: 14,
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, #ef4f6a, #f5a623, #2ecc8a)",
            width: `${Math.min(100, Math.max(0, aiPct))}%`,
            transition: "width 0.5s ease",
          }} />
        </div>

        {/* 3 numbers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
          {[
            { val: `${marketPct}%`, lbl: "Market",   color: "#9998a8" },
            { val: `${aiPct}%`,     lbl: "AI",        color: "#a89cf8" },
            { val: edgeStr,         lbl: "Edge",       color: hasEdge ? "#2ecc8a" : "#ef4f6a" },
          ].map(({ val, lbl, color }) => (
            <div key={lbl} style={{
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8, padding: "8px 6px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", color }}>
                {val}
              </div>
              <div style={{
                fontSize: 8, color: "#5c5a78", textTransform: "uppercase",
                letterSpacing: "0.3px", marginTop: 3,
              }}>
                {lbl}
              </div>
            </div>
          ))}
        </div>

        {/* Suggestion */}
        <div style={{
          fontSize: 10, color: "#9998a8", lineHeight: 1.55,
          padding: "8px 10px", marginTop: 10,
          background: "rgba(255,255,255,0.03)", borderRadius: 8,
        }}>
          {conv.note}
        </div>
      </div>

      {/* -- TRADE PANEL -- */}
      <div style={{
        background: "var(--card-bg, #14141c)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16, padding: 16,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.7px", color: "#5c5a78",
          textAlign: "center", marginBottom: 6,
        }}>
          Place a trade
        </div>
        <div style={{ fontSize: 11, color: "#5c5a78", textAlign: "center", marginBottom: 12 }}>
          No wallet or crypto needed
        </div>

        {/* Suggested amount */}
        {conv.suggestion !== "Skip" && (
          <div style={{
            fontSize: 12, fontWeight: 700, color: "#f5a623",
            textAlign: "center", marginBottom: 10,
          }}>
            Suggested: {conv.suggestion}
          </div>
        )}

        <button
          onClick={onTrade}
          style={{
            width: "100%", padding: "13px 0",
            background: "#7c6ff7", color: "white",
            border: "none", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#a89cf8")}
          onMouseLeave={e => (e.currentTarget.style.background = "#7c6ff7")}
        >
          Sign in to trade
        </button>

        <div style={{
          textAlign: "center", fontSize: 11,
          color: "#5c5a78", marginTop: 10, cursor: "pointer",
        }}>
          Or trade directly on Polymarket
        </div>
        <div style={{
          textAlign: "center", fontSize: 10,
          color: "#3a3858", marginTop: 6,
        }}>
          Powered by Polymarket &middot; Not financial advice
        </div>
      </div>

    </div>
  );
}
