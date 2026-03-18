// components/profile/ProfileDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { computeUserProfile, generateInsights, getRecentAnalyses, clearHistory, type UserProfile, type AnalysisRecord } from "@/lib/profile/userProfile";

export function ProfileDashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisRecord[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  function loadProfile() {
    const p = computeUserProfile();
    const i = generateInsights(p);
    const r = getRecentAnalyses(10);
    setProfile(p);
    setInsights(i);
    setRecentAnalyses(r);
  }

  function handleClearHistory() {
    clearHistory();
    loadProfile();
    setShowClearConfirm(false);
  }

  if (!profile) {
    return <div style={{ color: "#9ca3af" }}>Loading your profile...</div>;
  }

  if (profile.totalAnalyses === 0) {
    return (
      <div style={{ padding: 32, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#e4e4e7" }}>
          No Predictions Yet
        </div>
        <div style={{ color: "#9ca3af", fontSize: 15, lineHeight: 1.6 }}>
          Start analyzing events to see your prediction history and discover your research patterns.
        </div>
      </div>
    );
  }

  // Calculate trust preferences in plain English
  const trustPreferences = [
    { source: "Community Buzz", value: profile.averageWeights.social, color: "#3b82f6", desc: "Social media sentiment" },
    { source: "News Headlines", value: profile.averageWeights.news, color: "#f59e0b", desc: "Journalist reports" },
    { source: "Market Data", value: profile.averageWeights.technical, color: "#10b981", desc: "Charts & patterns" }
  ].sort((a, b) => b.value - a.value);

  const mostTrusted = trustPreferences[0];
  
  // Calculate accuracy if possible
  const totalPredictions = profile.totalAnalyses;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#fafafa" }}>
            Your Prediction Profile
          </h2>
          <div style={{ color: "#9ca3af", fontSize: 14, marginTop: 6 }}>
            Based on {totalPredictions} {totalPredictions === 1 ? "prediction" : "predictions"}
          </div>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Clear History
        </button>
      </div>

      {showClearConfirm && (
        <div style={{ marginBottom: 24, padding: 18, borderRadius: 12, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: "#fca5a5" }}>
            Delete all your prediction history?
          </div>
          <div style={{ fontSize: 13, color: "#d4d4d8", marginBottom: 14 }}>
            This will permanently erase your profile data. You can't undo this.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleClearHistory}
              style={{ padding: "8px 16px", borderRadius: 8, background: "#ef4444", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}
            >
              Yes, Delete Everything
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e4e4e7", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div style={{ marginBottom: 28, padding: 28, borderRadius: 16, background: "linear-gradient(135deg, rgba(147,51,234,0.08) 0%, rgba(168,85,247,0.08) 100%)", border: "1px solid rgba(147,51,234,0.2)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#a78bfa", marginBottom: 16 }}>
           Your Prediction Style
        </div>
        <div style={{ fontSize: 16, color: "#e4e4e7", lineHeight: 1.7, marginBottom: 14 }}>
          You trust <strong style={{ color: "#a78bfa" }}>{mostTrusted.source}</strong> the most ({mostTrusted.value.toFixed(0)}% of your decisions).
        </div>
        <div style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6 }}>
          This means you rely heavily on {mostTrusted.desc} when making predictions.
        </div>
      </div>

      {/* Trust Breakdown */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7", marginBottom: 16 }}>
          What You Trust Most
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {trustPreferences.map((pref, i) => (
            <TrustBar
              key={i}
              rank={i + 1}
              source={pref.source}
              percentage={pref.value}
              color={pref.color}
              desc={pref.desc}
            />
          ))}
        </div>
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <div style={{ fontSize: 12, color: "#60a5fa", lineHeight: 1.6 }}>
             These are your average trust settings across all predictions. You can adjust them for each event.
          </div>
        </div>
      </div>

      {/* Recent Predictions */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7", marginBottom: 16 }}>
          Your Recent Predictions
        </div>
        {recentAnalyses.length === 0 ? (
          <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center", color: "#9ca3af" }}>
            No predictions yet
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {recentAnalyses.map((analysis, i) => (
              <PredictionCard key={i} analysis={analysis} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function TrustBar({ rank, source, percentage, color, desc }: { rank: number; source: string; percentage: number; color: string; desc: string }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            width: 28, 
            height: 28, 
            borderRadius: 6, 
            background: `${color}20`, 
            border: `1.5px solid ${color}40`,
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: 13, 
            fontWeight: 800, 
            color 
          }}>
            {rank}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>{source}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{desc}</div>
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color }}>{percentage.toFixed(0)}%</div>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percentage}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function PredictionCard({ analysis }: { analysis: AnalysisRecord }) {
  const prediction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;
  const wasCorrect = null; // We don't track outcomes yet

  return (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e4e4e7", lineHeight: 1.4, marginBottom: 6 }}>
            {analysis.event}
          </div>
          <div style={{ fontSize: 12, color: "#71717a" }}>
            {new Date(analysis.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div style={{ 
          padding: "6px 14px", 
          borderRadius: 8, 
          background: prediction === "YES" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: prediction === "YES" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)"
        }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: prediction === "YES" ? "#22c55e" : "#ef4444" }}>
            {prediction}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
        <div>
          <span style={{ color: "#9ca3af" }}>Confidence: </span>
          <span style={{ color: "#e4e4e7", fontWeight: 700 }}>{confidence.toFixed(0)}%</span>
        </div>
        <div>
          <span style={{ color: "#9ca3af" }}>Category: </span>
          <span style={{ color: "#e4e4e7", fontWeight: 600 }}>{analysis.category}</span>
        </div>
      </div>
    </div>
  );
}
