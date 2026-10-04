/**
 * NFL evidence source.
 *
 * Produces a probability that is INDEPENDENT of Polymarket, so the two can be
 * compared meaningfully. Every number traces back to a real record from ESPN's
 * public scoreboard, through two standard methods:
 *
 *   shrinkage - a 3-0 record is a 100% win rate from three games, which is noise.
 *               Observed rates are pulled toward an even split by an amount that
 *               depends on how few games have been played.
 *   log5      - Bill James' standard way of turning two win rates into a
 *               head-to-head probability.
 *
 * Verified against the live ESPN response and sanity-checked across a full
 * 16-game slate: equal records land near 51%, nothing exceeds 85%, and the
 * better team is favoured in every game where one side is clearly stronger.
 */

export interface NflSignal {
  key: string;
  name: string;
  evidence: string;         // the raw observation
  interpretation: string;   // how the model reads it - stated as a reading, not a fact
  pct: number;              // probability for the HOME team
  defaultWeight: number;
  overlapsWith?: string;    // honest about signals that share information
}

export interface NflAnalysis {
  found: true;
  homeTeam: string;
  awayTeam: string;
  homeAbbr: string;
  awayAbbr: string;
  signals: NflSignal[];
  blended: number;          // for the home team
  gameTime: string;
  status: string;
}

const BASELINE = 0.5;
// How many "phantom" games at an even split to blend in. Four is roughly a
// quarter of an NFL season: early records move the estimate a little, late
// records move it a lot. This is a chosen constant, not a measured one.
const SHRINK_K = 4;
// NFL home teams win roughly 55% of games league-wide. A stated assumption.
const HOME_EDGE = 0.55;

function parseRecord(summary: string): { w: number; l: number; games: number } | null {
  const m = String(summary || '').match(/^(\d+)-(\d+)/);
  if (!m) return null;
  const w = parseInt(m[1], 10), l = parseInt(m[2], 10);
  return { w, l, games: w + l };
}

function shrunkWinRate(summary: string): { rate: number; games: number } {
  const rec = parseRecord(summary);
  if (!rec || rec.games === 0) return { rate: BASELINE, games: 0 };
  return { rate: (rec.w + SHRINK_K * BASELINE) / (rec.games + SHRINK_K), games: rec.games };
}

function log5(pA: number, pB: number): number {
  const den = pA + pB - 2 * pA * pB;
  return den === 0 ? 0.5 : (pA - pA * pB) / den;
}

function recordOf(competitor: any, name: string): string {
  const r = (competitor?.records || []).find((x: any) => String(x?.name || '').toLowerCase() === name.toLowerCase());
  return r?.summary || '';
}

/** Finds today's NFL game matching a question like "Rams vs. Broncos". */
export async function analyseNflGame(query: string): Promise<NflAnalysis | null> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const events = data?.events || [];
    if (events.length === 0) return null;

    // Match on team names appearing in the question.
    const q = query.toLowerCase();
    let best: any = null, bestHits = 0;
    for (const e of events) {
      const comp = e?.competitions?.[0];
      if (!comp) continue;
      const teams = (comp.competitors || []).map((t: any) => t?.team || {});
      let hits = 0;
      for (const t of teams) {
        const names = [t.displayName, t.shortDisplayName, t.name, t.abbreviation]
          .filter(Boolean).map((n: string) => String(n).toLowerCase());
        if (names.some((n: string) => n.length >= 3 && q.includes(n))) hits++;
      }
      if (hits > bestHits) { bestHits = hits; best = e; }
    }
    // Require BOTH teams to appear, otherwise we are guessing at which game.
    if (!best || bestHits < 2) return null;

    const comp = best.competitions[0];
    const bySide: Record<string, any> = {};
    for (const t of comp.competitors || []) bySide[t.homeAway] = t;
    const home = bySide.home, away = bySide.away;
    if (!home || !away) return null;

    const homeAbbr = home.team?.abbreviation || 'Home';
    const awayAbbr = away.team?.abbreviation || 'Away';

    const hOverall = recordOf(home, 'overall');
    const aOverall = recordOf(away, 'overall');
    const hHome = recordOf(home, 'Home');
    const aRoad = recordOf(away, 'Road');

    const signals: NflSignal[] = [];

    // 1. Season records.
    if (hOverall && aOverall) {
      const h = shrunkWinRate(hOverall);
      const a = shrunkWinRate(aOverall);
      signals.push({
        key: 'season',
        name: 'Season records',
        evidence: homeAbbr + ' ' + hOverall + ', ' + awayAbbr + ' ' + aOverall,
        interpretation: h.games <= 5
          ? 'Only ' + h.games + ' games played so far, so this is pulled toward an even split rather than taken at face value'
          : 'Enough games played to take these records at close to face value',
        pct: Math.round(log5(h.rate, a.rate) * 100),
        defaultWeight: 50,
      });
    }

    // 2. How each side performs in this situation.
    if (hHome && aRoad) {
      const h = shrunkWinRate(hHome);
      const a = shrunkWinRate(aRoad);
      signals.push({
        key: 'venue',
        name: 'Home and away form',
        evidence: homeAbbr + ' at home ' + hHome + ', ' + awayAbbr + ' on the road ' + aRoad,
        interpretation: 'How each side has actually performed in this exact situation',
        pct: Math.round(log5(h.rate, a.rate) * 100),
        defaultWeight: 35,
        overlapsWith: 'season',
      });
    }

    // 3. Home advantage as a league-wide effect.
    signals.push({
      key: 'homefield',
      name: 'Home field',
      evidence: homeAbbr + ' is playing at home',
      interpretation: 'Across the league, home teams win about 55% of the time',
      pct: Math.round(HOME_EDGE * 100),
      defaultWeight: 25,
    });

    if (signals.length === 0) return null;

    const totalWeight = signals.reduce((s, x) => s + x.defaultWeight, 0);
    const blended = Math.round(signals.reduce((s, x) => s + x.pct * x.defaultWeight, 0) / totalWeight);

    return {
      found: true,
      homeTeam: home.team?.displayName || homeAbbr,
      awayTeam: away.team?.displayName || awayAbbr,
      homeAbbr, awayAbbr,
      signals,
      blended,
      gameTime: best.date || '',
      status: comp.status?.type?.name || '',
    };
  } catch {
    return null;
  }
}
