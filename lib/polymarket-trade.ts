// lib/polymarket-trade.ts
// Core Polymarket CLOB trading integration for PlayPicks

export const CLOB_HOST = 'https://clob.polymarket.com';
export const CHAIN_ID = 137; // Polygon mainnet

// Bet size suggestions based on edge (Kelly-inspired)
export function suggestBetSize(edge: number): {
  label: string;
  amounts: number[];
  reasoning: string;
} {
  if (edge >= 10) return {
    label: 'Strong edge',
    amounts: [50, 100, 250],
    reasoning: `${edge}% AI edge is significant — larger position makes sense`
  };
  if (edge >= 5) return {
    label: 'Good edge',
    amounts: [25, 50, 100],
    reasoning: `${edge}% AI edge detected — moderate position recommended`
  };
  if (edge >= 2) return {
    label: 'Slight edge',
    amounts: [10, 25, 50],
    reasoning: `${edge}% AI edge is small — keep position size modest`
  };
  return {
    label: 'No clear edge',
    amounts: [5, 10, 25],
    reasoning: 'AI and market agree — only bet if you have strong personal conviction'
  };
}

// Conviction score 0-100 based on AI vs market alignment
export function getConvictionScore(
  aiConfidence: number,
  marketOdds: number,
  edge: number
): { score: number; label: string; color: string } {
  // High conviction = large edge in correct direction
  const absEdge = Math.abs(edge);
  
  if (absEdge >= 10) return { score: 90, label: 'Very High', color: 'text-green-400' };
  if (absEdge >= 7)  return { score: 75, label: 'High',      color: 'text-green-400' };
  if (absEdge >= 4)  return { score: 60, label: 'Medium',    color: 'text-yellow-400' };
  if (absEdge >= 2)  return { score: 40, label: 'Low',       color: 'text-orange-400' };
  return               { score: 20, label: 'Very Low',  color: 'text-red-400' };
}

// Save trade to localStorage journal
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
    const journal = existing ? JSON.parse(existing) : [];
    journal.unshift(trade);
    // Keep last 100 trades
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
