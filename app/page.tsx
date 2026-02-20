"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { PopularEventsFeed } from "@/components/home/PopularEventsFeed";

function HomeContent() {
  const router = useRouter();

  const demoEvents = [
    { title: "Will Bitcoin reach $150k in 2026?", category: "crypto", confidence: "62%" },
    { title: "Will Trump win the 2024 election?", category: "politics", confidence: "48%" },
    { title: "Will Apple stock hit $300 in 2026?", category: "finance", confidence: "71%" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#09090b", color: "#fff" }}>
      
      {/* Navigation */}
      <nav style={{ 
        borderBottom: "1px solid rgba(255,255,255,0.06)", 
        padding: "18px 0",
        background: "rgba(9,9,11,0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.3px" }}>PlayPicks AI</div>
            <div style={{ display: "flex", gap: 28, fontSize: 14 }}>
              <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 500 }}>Home</a>
              <a href="/event" style={{ color: "#71717a", textDecoration: "none", fontWeight: 500 }}>Analyze</a>
              <a href="/profile" style={{ color: "#71717a", textDecoration: "none", fontWeight: 500 }}>Profile</a>
            </div>
          </div>
          <button
            onClick={() => router.push("/event")}
            style={{ 
              padding: "9px 22px", 
              borderRadius: 8, 
              background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)", 
              border: "none", 
              color: "#fff", 
              fontSize: 14, 
              fontWeight: 600, 
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(147, 51, 234, 0.3)"
            }}
          >
            Start Analysis
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "72px 32px" }}>
        
        {/* Hero Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 64, alignItems: "center", marginBottom: 96 }}>
          
          {/* Left Content */}
          <div>
            <div style={{ 
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              borderRadius: 8,
              background: "rgba(147, 51, 234, 0.1)",
              border: "1px solid rgba(147, 51, 234, 0.3)",
              fontSize: 12,
              fontWeight: 600,
              color: "#a78bfa",
              marginBottom: 28,
              textTransform: "uppercase",
              letterSpacing: "0.8px"
            }}>
              <span style={{ fontSize: 8, color: "#9333ea" }}>●</span>
              Powered by TradeDNA™ Engine
            </div>

            <h1 style={{ 
              fontSize: 56, 
              fontWeight: 900, 
              lineHeight: 1.08,
              marginBottom: 24,
              letterSpacing: "-1.5px"
            }}>
              Build Conviction with
              <br />
              <span style={{ 
                background: "linear-gradient(135deg, #9333ea 0%, #c084fc 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                Evidence, Not Guesses
              </span>
            </h1>

            <p style={{ 
              fontSize: 19, 
              color: "#a1a1aa", 
              marginBottom: 36,
              lineHeight: 1.65,
              maxWidth: 560
            }}>
              Turn research into actionable conviction. Analyze prediction markets with transparent signal breakdown, historical accuracy data, and reliability scoring.
            </p>

            <div style={{ display: "flex", gap: 14 }}>
              <button
                onClick={() => router.push("/event")}
                style={{ 
                  padding: "15px 30px", 
                  borderRadius: 10, 
                  background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)", 
                  border: "none", 
                  color: "#fff", 
                  fontSize: 15, 
                  fontWeight: 700, 
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(147, 51, 234, 0.4)"
                }}
              >
                Analyze Event →
              </button>
              <button
                onClick={() => router.push("/profile")}
                style={{ 
                  padding: "15px 30px", 
                  borderRadius: 10, 
                  background: "rgba(255,255,255,0.04)", 
                  border: "1px solid rgba(255,255,255,0.12)", 
                  color: "#fff", 
                  fontSize: 15, 
                  fontWeight: 600, 
                  cursor: "pointer" 
                }}
              >
                View Demo
              </button>
            </div>
          </div>

          {/* Right Stats */}
          <div style={{ 
            padding: 32, 
            borderRadius: 16, 
            background: "linear-gradient(135deg, rgba(147,51,234,0.06) 0%, rgba(168,85,247,0.06) 100%)", 
            border: "1px solid rgba(147,51,234,0.2)" 
          }}>
            <div style={{ fontSize: 12, color: "#71717a", marginBottom: 24, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Live Metrics
            </div>
            <div style={{ display: "grid", gap: 22 }}>
              <StatRow label="Total Analyses" value="1,247" indicator="+12.3%" positive />
              <StatRow label="Active Traders" value="89" indicator="+23%" positive />
              <StatRow label="Avg Reliability" value="72%" indicator="+5.1%" positive />
              <StatRow label="Signal Sources" value="Real-time" live />
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div style={{ marginBottom: 72 }}>
          <div style={{ fontSize: 12, color: "#52525b", marginBottom: 18, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
            Quick Analysis
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {demoEvents.map((event, i) => (
              <QuickCard key={i} event={event} onClick={() => router.push(`/scores?event=${encodeURIComponent(event.title)}`)} />
            ))}
          </div>
        </div>

        {/* Trending Feed */}
        <PopularEventsFeed />

        {/* Features */}
        <div style={{ marginTop: 96 }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: 38, fontWeight: 900, marginBottom: 14, letterSpacing: "-0.5px" }}>
              Why Traders Choose PlayPicks
            </h2>
            <p style={{ fontSize: 17, color: "#a1a1aa", maxWidth: 620, margin: "0 auto" }}>
              Evidence-based conviction modeling for serious prediction market traders
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            <Feature
              icon="📊"
              title="Historical Win Rates"
              desc="Component accuracy data from backtested prediction markets. Know which signals perform best."
            />
            <Feature
              icon="🔍"
              title="Signal Transparency"
              desc="See exactly why each score changed. Every contribution tracked and explained."
            />
            <Feature
              icon="⚖️"
              title="Divergence Detection"
              desc="Alerts when signals conflict. Know when to wait for alignment vs act on conviction."
            />
            <Feature
              icon="📰"
              title="Real-Time Data"
              desc="Live news and social sentiment from trusted sources. Not simulations or estimates."
            />
            <Feature
              icon="🧠"
              title="Pattern Recognition"
              desc="Track your research behavior. Discover if you're social-heavy or technical-focused."
            />
            <Feature
              icon="🎯"
              title="Reliability Scoring"
              desc="Model confidence in its own predictions. Trust scores from high to low certainty."
            />
          </div>
        </div>

        {/* CTA */}
        <div style={{ 
          marginTop: 96,
          padding: 64,
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(168,85,247,0.12) 100%)",
          border: "1px solid rgba(147,51,234,0.25)",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: 34, fontWeight: 900, marginBottom: 16, letterSpacing: "-0.5px" }}>
            Ready to Build Evidence-Based Conviction?
          </h2>
          <p style={{ fontSize: 17, color: "#a1a1aa", marginBottom: 36, maxWidth: 540, margin: "0 auto 36px" }}>
            Start analyzing prediction markets with transparent, data-driven conviction modeling
          </p>
          <button
            onClick={() => router.push("/event")}
            style={{ 
              padding: "16px 38px", 
              borderRadius: 11, 
              background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)", 
              border: "none", 
              color: "#fff", 
              fontSize: 16, 
              fontWeight: 700, 
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(147, 51, 234, 0.4)"
            }}
          >
            Analyze Your First Event →
          </button>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: 72, 
          paddingTop: 36, 
          borderTop: "1px solid rgba(255,255,255,0.06)", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}>
          <div style={{ fontSize: 14, color: "#52525b" }}>
            PlayPicks AI • Powered by TradeDNA™ • 2026
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 14, color: "#52525b" }}>
            <a href="https://polymarket.com" target="_blank" rel="noreferrer" style={{ color: "#52525b", textDecoration: "none" }}>Polymarket</a>
            <span>·</span>
            <a href="/profile" style={{ color: "#52525b", textDecoration: "none" }}>Demo</a>
          </div>
        </div>

      </div>
    </main>
  );
}

