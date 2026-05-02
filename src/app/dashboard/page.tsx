import { format, getDaysInMonth } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TIME_ZONE, jakartaYearMonthDayNow } from "@/lib/app-timezone";
import { Briefcase, CheckCircle2, XCircle, Clock, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getStatus, getSource } from "@/lib/constants";
import MonthNav from "@/components/dashboard/MonthNav";
import MonthlyProgressCards from "@/components/dashboard/MonthlyProgressCards";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { fetchDashboardMonthData } from "@/lib/dashboard-repo";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { userId, email } = await requireDashboardUser();
  const sp = await searchParams;
  const now = new Date();
  const jDefault = jakartaYearMonthDayNow();
  const year = sp.year ? parseInt(sp.year, 10) : jDefault.year;
  const month = sp.month ? parseInt(sp.month, 10) : jDefault.month;

  const data = await fetchDashboardMonthData(userId, year, month);

  const stats = [
    {
      label: "This Month",
      value: data.monthCount.toLocaleString(),
      sub: "total submitted",
      icon: Briefcase,
      lightColor: "bg-primary/15 ring-1 ring-primary/30",
      textColor: "text-primary",
    },
    {
      label: "Active",
      value: data.active.toLocaleString(),
      sub: "pending response",
      icon: Clock,
      lightColor: "bg-amber-500/15 ring-1 ring-amber-400/35",
      textColor: "text-amber-200",
    },
    {
      label: "Approved",
      value: data.approved.toLocaleString(),
      sub: "offers & interviews",
      icon: CheckCircle2,
      lightColor: "bg-emerald-500/15 ring-1 ring-emerald-400/35",
      textColor: "text-emerald-200",
    },
    {
      label: "Rejected",
      value: data.rejected.toLocaleString(),
      sub: "rejected or ghosted",
      icon: XCircle,
      lightColor: "bg-red-500/15 ring-1 ring-red-400/35",
      textColor: "text-red-200",
    },
  ];

  return (
    <div className="laras-page">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-on-surface">Dashboard</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Signed in as <span className="text-on-surface">{email}</span>
          </p>
          <p className="mt-1 text-on-surface-variant">
            {data.isCurrentMonth
              ? `Today is ${formatInTimeZone(now, APP_TIME_ZONE, "MMMM d")} · Day ${data.dayOfMonth} of ${getDaysInMonth(new Date(year, month - 1))}`
              : format(new Date(year, month - 1), "MMMM yyyy")}
          </p>
        </div>
        <MonthNav year={year} month={month} basePath="/dashboard" />
      </div>

      <div className="mb-8">
        <MonthlyProgressCards
          year={year}
          month={month}
          monthlyTarget={data.monthlyTarget}
          monthCount={data.monthCount}
          todayCount={data.todayCount}
          daysRemainingInMonth={data.daysRemainingInMonth}
          daysElapsedInMonth={data.daysElapsedInMonth}
          isCurrentMonth={data.isCurrentMonth}
        />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="laras-card p-5">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.lightColor}`}
            >
              <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
            </div>
            <p className="font-display text-2xl font-bold text-on-surface">{stat.value}</p>
            <p className="mt-0.5 text-sm font-medium text-on-surface">{stat.label}</p>
            <p className="mt-0.5 text-xs text-on-surface-variant">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="laras-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-outline-variant/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-on-surface-variant" />
            <h2 className="font-display font-semibold text-on-surface">
              Recent in {format(new Date(year, month - 1), "MMMM")}
            </h2>
          </div>
          <Link
            href={`/dashboard/applications?year=${year}&month=${month}`}
            className="laras-link text-sm"
          >
            View all →
          </Link>
        </div>

        {data.recentApplications.length === 0 ? (
          <div className="py-16 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-on-surface-variant/40" />
            <p className="font-medium text-on-surface-variant">No applications this month</p>
            <p className="mt-1 text-sm text-on-surface-variant/80">
              {data.isCurrentMonth
                ? "Start adding applications for this month"
                : "No applications were submitted in this month"}
            </p>
            {data.isCurrentMonth && (
              <Link
                href="/dashboard/applications/new"
                className="laras-btn-primary mt-4 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Add application
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/40">
            {data.recentApplications.map((app) => {
              const status = getStatus(app.status);
              const source = getSource(app.source);
              return (
                <Link
                  key={app.id}
                  href={`/dashboard/applications/${app.id}/edit`}
                  className="laras-scan-hover flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-surface-container-high/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="laras-icon-box flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold">
                      {app.company.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-on-surface">{app.company}</p>
                      <p className="truncate text-xs text-on-surface-variant">{app.position}</p>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: source.color }}
                    >
                      {source.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                    <span className="w-20 text-right text-xs text-on-surface-variant">
                      {format(app.appliedAt, "MMM d")}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
