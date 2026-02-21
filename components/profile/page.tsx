// app/profile/page.tsx
"use client";

import { Suspense } from "react";
import { ProfileDashboard } from "@/components/profile/ProfileDashboard";
import { useRouter } from "next/navigation";

function ProfileContent() {
  const router = useRouter();

  return (
    <main style={{ minHeight: "100vh", background: "#0f1419", color: "#fff" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <a href="/" style={{ color: "#9ca3af", fontSize: 14, textDecoration: "none" }}>
            ← Back to Home
          </a>
          <button
            onClick={() => router.push("/event")}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "#9333ea",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            New Prediction
          </button>
        </div>

        <ProfileDashboard />

        {/* Info */}
        <div style={{ marginTop: 40, padding: 20, borderRadius: 14, background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.2)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>
            📊 Understanding Your Profile
          </div>
          <div style={{ color: "#d4d4d8", fontSize: 14, lineHeight: 1.7 }}>
            Your profile tracks which signals you trust most when making predictions. Over time, you'll see patterns in how you research events — helping you understand your own decision-making style and improve your accuracy.
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0f1419", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#9ca3af" }}>Loading profile...</div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
