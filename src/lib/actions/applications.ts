"use server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import {
  getApplicationForUser,
} from "@/lib/dashboard-repo";
import { naiveFormDateTimeToUtcIso, utcNowIso, parseDbInstant } from "@/lib/app-timezone";
import { generateLarasMatchAdvice } from "@/lib/gemini-job-cv-match";
import { persistJobKeywords } from "@/lib/job-keywords";
import { stripAdviceFormatting } from "@/lib/advice-format";
import { computeJobCvMatchScores } from "@/lib/compute-job-cv-match";

export type ApplicationFormData = {
  company: string;
  position: string;
  location?: string;
  locationType: string;
  jobUrl?: string;
  source: string;
  status: string;
  salaryMin?: string;
  salaryMax?: string;
  contactName?: string;
  notes?: string;
  jobDescription?: string;
  coverLetter?: string;
  cvId?: string;
  appliedAt: string;
};

export type AnalyzeJobCvMatchInput = ApplicationFormData & {
  /** When omitted, a new `job_application` row is created (auto-save). */
  applicationId?: string | null;
};

function revalidateApplicationPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/settings");
}

async function phaseNamesForApplication(
  supabase: ReturnType<typeof createServiceRoleClient>,
  applicationId: string | null
): Promise<string[]> {
  if (!applicationId) return [];
  const { data: aps, error } = await supabase
    .from("application_phase")
    .select("phase_id")
    .eq("job_application_id", applicationId);
  if (error) return [];
  const pids = [...new Set((aps ?? []).map((r) => r.phase_id as string))];
  if (pids.length === 0) return [];
  const { data: ph } = await supabase.from("phase").select("id, name").in("id", pids);
  return (ph ?? []).map((p) => (p.name as string) ?? "").filter(Boolean);
}

export async function createApplication(data: ApplicationFormData) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();

  const now = utcNowIso();
  const insert = {
    user_id: userId,
    is_applied: true,
    company: data.company,
    position: data.position,
    location: data.location?.trim() || null,
    job_type: data.locationType || null,
    job_url: data.jobUrl?.trim() || null,
    source: data.source || null,
    status: data.status || null,
    salary_min: data.salaryMin ? parseInt(data.salaryMin, 10) : null,
    salary_max: data.salaryMax ? parseInt(data.salaryMax, 10) : null,
    contact_name: data.contactName?.trim() || null,
    notes: data.notes?.trim() || null,
    job_description: data.jobDescription?.trim() || null,
    cover_letter: data.coverLetter?.trim() || null,
    cv_id: data.cvId || null,
    applied_at: naiveFormDateTimeToUtcIso(data.appliedAt),
    created_at: now,
    updated_at: now,
  };

  const { data: row, error } = await supabase
    .from("job_application")
    .insert(insert)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidateApplicationPaths();
  redirect("/dashboard/applications");
  return row;
}

/**
 * Persists job keywords, then scores fit as **75% LLM** (CV `llm_raw_text` + job description, with a
 * `cv_keywords` JSON fallback when snapshot is empty) **+ 25%** keyword overlap (job vs CV keywords).
 */
export async function analyzeJobCvMatchAndSave(
  input: AnalyzeJobCvMatchInput
): Promise<
  | {
      ok: true;
      applicationId: string;
      matchPercentage: number;
      llmMatchScore: number;
      keywordMatchScore: number;
      jobKeywords: string[];
      matchedKeywords: string[];
      larasAdvice: string;
    }
  | { ok: false; error: string }
