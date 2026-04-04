import { supabaseAdmin } from "@/lib/supabase";

export const PICKS_PER_ENTRANT = 6;
export const EXPECTED_ENTRANT_COUNT = 9;
export const TURN_DURATION_SECONDS = 60 * 60 * 2;

export type DraftEntrantOrderRow = {
  entrant_id: string;
  entrant_name: string;
  draft_position: number | null;
  auto_draft_enabled?: boolean | null;
};

type DraftStateRecord = {
  draft_started: boolean | null;
  current_pick: number | null;
  current_round: number | null;
  current_entrant_id: string | null;
  turn_started_at?: string | null;
  turn_expires_at?: string | null;
};

export type DraftStateSummary = {
  entrant_count: number;
  total_picks: number;
  max_picks: number;
  current_pick: number | null;
  current_round: number | null;
  current_entrant_id: string | null;
  current_entrant_name: string | null;
  is_complete: boolean;
  draft_started: boolean;
  turn_started_at: string | null;
  turn_expires_at: string | null;
};

export function snakeDraftPosition(currentPick: number, entrantCount: number) {
  const round = Math.floor((currentPick - 1) / entrantCount) + 1;
  const pickInRound = ((currentPick - 1) % entrantCount) + 1;
  const draftPosition = round % 2 === 1 ? pickInRound : entrantCount - pickInRound + 1;

  return {
    round,
    pickInRound,
    draftPosition,
  };
}

