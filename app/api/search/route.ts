import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const TOPIC_KEYWORDS: Record<string, string[]> = {
  technology: ['ai','model','company','tech','gpt','llm','software','openai','google','microsoft','apple','meta','amazon','chatgpt','anthropic'],
  economics:  ['gdp','fed','rates','recession','inflation','unemployment','economy','treasury','dollar','debt','tariff','budget'],
  crypto:     ['bitcoin','eth','crypto','blockchain','btc','ethereum','solana','coin','defi','nft','stablecoin'],
  geopolitics:['war','ceasefire','election','treaty','president','minister','nato','china','russia','iran','ukraine','sanctions','conflict'],
  sports:     ['nfl','nba','nhl','mlb','soccer','football','basketball','baseball','hockey','tennis','golf','ufc','chess','nascar','super bowl','playoffs','championship','tournament'],
};

function detectTopic(query: string): string {
  const q = query.toLowerCase();
  for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) {
    if (kws.some(kw => q.includes(kw))) return topic;
  }
  return '';
}

function isSportsMarket(title: string): boolean {
  return TOPIC_KEYWORDS.sports.some(kw => title.toLowerCase().includes(kw));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/events?q=${encodeURIComponent(query)}&limit=15&active=true`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) throw new Error('Search failed');

    const events = await res.json();
    if (!events || events.length === 0) return Response.json({ results: [] });

    const detectedTopic = detectTopic(query);
    const topicKws = detectedTopic ? TOPIC_KEYWORDS[detectedTopic] : [];
    const isSportsQuery = detectedTopic === 'sports';

    const all = events
      .filter((e: any) => e.slug && e.title)
      .map((e: any) => ({
        slug:    e.slug,
        title:   e.title,
        url:     `https://polymarket.com/event/${e.slug}`,
        volume:  parseFloat(e.volume || '0'),
        endDate: e.endDate || '',
        markets: (e.markets || []).length,
      }))
      .sort((a: any, b: any) => b.volume - a.volume);

    // Filter: never show sports markets for non-sports queries
    const noSports = isSportsQuery ? all : all.filter((m: any) => !isSportsMarket(m.title));

    // Further filter by topic keywords if we detected a topic
    const topicFiltered = topicKws.length > 0
      ? noSports.filter((m: any) => topicKws.some(kw => m.title.toLowerCase().includes(kw)))
      : noSports;

    // Fall back to noSports if topic filter is too aggressive
    const results = (topicFiltered.length >= 2 ? topicFiltered : noSports).slice(0, 6);

    return Response.json({ results });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
