export type TournamentSlug =
  | "masters"
  | "pga-championship"
  | "us-open"
  | "the-open";

export type TournamentOption = {
  slug: TournamentSlug;
  label: string;
};

export const TOURNAMENTS: TournamentOption[] = [
  { slug: "masters", label: "The Masters" },
  { slug: "pga-championship", label: "PGA Championship" },
  { slug: "us-open", label: "U.S. Open" },
  { slug: "the-open", label: "The Open Championship" },
];

export function isTournamentSlug(value: string): value is TournamentSlug {
  return TOURNAMENTS.some((option) => option.slug === value);
}

export function buildTournamentPoolId(basePoolId: string, tournament: TournamentSlug) {
  return `${basePoolId}-${tournament}`;
}