> {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();

  const jobDescription = input.jobDescription?.trim() ?? "";
  const cvId = input.cvId?.trim() ?? "";
  if (!jobDescription) {
    return { ok: false, error: "Add a job description first." };
  }
  if (!cvId) {
    return { ok: false, error: "Select a CV under Status & Source (CV Used)." };
  }
  if (!input.company?.trim() || !input.position?.trim()) {
    return {
      ok: false,
      error: "Company and position are required before saving a match analysis.",
    };
  }

  const existingId = input.applicationId?.trim() || null;

  const { data: cvData, error: cvErr } = await supabase
    .from("user_cv")
    .select("id")
    .eq("id", cvId)
    .eq("user_id", userId)
    .maybeSingle();
  if (cvErr) return { ok: false, error: cvErr.message };
  if (!cvData) return { ok: false, error: "CV not found or access denied." };

  const scored = await computeJobCvMatchScores(supabase, userId, cvId, {
    company: input.company.trim(),
    position: input.position.trim(),
    jobDescription,
  });
  if (!scored.ok) return { ok: false, error: scored.error };

  const {
    matchPercentage,
    llmMatchScore,
    keywordMatchScore,
    jobKeywordsDisplay,
    matchedKeywords,
    cvSnapshotForLlm,
  } = scored;

  const matchedSet = new Set(matchedKeywords);
  const gapKeywords = jobKeywordsDisplay.filter((k) => !matchedSet.has(k));
  const phaseNames = await phaseNamesForApplication(supabase, existingId);

  const adviceRes = await generateLarasMatchAdvice({
    company: input.company.trim(),
    position: input.position.trim(),
    jobDescription,
    cvLlmRawSnapshot: cvSnapshotForLlm,
    blendedMatchPct: matchPercentage,
    llmMatchScore,
    keywordMatchScore,
    matchedKeywords,
    gapKeywords,
    phaseNames,
  });
  // Coaching body is model-generated prose; only this fallback line is fixed copy if the LLM fails.
  const larasMatchAdvice = adviceRes.ok
    ? stripAdviceFormatting(adviceRes.text)
    : "Something hiccupped on my side — when you are ready, run Check CV match again and I will try once more. Warmly, Laras";

  const now = utcNowIso();
  const baseRow = {
    company: input.company.trim(),
    position: input.position.trim(),
    location: input.location?.trim() || null,
    job_type: input.locationType || null,
    job_url: input.jobUrl?.trim() || null,
    source: input.source || null,
    status: input.status || null,
    salary_min: input.salaryMin ? parseInt(input.salaryMin, 10) : null,
    salary_max: input.salaryMax ? parseInt(input.salaryMax, 10) : null,
    contact_name: input.contactName?.trim() || null,
    notes: input.notes?.trim() || null,
    job_description: jobDescription,
    cover_letter: input.coverLetter?.trim() || null,
    cv_id: cvId,
    applied_at: naiveFormDateTimeToUtcIso(input.appliedAt),
    match_percentage: matchPercentage,
    updated_at: now,
  };

  try {
    if (existingId) {
      const existing = await getApplicationForUser(userId, existingId);
      if (!existing) return { ok: false, error: "Application not found." };

      const { error: upErr } = await supabase
        .from("job_application")
        .update(baseRow)
        .eq("id", existingId)
        .eq("user_id", userId);
      if (upErr) return { ok: false, error: upErr.message };

      await persistJobKeywords(supabase, existingId, jobKeywordsDisplay);

      revalidateApplicationPaths();
      revalidatePath(`/dashboard/applications/${existingId}/edit`);

      return {
        ok: true,
        applicationId: existingId,
        matchPercentage,
        llmMatchScore,
        keywordMatchScore,
        jobKeywords: jobKeywordsDisplay,
        matchedKeywords,
        larasAdvice: larasMatchAdvice,
      };
    }

    const { data: ins, error: insErr } = await supabase
      .from("job_application")
      .insert({
        ...baseRow,
        user_id: userId,
        created_at: now,
        is_applied: false,
      })
      .select("id")
      .single();
    if (insErr) return { ok: false, error: insErr.message };
    if (!ins?.id) return { ok: false, error: "Insert did not return an application id." };
    const newId = ins.id as string;

    await persistJobKeywords(supabase, newId, jobKeywordsDisplay);

    revalidateApplicationPaths();
    revalidatePath(`/dashboard/applications/${newId}/edit`);

    return {
      ok: true,
      applicationId: newId,
      matchPercentage,
      llmMatchScore,
      keywordMatchScore,
      jobKeywords: jobKeywordsDisplay,
      matchedKeywords,
      larasAdvice: larasMatchAdvice,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save match analysis.";
    return { ok: false, error: msg };
  }
}

export async function updateApplication(id: string, data: ApplicationFormData) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();

  const existing = await getApplicationForUser(userId, id);
  if (!existing) throw new Error("Application not found.");

  const update = {
    company: data.company,
    position: data.position,
    is_applied: true,
    location: data.location?.trim() || null,
    job_type: data.locationType || null,
    job_url: data.jobUrl?.trim() || null,
    source: data.source || null,
    status: data.status || null,
    salary_min: data.salaryMin ? parseInt(data.salaryMin, 10) : null,
    salary_max: data.salaryMax ? parseInt(data.salaryMax, 10) : null,
    contact_name: data.contactName?.trim() || null,
    notes: data.notes?.trim() || null,
    job_description: data.jobDescription?.trim() || null,
    cover_letter: data.coverLetter?.trim() || null,
    cv_id: data.cvId || null,
    applied_at: naiveFormDateTimeToUtcIso(data.appliedAt),
    updated_at: utcNowIso(),
  };

  const { error } = await supabase
    .from("job_application")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidateApplicationPaths();
  revalidatePath(`/dashboard/applications/${id}/edit`);
  redirect("/dashboard/applications");
}

