import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/error";
import { fetchSlashSchedules } from "@/lib/slashGolf";

export async function GET(req: Request) {
  const slashApiKey = process.env.SLASH_GOLF_API_KEY || process.env.RAPIDAPI_KEY;

  if (!slashApiKey) {
    return NextResponse.json(
      { error: "Missing SLASH_GOLF_API_KEY or RAPIDAPI_KEY environment variable." },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const season = url.searchParams.get("season") || new Date().getFullYear().toString();
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();

  try {
    const result = await fetchSlashSchedules(slashApiKey, season);
    const tournaments = query
      ? result.tournaments.filter((row) => row.name.toLowerCase().includes(query))
      : result.tournaments;

    return NextResponse.json({
      ok: true,
      season,
      host: result.host,
      count: tournaments.length,
      tournaments,
      attempts: result.attempts,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load Slash Golf schedules.") },
      { status: 502 }
    );
  }
}
