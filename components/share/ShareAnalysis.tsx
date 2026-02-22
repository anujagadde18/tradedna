// components/share/ShareAnalysis.tsx
"use client";

import { useState } from "react";
import type { AnalysisOutput } from "@/lib/engine/analyzeEvent";
import type { AnalysisOutput } from "@/lib/engine/analyzeEvent";
export function ShareAnalysisButton({ analysis }: { analysis: AnalysisOutput }) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const reliability = calculateReliability(analysis);
  const direction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;

  async function handleShare() {
    setIsSharing(true);
    
    // Generate shareable text
    const shareText = `🔵 TradeDNA Analysis: ${analysis.event}

📊 Prediction: ${direction} (${confidence}%)
💪 Conviction: ${analysis.directional.convictionTier}
🎯 Reliability: ${reliability.score}% ${reliability.emoji}

Analyzed with explainable AI - see why at tradedna.vercel.app`;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TradeDNA Analysis: ${analysis.event}`,
          text: shareText,
          url: window.location.href,
        });
        setIsSharing(false);
        return;
      } catch (err) {
        console.log("Native share cancelled");
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
    
    setIsSharing(false);
  }

  function handleTwitterShare() {
    const direction = analysis.directional.yes > 50 ? "YES" : "NO";
    const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;
    
    const tweetText = `🔵 TradeDNA Analysis: ${analysis.event}

📊 ${direction} (${confidence}%)
💪 ${analysis.directional.convictionTier} conviction
🎯 ${reliability.score}% reliability ${reliability.emoji}

Built with explainable AI - not a black box!

#Polymarket #PredictionMarkets`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
  }

  return (
    <div style={{ 
      marginTop: 20, 
      padding: 16, 
      borderRadius: 14, 
      background: "rgba(59, 130, 246, 0.1)", 
      border: "1px solid rgba(59, 130, 246, 0.3)"
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#60a5fa", marginBottom: 10 }}>
        📤 Share Your Analysis
      </div>
      
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={handleShare}
          disabled={isSharing}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            background: copied ? "#10b981" : "#3b82f6",
            border: "none",
            color: "#fff",
            cursor: isSharing ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {copied ? "✅ Copied!" : isSharing ? "⏳ Sharing..." : "📋 Copy Analysis"}
        </button>

        <button
          onClick={handleTwitterShare}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            background: "#1DA1F2",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          𝕏 Share on X
        </button>

        <button
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          🔗 Copy Link
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
        Share your analysis to help others make informed decisions. Every share helps grow the TradeDNA community!
      </div>
    </div>
  );
}

export function SharePreviewCard({ analysis }: { analysis: AnalysisOutput }) {
  const reliability = calculateReliability(analysis);
  const direction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;

  return (
    <div style={{
      padding: 20,
      borderRadius: 16,
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      border: "2px solid #3b82f6",
      maxWidth: 500,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 32 }}>🔵</div>
        <div>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            TradeDNA Analysis
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>
            Explainable Conviction Modeling
          </div>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 16, lineHeight: 1.4 }}>
        {analysis.event}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Prediction</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: direction === "YES" ? "#10b981" : "#ef4444" }}>
            {direction}
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>{confidence}%</div>
        </div>
        
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Conviction</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
            {analysis.directional.convictionTier}
          </div>
        </div>
        
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Reliability</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: reliability.color }}>
            {reliability.score}% {reliability.emoji}
          </div>
        </div>
      </div>

      <div style={{ 
        padding: 12, 
        borderRadius: 10, 
        background: "rgba(0,0,0,0.3)",
        textAlign: "center",
        fontSize: 12,
        color: "#9ca3af"
      }}>
        tradedna.vercel.app
      </div>
    </div>
  );
}
