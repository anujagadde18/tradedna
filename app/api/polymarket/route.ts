import { NextRequest, NextResponse } from 'next/server';

const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'events';
  const query = searchParams.get('query');
  const limit = searchParams.get('limit') || '5';
  
  try {
    // Build API URL
    const params = new URLSearchParams();
    params.append('limit', limit);
    
    // FIXED: For markets endpoint, don't add closed=false
    if (endpoint === 'events') {
      params.append('closed', 'false');
      params.append('order', 'volume');
    }
    
    if (query) {
      params.append('query', query);
    }
    
    const url = `${GAMMA_API_URL}/${endpoint}?${params.toString()}`;
    
    console.log('Fetching from Polymarket:', url); // DEBUG
    
    const response = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });
    
    console.log('Polymarket response status:', response.status); // DEBUG
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Polymarket API error:', response.status, errorText);
      
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
    console.log('Polymarket data sample:', JSON.stringify(data).substring(0, 500)); // DEBUG
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    });
    
  } catch (error: any) {
    console.error('Polymarket proxy error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Polymarket data', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
