"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRequireEntrant } from "@/lib/useRequireEntrant";

/*
 * DIRECTION 2 — TIMELINE
 *
 * Everything that happened, in order. Picks, scores, takes, reactions,
 * bonuses, event locks, standings shifts — all flow through one
 * chronological feed. The eye scans the colored rail down the left
 * to read what's been hot at a glance.
 *
 * Filter chips at the top let you narrow to one content type.
 */

type Drafter = {
  slug: string;
  name: string;
  initials: string;
  tint: string;
};

type FeedKind =
  | "take"
  | "score"
  | "pick"
  | "bonus"
  | "standings"
  | "event-lock"
  | "hot-seat"
  | "system";

type Reaction = { emoji: string; count: number };

type FeedItem = {
  id: string;
  kind: FeedKind;
  ago: string;
  ts: number; // for sorting
  by?: string; // drafter slug
  title: string;
  body?: string;
  reactions?: Reaction[];
  meta?: string;
  cta?: { label: string; href: string };
  thread?: { by: string; text: string; ago: string };
};

const DRAFTERS: Drafter[] = [
  { slug: "chris", name: "Chris", initials: "CH", tint: "#d77a3a" },
  { slug: "dusty", name: "Dusty", initials: "DU", tint: "#2f9e44" },
  { slug: "vobe",  name: "Vobe",  initials: "VO", tint: "#4c6ef5" },
  { slug: "cody",  name: "Cody",  initials: "CO", tint: "#e03131" },
  { slug: "wes",   name: "Wes",   initials: "WE", tint: "#e8a82a" },
  { slug: "dan",   name: "Dan",   initials: "DA", tint: "#a855c7" },
  { slug: "thom",  name: "Thom",  initials: "TH", tint: "#0ea5e9" },
  { slug: "rod",   name: "Rod",   initials: "RO", tint: "#14b8a6" },
  { slug: "nate",  name: "Nate",  initials: "NA", tint: "#64748b" },
];

const KIND_THEMES: Record<FeedKind, { rail: string; chip: string; label: string; iconBg: string; icon: string }> = {
  take:         { rail: "bg-orange-500",      chip: "bg-orange-500/15 text-orange-700", label: "Hot take",   iconBg: "bg-orange-500/15 text-orange-600", icon: "🔥" },
  score:        { rail: "bg-emerald-500",     chip: "bg-emerald-500/15 text-emerald-700", label: "Score",     iconBg: "bg-emerald-500/15 text-emerald-600", icon: "⛳" },
  pick:         { rail: "bg-sky-500",         chip: "bg-sky-500/15 text-sky-700",         label: "Pick",      iconBg: "bg-sky-500/15 text-sky-600", icon: "🎯" },
  bonus:        { rail: "bg-amber-500",       chip: "bg-amber-500/15 text-amber-700",     label: "Bonus",     iconBg: "bg-amber-500/15 text-amber-700", icon: "🏆" },
  standings:    { rail: "bg-violet-500",      chip: "bg-violet-500/15 text-violet-700",   label: "Standings", iconBg: "bg-violet-500/15 text-violet-600", icon: "📈" },
  "event-lock": { rail: "bg-slate-400",       chip: "bg-slate-400/20 text-slate-700",     label: "Event",     iconBg: "bg-slate-400/15 text-slate-600", icon: "🔒" },
  "hot-seat":   { rail: "bg-pink-500",        chip: "bg-pink-500/15 text-pink-700",       label: "Hot Seat",  iconBg: "bg-pink-500/15 text-pink-600", icon: "🪑" },
  system:       { rail: "bg-border/60",       chip: "bg-surface/70 text-muted",           label: "System",    iconBg: "bg-surface/70 text-muted", icon: "•" },
};

const NOW_MS = Date.now();

function relAgo(min: number) {
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  if (min < 60 * 24) return `${Math.round(min / 60)}h`;
  if (min < 60 * 24 * 7) return `${Math.round(min / (60 * 24))}d`;
  return `${Math.round(min / (60 * 24 * 7))}w`;
}

