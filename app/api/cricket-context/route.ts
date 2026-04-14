import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

const TEAM_MAP: Record<string, string> = {
  'royal challengers bengaluru':'RCB','rcb':'RCB','mumbai indians':'MI','mi':'MI',
  'chennai super kings':'CSK','csk':'CSK','kolkata knight riders':'KKR','kkr':'KKR',
  'delhi capitals':'DC','dc':'DC','punjab kings':'PBKS','pbks':'PBKS',
  'rajasthan royals':'RR','rr':'RR','sunrisers hyderabad':'SRH','srh':'SRH',
  'gujarat titans':'GT','gt':'GT','lucknow super giants':'LSG','lsg':'LSG',
};

const POINTS_TABLE: Record<string, { p:number; w:number; l:number; pts:number; nrr:string; form:string }> = {
  'RR':  { p:7, w:6, l:1, pts:12, nrr:'+1.089', form:'WWWWWL' },
  'PBKS':{ p:7, w:4, l:3, pts:8,  nrr:'+0.487', form:'WLWLWW' },
  'RCB': { p:7, w:4, l:3, pts:8,  nrr:'+0.298', form:'WWLLWL' },
  'DC':  { p:7, w:4, l:3, pts:8,  nrr:'+0.156', form:'LWWLWL' },
  'LSG': { p:7, w:4, l:3, pts:8,  nrr:'+0.021', form:'LLLWWW' },
  'SRH': { p:7, w:3, l:4, pts:6,  nrr:'-0.134', form:'WLLWLLW' },
  'MI':  { p:7, w:2, l:5, pts:4,  nrr:'-0.287', form:'WLLWLL' },
  'GT':  { p:7, w:3, l:4, pts:6,  nrr:'-0.312', form:'LLWLWL' },
  'KKR': { p:7, w:1, l:6, pts:2,  nrr:'-0.589', form:'WLLLLL' },
  'CSK': { p:7, w:1, l:6, pts:2,  nrr:'-0.701', form:'LLLLLW' },
};

const VENUE_DATA: Record<string, { chase:number; dew:boolean; batFirst:boolean; homeAdv:number; notes:string }> = {
  'Hyderabad':      { chase:62, dew:true,  batFirst:false, homeAdv:8,  notes:'SRH fortress, heavy dew after 8:45PM, avg 189+ scores' },
  'Mumbai':         { chase:57, dew:true,  batFirst:false, homeAdv:6,  notes:'Wankhede batting paradise, MI strong at home' },
  'Bengaluru':      { chase:45, dew:false, batFirst:true,  homeAdv:7,  notes:'Chinnaswamy, RCB bat-first historically, short boundaries' },
  'Chennai':        { chase:40, dew:false, batFirst:true,  homeAdv:8,  notes:'Chepauk slow turner, bat first wins 55%+' },
  'Kolkata':        { chase:52, dew:true,  batFirst:false, homeAdv:5,  notes:'Eden Gardens balanced, slight dew advantage' },
  'Delhi':          { chase:55, dew:true,  batFirst:false, homeAdv:4,  notes:'Kotla flat track, dew factor helps chasers' },
  'Jaipur':         { chase:50, dew:false, batFirst:false, homeAdv:5,  notes:'SMS Stadium balanced surface' },
  'Ahmedabad':      { chase:53, dew:false, batFirst:false, homeAdv:4,  notes:'Narendra Modi Stadium, big ground' },
  'Lucknow':        { chase:54, dew:true,  batFirst:false, homeAdv:5,  notes:'BRSABV Stadium, some evening dew' },
  'New Chandigarh': { chase:48, dew:false, batFirst:true,  homeAdv:4,  notes:'Mullanpur, low dew, bat first advantage' },
  'Guwahati':       { chase:52, dew:false, batFirst:false, homeAdv:0,  notes:'Neutral venue, balanced conditions' },
  'Dharamshala':    { chase:46, dew:false, batFirst:true,  homeAdv:4,  notes:'Cool conditions, bat first advantage' },
  'Raipur':         { chase:51, dew:false, batFirst:false, homeAdv:0,  notes:'Neutral venue, balanced' },
};

const HOME_TEAM: Record<string, string> = {
  'Hyderabad':'SRH','Mumbai':'MI','Bengaluru':'RCB','Chennai':'CSK',
  'Kolkata':'KKR','Delhi':'DC','Jaipur':'RR','Ahmedabad':'GT',
  'Lucknow':'LSG','New Chandigarh':'PBKS','Dharamshala':'PBKS',
};

