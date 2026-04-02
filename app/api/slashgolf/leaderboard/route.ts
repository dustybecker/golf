import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/error";
import { fetchSlashLeaderboard } from "@/lib/slashGolf";

export async function GET(req: Request) {
  const apiKey = process.env.SLASH_GOLF_API_KEY || process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing SLASH_GOLF_API_KEY or RAPIDAPI_KEY environment variable." },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const rawTournId = (url.searchParams.get("tournId") || "").trim();
  const year = url.searchParams.get("year") || new Date().getFullYear().toString();

  if (!rawTournId) {
    return NextResponse.json({ error: "Valid tournId is required." }, { status: 400 });
  }

  try {
    const result = await fetchSlashLeaderboard(apiKey, rawTournId, year);
    return NextResponse.json({
      ok: true,
      host: result.host,
      tournId: rawTournId,
      year,
      count: result.rows.length,
      rows: result.rows,
      attempts: result.attempts,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load Slash Golf leaderboard.") },
      { status: 502 }
    );
  }
}
