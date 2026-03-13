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

    // STEP 1: Fetch event using slug
    // CRITICAL: Markets are NESTED inside the event, not a separate endpoint!
    const eventRes = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${slug}&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!eventRes.ok) {
      throw new Error('Event fetch failed');
    }
    
    const events = await eventRes.json();
    console.log('Events returned:', events?.length);
    
    if (!events || events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = events[0];
    console.log('Event title:', event.title);
    console.log('Event ID:', event.id);
    
    // STEP 2: Markets are NESTED inside event.markets - NO separate API call!
    const markets = event.markets;
    console.log('Markets in event:', markets?.length);
    
    if (!markets || markets.length === 0) {
      return Response.json({ error: 'No markets in event' }, { status: 404 });
    }

    console.log('First market structure:', JSON.stringify(markets[0], null, 2));

    // STEP 3: Detect market type
    const firstMarket = markets[0];
    let firstOutcomes: string[];
    
    try {
      firstOutcomes = typeof firstMarket.outcomes === 'string'
        ? JSON.parse(firstMarket.outcomes)
        : firstMarket.outcomes;
    } catch {
      firstOutcomes = [];
    }

    console.log('First market outcomes:', firstOutcomes);

    // Binary = 1 market with Yes/No
    // Categorical = multiple markets (one per competitor)
    const isBinary = markets.length === 1 ||
      (firstOutcomes.length === 2 &&
        firstOutcomes.includes('Yes') &&
        firstOutcomes.includes('No'));

    if (isBinary) {
      // ── BINARY MARKET ──────────────────────────────
      console.log('✓ Market type: BINARY');
      
      let prices: string[];
      try {
        prices = typeof firstMarket.outcomePrices === 'string'
          ? JSON.parse(firstMarket.outcomePrices)
          : firstMarket.outcomePrices;
      } catch {
        prices = ['0', '1'];
      }

      console.log('Binary prices:', prices);
      console.log('YES probability:', prices[0]);
      console.log('===========================');
      
      return Response.json({
        title: event.title || firstMarket.question,
        volume: event.volume,
        markets: [firstMarket]
      });

    } else {
      // ── CATEGORICAL MARKET ─────────────────────────
      console.log('✓ Market type: CATEGORICAL');
      console.log('Number of outcomes:', markets.length);
      
      const outcomeNames: string[] = [];
      const outcomePrices: string[] = [];

      for (const market of markets) {
        // Try multiple field names for outcome label
        const name =
          market.groupItemTitle ||
          market.groupItemTitleShort ||
          market.title ||
          market.question ||
          'Unknown';

        // Get YES price for this outcome
        let prices: string[];
        try {
          prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch {
          prices = ['0', '1'];
        }

        // prices[0] = probability this outcome wins
        let yesPrice = parseFloat(prices[0] || '0');
        
        // Handle cents format (31 instead of 0.31)
        if (yesPrice > 1 && yesPrice <= 100) {
          yesPrice = yesPrice / 100;
        }

        console.log(`  "${name}" → ${(yesPrice * 100).toFixed(1)}% (raw: ${prices[0]})`);

        outcomeNames.push(name);
        outcomePrices.push(String(yesPrice));
      }

      const totalProb = outcomePrices.reduce((sum, p) => sum + parseFloat(p), 0);
      console.log('---');
      console.log('Total probability:', totalProb.toFixed(2), '(expected: ~1.0)');
      console.log('===========================');

      // Build unified market object
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
