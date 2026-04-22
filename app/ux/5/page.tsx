"use client";

import Link from "next/link";

/*
 * DIRECTION 5 — BROADSHEET
 *
 * Magazine cover. Serif headlines. Editorial cards. A calm register
 * that says "sit down with your coffee" instead of "live data feed."
 *
 * The content is the same season you've seen in the other four
 * prototypes — same draft picks, same scores, same bonuses — but
 * composed like a Sunday paper: a top story, two featured pieces,
 * a pull-quote from the chat, a numbers column, weekend reads,
 * and standings typeset as a sidebar.
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

function formatToPar(value: number): string {
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : `${value}`;
}

// ---------------------------------------------------------------------------

function IssueHeader() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <section className="border-b border-border/40 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-serif text-[10px] uppercase tracking-[0.3em] text-muted">
            The Surge &middot; Issue 14
          </div>
          <div className="mt-1 font-serif text-3xl font-bold leading-none text-info sm:text-4xl">
            The Weekend Edition
          </div>
        </div>
        <div className="text-right">
          <div className="font-serif text-[10px] uppercase tracking-[0.28em] text-muted">
            {today}
          </div>
          <div className="mt-1 text-xs text-muted">2026 Decathlon · Round 3 Saturday</div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function TopStory() {
  return (
    <article className="soft-card overflow-hidden rounded-[1.5rem] border bg-surface/70">
      {/* Illustration area — gradient + serif typographic fill, no stock photo needed */}
      <div
        className="relative h-56 overflow-hidden sm:h-72 md:h-80"
        style={{
          background:
            "radial-gradient(circle at 22% 80%, rgba(47, 158, 68, 0.35), transparent 48%)," +
            "radial-gradient(circle at 82% 18%, rgba(245, 193, 28, 0.28), transparent 44%)," +
            "linear-gradient(135deg, #12342a 0%, #0b2a22 55%, #142a2c 100%)",
        }}
      >
        <div className="absolute inset-0 [background-image:linear-gradient(transparent_95%,rgba(255,255,255,0.05)_95%),linear-gradient(90deg,transparent_95%,rgba(255,255,255,0.05)_95%)] [background-size:48px_48px]" />
        <div className="relative flex h-full items-end p-6 sm:p-8">
          <div>
            <div className="font-serif text-[10px] uppercase tracking-[0.3em] text-[#f5c11c]">
              The Front Page &middot; Golf
            </div>
            <div className="mt-2 font-serif text-[52px] font-bold leading-[0.88] text-white sm:text-[72px]">
              -11
            </div>
            <div className="mt-1 font-serif text-sm italic text-white/70">
              Scheffler, through three
            </div>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-7">
        <div className="font-serif text-[10px] uppercase tracking-[0.28em] text-muted">
          Moving Day &middot; 22 minutes ago &middot; 3 min read
        </div>
        <h2 className="mt-3 font-serif text-3xl font-bold leading-[1.05] text-info sm:text-4xl">
          Scheffler&rsquo;s moving day is everyone else&rsquo;s math problem.
        </h2>
        <p className="mt-3 text-sm leading-7 text-text sm:text-base">
          The leader sits at -11 with a two-shot cushion on McIlroy, who found an eagle on 8
          and immediately handed two back in the teeth of Amen Corner. DeChambeau is chasing
          loudly, Macintyre is chasing quietly, and nine of you have spent the afternoon
          re-running the math on a Sunday that looks like it already has a winner.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-bg/60 px-2 py-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live &middot; round 3
          </span>
          <span>50 made the cut</span>
          <span>·</span>
          <span>Chris leads the pool at -18</span>
          <span>·</span>
          <Link href="/ux/1" className="font-semibold text-accent underline-offset-4 hover:underline">
            Read on →
          </Link>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------

