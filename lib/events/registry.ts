import { golfDraftHandler } from "./golfDraft";
import { bracketNbaHandler } from "./bracketNba";
import { horseDraftHandler } from "./horseDraft";
import type { EventTypeHandler, EventRow } from "./types";

function notImplemented(kind: string): EventTypeHandler {
  const label = kind
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    kind,
    label,
    validateEntry() {
      return { ok: false, reason: `${kind} entry not yet implemented` };
    },
    async computeFinishes() {
      return [];
    },
    getEntryUI() {
      return "placeholder";
    },
    getLeaderboardUI() {
      return "placeholder";
    },
  } satisfies EventTypeHandler;
}

export const EVENT_HANDLERS: Record<string, EventTypeHandler> = {
  "golf-draft": golfDraftHandler,
  "bracket-nba": bracketNbaHandler as EventTypeHandler,
  "horse-draft": horseDraftHandler as EventTypeHandler,

  // Stubs registered so events with these types render a "coming soon" shell
  // instead of crashing. Each becomes a follow-up PR.
  "prop-sheet": notImplemented("prop-sheet"),
  "driver-draft": notImplemented("driver-draft"),
  "darts-draft": notImplemented("darts-draft"),
  "tennis-draft": notImplemented("tennis-draft"),
  "bracket-march-madness": notImplemented("bracket-march-madness"),
  "bracket-world-cup": notImplemented("bracket-world-cup"),
  "bracket-nhl": notImplemented("bracket-nhl"),
  "bracket-mlb": notImplemented("bracket-mlb"),
  "series-props": notImplemented("series-props"),
  "pickem-ats": notImplemented("pickem-ats"),
  "roster-draft": notImplemented("roster-draft"),
  "golf-team-draft": notImplemented("golf-team-draft"),
};

export function getEventHandler(event: EventRow): EventTypeHandler {
  return EVENT_HANDLERS[event.event_type] ?? notImplemented(event.event_type);
}
