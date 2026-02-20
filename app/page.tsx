"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PopularEventsFeed } from "@/components/home/PopularEventsFeed";
import { getPopularEvents } from "@/lib/storage/popularEvents";

function HomeContent() {
  const router = useRouter();
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [activeEvents, setActiveEvents] = useState(0);

  useEffect(() => {
    const events = getPopularEvents();
    setActiveEvents(events.length);
    setTotalAnalyses(events.reduce((sum, e) => sum + e.count, 0));
  }, []);

  const demoEvents = [
    { title: "Will Bitcoin reach $150k in 2026?", category: "crypto" },
    { title: "Will Trump win the 2024 election?", category: "politics" },
    { title: "Will Apple stock hit $300 in 2026?", category: "finance" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      
      {/* Navigation */}
      <nav style={{ 
        borderBottom: "1px solid rgba(255,255,255,0.08)", 
        padding: "16px 0",
        background: "rgba(15,20,25,0.9)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>PlayPicks AI</div>
            <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
              <a href="/" style={{ color: "#e4e4e7", textDecoration: "none", fontWeight: 500 }}>Home</a>
              <a href="/event" style={{ color: "#71717a", textDecoration: "none", fontWeight: 500 }}>Analyze</a>
              <a href="/profile" style={{ color: "#71717a", textDecoration: "none", fontWeight: 500 }}>Profile</a>
            </div>
          </div>
          <button
            onClick={() => router.push("/event")}
            style={{ 
              padding: "8px 20px", 
              borderRadius: 7, 
              background: "#9333ea", 
              border: "none", 
              color: "#fff", 
              fontSize: 14, 
              fontWeight: 600, 
              cursor: "pointer"
            }}
          >
            Start Analysis
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "64px 32px" }}>
        
        {/* Hero */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 56, alignItems: "center", marginBottom: 80 }}>
          
          <div>
            <div style={{ 
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(147, 51, 234, 0.15)",
              border: "1px solid rgba(147, 51, 234, 0.3)",
              fontSize: 11,
              fontWeight: 600,
              color: "#a78bfa",
              marginBottom: 24,
              textTransform: "uppercase",
              letterSpacing: "0.8px"
            }}>
              Powered by TradeDNA™ Engine
            </div>

            <h1 style={{ 
              fontSize: 48, 
              fontWeight: 800, 
              lineHeight: 1.1,
              marginBottom: 20,
              letterSpacing: "-1px",
              color: "#fafafa"
            }}>
              Build Conviction with
              <br />
              Evidence, Not Guesses
            </h1>

            <p style={{ 
              fontSize: 17, 
              color: "#a1a1aa", 
              marginBottom: 32,
              lineHeight: 1.6,
              maxWidth: 520
            }}>
              Analyze prediction markets with transparent signal breakdown, historical accuracy data, and reliability scoring. Turn research into actionable conviction.
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => router.push("/event")}
                style={{ 
                  padding: "13px 26px", 
                  borderRadius: 8, 
                  background: "#9333ea", 
                  border: "none", 
                  color: "#fff", 
                  fontSize: 15, 
                  fontWeight: 600, 
                  cursor: "pointer"
                }}
              >
                Analyze Event →
              </button>
              <button
                onClick={() => router.push("/profile")}
                style={{ 
                  padding: "13px 26px", 
                  borderRadius: 8, 
                  background: "rgba(255,255,255,0.06)", 
                  border: "1px solid rgba(255,255,255,0.12)", 
                  color: "#e4e4e7", 
                  fontSize: 15, 
                  fontWeight: 600, 
                  cursor: "pointer" 
                }}
              >
                View Demo
              </button>
            </div>
          </div>

          {/* Stats Card */}
          <div style={{ 
            padding: 28, 
            borderRadius: 12, 
            background: "rgba(255,255,255,0.03)", 
            border: "1px solid rgba(255,255,255,0.08)" 
          }}>
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 20, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
              Platform Activity
            </div>
            <div style={{ display: "grid", gap: 18 }}>
              <MetricRow label="Total Analyses" value={totalAnalyses > 0 ? totalAnalyses.toString() : "—"} />
              <MetricRow label="Active Events" value={activeEvents > 0 ? activeEvents.toString() : "—"} />
              <MetricRow label="Signal Sources" value="Real-time" live />
              <MetricRow label="Historical Data" value="6 Categories" />
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ fontSize: 11, color: "#71717a", marginBottom: 14, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
            Quick Analysis
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {demoEvents.map((event, i) => (
              <QuickCard key={i} event={event} onClick={() => router.push(`/scores?event=${encodeURIComponent(event.title)}`)} />
            ))}
          </div>
        </div>

        {/* Trending */}
        <PopularEventsFeed />

        {/* Features */}
        <div style={{ marginTop: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.5px", color: "#fafafa" }}>
              Why Traders Choose PlayPicks
            </h2>
            <p style={{ fontSize: 16, color: "#a1a1aa", maxWidth: 560, margin: "0 auto" }}>
              Evidence-based conviction modeling for prediction market traders
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <Feature
              title="Historical Win Rates"
              desc="Component accuracy from backtested markets. Know which signals perform best per category."
            />
            <Feature
              title="Signal Transparency"
              desc="See exactly why each score changed. Every contribution tracked and explained in detail."
            />
            <Feature
              title="Divergence Alerts"
              desc="Get notified when signals conflict. Know when to wait for alignment vs act on conviction."
            />
            <Feature
              title="Real-Time Data"
              desc="Live news and social sentiment from trusted sources. Not simulations or estimates."
            />
            <Feature
              title="Behavioral Tracking"
              desc="Monitor your research patterns. Discover if you're social-heavy or technical-focused."
            />
            <Feature
              title="Reliability Scoring"
              desc="Model confidence in its own predictions. Trust scores from high to low certainty."
            />
          </div>
        </div>

        {/* CTA */}
        <div style={{ 
          marginTop: 80,
          padding: 56,
          borderRadius: 16,
          background: "rgba(147,51,234,0.08)",
          border: "1px solid rgba(147,51,234,0.2)",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 14, letterSpacing: "-0.5px", color: "#fafafa" }}>
            Ready to Build Evidence-Based Conviction?
          </h2>
          <p style={{ fontSize: 16, color: "#a1a1aa", marginBottom: 28, maxWidth: 500, margin: "0 auto 28px" }}>
            Start analyzing prediction markets with transparent, data-driven conviction modeling
          </p>
          <button
            onClick={() => router.push("/event")}
            style={{ 
              padding: "14px 32px", 
              borderRadius: 8, 
              background: "#9333ea", 
              border: "none", 
              color: "#fff", 
              fontSize: 15, 
              fontWeight: 600, 
              cursor: "pointer"
            }}
          >
            Analyze Your First Event →
          </button>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: 64, 
          paddingTop: 32, 
          borderTop: "1px solid rgba(255,255,255,0.08)", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <div style={{ fontSize: 14, color: "#71717a" }}>
            PlayPicks AI • Powered by TradeDNA™ • 2026
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 14, color: "#71717a" }}>
            <a href="https://polymarket.com" target="_blank" rel="noreferrer" style={{ color: "#71717a", textDecoration: "none" }}>Polymarket</a>
            <span>·</span>
            <a href="/profile" style={{ color: "#71717a", textDecoration: "none" }}>Demo</a>
          </div>
        </div>

      </div>
    </main>
  );
}

