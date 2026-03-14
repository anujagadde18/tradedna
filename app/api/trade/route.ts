// app/api/trade/route.ts
// Handles order placement server-side with builder attribution headers
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function buildSignature(
  secret: string,
  timestamp: number,
  method: string,
  path: string,
  body: string
): string {
  const message = timestamp + method.toUpperCase() + path + (body || '');
  return crypto
    .createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(message)
    .digest('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderPayload } = body;

    if (!orderPayload) {
      return Response.json({ error: 'Missing orderPayload' }, { status: 400 });
    }

    const apiKey     = process.env.POLY_BUILDER_API_KEY;
    const secret     = process.env.POLY_BUILDER_SECRET;
    const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

    if (!apiKey || !secret || !passphrase) {
      return Response.json(
        { error: 'Builder credentials not configured on server' },
        { status: 500 }
      );
    }

    const timestamp  = Date.now().toString();
    const path       = '/order';
    const bodyStr    = JSON.stringify(orderPayload);
    const signature  = buildSignature(secret, parseInt(timestamp), 'POST', path, bodyStr);

    // Forward to Polymarket CLOB with builder attribution headers
    const response = await fetch('https://clob.polymarket.com/order', {
      method: 'POST',
      headers: {
        'Content-Type':          'application/json',
        'POLY_BUILDER_API_KEY':   apiKey,
        'POLY_BUILDER_TIMESTAMP': timestamp,
        'POLY_BUILDER_PASSPHRASE': passphrase,
        'POLY_BUILDER_SIGNATURE': signature,
        // User auth headers passed through from client
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

    return Response.json({ success: true, orderId: result.orderID, result });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
