"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { analyzeEventWithData } from "@/lib/engine/analyzeEventWithData";
import { type ComponentKey } from "@/lib/engine/analyzeEvent";
import { saveAnalysis } from "@/lib/profile/userProfile";
import { getCachedNewsData, type NewsData } from "@/lib/data/newsData";
import { getCachedSocialData, type SocialData } from "@/lib/data/socialData";
import { trackEventAnalysis } from "@/lib/storage/popularEvents";
import { track, saveAnalysis as saveAnalyticAnalysis } from "@/lib/analytics";
import { calculateReliability } from "@/components/ui/DecisionSummary";

function ScoresContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const event = searchParams.get("event") || "Unknown Event";

  const [weights, setWeights] = useState<Record<ComponentKey, number>>({
    social: 40,
    news: 35,
    technical: 25,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [socialData, setSocialData] = useState<SocialData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (event === "Unknown Event") return;
    track("analyze_started", { event });

    async function fetchData() {
      setIsLoadingData(true);
      try {
        const [news, social] = await Promise.all([
          getCachedNewsData(event),
          getCachedSocialData(event),
        ]);
        setNewsData(news);
        setSocialData(social);
      } catch (error) {
        console.error("Data fetch error:", error);
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, [event]);

  const analysis = useMemo(
    () => analyzeEventWithData(event, weights, newsData, socialData),
    [event, weights, newsData, socialData]
  );

  useEffect(() => {
    if (analysis && event !== "Unknown Event" && !isLoadingData) {
      saveAnalysis(analysis, weights);
      trackEventAnalysis(event, analysis.category.name, analysis.directional.yes);
      const reliability = calculateReliability(analysis);
      saveAnalyticAnalysis({
        event_text: event,
        category: analysis.category.name,
        yes_conf: analysis.directional.yes,
        no_conf: analysis.directional.no,
        reliability: reliability.score,
        conviction: analysis.directional.convictionTier,
        stability: analysis.stats.stability,
        weights: weights,
      });
    }
  }, [analysis, weights, event, isLoadingData]);

  function setWeight(key: ComponentKey, value: number) {
    const next = { ...weights, [key]: value };
    const sum = next.social + next.news + next.technical;
    
    if (sum === 0) return;
    
    const scale = 100 / sum;
    const scaled = {
      social: Math.round(next.social * scale),
      news: Math.round(next.news * scale),
      technical: 100 - Math.round(next.social * scale) - Math.round(next.news * scale),
    };
    setWeights(scaled);
  }

  function setPreset(preset: "balanced" | "community" | "headlines" | "charts") {
    if (preset === "balanced") {
      setWeights({ social: 40, news: 35, technical: 25 });
    } else if (preset === "community") {
      setWeights({ social: 100, news: 0, technical: 0 });
    } else if (preset === "headlines") {
      setWeights({ social: 0, news: 100, technical: 0 });
    } else {
      setWeights({ social: 0, news: 0, technical: 100 });
    }
  }

  const direction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;
  const reliability = calculateReliability(analysis);

  const polymarketUrl = "https://polymarket.com/search?q=" + encodeURIComponent(event);

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px" }}>

        {/* Header - Mobile Optimized */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <a href="/" style={{ color: "#9ca3af", fontSize: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            ← Back
          </a>
          <button
            onClick={() => router.push("/profile")}
            style={{ padding: "6px 14px", borderRadius: 6, background: "rgba(147,51,234,0.12)", border: "1px solid rgba(147,51,234,0.25)", color: "#a78bfa", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Profile
          </button>
        </div>

        {/* Event Title - Mobile Friendly */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "#71717a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, fontWeight: 600 }}>
            Prediction Analysis
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.3, color: "#fafafa", wordBreak: "break-word" }}>
            {analysis.event}
          </h1>
        </div>

        {/* Main Result - Mobile Optimized */}
        <div style={{ marginBottom: 28, padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
          
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Our Prediction
          </div>
          
          <div style={{ fontSize: 56, fontWeight: 900, color: direction === "YES" ? "#22c55e" : "#ef4444", marginBottom: 10, lineHeight: 1 }}>
            {direction}
          </div>
          
          <div style={{ fontSize: 20, fontWeight: 700, color: "#e4e4e7", marginBottom: 18 }}>
            {confidence}% Confidence
          </div>

          {/* Reliability with Tooltip */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ 
              display: "inline-block",
              padding: "10px 16px", 
              borderRadius: 8, 
              background: reliability.score >= 70 ? "rgba(34,197,94,0.12)" : reliability.score >= 50 ? "rgba(251,146,60,0.12)" : "rgba(239,68,68,0.12)",
              border: reliability.score >= 70 ? "1px solid rgba(34,197,94,0.25)" : reliability.score >= 50 ? "1px solid rgba(251,146,60,0.25)" : "1px solid rgba(239,68,68,0.25)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: reliability.score >= 70 ? "#22c55e" : reliability.score >= 50 ? "#fb923c" : "#ef4444" }}>
                {reliability.level} Trust Level • {reliability.score}%
              </div>
            </div>
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: "#9ca3af", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span>❓</span>
                <span style={{ textDecoration: "underline" }}>What does this mean?</span>
              </summary>
              <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", fontSize: 13, color: "#d4d4d8", lineHeight: 1.6, textAlign: "left" }}>
                {reliability.score >= 70 
                  ? "High trust means our signals strongly agree and we have good data quality. This prediction is more reliable."
                  : reliability.score >= 50
                  ? "Medium trust means signals moderately agree. This prediction is decent but not as strong."
                  : "Low trust means signals disagree or we lack quality data. Be extra careful with this prediction."}
              </div>
            </details>
          </div>

          {/* Explanation - Mobile Friendly */}
          <div style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "left" }}>
            <div style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.65 }}>
              {analysis.explanation}
            </div>
          </div>
        </div>

        {/* Trust Settings - Mobile Optimized */}
        <div style={{ marginBottom: 28, padding: 20, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#e4e4e7", marginBottom: 6 }}>
              Adjust Your Trust
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5 }}>
              Choose which signals you trust most
            </div>
          </div>

          {/* Quick Presets - Mobile Grid */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, fontWeight: 600 }}>
              QUICK PRESETS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <PresetButton
                label="All Equally"
                desc="Balanced"
                active={weights.social === 40 && weights.news === 35 && weights.technical === 25}
                onClick={() => setPreset("balanced")}
              />
              <PresetButton
                label="Community Only"
                desc="Social media"
                active={weights.social === 100}
                onClick={() => setPreset("community")}
              />
              <PresetButton
                label="News Only"
                desc="Headlines"
                active={weights.news === 100}
                onClick={() => setPreset("headlines")}
              />
              <PresetButton
                label="Charts Only"
                desc="Market data"
                active={weights.technical === 100}
                onClick={() => setPreset("charts")}
              />
            </div>
          </div>

          {/* Custom Sliders */}
          <div>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 14, fontWeight: 600 }}>
              OR CUSTOMIZE
            </div>
            
            <TrustSlider
              label="🗣️ Community Buzz"
              tooltip="Social media sentiment from Twitter, Reddit, forums"
              value={weights.social}
              onChange={(v) => setWeight("social", v)}
              color="#3b82f6"
            />
            
            <TrustSlider
              label="📰 News Headlines"
              tooltip="Journalist reports from major news outlets"
              value={weights.news}
              onChange={(v) => setWeight("news", v)}
              color="#f59e0b"
            />
            
            <TrustSlider
              label="📊 Market Data"
              tooltip="Price charts and technical indicators"
              value={weights.technical}
              onChange={(v) => setWeight("technical", v)}
              color="#10b981"
            />

            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <div style={{ fontSize: 12, color: "#60a5fa", lineHeight: 1.5 }}>
                💡 Tip: Drag sliders to adjust. Set to 0% to ignore a source completely.
              </div>
            </div>
          </div>
        </div>

        {/* Show Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ 
            width: "100%",
            padding: "14px 18px", 
            borderRadius: 10, 
            background: "rgba(255,255,255,0.02)", 
            border: "1px solid rgba(255,255,255,0.06)", 
            color: "#9ca3af", 
            fontSize: 14, 
            fontWeight: 600, 
            cursor: "pointer",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>{showAdvanced ? "Hide" : "Show"} Detailed Breakdown</span>
          <span>{showAdvanced ? "▲" : "▼"}</span>
        </button>

        {/* Advanced Section */}
        {showAdvanced && (
          <div style={{ marginBottom: 28 }}>
            
            {/* Component Scores */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                Signal Scores
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <DetailRow 
                  icon="🗣️" 
                  label="Community Buzz" 
                  value={`${analysis.components.social.final}%`}
                  desc="Social media sentiment"
                />
                <DetailRow 
                  icon="📰" 
                  label="News Headlines" 
                  value={`${analysis.components.news.final}%`}
                  desc={newsData?.totalCount ? `${newsData.totalCount} articles` : "News analysis"}
                />
                <DetailRow 
                  icon="📊" 
                  label="Market Data" 
                  value={`${analysis.components.technical.final}%`}
                  desc="Technical patterns"
                />
              </div>
            </div>

            {/* Technical Stats */}
            <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                Analysis Quality
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <MetricRow 
                  label="Signal Agreement" 
                  value={`${analysis.stats.stability}%`}
                  tooltip="How much all signals agree"
                />
                <MetricRow 
                  label="Confidence Level" 
                  value={analysis.directional.convictionTier}
                  tooltip="Overall prediction strength"
                />
                <MetricRow 
                  label="Data Freshness" 
                  value="Real-time"
                  tooltip="Using last 24hrs data"
                />
              </div>
            </div>

            {/* Evidence Sources - MOBILE OPTIMIZED */}
            <div>
              <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                Data Sources
              </div>
              
              {/* News Sources */}
              {newsData && !newsData.error && newsData.totalCount > 0 && (
                <div style={{ marginBottom: 14, padding: 16, borderRadius: 12, background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>📰</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>
                      {newsData.totalCount} News Articles
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
                    From trusted sources
                  </div>
                  {newsData.articles && newsData.articles.slice(0, 3).map((article: any, i: number) => (
                    <a
                      key={i}
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ 
                        display: "block", 
                        padding: "10px 12px", 
                        marginBottom: 8,
                        borderRadius: 8, 
                        background: "rgba(255,255,255,0.03)", 
                        border: "1px solid rgba(255,255,255,0.06)",
                        textDecoration: "none",
                        color: "#d4d4d8"
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#e4e4e7", lineHeight: 1.3 }}>
                        {article.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#71717a" }}>
                        {article.source}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Social Sources */}
              {socialData && !socialData.error && socialData.estimatedVolume > 0 && (
                <div style={{ padding: 16, borderRadius: 12, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>🗣️</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>
                      {socialData.estimatedVolume.toLocaleString()} Social Mentions
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                    Sentiment: {socialData.sentiment.positive}% positive, {socialData.sentiment.negative}% negative
                  </div>
                  <div style={{ fontSize: 12, color: socialData.sentiment.positive > 50 ? "#22c55e" : "#ef4444", fontWeight: 600, marginBottom: 8 }}>
                    {socialData.sentiment.positive > 50 
                      ? `→ Positive sentiment supports ${direction} prediction`
                      : `→ Negative sentiment conflicts with ${direction} prediction`
                    }
                  </div>
                  <div style={{ fontSize: 11, color: "#71717a" }}>
                    From Twitter, Reddit, forums
                  </div>
                </div>
              )}

              {/* Technical Sources - ALWAYS SHOW */}
              <div style={{ padding: 16, borderRadius: 12, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>📊</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>
                    Market Data
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
                  Technical analysis from trusted platforms
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <a
                    href={`https://polymarket.com/search?q=${encodeURIComponent(event)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ 
                      display: "block", 
                      padding: "10px 12px", 
                      borderRadius: 8, 
                      background: "rgba(255,255,255,0.03)", 
                      border: "1px solid rgba(255,255,255,0.06)",
                      textDecoration: "none",
                      color: "#d4d4d8"
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>
                      Polymarket Odds
                    </div>
                    <div style={{ fontSize: 11, color: "#71717a" }}>
                      Live prediction market pricing
                    </div>
                  </a>
                  {event.toLowerCase().includes('bitcoin') || event.toLowerCase().includes('btc') || event.toLowerCase().includes('crypto') || event.toLowerCase().includes('eth') ? (
                    <>
                      <a
                        href="https://www.tradingview.com/symbols/BTCUSD/"
                        target="_blank"
                        rel="noreferrer"
                        style={{ 
                          display: "block", 
                          padding: "10px 12px", 
                          borderRadius: 8, 
                          background: "rgba(255,255,255,0.03)", 
                          border: "1px solid rgba(255,255,255,0.06)",
                          textDecoration: "none",
                          color: "#d4d4d8"
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>
                          TradingView Charts
                        </div>
                        <div style={{ fontSize: 11, color: "#71717a" }}>
                          Technical indicators and patterns
                        </div>
                      </a>
                      <a
                        href="https://coinmarketcap.com/"
                        target="_blank"
                        rel="noreferrer"
                        style={{ 
                          display: "block", 
                          padding: "10px 12px", 
                          borderRadius: 8, 
                          background: "rgba(255,255,255,0.03)", 
                          border: "1px solid rgba(255,255,255,0.06)",
                          textDecoration: "none",
                          color: "#d4d4d8"
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7" }}>
                          CoinMarketCap
                        </div>
                        <div style={{ fontSize: 11, color: "#71717a" }}>
                          Price data and market metrics
                        </div>
                      </a>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Warning if no real data */}
              {(!newsData || newsData.error) && (!socialData || socialData.error) && (
                <div style={{ padding: 14, borderRadius: 10, background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}>
                  <div style={{ fontSize: 12, color: "#fb923c", lineHeight: 1.6 }}>
                    ⚠️ Real-time data unavailable. Using baseline analysis.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button - Mobile Optimized */}
        <a
          href={polymarketUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("click_polymarket", { event })}
          style={{ 
            display: "block",
            padding: "16px 20px", 
            borderRadius: 12, 
            background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)", 
            border: "none", 
            color: "#fff", 
            fontSize: 15, 
            fontWeight: 700, 
            textDecoration: "none",
            textAlign: "center",
            marginBottom: 14,
            boxShadow: "0 4px 14px rgba(147,51,234,0.4)"
          }}
        >
          Trade on Polymarket →
        </a>

        {/* Footer */}
        <div style={{ fontSize: 12, color: "#71717a", textAlign: "center", lineHeight: 1.6, padding: "0 10px" }}>
          Analysis saved to your profile
          <br />
          Not financial advice • Do your own research
        </div>

      </div>
    </main>
  );
}

function PresetButton({ label, desc, active, onClick }: { label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        background: active ? "rgba(147,51,234,0.15)" : "rgba(255,255,255,0.02)",
        border: active ? "2px solid #9333ea" : "1px solid rgba(255,255,255,0.06)",
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#a78bfa" : "#e4e4e7", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: active ? "#9ca3af" : "#71717a" }}>
        {desc}
      </div>
    </button>
  );
}

function TrustSlider({ label, tooltip, value, onChange, color }: { label: string; tooltip: string; value: number; onChange: (v: number) => void; color: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "#e4e4e7", fontWeight: 700 }}>{label}</span>
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            style={{ 
              width: 18, 
              height: 18, 
              borderRadius: "50%", 
              background: "rgba(255,255,255,0.1)", 
              border: "1px solid rgba(255,255,255,0.2)", 
              color: "#9ca3af", 
              fontSize: 11, 
              cursor: "help",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700
            }}
          >
            ?
          </button>
        </div>
        <span style={{ fontSize: 17, fontWeight: 900, color }}>{value}%</span>
      </div>
      
      {showTooltip && (
        <div style={{ marginBottom: 8, padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "#d4d4d8", lineHeight: 1.5 }}>
          {tooltip}
        </div>
      )}

      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ 
          width: "100%", 
          height: 8, 
          borderRadius: 4, 
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.08) ${value}%, rgba(255,255,255,0.08) 100%)`,
          cursor: "pointer",
          WebkitAppearance: "none",
          appearance: "none"
        }}
      />
    </div>
  );
}

function DetailRow({ icon, label, value, desc }: { icon: string; label: string; value: string; desc: string }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e4e4e7" }}>{label}</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 900, color: "#9333ea" }}>{value}</span>
      </div>
      <div style={{ fontSize: 11, color: "#9ca3af", paddingLeft: 24 }}>
        {desc}
      </div>
    </div>
  );
}

function MetricRow({ label, value, tooltip }: { label: string; value: string; tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "#9ca3af", fontSize: 13 }}>{label}</span>
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          style={{ 
            width: 16, 
            height: 16, 
            borderRadius: "50%", 
            background: "rgba(255,255,255,0.08)", 
            border: "1px solid rgba(255,255,255,0.15)", 
            color: "#71717a", 
            fontSize: 10, 
            cursor: "help",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            position: "relative"
          }}
        >
          ?
          {showTooltip && (
            <div style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: 8, padding: 8, borderRadius: 6, background: "rgba(0,0,0,0.95)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, color: "#d4d4d8", whiteSpace: "nowrap", zIndex: 10 }}>
              {tooltip}
            </div>
          )}
        </button>
      </div>
      <span style={{ color: "#e4e4e7", fontWeight: 700, fontSize: 13 }}>{value}</span>
    </div>
  );
}

export default function ScoresPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "0 20px" }}>
          <div style={{ fontSize: 14, color: "#9ca3af" }}>Analyzing...</div>
        </div>
      </div>
    }>
      <ScoresContent />
    </Suspense>
  );
}
