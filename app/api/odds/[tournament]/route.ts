import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/error";
import {
  fetchBestOdds,
  isTournamentSlug,
  TOURNAMENT_CONFIG,
} from "@/lib/odds";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournament: string }> }
) {
  const { tournament } = await params;
  const apiKey = process.env.ODDS_API_KEY;

  if (!isTournamentSlug(tournament)) {
    return NextResponse.json({ error: "Invalid tournament slug." }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ODDS_API_KEY environment variable." },
      { status: 500 }
    );
  }

  try {
    const golfers = await fetchBestOdds(apiKey, tournament);
    return NextResponse.json({
      ok: true,
      tournament,
      sport_key: TOURNAMENT_CONFIG[tournament].sportKey,
      label: TOURNAMENT_CONFIG[tournament].label,
      count: golfers.length,
      golfers,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, `Failed to fetch odds for ${tournament}.`) },
      { status: 502 }
    );
  }
}
