import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { hashPassword } from "@/lib/auth/password";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateSpecialKeyword,
} from "@utils/validation";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  let body: {
    email?: string;
    special_keyword?: string;
    new_password?: string;
    confirm_password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const emailRaw = body.email ?? "";
  const keyword = body.special_keyword ?? "";
  const newPassword = body.new_password ?? "";
  const confirm = body.confirm_password ?? "";

  const errs: string[] = [];
  const em = validateEmail(emailRaw);
  if (!em.ok) errs.push(em.message);
  const sk = validateSpecialKeyword(keyword);
  if (!sk.ok) errs.push(sk.message);
  const pw = validatePassword(newPassword);
  if (!pw.ok) errs.push(pw.message);
  const m = validatePasswordMatch(newPassword, confirm);
  if (!m.ok) errs.push(m.message);

  if (errs.length) {
    return NextResponse.json({ error: errs[0], errors: errs }, { status: 400 });
  }

  const email = normalizeEmail(emailRaw);
  const trimmedKeyword = keyword.trim();

  try {
    const supabase = createServiceRoleClient();
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, special_keyword")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) {
      console.error("[forgot-password]", fetchError);
      return NextResponse.json(
        { error: "Unable to process request. Try again later." },
        { status: 500 }
      );
    }

    if (!user || user.special_keyword !== trimmedKeyword) {
      return NextResponse.json(
        { error: "Invalid email or recovery keyword." },
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: passwordHash })
      .eq("id", user.id);

    if (updateError) {
      console.error("[forgot-password]", updateError);
      return NextResponse.json(
        { error: "Unable to update password. Try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }
}
