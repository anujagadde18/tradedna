import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

const TEAM_MAP: Record<string, string> = {
  'royal challengers bengaluru':'RCB','rcb':'RCB','mumbai indians':'MI','mi':'MI',
  'chennai super kings':'CSK','csk':'CSK','kolkata knight riders':'KKR','kkr':'KKR',
  'delhi capitals':'DC','dc':'DC','punjab kings':'PBKS','pbks':'PBKS',
  'rajasthan royals':'RR','rr':'RR','sunrisers hyderabad':'SRH','srh':'SRH',
  'gujarat titans':'GT','gt':'GT','lucknow super giants':'LSG','lsg':'LSG',
};

// Updated April 14, after Match 22 (CSK beat KKR)
// Updated April 20 after Match 30 (MI beat GT)
const POINTS_TABLE: Record<string, { p:number; w:number; l:number; pts:number; nrr:string; form:string }> = {
  'RR':  { p:10, w:7, l:3, pts:14, nrr:'+0.656', form:'WWWWWLWLL' },
  'RCB': { p:11, w:9, l:2, pts:18, nrr:'+0.812', form:'WWLLWWWWWW' },
  'PBKS':{ p:13, w:8, l:2, pts:16, nrr:'+0.612', form:'WWWWWWWWLL' },
  'DC':  { p:11, w:5, l:6, pts:10, nrr:'-0.201', form:'LWWLWLWLL' },
  'GT':  { p:14, w:9, l:5, pts:18, nrr:'+0.821', form:'LWLWLWWLWWWWW' },
  'SRH': { p:11, w:7, l:4, pts:14, nrr:'+0.445', form:'WLLWLLWLWWW' },
  'MI':  { p:11, w:3, l:8, pts:6,  nrr:'-0.498', form:'WLLWLLLLWL' },
  'LSG': { p:13, w:3, l:9, pts:6,  nrr:'-0.612', form:'LLLWWWLLLLL' },
  'CSK': { p:11, w:3, l:8, pts:6,  nrr:'-0.398', form:'LLLLLWWWLL' },
  'KKR': { p:13, w:6, l:6, pts:13,  nrr:'+0.011', form:'LLLLLLLNLWWWW' },
};

const VENUE_DATA: Record<string, { chase:number; dew:boolean; homeAdv:number; notes:string }> = {
  'Hyderabad':      { chase:62, dew:true,  homeAdv:8,  notes:'SRH fortress, heavy dew, avg 190+ scores. SRH beat RR by 57 runs here Apr 13' },
  'Mumbai':         { chase:78, dew:true,  homeAdv:10,  notes:'Wankhede 2026: chasing team wins 78% of matches. Avg score 218. Dew heavily favors second innings. MI lead CSK 8-5 at this venue. Short boundaries, fast outfield.' },
  'Bengaluru':      { chase:45, dew:false, homeAdv:7,  notes:'Chinnaswamy, RCB defending champions at home. High scoring venue' },
  'Chennai':        { chase:40, dew:false, homeAdv:8,  notes:'Chepauk slow turner, bat first wins 55%+. CSK beat KKR here Apr 14' },
  'Kolkata':        { chase:52, dew:true,  homeAdv:5,  notes:'Eden Gardens balanced, slight dew advantage' },
  'Delhi':          { chase:55, dew:true,  homeAdv:4,  notes:'Kotla flat track, dew factor helps chasers' },
  'Jaipur':         { chase:50, dew:false, homeAdv:5,  notes:'SMS Stadium balanced surface' },
  'Ahmedabad':      { chase:53, dew:false, homeAdv:4,  notes:'Narendra Modi Stadium, big ground, balanced' },
  'Lucknow':        { chase:54, dew:true,  homeAdv:5,  notes:'BRSABV Stadium, some evening dew' },
  'New Chandigarh': { chase:48, dew:false, homeAdv:4,  notes:'Mullanpur, low dew, bat first advantage' },
  'Guwahati':       { chase:52, dew:false, homeAdv:0,  notes:'Neutral venue for RR' },
  'Dharamshala':    { chase:46, dew:false, homeAdv:4,  notes:'Cool conditions, bat first advantage' },
};

const HOME_TEAM: Record<string, string> = {
  'Hyderabad':'SRH','Mumbai':'MI','Bengaluru':'RCB','Chennai':'CSK',
  'Kolkata':'KKR','Delhi':'DC','Jaipur':'RR','Ahmedabad':'GT',
  'Lucknow':'LSG','New Chandigarh':'PBKS','Dharamshala':'PBKS',
};

const HEAD_TO_HEAD: Record<string, string> = {
  'RCB-MI':'RCB won last meeting by 18 runs (Wankhede, Apr 12)','MI-RCB':'RCB won last meeting by 18 runs',
  'CSK-KKR':'CSK won last meeting (Chennai, Apr 14)','KKR-CSK':'CSK won last meeting',
  'DC-GT':'GT won last meeting (1 run)','GT-DC':'GT won last meeting (1 run)',
  'PBKS-SRH':'PBKS won last meeting','SRH-PBKS':'PBKS won last meeting',
  'SRH-RR':'SRH won last meeting by 57 runs (home, Apr 13)','RR-SRH':'SRH won last meeting by 57 runs',
};

