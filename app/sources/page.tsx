"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type SourceType = "news" | "social" | "technical";

type CustomSource = {
  id: string;
  type: SourceType;
  name: string;
  url: string;
  weight: number;
  enabled: boolean;
};

function SourcesContent() {
  const router = useRouter();
  const [customSources, setCustomSources] = useState<CustomSource[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("news");
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAddedSource, setLastAddedSource] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("customSources");
    if (saved) {
      setCustomSources(JSON.parse(saved));
    }
  }, []);

  const saveSources = (sources: CustomSource[]) => {
    setCustomSources(sources);
    localStorage.setItem("customSources", JSON.stringify(sources));
  };

  const addSource = (source: CustomSource) => {
    saveSources([...customSources, source]);
    setShowAddModal(false);
    setLastAddedSource(source.name);
    setShowSuccess(true);
    
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  };

  const removeSource = (id: string) => {
    saveSources(customSources.filter(s => s.id !== id));
  };

  const toggleSource = (id: string) => {
    saveSources(customSources.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const updateWeight = (id: string, weight: number) => {
    saveSources(customSources.map(s => 
      s.id === id ? { ...s, weight } : s
    ));
  };

  const newsSources = customSources.filter(s => s.type === "news");
  const socialSources = customSources.filter(s => s.type === "social");
  const technicalSources = customSources.filter(s => s.type === "technical");

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

        {/* Success Message */}
        {showSuccess && (
          <div style={{
            position: "fixed",
            top: 80,
            right: 24,
            left: 24,
            zIndex: 1000,
            maxWidth: 500,
            margin: "0 auto",
            padding: "16px 20px",
            borderRadius: 12,
            background: "rgba(34,197,94,0.95)",
            border: "1px solid rgba(34,197,94,0.4)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  ✅ Source Added Successfully!
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                  {lastAddedSource} will be used in all future analyses
                </div>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: 18,
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <a 
              href="/" 
              style={{ 
                color: "#9ca3af", 
                fontSize: 14, 
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
            >
              ← Home
            </a>
            
            <button
              onClick={() => router.push("/event")}
              style={{ 
                padding: "8px 16px", 
                borderRadius: 8, 
                background: "#9333ea", 
                border: "none", 
                color: "#fff", 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: "pointer" 
              }}
            >
              Analyze Event
            </button>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px 0" }}>
            Custom Data Sources
          </h1>
          <p style={{ fontSize: 15, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>
            Add your trusted sources. They'll be used in all future analyses.
          </p>
        </div>

        {/* Beta Badge */}
        <div style={{ marginBottom: 32, padding: 16, borderRadius: 12, background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.2)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 6 }}>
            🆕 BETA FEATURE
          </div>
          <div style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.6 }}>
            This feature is in beta. Currently supports RSS feeds, Twitter accounts, and Reddit communities. More integrations coming soon!
          </div>
        </div>

        {/* News Sources */}
        <SourceSection
          title="📰 News Sources"
          description="RSS feeds, blogs, news outlets"
          sources={newsSources}
          defaultSources={[
            { name: "Google News", weight: 35, enabled: true }
          ]}
          onAdd={() => { setSourceType("news"); setShowAddModal(true); }}
          onRemove={removeSource}
          onToggle={toggleSource}
          onUpdateWeight={updateWeight}
        />

        {/* Social Sources */}
        <SourceSection
          title="🗣️ Social Sources"
          description="Twitter accounts, Reddit, Discord, Telegram"
          sources={socialSources}
          defaultSources={[
            { name: "Twitter/Reddit (Default)", weight: 40, enabled: true }
          ]}
          onAdd={() => { setSourceType("social"); setShowAddModal(true); }}
          onRemove={removeSource}
          onToggle={toggleSource}
          onUpdateWeight={updateWeight}
        />

        {/* Technical Sources */}
        <SourceSection
          title="📊 Technical Sources"
          description="Market data, charts, custom APIs"
          sources={technicalSources}
          defaultSources={[
            { name: "Polymarket Odds", weight: 50, enabled: true },
            { name: "TradingView (crypto)", weight: 25, enabled: true }
          ]}
          onAdd={() => { setSourceType("technical"); setShowAddModal(true); }}
          onRemove={removeSource}
          onToggle={toggleSource}
          onUpdateWeight={updateWeight}
        />

        {/* How It Works */}
        <div style={{ marginTop: 40, padding: 24, borderRadius: 12, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#60a5fa", marginBottom: 14 }}>
            💡 How Custom Sources Work
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#d4d4d8", lineHeight: 1.8 }}>
            <li>Add your trusted RSS feeds, Twitter accounts, or subreddits</li>
            <li>Set a weight for each source (how much you trust it)</li>
            <li>We'll fetch and analyze data from your sources in real-time</li>
            <li>Combined with our default sources for complete analysis</li>
            <li>Your sources are saved and used for all future predictions</li>
          </ul>
        </div>

        {/* Examples */}
        <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7", marginBottom: 12 }}>
            📝 Example Sources You Can Add
          </div>
          <div style={{ display: "grid", gap: 10, fontSize: 13, color: "#9ca3af" }}>
            <div>• <strong>News:</strong> https://www.reuters.com/world/middle-east</div>
            <div>• <strong>Twitter:</strong> @Reuters, @AP, @BBCBreaking</div>
            <div>• <strong>Reddit:</strong> r/geopolitics, r/Polymarket</div>
          </div>
        </div>

      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <AddSourceModal
          type={sourceType}
          onAdd={addSource}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </main>
  );
}

function SourceSection({ 
  title, 
  description, 
  sources, 
  defaultSources,
  onAdd, 
  onRemove, 
  onToggle, 
  onUpdateWeight 
}: {
  title: string;
  description: string;
  sources: CustomSource[];
  defaultSources: { name: string; weight: number; enabled: boolean }[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdateWeight: (id: string, weight: number) => void;
}) {
  return (
    <div style={{ marginBottom: 32, padding: 24, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#e4e4e7", marginBottom: 6 }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            {description}
          </div>
        </div>
        <button
          onClick={onAdd}
          style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(147,51,234,0.15)", border: "1px solid rgba(147,51,234,0.3)", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Add Source
        </button>
      </div>

      {/* Default Sources */}
      <div style={{ marginBottom: sources.length > 0 ? 16 : 0 }}>
        {defaultSources.map((source, i) => (
          <div key={i} style={{ padding: "12px 16px", marginBottom: 8, borderRadius: 10, background: "rgba(147,51,234,0.05)", border: "1px solid rgba(147,51,234,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(147,51,234,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  ✓
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7" }}>{source.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Default source (always enabled)</div>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#a78bfa" }}>{source.weight}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Sources */}
      {sources.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "#71717a", fontSize: 13 }}>
          No custom sources yet. Click "+ Add Source" to get started.
        </div>
      ) : (
        <div>
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onRemove={() => onRemove(source.id)}
              onToggle={() => onToggle(source.id)}
              onUpdateWeight={(weight) => onUpdateWeight(source.id, weight)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceCard({ source, onRemove, onToggle, onUpdateWeight }: {
  source: CustomSource;
  onRemove: () => void;
  onToggle: () => void;
  onUpdateWeight: (weight: number) => void;
}) {
  return (
    <div style={{ 
      padding: "14px 16px", 
      marginBottom: 10, 
      borderRadius: 10, 
      background: source.enabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)", 
      border: source.enabled ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.04)",
      opacity: source.enabled ? 1 : 0.5
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7", marginBottom: 4 }}>
            {source.name}
          </div>
          <div style={{ fontSize: 12, color: "#71717a", wordBreak: "break-all" }}>
            {source.url}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
          <button
            onClick={onToggle}
            style={{ padding: "6px 12px", borderRadius: 6, background: source.enabled ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: source.enabled ? "#22c55e" : "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {source.enabled ? "ON" : "OFF"}
          </button>
          <button
            onClick={onRemove}
            style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      </div>

      {source.enabled && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Trust Weight</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#9333ea" }}>{source.weight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={source.weight}
            onChange={(e) => onUpdateWeight(Number(e.target.value))}
            style={{ 
              width: "100%", 
              height: 6, 
              borderRadius: 3, 
              background: `linear-gradient(to right, #9333ea 0%, #9333ea ${source.weight}%, rgba(255,255,255,0.08) ${source.weight}%, rgba(255,255,255,0.08) 100%)`,
              cursor: "pointer",
              WebkitAppearance: "none",
              appearance: "none"
            }}
          />
        </div>
      )}
    </div>
  );
}

function AddSourceModal({ type, onAdd, onClose }: {
  type: SourceType;
  onAdd: (source: CustomSource) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [weight, setWeight] = useState(50);

  const handleSubmit = () => {
    if (!name || !url) {
      alert("Please fill in all fields");
      return;
    }

    onAdd({
      id: Date.now().toString(),
      type,
      name,
      url,
      weight,
      enabled: true
    });
  };

  const placeholders = {
    news: "https://www.reuters.com/world/middle-east",
    social: "@Reuters or r/geopolitics",
    technical: "https://api.example.com/data"
  };

  const examples = {
    news: ["Reuters Middle East", "Bloomberg Markets", "CoinDesk News"],
    social: ["@Reuters", "r/geopolitics", "@AP"],
    technical: ["Custom API", "Trading Signals", "Price Alerts"]
  };

  return (
    <div style={{ 
      position: "fixed", 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: "rgba(0,0,0,0.8)", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px"
    }}>
      <div style={{ 
        maxWidth: 500, 
        width: "100%",
        background: "#1a1f2e", 
        borderRadius: 16, 
        padding: 28,
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#e4e4e7", marginBottom: 8 }}>
          Add {type === "news" ? "News" : type === "social" ? "Social" : "Technical"} Source
        </div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>
          Add a custom data source to improve your predictions
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#d4d4d8", marginBottom: 8 }}>
            Source Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={examples[type][0]}
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              borderRadius: 8, 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              color: "#fff", 
              fontSize: 14,
              outline: "none"
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#d4d4d8", marginBottom: 8 }}>
            URL or Handle
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholders[type]}
            style={{ 
              width: "100%", 
              padding: "10px 12px", 
              borderRadius: 8, 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              color: "#fff", 
              fontSize: 14,
              outline: "none"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#d4d4d8" }}>
              Trust Weight
            </label>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#9333ea" }}>{weight}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            style={{ 
              width: "100%", 
              height: 8, 
              borderRadius: 4, 
              background: `linear-gradient(to right, #9333ea 0%, #9333ea ${weight}%, rgba(255,255,255,0.08) ${weight}%, rgba(255,255,255,0.08) 100%)`,
              cursor: "pointer",
              WebkitAppearance: "none",
              appearance: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleSubmit}
            style={{ 
              flex: 1,
              padding: "12px", 
              borderRadius: 8, 
              background: "#9333ea", 
              border: "none", 
              color: "#fff", 
              fontSize: 14, 
              fontWeight: 600, 
              cursor: "pointer" 
            }}
          >
            Add Source
          </button>
          <button
            onClick={onClose}
            style={{ 
              flex: 1,
              padding: "12px", 
              borderRadius: 8, 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              color: "#9ca3af", 
              fontSize: 14, 
              fontWeight: 600, 
              cursor: "pointer" 
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SourcesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Loading...</div>
      </div>
    }>
      <SourcesContent />
    </Suspense>
  );
}
