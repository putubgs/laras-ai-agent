import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getDaysInMonth } from "date-fns";
import {
  jakartaMonthRangeUtcIso,
  jakartaCalendarDayRangeUtc,
  jakartaYearMonthDayNow,
  parseDbInstant,
} from "@/lib/app-timezone";
import { DEFAULT_MONTHLY_TARGET, STATUS_GROUPS } from "@/lib/constants";

/** Client-facing application row (camelCase) with nested phases for tables. */
export type ApplicationWithPhases = {
  id: string;
  company: string;
  position: string;
  location: string | null;
  locationType: string;
  jobUrl: string | null;
  source: string;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  appliedAt: Date;
  /** False when the row was created/last touched by “Check CV match” only — not counted in analytics. */
  isApplied: boolean;
  phases: { phase: { name: string; color: string }; status: string }[];
};

function mapJobRow(row: {
  id: string;
  company: string;
  position: string;
  location: string | null;
  job_type: string | null;
  job_url: string | null;
  source: string | null;
  status: string | null;
  salary_min: number | null;
  salary_max: number | null;
  applied_at: string | null;
  is_applied: boolean | null;
}): Omit<ApplicationWithPhases, "phases"> {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    location: row.location,
    locationType: row.job_type ?? "other",
    jobUrl: row.job_url,
    source: row.source ?? "",
    status: row.status ?? "",
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    appliedAt: row.applied_at ? parseDbInstant(row.applied_at) : new Date(),
    isApplied: row.is_applied !== false,
  };
}

async function attachPhases(
  supabase: ReturnType<typeof createServiceRoleClient>,
  apps: Omit<ApplicationWithPhases, "phases">[]
): Promise<ApplicationWithPhases[]> {
  if (apps.length === 0) return [];
  const ids = apps.map((a) => a.id);
  const { data: apRows, error: apErr } = await supabase
    .from("application_phase")
    .select("job_application_id, phase_id, status, created_at")
    .in("job_application_id", ids)
    .order("created_at", { ascending: true });
  if (apErr) throw new Error(apErr.message);

  const phaseIds = [...new Set((apRows ?? []).map((r) => r.phase_id as string))];
  const phaseById = new Map<string, { name: string; color: string }>();
  if (phaseIds.length > 0) {
    const { data: phases, error: phErr } = await supabase
      .from("phase")
      .select("id, name, color")
      .in("id", phaseIds);
    if (phErr) throw new Error(phErr.message);
    for (const p of phases ?? []) {
      phaseById.set(p.id as string, {
        name: p.name as string,
        color: (p.color as string) ?? "#64748b",
      });
    }
  }

  const grouped = new Map<string, ApplicationWithPhases["phases"]>();
  for (const id of ids) grouped.set(id, []);
  for (const r of apRows ?? []) {
    const jid = r.job_application_id as string;
    const ph = phaseById.get(r.phase_id as string);
    if (!ph) continue;
    grouped.get(jid)!.push({ phase: ph, status: (r.status as string) ?? "" });
  }

  return apps.map((a) => ({
    ...a,
    phases: grouped.get(a.id) ?? [],
  }));
}

export async function listApplicationsForUser(
  userId: string,
  year: number,
  month: number,
  options?: { appliedOnly?: boolean }
): Promise<ApplicationWithPhases[]> {
  const supabase = createServiceRoleClient();
  let q = supabase
    .from("job_application")
    .select(
      "id, company, position, location, job_type, job_url, source, status, salary_min, salary_max, applied_at, is_applied"
    )
    .eq("user_id", userId)
    .order("applied_at", { ascending: false });

  if (options?.appliedOnly) {
    q = q.eq("is_applied", true);
  }

  if (year !== 0 && month !== 0) {
    const { start, end } = jakartaMonthRangeUtcIso(year, month);
    q = q.gte("applied_at", start).lte("applied_at", end);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const base = (data ?? []).map((row) => mapJobRow(row as Parameters<typeof mapJobRow>[0]));
  return attachPhases(supabase, base);
}

export async function listApplicationSummariesForUser(userId: string): Promise<
  { id: string; company: string; position: string; appliedAt: Date; isApplied: boolean }[]
> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("job_application")
    .select("id, company, position, applied_at, is_applied")
    .eq("user_id", userId)
    .order("applied_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    company: r.company as string,
    position: r.position as string,
    appliedAt: r.applied_at ? parseDbInstant(r.applied_at as string) : new Date(),
    isApplied: (r.is_applied as boolean | null) !== false,
  }));
}

