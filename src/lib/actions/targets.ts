"use server";

import { utcNowIso } from "@/lib/app-timezone";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";

/**
 * Persist monthly application target.
 * Uses update-or-insert instead of `.upsert()` so `created_at` is never sent as NULL on conflict
 * (PostgREST upsert can set excluded columns to null and break NOT NULL `created_at`).
 */
export async function upsertMonthlyTarget(year: number, month: number, target: number) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const now = utcNowIso();

  const { data: existing, error: selErr } = await supabase
    .from("monthly_target")
    .select("id")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  if (existing?.id) {
    const { error } = await supabase
      .from("monthly_target")
      .update({ target, updated_at: now })
      .eq("id", existing.id as string);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("monthly_target").insert({
      user_id: userId,
      year,
      month,
      target,
      created_at: now,
      updated_at: now,
    });
    if (error) {
      if (error.code === "23505") {
        const { error: upErr } = await supabase
          .from("monthly_target")
          .update({ target, updated_at: now })
          .eq("user_id", userId)
          .eq("year", year)
          .eq("month", month);
        if (upErr) throw new Error(upErr.message);
      } else {
        throw new Error(error.message);
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/analytics");
}
