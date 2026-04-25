// Deterministic avatar tint per entrant slug or display name. Anything
// presence-rendered uses this so the same person looks the same across pages.

const PALETTE = [
  "#d77a3a",
  "#2f9e44",
  "#4c6ef5",
  "#e03131",
  "#e8a82a",
  "#a855c7",
  "#0ea5e9",
  "#14b8a6",
  "#64748b",
  "#be185d",
  "#16a34a",
  "#ea580c",
];

function hashKey(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function tintFor(key: string): string {
  return PALETTE[hashKey(key) % PALETTE.length];
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
