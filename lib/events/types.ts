import type { Tier } from "@/lib/scoring/rules";

export type EventStatus =
  | "scheduled"
  | "open-entry"
  | "locked"
  | "live"
  | "final"
  | "cancelled";

export type EventRow = {
  event_id: string;
  season_id: string;
  slug: string;
  name: string;
  event_type: string;
  tier: Tier;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  lock_at: string | null;
  legacy_pool_id: string | null;
  group_key: string | null;
  config: Record<string, unknown>;
};

export type EntryValidation = { ok: true } | { ok: false; reason: string };

export type FinishRanking = {
  entrant_id: string;
  finish_rank: number;
  raw_score: number;
  base_points: number;
  awarded_points: number;
  tie_break_notes?: string;
};

export type BonusCandidate = {
  entrant_id: string;
  bonus_type:
    | "hot_seat"
    | "survivor"
    | "golden_ticket"
    | "nine_darter"
    | "perfect_week"
    | "oracle"
    | "derby_longshot"
    | "wm_mark";
  points: number;
  note?: string;
};

export type EventEntry<TPayload = unknown> = {
  entrant_id: string;
  payload: TPayload;
};

export type EntryUIKey =
  | "golf-draft-room"
  | "bracket-nba"
  | "bracket-generic"
  | "prop-sheet"
  | "driver-draft"
  | "horse-draft"
  | "pickem-ats"
  | "darts-draft"
  | "tennis-draft"
  | "series-props"
  | "roster-draft"
  | "placeholder";

export type LeaderboardUIKey =
  | "golf-draft"
  | "bracket-nba"
  | "bracket-generic"
  | "prop-sheet"
  | "pickem-ats"
  | "series-props"
  | "placeholder";

export interface EventTypeHandler<TPayload = unknown> {
  kind: string;
  label: string;

  validateEntry(payload: TPayload, event: EventRow): EntryValidation;

  computeFinishes(args: {
    event: EventRow;
    entries: Array<EventEntry<TPayload>>;
  }): Promise<FinishRanking[]>;

  emitBonuses?(args: {
    event: EventRow;
    entries: Array<EventEntry<TPayload>>;
    finishes: FinishRanking[];
  }): Promise<BonusCandidate[]>;

  getEntryUI(event: EventRow): EntryUIKey;
  getLeaderboardUI(event: EventRow): LeaderboardUIKey;
}
