/**
 * Reads BOTH sides of a two-way sports market, with the team names.
 *
 * parseEventOutcomes in the analyse route cannot be used for a matchup: it names outcomes from
 * groupItemTitle, which a moneyline market does not carry. This shape was
 * verified against a live gamma response rather than inferred - the same lesson
 * the trending route records after six wrong guesses:
 *   - the moneyline market has NO groupItemTitle
 *   - the team names live in outcomes:      "[\"Chargers\", \"Bills\"]"
 *   - outcomePrices lines up with it index for index
 *   - a finished game is markets[].closed = true even while event.closed = false
 *
 * Returns [] rather than a guess whenever the shape is not what we expect, which
 * leaves the caller on its previous behaviour.
 */
export function readMoneylineSides(event: any): { name: string; prob: number }[] {
  const parseArr = (v: any): string[] => {
    try {
      const a = typeof v === 'string' ? JSON.parse(v) : v;
      return Array.isArray(a) ? a.map((x: any) => String(x)) : [];
    } catch { return []; }
  };
  const markets = (event?.markets || []).filter((m: any) => m && m.closed !== true);
  const isTwoWayTeams = (m: any) => {
    const smt = String(m.sportsMarketType || '').toLowerCase();
    if (smt && smt !== 'moneyline') return false;          // the API says it is a prop
    const names = parseArr(m.outcomes);
    return names.length === 2 && !names.some(n => /^(yes|no)$/i.test(String(n).trim()));
  };
  const pick = markets.find((m: any) => String(m.sportsMarketType || '').toLowerCase() === 'moneyline')
    || markets.find(isTwoWayTeams);
  if (!pick) return [];

  const names = parseArr(pick.outcomes);
  const prices = parseArr(pick.outcomePrices).map((p: string) => parseFloat(p));
  if (names.length < 2 || prices.length < 2) return [];

  const out: { name: string; prob: number }[] = [];
  for (let i = 0; i < Math.min(names.length, prices.length); i++) {
    const raw = prices[i];
    if (!Number.isFinite(raw)) continue;
    const pct = Math.round(raw <= 1 ? raw * 100 : raw);
    const name = String(names[i] || '').trim();
    if (!name || /^(yes|no)$/i.test(name)) continue;       // Yes/No is not a team
    if (pct < 0 || pct > 100) continue;
    out.push({ name, prob: pct });
  }
  // A game in progress or already decided sits at 99/1 and is not a live chance.
  if (out.length < 2 || out.some(o => o.prob >= 99 || o.prob <= 1)) return [];
  return out.sort((a, b) => b.prob - a.prob);
}
