"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { getPopularEvents } from "@/lib/storage/popularEvents";

function HomeContent() {
  const router = useRouter();
  const [popularEvents, setPopularEvents] = useState<any[]>([]);

  useEffect(() => {
    const events = getPopularEvents().slice(0, 6);
    setPopularEvents(events);
  }, []);

  const quickEvents = [
    "Will Bitcoin reach $150k in 2026?",
    "Will Apple stock hit $300 by end of 2026?",
    "Will AI regulation pass in US by 2027?",
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      {/* NAV */}
      <nav
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 0",
          background: "rgba(15,20,25,0.95)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>PlayPicks AI</div>

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Link
              href="/profile"
              style={{
                color: "#9ca3af",
                fontSize: 14,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Profile
            </Link>

            <Link
              href="/sources"
              style={{
                color: "#9ca3af",
                fontSize: 14,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Sources
            </Link>

            <button
              onClick={() => router.push("/event")}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                background: "#9333ea",
                border: "none",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Analyze Event
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px" }}>
        {/* HERO */}
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 80px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(147, 51, 234, 0.12)",
              fontSize: 11,
              fontWeight: 600,
              color: "#a78bfa",
              marginBottom: 24,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Powered by TradeDNA™
          </div>

          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 20,
              letterSpacing: "-1.2px",
              color: "#fafafa",
            }}
          >
            Pick Feeds. Tweak Weights. Craft Conviction.
          </h1>

          <p
            style={{
              fontSize: 19,
              color: "#a1a1aa",
              marginBottom: 36,
              lineHeight: 1.6,
            }}
          >
            First prediction tool where YOU control the data sources. Add your RSS feeds,
            Twitter accounts, subreddits. Build real conviction.
          </p>

          <button
            onClick={() => router.push("/event")}
            style={{
              padding: "16px 40px",
              borderRadius: 10,
              background: "#9333ea",
              border: "none",
              color: "#fff",
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(147,51,234,0.4)",
            }}
          >
            Analyze Your Event →
          </button>
        </div>

        {/* QUICK EVENTS */}
        {quickEvents.length > 0 && (
          <div style={{ marginBottom: 64 }}>
            <div
              style={{
                fontSize: 13,
                color: "#71717a",
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Try These Examples
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
                maxWidth: 900,
                margin: "0 auto",
              }}
            >
              {quickEvents.map((event, i) => (
                <button
                  key={i}
                  onClick={() =>
                    router.push(`/scores?event=${encodeURIComponent(event)}`)
                  }
                  style={{
                    padding: "20px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#e4e4e7",
                      marginBottom: 8,
                    }}
                  >
                    {event}
                  </div>
                  <div style={{ fontSize: 13, color: "#71717a" }}>
                    Click to analyze →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BETA SECTION */}
        <div style={{ maxWidth: 1200, margin: "80px auto", padding: "0 24px" }}>
          <div
            style={{
              padding: "48px 40px",
              borderRadius: 20,
              background:
                "linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(168,85,247,0.15) 100%)",
              border: "1px solid rgba(147,51,234,0.3)",
            }}
          >
            <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  borderRadius: 20,
                  background: "rgba(147,51,234,0.2)",
                  border: "1px solid rgba(147,51,234,0.4)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#a78bfa",
                  marginBottom: 20,
                  textTransform: "uppercase",
                }}
              >
                🆕 Beta Feature
              </div>

              <h2
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  marginBottom: 16,
                }}
              >
                Use <span style={{ color: "#a78bfa" }}>Your</span> Data Sources
              </h2>

              <p
                style={{
                  fontSize: 15,
                  color: "#9ca3af",
                  marginBottom: 32,
                }}
              >
                Don't trust black boxes? Add your own RSS feeds, Twitter accounts,
                subreddits. Set custom weights. Get personalized analysis.
              </p>

              <Link
                href="/sources"
                style={{
                  display: "inline-block",
                  padding: "14px 32px",
                  borderRadius: 10,
                  background: "#9333ea",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(147,51,234,0.4)",
                }}
              >
                Configure Your Sources →
              </Link>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center",
            fontSize: 14,
            color: "#71717a",
          }}
        >
          PlayPicks AI • 2026
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0f1419" }} />}>
      <HomeContent />
    </Suspense>
  );
}
