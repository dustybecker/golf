"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/error";
import { formatLastUpdated, useAutoRefreshValue } from "@/lib/useAutoRefresh";
import SeasonBoard from "@/components/SeasonBoard";

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
};

type ScoringGolfer = {
  golfer: string;
  handicap: number;
  gross_total: number;
  net_total: number;
  position: number | null;
  position_text: string | null;
  rounds: Array<{
    round_number: number;
    strokes: number;
    score_status: string;
  }>;
};

type PlayerLeaderboardRow = {
  entrant_name: string;
  team_total: number;
  scoring_golfers: ScoringGolfer[];
  bench_golfers: ScoringGolfer[];
  tie_break_5_position: number | null;
  tie_break_6_position: number | null;
};

type TournamentLeaderboardRow = {
  golfer: string;
  gross_total: number;
  position: number | null;
  position_text: string | null;
  drafted_by: string[];
  rounds: Array<{
    round_number: number;
    strokes: number;
    score_status: string;
  }>;
};

type TournamentMetaOption = {
  tournament_slug: string;
  label: string;
  round_par?: number;
  draft_open?: boolean;
  draft_active_now?: boolean;
};

const TOURNAMENTS: TournamentOption[] = [
  { slug: "masters", label: "The Masters" },
  { slug: "pga-championship", label: "PGA Championship" },
  { slug: "us-open", label: "U.S. Open" },
  { slug: "the-open", label: "The Open Championship" },
];

