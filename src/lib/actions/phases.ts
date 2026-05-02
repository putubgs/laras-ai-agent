"use server";

import { utcNowIso } from "@/lib/app-timezone";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";

export async function createPhase(data: {
  name: string;
  description?: string;
  color: string;
  order: number;
}) {
  const supabase = createServiceRoleClient();
  const now = utcNowIso();
  const { error } = await supabase.from("phase").insert({
    name: data.name,
    description: data.description?.trim() || null,
    color: data.color,
    order: data.order,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function updatePhase(
  id: string,
  data: {
    name: string;
    description?: string;
    color: string;
    order: number;
    isActive: boolean;
  }
) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("phase")
    .update({
      name: data.name,
      description: data.description?.trim() || null,
      color: data.color,
      order: data.order,
      is_active: data.isActive,
      updated_at: utcNowIso(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function deletePhase(id: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("phase").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function reorderPhases(phases: { id: string; order: number }[]) {
  const supabase = createServiceRoleClient();
  await Promise.all(
    phases.map((p) =>
      supabase
        .from("phase")
        .update({ order: p.order, updated_at: utcNowIso() })
        .eq("id", p.id)
    )
  );
  revalidatePath("/dashboard/settings");
}
