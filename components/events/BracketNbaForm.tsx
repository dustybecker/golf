"use client";

import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/lib/error";
import type { NbaBracketPayload, NbaSeriesPick } from "@/lib/events/bracketNba";

type Seed = { seed: number; team: string };
type Config = { east: Seed[]; west: Seed[] };

type Props = {
  slug: string;
  config: Config;
  existing?: NbaBracketPayload | null;
  locked?: boolean;
};

const GAMES_OPTIONS: Array<4 | 5 | 6 | 7> = [4, 5, 6, 7];

function emptyPick(matchId: string): NbaSeriesPick {
  return { match_id: matchId, winner_team_id: "", games: 6 };
}

function defaultPayload(): NbaBracketPayload {
  return {
    rounds: {
      r1: [
        emptyPick("E-1v8"),
        emptyPick("E-4v5"),
        emptyPick("E-3v6"),
        emptyPick("E-2v7"),
        emptyPick("W-1v8"),
        emptyPick("W-4v5"),
        emptyPick("W-3v6"),
        emptyPick("W-2v7"),
      ],
      r2: [emptyPick("E-SF1"), emptyPick("E-SF2"), emptyPick("W-SF1"), emptyPick("W-SF2")],
      conf_finals: [emptyPick("E-CF"), emptyPick("W-CF")],
      finals: { winner_team_id: "", games: 6, mvp_player_id: "" },
    },
    tiebreaker_finals_total_points: 0,
  };
}

export default function BracketNbaForm({ slug, config, existing, locked }: Props) {
  const [payload, setPayload] = useState<NbaBracketPayload>(existing ?? defaultPayload());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"idle" | "ok">("idle");

  useEffect(() => {
    if (existing) setPayload(existing);
  }, [existing]);

  const teamOptions = useMemo(() => {
    const all = [...config.east, ...config.west];
    return all;
  }, [config]);

  function updateSeries(round: "r1" | "r2" | "conf_finals", idx: number, patch: Partial<NbaSeriesPick>) {
    setPayload((p) => {
      const next = { ...p, rounds: { ...p.rounds } };
      const list = [...next.rounds[round]];
      list[idx] = { ...list[idx], ...patch } as NbaSeriesPick;
      next.rounds[round] = list;
      return next;
    });
  }

  function updateFinals(patch: Partial<NbaBracketPayload["rounds"]["finals"]>) {
    setPayload((p) => ({
      ...p,
      rounds: { ...p.rounds, finals: { ...p.rounds.finals, ...patch } },
    }));
  }

  async function submit() {
    if (locked) return;
    setSaving(true);
    setError(null);
    setSaved("idle");
    try {
      const res = await fetch(`/api/events/${slug}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      setSaved("ok");
    } catch (err) {
      setError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  const roundSpecs: Array<{ key: "r1" | "r2" | "conf_finals"; label: string }> = [
    { key: "r1", label: "First Round" },
    { key: "r2", label: "Conference Semifinals" },
    { key: "conf_finals", label: "Conference Finals" },
  ];

  return (
    <div className="space-y-4">
      {roundSpecs.map(({ key, label }) => (
        <section
          key={key}
          className="soft-card rounded-[1.5rem] border border-border/20 bg-surface/35 p-4"
        >
          <div className="mb-2 text-[11px] uppercase tracking-[0.28em] text-muted">{label}</div>
          <div className="grid gap-2 md:grid-cols-2">
            {payload.rounds[key].map((pick, idx) => (
              <div key={pick.match_id} className="rounded border border-border/20 bg-surface/60 p-2">
                <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted">
                  {pick.match_id}
                </div>
                <div className="flex gap-2">
                  <select
                    disabled={locked}
                    value={pick.winner_team_id}
                    onChange={(e) => updateSeries(key, idx, { winner_team_id: e.target.value })}
                    className="glass-input flex-1 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">— winner —</option>
                    {teamOptions.map((t) => (
                      <option key={t.team} value={t.team}>
                        {t.team}
                      </option>
                    ))}
                  </select>
                  <select
                    disabled={locked}
                    value={pick.games}
                    onChange={(e) =>
                      updateSeries(key, idx, { games: Number(e.target.value) as 4 | 5 | 6 | 7 })
                    }
                    className="glass-input rounded-lg px-2 py-1.5 text-sm"
                  >
                    {GAMES_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        in {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="soft-card rounded-[1.5rem] border border-border/20 bg-surface/35 p-4">
        <div className="mb-2 text-[11px] uppercase tracking-[0.28em] text-muted">NBA Finals</div>
        <div className="grid gap-2 md:grid-cols-3">
          <select
            disabled={locked}
            value={payload.rounds.finals.winner_team_id}
            onChange={(e) => updateFinals({ winner_team_id: e.target.value })}
            className="glass-input rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">— champion —</option>
            {teamOptions.map((t) => (
              <option key={t.team} value={t.team}>
                {t.team}
              </option>
            ))}
          </select>
          <select
            disabled={locked}
            value={payload.rounds.finals.games}
            onChange={(e) => updateFinals({ games: Number(e.target.value) as 4 | 5 | 6 | 7 })}
            className="glass-input rounded-lg px-2 py-1.5 text-sm"
          >
            {GAMES_OPTIONS.map((g) => (
              <option key={g} value={g}>
                in {g}
              </option>
            ))}
          </select>
          <input
            disabled={locked}
            type="text"
            placeholder="Finals MVP"
            value={payload.rounds.finals.mvp_player_id ?? ""}
            onChange={(e) => updateFinals({ mvp_player_id: e.target.value })}
            className="glass-input rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
        <label className="mt-2 flex flex-col text-xs text-muted">
          <span className="mb-1 uppercase tracking-[0.18em]">Tiebreaker · combined Finals points</span>
          <input
            disabled={locked}
            type="number"
            min={0}
            value={payload.tiebreaker_finals_total_points}
            onChange={(e) =>
              setPayload((p) => ({
                ...p,
                tiebreaker_finals_total_points: Number(e.target.value) || 0,
              }))
            }
            className="glass-input rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
      </section>

      {error ? (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
          {error}
        </div>
      ) : null}
      {saved === "ok" ? (
        <div className="rounded-md border border-info/40 bg-info/10 p-2 text-xs text-info">
          Saved.
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={saving || locked}
        className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {locked ? "Bracket locked" : saving ? "Saving…" : "Save bracket"}
      </button>
    </div>
  );
}
