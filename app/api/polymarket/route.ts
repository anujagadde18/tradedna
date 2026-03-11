import { NextRequest, NextResponse } from 'next/server';

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'events';
  const slug = searchParams.get('slug');
  
  try {
    let url: string;
    
    if (slug && endpoint === 'events') {
      // DIRECT SLUG FETCH - Use official endpoint
      url = `${GAMMA_API_URL}/events/slug/${slug}`;
      console.log('[Polymarket API] Fetching event by slug:', url);
      
    } else {
      // SEARCH/LIST - Build query params
      const params = new URLSearchParams();
      
      // Copy all search params except 'endpoint' and 'slug'
      searchParams.forEach((value, key) => {
        if (key !== 'endpoint' && key !== 'slug') {
          params.append(key, value);
        }
      });
      
      url = `${GAMMA_API_URL}/${endpoint}?${params.toString()}`;
      console.log('[Polymarket API] Searching:', url);
    }
    
    const response = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });
    
    console.log('[Polymarket API] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Polymarket API] Error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Polymarket API error', 
          status: response.status,
          details: errorText 
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('[Polymarket API] Success, data keys:', Object.keys(data));
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
    
  } catch (error: any) {
    console.error('[Polymarket API] Exception:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Polymarket data', 
        details: error.message
      },
      { status: 500 }
    );
  }
}
