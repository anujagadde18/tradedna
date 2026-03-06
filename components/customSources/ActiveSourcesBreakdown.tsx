"use client";

export function ActiveSourcesBreakdown(props: any) {
  const sources = props.sources || [];
  const categoryWeights = props.categoryWeights || { news: 35, social: 40, technical: 25 };
  
  const enabledSources = sources.filter((s: any) => s.enabled);
  
  if (enabledSources.length === 0) {
    return null;
  }

  const customSourcesCount = enabledSources.filter((s: any) => !s.isDefault).length;

  return (
    <div style={{ marginBottom: 32, padding: 20, borderRadius: 12, background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#a78bfa", marginBottom: 6 }}>
            Sources Used in This Analysis
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            {customSourcesCount > 0 
              ? `Using ${enabledSources.length} sources (${customSourcesCount} custom)`
              : `Using ${enabledSources.length} default sources`}
          </div>
        </div>
        <a href="/sources" style={{ padding: "8px 14px", borderRadius: 6, background: "rgba(147,51,234,0.2)", border: "1px solid rgba(147,51,234,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Manage Sources</a>
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(147,51,234,0.2)", fontSize: 11, color: "#9ca3af" }}>
        <span>Custom sources are included in this analysis</span>
      </div>
    </div>
  );
}
