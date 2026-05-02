import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Today's curated daily pick - updated manually each morning
// In future this will be auto-generated from live markets
const DAILY_PICKS = [
  {
    date: '2026-05-03',
    id: 'srh-kkr-may3',
    category: 'cricket',
    icon: '🏏',
    title: 'SRH vs KKR — IPL 2026',
    subtitle: 'Rajiv Gandhi Stadium, Hyderabad · 3:30 PM IST',
    prediction: 'SRH to win',
    confidence: 82,
    verdict: 'HIGH CONVICTION',
    verdictColor: '#2ecc8a',
    reasoning: [
      'SRH on 5-game winning streak — best form in tournament',
      'Home fortress at Uppal — won 4/4 home games this season',
      'KKR 8th in table, 2W 8L — massive form gap',
      'Abhishek Sharma 425 runs this season — unstoppable',
      'NRR gap: SRH +0.645 vs KKR -0.734',
    ],
    risks: [
      'KKR on 2-game winning streak — some momentum',
      'Varun Chakravarthy could spin SRH out on dry pitch',
    ],
    marketOdds: null,
    aiOdds: 82,
    edge: null,
    url: 'Will Sunrisers Hyderabad beat Kolkata Knight Riders in IPL 2026?',
    sport: 'IPL',
    matchTime: '2026-05-03T10:00:00.000Z',
  },
  {
    date: '2026-05-03',
    id: 'f1-miami-norris',
    category: 'f1',
    icon: '🏎️',
    title: 'F1 Miami Grand Prix 2026',
    subtitle: 'Miami International Autodrome · 4PM ET',
    prediction: 'Norris or Antonelli to win',
    confidence: 55,
    verdict: 'WATCH',
    verdictColor: '#f5a623',
    reasoning: [
      'Norris 29% — won sprint, McLaren fastest this weekend',
      'Antonelli 26% — GP pole, championship leader',
      'McLaren upgrades transformed their pace',
      'Mercedes vs McLaren battle — 55% combined chance',
    ],
    risks: [
      'Verstappen P2 on grid — can cause chaos',
      'Miami street circuit — safety car likely',
      'Starts are Antonelli weakness',
    ],
    marketOdds: 29,
    aiOdds: 29,
    edge: 0,
    url: 'Will Lando Norris win F1 Miami Grand Prix 2026?',
    sport: 'F1',
    matchTime: '2026-05-03T20:00:00.000Z',
  },
];

export async function GET(req: NextRequest) {
  const today = new Date().toISOString().split('T')[0];
  const picks = DAILY_PICKS.filter(p => p.date === today);
  
  return Response.json({ 
    date: today,
    picks,
    total: picks.length,
  });
}
