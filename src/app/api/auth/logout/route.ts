import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth/session";

export async function POST() {
  const opts = sessionCookieOptions();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(opts.name, "", {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: 0,
  });
  return res;
}