function StatRow({ label, value, indicator, positive, live }: { label: string; value: string; indicator?: string; positive?: boolean; live?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 13, color: "#a1a1aa", fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{value}</span>
        {indicator && (
          <span style={{ fontSize: 12, fontWeight: 700, color: positive ? "#22c55e" : "#ef4444" }}>
            {indicator}
          </span>
        )}
        {live && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 8 }}>●</span> LIVE
          </span>
        )}
      </div>
    </div>
  );
}

function QuickCard({ event, onClick }: { event: any; onClick: () => void }) {
  const categoryColors = {
    crypto: { bg: "rgba(251, 146, 60, 0.1)", border: "rgba(251, 146, 60, 0.3)", text: "#fb923c" },
    politics: { bg: "rgba(96, 165, 250, 0.1)", border: "rgba(96, 165, 250, 0.3)", text: "#60a5fa" },
    finance: { bg: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.3)", text: "#22c55e" },
  };
  const color = categoryColors[event.category as keyof typeof categoryColors];

  return (
    <div
      onClick={onClick}
      style={{
        padding: 22,
        borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = "rgba(147, 51, 234, 0.4)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ padding: "4px 11px", borderRadius: 6, background: color.bg, border: `1px solid ${color.border}`, fontSize: 11, fontWeight: 700, color: color.text, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {event.category}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#a1a1aa" }}>{event.confidence}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#e4e4e7", lineHeight: 1.4, marginBottom: 10 }}>
        {event.title}
      </div>
      <div style={{ fontSize: 12, color: "#71717a", fontWeight: 500 }}>
        Click to analyze →
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ padding: 26, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 34, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#e4e4e7", letterSpacing: "-0.2px" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6, margin: 0 }}>
        {desc}
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#09090b" }} />}>
      <HomeContent />
    </Suspense>
  );
}
