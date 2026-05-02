import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CV_BUCKET } from "@/lib/supabase/cv-bucket";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId: string;
  try {
    const session = await verifySessionToken(token);
    userId = session.sub;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data: row, error: fetchErr } = await supabase
    .from("user_cv")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row?.file_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = row.file_path as string;
  const origin = request.nextUrl.origin;

  if (filePath.startsWith("/uploads/")) {
    return NextResponse.redirect(new URL(filePath, origin));
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signErr?.message ?? "Could not create download link" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
