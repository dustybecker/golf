"use client";

import { useEffect, useState } from "react";
import SiteNav from "@/components/SiteNav";
import { getErrorMessage } from "@/lib/error";

type Prefs = Record<string, boolean>;

const DEFAULT_PREFS: Prefs = {
  draft_opens: true,
  draft_turn: true,
  turn_timer_warn: true,
  event_lock: true,
  event_final: true,
  hot_seat_declared: true,
  hot_seat_veto: true,
  season_digest: true,
};

const PREF_LABELS: Record<string, string> = {
  draft_opens: "Draft opens for an event",
  draft_turn: "You're on the clock in a draft",
  turn_timer_warn: "Draft turn timer — 30 minutes left",
  event_lock: "Event entry deadline reached",
  event_final: "Event finalized — season points",
  hot_seat_declared: "Hot Seat take declared",
  hot_seat_veto: "Hot Seat vetoes needed",
  season_digest: "Weekly season digest",
};

export default function PreferencesPage() {
  const [email, setEmail] = useState<string>("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/preferences", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) setError("Sign in on the home page to manage preferences.");
          return;
        }
        const body = await res.json();
        if (cancelled) return;
        setEmail(body.email ?? "");
        setPrefs({ ...DEFAULT_PREFS, ...(body.prefs ?? {}) });
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load preferences"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || null, prefs }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <SiteNav />
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.28em] text-muted">Notifications</div>
        <h1 className="text-2xl font-semibold text-info">Preferences</h1>
        <p className="mt-1 text-sm text-muted">
          Email notifications keep the group chat in sync with draft turns, entry locks, and event finals.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] border border-border/20 bg-surface/35 p-5 text-sm text-muted">
          Loading…
        </div>
      ) : (
        <div className="soft-card space-y-4 rounded-[1.5rem] border border-border/20 bg-surface/35 p-5">
          {error ? (
            <div className="rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
              {error}
            </div>
          ) : null}

          <label className="flex flex-col text-xs text-muted">
            <span className="mb-1 uppercase tracking-[0.18em]">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="glass-input rounded-xl px-3 py-2 text-sm"
            />
          </label>

          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.28em] text-muted">Send me emails for…</div>
            {Object.keys(DEFAULT_PREFS).map((key) => (
              <label key={key} className="flex items-center justify-between rounded-lg bg-surface/60 px-3 py-2 text-sm text-text">
                <span>{PREF_LABELS[key] ?? key}</span>
                <input
                  type="checkbox"
                  checked={prefs[key] ?? true}
                  onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {saved ? <div className="text-xs text-info">Saved.</div> : null}
        </div>
      )}
    </main>
  );
}
