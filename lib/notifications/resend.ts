// Minimal Resend HTTP client. No SDK — a single fetch keeps the surface
// small and the dependency tree quiet. Configure with RESEND_API_KEY and
// NOTIFICATION_FROM_EMAIL env vars.
//
// Docs: https://resend.com/docs/api-reference/emails/send-email

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type ResendOk = { id: string };
type ResendErr = { message?: string; name?: string };

export async function sendViaResend(args: SendArgs): Promise<ResendOk> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM_EMAIL ?? "Decathlon <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ResendErr;
    throw new Error(body.message ?? `Resend failed (${res.status})`);
  }

  return (await res.json()) as ResendOk;
}
