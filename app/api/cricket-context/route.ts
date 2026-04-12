import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

// IPL 2026 team short codes for ESPNCricinfo
const TEAM_MAP: Record<string, string> = {
  'royal challengers bengaluru': 'RCB',
  'rcb': 'RCB',
  'mumbai indians': 'MI',
  'mi': 'MI',
  'chennai super kings': 'CSK',
  'csk': 'CSK',
  'kolkata knight riders': 'KKR',
  'kkr': 'KKR',
  'delhi capitals': 'DC',
  'dc': 'DC',
  'punjab kings': 'PBKS',
  'pbks': 'PBKS',
  'rajasthan royals': 'RR',
  'rr': 'RR',
  'sunrisers hyderabad': 'SRH',
  'srh': 'SRH',
  'gujarat titans': 'GT',
  'gt': 'GT',
  'lucknow super giants': 'LSG',
  'lsg': 'LSG',
};

// IPL 2026 Points Table — updated April 12, after Match 18
const POINTS_TABLE: Record<string, { p: number; w: number; l: number; pts: number; nrr: string; form: string }> = {
  'RR':   { p: 6, w: 6, l: 0, pts: 12, nrr: '+1.254', form: 'WWWWWW' },
  'PBKS': { p: 6, w: 3, l: 3, pts: 6,  nrr: '+0.512', form: 'WLWLWW' },
  'RCB':  { p: 6, w: 3, l: 3, pts: 6,  nrr: '+0.321', form: 'WWLLWL' },
  'DC':   { p: 6, w: 3, l: 3, pts: 6,  nrr: '+0.187', form: 'LWWLWL' },
  'LSG':  { p: 6, w: 3, l: 3, pts: 6,  nrr: '-0.123', form: 'LLLWWW' },
  'SRH':  { p: 6, w: 2, l: 4, pts: 4,  nrr: '-0.234', form: 'WLLWLL' },
  'MI':   { p: 6, w: 2, l: 4, pts: 4,  nrr: '-0.312', form: 'WLLWLL' },
  'GT':   { p: 6, w: 2, l: 4, pts: 4,  nrr: '-0.445', form: 'LLWLWL' },
  'KKR':  { p: 6, w: 1, l: 5, pts: 2,  nrr: '-0.623', form: 'WLLLLL' },
  'CSK':  { p: 6, w: 1, l: 5, pts: 2,  nrr: '-0.789', form: 'LLLLLW' },
};

// Head to head records this IPL season
const HEAD_TO_HEAD: Record<string, string> = {
  'RCB-MI': 'RCB won last meeting by 4 wickets',
  'MI-RCB': 'RCB won last meeting by 4 wickets',
  'CSK-KKR': 'CSK won last meeting by 6 runs',
  'KKR-CSK': 'CSK won last meeting by 6 runs',
  'DC-GT': 'DC won last meeting by 28 runs',
  'GT-DC': 'DC won last meeting by 28 runs',
  'PBKS-SRH': 'PBKS won last meeting by 5 wickets',
  'SRH-PBKS': 'PBKS won last meeting by 5 wickets',
  'RR-LSG': 'RR won last meeting by 7 runs',
  'LSG-RR': 'RR won last meeting by 7 runs',
};

function getTeamCode(name: string): string | null {
  const lower = name.toLowerCase().trim();
  return TEAM_MAP[lower] || null;
}

function getFormScore(form: string): number {
  // W=1, L=0, calculate recent form percentage
  const wins = (form.match(/W/g) || []).length;
  return Math.round((wins / form.length) * 100);
}

export async function POST(request: NextRequest) {
  try {
    const { team1, team2 } = await request.json();
    if (!team1 || !team2) return Response.json({ error: 'Missing teams' }, { status: 400 });

    const code1 = getTeamCode(team1);
    const code2 = getTeamCode(team2);

    if (!code1 || !code2) {
      return Response.json({ context: null, reason: 'Teams not found' });
    }

    const t1 = POINTS_TABLE[code1];
    const t2 = POINTS_TABLE[code2];
    const h2h = HEAD_TO_HEAD[`${code1}-${code2}`] || HEAD_TO_HEAD[`${code2}-${code1}`] || null;

    const form1 = getFormScore(t1.form);
    const form2 = getFormScore(t2.form);

    // Build context string for AI
    const context = `
IPL 2026 MATCH CONTEXT:

${team1} (${code1}):
- Points Table: ${t1.pts} pts from ${t1.p} games (${t1.w}W ${t1.l}L)
- NRR: ${t1.nrr}
- Recent form (last 5): ${t1.form} — ${form1}% win rate
- Position: ${Object.values(POINTS_TABLE).filter(t => t.pts > t1.pts).length + 1} in table

${team2} (${code2}):
- Points Table: ${t2.pts} pts from ${t2.p} games (${t2.w}W ${t2.l}L)  
- NRR: ${t2.nrr}
- Recent form (last 5): ${t2.form} — ${form2}% win rate
- Position: ${Object.values(POINTS_TABLE).filter(t => t.pts > t2.pts).length + 1} in table

${h2h ? `Head to head this season: ${h2h}` : ''}

Form advantage: ${form1 > form2 ? `${team1} in better form (${form1}% vs ${form2}%)` : form2 > form1 ? `${team2} in better form (${form2}% vs ${form1}%)` : 'Both teams in similar form'}
Points advantage: ${t1.pts > t2.pts ? `${team1} higher in table (${t1.pts} vs ${t2.pts} pts)` : t2.pts > t1.pts ? `${team2} higher in table (${t2.pts} vs ${t1.pts} pts)` : 'Both teams level on points'}
`.trim();

    // Calculate base probability — weighted: form 40%, points 35%, NRR 25%
    const nrr1 = parseFloat(t1.nrr);
    const nrr2 = parseFloat(t2.nrr);
    const nrrMax = Math.max(Math.abs(nrr1), Math.abs(nrr2), 0.1);

    const score1 = (form1 * 0.40) + ((t1.pts / Math.max(t1.pts + t2.pts, 1)) * 100 * 0.35) + (((nrr1 / nrrMax) + 1) / 2 * 100 * 0.25);
    const score2 = (form2 * 0.40) + ((t2.pts / Math.max(t1.pts + t2.pts, 1)) * 100 * 0.35) + (((nrr2 / nrrMax) + 1) / 2 * 100 * 0.25);

    const total = score1 + score2 || 100;
    // Apply sigmoid-like stretch to avoid clustering at 50%
    let raw = (score1 / total) * 100;
    // Stretch away from 50: if raw=60 → ~65, if raw=40 → ~35, if raw=70 → ~75
    const stretched = 50 + (raw - 50) * 1.5;
    const baseProbability = Math.round(Math.max(25, Math.min(80, stretched)));

    return Response.json({
      context,
      baseProbability,
      team1: { code: code1, ...t1, formScore: form1 },
      team2: { code: code2, ...t2, formScore: form2 },
      h2h,
    });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
