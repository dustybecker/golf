import { NextResponse } from "next/server";
import { calculatePlayerLeaderboard } from "@/lib/scoring";
import { getErrorMessage } from "@/lib/error";
import { fetchSlashLeaderboard, resolveSlashTournamentId } from "@/lib/slashGolf";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const rows = await calculatePlayerLeaderboard(poolId, tournament);
    if ((syncedScoreCount ?? 0) > 0) {
      return NextResponse.json(
        { ok: true, poolId, tournament, source: "synced", rows },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const apiKey = process.env.SLASH_GOLF_API_KEY || process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: true, poolId, tournament, source: "synced", rows },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const tournamentId = await resolveSlashTournamentId(apiKey, tournament, year);
    if (!tournamentId) {
      return NextResponse.json(
        { ok: true, poolId, tournament, source: "synced", rows },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    const [{ data: picks, error: picksError }, { data: handicaps, error: handicapsError }] =
      await Promise.all([
        supabaseAdmin
          .from("draft_picks")
          .select("entrant_name, golfer, pick_number")
          .eq("pool_id", poolId)
          .order("entrant_name", { ascending: true })
          .order("pick_number", { ascending: true }),
        supabaseAdmin.from("golfers").select("golfer, handicap, rank").eq("pool_id", poolId),
      ]);

    if (picksError) throw new Error(picksError.message);
    if (handicapsError) throw new Error(handicapsError.message);

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
    const liveByGolfer = new Map(
      live.rows.map((row) => [
        row.golfer,
        {
          gross_total: row.total_strokes,
          live_total_to_par: row.total_to_par,
          live_current_round_score: row.current_round_score,
          live_thru: row.thru,
          position: row.position,
          position_text: row.position_text,
          rounds: row.rounds.map((round) => ({
            round_number: round.round_number,
            strokes: round.strokes,
            score_status: round.score_status,
          })),
        },
      ])
    );

    const picksByEntrant = new Map<string, Array<{ golfer: string; pick_number: number }>>();
    for (const pick of picks ?? []) {
      const entrantName = pick.entrant_name as string;
      const existing = picksByEntrant.get(entrantName) ?? [];
      existing.push({
        golfer: pick.golfer as string,
        pick_number: Number(pick.pick_number ?? existing.length + 1),
      });
      picksByEntrant.set(entrantName, existing);
    }

    const liveRows = Array.from(picksByEntrant.entries()).map(([entrantName, golferRows]) => {
      const scorecards = golferRows
        .map(({ golfer }) => {
          const handicapMeta = handicapByGolfer.get(golfer) ?? { handicap: 0, rank: null };
          const liveScore = liveByGolfer.get(golfer);
          const grossToPar = liveScore?.live_total_to_par ?? null;
          const netToPar =
            typeof grossToPar === "number" ? grossToPar - handicapMeta.handicap : null;

          return {
            golfer,
            handicap: handicapMeta.handicap,
            rank: handicapMeta.rank,
            gross_total: liveScore?.gross_total ?? null,
            net_total: null,
            live_total_to_par: grossToPar,
            live_net_to_par: netToPar,
            live_current_round_score: liveScore?.live_current_round_score ?? null,
            live_thru: liveScore?.live_thru ?? null,
            position: liveScore?.position ?? null,
            position_text: liveScore?.position_text ?? null,
            rounds: liveScore?.rounds ?? [],
          };
        })
        .sort((a, b) => {
          const aNet = a.live_net_to_par ?? 9999;
          const bNet = b.live_net_to_par ?? 9999;
          if (aNet !== bNet) return aNet - bNet;
          const aPos = a.position ?? 9999;
          const bPos = b.position ?? 9999;
          if (aPos !== bPos) return aPos - bPos;
          return a.golfer.localeCompare(b.golfer);
        });

      const scoringGolfers = scorecards.slice(0, 4);
      const benchGolfers = scorecards.slice(4);
      const teamTotal = scoringGolfers.reduce(
        (sum, golfer) => sum + (golfer.live_net_to_par ?? 0),
        0
      );

      return {
        entrant_name: entrantName,
        team_total: teamTotal,
        scoring_golfers: scoringGolfers,
        bench_golfers: benchGolfers,
        tie_break_5_position: benchGolfers[0]?.position ?? null,
        tie_break_6_position: benchGolfers[1]?.position ?? null,
      };
    });

    liveRows.sort((a, b) => {
      if (a.team_total !== b.team_total) return a.team_total - b.team_total;
      const a5 = a.tie_break_5_position ?? 9999;
      const b5 = b.tie_break_5_position ?? 9999;
      if (a5 !== b5) return a5 - b5;
      const a6 = a.tie_break_6_position ?? 9999;
      const b6 = b.tie_break_6_position ?? 9999;
      return a6 - b6;
    });

    return NextResponse.json(
      {
        ok: true,
        poolId,
        tournament,
        source: "slash-live",
        tournament_id: tournamentId,
        rows: liveRows,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to calculate player leaderboard.") },
      { status: 500 }
    );
  }
}
