import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function buildSignature(secret: string, timestamp: number, method: string, path: string, body: string): string {
  const message = timestamp + method.toUpperCase() + path + (body || '');
  return crypto.createHmac('sha256', Buffer.from(secret, 'base64')).update(message).digest('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderPayload, useRelayer } = body;

    if (!orderPayload) {
      return Response.json({ error: 'Missing orderPayload' }, { status: 400 });
    }

    const apiKey     = process.env.POLY_BUILDER_API_KEY;
    const secret     = process.env.POLY_BUILDER_SECRET;
    const passphrase = process.env.POLY_BUILDER_PASSPHRASE;
    const magicPk    = process.env.POLYMARKET_MAGIC_PK;

    if (!apiKey || !secret || !passphrase) {
      return Response.json({ error: 'Builder credentials not configured' }, { status: 500 });
    }

    // ── PATH 1: Gasless relayer ──
    if (magicPk && useRelayer !== false) {
      try {
        const relayRes = await fetch(
          new URL('/api/relay', request.url).toString(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action:        'place_order',
              tokenID:       orderPayload.tokenID,
              price:         orderPayload.price,
              side:          orderPayload.side === 'BUY' ? 'YES' : 'NO',
              size:          orderPayload.size,
              orderType:     orderPayload.orderType || 'GTC',
              funderAddress: orderPayload.funderAddress,
            }),
          }
        );
        if (relayRes.ok) {
          const relayData = await relayRes.json();
          return Response.json({ success: true, orderId: relayData.orderId, result: relayData.response, gasless: true });
        }
        console.warn('Relayer failed, falling back to direct CLOB');
      } catch (relayErr) {
        console.warn('Relayer error, falling back:', relayErr);
      }
    }

    // ── PATH 2: Direct CLOB with CORRECT builder attribution headers ──
    const timestamp = Date.now().toString();
    const path      = '/order';
    const bodyStr   = JSON.stringify(orderPayload);
    const signature = buildSignature(secret, parseInt(timestamp), 'POST', path, bodyStr);

    const response = await fetch('https://clob.polymarket.com/order', {
      method: 'POST',
      headers: {
        'Content-Type':        'application/json',
        // Correct Polymarket CLOB auth headers
        'CLOB-API-KEY':        apiKey,
        'CLOB-TIMESTAMP':      timestamp,
        'CLOB-PASSPHRASE':     passphrase,
        'CLOB-SIGNATURE':      signature,
        // Builder attribution — this is what Richard needs to see
        'CLOB-Builder-Code':   apiKey,
        ...(body.authHeaders || {}),
      },
      body: bodyStr,
    });

    const result = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: result.error || 'Order placement failed', details: result },
        { status: response.status }
      );
    }

    return Response.json({ success: true, orderId: result.orderID, result, gasless: false });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
