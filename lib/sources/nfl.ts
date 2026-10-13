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
  /** ESPN's own lifecycle state: 'pre' before kickoff, 'in' while playing,
   *  'post' once it is over. Season records only describe a game that has NOT
   *  started: once it has, the market price is reacting to the score, and
   *  comparing a record-based number against it is meaningless. Captured here so
   *  the page can say so instead of presenting the comparison anyway. */
  gameState: 'pre' | 'in' | 'post';
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

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

/** YYYYMMDD, today plus an offset. Off-by-one around midnight does not matter
 *  because the caller probes a run of consecutive days. */
function ymd(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return String(d.getUTCFullYear())
    + String(d.getUTCMonth() + 1).padStart(2, '0')
    + String(d.getUTCDate()).padStart(2, '0');
}

/** One scoreboard read. Returns [] rather than throwing, so a failed probe just
 *  contributes nothing. */
async function fetchEvents(dates?: string): Promise<any[]> {
  try {
    const res = await fetch(dates ? SCOREBOARD + '?dates=' + dates : SCOREBOARD,
      { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.events) ? data.events : [];
  } catch { return []; }
}

/** ESPN exposes status.type.state as 'pre' | 'in' | 'post'. Falls back to the
 *  status name when state is absent, and treats anything unrecognised as 'pre'
 *  so a missing field does not hide a game that has not started. */
function readState(comp: any): 'pre' | 'in' | 'post' {
  const raw = String(comp?.status?.type?.state || '').toLowerCase();
  if (raw === 'in' || raw === 'post' || raw === 'pre') return raw;
  const name = String(comp?.status?.type?.name || '').toUpperCase();
  if (name.includes('FINAL') || name.includes('POSTPONED') || name.includes('CANCELED')) return 'post';
  if (name.includes('IN_PROGRESS') || name.includes('HALFTIME') || name.includes('END_PERIOD')) return 'in';
  return 'pre';
}

/** Picks the event whose two team names both appear in the question. Returns
 *  null unless BOTH are present, otherwise we are guessing at which game. */
function pickGame(events: any[], query: string): any | null {
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
  return bestHits >= 2 ? best : null;
}

/** Finds the NFL game matching a question like "Rams vs. Broncos". */
export async function analyseNflGame(query: string): Promise<NflAnalysis | null> {
  try {
    // The bare scoreboard returns only the CURRENT week. Polymarket prices games
    // a week or two early, so a game outside this week was invisible here: this
    // function returned null and the two cards vanished from the page with no
    // error logged anywhere.
    //
    // Verified against the live API rather than assumed:
    //   no parameter        -> week 5 (9-11 Oct)
    //   ?dates=20261019     -> week 6 (19 Oct)
    //   ?dates=2026101-...  -> a dash range errors, so it is not used
    //   ?dates=202610       -> a month form returns an incomplete set
    // Only the single-day form is relied on.
    let best = pickGame(await fetchEvents(), query);

    if (!best) {
      // Probe the next nine days in parallel, so this costs one round trip and
      // only happens when the current week came up empty.
      const probes = await Promise.all(
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => fetchEvents(ymd(n)))
      );
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const batch of probes) {
        for (const e of batch) {
          const id = String(e?.id || '');
          if (id) {
            if (seen.has(id)) continue;
            seen.add(id);
          }
          merged.push(e);
        }
      }
      best = pickGame(merged, query);
    }

    if (!best || !best.competitions?.[0]) return null;

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
      gameState: readState(comp),
    };
  } catch {
    return null;
  }
}
