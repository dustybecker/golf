"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/*
 * DIRECTION 5 — LOUNGE  (Clubhouse 75 / Scoreboard 25)
 *
 * Chat-first. The full Clubhouse channel-and-messages experience occupies
 * most of the screen — but a thin scoreboard strip is pinned to the top of
 * the active channel, always in view as you scroll. You're in the room;
 * you can glance up and see the live numbers without leaving.
 *
 * Discord with a permanent scoreboard pinned at the top.
 */

type Drafter = {
  slug: string;
  name: string;
  initials: string;
  tint: string;
  isMe?: boolean;
};

const DRAFTERS: Drafter[] = [
  { slug: "chris", name: "Chris", initials: "CH", tint: "#d77a3a" },
  { slug: "dusty", name: "Dusty", initials: "DU", tint: "#2f9e44", isMe: true },
  { slug: "vobe",  name: "Vobe",  initials: "VO", tint: "#4c6ef5" },
  { slug: "cody",  name: "Cody",  initials: "CO", tint: "#e03131" },
  { slug: "wes",   name: "Wes",   initials: "WE", tint: "#e8a82a" },
  { slug: "dan",   name: "Dan",   initials: "DA", tint: "#a855c7" },
  { slug: "thom",  name: "Thom",  initials: "TH", tint: "#0ea5e9" },
  { slug: "rod",   name: "Rod",   initials: "RO", tint: "#14b8a6" },
  { slug: "nate",  name: "Nate",  initials: "NA", tint: "#64748b" },
];

function drafterBySlug(slug: string) {
  return DRAFTERS.find((d) => d.slug === slug);
}

