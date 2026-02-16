// lib/data/newsData.ts

export type NewsArticle = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
};

export type NewsData = {
  articles: NewsArticle[];
  totalCount: number;
  score: number; // 0-100
  lastUpdated: number;
  error?: string;
};

// Google News RSS feed parser
export async function fetchNewsData(event: string): Promise<NewsData> {
  try {
    const query = encodeURIComponent(event);
    
    // Use Google News RSS feed (free, no API key needed)
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradeDNA/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`News fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Parse RSS XML
    const articles = parseRSSFeed(xmlText);
    
    // Calculate score based on article count and recency
    const score = calculateNewsScore(articles);
    
    return {
      articles: articles.slice(0, 5), // Top 5 for display
      totalCount: articles.length,
      score,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('News fetch error:', error);
    
    // Return fallback data
    return {
      articles: [],
      totalCount: 0,
      score: 50, // Neutral score on error
      lastUpdated: Date.now(),
      error: 'Unable to fetch news data',
    };
  }
}

function parseRSSFeed(xmlText: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  try {
    // Simple XML parsing (extract <item> elements)
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const items = xmlText.match(itemRegex) || [];
    
    for (const item of items) {
      const title = extractTag(item, 'title');
      const link = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate');
      const source = extractTag(item, 'source');
      
      if (title && link) {
        articles.push({
          title: cleanText(title),
          source: cleanText(source) || 'Unknown Source',
          url: link,
          publishedAt: pubDate || new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('RSS parse error:', error);
  }
  
  return articles;
}

function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[(.*?)\\]\\]><\/${tagName}>`, 's');
  const cdataMatch = xml.match(regex);
  if (cdataMatch) return cdataMatch[1];
  
  const simpleRegex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 's');
  const match = xml.match(simpleRegex);
  return match ? match[1] : '';
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function calculateNewsScore(articles: NewsArticle[]): number {
  if (articles.length === 0) return 45; // Slightly below baseline
  
  // Base score: more articles = higher score
  let score = 50;
  
  // Add points based on article count
  if (articles.length >= 50) score += 25;
  else if (articles.length >= 30) score += 20;
  else if (articles.length >= 20) score += 15;
  else if (articles.length >= 10) score += 10;
  else if (articles.length >= 5) score += 5;
  
  // Add points for recent articles (last 24 hours)
  const recentCount = articles.filter(a => {
    const pubDate = new Date(a.publishedAt);
    const hoursAgo = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);
    return hoursAgo <= 24;
  }).length;
  
  if (recentCount >= 10) score += 10;
  else if (recentCount >= 5) score += 5;
  
  // Add points for credible sources
  const credibleSources = ['reuters', 'bloomberg', 'wsj', 'ft.com', 'cnbc', 'bbc'];
  const credibleCount = articles.filter(a => 
    credibleSources.some(src => a.source.toLowerCase().includes(src))
  ).length;
  
  if (credibleCount >= 3) score += 5;
  
  return Math.min(95, Math.max(40, score));
}

// Client-side cache to avoid repeated fetches
const newsCache = new Map<string, { data: NewsData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedNewsData(event: string): Promise<NewsData> {
  const cached = newsCache.get(event);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchNewsData(event);
  newsCache.set(event, { data, timestamp: Date.now() });
  
  return data;
}
