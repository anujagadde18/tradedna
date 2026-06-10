import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function detectOutcomeType(names: string[]): 'companies' | 'dates' | 'candidates' | 'prices' | 'options' {
  if (names.length === 0) return 'options';

  const sample = names.map(n => n.toLowerCase().trim());

  const pricePattern = /^\$[\d,]+|^[updown]?\s*\$[\d,]+|^above\s*\$|^below\s*\$|^over\s*\$|^under\s*\$/i;
  const priceCount = sample.filter(n => pricePattern.test(n)).length;
  if (priceCount >= names.length * 0.4) return 'prices';

  const pureNumberCount = sample.filter(n => /^\d+(\.\d+)?$/.test(n)).length;
  if (pureNumberCount >= names.length * 0.5) return 'prices';

  const datePatterns = /^(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|q[1-4])/i;
  const dateCount = sample.filter(n => datePatterns.test(n)).length;
  if (dateCount >= names.length * 0.5) return 'dates';

  const namePattern = /^[a-z]+ [a-z]+$/i;
  const nameCount = sample.filter(n => namePattern.test(n)).length;
  if (nameCount >= names.length * 0.6) return 'candidates';

  const companyHints = ['ai', 'inc', 'corp', 'openai', 'google', 'anthropic', 'microsoft', 'meta', 'apple', 'amazon', 'nvidia', 'deepseek', 'mistral', 'xai', 'z.ai', 'meituan', 'alibaba', 'moonshot'];
  const companyCount = sample.filter(n => companyHints.some(h => n.includes(h))).length;
  if (companyCount >= 2) return 'companies';

  return 'options';
}

// Extract YES token ID from a market object
// Polymarket stores token IDs in clobTokenIds field as JSON array
// Index 0 = YES token, Index 1 = NO token
function extractYesTokenId(market: any): string | null {
  try {
    // Try clobTokenIds field first (most common)
    if (market.clobTokenIds) {
      const tokens = typeof market.clobTokenIds === 'string'
        ? JSON.parse(market.clobTokenIds)
        : market.clobTokenIds;
      if (Array.isArray(tokens) && tokens[0]) return tokens[0];
    }

    // Try tokens array (alternative field name)
    if (market.tokens && Array.isArray(market.tokens)) {
      const yesToken = market.tokens.find((t: any) =>
        t.outcome === 'Yes' || t.outcome === 'YES' || t.winner === true
      );
      if (yesToken?.token_id) return yesToken.token_id;
      if (market.tokens[0]?.token_id) return market.tokens[0].token_id;
    }

    // Try conditionId as fallback identifier
    if (market.conditionId) return market.conditionId;

  } catch {}
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return Response.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  try {
    const eventRes = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${slug}&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!eventRes.ok) throw new Error('Event fetch failed');

    const events = await eventRes.json();
    if (!events || events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = events[0];
    const markets = event.markets;

    if (!markets || markets.length === 0) {
      return Response.json({ error: 'No markets in event' }, { status: 404 });
    }

    const hasGroupItems = markets.some(
      (m: any) => m.groupItemTitle && m.groupItemTitle.trim() !== ''
    );

    // For multi-market events (NBA games etc), find the moneyline/game winner market
    const findMoneyline = (markets: any[]) => {
      // First try: find market with question matching exactly "If X wins" pattern
      const winnerMarket = markets.find((m: any) => {
        const q = (m.question || '').toLowerCase();
        const active = m.active !== false && m.closed !== true;
        const price = m.lastTradePrice || m.outcomePrices;
        // Must be active and have a price between 10-90% (not completed)
        let pct = 50;
        try {
          const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
          if (prices) pct = Math.round(parseFloat(prices[0]) * 100);
        } catch {}
        if (pct <= 5 || pct >= 95) return false; // completed/invalid
        // Match moneyline patterns
        return (q.includes('if the') && q.includes('win')) ||
               q.match(/will .* win the game/) ||
               (q.includes('moneyline') && !q.includes('o/u'));
      });
      if (winnerMarket) return winnerMarket;
      
      // Second try: find market with valid odds between 20-80%
      return markets.find((m: any) => {
        try {
          const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
          if (!prices) return false;
          const pct = Math.round(parseFloat(prices[0]) * 100);
          const q = (m.question || '').toLowerCase();
          const isNotProp = !q.includes('o/u') && !q.includes('points') && 
                           !q.includes('rebounds') && !q.includes('assists') &&
                           !q.includes('3-pointer') && !q.includes('score') &&
                           !q.includes('half') && !q.includes('tip');
          return pct >= 20 && pct <= 80 && isNotProp;
        } catch { return false; }
      });
    };

    const moneylineMarket = markets.length > 1 ? findMoneyline(markets) : null;

    // If no moneyline found in multi-market event, reject it
    if (markets.length > 10 && !moneylineMarket) {
      return Response.json({ error: 'Multi-market prop event — please type your question directly instead of pasting URL' }, { status: 400 });
    }

    if (!hasGroupItems && (markets.length === 1 || moneylineMarket)) {
      // -- BINARY --
      const market = moneylineMarket || markets[0];

      // Extract both YES and NO token IDs for binary markets
      let yesTokenId: string | null = null;
      let noTokenId: string | null = null;

      try {
        if (market.clobTokenIds) {
          const tokens = typeof market.clobTokenIds === 'string'
            ? JSON.parse(market.clobTokenIds)
            : market.clobTokenIds;
          if (Array.isArray(tokens)) {
            yesTokenId = tokens[0] || null;
            noTokenId  = tokens[1] || null;
          }
        } else if (market.tokens && Array.isArray(market.tokens)) {
          yesTokenId = market.tokens[0]?.token_id || null;
          noTokenId  = market.tokens[1]?.token_id || null;
        }
      } catch {}

      return Response.json({
        type:       'binary',
        title:      event.title || market.question,
        volume:     event.volume || '0',
        endDate:    event.endDate || '',
        yesTokenId,
        noTokenId,
        markets:    [market]
      });

    } else {
      // -- CATEGORICAL --
      const outcomes: any[] = [];

      for (const market of markets) {
        if (!market.outcomePrices) continue;

        let prices: string[];
        try {
          prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch { continue; }

        if (!prices || !Array.isArray(prices) || prices.length === 0) continue;

        let yesPrice = parseFloat(prices[0] || '0');
        if (isNaN(yesPrice) || yesPrice <= 0) continue;
        if (yesPrice > 1 && yesPrice <= 100) yesPrice = yesPrice / 100;

        const name      = market.groupItemTitle || market.question || 'Unknown';
        const tokenId   = extractYesTokenId(market);

        outcomes.push({
          name,
          price:              String(yesPrice),
          volume:             market.volume || '0',
          oneDayPriceChange:  market.oneDayPriceChange  || 0,
          oneWeekPriceChange: market.oneWeekPriceChange || 0,
          lastTradePrice:     market.lastTradePrice     || String(yesPrice),
          // Token ID for placing orders - null if not available
          clobTokenId:        tokenId,
        });
      }

      outcomes.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

      const outcomeNames = outcomes.map(o => o.name);
      const outcomeType  = detectOutcomeType(outcomeNames);

      // Log token ID availability for debugging
      const withTokens    = outcomes.filter(o => o.clobTokenId).length;
      const withoutTokens = outcomes.length - withTokens;
      console.log(`Token IDs: ${withTokens}/${outcomes.length} outcomes have tokens (${withoutTokens} missing)`);

      return Response.json({
        type:       'categorical',
        outcomeType,
        title:      event.title,
        volume:     event.volume || '0',
        endDate:    event.endDate || '',
        outcomes,
      });
    }

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
