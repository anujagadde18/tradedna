import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const TOPICS: Record<string, string[]> = {
  technology: ['ai','artificial intelligence','model','company','tech','gpt','llm','software','openai','google','microsoft','apple','meta','amazon','chatgpt','anthropic','claude','gemini','robot','startup'],
  economics:  ['gdp','fed','federal reserve','rates','recession','inflation','unemployment','economy','treasury','dollar','debt','tariff','budget','imf','world bank','interest'],
  crypto:     ['bitcoin','btc','eth','ethereum','crypto','blockchain','solana','coin','defi','nft','stablecoin','binance','coinbase','web3'],
  geopolitics:['war','ceasefire','election','treaty','president','prime minister','nato','china','russia','iran','ukraine','sanctions','conflict','nuclear','military','vote','ballot'],
  sports:     ['nfl','nba','nhl','mlb','ncaa','soccer','football','basketball','baseball','hockey','tennis','golf','ufc','mma','chess','nascar','super bowl','playoffs','championship','world cup','league','team','season','match','game','tournament','player','coach'],
};

function detectTopic(query: string): string {
  const q = query.toLowerCase();
  let best = '';
  let bestScore = 0;
  for (const [topic, kws] of Object.entries(TOPICS)) {
    const score = kws.filter(kw => q.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = topic; }
  }
  return bestScore > 0 ? best : '';
}

function marketMatchesTopic(title: string, topic: string): boolean {
  const t = title.toLowerCase();
  const kws = TOPICS[topic] || [];
  return kws.some(kw => t.includes(kw));
}

function isSportsMarket(title: string): boolean {
  return TOPICS.sports.some(kw => title.toLowerCase().includes(kw));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) return Response.json({ error: 'Missing query' }, { status: 400 });

  try {
    const detectedTopic = detectTopic(query);

    // Use topic-specific search terms for better results
    const topicSearchTerms: Record<string, string> = {
      technology: 'AI model company tech',
      economics:  'GDP recession inflation Fed',
      crypto:     'Bitcoin crypto ETH',
      geopolitics:'election war ceasefire',
      sports:     query,
    };

    const searchQ = detectedTopic && topicSearchTerms[detectedTopic]
      ? topicSearchTerms[detectedTopic]
      : query;

    // Fetch with larger limit so we have more to filter
    const res = await fetch(
      `https://gamma-api.polymarket.com/events/keyset?q=${encodeURIComponent(searchQ)}&limit=20&active=true`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) throw new Error('Search failed');

    const events = await res.json();
    if (!events || events.length === 0) return Response.json({ results: [] });

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

    // Step 1: Remove sports markets for non-sports queries
    const noSports = detectedTopic === 'sports'
      ? all
      : all.filter((m: any) => !isSportsMarket(m.title));

    // Step 2: Filter to topic-matching markets
    const topicMatched = detectedTopic
      ? noSports.filter((m: any) => marketMatchesTopic(m.title, detectedTopic))
      : noSports;

    // Step 3: If topic filter leaves enough results use them, else fall back to noSports
    const results = (topicMatched.length >= 2 ? topicMatched : noSports).slice(0, 6);

    return Response.json({ results });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