const HEAD_TO_HEAD: Record<string, string> = {
  'RCB-MI':'RCB won last meeting','MI-RCB':'RCB won last meeting',
  'CSK-KKR':'CSK won last meeting','KKR-CSK':'CSK won last meeting',
  'DC-GT':'GT won last meeting (1 run thriller)','GT-DC':'GT won last meeting (1 run thriller)',
  'PBKS-SRH':'PBKS won last meeting','SRH-PBKS':'PBKS won last meeting',
  'RR-LSG':'RR won last meeting','LSG-RR':'RR won last meeting',
  'SRH-RR':'SRH won last meeting (home)','RR-SRH':'SRH won last meeting (home)',
};

const PLAYER_SPOTLIGHT: Record<string, { bat:{name:string;runs:number;avg:number;sr:number;role:string}; bowl:{name:string;wkts:number;eco:number;role:string} }> = {
  'RR':  { bat:{name:'Yashasvi Jaiswal',  runs:265,avg:53,sr:168,role:'Opener'},       bowl:{name:'Ravi Bishnoi',      wkts:10,eco:6.8,role:'Leg Spin'} },
  'PBKS':{ bat:{name:'Shashank Singh',    runs:195,avg:49,sr:172,role:'Middle order'}, bowl:{name:'Vijaykumar Vyshak', wkts:9, eco:7.2,role:'Pacer'} },
  'RCB': { bat:{name:'Virat Kohli',       runs:210,avg:42,sr:142,role:'Opener'},       bowl:{name:'Jacob Duffy',       wkts:9, eco:7.8,role:'Pacer'} },
  'DC':  { bat:{name:'Sameer Rizvi',      runs:215,avg:54,sr:165,role:'Opener'},       bowl:{name:'Kuldeep Yadav',     wkts:8, eco:7.1,role:'Wrist Spin'} },
  'LSG': { bat:{name:'Nicholas Pooran',   runs:178,avg:45,sr:178,role:'Wicketkeeper'}, bowl:{name:'Mohsin Khan',       wkts:7, eco:7.4,role:'Pacer'} },
  'SRH': { bat:{name:'Heinrich Klaasen',  runs:210,avg:53,sr:182,role:'Wicketkeeper'}, bowl:{name:'Harshal Patel',     wkts:8, eco:8.2,role:'Pacer'} },
  'MI':  { bat:{name:'Rohit Sharma',      runs:180,avg:36,sr:148,role:'Opener'},       bowl:{name:'Jasprit Bumrah',    wkts:9, eco:6.2,role:'Pacer'} },
  'GT':  { bat:{name:'Shubman Gill',      runs:168,avg:34,sr:139,role:'Opener'},       bowl:{name:'Rashid Khan',       wkts:8, eco:6.5,role:'Leg Spin'} },
  'KKR': { bat:{name:'Venkatesh Iyer',    runs:134,avg:22,sr:135,role:'Opener'},       bowl:{name:'Varun Chakravarthy',wkts:6, eco:7.8,role:'Mystery Spin'} },
  'CSK': { bat:{name:'Ruturaj Gaikwad',   runs:118,avg:20,sr:128,role:'Opener'},       bowl:{name:'Jamie Overton',     wkts:7, eco:8.1,role:'Pacer'} },
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

    let score1 = (form1*0.35) + ((t1.pts/Math.max(t1.pts+t2.pts,1))*100*0.30) + (((nrr1/nrrMax)+1)/2*100*0.20);
    let score2 = (form2*0.35) + ((t2.pts/Math.max(t1.pts+t2.pts,1))*100*0.30) + (((nrr2/nrrMax)+1)/2*100*0.20);

    if (venueData) {
      if (isHome1) score1 += venueData.homeAdv * 1.5;
      if (isHome2) score2 += venueData.homeAdv * 1.5;
    }

    const total = score1 + score2 || 100;
    const raw = (score1/total)*100;
    const stretched = 50 + (raw-50)*1.6;
    const baseProbability = Math.round(Math.max(20, Math.min(82, stretched)));

    const venueNote = venueData ? `\nVenue (${venue}): ${venueData.notes}\nChase success: ${venueData.chase}%${venueData.dew?' + dew factor':''}${homeTeam?` | Home: ${homeTeam===code1?team1:team2}`:''}` : '';
    const context = `${team1}(${code1}): ${t1.pts}pts ${form1}%form NRR${t1.nrr}${isHome1?' [HOME]':''}
${team2}(${code2}): ${t2.pts}pts ${form2}%form NRR${t2.nrr}${isHome2?' [HOME]':''}
${h2h||''}${venueNote}`;

    return Response.json({
      context, baseProbability,
      team1: { code:code1, ...t1, formScore:form1, isHome:isHome1 },
      team2: { code:code2, ...t2, formScore:form2, isHome:isHome2 },
      h2h, venue: venueData,
      spotlight: { team1: PLAYER_SPOTLIGHT[code1]||null, team2: PLAYER_SPOTLIGHT[code2]||null }
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
