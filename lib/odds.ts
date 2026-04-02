type OddsApiOutcome = {
  name?: string;
  price?: number;
};

type OddsApiMarket = {
  key?: string;
  outcomes?: OddsApiOutcome[];
};

type OddsApiBookmaker = {
  title?: string;
  markets?: OddsApiMarket[];
};

type OddsApiEvent = {
  bookmakers?: OddsApiBookmaker[];
};

export type TournamentSlug =
  | "masters"
  | "pga-championship"
  | "us-open"
  | "the-open";

export type GolferOddsRow = {
  golfer: string;
  best_odds: number;
  sportsbook: string;
};

export type GolferHandicapRow = {
  rank: number;
  golfer: string;
  best_odds: number;
  sportsbook: string;
  implied_probability: number;
  normalized_probability: number;
  handicap: number;
};

export const MAX_HANDICAP = 8;

export const TOURNAMENT_CONFIG: Record<
  TournamentSlug,
  { sportKey: string; label: string }
> = {
  masters: {
    sportKey: "golf_masters_tournament_winner",
    label: "The Masters",
  },
  "pga-championship": {
    sportKey: "golf_pga_championship_winner",
    label: "PGA Championship",
  },
  "us-open": {
    sportKey: "golf_us_open_winner",
    label: "U.S. Open",
  },
  "the-open": {
    sportKey: "golf_the_open_championship_winner",
    label: "The Open Championship",
  },
};

export function isTournamentSlug(value: string): value is TournamentSlug {
  return value in TOURNAMENT_CONFIG;
}

function americanToImpliedProbability(odds: number) {
  if (odds > 0) {
    return 100 / (odds + 100);
  }
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function computeHandicap(rankIndex: number, fieldSize: number) {
  if (fieldSize <= 1) return 0;

  const percentile = rankIndex / (fieldSize - 1);
  const curved = Math.pow(percentile, 0.72);
  const handicap = Math.round(curved * MAX_HANDICAP);
  return Math.max(0, Math.min(MAX_HANDICAP, handicap));
}

export async function fetchBestOdds(apiKey: string, tournament: TournamentSlug) {
  const { sportKey } = TOURNAMENT_CONFIG[tournament];

  const params = new URLSearchParams({
    apiKey,
    regions: "us",
    markets: "outrights",
    oddsFormat: "american",
  });

  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Failed to reach The Odds API."));
  }

  let json: OddsApiEvent[];
  try {
    json = await res.json();
  } catch {
    throw new Error("The Odds API did not return valid JSON.");
  }

  if (!res.ok) {
    throw new Error(`The Odds API returned ${res.status}.`);
  }

  const bestByGolfer = new Map<string, GolferOddsRow>();

  for (const event of json ?? []) {
    for (const bookmaker of event.bookmakers ?? []) {
      for (const market of bookmaker.markets ?? []) {
        if (market.key !== "outrights") continue;

        for (const outcome of market.outcomes ?? []) {
          const golfer = outcome.name?.trim();
          const price = outcome.price;
          if (!golfer || typeof price !== "number") continue;

          const current = bestByGolfer.get(golfer);
          if (!current || price > current.best_odds) {
            bestByGolfer.set(golfer, {
              golfer,
              best_odds: price,
              sportsbook: bookmaker.title ?? "Unknown",
            });
          }
        }
      }
    }
  }

  return Array.from(bestByGolfer.values()).sort((a, b) => {
    if (a.best_odds !== b.best_odds) return a.best_odds - b.best_odds;
    return a.golfer.localeCompare(b.golfer);
  });
}

export async function fetchHandicaps(apiKey: string, tournament: TournamentSlug) {
  const golfers = await fetchBestOdds(apiKey, tournament);

  const withProbabilities = golfers.map((golfer) => ({
    ...golfer,
    implied_probability: americanToImpliedProbability(golfer.best_odds),
  }));

  const totalProbability = withProbabilities.reduce(
    (sum, golfer) => sum + golfer.implied_probability,
    0
  );

  return withProbabilities.map((golfer, index) => ({
    rank: index + 1,
    golfer: golfer.golfer,
    best_odds: golfer.best_odds,
    sportsbook: golfer.sportsbook,
    implied_probability: Number(golfer.implied_probability.toFixed(6)),
    normalized_probability: Number(
      (totalProbability > 0 ? golfer.implied_probability / totalProbability : 0).toFixed(6)
    ),
    handicap: computeHandicap(index, withProbabilities.length),
  })) satisfies GolferHandicapRow[];
}
import { getErrorMessage } from "@/lib/error";
