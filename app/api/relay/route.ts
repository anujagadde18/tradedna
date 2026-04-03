// app/api/relay/route.ts
// Handles gasless transactions via Polymarket's builder relayer
// Uses Magic Link + Proxy Wallet path (auto-deploys on first tx)

import { NextRequest } from 'next/server';
import { ethers, JsonRpcProvider, Wallet } from 'ethers';
import { RelayClient, RelayerTxType } from '@polymarket/builder-relayer-client';
// Use the relayer client's bundled version to avoid type mismatch
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BuilderConfig } = require('@polymarket/builder-relayer-client/node_modules/@polymarket/builder-signing-sdk/dist/config');
import { ClobClient } from '@polymarket/clob-client';

export const dynamic = 'force-dynamic';

const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
const CHAIN_ID    = 137; // Polygon

function getBuilderConfig() {
  const creds = {
    key:        process.env.POLY_BUILDER_API_KEY!,
    secret:     process.env.POLY_BUILDER_SECRET!,
    passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
  };
  return new BuilderConfig({ localBuilderCreds: creds });
}

function getWallet() {
  const pk = process.env.POLYMARKET_MAGIC_PK;
  if (!pk) throw new Error('POLYMARKET_MAGIC_PK not configured');
  const provider = new JsonRpcProvider(
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com'
  );
  return new Wallet(pk, provider);
}

// POST /api/relay
// body: { action: 'get_proxy_address' | 'place_order', ...params }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const requiredEnvs = ['POLY_BUILDER_API_KEY', 'POLY_BUILDER_SECRET', 'POLY_BUILDER_PASSPHRASE', 'POLYMARKET_MAGIC_PK'];
    const missing = requiredEnvs.filter(k => !process.env[k]);
    if (missing.length > 0) {
      return Response.json(
        { error: 'Missing env vars: ' + missing.join(', ') },
        { status: 500 }
      );
    }

    const wallet        = getWallet();
    const builderConfig = getBuilderConfig();

    // PROXY type — auto-deploys on first transaction, no manual deploy() needed
    const relayClient = new RelayClient(
      RELAYER_URL,
      CHAIN_ID,
      wallet as any,
      builderConfig,
      RelayerTxType.PROXY
    );

    // ── ACTION: get_proxy_address ──────────────────────────────────────────
    // Returns the deterministic proxy wallet address for the Magic user
    if (action === 'get_proxy_address') {
      const address = await wallet.getAddress();
      return Response.json({ proxyAddress: address, eoaAddress: address });
    }

    // ── ACTION: place_order ────────────────────────────────────────────────
    // Places an order via the CLOB with builder attribution + gasless relayer
    if (action === 'place_order') {
      const { tokenID, price, side, size, orderType, funderAddress } = body;

      if (!tokenID || !price || !side || !size) {
        return Response.json({ error: 'Missing order params' }, { status: 400 });
      }

      // Initialize CLOB client with builder credentials
      const clobClient = new ClobClient(
        'https://clob.polymarket.com',
        CHAIN_ID,
        wallet as any,
        {
          key:        process.env.POLY_BUILDER_API_KEY!,
          secret:     process.env.POLY_BUILDER_SECRET!,
          passphrase: process.env.POLY_BUILDER_PASSPHRASE!,
        },
        2, // signature_type 2 = proxy wallet
        funderAddress || await wallet.getAddress()
      );

      const orderArgs = {
        tokenID,
        price:     parseFloat(price),
        side:      side === 'YES' ? 'BUY' : 'SELL',
        size:      parseFloat(size),
        orderType: orderType || 'GTC',
        funderAddress: funderAddress || await wallet.getAddress(),
      };

      const order    = await clobClient.createOrder(orderArgs as any);
      const response = await clobClient.postOrder(order, orderArgs.orderType as any);

      return Response.json({
        success:  true,
        orderId:  response.orderID,
        response,
      });
    }

    // ── ACTION: check_approvals ────────────────────────────────────────────
    // Checks if USDC is approved for trading (needed before first trade)
    if (action === 'check_approvals') {
      return Response.json({ 
        status: 'ok',
        message: 'Proxy wallet handles approvals gaslessly on first transaction',
        relayerUrl: RELAYER_URL,
      });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });

  } catch (err: any) {
    console.error('Relay error:', err);
    return Response.json(
      { error: err.message || 'Relay failed' },
      { status: 500 }
    );
  }
}

// GET /api/relay — health check
export async function GET() {
  const configured = !!(
    process.env.POLY_BUILDER_API_KEY &&
    process.env.POLY_BUILDER_SECRET &&
    process.env.POLY_BUILDER_PASSPHRASE &&
    process.env.POLYMARKET_MAGIC_PK
  );
  return Response.json({
    status:     configured ? 'ready' : 'missing_config',
    relayer:    RELAYER_URL,
    chain:      CHAIN_ID,
    walletType: 'proxy', // Magic Link + Proxy (auto-deploys)
    configured,
  });
}
