import Link from "next/link";
import { Plus, Briefcase } from "lucide-react";
import { format } from "date-fns";
import ApplicationsTable from "@/components/dashboard/ApplicationsTable";
import MonthFilter from "@/components/dashboard/MonthFilter";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { listApplicationsForUser } from "@/lib/dashboard-repo";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { userId } = await requireDashboardUser();
  const sp = await searchParams;

  const hasMonthFilter = sp.year != null && sp.month != null;
  const year = hasMonthFilter ? parseInt(sp.year!, 10) : 0;
  const month = hasMonthFilter ? parseInt(sp.month!, 10) : 0;

  const applications = await listApplicationsForUser(userId, year, month);

  const draftCount = applications.filter((a) => !a.isApplied).length;
  const savedCount = applications.length - draftCount;

  const monthLabel =
    year === 0 ? "All Time" : format(new Date(year, month - 1), "MMMM yyyy");

  return (
    <div className="laras-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-on-surface">Applications</h1>
          <p className="mt-1 text-on-surface-variant">
            {savedCount.toLocaleString()} saved
            {draftCount > 0 ? ` · ${draftCount.toLocaleString()} draft${draftCount === 1 ? "" : "s"}` : ""} ·{" "}
            {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthFilter year={year} month={month} basePath="/dashboard/applications" />
          <Link href="/dashboard/applications/new" className="laras-btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Application
          </Link>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="laras-card py-20 text-center">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-on-surface-variant/40" />
          <h2 className="font-display text-lg font-semibold text-on-surface">No applications yet</h2>
          <p className="mt-1 mb-6 text-sm text-on-surface-variant">
            {year === 0
              ? "Start adding your job applications to track your progress"
              : `No applications in ${monthLabel}`}
          </p>
          <Link href="/dashboard/applications/new" className="laras-btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Application
          </Link>
        </div>
      ) : (
        <ApplicationsTable applications={applications} />
      )}
    </div>
  );
}
