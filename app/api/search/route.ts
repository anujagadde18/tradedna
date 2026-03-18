import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return Response.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    // Search Polymarket Gamma API for matching events
    const res = await fetch(
      `https://gamma-api.polymarket.com/events?q=${encodeURIComponent(query)}&limit=5&active=true`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) throw new Error('Search failed');

    const events = await res.json();
    if (!events || events.length === 0) {
      return Response.json({ results: [] });
    }

    // Map to clean result format
    const results = events
      .filter((e: any) => e.slug && e.title)
      .map((e: any) => ({
        slug:     e.slug,
        title:    e.title,
        url:      `https://polymarket.com/event/${e.slug}`,
        volume:   parseFloat(e.volume || '0'),
        endDate:  e.endDate || '',
        markets:  (e.markets || []).length,
      }))
      .sort((a: any, b: any) => b.volume - a.volume);

    return Response.json({ results });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
