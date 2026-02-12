"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EventPage() {
  const router = useRouter();
  const [event, setEvent] = useState("Will Bitcoin cross $150k in 2026?");

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "72px 20px" }}>
        <a href="/" style={{ color: "#9CA3AF", fontSize: 13 }}>
          ← Back to Home
        </a>

        <h1 style={{ fontSize: 34, marginTop: 18 }}>Pick an Event</h1>

        <div style={{ marginTop: 18 }}>
          <label style={{ display: "block", marginBottom: 8, color: "#9CA3AF" }}>
            Event name
          </label>
          <input
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              outline: "none",
            }}
          />
        </div>

        <button
          onClick={() => router.push(`/scores?event=${encodeURIComponent(event)}`)}
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
          Compute Scores
        </button>
      </div>
    </main>
  );
}
