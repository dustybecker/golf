// Minimal Twilio Programmable SMS client. No SDK — a single fetch keeps
// dependencies small. Configure with:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER        (E.164, e.g. "+15551234567")
//
// Messaging Service SID is supported as an alternative to FROM via:
//   TWILIO_MESSAGING_SERVICE_SID
//
// Docs: https://www.twilio.com/docs/messaging/api/message-resource

type SendSmsArgs = {
  to: string; // E.164
  body: string;
};

type TwilioOk = { sid: string; status: string };
type TwilioErr = { message?: string; code?: number; more_info?: string };

export function isE164(raw: string | null | undefined): raw is string {
  if (!raw) return false;
  return /^\+[1-9]\d{6,14}$/.test(raw.trim());
}

export async function sendViaTwilio(args: SendSmsArgs): Promise<TwilioOk> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const msvc = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!sid || !token) {
    throw new Error("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not configured");
  }
  if (!from && !msvc) {
    throw new Error("TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID required");
  }
  if (!isE164(args.to)) {
    throw new Error(`Invalid E.164 number: ${args.to}`);
  }

  const params = new URLSearchParams();
  params.set("To", args.to);
  params.set("Body", args.body);
  if (msvc) {
    params.set("MessagingServiceSid", msvc);
  } else if (from) {
    params.set("From", from);
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as TwilioErr;
    throw new Error(body.message ?? `Twilio failed (${res.status})`);
  }

  return (await res.json()) as TwilioOk;
}
