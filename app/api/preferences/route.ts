import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedEntrant } from "@/lib/draftAuth";
import { getErrorMessage } from "@/lib/error";

export const revalidate = 0;

export async function GET() {
  try {
    const session = await getAuthenticatedEntrant();
    if (!session) return NextResponse.json({ error: "auth required" }, { status: 401 });

    const { data } = await supabaseAdmin
      .from("notification_preferences")
      .select("email, prefs")
      .eq("entrant_id", session.entrant.entrant_id)
      .maybeSingle<{ email: string | null; prefs: Record<string, boolean> | null }>();

    return NextResponse.json({
      email: data?.email ?? null,
      prefs: data?.prefs ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to load preferences") },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthenticatedEntrant();
    if (!session) return NextResponse.json({ error: "auth required" }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      email?: string | null;
      prefs?: Record<string, boolean>;
    };

    const row = {
      entrant_id: session.entrant.entrant_id,
      email: body.email ?? null,
      prefs: body.prefs ?? undefined,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("notification_preferences")
      .upsert(row, { onConflict: "entrant_id" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "Failed to save preferences") },
      { status: 500 },
    );
  }
}
