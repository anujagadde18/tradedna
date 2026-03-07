// components/intelligence/IntelligenceMetrics.tsx
"use client";

import { type IntelligenceMetrics } from "@/lib/engine/intelligenceEngine";

interface IntelligenceMetricsProps {
  intelligence: IntelligenceMetrics;
  marketOdds: number | null;
}

export function IntelligenceMetricsDisplay({ intelligence, marketOdds }: IntelligenceMetricsProps) {
  return (
    <div style={{ marginBottom: 28, padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      
      {/* Prediction Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          AI Prediction
        </div>

        <div style={{ fontSize: 56, fontWeight: 900, color: intelligence.direction === "YES" ? "#22c55e" : "#ef4444", marginBottom: 10, lineHeight: 1 }}>
          {intelligence.direction}
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: "#e4e4e7", marginBottom: 20 }}>
          {intelligence.confidence}% Confidence
        </div>
      </div>

      {/* Intelligence Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        
        {/* Prediction Strength (changed from Trust Level) */}
        <MetricCard
          label="PREDICTION STRENGTH"
          value={intelligence.predictionStrength}
          color={intelligence.strengthScore >= 70 ? "green" : intelligence.strengthScore >= 60 ? "orange" : "red"}
        />

        {/* Risk Level */}
        <MetricCard
          label="RISK LEVEL"
          value={intelligence.riskLevel}
          color={intelligence.riskLevel === "Low Risk" ? "green" : intelligence.riskLevel === "Medium Risk" ? "orange" : "red"}
        />

        {/* Market Edge (if available) */}
        {intelligence.marketEdge !== null && (
          <MetricCard
            label="AI EDGE vs MARKET"
            value={`${intelligence.marketEdge > 0 ? '+' : ''}${intelligence.marketEdge}%`}
            color={Math.abs(intelligence.marketEdge) > 10 ? "purple" : "blue"}
          />
        )}
      </div>

      {/* Market Edge Explanation */}
      {intelligence.marketEdge !== null && marketOdds !== null && (
        <div style={{ 
          padding: "12px 16px", 
          borderRadius: 10, 
          background: "rgba(147,51,234,0.08)", 
          border: "1px solid rgba(147,51,234,0.2)",
          marginBottom: 20
        }}>
          <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.6 }}>
            <strong style={{ color: "#a78bfa" }}>Market Opportunity:</strong> The market prices this at {marketOdds}%, but our AI predicts {intelligence.confidence}%. 
            {Math.abs(intelligence.marketEdge) > 10 
              ? ` That's a significant ${Math.abs(intelligence.marketEdge)}% edge${intelligence.marketEdge > 0 ? ' in favor of YES' : ' in favor of NO'}.`
              : ' The AI and market are closely aligned.'
            }
          </div>
        </div>
      )}

      {/* Custom Source Impact */}
      {intelligence.customSourceImpact !== 0 && (
        <div style={{ 
          padding: "12px 16px", 
          borderRadius: 10, 
          background: intelligence.customSourceImpact > 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", 
          border: intelligence.customSourceImpact > 0 ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.2)",
          marginBottom: 20
        }}>
          <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.6 }}>
            <strong style={{ color: intelligence.customSourceImpact > 0 ? "#22c55e" : "#ef4444" }}>Your Custom Sources:</strong> {
              intelligence.customSourceImpact > 0 
                ? `Boosted confidence by +${intelligence.customSourceImpact}%`
                : `Lowered confidence by ${intelligence.customSourceImpact}%`
            }
          </div>
        </div>
      )}

      {/* Explanation */}
      <div style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8, fontWeight: 600 }}>WHY THIS PREDICTION?</div>
        <div style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.65 }}>
          {intelligence.explanation}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: "green" | "orange" | "red" | "purple" | "blue" }) {
  const colorMap = {
    green: {
      bg: "rgba(34,197,94,0.12)",
      border: "1px solid rgba(34,197,94,0.25)",
      text: "#22c55e"
    },
    orange: {
      bg: "rgba(251,146,60,0.12)",
      border: "1px solid rgba(251,146,60,0.25)",
      text: "#fb923c"
    },
    red: {
      bg: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.25)",
      text: "#ef4444"
    },
    purple: {
      bg: "rgba(147,51,234,0.12)",
      border: "1px solid rgba(147,51,234,0.25)",
      text: "#a78bfa"
    },
    blue: {
      bg: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.25)",
      text: "#60a5fa"
    }
  };

  const style = colorMap[color];

  return (
    <div style={{ 
      padding: "14px 16px", 
      borderRadius: 10, 
      background: style.bg,
      border: style.border
    }}>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: style.text }}>
        {value}
      </div>
    </div>
  );
}
