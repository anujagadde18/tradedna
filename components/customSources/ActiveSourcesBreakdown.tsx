"use client";

export function ActiveSourcesBreakdown({ sources, categoryWeights }: any) {
  const enabledSources = sources.filter((s: any) => s.enabled);
  
  if (enabledSources.length === 0) {
    return null;
  }

  const customSourcesCount = enabledSources.filter((s: any) => !s.isDefault).length;

  return (
    <div style={{ marginBottom: 32, padding: 20, borderRadius: 12, background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.25)" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#a78bfa", marginBottom: 6 }}>
          Sources Used in This Analysis
        </div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          {customSourcesCount > 0 ? `Using ${enabledSources.length} sources (${customSourcesCount} custom)` : `Using ${enabledSources.length} default sources`}
        </div>
      </div>
    </div>
  );
}
