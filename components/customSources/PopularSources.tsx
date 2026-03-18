// components/customSources/PopularSources.tsx
"use client";

import { CuratedSource, CustomSource } from "@/lib/customSources/types";

interface PopularSourcesProps {
  curatedSources: CuratedSource[];
  existingSources: CustomSource[];
  onAdd: (source: CuratedSource) => void;
}

export function PopularSources({ curatedSources, existingSources, onAdd }: PopularSourcesProps) {
  const existingUrls = new Set(existingSources.map(s => s.url));
  
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", marginBottom: 12 }}>
         POPULAR SOURCES
      </div>
      
      <div style={{ display: "grid", gap: 10 }}>
        {curatedSources.map((source, index) => {
          const alreadyAdded = existingUrls.has(source.url);
          
          return (
            <div 
              key={index}
              style={{ 
                padding: "12px 14px", 
                borderRadius: 10, 
                background: "rgba(255,255,255,0.02)", 
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7", marginBottom: 3 }}>
                  {source.name}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {source.description}
                </div>
              </div>
              
              <button
                onClick={() => onAdd(source)}
                disabled={alreadyAdded}
                style={{ 
                  padding: "8px 16px", 
                  borderRadius: 8, 
                  background: alreadyAdded ? "rgba(255,255,255,0.05)" : "rgba(147,51,234,0.15)", 
                  border: alreadyAdded ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(147,51,234,0.3)", 
                  color: alreadyAdded ? "#71717a" : "#a78bfa", 
                  fontSize: 13, 
                  fontWeight: 600, 
                  cursor: alreadyAdded ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s"
                }}
              >
                {alreadyAdded ? "ok Added" : "+ Add"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
