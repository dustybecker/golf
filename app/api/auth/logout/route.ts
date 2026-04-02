import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteDraftSession, DRAFT_SESSION_COOKIE } from "@/lib/draftAuth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DRAFT_SESSION_COOKIE)?.value;

  if (token) {
    await deleteDraftSession(token);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DRAFT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
}
