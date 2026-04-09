import { NextResponse } from "next/server";
import { calculateTournamentLeaderboard } from "@/lib/scoring";
import { getErrorMessage } from "@/lib/error";
import { fetchSlashLeaderboard, resolveSlashTournamentId } from "@/lib/slashGolf";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const poolId =
    url.searchParams.get("pool_id") ||
    process.env.POOL_ID ||
    process.env.NEXT_PUBLIC_POOL_ID ||
    "2026-majors-masters";
  const tournament = (url.searchParams.get("tournament") || "masters").trim();
  const year = (url.searchParams.get("year") || new Date().getFullYear().toString()).trim();

  if (!tournament) {
    return NextResponse.json({ error: "tournament is required." }, { status: 400 });
  }

  try {
    const { count: syncedScoreCount, error: scoreCountError } = await supabaseAdmin
      .from("tournament_round_scores")
      .select("*", { count: "exact", head: true })
      .eq("pool_id", poolId)
      .eq("tournament_slug", tournament);

    if (scoreCountError) {
      throw new Error(scoreCountError.message);
    }

    const rows = await calculateTournamentLeaderboard(poolId, tournament);
    if ((syncedScoreCount ?? 0) > 0) {
      return NextResponse.json({ ok: true, poolId, tournament, source: "synced", rows });
    }

    const apiKey = process.env.SLASH_GOLF_API_KEY || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: true, poolId, tournament, source: "synced", rows });
    }

    const tournamentId = await resolveSlashTournamentId(apiKey, tournament, year);
    if (!tournamentId) {
      return NextResponse.json({ ok: true, poolId, tournament, source: "synced", rows });
    }

    const [{ data: picks, error: picksError }, { data: handicaps, error: handicapsError }] =
      await Promise.all([
        supabaseAdmin.from("draft_picks").select("entrant_name, golfer").eq("pool_id", poolId),
        supabaseAdmin.from("golfers").select("golfer, handicap, rank").eq("pool_id", poolId),
      ]);

    if (picksError) throw new Error(picksError.message);
    if (handicapsError) throw new Error(handicapsError.message);

    const draftedBy = new Map<string, string[]>();
    for (const pick of picks ?? []) {
      const golfer = pick.golfer as string;
      const existing = draftedBy.get(golfer) ?? [];
      existing.push(pick.entrant_name as string);
      draftedBy.set(golfer, existing);
    }

    const handicapByGolfer = new Map(
      (handicaps ?? []).map((row) => [
        row.golfer as string,
        {
          handicap: Number(row.handicap ?? 0),
          rank: row.rank == null ? null : Number(row.rank),
        },
      ])
    );

    const live = await fetchSlashLeaderboard(apiKey, tournamentId, year);

    const liveRows = live.rows.map((row) => {
      const handicapMeta = handicapByGolfer.get(row.golfer) ?? { handicap: 0, rank: null };
      return {
        golfer: row.golfer,
        handicap: handicapMeta.handicap,
        rank: handicapMeta.rank,
        gross_total: row.total_strokes,
        live_total_to_par: row.total_to_par,
        live_current_round_score: row.current_round_score,
        live_thru: row.thru,
        position: row.position,
        position_text: row.position_text,
        drafted_by: draftedBy.get(row.golfer) ?? [],
        rounds: row.rounds.map((round) => ({
          round_number: round.round_number,
          strokes: round.strokes,
          score_status: round.score_status,
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      poolId,
      tournament,
      source: "slash-live",
      tournament_id: tournamentId,
      rows: liveRows,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to calculate tournament leaderboard.") },
      { status: 500 }
    );
  }
}