function FeaturedCards() {
  const cards = [
    {
      kicker: "The Survivor",
      kickerColor: "text-amber-700",
      kickerBg: "bg-amber-500/15",
      headline: "All six made the cut. Dusty gets the +6.",
      dek: "The Survivor bonus auto-applied at the cut line Friday evening. It&rsquo;s the first time in two years a drafter&rsquo;s full squad has made the weekend at Augusta.",
      byline: "Dusty · Masters · Tier 3 · 5×",
      gradient:
        "linear-gradient(135deg, #d4a017 0%, #c17b15 45%, #5a3012 100%)",
      numeral: "+6",
    },
    {
      kicker: "The Spiral",
      kickerColor: "text-pink-700",
      kickerBg: "bg-pink-500/15",
      headline: "Rahm&rsquo;s WD has Thom doing the math out loud.",
      dek: "Round-one 74, round-two withdrawal, and a quiet eighth-place pool slot that was supposed to be a third. The curse, it turns out, continues.",
      byline: "Thom · Masters · Hot take",
      gradient:
        "linear-gradient(135deg, #b83b6f 0%, #5f1933 50%, #1a0510 100%)",
      numeral: "💀",
    },
  ];
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {cards.map((c) => (
        <article key={c.headline} className="soft-card overflow-hidden rounded-[1.25rem] border bg-surface/70">
          <div
            className="relative flex h-36 items-end overflow-hidden px-5 py-4 sm:h-40"
            style={{ background: c.gradient }}
          >
            <div className="absolute inset-0 [background-image:linear-gradient(transparent_95%,rgba(255,255,255,0.08)_95%)] [background-size:100%_32px]" />
            <div className="relative font-serif text-5xl font-bold leading-none text-white/90 sm:text-6xl">
              {c.numeral}
            </div>
          </div>
          <div className="p-5">
            <span
              className={`inline-flex rounded-md px-2 py-0.5 font-serif text-[10px] font-semibold uppercase tracking-[0.22em] ${c.kickerBg} ${c.kickerColor}`}
            >
              {c.kicker}
            </span>
            <h3
              className="mt-3 font-serif text-xl font-bold leading-[1.15] text-info"
              dangerouslySetInnerHTML={{ __html: c.headline }}
            />
            <p
              className="mt-2 text-sm leading-6 text-text"
              dangerouslySetInnerHTML={{ __html: c.dek }}
            />
            <div className="mt-3 font-serif text-[11px] uppercase tracking-[0.18em] text-muted">
              {c.byline}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------

function PullQuote() {
  return (
    <section className="relative px-4 py-8 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute left-0 top-0 font-serif text-[120px] leading-none text-accent/20 sm:text-[160px]">
        &ldquo;
      </div>
      <blockquote className="relative mx-auto max-w-2xl text-center">
        <p className="font-serif text-2xl leading-[1.3] text-info sm:text-3xl md:text-4xl">
          ok so if Rory holds and Scheffler blows up on Sunday&hellip;
        </p>
        <footer className="mt-5 font-serif text-xs uppercase tracking-[0.28em] text-muted">
          Dusty &middot; 3 minutes ago &middot; #masters
        </footer>
      </blockquote>
    </section>
  );
}

// ---------------------------------------------------------------------------

function NumbersColumn() {
  const rows = [
    { label: "Pool points through Masters R3", value: "-18", meta: "Chris" },
    { label: "Bonuses awarded this season", value: "4", meta: "+18 pts total" },
    { label: "Avg points per event", value: "27.4", meta: "Season-wide" },
    { label: "Fewest picks in top 10", value: "0", meta: "Nate &middot; Masters" },
    { label: "Most 🔥 on a message", value: "10", meta: "Cody · Macintyre" },
  ];
  return (
    <section className="soft-card rounded-[1.25rem] border bg-surface/70 p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-lg font-bold text-info">By the numbers</h3>
        <span className="font-serif text-[10px] uppercase tracking-[0.28em] text-muted">
          Week 14 &middot; 2026
        </span>
      </div>
      <ol className="divide-y divide-border/30">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-4 py-3">
            <div className="min-w-0 flex-1">
              <div
                className="text-sm leading-snug text-text"
                dangerouslySetInnerHTML={{ __html: r.label }}
              />
              <div
                className="mt-0.5 text-[11px] text-muted"
                dangerouslySetInnerHTML={{ __html: r.meta }}
              />
            </div>
            <div className="shrink-0 font-serif text-2xl font-bold tabular-nums text-info sm:text-3xl">
              {r.value}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------

function WeekendReads() {
  const reads = [
    {
      kicker: "Next up",
      title: "Your three horses for the Derby post.",
      dek: "Post positions land Wednesday. Entries lock Saturday 1pm ET.",
      time: "11 days &middot; 4 min read",
      href: "/events/2026-kentucky-derby",
    },
    {
      kicker: "Hot Seat",
      title: "Thom is up. Scheffler outright. +400.",
      dek: "Veto deadline Monday 5pm Pacific. Dan pushed back; Vobe approved; Dan folded.",
      time: "18 hours ago &middot; 2 min read",
      href: "/hot-seat",
    },
    {
      kicker: "The Calendar",
      title: "What&rsquo;s on deck after Augusta.",
      dek: "Two tier-2s, one tier-3 inside the next 60 days. The Kentucky Derby headlines in May.",
      time: "Season &middot; 3 min read",
      href: "/calendar",
    },
  ];
  return (
    <section className="soft-card rounded-[1.25rem] border bg-surface/70 p-5 sm:p-6">
      <h3 className="mb-4 font-serif text-lg font-bold text-info">Weekend reads</h3>
      <ul className="divide-y divide-border/30">
        {reads.map((r) => (
          <li key={r.title} className="py-4 first:pt-0 last:pb-0">
            <Link href={r.href} className="block group">
              <div className="font-serif text-[10px] uppercase tracking-[0.28em] text-accent">
                {r.kicker}
              </div>
              <div
                className="mt-1 font-serif text-lg font-bold leading-tight text-info group-hover:underline"
                dangerouslySetInnerHTML={{ __html: r.title }}
              />
              <p
                className="mt-1 text-sm leading-6 text-text"
                dangerouslySetInnerHTML={{ __html: r.dek }}
              />
              <div
                className="mt-2 font-serif text-[10px] uppercase tracking-[0.2em] text-muted"
                dangerouslySetInnerHTML={{ __html: r.time }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

function PoolColumn() {
  const rows: { rank: number; slug: string; total: number }[] = [
    { rank: 1, slug: "chris", total: -18 },
    { rank: 2, slug: "wes",   total: -12 },
    { rank: 3, slug: "dusty", total: -11 },
    { rank: 4, slug: "dan",   total: -8 },
    { rank: 5, slug: "cody",  total: -7 },
    { rank: 6, slug: "vobe",  total: -4 },
    { rank: 7, slug: "thom",  total: -2 },
    { rank: 8, slug: "rod",   total: +1 },
    { rank: 9, slug: "nate",  total: +4 },
  ];
  return (
    <section className="soft-card rounded-[1.25rem] border bg-surface/70 p-5 sm:p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-serif text-lg font-bold text-info">The Standings</h3>
        <Link
          href="/leaderboard"
          className="font-serif text-[10px] uppercase tracking-[0.28em] text-accent underline-offset-4 hover:underline"
        >
          Scorecards
        </Link>
      </div>
      <ol className="divide-y divide-border/30">
        {rows.map((r) => {
          const d = drafterBySlug(r.slug);
          if (!d) return null;
          return (
            <li
              key={r.slug}
              className={[
                "flex items-center gap-3 py-2.5 font-serif",
                d.isMe ? "text-accent" : "text-text",
              ].join(" ")}
            >
              <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-muted">
                {r.rank}.
              </span>
              <span className="flex-1 truncate text-base font-semibold">{d.name}</span>
              <span className="shrink-0 text-base font-bold tabular-nums">
                {formatToPar(r.total)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Endnotes() {
  return (
    <section className="border-t border-border/40 pt-5">
      <div className="font-serif text-[10px] uppercase tracking-[0.28em] text-muted">Endnotes</div>
      <ul className="mt-3 space-y-2 text-xs text-muted sm:columns-2">
        <li>
          <span className="font-semibold text-text">Draft opens</span> for the PGA Championship
          on May 13 at 7:00 PM PT. Nine entrants, six picks, snake order.
        </li>
        <li>
          <span className="font-semibold text-text">Kentucky Derby entries</span> lock Saturday
          May 2 at 1:00 PM ET. Pick three. Best-finish scoring; second-best breaks ties.
        </li>
        <li>
          <span className="font-semibold text-text">Veto window</span> for Thom&rsquo;s Hot Seat
          take closes Monday 5:00 PM PT. Zero vetos so far.
        </li>
        <li>
          <span className="font-semibold text-text">Rod and Nate</span> have not checked in since
          Friday evening. Worth a nudge.
        </li>
      </ul>
      <div className="mt-6 text-center font-serif text-[10px] uppercase tracking-[0.3em] text-muted">
        The Surge &middot; A private Sunday paper for nine friends.
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export default function BroadsheetPrototype() {
  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <IssueHeader />
      <TopStory />
      <FeaturedCards />
      <PullQuote />
      <section className="grid gap-4 md:grid-cols-[1.1fr,0.9fr]">
        <NumbersColumn />
        <PoolColumn />
      </section>
      <WeekendReads />
      <Endnotes />

      <div className="pt-2 text-center font-serif text-[10px] uppercase tracking-[0.2em] text-muted">
        Broadsheet prototype · Direction 5 of 5 ·{" "}
        <Link href="/ux" className="text-accent underline-offset-4 hover:underline">
          compare all five
        </Link>
      </div>
    </main>
  );
}
