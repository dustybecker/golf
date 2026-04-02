import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/error";
import {
  fetchHandicaps,
  isTournamentSlug,
  MAX_HANDICAP,
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
    const handicaps = await fetchHandicaps(apiKey, tournament);
    return NextResponse.json({
      ok: true,
      tournament,
      sport_key: TOURNAMENT_CONFIG[tournament].sportKey,
      label: TOURNAMENT_CONFIG[tournament].label,
      field_size: handicaps.length,
      max_handicap: MAX_HANDICAP,
      handicaps,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, `Failed to fetch handicaps for ${tournament}.`) },
      { status: 502 }
    );
  }
}
