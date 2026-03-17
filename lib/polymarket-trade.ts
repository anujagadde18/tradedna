// lib/polymarket-trade.ts

export const CLOB_HOST = 'https://clob.polymarket.com';
export const CHAIN_ID  = 137;

export function suggestBetSize(edge: number): {
  label: string;
  amounts: number[];
  reasoning: string;
} {
  if (edge >= 10) return {
    label:     'Strong edge',
    amounts:   [50, 100, 250],
    reasoning: edge + '% AI edge is significant — larger position makes sense',
  };
  if (edge >= 5) return {
    label:     'Good edge',
    amounts:   [25, 50, 100],
    reasoning: edge + '% AI edge detected — moderate position recommended',
  };
  if (edge >= 2) return {
    label:     'Slight edge',
    amounts:   [10, 25, 50],
    reasoning: edge + '% AI edge is small — keep position size modest',
  };
  return {
    label:     'No clear edge',
    amounts:   [5, 10, 25],
    reasoning: 'AI and market agree — only bet if you have strong personal conviction',
  };
}

export function getConvictionScore(
  aiConfidence: number,
  marketOdds: number,
  edge: number
): { score: number; label: string; color: string } {
  // If AI confidence is 0 or not set — no signal available
  if (!aiConfidence || aiConfidence === 0) {
    return { score: 0, label: 'No signal', color: 'text-gray-400' };
  }

  // Edge must be positive for a real conviction
  // Negative edge means AI is LESS confident than market — that's bearish not bullish
  const absEdge = Math.abs(edge);

  // If edge is negative (AI below market) conviction should reflect caution
  if (edge < -5) return { score: 15, label: 'Very Low',  color: 'text-red-400' };
  if (edge < -2) return { score: 25, label: 'Low',       color: 'text-orange-400' };

  // Positive or neutral edge
  if (absEdge >= 10) return { score: 90, label: 'Very High', color: 'text-green-400' };
  if (absEdge >= 7)  return { score: 75, label: 'High',      color: 'text-green-400' };
  if (absEdge >= 4)  return { score: 60, label: 'Medium',    color: 'text-yellow-400' };
  if (absEdge >= 2)  return { score: 40, label: 'Low',       color: 'text-orange-400' };
  return                    { score: 20, label: 'Very Low',  color: 'text-red-400' };
}

export function saveTradeToJournal(trade: {
  id: string;
  marketUrl: string;
  marketTitle: string;
  outcomeName: string;
  side: 'YES' | 'NO';
  price: number;
  size: number;
  aiConfidence: number;
  marketOdds: number;
  edge: number;
  convictionScore: number;
  txHash?: string;
  timestamp: number;
}) {
  try {
    const existing = localStorage.getItem('tradeJournal');
    const journal  = existing ? JSON.parse(existing) : [];
    journal.unshift(trade);
    if (journal.length > 100) journal.splice(100);
    localStorage.setItem('tradeJournal', JSON.stringify(journal));
  } catch {}
}

export function getTradeJournal(): any[] {
  try {
    const saved = localStorage.getItem('tradeJournal');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}
