"use client";

export function ActiveSourcesBreakdown(props: any) {
  const sources = props.sources || [];
  const categoryWeights = props.categoryWeights || { news: 35, social: 40, technical: 25 };
  
  const enabledSources = sources.filter((s: any) => s.enabled);
  
  if (enabledSources.length === 0) {
    return null;
  }

  const customSourcesCount = enabledSources.filter((s: any) => !s.isDefault).length;

  // Group sources by category
  const newsSources = enabledSources.filter((s: any) => s.type === "news");
  const socialSources = enabledSources.filter((s: any) => s.type === "social");
  const technicalSources = enabledSources.filter((s: any) => s.type === "technical");

  // Calculate final percentages
  const calculateFinal = (source: any, categoryWeight: number) => {
    return ((source.weight / 100) * categoryWeight).toFixed(1);
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
              ? `Using ${enabledSources.length} sources (${customSourcesCount} custom)`
              : `Using ${enabledSources.length} default sources`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/sources" style={{ padding: "8px 14px", borderRadius: 6, background: "rgba(147,51,234,0.2)", border: "1px solid rgba(147,51,234,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Manage Sources</a>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 14px", borderRadius: 6, background: "#9333ea", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Re-analyze</button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {newsSources.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", marginBottom: 8 }}>
              News ({categoryWeights.news}% total weight):
            </div>
            <div style={{ paddingLeft: 16, display: "grid", gap: 6 }}>
              {newsSources.map((source: any) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>{source.isDefault ? "📋" : "✨"}</span>
                  <span style={{ fontWeight: 600 }}>{source.name}</span>
                  <span style={{ color: "#9ca3af" }}>
                    {source.weight}% of news = {calculateFinal(source, categoryWeights.news)}% total
                  </span>
                  {!source.isDefault && (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(147,51,234,0.2)", color: "#a78bfa", fontWeight: 600 }}>CUSTOM</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {socialSources.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", marginBottom: 8 }}>
              Social ({categoryWeights.social}% total weight):
            </div>
            <div style={{ paddingLeft: 16, display: "grid", gap: 6 }}>
              {socialSources.map((source: any) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>{source.isDefault ? "📋" : "✨"}</span>
                  <span style={{ fontWeight: 600 }}>{source.name}</span>
                  <span style={{ color: "#9ca3af" }}>
                    {source.weight}% of social = {calculateFinal(source, categoryWeights.social)}% total
                  </span>
                  {!source.isDefault && (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(147,51,234,0.2)", color: "#a78bfa", fontWeight: 600 }}>CUSTOM</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {technicalSources.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", marginBottom: 8 }}>
              Technical ({categoryWeights.technical}% total weight):
            </div>
            <div style={{ paddingLeft: 16, display: "grid", gap: 6 }}>
              {technicalSources.map((source: any) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>{source.isDefault ? "📋" : "✨"}</span>
                  <span style={{ fontWeight: 600 }}>{source.name}</span>
                  <span style={{ color: "#9ca3af" }}>
                    {source.weight}% of technical = {calculateFinal(source, categoryWeights.technical)}% total
                  </span>
                  {!source.isDefault && (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(147,51,234,0.2)", color: "#a78bfa", fontWeight: 600 }}>CUSTOM</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(147,51,234,0.2)", fontSize: 11, color: "#9ca3af", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>📋 = Default source</span>
        <span>✨ = Your custom source</span>
      </div>
    </div>
  );
}