const FEED: FeedItem[] = [
  {
    id: "f1",
    kind: "take",
    ago: relAgo(3),
    ts: NOW_MS - 3 * 60_000,
    by: "dusty",
    title: "ok so if Rory holds and Scheffler blows up on Sunday…",
    reactions: [{ emoji: "🙏", count: 2 }, { emoji: "😤", count: 1 }],
  },
  {
    id: "f2",
    kind: "score",
    ago: relAgo(12),
    ts: NOW_MS - 12 * 60_000,
    title: "Robert Macintyre · Birdie 17",
    body: "-5 thru 17 · Cody jumps from 6th to 4th",
    meta: "drafted by Cody",
  },
  {
    id: "f3",
    kind: "bonus",
    ago: relAgo(22),
    ts: NOW_MS - 22 * 60_000,
    title: "Survivor → Dusty +6",
    body: "All 6 of his Masters golfers made the cut. Auto-applied at the cut line.",
    meta: "Masters · Tier 3 · 5x",
    reactions: [{ emoji: "🎉", count: 5 }, { emoji: "💰", count: 3 }],
  },
  {
    id: "f4",
    kind: "take",
    ago: relAgo(38),
    ts: NOW_MS - 38 * 60_000,
    by: "thom",
    title: "Rahm WD has me spiraling",
    reactions: [{ emoji: "💀", count: 7 }, { emoji: "😭", count: 2 }],
    thread: { by: "chris", text: "the curse continues", ago: relAgo(35) },
  },
  {
    id: "f5",
    kind: "score",
    ago: relAgo(46),
    ts: NOW_MS - 46 * 60_000,
    title: "Bryson DeChambeau · Bogey 14",
    body: "-4 thru 14 · falls from T5 to T7",
    meta: "drafted by Vobe",
  },
  {
    id: "f6",
    kind: "take",
    ago: relAgo(52),
    ts: NOW_MS - 52 * 60_000,
    by: "wes",
    title: "Aberg + Morikawa both top-5. Bank it.",
    reactions: [{ emoji: "💰", count: 3 }],
  },
  {
    id: "f7",
    kind: "standings",
    ago: relAgo(60),
    ts: NOW_MS - 60 * 60_000,
    title: "Wes overtook Dusty for 2nd",
    body: "Wes -12 · Dusty -11 · Chris still leads at -18",
  },
  {
    id: "f8",
    kind: "take",
    ago: relAgo(75),
    ts: NOW_MS - 75 * 60_000,
    by: "cody",
    title: "MACINTYRE LET'S GOOOOO",
    reactions: [{ emoji: "🔥", count: 6 }, { emoji: "🏴", count: 4 }],
  },
  {
    id: "f9",
    kind: "score",
    ago: relAgo(90),
    ts: NOW_MS - 90 * 60_000,
    title: "Rory McIlroy · Eagle 8",
    body: "-9 thru 8 · jumps to 2nd",
    meta: "drafted by Dusty",
  },
  {
    id: "f10",
    kind: "hot-seat",
    ago: relAgo(60 * 6),
    ts: NOW_MS - 6 * 3_600_000,
    by: "thom",
    title: "Thom is on the Hot Seat this week",
    body: "\"Scottie Scheffler outright wins the Masters\" · +400 · vetoes due Mon 5pm",
    cta: { label: "Vote", href: "/hot-seat" },
    reactions: [{ emoji: "👀", count: 4 }],
  },
  {
    id: "f11",
    kind: "event-lock",
    ago: relAgo(60 * 26),
    ts: NOW_MS - 26 * 3_600_000,
    title: "Kentucky Derby · entries open",
    body: "20-horse field locks Saturday at 1:00pm ET. Pick 3.",
    meta: "Tier 2 · 2.5x · May 2",
    cta: { label: "Make picks", href: "/events/2026-kentucky-derby/entry" },
  },
  {
    id: "f12",
    kind: "pick",
    ago: relAgo(60 * 100),
    ts: NOW_MS - 100 * 3_600_000,
    by: "vobe",
    title: "Vobe drafted Brian Harman",
    meta: "Round 5 · Masters draft · pick 5/6",
  },
  {
    id: "f13",
    kind: "system",
    ago: relAgo(60 * 26 + 30),
    ts: NOW_MS - 26 * 3_600_000 - 30 * 60_000,
    title: "Round 3 underway at Augusta · 50 made the cut",
  },
];

const FILTERS: Array<{ id: "all" | FeedKind; label: string }> = [
  { id: "all",         label: "All" },
  { id: "take",        label: "Hot takes" },
  { id: "score",       label: "Scores" },
  { id: "bonus",       label: "Bonuses" },
  { id: "standings",   label: "Standings" },
  { id: "hot-seat",    label: "Hot Seat" },
  { id: "event-lock",  label: "Events" },
  { id: "pick",        label: "Picks" },
];

const REACTIONS = ["🔥", "🫣", "😭", "🤯", "💀", "🚀"];

function drafterBySlug(slug: string): Drafter | undefined {
  return DRAFTERS.find((d) => d.slug === slug);
}

function Avatar({ drafter, size = "md" }: { drafter: Drafter; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-[11px]";
  return (
    <div
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ background: drafter.tint }}
      aria-label={drafter.name}
    >
      {drafter.initials}
    </div>
  );
}

