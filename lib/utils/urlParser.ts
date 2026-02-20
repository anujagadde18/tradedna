// lib/utils/urlParser.ts

export function extractEventFromUrl(input: string): string | null {
  // Check if input looks like a URL
  if (!input.includes('://') && !input.includes('polymarket.com')) {
    return null;
  }

  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    
    // Polymarket URLs come in different formats:
    // https://polymarket.com/event/will-trump-win-2024
    // https://polymarket.com/market/will-bitcoin-hit-100k
    // https://polymarket.com/event/will-trump-win-2024-election
    
    const pathname = url.pathname;
    
    // Extract from /event/ or /market/ paths
    const eventMatch = pathname.match(/\/(event|market)\/([^/?]+)/);
    if (eventMatch) {
      const slug = eventMatch[2];
      // Convert slug to readable text: "will-trump-win-2024" -> "Will Trump win 2024"
      return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .replace(/\d{4}/g, match => ` ${match}`) // Add space before years
        .trim() + '?';
    }

    // Check for 'q=' query parameter (search URLs)
    const queryMatch = url.searchParams.get('q');
    if (queryMatch) {
      return decodeURIComponent(queryMatch);
    }

    return null;
  } catch (error) {
    return null;
  }
}

export function isPolymarketUrl(input: string): boolean {
  return input.toLowerCase().includes('polymarket.com');
}
