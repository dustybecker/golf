import { loadScoringRules, type Tier } from "./rules";

export type EntrantScore = {
  entrant_id: string;
  raw_score: number;
  tie_break_notes?: string;
};

export type FinishWithPoints = {
  entrant_id: string;
  raw_score: number;
  finish_rank: number;
  base_points: number;
  awarded_points: number;
  tie_break_notes?: string;
};

// Scores are expected "golf-style" by default: lower is better. Events where
// higher is better (bracket points, pick'em wins) pass invert=true.
export async function awardPointsFromScores(
  scores: EntrantScore[],
  tier: Tier,
  opts: { invert?: boolean } = {},
): Promise<FinishWithPoints[]> {
  const rules = await loadScoringRules();
  const multiplier = rules.tierMultiplier[tier] ?? 1;

  const sorted = [...scores].sort((a, b) => {
    return opts.invert ? b.raw_score - a.raw_score : a.raw_score - b.raw_score;
  });

  // Group tied entrants by raw_score.
  const groups: EntrantScore[][] = [];
  for (const row of sorted) {
    const last = groups[groups.length - 1];
    if (last && last[0].raw_score === row.raw_score) {
      last.push(row);
    } else {
      groups.push([row]);
    }
  }

  const out: FinishWithPoints[] = [];
  let slot = 1;
  for (const group of groups) {
    const slots: number[] = [];
    for (let i = 0; i < group.length; i += 1) slots.push(slot + i);
    const basePointsForSlots = slots.map((s) => rules.finishPoints[s] ?? 0);
    const averageBase =
      basePointsForSlots.reduce((sum, v) => sum + v, 0) / group.length;
    const averageRank = slots.reduce((sum, v) => sum + v, 0) / group.length;

    for (const row of group) {
      out.push({
        entrant_id: row.entrant_id,
        raw_score: row.raw_score,
        finish_rank: averageRank,
        base_points: averageBase,
        awarded_points: averageBase * multiplier,
        tie_break_notes: row.tie_break_notes,
      });
    }

    slot += group.length;
  }

  return out;
}
