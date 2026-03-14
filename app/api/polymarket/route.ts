import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Builder Attribution Headers ───────────────────────────────────────────
function getBuilderHeaders(): Record<string, string> {
  try {
    const apiKey     = process.env.POLY_BUILDER_API_KEY;
    const secret     = process.env.POLY_BUILDER_SECRET;
    const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

    if (!apiKey || !secret || !passphrase) return {};

    const timestamp = Date.now().toString();
    const method    = 'GET';
    const path      = '/events';
    const message   = timestamp + method + path;

    const signature = crypto
      .createHmac('sha256', Buffer.from(secret, 'base64'))
      .update(message)
      .digest('base64');

    return {
      'POLY_BUILDER_API_KEY':    apiKey,
      'POLY_BUILDER_TIMESTAMP':  timestamp,
      'POLY_BUILDER_PASSPHRASE': passphrase,
      'POLY_BUILDER_SIGNATURE':  signature,
    };
  } catch {
    return {};
  }
}

// ─── Outcome Type Detection ─────────────────────────────────────────────────
function detectOutcomeType(names: string[]): 'companies' | 'dates' | 'candidates' | 'prices' | 'options' {
  if (names.length === 0) return 'options';

  const sample = names.map(n => n.toLowerCase().trim());

  // Price targets: "$90", "↑$80", "above $100" etc — check BEFORE dates
  const pricePattern = /^\$[\d,]+|^[↑↓]?\s*\$[\d,]+|^above\s*\$|^below\s*\$|^over\s*\$|^under\s*\$/i;
  const priceCount = sample.filter(n => pricePattern.test(n)).length;
  if (priceCount >= names.length * 0.4) return 'prices';

  // Pure numbers: "90", "100" etc
  const pureNumberCount = sample.filter(n => /^\d+(\.\d+)?$/.test(n)).length;
  if (pureNumberCount >= names.length * 0.5) return 'prices';

  // Dates: "March 15", "December 31", "June 30"
  const datePatterns = /^(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|q[1-4])/i;
  const dateCount = sample.filter(n => datePatterns.test(n)).length;
  if (dateCount >= names.length * 0.5) return 'dates';

  // Candidates: two-word proper names
  const namePattern = /^[a-z]+ [a-z]+$/i;
  const nameCount = sample.filter(n => namePattern.test(n)).length;
  if (nameCount >= names.length * 0.6) return 'candidates';

  // Companies
  const companyHints = ['ai', 'inc', 'corp', 'openai', 'google', 'anthropic', 'microsoft', 'meta', 'apple', 'amazon', 'nvidia', 'deepseek', 'mistral', 'xai', 'z.ai', 'meituan', 'alibaba', 'moonshot'];
  const companyCount = sample.filter(n => companyHints.some(h => n.includes(h))).length;
  if (companyCount >= 2) return 'companies';

  return 'options';
}

// ─── Main Route ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return Response.json({ error: 'Missing slug parameter' }, { status: 400 });
  }

  try {
    const builderHeaders = getBuilderHeaders();

    const eventRes = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${slug}&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          ...builderHeaders
        }
      }
    );

    if (!eventRes.ok) throw new Error('Event fetch failed');

    const events = await eventRes.json();
    if (!events || events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const event   = events[0];
    const markets = event.markets;

    if (!markets || markets.length === 0) {
      return Response.json({ error: 'No markets in event' }, { status: 404 });
    }

    const hasGroupItems = markets.some(
      (m: any) => m.groupItemTitle && m.groupItemTitle.trim() !== ''
    );

    if (!hasGroupItems && markets.length === 1) {
      // ── BINARY ──
      return Response.json({
        type:    'binary',
        title:   event.title || markets[0].question,
        volume:  event.volume || '0',
        endDate: event.endDate || '',
        markets: [markets[0]]
      });

    } else {
      // ── CATEGORICAL ──
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

        outcomes.push({
          name:               market.groupItemTitle || market.question || 'Unknown',
          price:              String(yesPrice),
          volume:             market.volume || '0',
          oneDayPriceChange:  market.oneDayPriceChange  || 0,
          oneWeekPriceChange: market.oneWeekPriceChange || 0,
          lastTradePrice:     market.lastTradePrice     || String(yesPrice)
        });
      }

      outcomes.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

      const outcomeType = detectOutcomeType(outcomes.map(o => o.name));

      return Response.json({
        type:        'categorical',
        outcomeType,
        title:       event.title,
        volume:      event.volume || '0',
        endDate:     event.endDate || '',
        outcomes,
      });
    }

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
