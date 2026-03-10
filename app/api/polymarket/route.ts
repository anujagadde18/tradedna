import { NextRequest, NextResponse } from 'next/server';

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'events';
  const query = searchParams.get('query');
  const limit = searchParams.get('limit') || '10';
  
  try {
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('closed', 'false');
    
    if (query) {
      params.append('query', query);
    }
    
    const url = `${GAMMA_API_URL}/${endpoint}?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
    
  } catch (error: any) {
    console.error('Polymarket proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Polymarket data' },
      { status: 500 }
    );
  }
}
