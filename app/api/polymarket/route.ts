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
        // The outcome name is in groupItemTitle or question
        const outcomeName = market.groupItemTitle || market.question || 'Unknown';
        outcomeNames.push(outcomeName);

        // Get the YES price for this outcome
        let prices;
        try {
          prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch {
          prices = market.outcomePrices;
        }

        // For categorical outcomes, index [0] is the YES probability
        const yesPrice = prices && prices[0] ? prices[0] : '0';
        outcomePrices.push(yesPrice);
      }

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
