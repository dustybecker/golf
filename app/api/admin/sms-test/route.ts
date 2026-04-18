import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedEntrant } from "@/lib/draftAuth";
import { sendViaTwilio, isE164 } from "@/lib/notifications/twilio";
import { getErrorMessage } from "@/lib/error";

// POST /api/admin/sms-test { to: "+1555...", body?: "..." }
// Admin-only one-shot Twilio send to verify credentials + E.164. Logs
// nothing to notification_log; this is a debug endpoint, not a campaign.
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedEntrant();
    if (!session?.entrant.is_admin) {
      return NextResponse.json({ error: "admin required" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { to?: string; body?: string };
    if (!isE164(body.to)) {
      return NextResponse.json({ error: "to must be E.164" }, { status: 400 });
    }
    const text = body.body?.trim() || "Decathlon SMS test — your Twilio credentials work.";

    const r = await sendViaTwilio({ to: body.to, body: text });
    return NextResponse.json({ ok: true, sid: r.sid, status: r.status });
  } catch (err) {
    return NextResponse.json(
      { error: getErrorMessage(err, "SMS test failed") },
      { status: 500 },
    );
  }
}
