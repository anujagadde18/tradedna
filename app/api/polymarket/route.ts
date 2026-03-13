import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return Response.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  try {
    console.log('=== POLYMARKET API DEBUG ===');
    console.log('Fetching slug:', slug);

    // Fetch event with nested markets
    const eventRes = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${slug}&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!eventRes.ok) {
      throw new Error('Event fetch failed');
    }
    
    const events = await eventRes.json();
    
    if (!events || events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = events[0];
    const markets = event.markets;

    if (!markets || markets.length === 0) {
      return Response.json({ error: 'No markets in event' }, { status: 404 });
    }

    console.log('Event title:', event.title);
    console.log('Total markets:', markets.length);
    console.log('First market groupItemTitle:', markets[0].groupItemTitle);

    // CRITICAL DISCOVERY FROM LOGS:
    // Categorical markets = multiple Yes/No markets, each with groupItemTitle
    // Binary market = single Yes/No market, no groupItemTitle
    
    const hasGroupItems = markets.some(
      (m: any) => m.groupItemTitle && m.groupItemTitle.trim() !== ''
    );

    console.log('Has groupItemTitle (categorical):', hasGroupItems);

    if (!hasGroupItems && markets.length === 1) {
      // ═══════════════════════════════════════════
      // TRUE BINARY MARKET (single Yes/No question)
      // ═══════════════════════════════════════════
      console.log('→ Market type: BINARY');
      
      const market = markets[0];
      
      let prices: string[];
      try {
        prices = typeof market.outcomePrices === 'string'
          ? JSON.parse(market.outcomePrices)
          : market.outcomePrices;
      } catch {
        prices = ['0', '1'];
      }

      console.log('YES price:', prices[0]);
      console.log('===========================');
      
      return Response.json({
        title: event.title || market.question,
        volume: event.volume,
        markets: [market]
      });

    } else {
      // ═══════════════════════════════════════════
      // CATEGORICAL MARKET (multiple competitors)
      // ═══════════════════════════════════════════
      // Each market = one competitor's Yes/No question
      // groupItemTitle = competitor name
      // outcomePrices[0] = YES = probability they win
      
      console.log('→ Market type: CATEGORICAL');
      console.log('Number of competitors:', markets.length);
      console.log('---');

      const outcomeNames: string[] = [];
      const outcomePrices: string[] = [];

      for (const market of markets) {
        // Get competitor name from groupItemTitle
        const name = market.groupItemTitle || market.question || 'Unknown';

        // Parse prices array
        let prices: string[];
        try {
          prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch {
          prices = ['0', '1'];
        }

        // prices[0] = YES = probability THIS competitor wins
        let yesPrice = parseFloat(prices[0] || '0');
        
        // Handle cents format (31 instead of 0.31)
        if (yesPrice > 1 && yesPrice <= 100) {
          yesPrice = yesPrice / 100;
        }

        console.log(`  ${name}: ${(yesPrice * 100).toFixed(1)}%`);

        outcomeNames.push(name);
        outcomePrices.push(String(yesPrice));
      }

      const totalProb = outcomePrices.reduce((sum, p) => sum + parseFloat(p), 0);
      console.log('---');
      console.log('Total probability:', totalProb.toFixed(2), '(expected: ~1.0)');
      console.log('===========================');

      // Return unified categorical market structure
      return Response.json({
        title: event.title,
        volume: event.volume,
        markets: [{
          question: event.title,
          outcomes: JSON.stringify(outcomeNames),
          outcomePrices: JSON.stringify(outcomePrices)
        }]
      });
    }

  } catch (err: any) {
    console.error('!!! API Error:', err.message);
    console.error('Stack:', err.stack);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
