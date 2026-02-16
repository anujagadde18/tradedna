// app/api/proxy/route.ts

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TradeDNA/1.0)',
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      return new Response(`Fetch failed: ${response.status}`, { status: response.status });
    }

    const data = await response.text();
    
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(`Proxy error: ${error}`, { status: 500 });
  }
}
