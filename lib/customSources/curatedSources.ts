// lib/customSources/curatedSources.ts
import { CustomSource, CuratedSource } from "./types";

export const CURATED_SOURCES: Record<string, CuratedSource[]> = {
  news: [
    {
      name: "Bloomberg Markets",
      url: "https://feeds.bloomberg.com/markets/news.rss",
      description: "Premium financial news and market analysis",
      type: "news"
    },
    {
      name: "Financial Times",
      url: "https://www.ft.com/rss/world",
      description: "Global business and financial coverage",
      type: "news"
    },
    {
      name: "Wall Street Journal",
      url: "https://feeds.wsj.com/wsj/xml/rss/3_7085.xml",
      description: "Markets, economics, and business news",
      type: "news"
    },
    {
      name: "CoinDesk",
      url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
      description: "Leading cryptocurrency news platform",
      type: "news"
    },
    {
      name: "BBC News",
      url: "http://feeds.bbci.co.uk/news/rss.xml",
      description: "Global news and current affairs",
      type: "news"
    },
    {
      name: "Reuters World",
      url: "https://www.reuters.com/rssFeed/worldNews",
      description: "Breaking news from around the world",
      type: "news"
    },
    {
      name: "Reuters Middle East",
      url: "https://www.reuters.com/world/middle-east",
      description: "Middle East news and analysis",
      type: "news"
    },
    {
      name: "The Economist",
      url: "https://www.economist.com/rss",
      description: "International news and analysis",
      type: "news"
    }
  ],

  social: [
    {
      name: "@Reuters",
      url: "@Reuters",
      description: "Breaking news updates on Twitter",
      type: "social"
    },
    {
      name: "@AP",
      url: "@AP",
      description: "Associated Press news on Twitter",
      type: "social"
    },
    {
      name: "@BBCBreaking",
      url: "@BBCBreaking",
      description: "BBC breaking news alerts",
      type: "social"
    },
    {
      name: "@elonmusk",
      url: "@elonmusk",
      description: "Tech and market insights",
      type: "social"
    },
    {
      name: "@VitalikButerin",
      url: "@VitalikButerin",
      description: "Ethereum founder, crypto thought leader",
      type: "social"
    },
    {
      name: "@balajis",
      url: "@balajis",
      description: "Tech trends and prediction markets",
      type: "social"
    },
    {
      name: "r/geopolitics",
      url: "r/geopolitics",
      description: "Geopolitical analysis and discussion",
      type: "social"
    },
    {
      name: "r/Polymarket",
      url: "r/Polymarket",
      description: "Polymarket community discussions",
      type: "social"
    },
    {
      name: "r/worldnews",
      url: "r/worldnews",
      description: "Global news and events",
      type: "social"
    },
    {
      name: "r/CryptoCurrency",
      url: "r/CryptoCurrency",
      description: "Cryptocurrency community",
      type: "social"
    }
  ],

  technical: [
    {
      name: "TradingView",
      url: "https://www.tradingview.com",
      description: "Charts and technical analysis platform",
      type: "technical"
    },
    {
      name: "CoinMarketCap",
      url: "https://coinmarketcap.com",
      description: "Crypto prices and market data",
      type: "technical"
    },
    {
      name: "CryptoCompare",
      url: "https://www.cryptocompare.com",
      description: "Cryptocurrency market data aggregator",
      type: "technical"
    },
    {
      name: "Glassnode",
      url: "https://glassnode.com",
      description: "On-chain analytics and insights",
      type: "technical"
    },
    {
      name: "CoinGecko",
      url: "https://www.coingecko.com",
      description: "Comprehensive crypto market tracker",
      type: "technical"
    }
  ]
};

export const DEFAULT_SOURCES: CustomSource[] = [
  {
    id: "default-news",
    type: "news",
    name: "Google News",
    url: "https://news.google.com",
    weight: 100,
    enabled: true,
    isDefault: true,
    description: "Aggregated news from multiple sources"
  },
  {
    id: "default-social",
    type: "social",
    name: "Twitter/Reddit",
    url: "default-social",
    weight: 100,
    enabled: true,
    isDefault: true,
    description: "Social media sentiment analysis"
  },
  {
    id: "default-technical",
    type: "technical",
    name: "Polymarket Odds",
    url: "https://polymarket.com",
    weight: 100,
    enabled: true,
    isDefault: true,
    description: "Live prediction market pricing"
  }
];
