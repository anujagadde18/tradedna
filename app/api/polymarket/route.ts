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
    console.log('=== POLYMARKET API ===');
    console.log('Slug:', slug);

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

    console.log('Markets:', markets.length);

    // DETECT MARKET TYPE using groupItemTitle
    const hasGroupItems = markets.some(
      (m: any) => m.groupItemTitle && m.groupItemTitle.trim() !== ''
    );

    if (!hasGroupItems && markets.length === 1) {
      // ═══════════════════════════════════════════
      // TYPE 1: TRUE BINARY MARKET
      // ═══════════════════════════════════════════
      console.log('→ Type: BINARY');
      
      const market = markets[0];
      
      return Response.json({
        type: 'binary',
        title: event.title || market.question,
        volume: event.volume || '0',
        markets: [market]
      });

    } else {
      // ═══════════════════════════════════════════
      // TYPE 2: CATEGORICAL/RACE MARKET
      // ═══════════════════════════════════════════
      console.log('→ Type: CATEGORICAL');
      
      const outcomes: any[] = [];

      for (const market of markets) {
        // Skip if no price data
        if (!market.outcomePrices) {
          console.log(`Skip: ${market.groupItemTitle} (no prices)`);
          continue;
        }

        // Parse prices
        let prices: string[];
        try {
          prices = typeof market.outcomePrices === 'string'
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch {
          console.log(`Skip: ${market.groupItemTitle} (parse error)`);
          continue;
        }

        // Validate prices array
        if (!prices || !Array.isArray(prices) || prices.length === 0) {
          console.log(`Skip: ${market.groupItemTitle} (invalid array)`);
          continue;
        }

        // Get YES price
        let yesPrice = parseFloat(prices[0] || '0');
        
        // Skip invalid prices
        if (isNaN(yesPrice) || yesPrice <= 0) {
          console.log(`Skip: ${market.groupItemTitle} (invalid price)`);
          continue;
        }
        
        // Handle cents format
        if (yesPrice > 1 && yesPrice <= 100) {
          yesPrice = yesPrice / 100;
        }

        const name = market.groupItemTitle || market.question || 'Unknown';
        console.log(`  ${name}: ${(yesPrice * 100).toFixed(1)}%`);

        outcomes.push({
          name,
          price: String(yesPrice),
          volume: market.volume || '0',
          oneDayPriceChange: market.oneDayPriceChange || 0,
          oneWeekPriceChange: market.oneWeekPriceChange || 0,
          lastTradePrice: market.lastTradePrice || String(yesPrice)
        });
      }

      // Sort by price descending - highest first
      outcomes.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

      const totalProb = outcomes.reduce((sum, o) => sum + parseFloat(o.price), 0);
      console.log('Total:', totalProb.toFixed(2));
      console.log('======================');

      return Response.json({
        type: 'categorical',
        title: event.title,
        volume: event.volume || '0',
        outcomes // Pre-sorted, ready to render
      });
    }

  } catch (err: any) {
    console.error('!!! Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
