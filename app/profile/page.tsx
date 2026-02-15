// app/profile/page.tsx
"use client";

import { Suspense } from "react";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import { useRouter } from "next/navigation";

function ProfileContent() {
  const router = useRouter();

  return (
    <main style={{ minHeight: "100vh", background: "#070B10", color: "#fff" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "56px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <a href="/" style={{ color: "#9CA3AF", fontSize: 13 }}>
            ← Back to Home
          </a>
          <button
            onClick={() => router.push("/event")}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "#00D4FF",
              border: "none",
              color: "#001018",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Analyze Event
          </button>
        </div>

        <ProfileDashboard />

        {/* Info banner */}
        <div style={{ marginTop: 28, padding: 16, borderRadius: 14, background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#67e8f9", marginBottom: 8 }}>🧠 Behavioral Intelligence</div>
          <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>
            TradeDNA tracks your research patterns to help you understand your decision-making biases. Unlike black-box prediction engines, we provide transparent insights into how you analyze markets - helping you make more informed, self-aware trading decisions.
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#070B10", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
