"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadSources, saveSources, addSource, removeSource, toggleSource, updateSourceWeight, getSourcesByType } from "@/lib/customSources/sourceManager";
import { CURATED_SOURCES } from "@/lib/customSources/curatedSources";
import { SourceCard } from "@/components/customSources/SourceCard";
import { PopularSources } from "@/components/customSources/PopularSources";

function SourcesContent() {
  const router = useRouter();
  const [sources, setSources] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<"news" | "social" | "technical">("news");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const categoryWeights = { news: 35, social: 40, technical: 25 };

  useEffect(() => {
    setSources(loadSources());
  }, []);

  const handleAddCurated = (type: "news" | "social" | "technical", curatedSource: any) => {
    const newSource = {
      type,
      name: curatedSource.name,
      url: curatedSource.url,
      description: curatedSource.description
    };
    
    const updated = addSource(sources, newSource);
    setSources(updated);
    
    const categorySources = updated.filter((s: any) => s.type === type && s.enabled);
    const addedSource = categorySources.find((s: any) => s.name === curatedSource.name);
    const finalPercentage = addedSource ? ((addedSource.weight / 100) * categoryWeights[type]).toFixed(1) : "0";
    
    setSuccessMessage(`${curatedSource.name} added! Now gets ${addedSource?.weight}% of ${type} = ${finalPercentage}% of final prediction.`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 8000);
  };

  const handleRemove = (sourceId: string) => {
    const updated = removeSource(sources, sourceId);
    setSources(updated);
  };

  const handleToggle = (sourceId: string) => {
    const updated = toggleSource(sources, sourceId);
    setSources(updated);
  };

  const handleWeightChange = (sourceId: string, weight: number) => {
    const updated = updateSourceWeight(sources, sourceId, weight);
    setSources(updated);
  };

  const handleAddCustom = (type: "news" | "social" | "technical", name: string, url: string) => {
    const newSource = { type, name, url, description: "Custom source" };
    const updated = addSource(sources, newSource);
    setSources(updated);
    setShowAddModal(false);
    
    const categorySources = updated.filter((s: any) => s.type === type && s.enabled);
    const addedSource = categorySources.find((s: any) => s.name === name);
    const finalPercentage = addedSource ? ((addedSource.weight / 100) * categoryWeights[type]).toFixed(1) : "0";
    
    setSuccessMessage(`${name} added! Now gets ${addedSource?.weight}% of ${type} = ${finalPercentage}% of final prediction.`);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 8000);
  };

  const newsSources = getSourcesByType(sources, "news");
  const socialSources = getSourcesByType(sources, "social");
  const technicalSources = getSourcesByType(sources, "technical");

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {showSuccess && (
          <div style={{ position: "fixed", top: 80, right: 24, left: 24, zIndex: 1000, maxWidth: 500, margin: "0 auto", padding: "16px 20px", borderRadius: 12, background: "rgba(34,197,94,0.95)", border: "1px solid rgba(34,197,94,0.4)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Success!</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{successMessage}</div>
              </div>
              <button onClick={() => setShowSuccess(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>X</button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <a href="/" style={{ color: "#9ca3af", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>Back to Home</a>
            <button onClick={() => router.push("/event")} style={{ padding: "8px 16px", borderRadius: 8, background: "#9333ea", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Analyze Event</button>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px 0" }}>Custom Data Sources</h1>
          <p style={{ fontSize: 15, color: "#9ca3af", margin: 0, lineHeight: 1.6 }}>Add your trusted sources. Weights auto-balance within each category.</p>
        </div>

        <div style={{ marginBottom: 32, padding: 16, borderRadius: 12, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 8 }}>How It Works</div>
          <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.7 }}>Sources within each category split the category's total weight. For example, if News is 35% and you have 2 news sources at 50% each, they each get 17.5% of the final prediction.</div>
        </div>

        <CategorySection title="News Sources" description="RSS feeds, blogs, news outlets" sources={newsSources} curatedSources={CURATED_SOURCES.news} type="news" categoryWeight={categoryWeights.news} onAdd={(source: any) => handleAddCurated("news", source)} onRemove={handleRemove} onToggle={handleToggle} onWeightChange={handleWeightChange} onAddCustomClick={() => { setModalType("news"); setShowAddModal(true); }} />

        <CategorySection title="Social Sources" description="Twitter accounts, Reddit, Discord, Telegram" sources={socialSources} curatedSources={CURATED_SOURCES.social} type="social" categoryWeight={categoryWeights.social} onAdd={(source: any) => handleAddCurated("social", source)} onRemove={handleRemove} onToggle={handleToggle} onWeightChange={handleWeightChange} onAddCustomClick={() => { setModalType("social"); setShowAddModal(true); }} />

        <CategorySection title="Technical Sources" description="Market data, charts, APIs" sources={technicalSources} curatedSources={CURATED_SOURCES.technical} type="technical" categoryWeight={categoryWeights.technical} onAdd={(source: any) => handleAddCurated("technical", source)} onRemove={handleRemove} onToggle={handleToggle} onWeightChange={handleWeightChange} onAddCustomClick={() => { setModalType("technical"); setShowAddModal(true); }} />

      </div>

      {showAddModal && <AddCustomSourceModal type={modalType} onAdd={handleAddCustom} onClose={() => setShowAddModal(false)} />}
    </main>
  );
}

function CategorySection({ title, description, sources, curatedSources, type, categoryWeight, onAdd, onRemove, onToggle, onWeightChange, onAddCustomClick }: any) {
  const enabledSources = sources.filter((s: any) => s.enabled);

  return (
    <div style={{ marginBottom: 32, padding: 24, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#e4e4e7", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>{description} - Category weight: {categoryWeight}%</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", marginBottom: 10 }}>YOUR SOURCES ({enabledSources.length} active)</div>
        
        {sources.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#71717a", fontSize: 13 }}>No sources yet. Add popular sources below.</div>
        ) : (
          <div>
            {sources.map((source: any) => (
              <SourceCard key={source.id} source={source} categoryWeight={categoryWeight} onRemove={() => onRemove(source.id)} onToggle={() => onToggle(source.id)} onWeightChange={(weight: number) => onWeightChange(source.id, weight)} />
            ))}
          </div>
        )}
      </div>

      <PopularSources curatedSources={curatedSources} existingSources={sources} onAdd={onAdd} />

      <button onClick={onAddCustomClick} style={{ marginTop: 16, width: "100%", padding: "12px 16px", borderRadius: 10, background: "rgba(147,51,234,0.12)", border: "1px dashed rgba(147,51,234,0.3)", color: "#a78bfa", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>Add Custom {type === "news" ? "News" : type === "social" ? "Social" : "Technical"} Source</button>
    </div>
  );
}

function AddCustomSourceModal({ type, onAdd, onClose }: any) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const placeholders: any = {
    news: { name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news.rss" },
    social: { name: "@Reuters or r/geopolitics", url: "@Reuters or r/geopolitics" },
    technical: { name: "TradingView", url: "https://www.tradingview.com" }
  };

  const handleSubmit = () => {
    if (!name.trim() || !url.trim()) {
      alert("Please fill in both fields");
      return;
    }
    onAdd(type, name.trim(), url.trim());
    setName("");
    setUrl("");
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={onClose}>
      <div style={{ maxWidth: 500, width: "100%", background: "#1a1f2e", borderRadius: 16, padding: 28, border: "1px solid rgba(255,255,255,0.1)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#e4e4e7", marginBottom: 8 }}>Add Custom {type === "news" ? "News" : type === "social" ? "Social" : "Technical"} Source</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>Add any source you trust to improve your predictions</div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#d4d4d8", marginBottom: 8 }}>Source Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholders[type].name} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, outline: "none" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#d4d4d8", marginBottom: 8 }}>URL or Handle</label>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={placeholders[type].url} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, outline: "none" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSubmit} style={{ flex: 1, padding: "12px", borderRadius: 8, background: "#9333ea", border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Source</button>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function SourcesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><div>Loading...</div></div>}>
      <SourcesContent />
    </Suspense>
  );
}
