"use client";

import { useEffect, useState } from "react";

export function useAutoRefreshValue(intervalMs: number) {
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (intervalMs <= 0) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setRefreshTick((value) => value + 1);
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs]);

  return refreshTick;
}

export function formatLastUpdated(date: Date | null) {
  if (!date) return "Waiting for first refresh";
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
