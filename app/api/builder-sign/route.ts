// app/api/builder-sign/route.ts
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { method, path, body } = await request.json();

    const apiKey     = process.env.POLY_BUILDER_API_KEY;
    const secret     = process.env.POLY_BUILDER_SECRET;
    const passphrase = process.env.POLY_BUILDER_PASSPHRASE;

    if (!apiKey || !secret || !passphrase) {
      return Response.json(
        { error: 'Builder credentials not configured' },
        { status: 500 }
      );
    }

    const timestamp = Date.now().toString();
    const message   = timestamp + method.toUpperCase() + path + (body || '');
    const signature = crypto
      .createHmac('sha256', Buffer.from(secret, 'base64'))
      .update(message)
      .digest('base64');

    return Response.json({
      POLY_BUILDER_API_KEY:    apiKey,
      POLY_BUILDER_TIMESTAMP:  timestamp,
      POLY_BUILDER_PASSPHRASE: passphrase,
      POLY_BUILDER_SIGNATURE:  signature,
    });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
