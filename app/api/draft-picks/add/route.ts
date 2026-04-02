import { NextResponse } from "next/server";
import { getAuthenticatedEntrant } from "@/lib/draftAuth";
import { getDraftOpenState } from "@/lib/draftState";
import { getErrorMessage } from "@/lib/error";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_PICKS_PER_ENTRANT = 6;

export async function POST(req: Request) {
  let body: { pool_id?: string; golfer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const poolId = body.pool_id?.trim();
  const golfer = body.golfer?.trim();

  if (!poolId || !golfer) {
    return NextResponse.json({ error: "pool_id and golfer are required." }, { status: 400 });
  }

  try {
    const session = await getAuthenticatedEntrant(poolId);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated for this pool." }, { status: 401 });
    }

    const draftOpen = await getDraftOpenState(poolId);
    if (!draftOpen) {
      return NextResponse.json({ error: "Draft is currently locked." }, { status: 423 });
    }

    const { data: validGolfer, error: golferError } = await supabaseAdmin
      .from("golfers")
      .select("golfer")
      .eq("pool_id", poolId)
      .eq("golfer", golfer)
      .maybeSingle<{ golfer: string }>();

    if (golferError) {
      return NextResponse.json({ error: golferError.message }, { status: 500 });
    }
    if (!validGolfer) {
      return NextResponse.json({ error: "Golfer is not in this pool." }, { status: 400 });
    }

    const { data: existingPicks, error: picksError } = await supabaseAdmin
      .from("draft_picks")
      .select("pick_number")
      .eq("pool_id", poolId)
      .eq("entrant_id", session.entrant.entrant_id)
      .order("pick_number", { ascending: true });

    if (picksError) {
      return NextResponse.json({ error: picksError.message }, { status: 500 });
    }

    if ((existingPicks ?? []).length >= MAX_PICKS_PER_ENTRANT) {
      return NextResponse.json(
        { error: `You already have ${MAX_PICKS_PER_ENTRANT} picks.` },
        { status: 400 }
      );
    }

    const nextPickNumber = (existingPicks?.length ?? 0) + 1;

    const { error: insertError } = await supabaseAdmin.from("draft_picks").insert({
      pool_id: poolId,
      entrant_id: session.entrant.entrant_id,
      entrant_name: session.entrant.entrant_name,
      golfer,
      pick_number: nextPickNumber,
    });

    if (insertError) {
      const duplicateGolfer = insertError.message.toLowerCase().includes("pool_id, golfer");
      if (duplicateGolfer) {
        return NextResponse.json({ error: "That golfer has already been drafted." }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      poolId,
      entrant: session.entrant.entrant_name,
      golfer,
      pick_number: nextPickNumber,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to add draft pick.") },
      { status: 500 }
    );
  }
}
