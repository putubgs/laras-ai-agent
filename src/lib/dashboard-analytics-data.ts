import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { format, getDaysInMonth, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  STATUS_GROUPS,
  DEFAULT_MONTHLY_TARGET,
} from "@/lib/constants";
import { getMonthlyTargetForUser, listApplicationsForUser } from "@/lib/dashboard-repo";
import {
  APP_TIME_ZONE,
  jakartaCalendarDayRangeUtc,
  jakartaMonthRangeUtcIso,
  jakartaMonthStartMonthsAgo,
  jakartaYearMonthDayNow,
  eachJakartaYearMonthBetween,
} from "@/lib/app-timezone";

export async function getMonthData(userId: string, year: number, month: number) {
  const applications = await listApplicationsForUser(userId, year, month, {
    appliedOnly: true,
  });
  const viewDate = new Date(year, month - 1, 1);

  const monthlyTargetRow = await getMonthlyTargetForUser(userId, year, month);
  const monthlyTarget = monthlyTargetRow ?? DEFAULT_MONTHLY_TARGET;

  const jNow = jakartaYearMonthDayNow();
  const isCurrentMonth = year === jNow.year && month === jNow.month;
  const daysInMonth = getDaysInMonth(viewDate);
  const daysRemaining = isCurrentMonth ? daysInMonth - jNow.day + 1 : 1;
  const todayRange = jakartaCalendarDayRangeUtc(new Date());
  const todayCount = isCurrentMonth
    ? applications.filter((a) => {
        const d = a.appliedAt;
        return d >= todayRange.start && d <= todayRange.end;
      }).length
    : 0;
  const monthCountBeforeToday = applications.length - todayCount;
  const remainingBeforeToday = Math.max(monthlyTarget - monthCountBeforeToday, 0);
  const dailyTarget = isCurrentMonth ? Math.ceil(remainingBeforeToday / daysRemaining) : 0;

  const statusData = APPLICATION_STATUSES.map((s) => ({
    name: s.label,
    value: applications.filter((a) => a.status === s.value).length,
    color: s.color,
  })).filter((d) => d.value > 0);

  const sourceData = APPLICATION_SOURCES.map((s) => ({
    name: s.label,
    count: applications.filter((a) => a.source === s.value).length,
    color: s.color,
  })).filter((d) => d.count > 0);

  const { end: monthEndIso } = jakartaMonthRangeUtcIso(year, month);
  const trendEnd = new Date(monthEndIso);
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const inst = subDays(trendEnd, 29 - i);
    const { start, end } = jakartaCalendarDayRangeUtc(inst);
    const count = applications.filter((a) => {
      const d = a.appliedAt;
      return d >= start && d <= end;
    }).length;
    return { date: formatInTimeZone(inst, APP_TIME_ZONE, "MMM d"), count };
  });

  const phaseMap = new Map<
    string,
    { name: string; color: string; scheduled: number; passed: number; failed: number }
  >();
  for (const app of applications) {
    for (const ap of app.phases) {
      const key = ap.phase.name;
      if (!phaseMap.has(key)) {
        phaseMap.set(key, { name: key, color: ap.phase.color, scheduled: 0, passed: 0, failed: 0 });
      }
      const entry = phaseMap.get(key)!;
      if (ap.status === "passed") entry.passed++;
      else if (ap.status === "failed") entry.failed++;
      else entry.scheduled++;
    }
  }

  const phaseData = Array.from(phaseMap.values());
  const total = applications.length;
  const approved = applications.filter((a) => STATUS_GROUPS.approved.includes(a.status)).length;
  const rejected = applications.filter((a) => STATUS_GROUPS.rejected.includes(a.status)).length;

  return {
    statusData,
    sourceData: [...sourceData].sort((a, b) => b.count - a.count),
    trendData,
    phaseData,
    total,
    approved,
    rejected,
    successRate: total > 0 ? ((approved / total) * 100).toFixed(1) : "0",
    rejectionRate: total > 0 ? ((rejected / total) * 100).toFixed(1) : "0",
    responseRate: total > 0 ? (((approved + rejected) / total) * 100).toFixed(1) : "0",
    topSource: [...sourceData].sort((a, b) => b.count - a.count)[0],
    dailyTarget,
  };
}

