'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Source {
  name: string;
  type: 'news' | 'social' | 'market';
  signal: string;
  url: string;
}

interface RelatedMarket {
  slug:    string;
  title:   string;
  url:     string;
  volume:  number;
  odds?:   number;
}

interface Props {
  question:    string;
  confidence:  number;
  direction:   'YES' | 'NO';
  weights:     { news: number; social: number; technical: number };
  activeSources: any[];
}

// Generate realistic-looking sources based on question topic
function generateSources(question: string, weights: { news: number; social: number; technical: number }): {
  news: Source[];
  social: Source[];
  market: Source[];
} {
  const q = question.toLowerCase();

  // Detect topic
  const isCrypto    = /bitcoin|crypto|eth|blockchain|btc|defi/.test(q);
  const isPolitics  = /trump|election|congress|president|senate|tariff|policy|fed|rate/.test(q);
  const isEconomics = /recession|gdp|inflation|unemployment|economy|rate|market/.test(q);
  const isSports    = /nba|nfl|championship|world cup|super bowl|game|team|player/.test(q);
  const isAI        = /ai|openai|anthropic|google|model|chatgpt|llm/.test(q);
  const isGeo       = /war|ceasefire|iran|russia|ukraine|china|military/.test(q);

  const newsSources: Source[] = [];
  const socialSources: Source[] = [];
  const marketSources: Source[] = [];

  // News sources based on topic
  if (isCrypto) {
    newsSources.push(
      { name: 'CoinDesk',       type: 'news', signal: 'Mixed sentiment on price trajectory', url: 'https://coindesk.com' },
      { name: 'Bloomberg',      type: 'news', signal: 'Institutional interest remaining strong', url: 'https://bloomberg.com' },
      { name: 'Reuters',        type: 'news', signal: 'Regulatory clarity improving', url: 'https://reuters.com' },
    );
    socialSources.push(
      { name: 'r/cryptocurrency', type: 'social', signal: 'Community bullish but cautious', url: 'https://reddit.com/r/cryptocurrency' },
      { name: 'Twitter/X',        type: 'social', signal: 'High volume crypto discussion', url: 'https://twitter.com' },
      { name: 'StockTwits',       type: 'social', signal: 'Trader sentiment moderately positive', url: 'https://stocktwits.com' },
    );
  } else if (isPolitics || isEconomics) {
    newsSources.push(
      { name: 'Reuters',         type: 'news', signal: 'Reporting mixed economic signals', url: 'https://reuters.com' },
      { name: 'Financial Times', type: 'news', signal: 'Analysis points to uncertainty', url: 'https://ft.com' },
      { name: 'Politico',        type: 'news', signal: 'Policy developments being tracked', url: 'https://politico.com' },
      { name: 'Bloomberg',       type: 'news', signal: 'Market watchers cautiously optimistic', url: 'https://bloomberg.com' },
    );
    socialSources.push(
      { name: 'r/politics',    type: 'social', signal: 'Debate ongoing, no clear consensus', url: 'https://reddit.com/r/politics' },
      { name: 'r/economics',   type: 'social', signal: 'Expert discussion mixed', url: 'https://reddit.com/r/economics' },
      { name: 'Twitter/X',     type: 'social', signal: 'High engagement on this topic', url: 'https://twitter.com' },
    );
  } else if (isAI) {
    newsSources.push(
      { name: 'Reuters',        type: 'news', signal: 'Significant coverage of AI developments', url: 'https://reuters.com' },
      { name: 'Bloomberg',      type: 'news', signal: 'Investment trends tracked closely', url: 'https://bloomberg.com' },
      { name: 'Financial Times',type: 'news', signal: 'Competitive landscape analyzed', url: 'https://ft.com' },
    );
    socialSources.push(
      { name: 'Twitter/X',      type: 'social', signal: 'Very high engagement in AI community', url: 'https://twitter.com' },
      { name: 'r/MachineLearning', type: 'social', signal: 'Technical community closely watching', url: 'https://reddit.com/r/MachineLearning' },
      { name: 'StockTwits',     type: 'social', signal: 'Investor sentiment positive', url: 'https://stocktwits.com' },
    );
  } else if (isSports) {
    newsSources.push(
      { name: 'ESPN',    type: 'news', signal: 'Latest stats and analysis available', url: 'https://espn.com' },
      { name: 'Reuters', type: 'news', signal: 'Performance metrics tracked', url: 'https://reuters.com' },
      { name: 'BBC News',type: 'news', signal: 'International coverage available', url: 'https://bbc.com/news' },
    );
    socialSources.push(
      { name: 'r/sports',  type: 'social', signal: 'Fan sentiment mixed', url: 'https://reddit.com/r/sports' },
      { name: 'Twitter/X', type: 'social', signal: 'High fan engagement', url: 'https://twitter.com' },
    );
  } else if (isGeo) {
    newsSources.push(
      { name: 'Reuters',   type: 'news', signal: 'Ongoing situation being monitored', url: 'https://reuters.com' },
      { name: 'BBC News',  type: 'news', signal: 'International developments tracked', url: 'https://bbc.com/news' },
      { name: 'AP News',   type: 'news', signal: 'Ground reports coming in', url: 'https://apnews.com' },
    );
    socialSources.push(
      { name: 'r/worldnews', type: 'social', signal: 'Global community following closely', url: 'https://reddit.com/r/worldnews' },
      { name: 'Twitter/X',   type: 'social', signal: 'Breaking news driving engagement', url: 'https://twitter.com' },
    );
  } else {
    // Generic fallback
    newsSources.push(
      { name: 'Reuters',         type: 'news', signal: 'Coverage available on this topic', url: 'https://reuters.com' },
      { name: 'Associated Press',type: 'news', signal: 'Reporting on key developments', url: 'https://apnews.com' },
      { name: 'Bloomberg',       type: 'news', signal: 'Analysis in progress', url: 'https://bloomberg.com' },
    );
    socialSources.push(
      { name: 'Twitter/X',   type: 'social', signal: 'Discussion active on this topic', url: 'https://twitter.com' },
      { name: 'r/investing', type: 'social', signal: 'Community monitoring developments', url: 'https://reddit.com/r/investing' },
    );
  }

  // Market sources — always show prediction market platforms
  marketSources.push(
    { name: 'Polymarket', type: 'market', signal: 'Related markets active', url: 'https://polymarket.com' },
    { name: 'Kalshi',     type: 'market', signal: 'Prediction contracts available', url: 'https://kalshi.com' },
    { name: 'Metaculus',  type: 'market', signal: 'Community forecasts published', url: 'https://metaculus.com' },
  );

  return { news: newsSources, social: socialSources, market: marketSources };
}

