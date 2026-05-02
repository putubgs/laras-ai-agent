import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordMatch,
  validateSpecialKeyword,
} from "@utils/validation";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  let body: {
    full_name?: string;
    email?: string;
    password?: string;
    confirm_password?: string;
    special_keyword?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fullName = body.full_name ?? "";
  const emailRaw = body.email ?? "";
  const password = body.password ?? "";
  const confirm = body.confirm_password ?? "";
  const keyword = body.special_keyword ?? "";

  const errs: string[] = [];
  const fn = validateFullName(fullName);
  if (!fn.ok) errs.push(fn.message);
  const em = validateEmail(emailRaw);
  if (!em.ok) errs.push(em.message);
  const pw = validatePassword(password);
  if (!pw.ok) errs.push(pw.message);
  const m = validatePasswordMatch(password, confirm);
  if (!m.ok) errs.push(m.message);
  const sk = validateSpecialKeyword(keyword);
  if (!sk.ok) errs.push(sk.message);

  if (errs.length) {
    return NextResponse.json({ error: errs[0], errors: errs }, { status: 400 });
  }

  const email = normalizeEmail(emailRaw);
  const trimmedKeyword = keyword.trim();

  try {
    const supabase = createServiceRoleClient();
    const passwordHash = await hashPassword(password);

    const { data: inserted, error } = await supabase
      .from("users")
      .insert({
        full_name: fullName.trim(),
        email,
        password: passwordHash,
        special_keyword: trimmedKeyword,
      })
      .select("id, email")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        );
      }
      console.error("[register]", error);
      return NextResponse.json(
        { error: "Unable to register. Try again later." },
        { status: 500 }
      );
    }

    const token = await signSessionToken({
      sub: inserted.id,
      email: inserted.email,
    });

    const opts = sessionCookieOptions();
    const res = NextResponse.json(
      { user: { id: inserted.id, email: inserted.email } },
      { status: 201 }
    );
    res.cookies.set(opts.name, token, {
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
      maxAge: opts.maxAge,
    });
    return res;
  } catch (e) {
    console.error("[register]", e);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
}
