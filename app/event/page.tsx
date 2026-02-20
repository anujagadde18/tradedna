"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractEventFromUrl, isPolymarketUrl } from "@/lib/utils/urlParser";

export default function EventPage() {
  const [input, setInput] = useState("");
  const [parsedEvent, setParsedEvent] = useState<string | null>(null);
  const router = useRouter();

  function handleInputChange(value: string) {
    setInput(value);
    
    // Try to parse URL if it looks like a Polymarket link
    if (isPolymarketUrl(value)) {
      const extracted = extractEventFromUrl(value);
      if (extracted) {
        setParsedEvent(extracted);
      } else {
        setParsedEvent(null);
      }
    } else {
      setParsedEvent(null);
    }
  }

  function handleAnalyze() {
    const eventToAnalyze = parsedEvent || input;
    if (!eventToAnalyze.trim()) return;
    router.push(`/scores?event=${encodeURIComponent(eventToAnalyze)}`);
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleAnalyze();
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 600, width: "100%" }}>
        
        {/* Back Link */}
        <div style={{ marginBottom: 32 }}>
          <a href="/" style={{ color: "#9CA3AF", fontSize: 13, textDecoration: "none" }}>← Back to Home</a>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 12 }}>Analyze an Event</h1>
          <p style={{ fontSize: 16, color: "#9ca3af", margin: 0 }}>
            Enter a prediction market question or paste a Polymarket link
          </p>
        </div>

        {/* Input */}
        <div style={{ marginBottom: 24 }}>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Example: Will Bitcoin reach $150k in 2026?

Or paste a Polymarket URL:
https://polymarket.com/event/will-trump-win-2024"
            style={{
              width: "100%",
              minHeight: 120,
              padding: 16,
              fontSize: 15,
              borderRadius: 12,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.6,
            }}
          />

          {/* URL Detected Message */}
          {parsedEvent && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, marginBottom: 4 }}>
                ✅ Polymarket URL Detected
              </div>
              <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                Extracted event: <strong>{parsedEvent}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={!input.trim()}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 12,
            background: input.trim() ? "#00D4FF" : "rgba(255,255,255,0.1)",
            border: "none",
            color: input.trim() ? "#001018" : "#6b7280",
            fontSize: 16,
            fontWeight: 700,
            cursor: input.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          {parsedEvent ? "Analyze Extracted Event →" : "Analyze Event →"}
        </button>

        {/* Examples */}
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Example Questions:
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              "Will Bitcoin reach $150k in 2026?",
              "Will Trump win the 2024 election?",
              "Will Apple stock hit $300 in 2026?",
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(example);
                  setParsedEvent(null);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#cbd5e1",
                  fontSize: 13,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginTop: 40, padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Supported Inputs:</div>
          <div style={{ display: "grid", gap: 8, fontSize: 12, color: "#9ca3af" }}>
            <div>✅ Plain text questions</div>
            <div>✅ Polymarket event URLs</div>
            <div>✅ Polymarket market URLs</div>
            <div>✅ Any prediction market question</div>
          </div>
        </div>

      </div>
    </main>
  );
}
