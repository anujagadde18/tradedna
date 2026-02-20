"use client";

import type {
  AnalysisOutput,
  ComponentBreakdown,
  DivergenceWarning,
  ComponentKey,
} from "@/lib/engine/analyzeEvent";
import { getComponentAccuracy } from "@/lib/data/historicalAccuracy";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#d1d5db",
      }}
    >
      {children}
    </span>
  );
}

export function DivergenceBanner({ warnings }: { warnings: DivergenceWarning[] }) {
  const top = warnings.find((w) => w.level === "critical")
    ?? warnings.find((w) => w.level === "warning")
    ?? warnings[0];

  const color =
    top?.level === "critical" ? "rgba(255, 80, 80, 0.18)" :
    top?.level === "warning" ? "rgba(255, 200, 80, 0.14)" :
    "rgba(80, 200, 255, 0.12)";

  const border =
    top?.level === "critical" ? "1px solid rgba(255, 80, 80, 0.35)" :
    top?.level === "warning" ? "1px solid rgba(255, 200, 80, 0.28)" :
    "1px solid rgba(80, 200, 255, 0.22)";

  if (!top) return null;

  return (
    <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: color, border }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ fontSize: 14 }}>{top.title}</strong>
        <Badge>{top.level.toUpperCase()}</Badge>
        {top.metrics?.divergence !== undefined && <Badge>Spread: {top.metrics.divergence} pts</Badge>}
        {top.metrics?.stability !== undefined && <Badge>Stability: {top.metrics.stability}%</Badge>}
      </div>
      <div style={{ marginTop: 8, color: "#cbd5e1", lineHeight: 1.5 }}>{top.detail}</div>
    </div>
  );
}

function ContributionRow({ reason, impact, tag }: { reason: string; impact: number; tag?: string }) {
  const sign = impact >= 0 ? "+" : "";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 10px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ color: "#cbd5e1", fontSize: 13 }}>
        <div style={{ fontWeight: 600, color: "#e5e7eb" }}>{reason}</div>
        {tag ? <div style={{ marginTop: 2, fontSize: 12, color: "#9ca3af" }}>{tag}</div> : null}
      </div>
      <div style={{ fontWeight: 700, color: impact >= 0 ? "#67e8f9" : "#fb7185" }}>
        {sign}{impact}
      </div>
    </div>
  );
}

export function ComponentBreakdownCard({ component, category }: { component: ComponentBreakdown; category?: string }) {
  const componentType = component.key as "social" | "news" | "technical";
  const accuracy = category ? getComponentAccuracy(category, componentType) : null;
  const adjustmentValue = component.final - component.base;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{component.label}</div>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{component.final}%</div>
      </div>

      {accuracy && (
        <div style={{ marginTop: 10, padding: 8, background: accuracy.winRate >= 65 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", borderRadius: 8, border: accuracy.winRate >= 65 ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: accuracy.winRate >= 65 ? "#10b981" : "#f59e0b", marginBottom: 3 }}>
            Historical Win Rate: {accuracy.winRate}%
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>
            Based on {accuracy.sampleSize} {category} events
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Badge>Base: {component.base}</Badge>
        <Badge>Adj: {adjustmentValue >= 0 ? "+" : ""}{adjustmentValue}</Badge>
        <Badge>Final: {component.final}</Badge>
      </div>

      {component.contributions && component.contributions.length > 0 && (
        <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
          {component.contributions.map((c, i) => (
            <ContributionRow key={i} reason={c.reason} impact={c.impact} tag={c.tag} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SummaryStats({ a }: { a: AnalysisOutput }) {
  return (
    <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <Badge>Category: {a.category.name} ({a.category.confidence}%)</Badge>
      <Badge>Overall: {a.overall}%</Badge>
      <Badge>Std Dev: {a.stats.stdDev}</Badge>
      <Badge>Stability: {a.stats.stability}% ({a.directional.stabilityLabel})</Badge>
      <Badge>Volatility: {a.stats.volatility}% ({a.directional.volatilityLabel})</Badge>
      <Badge>Conviction: {a.directional.convictionTier}</Badge>
    </div>
  );
}
