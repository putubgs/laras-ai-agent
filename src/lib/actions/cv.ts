"use server";

import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CV_BUCKET } from "@/lib/supabase/cv-bucket";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { extractCvPlainText } from "@/lib/cv-text-extract";
import { extractKeywordsFromCvPlainText } from "@/lib/gemini-cv-keywords";
import { persistCvKeywordsForUpload } from "@/lib/cv-keywords";
import { parseDbInstant, utcNowIso } from "@/lib/app-timezone";

export type CvRow = {
  id: string;
  name: string;
  description: string | null;
  fileName: string;
  /** Supabase Storage object path in bucket `CV`, or legacy `/uploads/cvs/...`. */
  filePath: string;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date | null;
};

/** @deprecated Use CvRow — alias for dashboard components. */
export type CvVersion = CvRow;

export async function getCVVersions(): Promise<CvRow[]> {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_cv")
    .select("id, description, file_name, file_path, file_size, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: ((r.description as string)?.trim() || (r.file_name as string) || "CV") as string,
    description: (r.description as string) ?? null,
    fileName: r.file_name as string,
    filePath: r.file_path as string,
    fileSize: (r.file_size as number) ?? null,
    createdAt: parseDbInstant(r.created_at as string),
    updatedAt: r.updated_at ? parseDbInstant(r.updated_at as string) : null,
  }));
}

export async function uploadCV(
  formData: FormData
): Promise<{ error?: string; cv?: CvRow; warning?: string }> {
  const { userId } = await requireDashboardUser();
  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!file || file.size === 0) return { error: "Please select a file." };
  if (!name) return { error: "Name is required." };

  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowed.includes(file.type)) return { error: "Only PDF and DOCX files are allowed." };

  const combinedDescription =
    description && description !== name
      ? `${name} — ${description}`.slice(0, 255)
      : name;

  const ext = file.name.split(".").pop() ?? "pdf";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const objectPath = `${userId}/${safeName}`;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const supabase = createServiceRoleClient();
  const { error: uploadErr } = await supabase.storage.from(CV_BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadErr) {
    return { error: uploadErr.message };
  }

  const now = utcNowIso();
  const { data: row, error } = await supabase
    .from("user_cv")
    .insert({
      user_id: userId,
      description: combinedDescription,
      file_name: file.name,
      file_path: objectPath,
      file_size: file.size,
      created_at: now,
      updated_at: now,
    })
    .select("id, description, file_name, file_path, file_size, created_at, updated_at")
    .single();
  if (error) {
    await supabase.storage.from(CV_BUCKET).remove([objectPath]);
    return { error: error.message };
  }

  const cv: CvRow = {
    id: row.id as string,
    name: ((row.description as string)?.trim() || (row.file_name as string) || "CV") as string,
    description: (row.description as string) ?? null,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    fileSize: (row.file_size as number) ?? null,
    createdAt: parseDbInstant(row.created_at as string),
    updatedAt: row.updated_at ? parseDbInstant(row.updated_at as string) : null,
  };

  let pipelineWarning: string | undefined;

  try {
    const extracted = await extractCvPlainText(buffer, file.type);
    if ("error" in extracted) {
      pipelineWarning = extracted.error;
    } else {
      const gem = await extractKeywordsFromCvPlainText(extracted.text);
      if (!gem.ok) {
        pipelineWarning = gem.error;
      } else {
        const llmRaw = JSON.stringify({
          text_source: extracted.source,
          keywords: gem.keywords,
          cv_preview: extracted.text.slice(0, 4000),
        });
        await persistCvKeywordsForUpload(supabase, cv.id, gem.keywords, llmRaw);
      }
    }
  } catch (e) {
    console.error("[uploadCV] keyword pipeline", e);
    pipelineWarning =
      e instanceof Error ? `Keyword indexing failed: ${e.message}` : "Keyword indexing failed.";
  }

  revalidatePath("/dashboard/cv");
  return {
    cv,
    ...(pipelineWarning ? { warning: pipelineWarning } : {}),
  };
}

export async function updateCV(id: string, data: { name: string; description?: string }): Promise<void> {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("user_cv")
    .update({
      description: data.name,
      updated_at: utcNowIso(),
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/cv");
}

export async function deleteCV(id: string): Promise<void> {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const { data: row, error: fetchErr } = await supabase
    .from("user_cv")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!row) return;

  const rel = (row.file_path as string)?.trim() ?? "";

  if (rel.startsWith("/uploads/")) {
    try {
      await unlink(path.join(process.cwd(), "public", rel.replace(/^\//, "")));
    } catch {
      // ignore missing local file
    }
  } else if (rel) {
    const { error: rmErr } = await supabase.storage.from(CV_BUCKET).remove([rel]);
    if (rmErr) {
      throw new Error(
        `Could not remove the file from storage (${rmErr.message}). The CV was not deleted. Try again or check the "${CV_BUCKET}" bucket.`
      );
    }
  }

  const { error } = await supabase.from("user_cv").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/cv");
}
