import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { validateEmail } from "@utils/validation/email";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const emailRaw = body.email ?? "";
  const password = body.password ?? "";

  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: emailCheck.message }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json(
      { error: "Password is required." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(emailRaw);

  try {
    const supabase = createServiceRoleClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, password")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("[login]", error);
      return NextResponse.json(
        { error: "Unable to sign in. Try again later." },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
    });

    const opts = sessionCookieOptions();
    const res = NextResponse.json({
      user: { id: user.id, email: user.email },
    });
    res.cookies.set(opts.name, token, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
      maxAge: opts.maxAge,
    });
    return res;
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
}
