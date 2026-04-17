import { supabaseAdmin } from "@/lib/supabase";
import { sendViaResend } from "./resend";
import type { RenderedEmail } from "./templates";

export type NotificationKind =
  | "draft_opens"
  | "draft_turn"
  | "turn_timer_warn"
  | "event_lock"
  | "event_final"
  | "hot_seat_declared"
  | "hot_seat_veto"
  | "season_digest";

export async function sendNotification(args: {
  entrantId: string;
  kind: NotificationKind;
  email: RenderedEmail;
}) {
  const { entrantId, kind, email } = args;

  const { data: prefs } = await supabaseAdmin
    .from("notification_preferences")
    .select("email, prefs")
    .eq("entrant_id", entrantId)
    .maybeSingle<{ email: string | null; prefs: Record<string, boolean> | null }>();

  const optedIn = prefs?.prefs?.[kind] ?? true;
  if (!optedIn) return { skipped: "opted_out" as const };
  if (!prefs?.email) return { skipped: "no_email" as const };

  try {
    const result = await sendViaResend({
      to: prefs.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    await supabaseAdmin.from("notification_log").insert({
      entrant_id: entrantId,
      channel: "email",
      kind,
      subject: email.subject,
      payload: { to: prefs.email },
      provider_msg_id: result.id,
    });
    return { ok: true as const, id: result.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabaseAdmin.from("notification_log").insert({
      entrant_id: entrantId,
      channel: "email",
      kind,
      subject: email.subject,
      payload: { to: prefs.email },
      error: message,
    });
    return { ok: false as const, error: message };
  }
}

export async function sendNotificationToAllMembers(args: {
  seasonId: string;
  kind: NotificationKind;
  email: RenderedEmail;
  excludeEntrantIds?: string[];
}) {
  const { data } = await supabaseAdmin
    .from("season_members")
    .select("entrant_id")
    .eq("season_id", args.seasonId);

  const excluded = new Set(args.excludeEntrantIds ?? []);
  const tasks: Array<Promise<unknown>> = [];
  for (const row of data ?? []) {
    if (excluded.has(row.entrant_id)) continue;
    tasks.push(sendNotification({ entrantId: row.entrant_id, kind: args.kind, email: args.email }));
  }
  await Promise.allSettled(tasks);
}

export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000"
  );
}
