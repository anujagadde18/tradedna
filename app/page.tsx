// app/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { PopularEventsFeed } from "@/components/home/PopularEventsFeed";

function HomeContent() {
  const router = useRouter();

  const demoEvents = [
    "Will Bitcoin reach $150k in 2026?",
    "Will Trump win the 2024 election?",
    "Will Apple stock hit $300 in 2026?",
  ];

  function handleTryDemo(event: string) {
    router.push(`/scores?event=${encodeURIComponent(event)}`);
  }

  function handleCustomEvent() {
    router.push("/event");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 20px" }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ 
            display: "inline-block",
            padding: "6px 14px",
            borderRadius: 999,
            background: "rgba(59, 130, 246, 0.15)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            fontSize: 13,
            fontWeight: 600,
            color: "#60a5fa",
            marginBottom: 20
          }}>
            🔵 Explainable Conviction Modeling
          </div>

          <h1 style={{ 
            fontSize: 56, 
            fontWeight: 900, 
            lineHeight: 1.1,
            marginBottom: 20,
            background: "linear-gradient(135deg, #fff 0%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Build Conviction with
            <br />
            Transparent AI
          </h1>

          <p style={{ 
            fontSize: 20, 
            color: "#9ca3af", 
            maxWidth: 650,
            margin: "0 auto 40px",
            lineHeight: 1.6
          }}>
            Unlike black-box predictions, TradeDNA shows exactly why each signal matters. 
            Track your research patterns. Make informed decisions.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleCustomEvent}
              style={{
                padding: "16px 32px",
                borderRadius: 12,
                background: "#00D4FF",
                border: "none",
                color: "#001018",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0, 212, 255, 0.3)",
              }}
            >
              Analyze Your Event →
            </button>

            <button
              onClick={() => router.push("/profile")}
              style={{
                padding: "16px 32px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              View Demo Profile
            </button>
          </div>
        </div>

        {/* Try Demo Section */}
        <div style={{ 
          marginTop: 60,
          padding: 32,
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.3)"
        }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
              🚀 Try Instant Demo
            </h2>
            <p style={{ fontSize: 16, color: "#9ca3af" }}>
              Click any event below to see TradeDNA in action
            </p>
          </div>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
            gap: 16 
          }}>
            {demoEvents.map((event, i) => (
              <button
                key={i}
                onClick={() => handleTryDemo(event)}
                style={{
                  padding: 20,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s",
                  lineHeight: 1.5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {event}
                <div style={{ marginTop: 8, fontSize: 12, color: "#60a5fa" }}>
                  Click to analyze →
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Events Feed */}
        <PopularEventsFeed />

        {/* Features Grid */}
        <div style={{ marginTop: 80 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 40 }}>
            Why TradeDNA?
          </h2>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24 
          }}>
            <FeatureCard
              emoji="🔍"
              title="Explainable AI"
              description="See exactly why each score changed. Every adjustment is tracked and explained - no black boxes."
            />
            <FeatureCard
              emoji="📊"
              title="Real Data Integration"
              description="Live news articles and social sentiment. Not simulations - actual data from trusted sources."
            />
            <FeatureCard
              emoji="🧠"
              title="Behavioral Insights"
              description="Track your research patterns. Discover if you're Social-Heavy, Technical-focused, or Cautious."
            />
            <FeatureCard
              emoji="⚖️"
              title="Signal Alignment"
              description="Divergence detection alerts you when signals conflict. Know when to wait for clarity."
            />
            <FeatureCard
              emoji="🎯"
              title="Reliability Scoring"
              description="Model confidence in its own predictions. Trust scores from 🟢 High to 🔴 Low uncertainty."
            />
            <FeatureCard
              emoji="💪"
              title="Trade Recommendations"
              description="Actionable guidance based on conviction + reliability. Know when to trade vs. when to wait."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div style={{ 
          marginTop: 80,
          padding: 40,
          borderRadius: 20,
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)",
          border: "2px solid rgba(59, 130, 246, 0.4)",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
            Ready to Build Conviction?
          </h2>
          <p style={{ fontSize: 18, color: "#9ca3af", marginBottom: 32 }}>
            Start analyzing events with transparent AI - not a black box
          </p>
          <button
            onClick={handleCustomEvent}
            style={{
              padding: "18px 36px",
              borderRadius: 12,
              background: "#00D4FF",
              border: "none",
              color: "#001018",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 6px 24px rgba(0, 212, 255, 0.4)",
            }}
          >
            Analyze Your First Event →
          </button>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: 60, 
          paddingTop: 40, 
          borderTop: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
          color: "#6b7280",
          fontSize: 14
        }}>
          <p>
            Built for <a href="https://polymarket.com" target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "none" }}>Polymarket</a> traders who value transparency
          </p>
          <p style={{ marginTop: 10 }}>
            TradeDNA • Explainable Conviction Modeling • 2026
          </p>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div style={{
      padding: 24,
      borderRadius: 16,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{emoji}</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#070B10" }} />}>
      <HomeContent />
    </Suspense>
  );
}