function formatToPar(value: number) {
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : `${value}`;
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const basePoolId = process.env.NEXT_PUBLIC_POOL_ID || "2026-majors";
  const [selectedTournament, setSelectedTournament] = useState<TournamentOption["slug"]>("masters");
  const [loginSlug, setLoginSlug] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [entrantsLoading, setEntrantsLoading] = useState(true);
  const [entrantsError, setEntrantsError] = useState<string | null>(null);

  const [sessionEntrant, setSessionEntrant] = useState<Entrant | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [availableTournaments, setAvailableTournaments] = useState<TournamentMetaOption[]>(
    TOURNAMENTS.map((item) => ({ tournament_slug: item.slug, label: item.label }))
  );
  const [playerRows, setPlayerRows] = useState<PlayerLeaderboardRow[]>([]);
  const [tournamentRows, setTournamentRows] = useState<TournamentLeaderboardRow[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const poolId = `${basePoolId}-${selectedTournament}`;
  const selectedTournamentMeta = availableTournaments.find(
    (item) => item.tournament_slug === selectedTournament
  );
  const draftOpen = selectedTournamentMeta?.draft_active_now ?? false;
  const refreshTick = useAutoRefreshValue(30000, draftOpen);

  function golferToPar(golfer: ScoringGolfer) {
    const roundPar = selectedTournamentMeta?.round_par ?? 72;
    const totalPar = golfer.rounds.length * roundPar;
    return Math.round(golfer.net_total - totalPar);
  }

  function teamToPar(row: PlayerLeaderboardRow) {
    return row.scoring_golfers.reduce((sum, golfer) => sum + golferToPar(golfer), 0);
  }

  function tournamentToPar(row: TournamentLeaderboardRow) {
    const roundPar = selectedTournamentMeta?.round_par ?? 72;
    const totalPar = row.rounds.length * roundPar;
    return Math.round(row.gross_total - totalPar);
  }

  const topPlayers = useMemo(() => playerRows.slice(0, 5), [playerRows]);
  const topGolfers = useMemo(() => tournamentRows.slice(0, 8), [tournamentRows]);

  useEffect(() => {
    const tournamentParam = searchParams.get("tournament");
    const entrantParam = searchParams.get("entrant");

    if (tournamentParam && TOURNAMENTS.some((option) => option.slug === tournamentParam)) {
      setSelectedTournament(tournamentParam as TournamentOption["slug"]);
    }

    if (entrantParam) {
      setLoginSlug(entrantParam);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setEntrantsLoading(true);
      setSessionLoading(true);
      setEntrantsError(null);
      setAuthError(null);

      try {
        const [entrantsRes, sessionRes] = await Promise.all([
          fetch(`/api/entrants?pool_id=${encodeURIComponent(poolId)}`),
          fetch(`/api/auth/me?pool_id=${encodeURIComponent(poolId)}`),
        ]);

        const entrantsJson = await entrantsRes.json();
        const sessionJson = await sessionRes.json();

        if (!entrantsRes.ok) throw new Error(entrantsJson?.error ?? "Failed to load entrants");
        if (!sessionRes.ok) throw new Error(sessionJson?.error ?? "Failed to load session");

        if (!cancelled) {
          const loadedEntrants = (entrantsJson.entrants ?? []) as Entrant[];
          setEntrants(loadedEntrants);
          setSessionEntrant((sessionJson.entrant ?? null) as Entrant | null);
          setLoginSlug((current) => current || loadedEntrants[0]?.entrant_slug || "");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setEntrants([]);
          setSessionEntrant(null);
          setEntrantsError(getErrorMessage(e, "Failed to load entrants"));
        }
      } finally {
        if (!cancelled) {
          setEntrantsLoading(false);
          setSessionLoading(false);
        }
      }
    }

    async function loadBoards() {
      setLoadingBoards(true);
      setBoardError(null);
      try {
        const [metaRes, playerRes, tournamentRes] = await Promise.all([
          fetch(`/api/tournament-meta?pool_id=${encodeURIComponent(poolId)}`),
          fetch(`/api/leaderboards/player?pool_id=${encodeURIComponent(poolId)}&tournament=${encodeURIComponent(selectedTournament)}`),
          fetch(`/api/leaderboards/tournament?pool_id=${encodeURIComponent(poolId)}&tournament=${encodeURIComponent(selectedTournament)}`),
        ]);

        const [metaJson, playerJson, tournamentJson] = await Promise.all([
          metaRes.json(),
          playerRes.json(),
          tournamentRes.json(),
        ]);

        if (metaRes.ok) {
          const rows = (metaJson.rows ?? []) as TournamentMetaOption[];
          if (!cancelled && rows.length > 0) {
            setAvailableTournaments(rows);
          }
        }

        if (!playerRes.ok) throw new Error(playerJson?.error ?? "Failed to load player leaderboard");
        if (!tournamentRes.ok) throw new Error(tournamentJson?.error ?? "Failed to load tournament leaderboard");

        if (!cancelled) {
          setPlayerRows((playerJson.rows ?? []) as PlayerLeaderboardRow[]);
          setTournamentRows((tournamentJson.rows ?? []) as TournamentLeaderboardRow[]);
          setLastUpdated(new Date());
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setPlayerRows([]);
          setTournamentRows([]);
          setBoardError(getErrorMessage(e, "Failed to load leaderboard snapshots"));
        }
      } finally {
        if (!cancelled) setLoadingBoards(false);
      }
    }

    void loadContext();
    void loadBoards();

    return () => {
      cancelled = true;
    };
  }, [poolId, selectedTournament, refreshTick]);

  async function handleLogin() {
    if (!loginSlug || !accessCode.trim()) return;
    setLoginLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/entrant-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pool_id: poolId,
          entrant_slug: loginSlug,
          access_code: accessCode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to sign in");
      setSessionEntrant((json.entrant ?? null) as Entrant | null);
      setAccessCode("");
    } catch (e: unknown) {
      setAuthError(getErrorMessage(e, "Failed to sign in"));
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionEntrant(null);
  }

  return (
    <main className="space-y-6">
      <SeasonBoard year={2026} compact />
      <section className="hero-panel soft-card relative overflow-hidden rounded-[2rem] border px-5 py-7 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="pointer-events-none absolute -left-16 top-8 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute right-6 top-6 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.35fr,0.65fr] lg:items-end lg:gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">Golf Majors Pool</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-[1] text-info sm:text-4xl md:text-5xl lg:text-6xl lg:leading-[0.92]">
              Welcome to the Surge
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted md:text-base">
              Sign in, choose the tournament board you want to work from, and move straight into
              the draft, standings, and live scoring.
            </p>
            <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value as TournamentOption["slug"])}
                className="glass-input w-full rounded-xl px-4 py-3 text-sm sm:w-auto"
              >
                {TOURNAMENTS.map((tournament) => (
                  <option key={tournament.slug} value={tournament.slug}>
                    {tournament.label}
                  </option>
                ))}
              </select>
              {sessionEntrant ? (
                <>
                  <Link
                    href="/draft"
                    className="rounded-xl bg-accent px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_28px_rgba(99,91,255,0.28)]"
                  >
                    Enter Draft Room
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="glass-input rounded-xl px-4 py-3 text-sm font-semibold text-text"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="glass-input rounded-xl px-4 py-3 text-sm text-muted">
                  First visit: sign in below to unlock your entrant access.
                </div>
              )}
            </div>
          </div>
          <div className="soft-subtle rounded-[1.5rem] border p-5">
            <div className="grid gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-muted">Current View</div>
                <div className="mt-2 text-lg font-semibold text-info">
                  {TOURNAMENTS.find((item) => item.slug === selectedTournament)?.label ?? selectedTournament}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-muted">Pool</div>
                  <div className="mt-1 text-sm text-text">{poolId}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-muted">Session</div>
                  <div className="mt-1 text-sm text-text">
                    {sessionEntrant ? sessionEntrant.entrant_name : "Not signed in"}
                  </div>
                </div>
              </div>
                <div className="border-t border-border/20 pt-4 text-xs text-muted">
                  {draftOpen
                    ? "Home snapshots refresh automatically every 30 seconds while this tab is open."
                    : "Draft is locked. Auto-refresh is paused on the live pages until the draft is opened from Admin."}
                </div>
              <div className="text-xs text-muted">Last updated: {formatLastUpdated(lastUpdated)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.05fr,0.95fr]">
        <div className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 backdrop-blur-xl sm:p-5">
          <h2 className="text-sm font-semibold">Entrant Sign In</h2>
          <p className="mt-1 text-sm text-muted">
            Choose your entrant slot and enter the access code you were given. After signing in,
            use the Draft tab to make picks.
          </p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-[1fr,1fr,auto]"
            onSubmit={(e) => {
              e.preventDefault();
              void handleLogin();
            }}
          >
            <select
              value={loginSlug}
              onChange={(e) => setLoginSlug(e.target.value)}
              disabled={entrantsLoading || entrants.length === 0 || sessionLoading}
              autoComplete="username"
              name="entrant"
              className="glass-input rounded-xl px-3 py-3 text-sm"
            >
              <option value="">Select entrant</option>
              {entrants.map((entrant) => (
                <option key={entrant.entrant_id} value={entrant.entrant_slug}>
                  {entrant.entrant_name}
                </option>
              ))}
            </select>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access code"
              autoComplete="current-password"
              name="access-code"
              inputMode="text"
              className="glass-input rounded-xl px-3 py-3 text-sm"
            />
            <button
              type="submit"
              disabled={loginLoading || !loginSlug || !accessCode.trim()}
              className={[
                "rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                loginLoading || !loginSlug || !accessCode.trim()
                  ? "bg-border/50 text-muted"
                  : "bg-accent text-white shadow-[0_12px_28px_rgba(99,91,255,0.24)]",
              ].join(" ")}
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="mt-3 text-xs text-muted">
            {sessionLoading
              ? "Checking current session..."
              : entrantsLoading
                ? "Loading entrants..."
                : entrants.length === 0
                  ? "No entrants found for this pool yet."
                  : "Your access code only unlocks your own entrant slot."}
          </div>
          {entrantsError && <div className="mt-2 text-xs text-danger">{entrantsError}</div>}
          {authError && <div className="mt-2 text-xs text-danger">{authError}</div>}
        </div>

        <div className="soft-card rounded-[1.5rem] border bg-surface/70 p-5 backdrop-blur-xl">
          <h2 className="text-sm font-semibold">Where To Go Next</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href="/draft" className="soft-subtle rounded-[1.25rem] border p-4 transition-colors hover:bg-surface/60">
              <div className="text-sm font-semibold">Draft</div>
              <div className="mt-1 text-xs text-muted">
                Make picks, review your roster, and track what is still available.
              </div>
            </Link>
            <Link href="/leaderboard" className="soft-subtle rounded-[1.25rem] border p-4 transition-colors hover:bg-surface/60">
              <div className="text-sm font-semibold">Player Leaderboard</div>
              <div className="mt-1 text-xs text-muted">
                See the pool standings based on the best four net golfer scores.
              </div>
            </Link>
            <Link href="/tournament" className="soft-subtle rounded-[1.25rem] border p-4 transition-colors hover:bg-surface/60">
              <div className="text-sm font-semibold">Tournament Leaderboard</div>
              <div className="mt-1 text-xs text-muted">
                See the real event leaderboard and who drafted each golfer.
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 backdrop-blur-xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Pool Snapshot</h2>
              <div className="mt-1 text-xs text-muted">Current top entrants for this tournament.</div>
            </div>
            <Link href="/leaderboard" className="text-xs text-muted underline">
              Open full leaderboard
            </Link>
          </div>

          {loadingBoards ? (
            <div className="mt-4 text-sm text-muted">Loading leaderboard snapshot...</div>
          ) : boardError ? (
            <div className="mt-4 text-sm text-danger">{boardError}</div>
          ) : topPlayers.length === 0 ? (
            <div className="mt-4 text-sm text-muted">No player leaderboard data yet for this tournament.</div>
          ) : (
            <div className="mt-4 space-y-2">
              {topPlayers.map((row, index) => (
                <div key={row.entrant_name} className="soft-subtle flex items-center justify-between rounded-[1.25rem] border px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {index + 1}. {row.entrant_name}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      5th tiebreak {row.tie_break_5_position ?? "-"} | 6th {row.tie_break_6_position ?? "-"}
                    </div>
                  </div>
                  <div className="text-lg font-semibold">{formatToPar(teamToPar(row))}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 backdrop-blur-xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Tournament Snapshot</h2>
              <div className="mt-1 text-xs text-muted">Current top golfers in the event.</div>
            </div>
            <Link href="/tournament" className="text-xs text-muted underline">
              Open full tournament board
            </Link>
          </div>

          {loadingBoards ? (
            <div className="mt-4 text-sm text-muted">Loading tournament snapshot...</div>
          ) : boardError ? (
            <div className="mt-4 text-sm text-danger">{boardError}</div>
          ) : topGolfers.length === 0 ? (
            <div className="mt-4 text-sm text-muted">No tournament scores synced yet for this tournament.</div>
          ) : (
            <>
              <ul className="mt-4 space-y-2 md:hidden">
                {topGolfers.map((row) => (
                  <li
                    key={`m-${row.golfer}`}
                    className="soft-subtle flex items-center justify-between gap-3 rounded-[1.25rem] border px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex min-w-[2rem] justify-center rounded-md bg-surface/60 px-1.5 py-0.5 text-xs font-semibold text-muted">
                          {row.position_text ?? row.position ?? "-"}
                        </span>
                        <div className="truncate text-sm font-medium">{row.golfer}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {row.gross_total} strokes &middot;{" "}
                        {row.drafted_by.length > 0 ? row.drafted_by.join(", ") : "Undrafted"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-base font-semibold">{formatToPar(tournamentToPar(row))}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted">To Par</div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="soft-subtle mt-4 hidden overflow-auto rounded-[1.25rem] border md:block">
                <table className="w-full min-w-[620px] text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-3 text-left">Pos</th>
                    <th className="px-3 py-3 text-left">Golfer</th>
                    <th className="px-3 py-3 text-right">To Par</th>
                    <th className="px-3 py-3 text-right">Strokes</th>
                    <th className="px-3 py-3 text-left">Drafted By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {topGolfers.map((row) => (
                    <tr key={row.golfer}>
                      <td className="px-3 py-3">{row.position_text ?? row.position ?? "-"}</td>
                      <td className="px-3 py-3 font-medium">{row.golfer}</td>
                      <td className="px-3 py-3 text-right font-semibold">{formatToPar(tournamentToPar(row))}</td>
                      <td className="px-3 py-3 text-right">{row.gross_total}</td>
                      <td className="px-3 py-3 text-xs text-muted">
                        {row.drafted_by.length > 0 ? row.drafted_by.join(", ") : "Undrafted"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="space-y-6"><section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 text-sm text-muted backdrop-blur-xl">Loading home...</section></main>}>
      <HomePageContent />
    </Suspense>
  );
}
