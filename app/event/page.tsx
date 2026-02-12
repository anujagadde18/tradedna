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
        <h1 style={{ fontSize: 32 }}>Select Event</h1>

        <div style={{ marginTop: 30 }}>
          <input
            type="text"
            placeholder="Example: Will Bitcoin cross $150k in 2026?"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          style={{
            marginTop: 20,
            padding: "12px 24px",
            borderRadius: 10,
            background: "#00D4FF",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Analyze Confidence
        </button>
      </div>
    </main>
  );
}