const PLAYER_SPOTLIGHT: Record<string, { bat:{name:string;runs:number;avg:number;sr:number;role:string}; bowl:{name:string;wkts:number;eco:number;role:string} }> = {
  'RR':  { bat:{name:'Yashasvi Jaiswal',  runs:280,avg:56,sr:171,role:'Opener'},       bowl:{name:'Ravi Bishnoi',      wkts:11,eco:6.7,role:'Leg Spin'} },
  'RCB': { bat:{name:'Virat Kohli',       runs:420,avg:54,sr:168,role:'Batter'},        bowl:{name:'Bhuvneshwar Kumar', wkts:24,eco:7.2,role:'Pacer'} },
  'PBKS':{ bat:{name:'Priyansh Arya',     runs:380,avg:48,sr:195,role:'Opener'},        bowl:{name:'Arshdeep Singh',    wkts:14,eco:7.8,role:'Pacer'} },
  'DC':  { bat:{name:'KL Rahul',          runs:433,avg:54,sr:185,role:'Wicketkeeper/Orange Cap'},  bowl:{name:'Kuldeep Yadav',     wkts:9, eco:7.0,role:'Wrist Spin'} },
  'SRH': { bat:{name:'Abhishek Sharma',   runs:460,avg:47,sr:215,role:'Opener/Orange Cap'}, bowl:{name:'Pat Cummins',    wkts:12,eco:8.1,role:'Pacer/Captain'} },
  'GT':  { bat:{name:'Sai Sudharsan',     runs:638,avg:49,sr:148,role:'Opener/Orange Cap'}, bowl:{name:'Kagiso Rabada',   wkts:20,eco:8.1,role:'Pacer'} },
  'LSG': { bat:{name:'Nicholas Pooran',   runs:185,avg:46,sr:181,role:'Wicketkeeper'},  bowl:{name:'Mohsin Khan',       wkts:8, eco:7.3,role:'Pacer'} },
  'CSK': { bat:{name:'Ruturaj Gaikwad',   runs:198,avg:33,sr:158,role:'Captain'},        bowl:{name:'Anshul Kamboj',     wkts:13,eco:7.8,role:'Pacer'} },
  'MI':  { bat:{name:'Tilak Varma',        runs:245,avg:49,sr:168,role:'Middle order'},        bowl:{name:'Jasprit Bumrah',    wkts:10,eco:6.1,role:'Pacer'} },
  'KKR': { bat:{name:'Venkatesh Iyer',    runs:280,avg:40,sr:178,role:'Opener'},        bowl:{name:'Varun Chakravarthy',wkts:12,eco:7.2,role:'Mystery Spin'} },
};

export async function POST(request: NextRequest) {
  try {
    const { team1, team2, venue } = await request.json();
    if (!team1 || !team2) return Response.json({ error: 'Missing teams' }, { status: 400 });

    const code1 = TEAM_MAP[team1.toLowerCase().trim()];
    const code2 = TEAM_MAP[team2.toLowerCase().trim()];
    if (!code1 || !code2) return Response.json({ context: null, reason: 'Teams not found' });

    const t1 = POINTS_TABLE[code1];
    const t2 = POINTS_TABLE[code2];
    const h2h = HEAD_TO_HEAD[`${code1}-${code2}`] || HEAD_TO_HEAD[`${code2}-${code1}`] || null;
    const form1 = Math.round(((t1.form.match(/W/g)||[]).length / t1.form.length) * 100);
    const form2 = Math.round(((t2.form.match(/W/g)||[]).length / t2.form.length) * 100);

    const venueData = venue ? VENUE_DATA[venue] : null;
    const homeTeam = venue ? (HOME_TEAM[venue] || null) : null;
    const isHome1 = homeTeam === code1;
    const isHome2 = homeTeam === code2;

    const nrr1 = parseFloat(t1.nrr), nrr2 = parseFloat(t2.nrr);
    const nrrMax = Math.max(Math.abs(nrr1), Math.abs(nrr2), 0.1);

    let s1 = (form1*0.35) + ((t1.pts/Math.max(t1.pts+t2.pts,1))*100*0.30) + (((nrr1/nrrMax)+1)/2*100*0.20);
    let s2 = (form2*0.35) + ((t2.pts/Math.max(t1.pts+t2.pts,1))*100*0.30) + (((nrr2/nrrMax)+1)/2*100*0.20);

    if (venueData) {
      if (isHome1) s1 += venueData.homeAdv * 1.5;
      if (isHome2) s2 += venueData.homeAdv * 1.5;
    }

    const raw = (s1/(s1+s2))*100;
    const stretched = 50 + (raw-50)*1.6;
    const baseProbability = Math.round(Math.max(20, Math.min(82, stretched)));

    return Response.json({
      context: `${team1}(${code1}): ${t1.pts}pts ${t1.w}W${t1.l}L form:${t1.form}${isHome1?' HOME':''}
${team2}(${code2}): ${t2.pts}pts ${t2.w}W${t2.l}L form:${t2.form}${isHome2?' HOME':''}
${h2h||''}${venueData?`\n${venue}: chase${venueData.chase}% ${venueData.dew?'+ dew':''}`:''} `,
      baseProbability,
      team1: { code:code1, ...t1, formScore:form1, isHome:isHome1 },
      team2: { code:code2, ...t2, formScore:form2, isHome:isHome2 },
      h2h, venue: venueData,
      spotlight: { team1: PLAYER_SPOTLIGHT[code1]||null, team2: PLAYER_SPOTLIGHT[code2]||null }
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