export type ApplicationDetail = ApplicationWithPhases & {
  notes: string | null;
  jobDescription: string | null;
  coverLetter: string | null;
  cvId: string | null;
  contactName: string | null;
  matchPercentage: number | null;
  jobMatchKeywords: string[];
  matchedJobCvKeywords: string[];
  phases: {
    id: string;
    phaseId: string;
    phase: { name: string; color: string };
    status: string;
    scheduledAt: Date | null;
    completedAt: Date | null;
    notes: string | null;
  }[];
};

export async function getApplicationForUser(
  userId: string,
  applicationId: string
): Promise<ApplicationDetail | null> {
  const supabase = createServiceRoleClient();
  const { data: row, error } = await supabase
    .from("job_application")
    .select(
      "id, company, position, location, job_type, job_url, source, status, salary_min, salary_max, contact_name, notes, job_description, cover_letter, cv_id, applied_at, match_percentage, is_applied"
    )
    .eq("user_id", userId)
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  const base = mapJobRow(row as Parameters<typeof mapJobRow>[0]);
  const { data: apRows, error: apErr } = await supabase
    .from("application_phase")
    .select(
      "id, job_application_id, phase_id, status, scheduled_at, completed_at, notes, created_at"
    )
    .eq("job_application_id", applicationId)
    .order("created_at", { ascending: true });
  if (apErr) throw new Error(apErr.message);

  const phaseIds = [...new Set((apRows ?? []).map((r) => r.phase_id as string))];
  const phaseById = new Map<string, { name: string; color: string }>();
  if (phaseIds.length > 0) {
    const { data: phases, error: phErr } = await supabase
      .from("phase")
      .select("id, name, color")
      .in("id", phaseIds);
    if (phErr) throw new Error(phErr.message);
    for (const p of phases ?? []) {
      phaseById.set(p.id as string, {
        name: p.name as string,
        color: (p.color as string) ?? "#64748b",
      });
    }
  }

  const phases = (apRows ?? []).map((r) => ({
    id: r.id as string,
    phaseId: r.phase_id as string,
    phase: phaseById.get(r.phase_id as string) ?? { name: "?", color: "#64748b" },
    status: (r.status as string) ?? "",
    scheduledAt: r.scheduled_at ? parseDbInstant(r.scheduled_at as string) : null,
    completedAt: r.completed_at ? parseDbInstant(r.completed_at as string) : null,
    notes: (r.notes as string) ?? null,
  }));

  const { data: jkRows, error: jkErr } = await supabase
    .from("job_keywords")
    .select("keyword_id, keywords(keyword)")
    .eq("job_application_id", applicationId);
  if (jkErr) throw new Error(jkErr.message);

  const jobPairs: { id: string; label: string }[] = [];
  for (const r of jkRows ?? []) {
    const kid = r.keyword_id as string;
    const kw = r.keywords as { keyword?: string } | null;
    const label = (kw?.keyword as string) ?? kid;
    jobPairs.push({ id: kid, label });
  }

  const cvKwIds = new Set<string>();
  if (row.cv_id) {
    const { data: cks, error: ckErr } = await supabase
      .from("cv_keywords")
      .select("keyword_id")
      .eq("user_cv_id", row.cv_id as string);
    if (ckErr) throw new Error(ckErr.message);
    for (const c of cks ?? []) cvKwIds.add(c.keyword_id as string);
  }

  const matchedJobCvKeywords = jobPairs.filter((p) => cvKwIds.has(p.id)).map((p) => p.label);
  const jobMatchKeywords = jobPairs.map((p) => p.label);

  return {
    ...base,
    notes: (row.notes as string) ?? null,
    jobDescription: (row.job_description as string) ?? null,
    coverLetter: (row.cover_letter as string) ?? null,
    cvId: (row.cv_id as string) ?? null,
    contactName: (row.contact_name as string) ?? null,
    matchPercentage: (row.match_percentage as number | null) ?? null,
    jobMatchKeywords,
    matchedJobCvKeywords,
    phases,
  };
}

export type PhaseRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  order: number;
  isActive: boolean;
};

