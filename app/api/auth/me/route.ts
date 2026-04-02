import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/error";
import { getAuthenticatedEntrant } from "@/lib/draftAuth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const poolId =
    url.searchParams.get("pool_id") ||
    process.env.POOL_ID ||
    process.env.NEXT_PUBLIC_POOL_ID ||
    "2026-majors";

  try {
    const session = await getAuthenticatedEntrant(poolId);

    return NextResponse.json({
      ok: true,
      authenticated: Boolean(session),
      poolId,
      entrant: session?.entrant ?? null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to load entrant session.") },
      { status: 500 }
    );
  }
}
