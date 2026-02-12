"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EventPage() {
  const [event, setEvent] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!event.trim()) return;

    // 🔥 THIS IS WHERE router.push GOES
    router.push(`/scores?event=${encodeURIComponent(event)}`);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "80px 20px" }}>
        <h1 style={{ fontSize: 32 }}>Enter an Event</h1>

        <form onSubmit={handleSubmit} style={{ marginTop: 30 }}>
          <input
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="Example: Will Bitcoin hit $150k by 2026?"
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
            }}
          />

          <button
            type="submit"
            style={{
              marginTop: 20,
              padding: "12px 20px",
              borderRadius: 10,
              border: "none",
              background: "#00D4FF",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Generate Confidence
          </button>
        </form>
      </div>
    </main>
  );
}
