"use client";

import { CustomSource, CategoryWeight } from "@/lib/customSources/types";
import { calculateFinalWeights } from "@/lib/customSources/weightCalculator";

interface ActiveSourcesBreakdownProps {
  sources: CustomSource[];
  categoryWeights: CategoryWeight;
}

export function ActiveSourcesBreakdown({ sources, categoryWeights }: ActiveSourcesBreakdownProps) {
  const enabledSources = sources.filter(s => s.enabled);
  
  if (enabledSources.length === 0) {
    return null;
  }

  const finalWeights = calculateFinalWeights(enabledSources, categoryWeights);

  const newsSources = finalWeights.filter(w => w.source.type === "news");
  const socialSources = finalWeights.filter(w => w.source.type === "social");
  const technicalSources = finalWeights.filter(w => w.source.type === "technical");

  const customSourcesCount = enabledSources.filter(s => !s.isDefault).length;

  return (
    <div style={{ 
      marginBottom: 32,
      padding: 20,
      borderRadius: 12,
      background: "rgba(147,51,234,0.08)",
      border: "1px solid rgba(147,51,234,0.25)"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "start",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 12
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#a78bfa", marginBottom: 6 }}>
            Sources Used in This Analysis
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            {customSourcesCount > 0 
              ? `Using ${enabledSources.length} sources (${customSourcesCount} custom)`
              : `Using ${enabledSources.length} default sources`
            }
          </div>
        </div>
        
          href="/sources"
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            background: "rgba(147,51,234,0.2)",
            border: "1px solid rgba(147,51,234,0.3)",
            color: "#a78bfa",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap"
          }}
        >
          Manage Sources
        </a>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {newsSources.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e4e4e7", marginBottom: 8 }}>
              News ({categoryWeights.news}% total weight):
            </div>
            <div style={{ paddingLeft: 16, display: "grid", gap: 6 }}>
              {newsSources.map(({ source, sourceWeight, finalWeight }) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{source.isDefault ? "Default" : "Custom"}</span>
                  <span>{source.name}</span>
                  <span style={{ color: "#9ca3af" }}>
                    ({sourceWeight}% of news = {finalWeight}% total)
                  </span>
                  {!source.isDefault && (
                    <span style={{ 
                      fontSize: 10, 
                      padding: "2px 6px", 
                      borderRadius: 4, 
                      background: "rgba(147,51,234,0.2)",
                      color: "#a78bfa",
                      fontWeight: 600
                    }}>
                      CUSTOM
                    </span>
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
              {socialSources.map(({ source, sourceWeight, finalWeight }) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{source.isDefault ? "Default" : "Custom"}</span>
                  <span>{source.name}</span>
                  <span style={{ color: "#9ca3af" }}>
                    ({sourceWeight}% of social = {finalWeight}% total)
                  </span>
                  {!source.isDefault && (
                    <span style={{ 
                      fontSize: 10, 
                      padding: "2px 6px", 
                      borderRadius: 4, 
                      background: "rgba(147,51,234,0.2)",
                      color: "#a78bfa",
                      fontWeight: 600
                    }}>
                      CUSTOM
                    </span>
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
              {technicalSources.map(({ source, sourceWeight, finalWeight }) => (
                <div key={source.id} style={{ fontSize: 13, color: "#d4d4d8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{source.isDefault ? "Default" : "Custom"}</span>
                  <span>{source.name}</span>
                  <span style={{ color: "#9ca3af" }}>
                    ({sourceWeight}% of technical = {finalWeight}% total)
                  </span>
                  {!source.isDefault && (
                    <span style={{ 
                      fontSize: 10, 
                      padding: "2px 6px", 
                      borderRadius: 4, 
                      background: "rgba(147,51,234,0.2)",
                      color: "#a78bfa",
                      fontWeight: 600
                    }}>
                      CUSTOM
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: 14, 
        paddingTop: 14, 
        borderTop: "1px solid rgba(147,51,234,0.2)",
        fontSize: 11,
        color: "#9ca3af",
        display: "flex",
        gap: 16,
        flexWrap: "wrap"
      }}>
        <span>Default = Built-in source</span>
        <span>Custom = Your added source</span>
      </div>
    </div>
  );
}