export async function listPhases(options?: { activeOnly?: boolean }): Promise<PhaseRow[]> {
  const supabase = createServiceRoleClient();
  let q = supabase
    .from("phase")
    .select('id, name, description, color, "order", is_active')
    .order("order", { ascending: true, nullsFirst: false });
  if (options?.activeOnly) {
    q = q.eq("is_active", true);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    color: (r.color as string) ?? "#6366f1",
    order: (r.order as number) ?? 0,
    isActive: Boolean(r.is_active),
  }));
}

export type UserCvOption = { id: string; name: string };

export async function listUserCvOptions(userId: string): Promise<UserCvOption[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_cv")
    .select("id, description, file_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: ((r.description as string)?.trim() || (r.file_name as string) || "CV") as string,
  }));
}

/**
 * Builds candidate background text for cover-letter generation from the stored CV
 * snapshot (`llm_raw_text`) or, if missing, linked `cv_keywords` rows.
 */
export async function getCvCoverLetterContext(userId: string, cvId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: row, error } = await supabase
    .from("user_cv")
    .select("llm_raw_text")
    .eq("id", cvId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  const raw = (row.llm_raw_text as string | null)?.trim();
  if (raw) {
    try {
      const j = JSON.parse(raw) as { keywords?: unknown; cv_preview?: unknown };
      const parts: string[] = [];
      if (Array.isArray(j.keywords)) {
        const kw = j.keywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim());
        if (kw.length) parts.push(`Keywords: ${kw.join(", ")}`);
      }
      if (typeof j.cv_preview === "string" && j.cv_preview.trim()) {
        parts.push(`CV excerpt:\n${j.cv_preview.trim()}`);
      }
      const built = parts.join("\n\n").trim();
      if (built) return built;
    } catch {
      // fall through to keyword links
    }
  }

  const { data: links, error: linkErr } = await supabase
    .from("cv_keywords")
    .select("keywords(keyword)")
    .eq("user_cv_id", cvId);
  if (linkErr) throw new Error(linkErr.message);
  const kw = (links ?? [])
    .map((l) => {
      const k = l.keywords as { keyword?: string } | null | undefined;
      return k?.keyword?.trim();
    })
    .filter(Boolean) as string[];
  if (kw.length === 0) return null;
  return `Keywords: ${[...new Set(kw)].join(", ")}`;
}

export type MonthlyTargetRow = {
  id: string;
  userId: string;
  year: number;
  month: number;
  target: number;
};

export async function listMonthlyTargetsForUser(
  userId: string,
  pairs: { year: number; month: number }[]
): Promise<MonthlyTargetRow[]> {
  if (pairs.length === 0) return [];
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("monthly_target")
    .select("id, user_id, year, month, target")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const want = new Set(pairs.map((p) => `${p.year}-${p.month}`));
  return (data ?? [])
    .filter((r) => want.has(`${r.year}-${r.month}`))
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      year: r.year as number,
      month: r.month as number,
      target: r.target as number,
    }));
}

/** Simpler fetch: all targets for user in a year range (for settings). */
export async function listMonthlyTargetsForUserInRange(
  userId: string,
  minYear: number,
  maxYear: number
): Promise<MonthlyTargetRow[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("monthly_target")
    .select("id, user_id, year, month, target")
    .eq("user_id", userId)
    .gte("year", minYear)
    .lte("year", maxYear);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    year: r.year as number,
    month: r.month as number,
    target: r.target as number,
  }));
}

export async function getMonthlyTargetForUser(
  userId: string,
  year: number,
  month: number
): Promise<number | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("monthly_target")
    .select("target")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data.target as number;
}

/**
 * Daily pace implied by the monthly target and applications so far this Jakarta month
 * (same formula as analytics). Clamped for safe batch sizes (e.g. Find a job).
 */
export async function getDailyTargetForUser(userId: string): Promise<number> {
  const jNow = jakartaYearMonthDayNow();
  const year = jNow.year;
  const month = jNow.month;
  const applications = await listApplicationsForUser(userId, year, month, {
    appliedOnly: true,
  });
  const monthlyTargetRow = await getMonthlyTargetForUser(userId, year, month);
  const monthlyTarget = monthlyTargetRow ?? DEFAULT_MONTHLY_TARGET;
  const viewDate = new Date(year, month - 1, 1);
  const daysInMonth = getDaysInMonth(viewDate);
  const daysRemaining = Math.max(1, daysInMonth - jNow.day + 1);
  const todayRange = jakartaCalendarDayRangeUtc(new Date());
  const todayCount = applications.filter((a) => {
    const d = a.appliedAt;
    return d >= todayRange.start && d <= todayRange.end;
  }).length;
  const monthCountBeforeToday = applications.length - todayCount;
  const remainingBeforeToday = Math.max(monthlyTarget - monthCountBeforeToday, 0);
  const dailyTarget = Math.ceil(remainingBeforeToday / daysRemaining);
  return Math.max(1, Math.min(50, dailyTarget));
}

