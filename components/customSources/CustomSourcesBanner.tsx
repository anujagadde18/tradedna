// components/customSources/CustomSourcesBanner.tsx
"use client";

import { useEffect, useState } from "react";
import { getCustomSourceSummary } from "@/lib/customSources/applyCustomSources";

type Summary = {
  total: number;
  byType: Record<"news" | "social" | "technical", number>;
};

export function CustomSourcesBanner() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const sum = getCustomSourceSummary();
    if (sum.total > 0) setSummary(sum);
  }, []);

  if (!summary || summary.total === 0) return null;

  const parts = [
    summary.byType.news > 0 ? `${summary.byType.news} news` : null,
    summary.byType.social > 0 ? `${summary.byType.social} social` : null,
    summary.byType.technical > 0 ? `${summary.byType.technical} technical` : null,
  ].filter(Boolean) as string[];

  return (
    <div
      style={{
        padding: "12px 20px",
        borderRadius: 10,
        background: "rgba(147,51,234,0.12)",
        border: "1px solid rgba(147,51,234,0.25)",
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⚙️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>
            Using {summary.total} Custom Source{summary.total === 1 ? "" : "s"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{parts.join(" • ")}</div>
        </div>
      </div>

      <a
        href="/sources"
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          background: "rgba(147,51,234,0.2)",
          border: "1px solid rgba(147,51,234,0.3)",
          color: "#a78bfa",
          fontSize: 12,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Manage Sources
      </a>
    </div>
  );
}

// Compact version for homepage
export function CustomSourcesPrompt() {
  const [hasCustom, setHasCustom] = useState(false);

  useEffect(() => {
    const sum = getCustomSourceSummary();
    setHasCustom(sum.total > 0);
  }, []);

  if (hasCustom) {
    return null; // Don't show prompt if they already have sources
  }

  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: 12,
        background: "rgba(59,130,246,0.08)",
        border: "1px solid rgba(59,130,246,0.2)",
        marginTop: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa", marginBottom: 4 }}>
          💡 Pro Tip: Add Your Own Data Sources
        </div>

        {/* Custom Sources Banner */}
        <CustomSourcesBanner />

        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Trust specific sources more? Add RSS feeds, Twitter accounts, and more.
        </div>
      </div>

      <a
        href="/sources"
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          background: "rgba(59,130,246,0.15)",
          border: "1px solid rgba(59,130,246,0.3)",
          color: "#60a5fa",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Add Sources →
      </a>
    </div>
  );
}
