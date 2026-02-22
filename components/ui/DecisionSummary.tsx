// components/ui/DecisionSummary.tsx
"use client";

import { useState } from "react";
import type { AnalysisOutput } from "@/lib/engine/analyzeEvent";

export function calculateReliability(analysis: AnalysisOutput): {
  score: number;
  level: "High" | "Moderate" | "Low";
  color: string;
  emoji: string;
} {
  // Combine stability (40%), low divergence (30%), low volatility (30%)
  const stabilityContribution = (analysis.stats.stability / 100) * 0.4;
  const divergenceContribution = (1 - Math.min(analysis.stats.divergence, 50) / 50) * 0.3;
  const volatilityContribution = (1 - Math.min(analysis.stats.volatility, 100) / 100) * 0.3;
  
  const score = Math.round((stabilityContribution + divergenceContribution + volatilityContribution) * 100);
  
  let level: "High" | "Moderate" | "Low";
  let color: string;
  let emoji: string;
  
  if (score >= 75) {
    level = "High";
    color = "#10b981";
    emoji = "🟢";
  } else if (score >= 50) {
    level = "Moderate";
    color = "#f59e0b";
    emoji = "🟡";
  } else {
    level = "Low";
    color = "#ef4444";
    emoji = "🔴";
  }
  
  return { score, level, color, emoji };
}

