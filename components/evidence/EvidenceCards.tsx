// components/evidence/EvidenceCards.tsx
"use client";

import { useEffect, useState } from "react";
import type { NewsData } from "@/lib/data/newsData";
import type { SocialData } from "@/lib/data/socialData";

type EvidenceCardsProps = {
  event: string;
  newsData: NewsData | null;
  socialData: SocialData | null;
  isLoading: boolean;
};

export function EvidenceCards({ event, newsData, socialData, isLoading }: EvidenceCardsProps) {
  const q = encodeURIComponent(event);

  return (
    <div style={{ marginTop: 28, padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Evidence Sources</h3>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {/* Social Card */}
        <EvidenceCard
          title="Social Signals"
          icon="💬"
          loading={isLoading}
          data={socialData}
          fallbackLinks={[
            { label: "X search", url: `https://x.com/search?q=${q}&src=typed_query` },
            { label: 'X: "YES" sentiment', url: `https://x.com/search?q=${q}%20YES` },
            { label: 'X: "NO" sentiment', url: `https://x.com/search?q=${q}%20NO` },
          ]}
        >
          {socialData && !socialData.error && (
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                Estimated Volume: <b style={{ color: "#67e8f9" }}>{socialData.estimatedVolume.toLocaleString()}</b> mentions
              </div>
              {socialData.estimatedVolume > 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  Sentiment: 
                  <span style={{ color: "#10b981", marginLeft: 6 }}>↑{socialData.sentiment.positive}%</span>
                  <span style={{ color: "#ef4444", marginLeft: 6 }}>↓{socialData.sentiment.negative}%</span>
                  <span style={{ color: "#9ca3af", marginLeft: 6 }}>≈{socialData.sentiment.neutral}%</span>
                </div>
              )}
              {socialData.error && (
                <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>
                  ⚠️ {socialData.error} - using fallback links
                </div>
              )}
            </div>
          )}
        </EvidenceCard>

        {/* News Card */}
        <EvidenceCard
          title="News Coverage"
          icon="📰"
          loading={isLoading}
          data={newsData}
          fallbackLinks={[
            { label: "Google News", url: `https://news.google.com/search?q=${q}` },
            { label: "Reuters", url: `https://www.google.com/search?q=site:reuters.com+${q}` },
            { label: "Bloomberg", url: `https://www.google.com/search?q=site:bloomberg.com+${q}` },
          ]}
        >
          {newsData && !newsData.error && (
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>
                Found <b style={{ color: "#67e8f9" }}>{newsData.totalCount}</b> recent articles
              </div>
              {newsData.articles.length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  {newsData.articles.slice(0, 3).map((article, i) => (
                    <a
                      key={i}
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "block",
                        padding: 8,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb", lineHeight: 1.4, marginBottom: 4 }}>
                        {article.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{article.source}</div>
                    </a>
                  ))}
                </div>
              )}
              {newsData.error && (
                <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>
                  ⚠️ {newsData.error} - using fallback links
                </div>
              )}
            </div>
          )}
        </EvidenceCard>

        {/* Technical Card */}
        <EvidenceCard
          title="Technical Data"
          icon="📊"
          loading={false}
          data={null}
          fallbackLinks={[
            { label: "TradingView charts", url: `https://www.tradingview.com/search/?text=${q}` },
            { label: "CoinMarketCap", url: `https://coinmarketcap.com/search?q=${q}` },
            { label: "Polymarket", url: `https://polymarket.com/search?q=${q}` },
          ]}
        >
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Technical analysis uses intelligent simulation based on event category and keywords. Real market data integration coming soon.
          </div>
        </EvidenceCard>
      </div>

      {(newsData || socialData) && (
        <div style={{ marginTop: 14, fontSize: 11, color: "#6b7280", textAlign: "right" }}>
          Last updated: {new Date(newsData?.lastUpdated || socialData?.lastUpdated || Date.now()).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

function EvidenceCard({
  title,
  icon,
  loading,
  data,
  fallbackLinks,
  children,
}: {
  title: string;
  icon: string;
  loading: boolean;
  data: any;
  fallbackLinks: Array<{ label: string; url: string }>;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Loading data...</div>
        </div>
      ) : data ? (
        <div>{children}</div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10 }}>Manual verification links:</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
            {fallbackLinks.map((link, i) => (
              <li key={i}>
                <a href={link.url} target="_blank" rel="noreferrer" style={{ color: "#00D4FF" }}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
