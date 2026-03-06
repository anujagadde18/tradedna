"use client";

interface SourceCardProps {
  source: any;
  categoryWeight: number;
  onRemove: () => void;
  onToggle: () => void;
  onWeightChange: (weight: number) => void;
}

export function SourceCard({ source, categoryWeight, onRemove, onToggle, onWeightChange }: SourceCardProps) {
  const finalPercentage = ((source.weight / 100) * categoryWeight).toFixed(1);
  
  return (
    <div style={{ 
      padding: "14px 16px", 
      marginBottom: 10, 
      borderRadius: 10, 
      background: source.enabled ? "rgba(147,51,234,0.08)" : "rgba(255,255,255,0.02)", 
      border: source.enabled ? "1px solid rgba(147,51,234,0.2)" : "1px solid rgba(255,255,255,0.06)",
      opacity: source.enabled ? 1 : 0.5,
      transition: "all 0.2s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: source.enabled ? 12 : 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>
              {source.name}
            </div>
            {source.isDefault && (
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontWeight: 600 }}>DEFAULT</span>
            )}
          </div>
          {source.description && (
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
              {source.description}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#71717a", wordBreak: "break-all" }}>
            {source.url}
          </div>
        </div>
        
        <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
          <button onClick={onToggle} style={{ padding: "6px 12px", borderRadius: 6, background: source.enabled ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", border: source.enabled ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.1)", color: source.enabled ? "#22c55e" : "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
            {source.enabled ? "ON" : "OFF"}
          </button>
          
          {!source.isDefault && (
            <button onClick={onRemove} style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {source.enabled && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Weight within category</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#9333ea" }}>{source.weight}%</span>
              <span style={{ fontSize: 11, color: "#71717a" }}>=</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{finalPercentage}% total</span>
            </div>
          </div>
          <input type="range" min={0} max={100} step={5} value={source.weight} onChange={(e) => onWeightChange(Number(e.target.value))} style={{ width: "100%", height: 6, borderRadius: 3, background: `linear-gradient(to right, #9333ea 0%, #9333ea ${source.weight}%, rgba(255,255,255,0.08) ${source.weight}%, rgba(255,255,255,0.08) 100%)`, cursor: "pointer", WebkitAppearance: "none", appearance: "none" }} />
          <div style={{ fontSize: 11, color: "#71717a", marginTop: 6 }}>
            {source.isDefault 
              ? "This source auto-balances with others in this category"
              : `This source gets ${finalPercentage}% of your final prediction`
            }
          </div>
        </div>
      )}
    </div>
  );
}
