"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const currentTheme: Theme =
    mounted && document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : theme;

  function toggleTheme() {
    const next = currentTheme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={[
        "rounded-md border px-3 py-2 text-xs font-semibold transition-all",
        "border-border bg-bg/80 text-text hover:border-accent/70 hover:text-accent",
      ].join(" ")}
      aria-label="Toggle light and dark mode"
    >
      {mounted ? (currentTheme === "dark" ? "Dark Mode" : "Light Mode") : "Theme"}
    </button>
  );
}
