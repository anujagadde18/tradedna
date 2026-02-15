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
    const r = getRecentAnalyses(5);
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
    return <div style={{ color: "#9ca3af" }}>Loading profile...</div>;
  }

  if (profile.totalAnalyses === 0) {
    return (
      <div style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No Analysis History Yet</div>
        <div style={{ color: "#9ca3af", fontSize: 14 }}>
          Start analyzing events to build your research profile and discover your trading patterns.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Your Research Profile</h2>
          <div style={{ color: "#9ca3af", fontSize: 14, marginTop: 4 }}>
            Based on {profile.totalAnalyses} {profile.totalAnalyses === 1 ? "analysis" : "analyses"}
          </div>
        </div>
        <button
          onClick={() => setShowClearConfirm(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(255,80,80,0.1)",
            border: "1px solid rgba(255,80,80,0.3)",
            color: "#fb7185",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Clear History
        </button>
      </div>

      {showClearConfirm && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "rgba(255,80,80,0.15)", border: "1px solid rgba(255,80,80,0.3)" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Clear all analysis history?</div>
          <div style={{ fontSize: 13, color: "#e5e7eb", marginBottom: 12 }}>This will permanently delete your profile data and cannot be undone.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleClearHistory}
              style={{ padding: "6px 12px", borderRadius: 6, background: "#fb7185", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
            >
              Yes, Clear
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div style={{ marginBottom: 20, padding: 18, borderRadius: 16, background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#67e8f9", marginBottom: 12 }}>🔍 Your Research Insights</div>
        <div style={{ display: "grid", gap: 8 }}>
          {insights.map((insight, i) => (
            <div key={i} style={{ fontSize: 14, color: "#e5e7eb", lineHeight: 1.5 }}>
              • {insight}
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        {/* Average Weights */}
        <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Average Weights</div>
          <div style={{ display: "grid", gap: 6 }}>
            <WeightBar label="Social" value={profile.averageWeights.social} baseline={40} />
            <WeightBar label="News" value={profile.averageWeights.news} baseline={35} />
            <WeightBar label="Technical" value={profile.averageWeights.technical} baseline={25} />
          </div>
        </div>

        {/* Stability Preference */}
        <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Stability Preference</div>
          <div style={{ display: "grid", gap: 6 }}>
            <PrefBar label="High" value={profile.stabilityPreference.high} total={profile.totalAnalyses} color="#10b981" />
            <PrefBar label="Medium" value={profile.stabilityPreference.medium} total={profile.totalAnalyses} color="#f59e0b" />
            <PrefBar label="Low" value={profile.stabilityPreference.low} total={profile.totalAnalyses} color="#ef4444" />
          </div>
        </div>

        {/* Conviction Distribution */}
        <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Conviction Distribution</div>
          <div style={{ display: "grid", gap: 6 }}>
            <PrefBar label="High" value={profile.convictionDistribution.high} total={profile.totalAnalyses} color="#10b981" />
            <PrefBar label="Moderate" value={profile.convictionDistribution.moderate} total={profile.totalAnalyses} color="#3b82f6" />
            <PrefBar label="Uncertain" value={profile.convictionDistribution.uncertain} total={profile.totalAnalyses} color="#f59e0b" />
            <PrefBar label="Weak" value={profile.convictionDistribution.weak} total={profile.totalAnalyses} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      {Object.keys(profile.categoryDistribution).length > 0 && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>Event Categories Analyzed</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(profile.categoryDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div
                  key={cat}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "rgba(0,212,255,0.1)",
                    border: "1px solid rgba(0,212,255,0.2)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#67e8f9" }}>{cat}</span>
                  <span style={{ color: "#9ca3af", marginLeft: 6 }}>({count})</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Analyses */}
      {recentAnalyses.length > 0 && (
        <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Recent Analyses</div>
          <div style={{ display: "grid", gap: 10 }}>
            {recentAnalyses.map((analysis) => (
              <div
                key={analysis.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{analysis.event}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", marginLeft: 12 }}>
                    {new Date(analysis.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#9ca3af" }}>
                  <span>Category: <b style={{ color: "#67e8f9" }}>{analysis.category}</b></span>
                  <span>•</span>
                  <span>YES: <b style={{ color: "#10b981" }}>{analysis.directional.yes}%</b></span>
                  <span>•</span>
                  <span>Conviction: <b>{analysis.conviction}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WeightBar({ label, value, baseline }: { label: string; value: number; baseline: number }) {
  const diff = value - baseline;
  const isHigher = diff > 0;
  const color = isHigher ? "#67e8f9" : "#fb7185";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#e5e7eb" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {value}% {Math.abs(diff) >= 5 && `(${isHigher ? "+" : ""}${diff})`}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value}%`, background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function PrefBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#e5e7eb" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {pct}% ({value})
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}
