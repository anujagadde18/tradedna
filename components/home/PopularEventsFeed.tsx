// components/home/PopularEventsFeed.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTrendingEvents, getRecentEvents, type PopularEvent } from "@/lib/storage/popularEvents";

export function PopularEventsFeed() {
  const [trending, setTrending] = useState<PopularEvent[]>([]);
  const [recent, setRecent] = useState<PopularEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"trending" | "recent">("trending");
  const router = useRouter();

  useEffect(() => {
    setTrending(getTrendingEvents(5));
    setRecent(getRecentEvents(5));
  }, []);

  const events = activeTab === "trending" ? trending : recent;

  if (events.length === 0) {
    return null;
  }

  function handleEventClick(event: string) {
    router.push(`/scores?event=${encodeURIComponent(event)}`);
  }

  return (
    <div style={{ 
      marginTop: 40, 
      padding: 24, 
      borderRadius: 20, 
      background: "rgba(255,255,255,0.03)", 
      border: "1px solid rgba(255,255,255,0.08)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
          {activeTab === "trending" ? " Trending Analyses" : " Recent Analyses"}
        </h2>
        
        <div style={{ display: "flex", gap: 8 }}>
          <TabButton
            active={activeTab === "trending"}
            onClick={() => setActiveTab("trending")}
            label="Trending"
          />
          <TabButton
            active={activeTab === "recent"}
            onClick={() => setActiveTab("recent")}
            label="Recent"
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {events.map((e, i) => (
          <EventCard key={i} event={e} rank={i + 1} onClick={() => handleEventClick(e.event)} />
        ))}
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          No analyses yet. Be the first to analyze an event!
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 10,
        background: active ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
        border: active ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255,255,255,0.1)",
        color: active ? "#60a5fa" : "#9ca3af",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );
}

function EventCard({ event, rank, onClick }: { event: PopularEvent; rank: number; onClick: () => void }) {
  const direction = event.avgYesConfidence > 50 ? "YES" : "NO";
  const confidence = event.avgYesConfidence > 50 ? event.avgYesConfidence : 100 - event.avgYesConfidence;

  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        borderRadius: 14,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
      }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "start" }}>
        <div style={{ 
          minWidth: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(59, 130, 246, 0.2)",
          border: "1px solid rgba(59, 130, 246, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 14,
          color: "#60a5fa"
        }}>
          #{rank}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e5e7eb", marginBottom: 6, lineHeight: 1.4 }}>
            {event.event}
          </div>
          
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
            <span style={{ color: "#9ca3af" }}>
               {event.count} {event.count === 1 ? "analysis" : "analyses"}
            </span>
            <span style={{ color: "#9ca3af" }}>-</span>
            <span style={{ color: event.category === "sports" ? "#10b981" : event.category === "crypto" ? "#f59e0b" : "#60a5fa" }}>
              {event.category}
            </span>
            <span style={{ color: "#9ca3af" }}>-</span>
            <span style={{ fontWeight: 600, color: direction === "YES" ? "#10b981" : "#ef4444" }}>
              Avg: {direction} ({confidence}%)
            </span>
          </div>
        </div>

        <div style={{ 
          padding: "6px 12px",
          borderRadius: 8,
          background: "rgba(59, 130, 246, 0.1)",
          fontSize: 12,
          fontWeight: 600,
          color: "#60a5fa"
        }}>
          Analyze ->
        </div>
      </div>
    </div>
  );
}