export function DecisionSummaryCard({ analysis }: { analysis: AnalysisOutput }) {
  const [showExplainer, setShowExplainer] = useState(false);
  
  const direction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;
  const reliability = calculateReliability(analysis);
  
  // Determine primary signal
  const scores = {
    social: analysis.components.social.final,
    news: analysis.components.news.final,
    technical: analysis.components.technical.final,
  };
  const sorted = Object.entries(scores).sort(([,a], [,b]) => b - a);
  const primary = sorted[0][0];
  const secondary = sorted[1][0];
  
  // Generate "Why" explanation
  let why = "";
  if (analysis.stats.divergence < 15) {
    why = `Signals aligned. ${primary} + ${secondary} favor ${direction}.`;
  } else if (analysis.stats.divergence < 30) {
    why = `${primary} favors ${direction}, but ${sorted[2][0]} shows divergence.`;
  } else {
    why = `Signals conflict. ${primary} strongest but high uncertainty.`;
  }
  
  if (analysis.directional.stabilityLabel === "High") {
    why += " High stability.";
  } else if (analysis.directional.stabilityLabel === "Low") {
    why += " Low stability - expect volatility.";
  }
  
  return (
    <div style={{ 
      marginTop: 16, 
      padding: 20, 
      borderRadius: 16, 
      background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
      border: "2px solid rgba(59, 130, 246, 0.3)",
      position: "relative"
    }}>
      <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
        <div style={{ fontSize: 32 }}>🔵</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            TradeDNA Decision Summary
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
            <SummaryItem label="Lean" value={`${direction} (${confidence}%)`} highlight />
            <SummaryItem label="Conviction" value={analysis.directional.convictionTier} />
            <SummaryItem 
              label="Reliability" 
              value={`${reliability.score}% ${reliability.emoji}`}
              color={reliability.color}
            />
          </div>
          
          <div style={{ 
            padding: 12, 
            borderRadius: 10, 
            background: "rgba(0,0,0,0.2)", 
            fontSize: 13, 
            lineHeight: 1.5,
            color: "#e2e8f0"
          }}>
            <b style={{ color: "#60a5fa" }}>Why:</b> {why}
          </div>
          
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            style={{
              marginTop: 10,
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(59, 130, 246, 0.2)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              color: "#60a5fa",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {showExplainer ? "Hide details" : "What does this mean?"}
          </button>
          
          {showExplainer && <MetricsExplainer reliability={reliability} analysis={analysis} />}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>{label}</div>
      <div style={{ 
        fontSize: highlight ? 20 : 16, 
        fontWeight: 800, 
        color: color || (highlight ? "#fff" : "#e5e7eb")
      }}>
        {value}
      </div>
    </div>
  );
}

function MetricsExplainer({ reliability, analysis }: { reliability: ReturnType<typeof calculateReliability>; analysis: AnalysisOutput }) {
  return (
    <div style={{ 
      marginTop: 12, 
      padding: 14, 
      borderRadius: 10, 
      background: "rgba(0,0,0,0.3)", 
      border: "1px solid rgba(255,255,255,0.1)"
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#60a5fa" }}>
        📚 What These Metrics Mean
      </div>
      
      <ExplainerRow
        term="Lean (YES/NO)"
        meaning={`The direction TradeDNA predicts based on weighted signal analysis. ${analysis.directional.yes > 50 ? "YES" : "NO"} has ${analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no}% confidence after volatility adjustment.`}
      />
      
      <ExplainerRow
        term="Conviction"
        meaning={`How strong the directional prediction is. ${analysis.directional.convictionTier === "High" ? "Strong evidence supports this direction." : analysis.directional.convictionTier === "Moderate" ? "Moderate evidence - additional research recommended." : "Weak evidence - high uncertainty."}`}
      />
      
      <ExplainerRow
        term="Reliability"
        meaning={`Model confidence in its own prediction (${reliability.score}%). Combines signal stability (${analysis.stats.stability}%), divergence (spread: ${analysis.stats.divergence}pts), and volatility (${analysis.stats.volatility}%). ${reliability.level} reliability means ${reliability.level === "High" ? "trust the model" : reliability.level === "Moderate" ? "proceed with caution" : "high uncertainty, wait for clearer signals"}.`}
      />
      
      <ExplainerRow
        term="Why"
        meaning="Plain-English explanation of which signals are driving the prediction and whether they agree or conflict."
      />
    </div>
  );
}

function ExplainerRow({ term, meaning }: { term: string; meaning: string }) {
  return (
    <div style={{ marginBottom: 10, fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 700, color: "#e5e7eb", marginBottom: 2 }}>{term}</div>
      <div style={{ color: "#9ca3af" }}>{meaning}</div>
    </div>
  );
}

export function TradeRecommendation({ analysis }: { analysis: AnalysisOutput }) {
  const reliability = calculateReliability(analysis);
  const direction = analysis.directional.yes > 50 ? "YES" : "NO";
  const confidence = analysis.directional.yes > 50 ? analysis.directional.yes : analysis.directional.no;
  
  let recommendation = "";
  
  if (reliability.level === "High" && analysis.directional.convictionTier === "High") {
    recommendation = `Based on high signal alignment and ${reliability.score}% reliability, TradeDNA leans ${direction} with strong conviction. Favorable for execution.`;
  } else if (reliability.level === "High" || analysis.directional.convictionTier === "Moderate") {
    recommendation = `Based on ${analysis.directional.stabilityLabel.toLowerCase()} stability and ${reliability.level.toLowerCase()} reliability, TradeDNA suggests ${direction} with ${analysis.directional.convictionTier.toLowerCase()} conviction. Additional research recommended before trading.`;
  } else if (reliability.level === "Low" || analysis.directional.convictionTier === "Weak" || analysis.directional.convictionTier === "Uncertain") {
    recommendation = `Signals show ${reliability.level.toLowerCase()} reliability and ${analysis.directional.convictionTier.toLowerCase()} conviction. High uncertainty detected. Wait for clearer indicators before trading.`;
  } else {
    recommendation = `TradeDNA leans ${direction} (${confidence}%) with ${analysis.directional.convictionTier.toLowerCase()} conviction and ${reliability.level.toLowerCase()} reliability. Validate evidence sources before execution.`;
  }
  
  const bgColor = reliability.level === "High" ? "rgba(16, 185, 129, 0.1)" : reliability.level === "Moderate" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)";
  const borderColor = reliability.level === "High" ? "rgba(16, 185, 129, 0.3)" : reliability.level === "Moderate" ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)";
  
  return (
    <div style={{ 
      marginTop: 20, 
      padding: 16, 
      borderRadius: 14, 
      background: bgColor,
      border: `2px solid ${borderColor}`
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: reliability.color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span>💡</span>
        <span>Trade Recommendation</span>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: "#e5e7eb" }}>
        {recommendation}
      </div>
    </div>
  );
}
