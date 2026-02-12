"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EventPage() {
  const [event, setEvent] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    if (!event.trim()) return;
    router.push(`/scores?event=${encodeURIComponent(event)}`);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 20px" }}>
        <a href="/" style={{ color: "#9CA3AF", fontSize: 13 }}>
          ← Back Home
        </a>

        <h1 style={{ fontSize: 32, marginTop: 18 }}>Select Event</h1>

        <div style={{ marginTop: 24 }}>
          <input
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="Example: Will Bitcoin cross $150k in 2026?"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          style={{
            marginTop: 16,
            padding: "12px 18px",
            borderRadius: 12,
            background: "#00D4FF",
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Analyze Confidence
        </button>
      </div>
    </main>
  );
}
