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
    const moneylineMarket = markets.length > 1 ? markets.find((m: any) => {
      const q = (m.question || m.groupItemTitle || '').toLowerCase();
      // Moneyline has no spread/total keywords and is the main winner market
      return !q.includes('o/u') && !q.includes('over') && !q.includes('under') && 
             !q.includes('spread') && !q.includes('+') && !q.includes('points') &&
             !q.includes('rebounds') && !q.includes('assists') && !q.includes('3-pointer') &&
             !q.includes('half') && !q.includes('quarter') && !q.includes('tip') &&
             !q.includes('score') && !q.includes('odd') && !q.includes('even') &&
             (q.includes('win') || q.includes('knicks') || q.includes('spurs') || 
              q.includes('moneyline') || (m.outcomePrices && JSON.parse(typeof m.outcomePrices === 'string' ? m.outcomePrices : JSON.stringify(m.outcomePrices)).length === 2));
    }) : null;

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
