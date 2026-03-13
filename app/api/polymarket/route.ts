import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return Response.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  try {
    // STEP 1: Get the event (parent) data
    const eventResponse = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${slug}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!eventResponse.ok) {
      throw new Error('Failed to fetch event');
    }

    const events = await eventResponse.json();
    
    if (!events || events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = events[0];

    // STEP 2: Get ALL markets for this event
    const marketsResponse = await fetch(
      `https://gamma-api.polymarket.com/markets?event_slug=${slug}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!marketsResponse.ok) {
      throw new Error('Failed to fetch markets');
    }

    const allMarkets = await marketsResponse.json();

    // COMPREHENSIVE DEBUG LOGGING
    console.log('====================================');
    console.log('POLYMARKET API DEBUG');
    console.log('====================================');
    console.log('TOTAL MARKETS:', allMarkets.length);
    console.log('FIRST MARKET KEYS:', Object.keys(allMarkets[0]));
    console.log('FIRST MARKET FULL:', JSON.stringify(allMarkets[0], null, 2));
    if (allMarkets.length > 1) {
      console.log('SECOND MARKET KEYS:', Object.keys(allMarkets[1]));
      console.log('SECOND MARKET FULL:', JSON.stringify(allMarkets[1], null, 2));
    }
    console.log('====================================');

    if (!allMarkets || allMarkets.length === 0) {
      return Response.json({ error: 'No markets found' }, { status: 404 });
    }

    // STEP 3: Detect market type
    // Binary market: Single market with "Yes"/"No" outcomes
    // Categorical market: Multiple markets, each representing one outcome
    
    const firstMarket = allMarkets[0];
    let outcomes;
    
    try {
      outcomes = typeof firstMarket.outcomes === 'string' 
        ? JSON.parse(firstMarket.outcomes) 
        : firstMarket.outcomes;
    } catch {
      outcomes = firstMarket.outcomes;
    }

    const isBinary = outcomes && outcomes.length === 2 && 
      outcomes.some((o: string) => o === "Yes") && 
      outcomes.some((o: string) => o === "No");

    if (isBinary) {
      // BINARY MARKET
      // Return the single market as-is
      return Response.json({
        title: event.title || firstMarket.question,
        volume: event.volume,
        markets: [firstMarket]
      });

    } else {
      // CATEGORICAL MARKET
      // Each market in allMarkets represents ONE outcome
      // We need to combine them into a single unified market object
      
      // Extract outcome names and prices from each market
      const outcomeNames: string[] = [];
      const outcomePrices: string[] = [];

      for (const market of allMarkets) {
        // TRY MULTIPLE FIELD NAMES for outcome label
        const outcomeName = 
          market.groupItemTitle ||     // Most common for categorical
          market.groupItemTitleShort || // Sometimes abbreviated
          market.title ||              // Alternative field
          market.question ||           // Fallback to full question
          market.description ||        // Another fallback
          'Unknown';
        
        console.log(`Processing outcome: "${outcomeName}"`);
        outcomeNames.push(outcomeName);

        // Parse prices safely with multiple format support
        let prices;
        try {
          prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch {
          // If parsing fails, try as comma-separated string
          if (typeof market.outcomePrices === 'string') {
            prices = market.outcomePrices.split(',').map(p => p.trim());
          } else {
            prices = ['0', '1'];
          }
        }

        console.log(`  Raw prices:`, prices);

        // For categorical outcomes, index [0] is the YES probability
        let yesPrice = prices && prices[0] ? String(prices[0]) : '0';
        
        // Validate and convert to decimal format
        let numericPrice = parseFloat(yesPrice);
        
        // Check if price is in cents (0-100) vs decimal (0-1)
        if (!isNaN(numericPrice)) {
          if (numericPrice > 1) {
            // Price is in cents (e.g., 31 instead of 0.31)
            numericPrice = numericPrice / 100;
            yesPrice = String(numericPrice);
            console.log(`  Converted from cents: ${prices[0]} → ${yesPrice}`);
          }
        } else {
          yesPrice = '0';
        }

        // Final validation
        const validPrice = (!isNaN(numericPrice) && numericPrice >= 0 && numericPrice <= 1)
          ? yesPrice
          : '0';
        
        console.log(`  Final price: ${validPrice} (${Math.round(parseFloat(validPrice) * 100)}%)`);
        outcomePrices.push(validPrice);
      }

      // Validate total probability
      const totalProbability = outcomePrices.reduce((sum, p) => sum + parseFloat(p), 0);
      console.log('====================================');
      console.log('TOTAL PROBABILITY:', totalProbability.toFixed(2));
      console.log('EXPECTED: ~1.00 (100%)');
      console.log('====================================');

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

  } catch (error: any) {
    console.error('Polymarket API error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
