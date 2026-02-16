// lib/data/socialData.ts

export type SocialData = {
  estimatedVolume: number; // Approximate result count
  score: number; // 0-100
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  lastUpdated: number;
  error?: string;
};

// Estimate social volume by analyzing search result pages
export async function fetchSocialData(event: string): Promise<SocialData> {
  try {
    const query = encodeURIComponent(event);
    
    // Use Twitter/X search page (parse result count from HTML)
    const searchUrl = `https://x.com/search?q=${query}&src=typed_query`;
    
    // Make request with proper headers
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Social fetch failed: ${response.status}`);
    }

    const html = await response.text();
    
    // Estimate volume from page indicators
    const estimatedVolume = estimateVolumeFromPage(html);
    
    // Calculate score based on volume
    const score = calculateSocialScore(estimatedVolume);
    
    // Simple sentiment estimation (can be improved with NLP)
    const sentiment = estimateSentiment(html, event);
    
    return {
      estimatedVolume,
      score,
      sentiment,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('Social fetch error:', error);
    
    // Return fallback data
    return {
      estimatedVolume: 0,
      score: 50, // Neutral score on error
      sentiment: { positive: 33, negative: 33, neutral: 34 },
      lastUpdated: Date.now(),
      error: 'Unable to fetch social data',
    };
  }
}

function estimateVolumeFromPage(html: string): number {
  // Look for indicators of result count
  // Twitter/X doesn't show exact counts, so we estimate from page structure
  
  let volume = 0;
  
  // Count tweet-like elements in the HTML
  const tweetIndicators = (html.match(/data-testid="tweet"/g) || []).length;
  
  if (tweetIndicators > 0) {
    // If we see tweets, estimate volume
    // More tweets on first page = higher overall volume
    volume = tweetIndicators * 100; // Rough estimate
  }
  
  // Look for "popular" or "trending" indicators
  if (html.includes('trending') || html.includes('popular')) {
    volume += 500;
  }
  
  // Look for verification badges (indicates higher engagement)
  const verifiedCount = (html.match(/verified/gi) || []).length;
  volume += verifiedCount * 50;
  
  return Math.min(10000, volume);
}

function calculateSocialScore(volume: number): number {
  let score = 50;
  
  // Add points based on estimated volume
  if (volume >= 5000) score += 25;
  else if (volume >= 2000) score += 20;
  else if (volume >= 1000) score += 15;
  else if (volume >= 500) score += 10;
  else if (volume >= 100) score += 5;
  else if (volume === 0) score -= 5;
  
  return Math.min(95, Math.max(40, score));
}

function estimateSentiment(html: string, event: string): { positive: number; negative: number; neutral: number } {
  // Simple keyword-based sentiment (can be improved with NLP API)
  const text = html.toLowerCase();
  
  const positiveWords = ['bullish', 'up', 'win', 'great', 'success', 'surge', 'rally', 'breakout'];
  const negativeWords = ['bearish', 'down', 'lose', 'crash', 'fail', 'drop', 'fall', 'collapse'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'g'));
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'g'));
    if (matches) negativeCount += matches.length;
  });
  
  const total = positiveCount + negativeCount || 1;
  const positive = Math.round((positiveCount / total) * 100);
  const negative = Math.round((negativeCount / total) * 100);
  const neutral = 100 - positive - negative;
  
  return { positive, negative, neutral };
}

// Client-side cache
const socialCache = new Map<string, { data: SocialData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedSocialData(event: string): Promise<SocialData> {
  const cached = socialCache.get(event);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetchSocialData(event);
  socialCache.set(event, { data, timestamp: Date.now() });
  
  return data;
}
