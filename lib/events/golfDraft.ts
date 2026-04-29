import { supabaseAdmin } from "@/lib/supabase";
import { calculatePlayerLeaderboard } from "@/lib/scoring";
import { awardPointsFromScores } from "@/lib/scoring/awardPoints";
import type {
  BonusCandidate,
  EventRow,
  EventTypeHandler,
  FinishRanking,
} from "./types";

// Golf events keep their existing data in the legacy pool_id-keyed tables
// (draft_picks, tournament_round_scores, etc.). This handler bridges into
// the new events schema: it reads the legacy data via lib/scoring.ts and
// surfaces finishes + bonuses in the shared shape.

type GolfConfig = {
  tournament_slug?: string;
  round_par?: number;
};

function resolveLegacyKey(event: EventRow): { poolId: string; tournament: string } | null {
  if (!event.legacy_pool_id) return null;
  const config = (event.config ?? {}) as GolfConfig;
  const tournament = config.tournament_slug ?? event.slug.replace(/^\d+-/, "");
  return { poolId: event.legacy_pool_id, tournament };
}

/**
 * Builds a map of pool entrant_name -> canonical season_member entrant_id
 * by matching directly on display_name (case-insensitive trim).
 *
 * Person_key proved unreliable here: the season-level draft_entrant rows
 * (referenced by season_members.entrant_id) can have stale or wrong
 * person_key values, causing scrambled mappings. Display_name is the
 * authoritative human name on the season_members row and matches the
 * entrant_name used throughout the golf pool.
 */
async function buildCanonicalByName(
  seasonId: string,
): Promise<Map<string, string>> {
  const { data: seasonMembers } = await supabaseAdmin
    .from("season_members")
    .select("entrant_id, display_name")
    .eq("season_id", seasonId);

  const result = new Map<string, string>();
  for (const m of seasonMembers ?? []) {
    result.set((m.display_name as string).trim().toLowerCase(), m.entrant_id as string);
  }
  return result;
}

