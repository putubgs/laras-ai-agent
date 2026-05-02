"use server";

import { utcNowIso } from "@/lib/app-timezone";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";

export async function upsertMonthlyTarget(year: number, month: number, target: number) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("monthly_target").upsert(
    {
      user_id: userId,
      year,
      month,
      target,
      updated_at: utcNowIso(),
    },
    { onConflict: "user_id,year,month" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/analytics");
}
