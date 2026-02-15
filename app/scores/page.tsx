// app/scores/page.tsx
"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { analyzeEvent, type ComponentKey } from "@/lib/engine/analyzeEvent";
import { ComponentBreakdownCard, DivergenceBanner, SummaryStats } from "@/components/analysis/Breakdown";

function ScoresContent() {
  const searchParams = useSearchParams();
  const event = searchParams.get("event") || "Unknown Event";

  // weights (saved locally for now; later we persist)
  const [weights, setWeights] = useState<Record<ComponentKey, number>>({
    social: 40,
    news: 35,
    technical: 25,
  });

  const analysis = useMemo(() => analyzeEvent(event, weights), [event, weights]);

  function setWeight(key: ComponentKey, value: number) {
    // keep total = 100 by adjusting the others proportionally
    const next = { ...weights, [key]: value };
    const sum = next.social + next.news + next.technical;

    if (sum === 100) {
      setWeights(next);
      return;
    }

    // normalize to 100
    const scale = 100 / sum;
    const scaled = {
      social: Math.round(next.social * scale),
      news: Math.round(next.news * scale),
      technical: 100 - Math.round(next.social * scale) - Math.round(next.news * scale),
    };

    setWeights(scaled);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 20px" }}>
        <a href="/event" style={{ color: "#9CA3AF", fontSize: 13 }}>
          ← Back to Event
        </a>

        <h1 style={{ fontSize: 34, marginTop: 14 }}>Signal Analysis</h1>
        <div style={{ marginTop: 8, color: "#cbd5e1" }}>
          <b>Event:</b> {analysis.event}
        </div>

        <SummaryStats a={analysis} />

        <DivergenceBanner warnings={analysis.warnings} />

        {/* Directional cards */}
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(0, 255, 170, 0.08)",
              border: "1px solid rgba(0, 255, 170, 0.18)",
            }}
          >
            <div style={{ fontSize: 12, color: "#a7f3d0" }}>YES Confidence</div>
            <div style={{ fontSize: 44, fontWeight: 900, marginTop: 6, color: "#6ee7b7" }}>
              {analysis.directional.yes}%
            </div>
            <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 13 }}>
              Strength: <b>{analysis.directional.strengthLabel}</b> • Conviction: <b>{analysis.directional.convictionTier}</b>
            </div>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(255, 80, 80, 0.08)",
              border: "1px solid rgba(255, 80, 80, 0.18)",
            }}
          >
            <div style={{ fontSize: 12, color: "#fecaca" }}>NO Confidence</div>
            <div style={{ fontSize: 44, fontWeight: 900, marginTop: 6, color: "#fb7185" }}>
              {analysis.directional.no}%
            </div>
            <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 13 }}>
              Stability: <b>{analysis.directional.stabilityLabel}</b> • Volatility: <b>{analysis.directional.volatilityLabel}</b>
            </div>
          </div>
        </div>

        {/* Engine explanation */}
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            background: "rgba(80, 200, 255, 0.10)",
            border: "1px solid rgba(80, 200, 255, 0.20)",
            color: "#cbd5e1",
            lineHeight: 1.55,
          }}
        >
          <b style={{ color: "#67e8f9" }}>Model note:</b> {analysis.explanation}
        </div>

        {/* Weight controls */}
        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontWeight: 800 }}>Score Components</div>
          <div style={{ marginTop: 6, color: "#9CA3AF", fontSize: 13 }}>
            Adjust weights (auto-normalized to 100). This changes the overall + directional confidence.
          </div>

          <SliderRow
            label="Social weight"
            sub="X / community sentiment"
            value={weights.social}
            onChange={(v) => setWeight("social", v)}
          />
          <SliderRow
            label="News weight"
            sub="headlines / narratives"
            value={weights.news}
            onChange={(v) => setWeight("news", v)}
          />
          <SliderRow
            label="Technical weight"
            sub="price action / indicators"
            value={weights.technical}
            onChange={(v) => setWeight("technical", v)}
          />
        </div>

        {/* Contribution breakdown */}
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          <ComponentBreakdownCard component={analysis.components.social} />
          <ComponentBreakdownCard component={analysis.components.news} />
          <ComponentBreakdownCard component={analysis.components.technical} />
        </div>

        {/* Evidence Links */}
        <div style={{ marginTop: 28, padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 style={{ marginTop: 0 }}>Evidence Sources</h3>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Social Signals</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                <li><a href={`https://x.com/search?q=${encodeURIComponent(event)}&src=typed_query`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>X search</a></li>
                <li><a href={`https://x.com/search?q=${encodeURIComponent(event + " YES")}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>X: YES sentiment</a></li>
                <li><a href={`https://x.com/search?q=${encodeURIComponent(event + " NO")}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>X: NO sentiment</a></li>
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>News Coverage</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                <li><a href={`https://news.google.com/search?q=${encodeURIComponent(event)}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>Google News</a></li>
                <li><a href={`https://www.google.com/search?q=site:reuters.com+${encodeURIComponent(event)}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>Reuters coverage</a></li>
                <li><a href={`https://www.google.com/search?q=site:bloomberg.com+${encodeURIComponent(event)}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>Bloomberg coverage</a></li>
              </ul>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Technical Data</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
                <li><a href={`https://www.tradingview.com/search/?text=${encodeURIComponent(event)}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>TradingView charts</a></li>
                <li><a href={`https://coinmarketcap.com/search?q=${encodeURIComponent(event)}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>CoinMarketCap</a></li>
                <li><a href={`https://polymarket.com/search?q=${encodeURIComponent(event)}`} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>Polymarket</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#67e8f9", marginBottom: 8 }}>Phase 2.5 Complete ✅</div>
          <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>
            This engine now features: semantic event classification, per-component contribution tracking, signal divergence detection, volatility-adjusted directional bias, and mathematical stability metrics. Next: wire real data sources (X API, News RSS, Market data) while maintaining this explainability layer.
          </div>
        </div>

        <a href={`https://polymarket.com/search?q=${encodeURIComponent(event)}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 20, padding: "14px 20px", borderRadius: 12, background: "#00D4FF", color: "#001018", fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
          Trade on Polymarket →
        </a>
      </div>
    </main>
  );
}

function SliderRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontWeight: 700 }}>{label}</div>
          <div style={{ color: "#9ca3af", fontSize: 12 }}>{sub}</div>
        </div>
        <div style={{ fontWeight: 900, color: "#67e8f9" }}>{value}</div>
      </div>

      <input
        type="range"
        min={5}
        max={80}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: 8 }}
      />
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#070B10", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ScoresContent />
    </Suspense>
  );
}