export async function loadOrderedEntrants(poolId: string) {
  const { data, error } = await supabaseAdmin
    .from("draft_entrants")
    .select("entrant_id, entrant_name, draft_position, auto_draft_enabled")
    .eq("pool_id", poolId)
    .order("draft_position", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return ((data ?? []) as DraftEntrantOrderRow[]).filter(
    (entrant) => entrant.draft_position !== null
  );
}

export async function countDraftPicks(poolId: string) {
  const { count, error } = await supabaseAdmin
    .from("draft_picks")
    .select("*", { count: "exact", head: true })
    .eq("pool_id", poolId);

  if (error) throw error;
  return count ?? 0;
}

async function loadDraftStateRecord(poolId: string) {
  const { data, error } = await supabaseAdmin
    .from("draft_state")
    .select("draft_started, current_pick, current_round, current_entrant_id, turn_started_at, turn_expires_at")
    .eq("pool_id", poolId)
    .limit(1);

  if (error) throw error;

  return ((data ?? []) as DraftStateRecord[])[0] ?? null;
}

async function upsertDraftState(
  poolId: string,
  values: {
    draft_started: boolean;
    current_pick: number;
    current_round: number;
    current_entrant_id: string | null;
    turn_started_at: string | null;
    turn_expires_at: string | null;
  }
) {
  const { error } = await supabaseAdmin.from("draft_state").upsert(
    {
      pool_id: poolId,
      ...values,
    },
    { onConflict: "pool_id" }
  );

  if (error) throw error;
}

async function getHighestAvailableGolfer(poolId: string) {
  const [{ data: golfers, error: golfersError }, { data: picks, error: picksError }] =
    await Promise.all([
      supabaseAdmin
        .from("golfers")
        .select("golfer, rank")
        .eq("pool_id", poolId)
        .order("rank", { ascending: true }),
      supabaseAdmin.from("draft_picks").select("golfer").eq("pool_id", poolId),
    ]);

  if (golfersError) throw golfersError;
  if (picksError) throw picksError;

  const picked = new Set((picks ?? []).map((row) => row.golfer as string));
  const available = (golfers ?? []).find((row) => !picked.has(row.golfer as string));
  return available?.golfer as string | undefined;
}

async function countEntrantPicks(poolId: string, entrantId: string) {
  const { count, error } = await supabaseAdmin
    .from("draft_picks")
    .select("*", { count: "exact", head: true })
    .eq("pool_id", poolId)
    .eq("entrant_id", entrantId);

  if (error) throw error;
  return count ?? 0;
}

async function insertAutoPick(poolId: string, entrant: DraftEntrantOrderRow, golfer: string) {
  const existingPickCount = await countEntrantPicks(poolId, entrant.entrant_id);
  const { error } = await supabaseAdmin.from("draft_picks").insert({
    pool_id: poolId,
    entrant_id: entrant.entrant_id,
    entrant_name: entrant.entrant_name,
    golfer,
    pick_number: existingPickCount + 1,
  });

  if (error) throw error;
}

async function setEntrantAutoDraftEnabled(poolId: string, entrantId: string, enabled: boolean) {
  const { error } = await supabaseAdmin
    .from("draft_entrants")
    .update({ auto_draft_enabled: enabled })
    .eq("pool_id", poolId)
    .eq("entrant_id", entrantId);

  if (error) throw error;
}

async function lockDraftForPool(poolId: string) {
  const { error } = await supabaseAdmin
    .from("tournament_meta")
    .update({ draft_open: false })
    .eq("pool_id", poolId);

  if (error) throw error;
}

function buildSummaryFromState(
  entrants: DraftEntrantOrderRow[],
  totalPicks: number,
  draftStarted: boolean,
  currentPick: number,
  turnStartedAt: string | null,
  turnExpiresAt: string | null
): DraftStateSummary {
  const entrantCount = entrants.length;
  const maxPicks = entrantCount * PICKS_PER_ENTRANT;

  if (entrantCount === 0) {
    return {
      entrant_count: 0,
      total_picks: totalPicks,
      max_picks: 0,
      current_pick: null,
      current_round: null,
      current_entrant_id: null,
      current_entrant_name: null,
      is_complete: false,
      draft_started: false,
      turn_started_at: null,
      turn_expires_at: null,
    };
  }

  if (currentPick > maxPicks) {
    return {
      entrant_count: entrantCount,
      total_picks: totalPicks,
      max_picks: maxPicks,
      current_pick: null,
      current_round: PICKS_PER_ENTRANT,
      current_entrant_id: null,
      current_entrant_name: null,
      is_complete: true,
      draft_started: draftStarted,
      turn_started_at: null,
      turn_expires_at: null,
    };
  }

  const position = snakeDraftPosition(currentPick, entrantCount);
  const currentEntrant =
    entrants.find((entrant) => entrant.draft_position === position.draftPosition) ?? null;

  return {
    entrant_count: entrantCount,
    total_picks: totalPicks,
    max_picks: maxPicks,
    current_pick: currentPick,
    current_round: position.round,
    current_entrant_id: currentEntrant?.entrant_id ?? null,
    current_entrant_name: currentEntrant?.entrant_name ?? null,
    is_complete: false,
    draft_started: draftStarted,
    turn_started_at: turnStartedAt,
    turn_expires_at: turnExpiresAt,
  };
}

export async function buildDraftState(poolId: string): Promise<DraftStateSummary> {
  const [entrants, totalPicks, state] = await Promise.all([
    loadOrderedEntrants(poolId),
    countDraftPicks(poolId),
    loadDraftStateRecord(poolId),
  ]);

  const currentPick = state?.draft_started ? state.current_pick ?? 1 : totalPicks + 1;
  return buildSummaryFromState(
    entrants,
    totalPicks,
    state?.draft_started ?? false,
    currentPick,
    state?.turn_started_at ?? null,
    state?.turn_expires_at ?? null
  );
}

export async function syncDraftState(poolId: string, draftStarted: boolean) {
  const entrants = await loadOrderedEntrants(poolId);
  const totalPicks = await countDraftPicks(poolId);
  const maxPicks = entrants.length * PICKS_PER_ENTRANT;
  const currentPick = draftStarted ? Math.min(totalPicks + 1, maxPicks + 1) : 1;
  const summary = buildSummaryFromState(entrants, totalPicks, draftStarted, currentPick, null, null);

  await upsertDraftState(poolId, {
    draft_started: draftStarted,
    current_pick: summary.current_pick ?? 1,
    current_round: summary.current_round ?? 1,
    current_entrant_id: summary.current_entrant_id,
    turn_started_at: draftStarted && !summary.is_complete ? new Date().toISOString() : null,
    turn_expires_at:
      draftStarted && !summary.is_complete
        ? new Date(Date.now() + TURN_DURATION_SECONDS * 1000).toISOString()
        : null,
  });

  return {
    ...summary,
    turn_started_at: draftStarted && !summary.is_complete ? new Date().toISOString() : null,
    turn_expires_at:
      draftStarted && !summary.is_complete
        ? new Date(Date.now() + TURN_DURATION_SECONDS * 1000).toISOString()
        : null,
  };
}

export async function advanceDraftState(poolId: string): Promise<DraftStateSummary> {
  const entrants = await loadOrderedEntrants(poolId);
  const entrantCount = entrants.length;
  const maxPicks = entrantCount * PICKS_PER_ENTRANT;
  const state = await loadDraftStateRecord(poolId);
  const totalPicks = await countDraftPicks(poolId);

  if (!state?.draft_started) {
    return buildSummaryFromState(entrants, totalPicks, false, totalPicks + 1, null, null);
  }

  let currentPick = state.current_pick ?? 1;
  let turnStartedAt = state.turn_started_at ?? null;
  let turnExpiresAt = state.turn_expires_at ?? null;

  // If a real pick has already been recorded for the current slot, advance the
  // pointer before evaluating the next on-clock entrant. This preserves skipped
  // turns because skipped slots push currentPick ahead of totalPicks.
  if (totalPicks >= currentPick) {
    currentPick = totalPicks + 1;
    turnStartedAt = null;
    turnExpiresAt = null;
  }

  while (currentPick <= maxPicks) {
    const summary = buildSummaryFromState(
      entrants,
      await countDraftPicks(poolId),
      true,
      currentPick,
      turnStartedAt,
      turnExpiresAt
    );

    if (summary.is_complete || !summary.current_entrant_id) {
      break;
    }

    const currentEntrant =
      entrants.find((entrant) => entrant.entrant_id === summary.current_entrant_id) ?? null;
    if (!currentEntrant) break;

    if (currentEntrant.auto_draft_enabled) {
      const golfer = await getHighestAvailableGolfer(poolId);
      if (golfer) {
        await insertAutoPick(poolId, currentEntrant, golfer);
      }
      currentPick += 1;
      turnStartedAt = null;
      turnExpiresAt = null;
      continue;
    }

    const expiresAtMs = turnExpiresAt ? Date.parse(turnExpiresAt) : NaN;
    if (turnExpiresAt && Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      await setEntrantAutoDraftEnabled(poolId, currentEntrant.entrant_id, true);
      turnStartedAt = null;
      turnExpiresAt = null;
      continue;
    }

    if (!turnExpiresAt || state.current_entrant_id !== currentEntrant.entrant_id) {
      turnStartedAt = new Date().toISOString();
      turnExpiresAt = new Date(Date.now() + TURN_DURATION_SECONDS * 1000).toISOString();
    }

    const liveSummary = buildSummaryFromState(
      entrants,
      await countDraftPicks(poolId),
      true,
      currentPick,
      turnStartedAt,
      turnExpiresAt
    );

    await upsertDraftState(poolId, {
      draft_started: true,
      current_pick: liveSummary.current_pick ?? 1,
      current_round: liveSummary.current_round ?? 1,
      current_entrant_id: liveSummary.current_entrant_id,
      turn_started_at: turnStartedAt,
      turn_expires_at: turnExpiresAt,
    });

    return liveSummary;
  }

  const finalSummary = buildSummaryFromState(
    entrants,
    await countDraftPicks(poolId),
    true,
    maxPicks + 1,
    null,
    null
  );

  await upsertDraftState(poolId, {
    draft_started: true,
    current_pick: maxPicks + 1,
    current_round: PICKS_PER_ENTRANT,
    current_entrant_id: null,
    turn_started_at: null,
    turn_expires_at: null,
  });

  await lockDraftForPool(poolId);

  return finalSummary;
}
