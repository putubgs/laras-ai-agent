import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const session = await verifySessionToken(token);
    return NextResponse.json({
      user: { id: session.sub, email: session.email },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