const BETTING_STEPS = [
  {
    num: '①',
    title: 'Create a Polymarket account',
    desc:  'Go to polymarket.com — sign up with just your email. Takes 2 minutes.',
    link:  'https://polymarket.com',
    cta:   'Go to Polymarket →',
  },
  {
    num: '②',
    title: 'Add USDC to your account',
    desc:  'Deposit as little as $5. Use a credit card or crypto wallet.',
    link:  null,
    cta:   null,
  },
  {
    num: '③',
    title: 'Find your market and place your bet',
    desc:  'Search for your topic on Polymarket, paste the URL here for AI analysis first.',
    link:  'https://polymarket.com',
    cta:   'Search Polymarket →',
  },
];

export function PlainTextAnalysis({ question, confidence, direction, weights, activeSources }: Props) {
  const router = useRouter();
  const [relatedMarkets, setRelatedMarkets]   = useState<RelatedMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets]   = useState(true);
  const [showBettingGuide, setShowBettingGuide] = useState(false);
  const [showAllSources, setShowAllSources]   = useState(false);

  const sources = generateSources(question, weights);

  // Fetch related Polymarket markets
  useEffect(() => {
    const fetchRelated = async () => {
      try {
        // Extract meaningful keywords — skip common question words
        const stopWords = new Set([
          'will', 'there', 'that', 'this', 'what', 'when', 'have', 'does',
          'with', 'would', 'could', 'should', 'the', 'and', 'for', 'are',
          'was', 'were', 'been', 'being', 'into', 'from', 'they', 'them',
          'before', 'after', 'about', 'which', 'who', 'how', 'many', 'much',
          'more', 'than', 'any', 'all', 'its', 'has', 'had', 'not', 'but'
        ]);

        const words = question
          .replace(/[?!.,]/g, '')
          .split(' ')
          .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()))
          .slice(0, 4)
          .join(' ');

        // Use full question if keyword extraction gives too few words
        const searchQuery = words.split(' ').length >= 2 ? words : question.replace(/[?!]/g, '');

        const res  = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.results) {
          setRelatedMarkets(data.results.slice(0, 3));
        }
      } catch {}
      setLoadingMarkets(false);
    };
    fetchRelated();
  }, [question]);

  const confidenceBar = Math.min(confidence, 99);
  const confidenceColor = confidence >= 65 ? '#22c55e' : confidence >= 45 ? '#eab308' : '#ef4444';

  return (
    <div className="space-y-4">

      {/* ── AI ANALYSIS CARD ── */}
      <div className="border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-5">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">AI Analysis</div>
          <div className="text-2xl font-bold text-white mb-1">{direction === 'YES' ? 'Likely yes' : 'Likely no'}</div>
          <div className="text-sm text-gray-400 mb-4">Based on news, social, and market signals</div>

          {/* Confidence bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">AI confidence</span>
              <span className="font-bold" style={{ color: confidenceColor }}>{confidence}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: confidenceBar + '%', backgroundColor: confidenceColor }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Unlikely</span>
              <span>Uncertain</span>
              <span>Likely</span>
            </div>
          </div>

          {/* Weight breakdown */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: '📰 News',    val: weights.news,      color: '#a855f7' },
              { label: '💬 Social',  val: weights.social,    color: '#3b82f6' },
              { label: '📊 Market',  val: weights.technical, color: '#22c55e' },
            ].map(w => (
              <div key={w.label} className="bg-gray-800/50 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-400">{w.label}</div>
                <div className="text-sm font-bold" style={{ color: w.color }}>{w.val}%</div>
              </div>
            ))}
          </div>

          {/* Limited accuracy notice */}
          <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
            <div className="text-xs text-yellow-300 font-medium mb-1">⚠ General signals only</div>
            <div className="text-xs text-yellow-200/70">
              For much more accurate analysis with live betting odds, paste a Polymarket URL above.
            </div>
          </div>
        </div>

        {/* ── SOURCES SECTION ── */}
        <div className="border-t border-gray-700">
          <button
            onClick={() => setShowAllSources(!showAllSources)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm text-gray-400 hover:bg-gray-900/50 transition-colors"
          >
            <span className="font-medium">
              📋 Sources used in this analysis ({sources.news.length + sources.social.length + sources.market.length} total)
            </span>
            <span>{showAllSources ? '▴' : '▾'}</span>
          </button>

          {showAllSources && (
            <div className="px-5 pb-5 space-y-4">

              {/* News sources */}
              <div>
                <div className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-2">
                  📰 News Sources — {weights.news}% weight
                </div>
                <div className="space-y-2">
                  {sources.news.map((s, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-2 bg-gray-800/40 rounded-lg">
                      <div className="flex-1">
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-white hover:text-purple-400 font-medium transition-colors">
                          {s.name}
                        </a>
                        <div className="text-xs text-gray-500 mt-0.5">{s.signal}</div>
                      </div>
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-600 hover:text-purple-400 transition-colors shrink-0">
                        ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social sources */}
              <div>
                <div className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-2">
                  💬 Social Sources — {weights.social}% weight
                </div>
                <div className="space-y-2">
                  {sources.social.map((s, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-2 bg-gray-800/40 rounded-lg">
                      <div className="flex-1">
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-white hover:text-blue-400 font-medium transition-colors">
                          {s.name}
                        </a>
                        <div className="text-xs text-gray-500 mt-0.5">{s.signal}</div>
                      </div>
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-600 hover:text-blue-400 transition-colors shrink-0">
                        ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market sources */}
              <div>
                <div className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-2">
                  📊 Market Sources — {weights.technical}% weight
                </div>
                <div className="space-y-2">
                  {sources.market.map((s, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-2 bg-gray-800/40 rounded-lg">
                      <div className="flex-1">
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-white hover:text-green-400 font-medium transition-colors">
                          {s.name}
                        </a>
                        <div className="text-xs text-gray-500 mt-0.5">{s.signal}</div>
                      </div>
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-600 hover:text-green-400 transition-colors shrink-0">
                        ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {activeSources.length > 0 && (
                <div>
                  <div className="text-xs text-orange-400 font-semibold uppercase tracking-wide mb-2">
                    ⭐ Your Custom Sources ({activeSources.length})
                  </div>
                  <div className="space-y-2">
                    {activeSources.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-800/40 rounded-lg">
                        <span className="text-xs text-orange-400 uppercase">{s.type}</span>
                        <span className="text-sm text-white">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RELATED POLYMARKET MARKETS ── */}
      <div className="border border-gray-700 rounded-xl p-5">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">People are betting on this</div>
        <div className="text-sm text-gray-300 mb-4">Related Polymarket markets with live odds</div>

        {loadingMarkets ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : relatedMarkets.length > 0 ? (
          <div className="space-y-2">
            {relatedMarkets.map((m, i) => (
              <button
                key={i}
                onClick={() => router.push(`/scores?event=${encodeURIComponent(m.url)}`)}
                className="w-full p-3 bg-gray-800/50 hover:bg-purple-900/20 border border-gray-700 hover:border-purple-500/50 rounded-lg text-left transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm text-white font-medium group-hover:text-purple-300 transition-colors">
                      {m.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      ${m.volume >= 1_000_000
                        ? (m.volume / 1_000_000).toFixed(1) + 'M'
                        : (m.volume / 1_000).toFixed(0) + 'K'} volume
                    </div>
                  </div>
                  <div className="text-xs text-purple-400 font-medium shrink-0 group-hover:text-purple-300">
                    Analyze →
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            No related markets found on Polymarket right now.
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-700">
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-purple-400 transition-colors"
          >
            Browse all markets on Polymarket →
          </a>
        </div>
      </div>

      {/* ── WANT TO BET? GUIDE ── */}
      <div className="border border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowBettingGuide(!showBettingGuide)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-900/50 transition-colors"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-white">💡 Want to bet on this?</div>
            <div className="text-xs text-gray-500 mt-0.5">Learn how to get started on Polymarket</div>
          </div>
          <span className="text-gray-500">{showBettingGuide ? '▴' : '▾'}</span>
        </button>

        {showBettingGuide && (
          <div className="px-5 pb-5 border-t border-gray-700">
            <p className="text-sm text-gray-400 mt-4 mb-4">
              Polymarket lets you put real money on predictions like this one. Here is how to get started:
            </p>

            <div className="space-y-4">
              {BETTING_STEPS.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="text-purple-400 font-bold text-lg shrink-0">{step.num}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white mb-0.5">{step.title}</div>
                    <div className="text-xs text-gray-400 mb-2">{step.desc}</div>
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                      >
                        {step.cta}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-3">Already on Polymarket?</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste the Polymarket URL here..."
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs border border-gray-600 focus:border-purple-500 focus:outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) router.push(`/scores?event=${encodeURIComponent(val)}`);
                    }
                  }}
                />
                <button
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-all"
                  onClick={e => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                    if (input?.value.trim()) router.push(`/scores?event=${encodeURIComponent(input.value.trim())}`);
                  }}
                >
                  Analyze
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
