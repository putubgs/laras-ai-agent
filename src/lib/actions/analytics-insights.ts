"use server";

import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { listApplicationsForUser } from "@/lib/dashboard-repo";
import { getMonthData, getAllTimeData } from "@/lib/dashboard-analytics-data";
import { openRouterChatText } from "@/lib/openrouter";
import { stripAdviceFormatting } from "@/lib/advice-format";
import { ANALYTICS_LARAS_INSIGHTS_MIN_APPLICATIONS } from "@/lib/constants";

/**
 * Laras: one-time strategic commentary on dashboard analytics (plain text).
 * Only allowed when the user has at least {@link ANALYTICS_LARAS_INSIGHTS_MIN_APPLICATIONS} **saved** applications (`is_applied`).
 */
export async function generateAnalyticsStrategicAdvice(input: {
  view: "month" | "all";
  year: number;
  month: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const { userId } = await requireDashboardUser();

  const saved = await listApplicationsForUser(userId, 0, 0, { appliedOnly: true });
  if (saved.length < ANALYTICS_LARAS_INSIGHTS_MIN_APPLICATIONS) {
    return {
      ok: false,
      error: `Laras insights unlock after ${ANALYTICS_LARAS_INSIGHTS_MIN_APPLICATIONS} saved applications. You have ${saved.length}.`,
    };
  }

  const all = await getAllTimeData(userId);
  const monthSnap =
    input.view === "month"
      ? await getMonthData(userId, input.year, input.month)
      : null;

  const payload = {
    view: input.view,
    calendarMonth: input.view === "month" ? { year: input.year, month: input.month } : null,
    allTime: {
      totalApplications: all.total,
      successRatePct: all.successRate,
      rejectionRatePct: all.rejectionRate,
      responseRatePct: all.responseRate,
      approved: all.approved,
      rejected: all.rejected,
      avgMonthlyApplications: all.avgMonthly,
      bestMonthCount: all.bestMonth,
      topSource: all.topSource
        ? { name: all.topSource.name, count: all.topSource.count }
        : null,
      statusBreakdown: all.statusData.map((s) => ({ label: s.name, count: s.value })),
      sourceBreakdown: all.sourceData.slice(0, 8).map((s) => ({ label: s.name, count: s.count })),
      phaseSummary: all.phaseData.map((p) => ({
        phase: p.name,
        scheduled: p.scheduled,
        passed: p.passed,
        failed: p.failed,
      })),
    },
    monthView: monthSnap
      ? {
          totalApplications: monthSnap.total,
          dailyTarget: monthSnap.dailyTarget,
          successRatePct: monthSnap.successRate,
          rejectionRatePct: monthSnap.rejectionRate,
          responseRatePct: monthSnap.responseRate,
          statusBreakdown: monthSnap.statusData.map((s) => ({ label: s.name, count: s.value })),
          sourceBreakdown: monthSnap.sourceData.slice(0, 8).map((s) => ({ label: s.name, count: s.count })),
          phaseSummary: monthSnap.phaseData.map((p) => ({
            phase: p.name,
            scheduled: p.scheduled,
            passed: p.passed,
            failed: p.failed,
          })),
        }
      : null,
  };

  const user = `You are Laras, a warm career strategist. The candidate is viewing their Analytics dashboard.

They have ${saved.length} saved applications in the system (this meets the minimum for insights).

Here is structured analytics JSON (authoritative — do not invent numbers):

${JSON.stringify(payload, null, 2)}

Write strategic advice only:
- Reference real numbers from the JSON when helpful.
- 3–5 short paragraphs, plain sentences, no markdown, no bullets, no # headings, no bold.
- Focus: where they are strong, where to tighten effort, sources and phases worth attention, one concrete next habit for the next 2–4 weeks.
- Tone: encouraging and clear, not generic fluff.
- At most 260 words.
- Last line exactly: Warmly, Laras`;

  const res = await openRouterChatText({
    system:
      "You are Laras. Reply in plain text only — no markdown, no asterisks, no code fences, no JSON.",
    user,
    temperature: 0.55,
    maxTokens: 700,
  });
  if (!res.ok) return { ok: false, error: res.error };
  const text = stripAdviceFormatting(res.text.trim());
  if (!text) return { ok: false, error: "Empty response from Laras." };
  return { ok: true, text: text.slice(0, 6000) };
}
