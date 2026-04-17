"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/error";

type Row = {
  entrant_id: string;
  finish_rank: number;
  raw_score: number;
  base_points: number;
  awarded_points: number;
};

type Member = { entrant_id: string; display_name: string };

export default function BracketNbaBoard({ slug, members }: { slug: string; members: Member[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/events/${slug}/provisional`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const body = await res.json();
        if (!cancelled) setRows(body.provisional ?? []);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [slug]);

  const nameById = new Map<string, string>();
  for (const m of members) nameById.set(m.entrant_id, m.display_name);

  const sorted = [...rows].sort((a, b) => a.finish_rank - b.finish_rank);

  return (
    <div className="soft-card rounded-[1.5rem] border border-border/20 bg-surface/35 p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Provisional standings
        </div>
        <span className="text-[11px] text-muted">updates every 60s</span>
      </div>
      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : error ? (
        <div className="text-sm text-danger">{error}</div>
      ) : sorted.length === 0 ? (
        <div className="text-sm text-muted">No entries submitted yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.22em] text-muted">
              <th className="px-2 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Player</th>
              <th className="px-2 py-2 text-right font-medium">Bracket pts</th>
              <th className="px-2 py-2 text-right font-medium">Season pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.entrant_id} className="border-t border-border/15 text-text">
                <td className="px-2 py-2 font-semibold text-muted">{row.finish_rank.toFixed(1)}</td>
                <td className="px-2 py-2 font-semibold">
                  {nameById.get(row.entrant_id) ?? row.entrant_id.slice(0, 8)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{Math.round(row.raw_score)}</td>
                <td className="px-2 py-2 text-right text-base font-semibold tabular-nums text-info">
                  {row.awarded_points.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
