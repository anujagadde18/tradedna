import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Detect what kind of outcomes these are based on names
function detectOutcomeType(names: string[]): 'companies' | 'dates' | 'candidates' | 'prices' | 'options' {
  if (names.length === 0) return 'options';

  const sample = names.map(n => n.toLowerCase().trim());

  // Price/number targets: "$90", "↑$80", "90", "$100", "above 90" etc.
  // Must check this BEFORE date check — "$90" ends in digits but is a price
  const pricePattern = /^\$[\d,]+|^[↑↓]?\s*\$[\d,]+|^above\s*\$|^below\s*\$|^over\s*\$|^under\s*\$/i;
  const priceCount = sample.filter(n => pricePattern.test(n)).length;
  if (priceCount >= names.length * 0.4) return 'prices';

  // Pure number ranges: "90", "100", "75" with no $ — still price targets in context
  const pureNumberCount = sample.filter(n => /^\d+(\.\d+)?$/.test(n)).length;
  if (pureNumberCount >= names.length * 0.5) return 'prices';

  // Date patterns: "March 15", "December 31", "June 30", "Q1 2026"
  // Must NOT match things that are just numbers (caught above)
  const datePatterns = /^(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|q[1-4])/i;
  const dateCount = sample.filter(n => datePatterns.test(n)).length;
  if (dateCount >= names.length * 0.5) return 'dates';

  // Candidate patterns: two-word proper names like "Donald Trump", "Kamala Harris"
  const namePattern = /^[a-z]+ [a-z]+$/i;
  const nameCount = sample.filter(n => namePattern.test(n)).length;
  if (nameCount >= names.length * 0.6) return 'candidates';

  // Company patterns
  const companyHints = ['ai', 'inc', 'corp', 'openai', 'google', 'anthropic', 'microsoft', 'meta', 'apple', 'amazon', 'nvidia', 'deepseek', 'mistral', 'xai', 'z.ai', 'meituan', 'alibaba', 'moonshot'];
  const companyCount = sample.filter(n => companyHints.some(h => n.includes(h))).length;
  if (companyCount >= 2) return 'companies';

  return 'options';
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

    if (!hasGroupItems && markets.length === 1) {
      // BINARY
      return Response.json({
        type: 'binary',
        title: event.title || markets[0].question,
        volume: event.volume || '0',
        endDate: event.endDate || '',
        markets: [markets[0]]
      });

    } else {
      // CATEGORICAL
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

        const name = market.groupItemTitle || market.question || 'Unknown';

        outcomes.push({
          name,
          price: String(yesPrice),
          volume: market.volume || '0',
          oneDayPriceChange: market.oneDayPriceChange || 0,
          oneWeekPriceChange: market.oneWeekPriceChange || 0,
          lastTradePrice: market.lastTradePrice || String(yesPrice)
        });
      }

      outcomes.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

      // Detect what kind of outcomes these are
      const outcomeNames = outcomes.map(o => o.name);
      const outcomeType = detectOutcomeType(outcomeNames);

      return Response.json({
        type: 'categorical',
        outcomeType, // 'companies' | 'dates' | 'candidates' | 'options'
        title: event.title,
        volume: event.volume || '0',
        endDate: event.endDate || '',
        outcomes,
        outcomeType
      });
    }

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
