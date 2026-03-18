// components/analysis/HistoricalSummary.tsx
"use client";

import { getBestComponent, getComponentAccuracy } from "@/lib/data/historicalAccuracy";

export function HistoricalAccuracySummary({ category }: { category: string }) {
  const best = getBestComponent(category);
  
  if (!best) return null;

  const allComponents = ["social", "news", "technical"] as const;
  const accuracies = allComponents.map(comp => ({
    name: comp,
    ...getComponentAccuracy(category, comp)
  })).filter(Boolean);

  return (
    <div style={{ 
      marginTop: 20, 
      padding: 20, 
      borderRadius: 12, 
      background: "rgba(255,255,255,0.02)", 
      border: "1px solid rgba(255,255,255,0.08)" 
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
          Historical Performance - {category} Events
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          Based on backtested data from similar prediction markets
        </div>
      </div>

      {/* Data Table */}
      <div style={{ display: "grid", gap: 2 }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>Signal Type</div>
          <div style={{ textAlign: "right" }}>Win Rate</div>
          <div style={{ textAlign: "right" }}>Sample Size</div>
        </div>

        {/* Rows */}
        {accuracies.map((acc, i) => {
          const isBest = acc.name === best.component;
          return (
            <div 
              key={i}
              style={{ 
                display: "grid", 
                gridTemplateColumns: "2fr 1fr 1fr", 
                padding: "10px 12px",
                background: isBest ? "rgba(16, 185, 129, 0.05)" : "transparent",
                borderLeft: isBest ? "2px solid #10b981" : "2px solid transparent",
                fontSize: 13
              }}
            >
              <div style={{ fontWeight: 600, color: "#e5e7eb" }}>
                {acc.name?.charAt(0).toUpperCase() + acc.name?.slice(1)}
                {isBest && <span style={{ marginLeft: 8, fontSize: 11, color: "#10b981" }}>* Best</span>}
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, color: acc.winRate && acc.winRate >= 65 ? "#10b981" : "#f59e0b" }}>
                {acc.winRate}%
              </div>
              <div style={{ textAlign: "right", color: "#9ca3af" }}>
                {acc.sampleSize}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      <div style={{ marginTop: 12, padding: 12, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: "#10b981", lineHeight: 1.5 }}>
          <strong>Recommendation:</strong> For {category} events, <strong>{best.component}</strong> signals have shown the highest accuracy ({best.winRate}%). Consider weighting this component higher.
        </div>
      </div>
    </div>
  );
}
