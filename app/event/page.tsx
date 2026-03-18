"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";

function EventContent() {
  const router = useRouter();
  const [event, setEvent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event.trim()) return;
    router.push(`/scores?event=${encodeURIComponent(event)}`);
  };

  const exampleQuestions = [
    "Will Bitcoin reach $150k in 2026?",
    "Will Apple stock hit $300 by end of 2026?",
    "Will AI regulation pass in US by 2027?",
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px" }}>
        
        {/* Back Link */}
        <a 
          href="/" 
          style={{ 
            color: "#9ca3af", 
            fontSize: 14, 
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 40
          }}
        >
           Back to Home
        </a>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ 
            fontSize: 36, 
            fontWeight: 900, 
            marginBottom: 12,
            color: "#fafafa" 
          }}>
            Analyze Any Prediction
          </h1>
          <p style={{ 
            fontSize: 17, 
            color: "#9ca3af",
            lineHeight: 1.6 
          }}>
            Paste a Polymarket URL or type any prediction question
          </p>
        </div>

        {/* How It Works */}
        <div style={{ 
          marginBottom: 32,
          padding: 24,
          borderRadius: 12,
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)"
        }}>
          <div style={{ 
            fontSize: 14, 
            fontWeight: 700, 
            color: "#60a5fa",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <span style={{ fontSize: 18 }}></span>
            How to Use PlayPicks
          </div>
          
          <div style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.8 }}>
            <div style={{ marginBottom: 12 }}>
              <strong>Option 1:</strong> Paste a Polymarket URL
            </div>
            <div style={{ 
              padding: 10, 
              borderRadius: 6, 
              background: "rgba(0,0,0,0.3)",
              fontFamily: "monospace",
              fontSize: 13,
              marginBottom: 16,
              color: "#9ca3af"
            }}>
              https://polymarket.com/event/bitcoin-150k
            </div>

            <div style={{ marginBottom: 12 }}>
              <strong>Option 2:</strong> Type any prediction question
            </div>
            <div style={{ 
              padding: 10, 
              borderRadius: 6, 
              background: "rgba(0,0,0,0.3)",
              fontFamily: "monospace",
              fontSize: 13,
              color: "#9ca3af"
            }}>
              Will Bitcoin reach $150k in 2026?
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="Paste Polymarket URL or type your question..."
              style={{
                width: "100%",
                padding: "18px 20px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "2px solid rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: 16,
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(147,51,234,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!event.trim()}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "16px",
              borderRadius: 10,
              background: event.trim() ? "#9333ea" : "rgba(147,51,234,0.3)",
              border: "none",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: event.trim() ? "pointer" : "not-allowed",
              boxShadow: event.trim() ? "0 4px 14px rgba(147,51,234,0.4)" : "none",
            }}
          >
            Analyze Event ->
          </button>
        </form>

        {/* Example Questions */}
        <div>
          <div style={{ 
            fontSize: 13, 
            color: "#71717a",
            marginBottom: 14,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}>
            Or Try These Examples
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {exampleQuestions.map((question, i) => (
              <button
                key={i}
                onClick={() => setEvent(question)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  textAlign: "left",
                  color: "#d4d4d8",
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(147,51,234,0.12)";
                  e.currentTarget.style.borderColor = "rgba(147,51,234,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div style={{ 
          marginTop: 48,
          padding: 20,
          borderRadius: 12,
          background: "rgba(147,51,234,0.08)",
          border: "1px solid rgba(147,51,234,0.2)"
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>
             What Happens Next?
          </div>
          <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.7 }}>
            1. You'll see a clear <strong>YES</strong> or <strong>NO</strong> prediction with confidence %
            <br />
            2. See which data sources agree/disagree
            <br />
            3. Optional: Customize trust levels for different sources
            <br />
            4. Optional: Add YOUR own data sources at <a href="/sources" style={{ color: "#a78bfa" }}>/sources</a>
          </div>
        </div>

      </div>
    </main>
  );
}

export default function EventPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0f1419" }} />
    }>
      <EventContent />
    </Suspense>
  );
}
