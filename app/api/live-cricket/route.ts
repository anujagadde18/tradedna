import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";

const CRICAPI_KEY = process.env.CRICAPI_KEY;

const TEAM_NAME_MAP: Record<string, string> = {
  "Sunrisers Hyderabad": "SRH", "Lucknow Super Giants": "LSG",
  "Rajasthan Royals": "RR", "Mumbai Indians": "MI",
  "Chennai Super Kings": "CSK", "Kolkata Knight Riders": "KKR",
  "Delhi Capitals": "DC", "Punjab Kings": "PBKS",
  "Royal Challengers Bengaluru": "RCB", "Gujarat Titans": "GT",
};

async function fetchIPLMatches(): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${CRICAPI_KEY}&offset=0`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data.status !== "success") return [];
    return (data.data || []).filter((m: any) =>
      m.name?.includes("IPL") || m.series?.includes("IPL") ||
      Object.keys(TEAM_NAME_MAP).some(t => m.name?.includes(t))
    );
  } catch { return []; }
}

async function fetchIPLStandings(): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.cricapi.com/v1/series_points_table?apikey=${CRICAPI_KEY}&id=d5a498b5-0c0e-4b4c-9a9e-d86f87536f42`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    if (data.status !== "success") return [];
    return data.data?.pointsTable || [];
  } catch { return []; }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "matches";
    const team1 = searchParams.get("team1");
    const team2 = searchParams.get("team2");

    if (type === "standings") {
      const standings = await fetchIPLStandings();
      return Response.json({ success: true, data: standings });
    }

    const matches = await fetchIPLMatches();

    if (team1 && team2) {
      const match = matches.find((m: any) => {
        const name = m.name?.toLowerCase() || "";
        const t1 = team1.toLowerCase();
        const t2 = team2.toLowerCase();
        return (name.includes(t1) || name.includes(t2));
      });

      if (!match) {
        return Response.json({ success: false, message: "Match not found or not live" });
      }

      const isLive = match.matchStarted && !match.matchEnded;
      const score = match.score || [];

      let liveContext = "";
      if (isLive && score.length > 0) {
        const innings = score[score.length - 1];
        const battingTeam = innings?.inning?.replace(" Inning 1", "").replace(" Inning 2", "") || "";
        const runs = innings?.r || 0;
        const wickets = innings?.w || 0;
        const overs = innings?.o || 0;
        const oversTotal = 20;
        const oversLeft = oversTotal - parseFloat(overs);
        const projectedScore = Math.round(runs + (runs / parseFloat(overs)) * oversLeft);

        liveContext = `LIVE: ${battingTeam} ${runs}/${wickets} off ${overs} overs. Projected: ~${projectedScore}. Overs left: ${oversLeft.toFixed(1)}`;
      }

      return Response.json({
        success: true,
        isLive,
        matchEnded: match.matchEnded,
        score: match.score,
        status: match.status,
        liveContext,
        winner: match.matchEnded ? (match.teams?.[0] || "") : null,
      });
    }

    return Response.json({ success: true, matches: matches.slice(0, 5) });

  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