export type DashboardRecentApp = {
  id: string;
  company: string;
  position: string;
  source: string;
  status: string;
  appliedAt: Date;
};

export type DashboardMonthData = {
  year: number;
  month: number;
  isCurrentMonth: boolean;
  monthlyTarget: number;
  monthCount: number;
  todayCount: number;
  daysRemainingInMonth: number;
  daysElapsedInMonth: number;
  dayOfMonth: number;
  approved: number;
  rejected: number;
  active: number;
  recentApplications: DashboardRecentApp[];
};

export async function fetchDashboardMonthData(
  userId: string,
  year: number,
  month: number
): Promise<DashboardMonthData> {
  const supabase = createServiceRoleClient();
  const viewDate = new Date(year, month - 1, 1);
  const { start: monthStartIso, end: monthEndIso } = jakartaMonthRangeUtcIso(year, month);
  const now = new Date();
  const jNow = jakartaYearMonthDayNow();
  const isCurrentMonth = year === jNow.year && month === jNow.month;

  const monthlyTargetRow = await getMonthlyTargetForUser(userId, year, month);
  const monthlyTarget = monthlyTargetRow ?? DEFAULT_MONTHLY_TARGET;

  const { data: monthApps, error: monthErr } = await supabase
    .from("job_application")
    .select("id, status")
    .eq("user_id", userId)
    .eq("is_applied", true)
    .gte("applied_at", monthStartIso)
    .lte("applied_at", monthEndIso);
  if (monthErr) throw new Error(monthErr.message);

  const monthApplications = monthApps ?? [];

  let todayApplications: { id: string }[] = [];
  if (isCurrentMonth) {
    const { start: dayStart, end: dayEnd } = jakartaCalendarDayRangeUtc(now);
    const { data: todayRows, error: todayErr } = await supabase
      .from("job_application")
      .select("id")
      .eq("user_id", userId)
      .eq("is_applied", true)
      .gte("applied_at", dayStart.toISOString())
      .lte("applied_at", dayEnd.toISOString());
    if (todayErr) throw new Error(todayErr.message);
    todayApplications = (todayRows ?? []) as { id: string }[];
  }

  const { data: recentRows, error: recentErr } = await supabase
    .from("job_application")
    .select("id, company, position, source, status, applied_at")
    .eq("user_id", userId)
    .eq("is_applied", true)
    .gte("applied_at", monthStartIso)
    .lte("applied_at", monthEndIso)
    .order("applied_at", { ascending: false })
    .limit(8);
  if (recentErr) throw new Error(recentErr.message);

  const monthCount = monthApplications.length;
  const todayCount = todayApplications.length;

  const daysInMonth = getDaysInMonth(viewDate);
  const dayOfMonth = isCurrentMonth ? jNow.day : daysInMonth;
  const daysRemainingInMonth = isCurrentMonth ? daysInMonth - jNow.day + 1 : 0;
  const daysElapsedInMonth = isCurrentMonth ? jNow.day : daysInMonth;

  const approved = monthApplications.filter((a) =>
    STATUS_GROUPS.approved.includes((a.status as string) ?? "")
  ).length;
  const rejected = monthApplications.filter((a) =>
    STATUS_GROUPS.rejected.includes((a.status as string) ?? "")
  ).length;
  const active = monthApplications.filter((a) =>
    STATUS_GROUPS.active.includes((a.status as string) ?? "")
  ).length;

  const recentApplications: DashboardRecentApp[] = (recentRows ?? []).map((r) => ({
    id: r.id as string,
    company: r.company as string,
    position: r.position as string,
    source: (r.source as string) ?? "other",
    status: (r.status as string) ?? "pending",
    appliedAt: r.applied_at ? parseDbInstant(r.applied_at as string) : new Date(),
  }));

  return {
    year,
    month,
    isCurrentMonth,
    monthlyTarget,
    monthCount,
    todayCount,
    daysRemainingInMonth,
    daysElapsedInMonth,
    dayOfMonth,
    approved,
    rejected,
    active,
    recentApplications,
  };
}
