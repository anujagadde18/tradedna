import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function fetchDailyPicks() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tradedna.vercel.app';
  const res = await fetch(`${baseUrl}/api/daily-pick`, { signal: AbortSignal.timeout(10000) });
  const data = await res.json();
  return data.picks || [];
}

function formatTweet(pick: any): string {
  const confidence = pick.confidence;
  const title = pick.title.slice(0, 55);
  const reason = pick.reasoning?.[0]?.slice(0, 70) || '';
  
  let tweet = `${pick.icon} PlayPicks Daily Pick\n\n`;
  tweet += `${title}\n`;
  tweet += `Market: ${confidence}% probability\n\n`;
  if (reason) tweet += `${reason}\n\n`;
  tweet += `tradedna.vercel.app/picks\n\n`;
  tweet += `#PlayPicks #Polymarket #AIpredictions`;
  
  return tweet.slice(0, 280);
}

async function postToX(text: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { success: false, error: 'X API keys not configured in environment' };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const url = 'https://api.twitter.com/2/tweets';

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: apiKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: accessToken,
      oauth_version: '1.0',
    };

    const sortedParams = Object.keys(oauthParams).sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
      .join('&');

    const sigBase = `POST&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
    const sigKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;

    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw', encoder.encode(sigKey),
      { name: 'HMAC', hash: 'SHA-1' },
      false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(sigBase));
    const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
    oauthParams['oauth_signature'] = signature;

    const authHeader = 'OAuth ' + Object.keys(oauthParams).sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (res.ok) return { success: true };
    return { success: false, error: JSON.stringify(data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'playpicks2026';

  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const picks = await fetchDailyPicks();

    if (picks.length === 0) {
      return Response.json({ message: 'No high-conviction picks today', posted: false });
    }

    const bestPick = picks.sort((a: any, b: any) =>
      Math.abs(b.confidence - 50) - Math.abs(a.confidence - 50)
    )[0];

    const tweet = formatTweet(bestPick);
    const result = await postToX(tweet);

    return Response.json({
      success: result.success,
      error: result.error,
      tweet,
      pick: bestPick.title,
      confidence: bestPick.confidence,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
