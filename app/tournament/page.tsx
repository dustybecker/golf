"use client";

import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/error";
import { TOURNAMENTS } from "@/lib/tournaments";
import { formatLastUpdated, useAutoRefreshValue } from "@/lib/useAutoRefresh";

type TournamentRow = {
  golfer: string;
  handicap: number;
  rank: number | null;
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

export default function TournamentLeaderboardPage() {
  const basePoolId = process.env.NEXT_PUBLIC_POOL_ID || "2026-majors";
  const [selectedTournament, setSelectedTournament] = useState("masters");
  const [selectedPoolId, setSelectedPoolId] = useState(`${basePoolId}-masters`);
  const [availableTournaments, setAvailableTournaments] = useState<TournamentMetaOption[]>(
    TOURNAMENTS.map((item) => ({ tournament_slug: item.slug, label: item.label }))
  );
  const [rows, setRows] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const poolId = useMemo(() => selectedPoolId.trim() || `${basePoolId}-masters`, [basePoolId, selectedPoolId]);

  const selectedTournamentMeta = availableTournaments.find(
    (item) => item.tournament_slug === selectedTournament
  );
  const draftOpen = selectedTournamentMeta?.draft_active_now ?? false;
  const refreshTick = useAutoRefreshValue(30000, true);

  function formatToPar(grossTotal: number, roundsPlayed: number) {
    const roundPar = selectedTournamentMeta?.round_par ?? 72;
    const totalPar = roundsPlayed * roundPar;
    const delta = grossTotal - totalPar;
    if (delta === 0) return "E";
    return delta > 0 ? `+${delta}` : `${delta}`;
  }

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
          `/api/leaderboards/tournament?pool_id=${encodeURIComponent(poolId)}&tournament=${encodeURIComponent(selectedTournament)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load tournament leaderboard");
        if (!cancelled) {
          setRows((json.rows ?? []) as TournamentRow[]);
          setLastUpdated(new Date());
        }
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e, "Failed to load tournament leaderboard"));
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
        <h1 className="mt-2 text-3xl font-semibold">Tournament Leaderboard</h1>
        <p className="mt-2 text-sm text-muted">
          Real tournament leaderboard view with raw strokes, score to par, round-by-round scoring, and ownership.
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
          <div className="text-xs text-muted">Pool: {poolId}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>Tournament scores refresh automatically every 30 seconds while this tab is open.</span>
          <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
        </div>
      </section>

      {loading && (
        <section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 text-sm text-muted backdrop-blur-xl">
          Loading tournament leaderboard...
        </section>
      )}

      {error && (
        <section className="rounded-[1.5rem] border border-danger/25 bg-surface/70 p-4 text-sm text-danger backdrop-blur-xl">
          {error}
        </section>
      )}

      {!loading && !error && rows.length === 0 && (
        <section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 text-sm text-muted backdrop-blur-xl">
          No tournament scores yet. Seed `tournament_round_scores` for this tournament to populate the leaderboard.
        </section>
      )}

      {!loading && !error && rows.length > 0 && (
        <section className="soft-card rounded-[1.5rem] border bg-surface/70 p-4 backdrop-blur-xl">
          <div className="soft-subtle overflow-auto rounded-[1.25rem] border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-3 text-left">Pos</th>
                  <th className="px-3 py-3 text-left">Golfer</th>
                  <th className="px-3 py-3 text-right">Strokes</th>
                  <th className="px-3 py-3 text-right">To Par</th>
                  <th className="px-3 py-3 text-right">R1</th>
                  <th className="px-3 py-3 text-right">R2</th>
                  <th className="px-3 py-3 text-right">R3</th>
                  <th className="px-3 py-3 text-right">R4</th>
                  <th className="px-3 py-3 text-left">Drafted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((row) => (
                  <tr key={row.golfer}>
                    <td className="px-3 py-3">{row.position_text ?? row.position ?? "-"}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{row.golfer}</div>
                      <div className="text-xs text-muted">Rank {row.rank ?? "-"}</div>
                    </td>
                    <td className="px-3 py-3 text-right">{row.gross_total}</td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatToPar(row.gross_total, row.rounds.length)}
                    </td>
                    {row.rounds.map((round) => (
                      <td key={`${row.golfer}-${round.round_number}`} className="px-3 py-3 text-right">
                        <div>{round.strokes}</div>
                        <div className="text-[11px] uppercase text-muted">{round.score_status}</div>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-xs text-muted">
                      {row.drafted_by.length > 0 ? row.drafted_by.join(", ") : "Undrafted"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