function Avatar({ drafter, size = "md" }: { drafter: Drafter; size?: "xs" | "sm" | "md" }) {
  const dim =
    size === "xs"
      ? "h-5 w-5 text-[8px]"
      : size === "sm"
        ? "h-6 w-6 text-[9px]"
        : "h-8 w-8 text-[10px]";
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

// -- Channel + message data --

const NOW = Date.now();
const mins = (n: number) => NOW - n * 60_000;
const hrs = (n: number) => NOW - n * 3_600_000;

function formatAgo(ts: number): string {
  const m = Math.round((NOW - ts) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

type Reaction = { emoji: string; count: number };

type ChatMsg =
  | { kind: "system"; id: string; ts: number; text: string }
  | { kind: "text"; id: string; ts: number; by: string; text: string; replyTo?: string; reactions?: Reaction[] }
  | { kind: "score"; id: string; ts: number; golfer: string; headline: string; detail: string; drafter: string }
  | { kind: "bonus"; id: string; ts: number; title: string; detail: string; reactions?: Reaction[] };

type Channel = {
  id: string;
  handle: string;
  description: string;
  unread: number;
  accent: string;
};

const CHANNELS: Channel[] = [
  { id: "general",   handle: "#general",   description: "Season-wide catch-all",   unread: 0,  accent: "#64748b" },
  { id: "masters",   handle: "#masters",   description: "Live Round 3",            unread: 12, accent: "#2f9e44" },
  { id: "derby",     handle: "#derby",     description: "Opens May 2",             unread: 2,  accent: "#be185d" },
  { id: "hot-takes", handle: "#hot-takes", description: "No takes too hot",        unread: 5,  accent: "#ea580c" },
];

const PRESENCE: Record<string, string[]> = {
  general:    ["chris", "dusty", "wes", "rod"],
  masters:    ["chris", "dusty", "vobe", "cody", "wes", "dan"],
  derby:      ["vobe", "thom"],
  "hot-takes": ["chris", "dusty", "vobe", "cody", "dan"],
};

const MESSAGES: Record<string, ChatMsg[]> = {
  general: [
    { kind: "system", id: "g1", ts: hrs(26), text: "Week 14 of the season" },
    { kind: "text", id: "g2", ts: hrs(25), by: "chris", text: "tee times for Sunday just posted. Scheffler 2:45 with Rory" },
    { kind: "text", id: "g3", ts: hrs(6),  by: "rod", text: "who else is thinking about Derby? haven't even looked yet" },
  ],
  masters: [
    { kind: "system", id: "m1", ts: hrs(7), text: "Round 3 underway · 50 made the cut" },
    { kind: "text", id: "m2", ts: hrs(2), by: "wes", text: "Aberg + Morikawa both top-5. Bank it.", reactions: [{ emoji: "💰", count: 3 }] },
    { kind: "score", id: "m3", ts: hrs(2), golfer: "Rory McIlroy", headline: "Eagle on 8", detail: "-9 thru 8 · jumps to 2nd", drafter: "Dusty" },
    { kind: "text", id: "m4", ts: mins(90), by: "dusty", text: "Rory eagle on 8 🚀", reactions: [{ emoji: "🚀", count: 4 }, { emoji: "☘️", count: 2 }] },
    { kind: "text", id: "m5", ts: mins(72), by: "chris", text: "Scheffler doing Scheffler things", reactions: [{ emoji: "🐐", count: 5 }] },
    { kind: "text", id: "m6", ts: mins(60), by: "vobe", text: "DeChambeau bombing 400+ off every tee. Can he make a putt today tho", reactions: [{ emoji: "😂", count: 3 }] },
    { kind: "text", id: "m7", ts: mins(38), by: "thom", text: "Rahm WD has me spiraling", reactions: [{ emoji: "💀", count: 7 }] },
    { kind: "text", id: "m8", ts: mins(35), by: "chris", text: "the curse continues", replyTo: "m7" },
    { kind: "bonus", id: "m9", ts: mins(22), title: "Survivor → Dusty +6", detail: "All 6 of his Masters golfers made the cut.", reactions: [{ emoji: "🎉", count: 5 }] },
    { kind: "score", id: "m10", ts: mins(12), golfer: "Robert Macintyre", headline: "Birdie 17", detail: "-5 thru 17 · ↑ Cody 6th → 4th", drafter: "Cody" },
    { kind: "text", id: "m11", ts: mins(10), by: "cody", text: "MACINTYRE LET'S GOOOOO", reactions: [{ emoji: "🔥", count: 6 }, { emoji: "🏴", count: 4 }] },
    { kind: "text", id: "m12", ts: mins(3), by: "dusty", text: "ok so if Rory holds and Scheffler blows up on Sunday…", reactions: [{ emoji: "🙏", count: 2 }] },
  ],
  derby: [
    { kind: "system", id: "d1", ts: hrs(72), text: "#derby opened · 10 days to post" },
    { kind: "text", id: "d2", ts: hrs(48), by: "thom", text: "who do we like so far" },
    { kind: "text", id: "d3", ts: hrs(40), by: "vobe", text: "I've got a few longshots circled. waiting on the draw" },
  ],
  "hot-takes": [
    { kind: "text", id: "h1", ts: hrs(12), by: "cody", text: "everyone is sleeping on Macintyre", reactions: [{ emoji: "👀", count: 4 }] },
    { kind: "text", id: "h2", ts: hrs(6),  by: "vobe", text: "DeChambeau goes -7 on Sunday. mark it.", reactions: [{ emoji: "🫣", count: 5 }] },
    { kind: "text", id: "h3", ts: hrs(3),  by: "chris", text: "Scheffler +350 pre-tournament was daylight robbery" },
  ],
};

// -- The pinned scoreboard strip per channel (the 25%) --

type ScoreboardChip = { label: string; value: string; tone?: "good" | "bad" | "neutral" };

const SCOREBOARD_BY_CHANNEL: Record<string, ScoreboardChip[]> = {
  general: [
    { label: "Live", value: "Masters R3", tone: "neutral" },
    { label: "Pool leader", value: "Chris -18", tone: "good" },
    { label: "Next event", value: "Derby · 11d" },
    { label: "Bonuses · season", value: "+18 / 4" },
  ],
  masters: [
    { label: "Leader", value: "Scheffler -11", tone: "good" },
    { label: "Chasing", value: "Rory -9" },
    { label: "Pool top", value: "Chris -18" },
    { label: "You", value: "Dusty -11 · 3rd", tone: "good" },
    { label: "Cut line", value: "+3 · 50 made" },
  ],
  derby: [
    { label: "Lock", value: "Sat 1pm ET" },
    { label: "Field", value: "20 horses" },
    { label: "Picks", value: "3 each" },
    { label: "Tier", value: "2 · 2.5×" },
    { label: "Days to post", value: "11" },
  ],
  "hot-takes": [
    { label: "Hottest take", value: "Cody · 🔥 6" },
    { label: "Most divisive", value: "Vobe · DeChambeau" },
    { label: "Pool gap", value: "Chris ↔ Wes · 6" },
    { label: "Live", value: "Masters R3", tone: "neutral" },
  ],
};

// -- Components --

const REACTIONS = ["🔥", "🫣", "😭", "💀", "🚀"];

function ReactionRow({ list, you, onTap }: { list: Reaction[]; you?: string; onTap: (emoji: string) => void }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {list.map((r) => (
        <span key={r.emoji} className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-bg/60 px-2 py-0.5 text-xs">
          <span>{r.emoji}</span>
          <span className="text-muted">{r.count}</span>
        </span>
      ))}
      {you && (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-xs text-accent">
          <span>{you}</span>
          <span>you</span>
        </span>
      )}
      <div className="flex items-center gap-0.5 pl-1">
        {REACTIONS.slice(0, 4).map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onTap(emoji)}
            className="rounded-md px-1 text-sm opacity-40 transition-opacity hover:opacity-100"
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBlock({
  msg,
  replyTargetAuthor,
  onReact,
  youReacted,
}: {
  msg: ChatMsg;
  replyTargetAuthor?: Drafter;
  onReact: (id: string, emoji: string) => void;
  youReacted?: string;
}) {
  if (msg.kind === "system") {
    return (
      <div className="my-2 flex justify-center">
        <div className="rounded-full border border-border/40 bg-bg/50 px-3 py-1 text-[11px] uppercase tracking-wide text-muted">
          {msg.text} · {formatAgo(msg.ts)} ago
        </div>
      </div>
    );
  }
  if (msg.kind === "text") {
    const author = drafterBySlug(msg.by);
    if (!author) return null;
    return (
      <div className="flex gap-3 px-2 py-1.5 hover:bg-surface/40">
        <div className="pt-0.5"><Avatar drafter={author} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-info">{author.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted">{formatAgo(msg.ts)} ago</span>
          </div>
          {msg.replyTo && replyTargetAuthor && (
            <div className="mt-0.5 border-l-2 border-border pl-2 text-[11px] text-muted">
              replying to {replyTargetAuthor.name}
            </div>
          )}
          <div className="mt-0.5 text-sm leading-snug text-text">{msg.text}</div>
          <ReactionRow list={msg.reactions ?? []} you={youReacted} onTap={(e) => onReact(msg.id, e)} />
        </div>
      </div>
    );
  }
  if (msg.kind === "score") {
    return (
      <div className="my-1.5 px-2">
        <div className="overflow-hidden rounded-xl border-l-4 border-emerald-500 bg-emerald-500/5">
          <div className="flex items-start gap-3 px-3 py-2.5">
            <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-base">⛳</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Score</span>
                <span className="text-[10px] uppercase tracking-wide text-muted">{formatAgo(msg.ts)} ago</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-info">{msg.golfer} · {msg.headline}</div>
              <div className="mt-0.5 text-xs text-text">{msg.detail}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">drafted by {msg.drafter}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (msg.kind === "bonus") {
    return (
      <div className="my-1.5 px-2">
        <div className="overflow-hidden rounded-xl border-l-4 border-amber-500 bg-amber-500/5">
          <div className="flex items-start gap-3 px-3 py-2.5">
            <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-base">🏆</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">Bonus</span>
                <span className="text-[10px] uppercase tracking-wide text-muted">{formatAgo(msg.ts)} ago</span>
              </div>
              <div className="mt-1 text-sm font-semibold text-info">{msg.title}</div>
              <div className="mt-0.5 text-xs text-text">{msg.detail}</div>
              <ReactionRow list={msg.reactions ?? []} you={youReacted} onTap={(e) => onReact(msg.id, e)} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// -- Pinned scoreboard strip --

function ScoreboardStrip({ chips }: { chips: ScoreboardChip[] }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 py-1">
      <div className="flex min-w-max gap-2">
        {chips.map((c) => {
          const tone =
            c.tone === "good"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
              : c.tone === "bad"
                ? "border-danger/30 bg-danger/5 text-danger"
                : "border-border/40 bg-bg/60 text-text";
          return (
            <div
              key={c.label}
              className={`inline-flex flex-col rounded-lg border px-3 py-1.5 ${tone}`}
            >
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">{c.label}</span>
              <span className="mt-0.5 text-sm font-semibold tabular-nums">{c.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function LoungePrototype() {
  const [activeChannel, setActiveChannel] = useState("masters");
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [composer, setComposer] = useState("");

  const channel = CHANNELS.find((c) => c.id === activeChannel) ?? CHANNELS[0];
  const messages = MESSAGES[activeChannel] ?? [];
  const presence = useMemo(() => {
    const slugs = PRESENCE[activeChannel] ?? [];
    return slugs.map((s) => drafterBySlug(s)).filter((d): d is Drafter => Boolean(d));
  }, [activeChannel]);
  const stripChips = SCOREBOARD_BY_CHANNEL[activeChannel] ?? [];

  function tapReaction(msgId: string, emoji: string) {
    setReactions((prev) => ({ ...prev, [msgId]: emoji }));
  }

  return (
    <main className="space-y-3">
      {/* Channel pills */}
      <nav
        aria-label="Channels"
        className="soft-card -mx-1 overflow-x-auto rounded-[1.25rem] border bg-surface/80 p-1.5 backdrop-blur-xl"
      >
        <div className="flex min-w-max items-center gap-1.5">
          {CHANNELS.map((c) => {
            const active = activeChannel === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveChannel(c.id)}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${active ? "border-transparent bg-accent text-white shadow-[0_8px_18px_rgba(99,91,255,0.25)]" : "border-transparent bg-surface/60 text-text hover:bg-surface"}`}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: active ? "rgba(255,255,255,0.9)" : c.accent }} />
                <span>{c.handle}</span>
                {!active && c.unread > 0 && (
                  <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent/20 px-1.5 text-[10px] font-bold text-accent">
                    {c.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Channel header + pinned scoreboard strip (the 25%) */}
      <section className="sticky top-2 z-10">
        <div className="soft-card rounded-[1.25rem] border bg-surface/95 px-3 py-3 backdrop-blur-xl sm:px-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: channel.accent }} />
                <h1 className="text-base font-semibold text-info">{channel.handle}</h1>
                <span className="text-xs text-muted">· {channel.description}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {presence.slice(0, 5).map((d) => <Avatar key={d.slug} drafter={d} size="xs" />)}
              {presence.length > 5 && <span className="text-[10px] text-muted">+{presence.length - 5}</span>}
              <span className="ml-1 text-[10px] uppercase tracking-wide text-muted">{presence.length} here</span>
            </div>
          </div>
          {/* The 25% — context-aware scoreboard pinned to the channel */}
          <div className="mt-2 border-t border-border/20 pt-2">
            <ScoreboardStrip chips={stripChips} />
          </div>
        </div>
      </section>

      {/* The 75% — chat stream */}
      <section className="soft-card rounded-[1.5rem] border bg-surface/60 py-2 backdrop-blur-xl">
        {messages.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">Nothing in {channel.handle} yet.</div>
        ) : (
          <ul className="space-y-0.5">
            {messages.map((msg) => {
              const replyId = msg.kind === "text" && msg.replyTo ? msg.replyTo : undefined;
              const replyTarget = replyId ? messages.find((m) => m.id === replyId) : undefined;
              const replyAuthor = replyTarget && replyTarget.kind === "text" ? drafterBySlug(replyTarget.by) : undefined;
              return (
                <li key={msg.id}>
                  <MessageBlock
                    msg={msg}
                    replyTargetAuthor={replyAuthor}
                    onReact={tapReaction}
                    youReacted={reactions[msg.id]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Composer */}
      <section className="soft-card sticky bottom-2 rounded-[1.5rem] border bg-surface/95 p-2 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder={`Message ${channel.handle}…`}
            rows={1}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-border/40 bg-bg/60 px-3.5 py-2.5 text-sm focus:border-accent/50 focus:outline-none"
          />
          {REACTIONS.slice(0, 3).map((e) => (
            <button key={e} type="button" className="rounded-lg px-1.5 py-1 text-base hover:scale-110" aria-label={`Send ${e}`}>{e}</button>
          ))}
          <button
            type="button"
            disabled={!composer.trim()}
            className="h-[44px] shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </section>

      <div className="text-center text-[10px] uppercase tracking-[0.2em] text-muted">
        Lounge prototype · Direction 5 of 5 ·{" "}
        <Link href="/ux" className="text-accent underline-offset-4 hover:underline">
          compare
        </Link>
      </div>
    </main>
  );
}