export async function deleteApplication(id: string) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("job_application")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidateApplicationPaths();
}

export async function addApplicationPhase(
  applicationId: string,
  phaseId: string,
  data: {
    status?: string;
    scheduledAt?: string;
    notes?: string;
  }
) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const app = await getApplicationForUser(userId, applicationId);
  if (!app) throw new Error("Application not found.");

  const now = utcNowIso();
  const { error } = await supabase.from("application_phase").insert({
    job_application_id: applicationId,
    phase_id: phaseId,
    status: data.status || "scheduled",
    scheduled_at: data.scheduledAt ? naiveFormDateTimeToUtcIso(data.scheduledAt) : null,
    notes: data.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/applications");
  revalidatePath(`/dashboard/applications/${applicationId}/edit`);
}

export async function updateApplicationPhase(
  phaseRecordId: string,
  applicationId: string,
  data: {
    status: string;
    scheduledAt?: string;
    completedAt?: string;
    notes?: string;
  }
) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const app = await getApplicationForUser(userId, applicationId);
  if (!app) throw new Error("Application not found.");

  const { error } = await supabase
    .from("application_phase")
    .update({
      status: data.status,
      scheduled_at: data.scheduledAt ? naiveFormDateTimeToUtcIso(data.scheduledAt) : null,
      completed_at: data.completedAt ? naiveFormDateTimeToUtcIso(data.completedAt) : null,
      notes: data.notes?.trim() ?? null,
      updated_at: utcNowIso(),
    })
    .eq("id", phaseRecordId)
    .eq("job_application_id", applicationId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/applications/${applicationId}/edit`);
  revalidatePath("/dashboard/applications");
}

export async function removeApplicationPhase(phaseRecordId: string, applicationId: string) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const app = await getApplicationForUser(userId, applicationId);
  if (!app) throw new Error("Application not found.");

  const { error } = await supabase
    .from("application_phase")
    .delete()
    .eq("id", phaseRecordId)
    .eq("job_application_id", applicationId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/applications/${applicationId}/edit`);
  revalidatePath("/dashboard/applications");
}

export async function getApplicationsByCompany(company: string) {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("job_application")
    .select(
      "id, company, position, status, source, applied_at, job_type, salary_min, salary_max, notes"
    )
    .eq("user_id", userId)
    .eq("is_applied", true)
    .ilike("company", company)
    .order("applied_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((r) => r.id as string);
  const phasesByApp = new Map<string, { phase: { name: string; color: string }; status: string }[]>();
  if (ids.length > 0) {
    const { data: apRows } = await supabase
      .from("application_phase")
      .select("job_application_id, phase_id, status, created_at")
      .in("job_application_id", ids)
      .order("created_at", { ascending: true });
    const phaseIds = [...new Set((apRows ?? []).map((r) => r.phase_id as string))];
    const phaseById = new Map<string, { name: string; color: string }>();
    if (phaseIds.length > 0) {
      const { data: phases } = await supabase
        .from("phase")
        .select("id, name, color")
        .in("id", phaseIds);
      for (const p of phases ?? []) {
        phaseById.set(p.id as string, {
          name: p.name as string,
          color: (p.color as string) ?? "#64748b",
        });
      }
    }
    for (const id of ids) phasesByApp.set(id, []);
    for (const r of apRows ?? []) {
      const jid = r.job_application_id as string;
      const ph = phaseById.get(r.phase_id as string);
      if (!ph) continue;
      phasesByApp.get(jid)!.push({ phase: ph, status: (r.status as string) ?? "" });
    }
  }

  return rows.map((r) => ({
    id: r.id as string,
    company: r.company as string,
    position: r.position as string,
    status: (r.status as string) ?? "",
    source: (r.source as string) ?? "",
    appliedAt: r.applied_at ? parseDbInstant(r.applied_at as string) : new Date(),
    locationType: (r.job_type as string) ?? "other",
    salaryMin: r.salary_min as number | null,
    salaryMax: r.salary_max as number | null,
    notes: (r.notes as string) ?? null,
    phases: phasesByApp.get(r.id as string) ?? [],
  }));
}
