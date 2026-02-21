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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  }

  const examples = [
    "Will Bitcoin reach $150k in 2026?",
    "Will Trump win the 2024 election?",
    "Will Apple stock hit $300 in 2026?",
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <a href="/" style={{ color: "#9ca3af", fontSize: 14, textDecoration: "none", display: "inline-block", marginBottom: 32 }}>
            ← Back to Home
          </a>
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 10, color: "#fafafa" }}>
            What Do You Want to Predict?
          </h1>
          <p style={{ fontSize: 16, color: "#9ca3af" }}>
            Enter your question or paste a Polymarket link
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Example: Will Bitcoin reach $150k in 2026?

Or paste: https://polymarket.com/event/..."
            autoFocus
            style={{
              width: "100%",
              minHeight: 120,
              padding: 18,
              fontSize: 15,
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "2px solid rgba(255,255,255,0.08)",
              color: "#fff",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(147,51,234,0.4)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          />

          {parsedEvent && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600, marginBottom: 4 }}>
                ✓ Link Detected
              </div>
              <div style={{ fontSize: 14, color: "#d4d4d8" }}>
                {parsedEvent}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!input.trim()}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 10,
            background: input.trim() ? "#9333ea" : "rgba(255,255,255,0.05)",
            border: "none",
            color: input.trim() ? "#fff" : "#71717a",
            fontSize: 16,
            fontWeight: 700,
            cursor: input.trim() ? "pointer" : "not-allowed",
            marginBottom: 32,
          }}
        >
          Analyze →
        </button>

        <div>
          <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
            Or Try These:
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {examples.map((example, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(example);
                  setParsedEvent(null);
                }}
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#d4d4d8",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(147,51,234,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
