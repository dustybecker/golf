import { NextResponse } from "next/server";
import { getAuthenticatedEntrant } from "@/lib/draftAuth";
import { getErrorMessage } from "@/lib/error";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  let body: { pool_id?: string; tournament_slug?: string; draft_open?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const poolId = body.pool_id?.trim();
  const tournamentSlug = body.tournament_slug?.trim();
  const draftOpen = body.draft_open;

  if (!poolId || !tournamentSlug || typeof draftOpen !== "boolean") {
    return NextResponse.json(
      { error: "pool_id, tournament_slug, and draft_open are required." },
      { status: 400 }
    );
  }

  try {
    const session = await getAuthenticatedEntrant(poolId);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated for this pool." }, { status: 401 });
    }
    if (!session.entrant.is_admin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { data: existingRows, error: loadError } = await supabaseAdmin
      .from("tournament_meta")
      .select("round_count, round_par")
      .eq("pool_id", poolId)
      .eq("tournament_slug", tournamentSlug)
      .limit(1);

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }

    const existing = (existingRows ?? [])[0] as
      | { round_count?: number | null; round_par?: number | null }
      | undefined;

    const { error } = await supabaseAdmin.from("tournament_meta").upsert(
      {
        pool_id: poolId,
        tournament_slug: tournamentSlug,
        round_count: existing?.round_count ?? 4,
        round_par: existing?.round_par ?? 72,
        draft_open: draftOpen,
      },
      { onConflict: "pool_id,tournament_slug" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      pool_id: poolId,
      tournament_slug: tournamentSlug,
      draft_open: draftOpen,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update draft state.") },
      { status: 500 }
    );
  }
}