export const golfDraftHandler: EventTypeHandler = {
  kind: "golf-draft",
  label: "Golf — Draft 6, Score Best 4",

  validateEntry() {
    // Entries for golf events come through the existing draft flow, not
    // through /events/[slug]/entry. Nothing to validate here.
    return { ok: true };
  },

  async computeFinishes({ event }) {
    const legacy = resolveLegacyKey(event);
    if (!legacy) {
      throw new Error(
        `golf-draft event ${event.slug} has no legacy_pool_id; cannot compute finishes`,
      );
    }

    const rows = await calculatePlayerLeaderboard(legacy.poolId, legacy.tournament);

    const { data: poolEntrants, error } = await supabaseAdmin
      .from("draft_entrants")
      .select("entrant_id, entrant_name, person_key")
      .eq("pool_id", legacy.poolId);
    if (error) throw new Error(error.message);

    const byName = new Map<string, string>();
    for (const row of poolEntrants ?? []) {
      byName.set(row.entrant_name, row.entrant_id);
    }

    const canonicalByName = await buildCanonicalByName(event.season_id);

    const scores = rows
      .map((row) => {
        const poolEntrantId = byName.get(row.entrant_name);
        const canonicalId = canonicalByName.get(row.entrant_name.trim().toLowerCase()) ?? null;
        const entrantId = canonicalId ?? poolEntrantId;
        if (!entrantId) return null;
        return {
          entrant_id: entrantId,
          raw_score: row.team_total,
          tie_break_notes: row.tie_break_5_position !== null
            ? `5th-golfer pos ${row.tie_break_5_position}`
            : undefined,
        };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    const awarded = await awardPointsFromScores(scores, event.tier);
    const finishes: FinishRanking[] = awarded.map((a) => ({
      entrant_id: a.entrant_id,
      finish_rank: a.finish_rank,
      raw_score: a.raw_score,
      base_points: a.base_points,
      awarded_points: a.awarded_points,
      tie_break_notes: a.tie_break_notes,
    }));
    return finishes;
  },

  async emitBonuses({ event, finishes }) {
    const legacy = resolveLegacyKey(event);
    if (!legacy) return [];

    const { data: poolData } = await supabaseAdmin
      .from("draft_picks")
      .select("entrant_name, golfer")
      .eq("pool_id", legacy.poolId);

    const picksByEntrant = new Map<string, string[]>();
    for (const row of poolData ?? []) {
      const list = picksByEntrant.get(row.entrant_name) ?? [];
      list.push(row.golfer);
      picksByEntrant.set(row.entrant_name, list);
    }

    const { data: scoreRows } = await supabaseAdmin
      .from("tournament_round_scores")
      .select("golfer, strokes, score_status, position, position_text")
      .eq("pool_id", legacy.poolId)
      .eq("tournament_slug", legacy.tournament);

    const grossByGolfer = new Map<string, number>();
    const madeCutByGolfer = new Map<string, boolean>();
    const positionByGolfer = new Map<string, number | null>();
    for (const row of scoreRows ?? []) {
      const prev = grossByGolfer.get(row.golfer) ?? 0;
      grossByGolfer.set(row.golfer, prev + Number(row.strokes ?? 0));
      if ((row.score_status ?? "played") !== "played") {
        madeCutByGolfer.set(row.golfer, false);
      } else if (!madeCutByGolfer.has(row.golfer)) {
        madeCutByGolfer.set(row.golfer, true);
      }
      if (row.position !== null && !positionByGolfer.has(row.golfer)) {
        positionByGolfer.set(row.golfer, row.position);
      }
    }

    const { data: poolEntrants } = await supabaseAdmin
      .from("draft_entrants")
      .select("entrant_id, entrant_name, person_key")
      .eq("pool_id", legacy.poolId);

    const canonicalByName = await buildCanonicalByName(event.season_id);

    const entrantIdByName = new Map<string, string>();
    for (const row of poolEntrants ?? []) {
      const canonical = canonicalByName.get((row.entrant_name as string).trim().toLowerCase()) ?? null;
      entrantIdByName.set(row.entrant_name, canonical ?? row.entrant_id);
    }

    const candidates: BonusCandidate[] = [];

    // Survivor (+6): all 6 golfers made the cut; lowest combined gross total.
    let survivorWinner: { entrant_id: string; total: number } | null = null;
    for (const [name, golfers] of picksByEntrant.entries()) {
      const allMadeCut = golfers.every((g) => madeCutByGolfer.get(g) !== false);
      if (!allMadeCut) continue;
      const total = golfers.reduce((sum, g) => sum + (grossByGolfer.get(g) ?? 0), 0);
      const entrantId = entrantIdByName.get(name);
      if (!entrantId) continue;
      if (!survivorWinner || total < survivorWinner.total) {
        survivorWinner = { entrant_id: entrantId, total };
      }
    }
    if (survivorWinner) {
      candidates.push({
        entrant_id: survivorWinner.entrant_id,
        bonus_type: "survivor",
        points: 6,
        note: `Lowest 6-golfer gross total ${survivorWinner.total} (all made the cut)`,
      });
    }

    // Golden Ticket (+4): drafted the actual tournament champion.
    let champion: string | null = null;
    for (const [golfer, pos] of positionByGolfer.entries()) {
      if (pos === 1) {
        champion = golfer;
        break;
      }
    }
    if (champion) {
      for (const [name, golfers] of picksByEntrant.entries()) {
        if (!golfers.includes(champion)) continue;
        const entrantId = entrantIdByName.get(name);
        if (!entrantId) continue;
        candidates.push({
          entrant_id: entrantId,
          bonus_type: "golden_ticket",
          points: 4,
          note: `Drafted tournament champion ${champion}`,
        });
      }
    }

    void finishes;

    return candidates;
  },

  getEntryUI() {
    return "golf-draft-room";
  },

  getLeaderboardUI() {
    return "golf-draft";
  },
};
