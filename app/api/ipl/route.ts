import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';

// Full IPL 2026 schedule — single source of truth
// Auto-filters based on today's date — no manual updates needed
const IPL_SCHEDULE = [
  { no:1,  date:'2026-03-28', home:'Royal Challengers Bengaluru', away:'Sunrisers Hyderabad',        venue:'Bengaluru',       time:'7:30 PM' },
  { no:2,  date:'2026-03-29', home:'Mumbai Indians',              away:'Kolkata Knight Riders',       venue:'Mumbai',          time:'7:30 PM' },
  { no:3,  date:'2026-03-30', home:'Rajasthan Royals',            away:'Chennai Super Kings',         venue:'Guwahati',        time:'7:30 PM' },
  { no:4,  date:'2026-03-31', home:'Punjab Kings',                away:'Gujarat Titans',              venue:'New Chandigarh',  time:'7:30 PM' },
  { no:5,  date:'2026-04-01', home:'Lucknow Super Giants',        away:'Delhi Capitals',              venue:'Lucknow',         time:'7:30 PM' },
  { no:6,  date:'2026-04-02', home:'Kolkata Knight Riders',       away:'Sunrisers Hyderabad',         venue:'Kolkata',         time:'7:30 PM' },
  { no:7,  date:'2026-04-03', home:'Chennai Super Kings',         away:'Punjab Kings',                venue:'Chennai',         time:'7:30 PM' },
  { no:8,  date:'2026-04-04', home:'Delhi Capitals',              away:'Mumbai Indians',              venue:'Delhi',           time:'3:30 PM' },
  { no:9,  date:'2026-04-04', home:'Gujarat Titans',              away:'Rajasthan Royals',            venue:'Ahmedabad',       time:'7:30 PM' },
  { no:10, date:'2026-04-05', home:'Sunrisers Hyderabad',         away:'Lucknow Super Giants',        venue:'Hyderabad',       time:'3:30 PM' },
  { no:11, date:'2026-04-05', home:'Royal Challengers Bengaluru', away:'Chennai Super Kings',         venue:'Bengaluru',       time:'7:30 PM' },
  { no:12, date:'2026-04-06', home:'Kolkata Knight Riders',       away:'Punjab Kings',                venue:'Kolkata',         time:'7:30 PM' },
  { no:13, date:'2026-04-07', home:'Rajasthan Royals',            away:'Mumbai Indians',              venue:'Guwahati',        time:'7:30 PM' },
  { no:14, date:'2026-04-08', home:'Delhi Capitals',              away:'Gujarat Titans',              venue:'Delhi',           time:'7:30 PM' },
  { no:15, date:'2026-04-09', home:'Kolkata Knight Riders',       away:'Lucknow Super Giants',        venue:'Kolkata',         time:'7:30 PM' },
  { no:16, date:'2026-04-10', home:'Rajasthan Royals',            away:'Royal Challengers Bengaluru', venue:'Guwahati',        time:'7:30 PM' },
  { no:17, date:'2026-04-11', home:'Punjab Kings',                away:'Sunrisers Hyderabad',         venue:'New Chandigarh',  time:'3:30 PM' },
  { no:18, date:'2026-04-11', home:'Chennai Super Kings',         away:'Delhi Capitals',              venue:'Chennai',         time:'7:30 PM' },
  { no:19, date:'2026-04-12', home:'Lucknow Super Giants',        away:'Gujarat Titans',              venue:'Lucknow',         time:'3:30 PM' },
  { no:20, date:'2026-04-12', home:'Mumbai Indians',              away:'Royal Challengers Bengaluru', venue:'Mumbai',          time:'7:30 PM' },
  { no:21, date:'2026-04-13', home:'Sunrisers Hyderabad',         away:'Rajasthan Royals',            venue:'Hyderabad',       time:'7:30 PM' },
  { no:22, date:'2026-04-14', home:'Chennai Super Kings',         away:'Kolkata Knight Riders',       venue:'Chennai',         time:'7:30 PM' },
  { no:23, date:'2026-04-15', home:'Royal Challengers Bengaluru', away:'Lucknow Super Giants',        venue:'Bengaluru',       time:'7:30 PM' },
  { no:24, date:'2026-04-16', home:'Mumbai Indians',              away:'Punjab Kings',                venue:'Mumbai',          time:'7:30 PM' },
  { no:25, date:'2026-04-17', home:'Gujarat Titans',              away:'Kolkata Knight Riders',       venue:'Ahmedabad',       time:'7:30 PM' },
  { no:26, date:'2026-04-18', home:'Royal Challengers Bengaluru', away:'Delhi Capitals',              venue:'Bengaluru',       time:'3:30 PM' },
  { no:27, date:'2026-04-18', home:'Sunrisers Hyderabad',         away:'Chennai Super Kings',         venue:'Hyderabad',       time:'7:30 PM' },
  { no:28, date:'2026-04-19', home:'Kolkata Knight Riders',       away:'Rajasthan Royals',            venue:'Kolkata',         time:'3:30 PM' },
  { no:29, date:'2026-04-19', home:'Punjab Kings',                away:'Lucknow Super Giants',        venue:'New Chandigarh',  time:'7:30 PM' },
  { no:30, date:'2026-04-20', home:'Gujarat Titans',              away:'Mumbai Indians',              venue:'Ahmedabad',       time:'7:30 PM' },
  { no:31, date:'2026-04-21', home:'Sunrisers Hyderabad',         away:'Delhi Capitals',              venue:'Hyderabad',       time:'7:30 PM' },
  { no:32, date:'2026-04-22', home:'Lucknow Super Giants',        away:'Rajasthan Royals',            venue:'Lucknow',         time:'7:30 PM' },
  { no:33, date:'2026-04-23', home:'Mumbai Indians',              away:'Chennai Super Kings',         venue:'Mumbai',          time:'7:30 PM' },
  { no:34, date:'2026-04-24', home:'Royal Challengers Bengaluru', away:'Gujarat Titans',              venue:'Bengaluru',       time:'7:30 PM' },
  { no:35, date:'2026-04-25', home:'Delhi Capitals',              away:'Punjab Kings',                venue:'Delhi',           time:'3:30 PM' },
  { no:36, date:'2026-04-25', home:'Rajasthan Royals',            away:'Sunrisers Hyderabad',         venue:'Jaipur',          time:'7:30 PM' },
  { no:37, date:'2026-04-26', home:'Gujarat Titans',              away:'Chennai Super Kings',         venue:'Ahmedabad',       time:'3:30 PM' },
  { no:38, date:'2026-04-26', home:'Lucknow Super Giants',        away:'Kolkata Knight Riders',       venue:'Lucknow',         time:'7:30 PM' },
  { no:39, date:'2026-04-27', home:'Delhi Capitals',              away:'Royal Challengers Bengaluru', venue:'Delhi',           time:'7:30 PM' },
  { no:40, date:'2026-04-28', home:'Punjab Kings',                away:'Rajasthan Royals',            venue:'New Chandigarh',  time:'7:30 PM' },
  { no:41, date:'2026-04-29', home:'Mumbai Indians',              away:'Sunrisers Hyderabad',         venue:'Mumbai',          time:'7:30 PM' },
  { no:42, date:'2026-04-30', home:'Gujarat Titans',              away:'Royal Challengers Bengaluru', venue:'Ahmedabad',       time:'7:30 PM' },
  { no:43, date:'2026-05-01', home:'Rajasthan Royals',            away:'Delhi Capitals',              venue:'Jaipur',          time:'7:30 PM' },
  { no:44, date:'2026-05-02', home:'Chennai Super Kings',         away:'Mumbai Indians',              venue:'Chennai',         time:'7:30 PM' },
  { no:45, date:'2026-05-03', home:'Sunrisers Hyderabad',         away:'Kolkata Knight Riders',       venue:'Hyderabad',       time:'3:30 PM' },
  { no:46, date:'2026-05-03', home:'Gujarat Titans',              away:'Punjab Kings',                venue:'Ahmedabad',       time:'7:30 PM' },
  { no:47, date:'2026-05-04', home:'Mumbai Indians',              away:'Lucknow Super Giants',        venue:'Mumbai',          time:'7:30 PM' },
  { no:48, date:'2026-05-05', home:'Delhi Capitals',              away:'Chennai Super Kings',         venue:'Delhi',           time:'7:30 PM' },
  { no:49, date:'2026-05-06', home:'Sunrisers Hyderabad',         away:'Punjab Kings',                venue:'Hyderabad',       time:'7:30 PM' },
  { no:50, date:'2026-05-07', home:'Lucknow Super Giants',        away:'Royal Challengers Bengaluru', venue:'Lucknow',         time:'7:30 PM' },
  { no:51, date:'2026-05-08', home:'Delhi Capitals',              away:'Kolkata Knight Riders',       venue:'Delhi',           time:'7:30 PM' },
  { no:52, date:'2026-05-09', home:'Rajasthan Royals',            away:'Gujarat Titans',              venue:'Jaipur',          time:'7:30 PM' },
  { no:53, date:'2026-05-10', home:'Chennai Super Kings',         away:'Lucknow Super Giants',        venue:'Chennai',         time:'3:30 PM' },
  { no:54, date:'2026-05-10', home:'Royal Challengers Bengaluru', away:'Mumbai Indians',              venue:'Raipur',          time:'7:30 PM' },
  { no:55, date:'2026-05-11', home:'Punjab Kings',                away:'Delhi Capitals',              venue:'Dharamshala',     time:'7:30 PM' },
  { no:56, date:'2026-05-12', home:'Gujarat Titans',              away:'Sunrisers Hyderabad',         venue:'Ahmedabad',       time:'7:30 PM' },
  { no:57, date:'2026-05-13', home:'Royal Challengers Bengaluru', away:'Kolkata Knight Riders',       venue:'Raipur',          time:'7:30 PM' },
  { no:58, date:'2026-05-14', home:'Punjab Kings',                away:'Mumbai Indians',              venue:'Dharamshala',     time:'7:30 PM' },
  { no:59, date:'2026-05-15', home:'Lucknow Super Giants',        away:'Chennai Super Kings',         venue:'Lucknow',         time:'7:30 PM' },
  { no:60, date:'2026-05-16', home:'Kolkata Knight Riders',       away:'Gujarat Titans',              venue:'Kolkata',         time:'7:30 PM' },
  { no:61, date:'2026-05-17', home:'Punjab Kings',                away:'Royal Challengers Bengaluru', venue:'Dharamshala',     time:'3:30 PM' },
  { no:62, date:'2026-05-17', home:'Delhi Capitals',              away:'Rajasthan Royals',            venue:'Delhi',           time:'7:30 PM' },
  { no:63, date:'2026-05-18', home:'Chennai Super Kings',         away:'Sunrisers Hyderabad',         venue:'Chennai',         time:'7:30 PM' },
  { no:64, date:'2026-05-19', home:'Rajasthan Royals',            away:'Lucknow Super Giants',        venue:'Jaipur',          time:'7:30 PM' },
  { no:65, date:'2026-05-20', home:'Kolkata Knight Riders',       away:'Mumbai Indians',              venue:'Kolkata',         time:'7:30 PM' },
  { no:66, date:'2026-05-21', home:'Chennai Super Kings',         away:'Gujarat Titans',              venue:'Chennai',         time:'7:30 PM' },
  { no:67, date:'2026-05-22', home:'Sunrisers Hyderabad',         away:'Royal Challengers Bengaluru', venue:'Hyderabad',       time:'7:30 PM' },
  { no:68, date:'2026-05-23', home:'Lucknow Super Giants',        away:'Punjab Kings',                venue:'Lucknow',         time:'7:30 PM' },
  { no:69, date:'2026-05-24', home:'Mumbai Indians',              away:'Rajasthan Royals',            venue:'Mumbai',          time:'3:30 PM' },
  { no:70, date:'2026-05-24', home:'Kolkata Knight Riders',       away:'Delhi Capitals',              venue:'Kolkata',         time:'7:30 PM' },
];

export async function GET(request: NextRequest) {
  // Get current date in IST (UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const todayIST = istNow.toISOString().split('T')[0];

  const type = request.nextUrl.searchParams.get('type') || 'upcoming';

  if (type === 'today') {
    const today = IPL_SCHEDULE.filter(m => m.date === todayIST);
    return Response.json({ matches: today });
  }

  if (type === 'upcoming') {
    // Today + next 4 days
    const upcoming = IPL_SCHEDULE.filter(m => m.date >= todayIST).slice(0, 5);
    return Response.json({ matches: upcoming });
  }

  if (type === 'all') {
    return Response.json({ matches: IPL_SCHEDULE });
  }

  // Default: today + upcoming
  const upcoming = IPL_SCHEDULE.filter(m => m.date >= todayIST).slice(0, 4);
  return Response.json({ matches: upcoming, today: todayIST });
}
