"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/lib/error";
import { formatLastUpdated, useAutoRefreshValue } from "@/lib/useAutoRefresh";

type Golfer = {
  id: string;
  rank: number;
  golfer: string;
  handicap: number;
};

type DraftPickRow = {
  entrant_name: string;
  golfer: string;
  pick_number: number;
};

type TournamentOption = {
  slug: "masters" | "pga-championship" | "us-open" | "the-open";
  label: string;
};

type Entrant = {
  entrant_id: string;
  entrant_name: string;
  entrant_slug: string;
  draft_position: number | null;
  is_admin: boolean;
  auto_draft_enabled?: boolean;
};

type TournamentMetaRow = {
  tournament_slug: string;
  label: string;
  draft_open?: boolean;
};

type DraftStateRow = {
  draft_open: boolean;
  draft_started: boolean;
  current_pick: number | null;
  current_round: number | null;
  current_entrant_id: string | null;
  current_entrant_name: string | null;
  entrant_count: number;
  expected_entrant_count: number;
  total_picks: number;
  max_picks: number;
  is_complete: boolean;
  turn_started_at: string | null;
  turn_expires_at: string | null;
};

const TOURNAMENTS: TournamentOption[] = [
  { slug: "masters", label: "The Masters" },
  { slug: "pga-championship", label: "PGA Championship" },
  { slug: "us-open", label: "U.S. Open" },
  { slug: "the-open", label: "The Open Championship" },
];

const FALLBACK_GOLFERS: Golfer[] = [
  { id: "Scottie Scheffler", rank: 1, golfer: "Scottie Scheffler", handicap: 2.1 },
  { id: "Rory McIlroy", rank: 2, golfer: "Rory McIlroy", handicap: 2.3 },
  { id: "Jon Rahm", rank: 3, golfer: "Jon Rahm", handicap: 3.0 },
  { id: "Xander Schauffele", rank: 4, golfer: "Xander Schauffele", handicap: 3.4 },
  { id: "Ludvig Aberg", rank: 5, golfer: "Ludvig Aberg", handicap: 4.2 },
  { id: "Collin Morikawa", rank: 6, golfer: "Collin Morikawa", handicap: 4.7 },
];

const MAX_PICKS_PER_ENTRANT = 6;

function createInitialPicks(entrantNames: string[]) {
  const result: Record<string, string[]> = {};
  for (const entrant of entrantNames) {
    result[entrant] = [];
  }
  return result;
}

function normalizePicks(rows: DraftPickRow[], entrantNames: string[]) {
  const base = createInitialPicks(entrantNames);
  for (const row of rows) {
    if (!base[row.entrant_name]) base[row.entrant_name] = [];
    base[row.entrant_name].push(row.golfer);
  }
  return base;
}