function FeedCard({
  item,
  onReact,
  reacted,
}: {
  item: FeedItem;
  onReact: (id: string, emoji: string) => void;
  reacted?: string;
}) {
  const theme = KIND_THEMES[item.kind];
  const author = item.by ? drafterBySlug(item.by) : undefined;
  const threadAuthor = item.thread ? drafterBySlug(item.thread.by) : undefined;

  return (
    <article className="soft-card relative overflow-hidden rounded-[1.25rem] border bg-surface/80">
      <div className={`absolute inset-y-0 left-0 w-1 ${theme.rail}`} aria-hidden="true" />
      <div className="pl-3">
        <div className="flex items-start gap-3 px-4 pt-3.5">
          <div
            className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${theme.iconBg}`}
            aria-hidden="true"
          >
            {theme.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.chip}`}>
                {theme.label}
              </span>
              {author && (
                <div className="flex items-center gap-1.5">
                  <Avatar drafter={author} size="sm" />
                  <span className="text-xs font-semibold text-text">{author.name}</span>
                </div>
              )}
              <span className="text-[10px] uppercase tracking-wide text-muted">{item.ago} ago</span>
            </div>
            <div className="mt-2 text-sm font-semibold leading-snug text-info sm:text-base">
              {item.title}
            </div>
            {item.body && (
              <div className="mt-1 text-sm leading-relaxed text-text">{item.body}</div>
            )}
            {item.meta && (
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">{item.meta}</div>
            )}
          </div>
        </div>

        {item.thread && threadAuthor && (
          <div className="mx-4 mt-3 rounded-xl border border-border/40 bg-bg/60 px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted">↳ reply</span>
              <Avatar drafter={threadAuthor} size="sm" />
              <span className="font-semibold text-text">{threadAuthor.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted">{item.thread.ago} ago</span>
            </div>
            <div className="mt-1 text-sm text-text">{item.thread.text}</div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(item.reactions ?? []).map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-bg/60 px-2 py-0.5 text-xs"
              >
                <span>{r.emoji}</span>
                <span className="text-muted">{r.count}</span>
              </span>
            ))}
            {reacted && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-xs text-accent">
                <span>{reacted}</span>
                <span>you</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {REACTIONS.slice(0, 5).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(item.id, emoji)}
                className={[
                  "rounded-md px-1.5 py-0.5 text-[14px] transition-transform hover:scale-110",
                  reacted === emoji ? "bg-accent/15" : "opacity-50 hover:opacity-100",
                ].join(" ")}
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            {item.cta && (
              <Link
                href={item.cta.href}
                className="ml-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
              >
                {item.cta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TimelinePrototype() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | FeedKind>("all");
  const [reactedByMsg, setReactedByMsg] = useState<Record<string, string>>({});
  const [refreshFlash, setRefreshFlash] = useState(false);

  useRequireEntrant({ ready: authed !== null, entrant: authed ? { is_admin: false } : null });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) setAuthed(Boolean(json?.entrant));
      } catch {
        if (!cancelled) setAuthed(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const sorted = FEED.slice().sort((a, b) => b.ts - a.ts);
    if (activeFilter === "all") return sorted;
    return sorted.filter((item) => item.kind === activeFilter);
  }, [activeFilter]);

  function tapReaction(id: string, emoji: string) {
    setReactedByMsg((prev) => ({ ...prev, [id]: emoji }));
  }

  function pretendRefresh() {
    setRefreshFlash(true);
    window.setTimeout(() => setRefreshFlash(false), 1400);
  }

  return (
    <main className="space-y-4">
      {/* Header */}
      <section className="soft-card rounded-[1.5rem] border bg-surface/70 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Timeline</p>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">What&rsquo;s happening</h1>
            <p className="mt-1 text-xs text-muted">
              Every pick, score, take, and bonus across the season — newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={pretendRefresh}
            aria-label="Refresh feed"
            className={[
              "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-surface/60 text-muted transition-all hover:bg-surface hover:text-text",
              refreshFlash ? "animate-spin text-accent" : "",
            ].join(" ")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3.5-7.1" />
              <path d="M21 4v6h-6" />
            </svg>
          </button>
        </div>
        {refreshFlash && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Fresh — 2 new since you scrolled
          </div>
        )}
      </section>

      {/* Sticky filter chips */}
      <div className="sticky top-2 z-10 -mx-1 px-1">
        <nav
          aria-label="Filter feed"
          className="soft-card overflow-x-auto rounded-[1rem] border bg-surface/95 p-1 backdrop-blur-xl"
        >
          <div className="flex min-w-max gap-1">
            {FILTERS.map((f) => {
              const active = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  aria-pressed={active}
                  className={[
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-accent text-white"
                      : "text-muted hover:bg-surface/70 hover:text-text",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Feed */}
      <section className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-surface/60 p-6 text-center text-sm text-muted">
            Nothing in this filter yet. Try a different one.
          </div>
        ) : (
          filtered.map((item) => (
            <FeedCard
              key={item.id}
              item={item}
              onReact={tapReaction}
              reacted={reactedByMsg[item.id]}
            />
          ))
        )}
      </section>

      {/* End */}
      <div className="border-t border-border/20 pt-4 text-center text-[10px] uppercase tracking-[0.2em] text-muted">
        End of feed · Timeline prototype · Direction 2 of 5 ·{" "}
        <Link href="/ux" className="text-accent underline-offset-4 hover:underline">
          compare
        </Link>
      </div>
    </main>
  );
}