function MetricRow({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ fontSize: 13, color: "#a1a1aa", fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#fafafa" }}>{value}</span>
        {live && <span style={{ fontSize: 10, fontWeight: 600, color: "#22c55e", display: "flex", alignItems: "center", gap: 3 }}><span style={{ fontSize: 7 }}>●</span> LIVE</span>}
      </div>
    </div>
  );
}

function QuickCard({ event, onClick }: { event: any; onClick: () => void }) {
  const categoryColors = {
    crypto: { bg: "rgba(251, 146, 60, 0.12)", border: "rgba(251, 146, 60, 0.25)", text: "#fb923c" },
    politics: { bg: "rgba(96, 165, 250, 0.12)", border: "rgba(96, 165, 250, 0.25)", text: "#60a5fa" },
    finance: { bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.25)", text: "#22c55e" },
  };
  const color = categoryColors[event.category as keyof typeof categoryColors];

  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.borderColor = "rgba(147, 51, 234, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <span style={{ padding: "3px 10px", borderRadius: 5, background: color.bg, border: `1px solid ${color.border}`, fontSize: 11, fontWeight: 600, color: color.text, textTransform: "uppercase", letterSpacing: "0.4px" }}>
          {event.category}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7", lineHeight: 1.4, marginBottom: 8 }}>
        {event.title}
      </div>
      <div style={{ fontSize: 12, color: "#71717a", fontWeight: 500 }}>
        Click to analyze
      </div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ padding: 22, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#e4e4e7" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.55, margin: 0 }}>
        {desc}
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0f1419" }} />}>
      <HomeContent />
    </Suspense>
  );
}
