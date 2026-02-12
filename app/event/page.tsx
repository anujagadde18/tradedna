// app/event/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EventPage() {
  const router = useRouter();

  const [event, setEvent] = useState("Will Bitcoin cross $150k in 2026?");

  function goToScores() {
    router.push(`/scores?event=${encodeURIComponent(event)}`);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "72px 20px" }}>
        <a href="/" style={{ color: "#9CA3AF", fontSize: 13 }}>
          ← Back
        </a>

        <h1 style={{ fontSize: 34, marginTop: 18 }}>Pick an Event</h1>

        <div style={{ marginTop: 20 }}>
          <label style={{ display: "block", marginBottom: 8, color: "#9CA3AF" }}>
            Event
          </label>

          <select
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <option>Will Bitcoin cross $150k in 2026?</option>
            <option>Will Ethereum ETF be approved in 2025?</option>
            <option>Will OpenAI release GPT-5 this year?</option>
          </select>

          <button
            onClick={goToScores}
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 12,
              background: "#00D4FF",
              color: "#001018",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            Get Confidence Scores
          </button>
        </div>
      </div>
    </main>
  );
}
