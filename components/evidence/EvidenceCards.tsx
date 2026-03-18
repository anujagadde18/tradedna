// components/evidence/EvidenceCards.tsx
"use client";

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
          icon=""
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
                  <span style={{ color: "#10b981", marginLeft: 6 }}>up{socialData.sentiment.positive}%</span>
                  <span style={{ color: "#ef4444", marginLeft: 6 }}>down{socialData.sentiment.negative}%</span>
                  <span style={{ color: "#9ca3af", marginLeft: 6 }}>~{socialData.sentiment.neutral}%</span>
                </div>
              )}
            </div>
          )}
        </EvidenceCard>

        {/* News Card with Warning */}
        <EvidenceCard
          title="News Coverage"
          icon=""
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
              {/* WARNING LABEL */}
              <div style={{ marginBottom: 10, padding: 8, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                  ! Auto-fetched from Google News
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                  Please verify article relevance before trusting
                </div>
              </div>

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
                        padding: 10,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        textDecoration: "none",
                        color: "#cbd5e1",
                        fontSize: 12,
                        display: "block",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#e5e7eb", marginBottom: 4, lineHeight: 1.3 }}>
                        {article.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{article.source}</div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </EvidenceCard>

        {/* Technical Card */}
        <EvidenceCard
          title="Technical Data"
          icon=""
          loading={false}
          fallbackLinks={[
            { label: "TradingView charts", url: `https://www.tradingview.com/search/?text=${q}` },
            { label: "CoinMarketCap", url: `https://coinmarketcap.com/search?q=${q}` },
            { label: "Polymarket", url: `https://polymarket.com/search?q=${q}` },
          ]}
        >
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Manual verification links:
          </div>
        </EvidenceCard>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: "#6b7280", textAlign: "center" }}>
        Last updated: {new Date().toLocaleTimeString()}
      </div>
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
  data?: any;
  fallbackLinks: { label: string; url: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 14,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.10)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</div>
      ) : (
        <>
          {children}
          
          {data?.error && (
            <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8, marginBottom: 8 }}>
              ! {data.error}
            </div>
          )}

          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
              Manual verification:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {fallbackLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    color: "#60a5fa",
                    textDecoration: "none",
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(59, 130, 246, 0.1)",
                    display: "inline-block",
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