export async function getAllTimeData(userId: string) {
  const applications = (await listApplicationsForUser(userId, 0, 0, { appliedOnly: true })).sort(
    (a, b) => a.appliedAt.getTime() - b.appliedAt.getTime()
  );

  const statusData = APPLICATION_STATUSES.map((s) => ({
    name: s.label,
    value: applications.filter((a) => a.status === s.value).length,
    color: s.color,
  })).filter((d) => d.value > 0);

  const sourceData = APPLICATION_SOURCES.map((s) => ({
    name: s.label,
    count: applications.filter((a) => a.source === s.value).length,
    color: s.color,
  })).filter((d) => d.count > 0);

  const now = new Date();
  const firstApp = applications[0];
  const rangeStart = firstApp ? firstApp.appliedAt : jakartaMonthStartMonthsAgo(now, 11);
  const months = eachJakartaYearMonthBetween(rangeStart, now);
  const monthlyTrend = months.map(({ year: y, month: mo }) => {
    const { start, end } = jakartaMonthRangeUtcIso(y, mo);
    const mStart = new Date(start);
    const mEnd = new Date(end);
    const count = applications.filter((a) => {
      const d = a.appliedAt;
      return d >= mStart && d <= mEnd;
    }).length;
    return { date: format(new Date(y, mo - 1, 1), "MMM yy"), count };
  });

  const phaseMap = new Map<
    string,
    { name: string; color: string; scheduled: number; passed: number; failed: number }
  >();
  for (const app of applications) {
    for (const ap of app.phases) {
      const key = ap.phase.name;
      if (!phaseMap.has(key)) {
        phaseMap.set(key, { name: key, color: ap.phase.color, scheduled: 0, passed: 0, failed: 0 });
      }
      const entry = phaseMap.get(key)!;
      if (ap.status === "passed") entry.passed++;
      else if (ap.status === "failed") entry.failed++;
      else entry.scheduled++;
    }
  }

  const phaseData = Array.from(phaseMap.values());
  const total = applications.length;
  const approved = applications.filter((a) => STATUS_GROUPS.approved.includes(a.status)).length;
  const rejected = applications.filter((a) => STATUS_GROUPS.rejected.includes(a.status)).length;

  const counts = monthlyTrend.map((m) => m.count).filter((c) => c > 0);
  const avgMonthly = counts.length > 0 ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0;
  const bestMonth = counts.length > 0 ? Math.max(...counts) : 0;

  return {
    statusData,
    sourceData: [...sourceData].sort((a, b) => b.count - a.count),
    monthlyTrend,
    phaseData,
    total,
    approved,
    rejected,
    successRate: total > 0 ? ((approved / total) * 100).toFixed(1) : "0",
    rejectionRate: total > 0 ? ((rejected / total) * 100).toFixed(1) : "0",
    responseRate: total > 0 ? (((approved + rejected) / total) * 100).toFixed(1) : "0",
    topSource: [...sourceData].sort((a, b) => b.count - a.count)[0],
    avgMonthly,
    bestMonth,
    totalMonths: counts.length,
  };
}

