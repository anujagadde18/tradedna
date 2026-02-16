// components/ui/EnhancedUI.tsx
"use client";

import type { EnhancedAnalysisOutput } from "@/lib/engine/analyzeEventWithData";

export function PlainEnglishSummary({ analysis }: { analysis: EnhancedAnalysisOutput }) {
  const direction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;
  const conviction = analysis.directional.convictionTier.toLowerCase();
  const stability = analysis.directional.stabilityLabel.toLowerCase();
  
  // Determine primary signal
  const scores = {
    social: analysis.components.social.final,
    news: analysis.components.news.final,
    technical: analysis.components.technical.final,
  };
  const primary = Object.entries(scores).sort(([,a], [,b]) => b - a)[0][0];
  
  const summary = `Model suggests ${conviction} ${direction} bias (${confidence}%) based on ${primary === 'social' ? 'strong social signals' : primary === 'news' ? 'significant news coverage' : 'technical indicators'} with ${stability} stability.`;
  
  return (
    <div style={{ 
      marginTop: 12, 
      padding: 14, 
      borderRadius: 12, 
      background: "rgba(100, 116, 139, 0.1)", 
      border: "1px solid rgba(100, 116, 139, 0.3)" 
    }}>
      <div style={{ 
        fontSize: 14, 
        lineHeight: 1.6, 
        color: "#e2e8f0",
        fontWeight: 500
      }}>
        {summary}
      </div>
    </div>
  );
}

export function ConfidenceMeter({ yesPercent, noPercent }: { yesPercent: number; noPercent: number }) {
  return (
    <div style={{ marginTop: 16, padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>
          NO {noPercent}%
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          ← Neutral (50%) →
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>
          YES {yesPercent}%
        </div>
      </div>
      
      {/* Horizontal meter */}
      <div style={{ position: "relative", height: 32, borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
        {/* NO side (red) */}
        <div 
          style={{ 
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "50%",
            background: "linear-gradient(to right, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.1))",
          }}
        />
        
        {/* YES side (green) */}
        <div 
          style={{ 
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "50%",
            background: "linear-gradient(to left, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.1))",
          }}
        />
        
        {/* Center line */}
        <div 
          style={{ 
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 2,
            background: "#6b7280",
            transform: "translateX(-1px)",
          }}
        />
        
        {/* Confidence marker */}
        <div 
          style={{ 
            position: "absolute",
            left: `${yesPercent}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: yesPercent > 50 ? "#10b981" : "#ef4444",
            border: "3px solid #070B10",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.2)",
          }}
        />
      </div>
      
      <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
        Confidence skews {Math.abs(yesPercent - 50).toFixed(0)} points toward {yesPercent > 50 ? "YES" : "NO"}
      </div>
    </div>
  );
}

export function SimplifiedMetrics({ analysis }: { analysis: EnhancedAnalysisOutput }) {
  const [showAll, setShowAll] = useState(false);
  
  const primaryMetrics = [
    { label: "Category", value: `${analysis.category.name} (${analysis.category.confidence}%)` },
    { label: "Overall", value: `${analysis.overall}%` },
    { label: "Conviction", value: analysis.directional.convictionTier },
  ];
  
  const secondaryMetrics = [
    { label: "Std Dev", value: analysis.stats.stdDev },
    { label: "Stability", value: `${analysis.stats.stability}% (${analysis.directional.stabilityLabel})` },
    { label: "Volatility", value: `${analysis.stats.volatility}% (${analysis.directional.volatilityLabel})` },
  ];
  
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {primaryMetrics.map((m, i) => (
          <Badge key={i} label={m.label} value={m.value} />
        ))}
        
        {showAll && secondaryMetrics.map((m, i) => (
          <Badge key={i} label={m.label} value={m.value} secondary />
        ))}
        
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#9ca3af",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {showAll ? "Show less" : "Show details"}
        </button>
      </div>
    </div>
  );
}

function Badge({ label, value, secondary }: { label: string; value: string | number; secondary?: boolean }) {
  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: secondary ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
        border: `1px solid ${secondary ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)"}`,
        fontSize: 12,
        color: "#d1d5db",
      }}
    >
      <span style={{ color: "#9ca3af" }}>{label}:</span>{" "}
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

import { useState } from "react";
