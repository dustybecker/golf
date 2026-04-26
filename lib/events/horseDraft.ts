import { awardPointsFromScores } from "@/lib/scoring/awardPoints";
import {
  DERBY_CAP,
  DERBY_HORSES,
  DERBY_STABLE_SIZE,
  HORSE_BY_ID,
} from "./derbyHorses";
import type {
  BonusCandidate,
  EntryValidation,
  EventEntry,
  EventTypeHandler,
  FinishRanking,
} from "./types";

export type DerbyEntryPayload = {
  horses: string[]; // exactly DERBY_STABLE_SIZE horse IDs
};

// Admin stores race results in event.config.results before finalizing.
// e.g. { "renegade": 1, "further-ado": 4, "silent-tactic": 12 }
type DerbyConfig = {
  results?: Record<string, number>; // horseId -> finish position (1-indexed)
};

// Points earned by a horse based on its finish position in the race.
const RACE_POINTS: Record<number, number> = {
  1: 20,
  2: 15,
  3: 10,
  4: 7,
  5: 5,
  6: 3,
  7: 2,
  8: 1,
};

function horsePoints(position: number, longshot: boolean): number {
  const base = RACE_POINTS[position] ?? 0;
  return longshot && position <= 3 ? base * 2 : base;
}

export const horseDraftHandler: EventTypeHandler<DerbyEntryPayload> = {
  kind: "horse-draft",
  label: "Kentucky Derby — Salary Cap",

  validateEntry(payload): EntryValidation {
    if (!payload || !Array.isArray(payload.horses)) {
      return { ok: false, reason: "horses array required" };
    }
    if (payload.horses.length !== DERBY_STABLE_SIZE) {
      return { ok: false, reason: `pick exactly ${DERBY_STABLE_SIZE} horses` };
    }
    if (new Set(payload.horses).size !== DERBY_STABLE_SIZE) {
      return { ok: false, reason: "duplicate horse selections not allowed" };
    }
    let total = 0;
    for (const id of payload.horses) {
      const horse = HORSE_BY_ID.get(id);
      if (!horse) return { ok: false, reason: `unknown horse: ${id}` };
      total += horse.price;
    }
    if (total > DERBY_CAP) {
      return { ok: false, reason: `stable cost $${total} exceeds $${DERBY_CAP} cap` };
    }
    return { ok: true };
  },

  async computeFinishes({ event, entries }) {
    const config = (event.config ?? {}) as DerbyConfig;
    const results = config.results ?? {};

    const scored = entries.map((entry: EventEntry<DerbyEntryPayload>) => {
      let raw = 0;
      for (const horseId of entry.payload.horses) {
        const horse = HORSE_BY_ID.get(horseId);
        if (!horse) continue;
        const pos = results[horseId];
        if (pos !== undefined) {
          raw += horsePoints(pos, horse.longshot);
        }
      }
      return { entrant_id: entry.entrant_id, raw_score: raw };
    });

    const awarded = await awardPointsFromScores(scored, event.tier, { invert: true });
    return awarded.map((a): FinishRanking => ({
      entrant_id: a.entrant_id,
      finish_rank: a.finish_rank,
      raw_score: Math.round(a.raw_score),
      base_points: a.base_points,
      awarded_points: a.awarded_points,
    }));
  },

  async emitBonuses({ event, entries }): Promise<BonusCandidate[]> {
    const config = (event.config ?? {}) as DerbyConfig;
    const results = config.results ?? {};
    const bonuses: BonusCandidate[] = [];

    for (const entry of entries) {
      for (const horseId of (entry as EventEntry<DerbyEntryPayload>).payload.horses) {
        const horse = HORSE_BY_ID.get(horseId);
        if (!horse?.longshot) continue;
        const pos = results[horseId];
        if (pos !== undefined && pos <= 3) {
          bonuses.push({
            entrant_id: entry.entrant_id,
            bonus_type: "derby_longshot",
            points: 5,
            note: `${horse.name} (${horse.odds}) finished #${pos}`,
          });
          break;
        }
      }
    }
    return bonuses;
  },

  getEntryUI() {
    return "horse-draft";
  },

  getLeaderboardUI() {
    return "placeholder";
  },
};

export { DERBY_HORSES, DERBY_CAP, DERBY_STABLE_SIZE };