export async function getCompanyList(userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("job_application")
    .select("company")
    .eq("user_id", userId)
    .eq("is_applied", true);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const r of data ?? []) {
    const c = (r.company as string) ?? "";
    map.set(c, (map.get(c) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => a.company.localeCompare(b.company));
}

export async function getPositionAndSkillData(userId: string) {
  const STATUS_APPROVED = ["offer", "accepted"];
  const STATUS_REJECTED = ["rejected", "withdrawn", "ghosted"];

  const supabase = createServiceRoleClient();
  const { data: apps, error } = await supabase
    .from("job_application")
    .select("position, status")
    .eq("user_id", userId)
    .eq("is_applied", true);
  if (error) throw new Error(error.message);

  const positionMap = new Map<
    string,
    { total: number; approved: number; rejected: number; pending: number }
  >();
  for (const app of apps ?? []) {
    const pos = ((app.position as string) ?? "").trim();
    const key = pos.toLowerCase();
    if (!key) continue;
    if (!positionMap.has(key)) positionMap.set(key, { total: 0, approved: 0, rejected: 0, pending: 0 });
    const entry = positionMap.get(key)!;
    entry.total++;
    const st = (app.status as string) ?? "";
    if (STATUS_APPROVED.includes(st)) entry.approved++;
    else if (STATUS_REJECTED.includes(st)) entry.rejected++;
    else entry.pending++;
  }

  const positionDisplay = new Map<string, string>();
  for (const app of apps ?? []) {
    const pos = ((app.position as string) ?? "").trim();
    const key = pos.toLowerCase();
    if (key && !positionDisplay.has(key)) positionDisplay.set(key, pos);
  }

  const positions = Array.from(positionMap.entries())
    .map(([key, stats]) => ({ position: positionDisplay.get(key) ?? key, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  return { positions, skills: [] as { skillId: string; name: string; category: string; level: string; totalApplications: number; approved: number; rejected: number; pending: number }[] };
}

export async function getLocationData(userId: string) {
  const STATUS_APPROVED = ["offer", "accepted"];
  const STATUS_REJECTED = ["rejected", "withdrawn", "ghosted"];

  const supabase = createServiceRoleClient();
  const { data: apps, error } = await supabase
    .from("job_application")
    .select("location, job_type, status")
    .eq("user_id", userId)
    .eq("is_applied", true);
  if (error) throw new Error(error.message);

  const typeMap: Record<string, { total: number; approved: number; rejected: number }> = {};
  for (const app of apps ?? []) {
    const t = ((app.job_type as string) ?? "other").trim() || "other";
    if (!typeMap[t]) typeMap[t] = { total: 0, approved: 0, rejected: 0 };
    typeMap[t].total++;
    const st = (app.status as string) ?? "";
    if (STATUS_APPROVED.includes(st)) typeMap[t].approved++;
    if (STATUS_REJECTED.includes(st)) typeMap[t].rejected++;
  }

  const cityMap = new Map<string, { display: string; total: number; approved: number; rejected: number }>();
  for (const app of apps ?? []) {
    const raw = ((app.location as string) ?? "Unknown").trim() || "Unknown";
    const key = raw.toLowerCase();
    if (!cityMap.has(key)) cityMap.set(key, { display: raw, total: 0, approved: 0, rejected: 0 });
    const e = cityMap.get(key)!;
    e.total++;
    const st = (app.status as string) ?? "";
    if (STATUS_APPROVED.includes(st)) e.approved++;
    if (STATUS_REJECTED.includes(st)) e.rejected++;
  }

  const topCities = Array.from(cityMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((c) => ({
      ...c,
      successRate: c.total > 0 ? parseFloat(((c.approved / c.total) * 100).toFixed(1)) : 0,
      responseRate: c.total > 0 ? parseFloat((((c.approved + c.rejected) / c.total) * 100).toFixed(1)) : 0,
    }));

  return { typeMap, topCities, total: (apps ?? []).length };
}

export async function getSalaryData(userId: string) {
  const supabase = createServiceRoleClient();
  const { data: apps, error } = await supabase
    .from("job_application")
    .select("salary_min, salary_max, status")
    .eq("user_id", userId)
    .eq("is_applied", true);
  if (error) throw new Error(error.message);

  const withSalary = (apps ?? []).filter((a) => a.salary_min !== null || a.salary_max !== null);

  const withMin = withSalary.filter((a) => a.salary_min !== null);
  const withMax = withSalary.filter((a) => a.salary_max !== null);

  const avgMin =
    withMin.length > 0
      ? Math.round(
          withMin.reduce((s, a) => s + (a.salary_min as number), 0) / withMin.length
        )
      : null;
  const avgMax =
    withMax.length > 0
      ? Math.round(
          withMax.reduce((s, a) => s + (a.salary_max as number), 0) / withMax.length
        )
      : null;

  const mids = withSalary.map((a) =>
    a.salary_min !== null && a.salary_max !== null
      ? ((a.salary_min as number) + (a.salary_max as number)) / 2
      : ((a.salary_min ?? a.salary_max) as number)
  );
  const avgMid = mids.length > 0 ? Math.round(mids.reduce((s, v) => s + v, 0) / mids.length) : null;

  const buckets: Record<string, number> = {};
  for (const app of withSalary) {
    const mid =
      app.salary_min !== null && app.salary_max !== null
        ? ((app.salary_min as number) + (app.salary_max as number)) / 2
        : ((app.salary_min ?? app.salary_max) as number);
    const bucket = mid >= 200000 ? "200k+" : `${Math.floor(mid / 10000) * 10}k`;
    buckets[bucket] = (buckets[bucket] ?? 0) + 1;
  }

  return {
    withSalaryCount: withSalary.length,
    avgMin,
    avgMax,
    avgMid,
    currentSalary: null as number | null,
    pctDiff: null as number | null,
    buckets,
  };
}

export async function getCVPerformanceData(userId: string) {
  const STATUS_APPROVED = ["offer", "accepted"];
  const STATUS_REJECTED = ["rejected", "withdrawn", "ghosted"];

  const supabase = createServiceRoleClient();
  const { data: apps, error } = await supabase
    .from("job_application")
    .select("cv_id, status")
    .eq("user_id", userId)
    .eq("is_applied", true)
    .not("cv_id", "is", null);
  if (error) throw new Error(error.message);

  const byCv = new Map<string, { total: number; approved: number; rejected: number }>();
  for (const app of apps ?? []) {
    const cid = app.cv_id as string;
    if (!byCv.has(cid)) byCv.set(cid, { total: 0, approved: 0, rejected: 0 });
    const e = byCv.get(cid)!;
    e.total++;
    const st = (app.status as string) ?? "";
    if (STATUS_APPROVED.includes(st)) e.approved++;
    if (STATUS_REJECTED.includes(st)) e.rejected++;
  }

  if (byCv.size === 0) return [];

  const cvIds = [...byCv.keys()];
  const { data: cvs, error: cvErr } = await supabase
    .from("user_cv")
    .select("id, description, file_name")
    .eq("user_id", userId)
    .in("id", cvIds);
  if (cvErr) throw new Error(cvErr.message);

  const nameById = new Map<string, string>();
  for (const c of cvs ?? []) {
    nameById.set(
      c.id as string,
      ((c.description as string)?.trim() || (c.file_name as string) || "CV") as string
    );
  }

  return [...byCv.entries()]
    .map(([id, stats]) => {
      const total = stats.total;
      const approved = stats.approved;
      const rejected = stats.rejected;
      const responded = approved + rejected;
      return {
        id,
        name: nameById.get(id) ?? "CV",
        total,
        approved,
        rejected,
        pending: total - responded,
        successRate: total > 0 ? parseFloat(((approved / total) * 100).toFixed(1)) : 0,
        responseRate: total > 0 ? parseFloat(((responded / total) * 100).toFixed(1)) : 0,
      };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);
}
