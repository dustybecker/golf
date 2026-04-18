// SMS templates. Keep under ~160 characters where reasonable so they fit
// in a single segment. The goal is signal, not prose.

export type RenderedSms = { body: string };

function shortUrl(baseUrl: string, path: string) {
  // Strip protocol + www. to save characters; some SMS clients linkify bare
  // hosts anyway.
  const host = baseUrl.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return `${host}${path}`;
}

export function smsDraftOpens(event: { name: string }, baseUrl: string): RenderedSms {
  return { body: `Decathlon: ${event.name} draft is OPEN. ${shortUrl(baseUrl, "/draft")}` };
}

export function smsDraftTurn(event: { name: string }, baseUrl: string): RenderedSms {
  return { body: `Decathlon: you're on the clock — ${event.name}. ${shortUrl(baseUrl, "/draft")}` };
}

export function smsEventLock(event: { name: string; slug: string }, baseUrl: string): RenderedSms {
  return {
    body: `Decathlon: entries locked — ${event.name}. ${shortUrl(baseUrl, `/events/${event.slug}`)}`,
  };
}

export function smsEventFinal(
  event: { name: string },
  topName: string,
  topPoints: number,
  baseUrl: string,
): RenderedSms {
  return {
    body: `Decathlon: ${event.name} final. 1st: ${topName} +${topPoints.toFixed(1)}. ${shortUrl(baseUrl, "/season/2026")}`,
  };
}

export function smsHotSeatDeclared(
  declarer: string,
  declaration: string,
  baseUrl: string,
): RenderedSms {
  const trimmed = declaration.length > 80 ? `${declaration.slice(0, 77)}…` : declaration;
  return {
    body: `Decathlon Hot Seat: ${declarer} declared "${trimmed}" — vote in 24h. ${shortUrl(baseUrl, "/hot-seat")}`,
  };
}

export function smsHotSeatVetoNeeded(baseUrl: string): RenderedSms {
  return { body: `Decathlon: Hot Seat veto window closes soon. ${shortUrl(baseUrl, "/hot-seat")}` };
}
