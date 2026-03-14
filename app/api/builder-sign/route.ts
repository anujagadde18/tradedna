import { NextRequest } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function buildHmacSignature(
  secret: string,
  timestamp: number,
  method: string,
  path: string,
  body?: string
): string {
  const message = timestamp + method.toUpperCase() + path + (body || '');
  return crypto
    .createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(message)
    .digest('base64');
}

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
    const signature = buildHmacSignature(secret, parseInt(timestamp), method, path, body);

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

// Health check
export async function GET() {
  const configured = !!(
    process.env.POLY_BUILDER_API_KEY &&
    process.env.POLY_BUILDER_SECRET &&
    process.env.POLY_BUILDER_PASSPHRASE
  );
  return Response.json({ configured, status: configured ? 'ready' : 'missing credentials' });
}
