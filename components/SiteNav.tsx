"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/season/2026", label: "Season" },
  { href: "/calendar", label: "Calendar" },
  { href: "/hot-seat", label: "Hot Seat" },
  { href: "/draft", label: "Draft" },
  { href: "/leaderboard", label: "Player Leaderboard" },
  { href: "/tournament", label: "Tournament Leaderboard" },
  { href: "/preferences", label: "Notifications" },
  { href: "/admin", label: "Admin" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="panel-chrome soft-card mb-6 rounded-[1.75rem] border px-4 py-3">
      <div className="mb-3 flex flex-col gap-3 border-b border-border/20 px-1 pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-muted">The 2026 Ultimate Sports Decathlon</div>
          <div className="text-lg font-semibold text-info">Clubhouse Console</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden text-xs text-muted md:block">
            Structured draft, scoring, and admin operations
          </div>
          <ThemeToggle />
        </div>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200",
                  active
                    ? "border-accent/20 bg-accent text-white shadow-[0_10px_24px_rgba(99,91,255,0.22)]"
                    : "border-transparent bg-surface/35 text-text hover:bg-surface/60",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
