"use client";

export function ActiveSourcesBreakdown(props: any) {
  const sources = props.sources || [];
  const categoryWeights = props.categoryWeights || { news: 35, social: 40, technical: 25 };
  
  const enabledSources = sources.filter((s: any) => s.enabled);
  
  if (enabledSources.length === 0) {
    return null;
  }

  const customSourcesCount = enabledSources.filter((s: any) => !s.isDefault).length;
  const hasCustomChanges = customSourcesCount > 0 || enabledSources.length !== 3;

  // Group sources by category
  const newsSources = enabledSources.filter((s: any) => s.type === "news");
  const socialSources = enabledSources.filter((s: any) => s.type === "social");
  const technicalSources = enabledSources.filter((s: any) => s.type === "technical");

  // Calculate final percentages (simplified display)
  const calculateFinal = (source: any, categoryWeight: number) => {
    return Math.round((source.weight / 100) * categoryWeight);
  };

  return (
    <div style={{ marginBottom: 32, padding: 20, borderRadius: 12, background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#a78bfa", marginBottom: 6 }}>
            Sources Used in This Analysis
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            {customSourcesCount > 0 
              ? `${enabledSources.length} sources (${customSourcesCount} custom)`
              : `${enabledSources.length} default sources`}
          </div>
          {hasCustomChanges && (
            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", display: "inline-block" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#22c55e" }}>
                Using your custom configuration
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/sources" style={{ padding: "8px 14px", borderRadius: 6, background: "rgba(147,51,234,0.2)", border: "1px solid rgba(147,51,234,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Manage Sources</a>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 14px", borderRadius: 6, background: "#9333ea", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Refresh Analysis</button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {newsSources.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              News Sources:
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {newsSources.map((source: any) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{source.isDefault ? "📋" : "✨"}</span>
                  <span style={{ fontWeight: 600 }}>{source.name}</span>
                  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "rgba(147,51,234,0.15)", color: "#a78bfa", fontWeight: 700 }}>
                    {calculateFinal(source, categoryWeights.news)}%
                  </span>
                  {!source.isDefault && (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 600 }}>CUSTOM</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {socialSources.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Social Sources:
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {socialSources.map((source: any) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{source.isDefault ? "📋" : "✨"}</span>
                  <span style={{ fontWeight: 600 }}>{source.name}</span>
                  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 700 }}>
                    {calculateFinal(source, categoryWeights.social)}%
                  </span>
                  {!source.isDefault && (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 600 }}>CUSTOM</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {technicalSources.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Technical Sources:
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {technicalSources.map((source: any) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{source.isDefault ? "📋" : "✨"}</span>
                  <span style={{ fontWeight: 600 }}>{source.name}</span>
                  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "rgba(16,185,129,0.15)", color: "#10b981", fontWeight: 700 }}>
                    {calculateFinal(source, categoryWeights.technical)}%
                  </span>
                  {!source.isDefault && (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 600 }}>CUSTOM</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(147,51,234,0.2)", fontSize: 11, color: "#71717a", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>📋 Default</span>
        <span>✨ Your custom source</span>
        <span>Percentages show final weight in prediction</span>
      </div>
    </div>
  );
}