function DraftPageContent() {
  const searchParams = useSearchParams();
  const basePoolId = process.env.NEXT_PUBLIC_POOL_ID || "2026-majors";
  const [selectedTournament, setSelectedTournament] = useState<TournamentOption["slug"]>("masters");
  const [query, setQuery] = useState("");
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftState, setDraftState] = useState<DraftStateRow | null>(null);
  const refreshTick = useAutoRefreshValue(30000, draftOpen);
  const [clockTick, setClockTick] = useState(0);

  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [entrantsLoading, setEntrantsLoading] = useState(true);
  const [entrantsError, setEntrantsError] = useState<string | null>(null);

  const [sessionEntrant, setSessionEntrant] = useState<Entrant | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [togglingAutoDraft, setTogglingAutoDraft] = useState(false);

  const [golfers, setGolfers] = useState<Golfer[]>(FALLBACK_GOLFERS);
  const [loadingGolfers, setLoadingGolfers] = useState(true);
  const [golfersError, setGolfersError] = useState<string | null>(null);

  const [picksByEntrant, setPicksByEntrant] = useState<Record<string, string[]>>({});
  const [loadingPicks, setLoadingPicks] = useState(true);
  const [savingPicks, setSavingPicks] = useState(false);
  const [picksError, setPicksError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const poolId = `${basePoolId}-${selectedTournament}`;
  const entrantNames = useMemo(() => entrants.map((entrant) => entrant.entrant_name), [entrants]);

  useEffect(() => {
    const tournamentParam = searchParams.get("tournament");
    if (
      tournamentParam &&
      TOURNAMENTS.some((option) => option.slug === tournamentParam)
    ) {
      setSelectedTournament(tournamentParam as TournamentOption["slug"]);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!draftOpen) return;
    const intervalId = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [draftOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadDraftState() {
      try {
        const [metaRes, stateRes] = await Promise.all([
          fetch(`/api/tournament-meta?pool_id=${encodeURIComponent(poolId)}`),
          fetch(`/api/draft-state?pool_id=${encodeURIComponent(poolId)}`),
        ]);
        const [metaJson, stateJson] = await Promise.all([metaRes.json(), stateRes.json()]);
        if (!metaRes.ok) throw new Error(metaJson?.error ?? "Failed to load draft state");
        if (!stateRes.ok) throw new Error(stateJson?.error ?? "Failed to load draft pointer");
        const rows = (metaJson.rows ?? []) as TournamentMetaRow[];
        if (!cancelled) {
          setDraftOpen(
            rows.find((row) => row.tournament_slug === selectedTournament)?.draft_open ?? false
          );
          setDraftState((stateJson ?? null) as DraftStateRow | null);
        }
      } catch {
        if (!cancelled) {
          setDraftOpen(false);
          setDraftState(null);
        }
      }
    }

    void loadDraftState();
    return () => {
      cancelled = true;
    };
  }, [poolId, selectedTournament]);

  useEffect(() => {
    let cancelled = false;

    async function loadEntrants() {
      setEntrantsLoading(true);
      setEntrantsError(null);
      try {
        const res = await fetch(`/api/entrants?pool_id=${encodeURIComponent(poolId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load entrants");
        if (!cancelled) setEntrants((json.entrants ?? []) as Entrant[]);
      } catch (e: unknown) {
        if (!cancelled) {
          setEntrants([]);
          setEntrantsError(getErrorMessage(e, "Failed to load entrants"));
        }
      } finally {
        if (!cancelled) setEntrantsLoading(false);
      }
    }

    async function loadSession() {
      setAuthError(null);
      try {
        const res = await fetch(`/api/auth/me?pool_id=${encodeURIComponent(poolId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load session");
        if (!cancelled) setSessionEntrant((json.entrant ?? null) as Entrant | null);
      } catch (e: unknown) {
        if (!cancelled) {
          setSessionEntrant(null);
          setAuthError(getErrorMessage(e, "Failed to load entrant session"));
        }
      }
    }

    async function loadGolfers() {
      setLoadingGolfers(true);
      setGolfersError(null);
      try {
        const res = await fetch(`/api/golfers?pool_id=${encodeURIComponent(poolId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load golfers");
        const loaded = (json.golfers ?? []) as Golfer[];
        if (!cancelled) setGolfers(loaded.length > 0 ? loaded : FALLBACK_GOLFERS);
      } catch (e: unknown) {
        if (!cancelled) {
          setGolfers(FALLBACK_GOLFERS);
          setGolfersError(getErrorMessage(e, "Failed to load golfers"));
        }
      } finally {
        if (!cancelled) setLoadingGolfers(false);
      }
    }

    void loadEntrants();
    void loadSession();
    void loadGolfers();

    return () => {
      cancelled = true;
    };
  }, [poolId, refreshTick]);

  useEffect(() => {
    let cancelled = false;

    async function loadPicks() {
      setLoadingPicks(true);
      setPicksError(null);
      try {
        const res = await fetch(`/api/draft-picks?pool_id=${encodeURIComponent(poolId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load draft picks");

        const rows = (json.rows ?? []) as DraftPickRow[];
        const rowEntrants = Array.from(new Set(rows.map((row) => row.entrant_name)));
        const names = entrantNames.length > 0 ? entrantNames : rowEntrants;

        if (!cancelled) {
          setPicksByEntrant(normalizePicks(rows, names));
          setLastUpdated(new Date());
        }
      } catch (e: unknown) {
        if (!cancelled) setPicksError(getErrorMessage(e, "Failed to load draft picks"));
      } finally {
        if (!cancelled) setLoadingPicks(false);
      }
    }

    void loadPicks();
    return () => {
      cancelled = true;
    };
  }, [poolId, entrantNames, refreshTick]);

  const pickedGolferIds = useMemo(() => {
    const picked = new Set<string>();
    for (const picks of Object.values(picksByEntrant)) {
      for (const golfer of picks) picked.add(golfer);
    }
    return picked;
  }, [picksByEntrant]);

  const activeEntrantName = sessionEntrant?.entrant_name ?? "";
  const activePicks = activeEntrantName ? picksByEntrant[activeEntrantName] ?? [] : [];
  const activeIsFull = activePicks.length >= MAX_PICKS_PER_ENTRANT;
  const draftSummaryNames = entrantNames.length > 0 ? entrantNames : Object.keys(picksByEntrant);
  const isOnClock = Boolean(
    sessionEntrant &&
      draftState?.current_entrant_id &&
      sessionEntrant.entrant_id === draftState.current_entrant_id
  );

  const visibleGolfers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return golfers;
    return golfers.filter((g) => g.golfer.toLowerCase().includes(q));
  }, [golfers, query]);

  const availableGolferCount = useMemo(
    () => golfers.filter((golfer) => !pickedGolferIds.has(golfer.golfer)).length,
    [golfers, pickedGolferIds]
  );
  const timeRemaining = useMemo(() => {
    void clockTick;
    if (!draftState?.turn_expires_at) return null;
    const ms = Date.parse(draftState.turn_expires_at) - Date.now();
    if (!Number.isFinite(ms)) return null;
    return Math.max(0, Math.ceil(ms / 1000));
  }, [draftState?.turn_expires_at, clockTick]);

  async function reloadPicks() {
    const res = await fetch(`/api/draft-picks?pool_id=${encodeURIComponent(poolId)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "Failed to reload draft picks");
    const rows = (json.rows ?? []) as DraftPickRow[];
    const rowEntrants = Array.from(new Set(rows.map((row) => row.entrant_name)));
    const names = entrantNames.length > 0 ? entrantNames : rowEntrants;
    setPicksByEntrant(normalizePicks(rows, names));
    setLastUpdated(new Date());
    const stateRes = await fetch(`/api/draft-state?pool_id=${encodeURIComponent(poolId)}`);
    const stateJson = await stateRes.json();
    if (stateRes.ok) setDraftState((stateJson ?? null) as DraftStateRow | null);
  }

  async function handleLogout() {
    setAuthError(null);
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionEntrant(null);
  }

  async function toggleAutoDraft() {
    if (!sessionEntrant) return;

    setTogglingAutoDraft(true);
    setPicksError(null);
    try {
      const nextValue = !sessionEntrant.auto_draft_enabled;
      const res = await fetch("/api/admin/entrant-auto-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool_id: poolId,
          entrant_id: sessionEntrant.entrant_id,
          auto_draft_enabled: nextValue,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to update auto-draft");

      setSessionEntrant((current) =>
        current ? { ...current, auto_draft_enabled: nextValue } : current
      );
      setEntrants((current) =>
        current.map((entrant) =>
          entrant.entrant_id === sessionEntrant.entrant_id
            ? { ...entrant, auto_draft_enabled: nextValue }
            : entrant
        )
      );
      if (json?.draft_state) setDraftState(json.draft_state as DraftStateRow);
      await reloadPicks();
    } catch (e: unknown) {
      setPicksError(getErrorMessage(e, "Failed to update auto-draft"));
    } finally {
      setTogglingAutoDraft(false);
    }
  }

  async function addPick(golfer: string) {
    if (!sessionEntrant || activeIsFull || pickedGolferIds.has(golfer)) return;

    setSavingPicks(true);
    setPicksError(null);
    try {
      const res = await fetch("/api/draft-picks/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool_id: poolId,
          golfer,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save pick");
      await reloadPicks();
    } catch (e: unknown) {
      setPicksError(getErrorMessage(e, "Failed to save pick"));
    } finally {
      setSavingPicks(false);
    }
  }

  async function removePick(golfer: string) {
    if (!sessionEntrant) return;

    setSavingPicks(true);
    setPicksError(null);
    try {
      const res = await fetch("/api/draft-picks/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool_id: poolId,
          golfer,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to remove pick");
      await reloadPicks();
    } catch (e: unknown) {
      setPicksError(getErrorMessage(e, "Failed to remove pick"));
    } finally {
      setSavingPicks(false);
    }
  }

  async function clearDraftBoard() {
    if (!sessionEntrant?.is_admin) return;

    setSavingPicks(true);
    setPicksError(null);
    try {
      const res = await fetch("/api/draft-picks/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pool_id: poolId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to reset draft board");
      await reloadPicks();
    } catch (e: unknown) {
      setPicksError(getErrorMessage(e, "Failed to reset draft board"));
    } finally {
      setSavingPicks(false);
    }
  }

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-8">
        <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.22),transparent_70%)]" />
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Draft Room</p>
        <h1 className="mt-2 text-3xl font-semibold">Majors Draft Board</h1>
        <p className="mt-2 text-sm text-muted">
          Make picks here after signing in from the home page. Each entrant gets 6 golfers and every golfer can only be drafted once.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value as TournamentOption["slug"])}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm"
          >
            {TOURNAMENTS.map((tournament) => (
              <option key={tournament.slug} value={tournament.slug}>
                {tournament.label}
              </option>
            ))}
          </select>
          <div className="text-xs text-muted">Pool: {poolId}</div>
        </div>
        {sessionEntrant ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full border border-border bg-bg px-3 py-1 text-text">
              Signed in as <span className="font-semibold">{sessionEntrant.entrant_name}</span>
            </span>
            {sessionEntrant.is_admin && (
              <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-accent">
                Admin
              </span>
            )}
            <button type="button" onClick={() => void handleLogout()} className="text-muted underline">
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-3 text-xs text-muted">
            Sign in from the home page before entering the draft room.
          </div>
        )}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-bg/50 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Available</div>
            <div className="mt-1 text-2xl font-semibold">{availableGolferCount}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-bg/50 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Drafted</div>
            <div className="mt-1 text-2xl font-semibold">{pickedGolferIds.size}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-bg/50 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Your Picks</div>
            <div className="mt-1 text-2xl font-semibold">{activePicks.length}</div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-bg/50 px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted">Entrants</div>
            <div className="mt-1 text-2xl font-semibold">{draftSummaryNames.length}</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-border/70 bg-bg/40 px-4 py-3 text-sm">
          <div className="text-[11px] uppercase tracking-wide text-muted">On The Clock</div>
          <div className="mt-1 font-semibold text-text">
            {draftState?.is_complete
              ? "Draft complete"
              : draftState?.current_entrant_name ?? "Draft not started"}
          </div>
          <div className="mt-1 text-xs text-muted">
            Pick {draftState?.current_pick ?? "-"} of {draftState?.max_picks ?? draftSummaryNames.length * MAX_PICKS_PER_ENTRANT}
            {" "} | {" "}
            Round {draftState?.current_round ?? "-"}
          </div>
          <div className="mt-1 text-xs text-muted">
            Clock: {draftState?.is_complete ? "Complete" : timeRemaining === null ? "-" : `${timeRemaining}s`}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            {draftOpen
              ? "Board refreshes automatically every 30 seconds while this tab is open."
              : "Draft is locked. Auto-refresh is paused until an admin opens the board."}
          </span>
          <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
        </div>
      </section>

      {!draftOpen && (
        <section className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          Draft is currently locked. Players will be able to make picks once an admin opens the draft from the Admin page.
        </section>
      )}

      {!sessionEntrant && (
        <section className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          Draft access is locked until you sign in on the home page. Once signed in, come back here to make picks.
          {entrantsError && <div className="mt-2 text-xs text-danger">{entrantsError}</div>}
          {authError && <div className="mt-2 text-xs text-danger">{authError}</div>}
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Draft Access</label>
            <div className="mt-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm">
              {sessionEntrant ? sessionEntrant.entrant_name : "Sign in required"}
            </div>

            <div className="mt-3 rounded-lg border border-border/70 bg-bg/60 px-3 py-2 text-xs text-muted">
              Picks: <span className="font-semibold text-text">{activePicks.length}</span> / {MAX_PICKS_PER_ENTRANT}
            </div>
            <div className="mt-2 rounded-lg border border-border/70 bg-bg/60 px-3 py-2 text-xs text-muted">
              On clock: <span className="font-semibold text-text">{isOnClock ? "Yes" : "No"}</span>
            </div>
            <div className="mt-2 rounded-lg border border-border/70 bg-bg/60 px-3 py-2 text-xs text-muted">
              Auto draft:{" "}
              <span className="font-semibold text-text">
                {sessionEntrant?.auto_draft_enabled ? "On" : "Off"}
              </span>
            </div>
            {sessionEntrant && (
              <button
                type="button"
                onClick={() => void toggleAutoDraft()}
                disabled={togglingAutoDraft || savingPicks}
                className="mt-3 w-full rounded-lg border border-border/70 bg-bg/70 px-3 py-2 text-sm font-medium text-text transition hover:bg-bg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {togglingAutoDraft
                  ? "Updating..."
                  : sessionEntrant.auto_draft_enabled
                    ? "Turn Auto Draft Off"
                    : "Turn Auto Draft On"}
              </button>
            )}
            <div className="mt-2 text-xs text-muted">
              {savingPicks
                ? "Saving..."
                : loadingPicks
                  ? "Loading picks..."
                  : draftOpen
                    ? "Synced"
                    : "Locked"}
            </div>
            {picksError && <div className="mt-1 text-xs text-danger">{picksError}</div>}
            {entrantsLoading && <div className="mt-1 text-xs text-muted">Loading entrants...</div>}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {sessionEntrant ? `${sessionEntrant.entrant_name} Picks` : "Your Picks"}
            </div>
            {activePicks.length === 0 ? (
              <div className="text-sm text-muted">
                {sessionEntrant ? "No golfers selected yet." : "Sign in to draft golfers."}
              </div>
            ) : (
              <div className="space-y-2">
                {activePicks.map((golfer, idx) => (
                  <div
                    key={`${golfer}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-bg/60 px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="text-muted">{idx + 1}. </span>
                      {golfer}
                    </div>
                    {sessionEntrant && (
                      <button
                        type="button"
                        onClick={() => void removePick(golfer)}
                        disabled
                        className="text-xs text-muted"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {sessionEntrant?.is_admin && (
            <button
              type="button"
              onClick={() => void clearDraftBoard()}
              disabled={!draftOpen}
              className="w-full rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger"
            >
              Reset Draft Board
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Golfer Pool</div>
              <div className="text-xs text-muted">
                Once selected, a golfer is locked and unavailable for everyone else.
              </div>
              {loadingGolfers && <div className="text-xs text-muted">Loading golfers from Supabase...</div>}
              {golfersError && <div className="text-xs text-danger">Supabase load failed; using fallback list.</div>}
              {!draftOpen && (
                <div className="text-xs text-muted">Draft actions are disabled while the board is locked.</div>
              )}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search golfer..."
              className="w-48 rounded-lg border border-border bg-bg px-3 py-2 text-sm"
            />
          </div>

          <div className="overflow-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-3 text-left">Rank</th>
                  <th className="px-3 py-3 text-left">Golfer</th>
                  <th className="px-3 py-3 text-left">Handicap</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visibleGolfers.map((golfer) => {
                  const picked = pickedGolferIds.has(golfer.golfer);
                  const pickedBy =
                    entrants.find((entrant) => (picksByEntrant[entrant.entrant_name] ?? []).includes(golfer.golfer))
                      ?.entrant_name ??
                    Object.keys(picksByEntrant).find((entrantName) =>
                      (picksByEntrant[entrantName] ?? []).includes(golfer.golfer)
                    ) ??
                    null;
                  const canPick =
                    Boolean(sessionEntrant) &&
                    draftOpen &&
                    isOnClock &&
                    !picked &&
                    !activeIsFull &&
                    !savingPicks &&
                    !draftState?.is_complete;

                  return (
                    <tr key={golfer.id}>
                      <td className="px-3 py-3">{golfer.rank}</td>
                      <td className="px-3 py-3 font-medium">{golfer.golfer}</td>
                      <td className="px-3 py-3">{golfer.handicap.toFixed(1)}</td>
                      <td className="px-3 py-3">
                        {pickedBy ? (
                          <span className="text-xs text-danger">Drafted by {pickedBy}</span>
                        ) : (
                          <span className="text-xs text-accent">Available</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void addPick(golfer.golfer)}
                          disabled={!canPick}
                          className={[
                            "rounded-lg px-3 py-1.5 text-xs font-semibold",
                            canPick ? "bg-accent text-black" : "bg-border text-muted",
                          ].join(" ")}
                        >
                          {!sessionEntrant
                            ? "Sign in"
                            : picked
                              ? "Locked"
                              : !draftOpen
                                ? "Locked"
                                : draftState?.is_complete
                                  ? "Done"
                                  : isOnClock
                                    ? "Draft"
                                    : "Wait"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Draft Summary</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {draftSummaryNames.map((entrantName) => {
            const picks = picksByEntrant[entrantName] ?? [];
            return (
              <div key={entrantName} className="rounded-xl border border-border/70 bg-bg/50 p-3">
                <div className="text-sm font-semibold">{entrantName}</div>
                <div className="mt-1 text-xs text-muted">
                  {picks.length} / {MAX_PICKS_PER_ENTRANT} picks
                </div>
                {entrants.find((entrant) => entrant.entrant_name === entrantName)?.auto_draft_enabled && (
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-accent">Auto Draft</div>
                )}
                <div className="mt-2 space-y-1 text-xs">
                  {picks.length === 0 && <div className="text-muted">No picks yet.</div>}
                  {picks.map((golfer, idx) => (
                    <div key={`${entrantName}-${golfer}-${idx}`}>
                      {idx + 1}. {golfer}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default function DraftPage() {
  return (
    <Suspense fallback={<main className="space-y-6"><section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 text-sm text-muted backdrop-blur-xl">Loading draft room...</section></main>}>
      <DraftPageContent />
    </Suspense>
  );
}
