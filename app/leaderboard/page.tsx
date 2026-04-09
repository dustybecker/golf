"use client";

import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/error";
import { isTournamentPollingActive, TournamentSlug, TOURNAMENTS } from "@/lib/tournaments";
import { formatLastUpdated, useAutoRefreshValue } from "@/lib/useAutoRefresh";

type ScoringGolfer = {
  golfer: string;
  handicap: number;
  gross_total: number | null;
  net_total: number | null;
  live_total_to_par?: number | null;
  live_net_to_par?: number | null;
  live_current_round_score?: number | null;
  live_thru?: string | null;
  position: number | null;
  position_text: string | null;
  rounds: Array<{
    round_number: number;
    strokes: number | null;
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

type TournamentMetaOption = {
  tournament_slug: string;
  label: string;
  round_par?: number;
  draft_open?: boolean;
  draft_active_now?: boolean;
};

export default function PlayerLeaderboardPage() {
  const basePoolId = process.env.NEXT_PUBLIC_POOL_ID || "2026-majors";
  const [selectedTournament, setSelectedTournament] = useState("masters");
  const [selectedPoolId, setSelectedPoolId] = useState(`${basePoolId}-masters`);
  const [selectedEntrant, setSelectedEntrant] = useState("");
  const [availableTournaments, setAvailableTournaments] = useState<TournamentMetaOption[]>(
    TOURNAMENTS.map((item) => ({ tournament_slug: item.slug, label: item.label }))
  );
  const [rows, setRows] = useState<PlayerLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const poolId = useMemo(() => selectedPoolId.trim() || `${basePoolId}-masters`, [basePoolId, selectedPoolId]);
  const selectedTournamentMeta = availableTournaments.find(
    (item) => item.tournament_slug === selectedTournament
  );
  const pollingActive = isTournamentPollingActive(selectedTournament as TournamentSlug);
  const refreshTick = useAutoRefreshValue(60000, pollingActive);

  function formatToPar(value: number | null) {
    if (value === null || Number.isNaN(value)) return "-";
    if (value === 0) return "E";
    return value > 0 ? `+${value}` : `${value}`;
  }

  function golferToPar(golfer: ScoringGolfer) {
    if (typeof golfer.live_net_to_par === "number") {
      return Math.round(golfer.live_net_to_par);
    }
    if (golfer.net_total === null) {
      return null;
    }
    const roundPar = selectedTournamentMeta?.round_par ?? 72;
    const totalPar = golfer.rounds.length * roundPar;
    return Math.round(golfer.net_total - totalPar);
  }

  function golferGrossToPar(golfer: ScoringGolfer) {
    if (typeof golfer.live_total_to_par === "number") {
      return Math.round(golfer.live_total_to_par);
    }
    if (golfer.gross_total === null) {
      return null;
    }
    const roundPar = selectedTournamentMeta?.round_par ?? 72;
    const totalPar = golfer.rounds.length * roundPar;
    return Math.round(golfer.gross_total - totalPar);
  }

  function teamToPar(row: PlayerLeaderboardRow) {
    return row.scoring_golfers.reduce((sum, golfer) => sum + (golferToPar(golfer) ?? 0), 0);
  }

  const selectedEntrantRow =
    rows.find((row) => row.entrant_name === selectedEntrant) ?? rows[0] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadTournamentOptions() {
      try {
        const res = await fetch(`/api/tournament-meta?pool_id=${encodeURIComponent(poolId)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load tournament metadata");
        const rows = (json.rows ?? []) as TournamentMetaOption[];
        if (!cancelled && rows.length > 0) {
          setAvailableTournaments(rows);
          if (!rows.some((row) => row.tournament_slug === selectedTournament)) {
            setSelectedTournament(rows[0].tournament_slug);
          }
        }
      } catch {
        if (!cancelled) {
          setAvailableTournaments(TOURNAMENTS.map((item) => ({ tournament_slug: item.slug, label: item.label })));
        }
      }
    }

    void loadTournamentOptions();
    return () => {
      cancelled = true;
    };
  }, [poolId, selectedTournament, refreshTick]);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/leaderboards/player?pool_id=${encodeURIComponent(poolId)}&tournament=${encodeURIComponent(selectedTournament)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load player leaderboard");
        if (!cancelled) {
          const loadedRows = (json.rows ?? []) as PlayerLeaderboardRow[];
          setRows(loadedRows);
          setLastUpdated(new Date());
          setSelectedEntrant((current) =>
            current && loadedRows.some((row) => row.entrant_name === current)
              ? current
              : (loadedRows[0]?.entrant_name ?? "")
          );
        }
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e, "Failed to load player leaderboard"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRows();
    return () => {
      cancelled = true;
    };
  }, [poolId, selectedTournament, refreshTick]);

  return (
    <main className="space-y-6">
      <section className="soft-card rounded-[1.75rem] border bg-surface/70 px-6 py-8 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Scoring</p>
        <h1 className="mt-2 text-3xl font-semibold">Player Leaderboard</h1>
        <p className="mt-2 text-sm text-muted">
          Team totals are built from each entrant&apos;s lowest 4 net golfer scores. Use the entrant toggle to inspect the full six-golfer roster.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm"
          >
            {availableTournaments.map((tournament) => (
              <option key={tournament.tournament_slug} value={tournament.tournament_slug}>
                {tournament.label}
              </option>
            ))}
          </select>
          <input
            value={selectedPoolId}
            onChange={(e) => setSelectedPoolId(e.target.value)}
            placeholder="Pool ID"
            className="glass-input rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={selectedEntrant}
            onChange={(e) => setSelectedEntrant(e.target.value)}
            disabled={rows.length === 0}
            className="glass-input rounded-xl px-3 py-2 text-sm"
          >
            {rows.length === 0 ? (
              <option value="">Select entrant</option>
            ) : (
              rows.map((row) => (
                <option key={row.entrant_name} value={row.entrant_name}>
                  {row.entrant_name}
                </option>
              ))
            )}
          </select>
          <div className="text-xs text-muted">Pool: {poolId}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            {pollingActive
              ? "Leaderboard refreshes automatically every 60 seconds while this tab is open."
              : "Auto-refresh is paused outside tournament hours."}
          </span>
          <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
        </div>
      </section>

      {loading && (
        <section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 text-sm text-muted backdrop-blur-xl">
          Loading player leaderboard...
        </section>
      )}

      {error && (
        <section className="rounded-[1.5rem] border border-danger/25 bg-surface/70 p-4 text-sm text-danger backdrop-blur-xl">
          {error}
        </section>
      )}

      {!loading && !error && rows.length === 0 && (
        <section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 text-sm text-muted backdrop-blur-xl">
          No scoring data yet. Seed `tournament_round_scores` for this tournament to populate the leaderboard.
        </section>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Standings</h2>
                <div className="mt-1 text-xs text-muted">
                  Ranked by current best four net scores, with 5th and 6th golfer as the tiebreakers.
                </div>
              </div>
            </div>

            <div className="soft-subtle mt-4 overflow-auto rounded-[1.25rem] border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-3 text-left">Rank</th>
                    <th className="px-3 py-3 text-left">Entrant</th>
                    <th className="px-3 py-3 text-right">Team Total</th>
                    <th className="px-3 py-3 text-right">5th</th>
                    <th className="px-3 py-3 text-right">6th</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {rows.map((row, index) => {
                    const selected = selectedEntrantRow?.entrant_name === row.entrant_name;
                    return (
                      <tr
                        key={row.entrant_name}
                        className={selected ? "bg-accent/10" : undefined}
                      >
                        <td className="px-3 py-3 font-semibold">{index + 1}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedEntrant(row.entrant_name)}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {row.entrant_name}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{formatToPar(teamToPar(row))}</td>
                        <td className="px-3 py-3 text-right">{row.tie_break_5_position ?? "-"}</td>
                        <td className="px-3 py-3 text-right">{row.tie_break_6_position ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {selectedEntrantRow && (
            <section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{selectedEntrantRow.entrant_name} Scorecard</h2>
                  <div className="mt-1 text-xs text-muted">
                    Best four count toward the team total. Bench golfers remain available for tiebreaking.
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-muted">Team Total</div>
                  <div className="text-2xl font-semibold">{formatToPar(teamToPar(selectedEntrantRow))}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="soft-subtle rounded-[1.25rem] border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Current Best Four</div>
                  <div className="mt-3 space-y-2">
                    {selectedEntrantRow.scoring_golfers.map((golfer) => (
                      <div key={`${selectedEntrantRow.entrant_name}-${golfer.golfer}`} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{golfer.golfer}</div>
                          <div className="text-xs text-muted">
                            Gross {formatToPar(golferGrossToPar(golfer))} | Hdcp -{Math.round(golfer.handicap)}
                          </div>
                          {golfer.live_thru && (
                            <div className="text-xs text-muted">
                              Thru {golfer.live_thru}
                              {typeof golfer.live_current_round_score === "number"
                                ? ` | Rnd ${golfer.live_current_round_score > 0 ? `+${golfer.live_current_round_score}` : golfer.live_current_round_score}`
                                : ""}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatToPar(golferToPar(golfer))}</div>
                          <div className="text-xs text-muted">{golfer.position_text ?? golfer.position ?? "-"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="soft-subtle rounded-[1.25rem] border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Bench</div>
                  <div className="mt-3 space-y-2">
                    {selectedEntrantRow.bench_golfers.length === 0 && (
                      <div className="text-sm text-muted">No bench golfers available yet.</div>
                    )}
                    {selectedEntrantRow.bench_golfers.map((golfer) => (
                      <div key={`${selectedEntrantRow.entrant_name}-bench-${golfer.golfer}`} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{golfer.golfer}</div>
                          <div className="text-xs text-muted">
                            Gross {formatToPar(golferGrossToPar(golfer))} | Hdcp -{Math.round(golfer.handicap)}
                          </div>
                          {golfer.live_thru && (
                            <div className="text-xs text-muted">
                              Thru {golfer.live_thru}
                              {typeof golfer.live_current_round_score === "number"
                                ? ` | Rnd ${golfer.live_current_round_score > 0 ? `+${golfer.live_current_round_score}` : golfer.live_current_round_score}`
                                : ""}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatToPar(golferToPar(golfer))}</div>
                          <div className="text-xs text-muted">{golfer.position_text ?? golfer.position ?? "-"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
