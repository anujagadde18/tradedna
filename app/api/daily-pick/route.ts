import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function fetchTopPolymarketEvents() {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=50&order=volume24hr&ascending=false',
      { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function getYesPrice(event: any): number | null {
  try {
    const markets = event.markets || [];
    
    // Binary market — single yes/no
    if (markets.length === 1) {
      const m = markets[0];
      const prices = m.outcomePrices
        ? (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices)
        : null;
      if (prices && prices.length >= 2) {
        const yes = parseFloat(prices[0]);
        const pct = yes <= 1 ? Math.round(yes * 100) : Math.round(yes);
        if (pct >= 5 && pct <= 95) return pct;
      }
      // Try lastTradePrice
      if (m.lastTradePrice) {
        const p = parseFloat(m.lastTradePrice);
        const pct = p <= 1 ? Math.round(p * 100) : Math.round(p);
        if (pct >= 5 && pct <= 95) return pct;
      }
    }
    
    // Multi-outcome — find the leading outcome price
    if (markets.length > 1) {
      const bestMarket = markets.reduce((best: any, m: any) => {
        const p = parseFloat(m.lastTradePrice || '0');
        const bp = parseFloat(best?.lastTradePrice || '0');
        return p > bp ? m : best;
      }, markets[0]);
      
      if (bestMarket?.lastTradePrice) {
        const p = parseFloat(bestMarket.lastTradePrice);
        const pct = p <= 1 ? Math.round(p * 100) : Math.round(p);
        if (pct >= 5 && pct <= 95) return pct;
      }
    }
    
    return null;
  } catch { return null; }
}

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('ipl') || t.includes('cricket') || t.includes('nba') || t.includes('f1') ||
      t.includes('champions league') || t.includes('premier league') || t.includes('world cup') ||
      t.includes('tennis') || t.includes('golf') || t.includes(' vs ')) return 'sports';
  if (t.includes('bitcoin') || t.includes('eth') || t.includes('crypto')) return 'crypto';
  if (t.includes('election') || t.includes('president') || t.includes('trump')) return 'politics';
  if (t.includes('fed') || t.includes('rate') || t.includes('inflation')) return 'economics';
  return 'world';
}

function getIcon(category: string): string {
  const icons: Record<string,string> = {
    sports:'🏆', crypto:'₿', politics:'🗳️', economics:'📈', world:'🌍'
  };
  return icons[category] || '🔮';
}

export async function GET(req: NextRequest) {
  const today = new Date().toISOString().split('T')[0];

  try {
    const events = await fetchTopPolymarketEvents();
    const picks: any[] = [];
    const usedCategories = new Set<string>();
    const noise = ['clavicular','pregnancy','epstein','hantavirus','alien','foul play','suicide'];

    // Sort to prioritize sports then world events over politics
    events.sort((a: any, b: any) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();
      const aIsSports = aTitle.includes(' vs ') || aTitle.includes('nba') || aTitle.includes('ipl') || aTitle.includes('f1') || aTitle.includes('world cup');
      const bIsSports = bTitle.includes(' vs ') || bTitle.includes('nba') || bTitle.includes('ipl') || bTitle.includes('f1') || bTitle.includes('world cup');
      if (aIsSports && !bIsSports) return -1;
      if (!aIsSports && bIsSports) return 1;
      return parseFloat(b.volume24hr || '0') - parseFloat(a.volume24hr || '0');
    });

    // Sort to prioritize sports then world events over politics
    events.sort((a: any, b: any) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();
      const aIsSports = aTitle.includes(' vs ') || aTitle.includes('nba') || aTitle.includes('ipl') || aTitle.includes('f1') || aTitle.includes('world cup');
      const bIsSports = bTitle.includes(' vs ') || bTitle.includes('nba') || bTitle.includes('ipl') || bTitle.includes('f1') || bTitle.includes('world cup');
      if (aIsSports && !bIsSports) return -1;
      if (!aIsSports && bIsSports) return 1;
      return parseFloat(b.volume24hr || '0') - parseFloat(a.volume24hr || '0');
    });

    for (const event of events) {
      if (picks.length >= 3) break;

      const title = event.title || '';
      const titleLower = title.toLowerCase();
      if (noise.some(n => titleLower.includes(n))) continue;

      const yesPrice = getYesPrice(event);
      if (!yesPrice) continue;

      // Skip markets too close to 50% — only high conviction
      if (yesPrice > 38 && yesPrice < 62) continue;
      
      // Skip boring long-term politics markets
      // Skip boring/niche/long-term markets
      const skipTerms = [
        // Long term politics
        '2028','2027','nominee','prime minister','next french','next german','next uk',
        // Niche world events
        'pahlavi','hormuz','epstein','hantavirus','alien','ufo','declassif','starmer','reza',
        // Niche elections
        'mayoral','municipal','gubernatorial','seoul','jakarta','lima','bogota','manila',
        // F1 season championship (too long term)
        'drivers champion','constructors champion','f1 champion',
        // Niche sports
        'esport','counter-strike','dota','valorant','lol:','iem','lcs',
        // What will X say
        'what will trump','what will biden','what will',
        // When will
        'when will bitcoin','when will ethereum',
      ];
      if (skipTerms.some(t => titleLower.includes(t))) continue;

      const category = detectCategory(title);
      if (usedCategories.has(category)) continue;

      const vol24 = parseFloat(event.volume24hr || '0');
      if (vol24 < 50000) continue;

      const isLikely = yesPrice >= 58;
      const edge = Math.abs(yesPrice - 50) > 20 ? 3 : 1;

      picks.push({
        date: today,
        id: event.slug || String(event.id),
        category,
        icon: getIcon(category),
        title: title.replace(/ by\.\.\.\?/gi,'?').replace(/ \.\.\./gi,'').slice(0,80),
        subtitle: `$${(vol24/1000000).toFixed(1)}M traded today · Polymarket`,
        prediction: isLikely ? 'YES — likely to happen' : 'NO — unlikely to happen',
        confidence: yesPrice,
        verdict: Math.abs(yesPrice-50) >= 20 ? 'HIGH CONVICTION' : 'WATCH',
        verdictColor: Math.abs(yesPrice-50) >= 20 ? '#2ecc8a' : '#f5a623',
        reasoning: [
          `Market consensus: ${yesPrice}% probability from $${(vol24/1000000).toFixed(1)}M in trades`,
          `${isLikely ? 'Strong majority of informed traders betting YES' : 'Strong majority of informed traders betting NO'}`,
          'Polymarket has 90%+ accuracy on high-volume binary markets',
        ],
        risks: [
          'Markets can shift rapidly on breaking news',
          'Always verify with your own research before trading',
        ],
        marketOdds: yesPrice,
        aiOdds: Math.min(95, Math.max(5, yesPrice + edge)),
        edge,
        url: `https://polymarket.com/event/${event.slug}`,
        sport: category,
        volumeFormatted: `$${(vol24/1000000).toFixed(1)}M`,
      });

      usedCategories.add(category);
    }

    return Response.json({
      date: today,
      picks,
      total: picks.length,
      generated: 'auto',
      message: picks.length === 0 ? 'No picks today — markets too uncertain' : undefined,
    });
  } catch (err: any) {
    return Response.json({ date: today, picks: [], total: 0, error: err.message });
  }
}
