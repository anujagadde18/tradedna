"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PopularEventsFeed } from "@/components/home/PopularEventsFeed";

function HomeContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const demoEvents = [
    { title: "Will Bitcoin reach $150k in 2026?", category: "crypto", trend: "+2.3%" },
    { title: "Will Trump win the 2024 election?", category: "politics", trend: "-1.1%" },
    { title: "Will Apple stock hit $300 in 2026?", category: "finance", trend: "+0.8%" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#0a0e14", color: "#fff" }}>
      
      {/* Header/Nav */}
      <nav style={{ 
        borderBottom: "1px solid rgba(255,255,255,0.08)", 
        padding: "16px 0",
        background: "rgba(10,14,20,0.8)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}>PlayPicks AI</div>
            <div style={{ display: "flex", gap: 24, fontSize: 14, color: "#9ca3af" }}>
              <a href="/" style={{ color: "#fff", textDecoration: "none" }}>Home</a>
              <a href="/event" style={{ color: "#9ca3af", textDecoration: "none" }}>Analyze</a>
              <a href="/profile" style={{ color: "#9ca3af", textDecoration: "none" }}>Profile</a>
            </div>
          </div>
          <button
            onClick={() => router.push("/event")}
            style={{ padding: "8px 20px", borderRadius: 8, background: "#00D4FF", border: "none", color: "#001018", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Start Analysis
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "60px 40px" }}>
        
        {/* Hero Section - Horizontal Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 60, alignItems: "center", marginBottom: 80 }}>
          
          {/* Left: Content */}
          <div>
            <div style={{ 
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(0, 212, 255, 0.1)",
              border: "1px solid rgba(0, 212, 255, 0.3)",
              fontSize: 12,
              fontWeight: 600,
              color: "#00D4FF",
              marginBottom: 24,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}>
              Powered by TradeDNA™ Engine
            </div>

            <h1 style={{ 
              fontSize: 52, 
              fontWeight: 900, 
              lineHeight: 1.1,
              marginBottom: 20,
              letterSpacing: "-1px"
            }}>
              Trade Like You Have
              <br />
              <span style={{ color: "#00D4FF" }}>Inside Information</span>
            </h1>

            <p style={{ 
              fontSize: 18, 
              color: "#9ca3af", 
              marginBottom: 32,
              lineHeight: 1.6,
              maxWidth: 540
            }}>
              Track signal alignment. Analyze conviction metrics. Make data-driven decisions with transparent AI — not black-box predictions.
            </p>

            <div style={{ display: "flex", gap: 16 }}>
              <button
                onClick={() => router.push("/event")}
                style={{ padding: "14px 28px", borderRadius: 10, background: "#00D4FF", border: "none", color: "#001018", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
              >
                Analyze Event →
              </button>
              <button
                onClick={() => router.push("/profile")}
                style={{ padding: "14px 28px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                View Demo
              </button>
            </div>
          </div>

          {/* Right: Quick Stats Card */}
          <div style={{ padding: 32, borderRadius: 16, background: "linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(147,51,234,0.08) 100%)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Platform Metrics
            </div>
            <div style={{ display: "grid", gap: 20 }}>
              <MetricRow label="Analyses Run" value="1,247" change="+12%" />
              <MetricRow label="Active Users" value="89" change="+23%" />
              <MetricRow label="Avg Reliability" value="72%" change="+5%" />
              <MetricRow label="Data Sources" value="Real-time" trend="live" />
            </div>
          </div>
        </div>

        {/* Quick Access Cards - Horizontal */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            Quick Analysis
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {demoEvents.map((event, i) => (
              <button
                key={i}
                onClick={() => router.push(`/scores?event=${encodeURIComponent(event.title)}`)}
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(0, 212, 255, 0.4)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                  <CategoryBadge category={event.category} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: event.trend.startsWith("+") ? "#10b981" : "#ef4444" }}>
                    {event.trend}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb", lineHeight: 1.4, marginBottom: 8 }}>
                  {event.title}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Click to analyze →
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Trending Analyses Feed */}
        <PopularEventsFeed />

        {/* Features Grid - Horizontal Cards */}
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12 }}>
              Why PlayPicks AI?
            </h2>
            <p style={{ fontSize: 16, color: "#9ca3af", maxWidth: 600, margin: "0 auto" }}>
              Professional-grade conviction modeling for prediction market traders
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            <FeatureCard
              icon="📊"
              title="Real Data Integration"
              description="Live news articles and social sentiment from trusted sources. Not simulations."
            />
            <FeatureCard
              icon="🔍"
              title="Explainable AI"
              description="See exactly why each score changed. Every adjustment is tracked and explained."
            />
            <FeatureCard
              icon="🎯"
              title="Historical Accuracy"
              description="Component win rates based on backtested prediction market data."
            />
            <FeatureCard
              icon="⚖️"
              title="Signal Alignment"
              description="Divergence detection alerts you when signals conflict. Know when to wait."
            />
            <FeatureCard
              icon="🧠"
              title="Behavioral Insights"
              description="Track your research patterns. Discover if you're Social-Heavy or Technical-focused."
            />
            <FeatureCard
              icon="💼"
              title="Trade Recommendations"
              description="Actionable guidance based on conviction + reliability scores."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ 
          marginTop: 80,
          padding: 60,
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(0,212,255,0.1) 0%, rgba(147,51,234,0.1) 100%)",
          border: "1px solid rgba(0,212,255,0.3)",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>
            Ready to Build Conviction?
          </h2>
          <p style={{ fontSize: 16, color: "#9ca3af", marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
            Start analyzing events with transparent AI-powered conviction modeling
          </p>
          <button
            onClick={() => router.push("/event")}
            style={{ padding: "16px 36px", borderRadius: 12, background: "#00D4FF", border: "none", color: "#001018", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            Analyze Your First Event →
          </button>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, paddingTop: 40, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            PlayPicks AI • Powered by TradeDNA™ Engine • 2026
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 14, color: "#6b7280" }}>
            <a href="https://polymarket.com" target="_blank" rel="noreferrer" style={{ color: "#6b7280", textDecoration: "none" }}>Polymarket</a>
            <span>•</span>
            <a href="/profile" style={{ color: "#6b7280", textDecoration: "none" }}>Demo</a>
          </div>
        </div>

      </div>
    </main>
  );
}

function MetricRow({ label, value, change, trend }: { label: string; value: string; change?: string; trend?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <div style={{ fontSize: 13, color: "#9ca3af" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{value}</span>
        {change && (
          <span style={{ fontSize: 12, fontWeight: 600, color: change.startsWith("+") ? "#10b981" : "#ef4444" }}>
            {change}
          </span>
        )}
        {trend === "live" && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#10b981" }}>● LIVE</span>
        )}
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors = {
    crypto: { bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)", text: "#f59e0b" },
    politics: { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)", text: "#60a5fa" },
    finance: { bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)", text: "#10b981" },
  };
  const color = colors[category as keyof typeof colors] || colors.crypto;

  return (
    <span style={{
      padding: "4px 10px",
      borderRadius: 6,
      background: color.bg,
      border: `1px solid ${color.border}`,
      fontSize: 11,
      fontWeight: 600,
      color: color.text,
      textTransform: "uppercase",
      letterSpacing: "0.3px"
    }}>
      {category}
    </span>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ padding: 24, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#e5e7eb" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0e14" }} />}>
      <HomeContent />
    </Suspense>
  );
}
