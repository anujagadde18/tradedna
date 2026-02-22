// ADD THIS TO app/scores/page.tsx
// Inside the {showAdvanced && ( section
// AFTER the "Technical Metrics" div
// BEFORE the closing </div> of showAdvanced

            {/* Evidence Sources - Shows where data comes from */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, color: "#71717a", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
                Data Sources
              </div>
              
              {/* News Sources */}
              {newsData && !newsData.error && newsData.totalCount > 0 && (
                <div style={{ marginBottom: 16, padding: 18, borderRadius: 12, background: "rgba(251,146,60,0.05)", border: "1px solid rgba(251,146,60,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>📰</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>
                      News Articles ({newsData.totalCount} found)
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>
                    From trusted news sources
                  </div>
                  {newsData.articles && newsData.articles.slice(0, 3).map((article: any, i: number) => (
                    <a
                      key={i}
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ 
                        display: "block", 
                        padding: "10px 12px", 
                        marginBottom: 8,
                        borderRadius: 8, 
                        background: "rgba(255,255,255,0.03)", 
                        border: "1px solid rgba(255,255,255,0.06)",
                        textDecoration: "none",
                        color: "#d4d4d8",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#e4e4e7" }}>
                        {article.title}
                      </div>
                      <div style={{ fontSize: 11, color: "#71717a" }}>
                        {article.source}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Social Sources */}
              {socialData && !socialData.error && socialData.estimatedVolume > 0 && (
                <div style={{ padding: 18, borderRadius: 12, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>🗣️</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#e4e4e7" }}>
                      Social Media ({socialData.estimatedVolume.toLocaleString()} mentions)
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 10 }}>
                    Sentiment: {socialData.sentiment.positive}% positive, {socialData.sentiment.negative}% negative
                  </div>
                  <div style={{ fontSize: 12, color: "#71717a" }}>
                    From Twitter, Reddit, and other platforms
                  </div>
                </div>
              )}

              {/* Warning if no real data */}
              {(!newsData || newsData.error) && (!socialData || socialData.error) && (
                <div style={{ padding: 16, borderRadius: 10, background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}>
                  <div style={{ fontSize: 13, color: "#fb923c", lineHeight: 1.6 }}>
                    ⚠️ Real-time data unavailable. Using baseline analysis based on pattern matching only.
                  </div>
                </div>
              )}
            </div>
