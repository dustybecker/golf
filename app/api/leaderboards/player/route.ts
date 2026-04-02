import { NextResponse } from "next/server";
import { calculatePlayerLeaderboard } from "@/lib/scoring";
import { getErrorMessage } from "@/lib/error";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const poolId =
    url.searchParams.get("pool_id") ||
    process.env.POOL_ID ||
    process.env.NEXT_PUBLIC_POOL_ID ||
    "2026-majors-masters";
  const tournament = (url.searchParams.get("tournament") || "masters").trim();

  if (!tournament) {
    return NextResponse.json({ error: "tournament is required." }, { status: 400 });
  }

  try {
    const rows = await calculatePlayerLeaderboard(poolId, tournament);
    return NextResponse.json({ ok: true, poolId, tournament, rows });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to calculate player leaderboard.") },
      { status: 500 }
    );
  }
}
