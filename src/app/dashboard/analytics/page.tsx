import { format } from "date-fns";
import { jakartaYearMonthDayNow } from "@/lib/app-timezone";
import { LOCATION_TYPES, getLocationTypeCardClass } from "@/lib/constants";
import {
  StatusPieChart,
  SourceBarChart,
  TrendLineChart,
  PhaseBarChart,
  MonthlyTrendChart,
} from "@/components/dashboard/AnalyticsCharts";
import {
  TrendingUp,
  Award,
  AlertCircle,
  Building2,
  Layers,
  CalendarDays,
  FileText,
  MapPin,
  DollarSign,
} from "lucide-react";
import MonthNav from "@/components/dashboard/MonthNav";
import CompanyAnalysis from "@/components/dashboard/CompanyAnalysis";
import PositionSkillAnalysis from "@/components/dashboard/PositionSkillAnalysis";
import ViewToggle from "@/components/dashboard/ViewToggle";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import {
  getMonthData,
  getAllTimeData,
  getCompanyList,
  getPositionAndSkillData,
  getCVPerformanceData,
  getLocationData,
  getSalaryData,
} from "@/lib/dashboard-analytics-data";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; view?: string }>;
}) {
  const { userId } = await requireDashboardUser();
  const sp = await searchParams;
  const view = sp.view === "all" ? "all" : "month";
  const jDefault = jakartaYearMonthDayNow();
  const year = sp.year ? parseInt(sp.year, 10) : jDefault.year;
  const month = sp.month ? parseInt(sp.month, 10) : jDefault.month;

  const [monthData, allTimeData, companies, positionSkillData, cvPerformance, locationData, salaryData] =
    await Promise.all([
      view === "month" ? getMonthData(userId, year, month) : null,
      view === "all" ? getAllTimeData(userId) : null,
      getCompanyList(userId),
      getPositionAndSkillData(userId),
      getCVPerformanceData(userId),
      getLocationData(userId),
      getSalaryData(userId),
    ]);

  const data = (view === "month" ? monthData : allTimeData)!;

  const summaryCards = [
    {
      label: "Response Rate",
      value: `${data.responseRate}%`,
      sub: `${data.approved + data.rejected} of ${data.total} responded`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10 ring-1 ring-primary/25",
    },
    {
      label: "Success Rate",
      value: `${data.successRate}%`,
      sub: `${data.approved} offers / approvals`,
      icon: Award,
      color: "text-emerald-200",
      bg: "bg-emerald-500/15 ring-1 ring-emerald-400/30",
    },
    {
      label: "Rejection Rate",
      value: `${data.rejectionRate}%`,
      sub: `${data.rejected} rejected / ghosted`,
      icon: AlertCircle,
      color: "text-red-200",
      bg: "bg-red-500/15 ring-1 ring-red-400/30",
    },
    ...(view === "all" && allTimeData
      ? [
          {
            label: "Avg per Month",
            value: String(allTimeData.avgMonthly),
            sub: `Best: ${allTimeData.bestMonth} in a month`,
            icon: CalendarDays,
            color: "text-secondary",
            bg: "bg-secondary-container/15 ring-1 ring-secondary-container/35",
          },
        ]
      : []),
  ];

  return (
    <div className="laras-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-on-surface">Analytics</h1>
          <p className="text-on-surface-variant mt-1">
            {data.total.toLocaleString()} applications ·{" "}
            {view === "all"
              ? "All Time"
              : format(new Date(year, month - 1), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <ViewToggle view={view} year={year} month={month} />
          {/* Month nav (only in month view) */}
          {view === "month" && (
            <MonthNav year={year} month={month} basePath="/dashboard/analytics" extraParams={{ view: "month" }} />
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 gap-5 mb-8 ${summaryCards.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {summaryCards.map((card) => (
          <div key={card.label} className="laras-card p-5">
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="font-display text-2xl font-bold text-on-surface">{card.value}</p>
            <p className="text-sm font-medium text-on-surface-variant mt-0.5">{card.label}</p>
            <p className="text-xs text-on-surface-variant/70 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Top source banner */}
      {data.topSource && (
        <div className="laras-glass border border-secondary/30 rounded-2xl px-5 py-4 mb-8 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: data.topSource.color }} />
          <p className="text-sm text-secondary-container">
            <span className="font-semibold">{data.topSource.name}</span> is your top source with{" "}
            <span className="font-semibold">{data.topSource.count}</span> applications (
            {data.total > 0 ? Math.round((data.topSource.count / data.total) * 100) : 0}% of total)
          </p>
        </div>
      )}

      {/* Status + Source */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="laras-card p-6">
          <h2 className="font-display text-base font-semibold text-on-surface mb-4">Status Distribution</h2>
          {data.statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-on-surface-variant/70 text-sm">No data yet</div>
          ) : (
            <StatusPieChart data={data.statusData} />
          )}
        </div>

        <div className="laras-card p-6">
          <h2 className="font-display text-base font-semibold text-on-surface mb-4">Applications by Source</h2>
          {data.sourceData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-on-surface-variant/70 text-sm">No data yet</div>
          ) : (
            <SourceBarChart data={data.sourceData} />
          )}
        </div>
      </div>

      {/* Trend chart */}
      <div className="laras-card p-6 mb-5">
        {view === "month" && monthData ? (
          <>
            <h2 className="font-display text-base font-semibold text-on-surface mb-4">30-Day Application Trend</h2>
            {monthData.trendData.every((d) => d.count === 0) ? (
              <div className="h-48 flex items-center justify-center text-on-surface-variant/70 text-sm">No data in this period</div>
            ) : (
              <TrendLineChart data={monthData.trendData} dailyTarget={monthData.dailyTarget} />
            )}
          </>
        ) : allTimeData ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-on-surface">Monthly Application Trend</h2>
              <span className="text-xs text-on-surface-variant/70 bg-surface-container-low/60 px-2 py-1 rounded-lg">
                {allTimeData.totalMonths} active month{allTimeData.totalMonths !== 1 ? "s" : ""}
              </span>
            </div>
            {allTimeData.monthlyTrend.every((d) => d.count === 0) ? (
              <div className="h-48 flex items-center justify-center text-on-surface-variant/70 text-sm">No data yet</div>
            ) : (
              <MonthlyTrendChart data={allTimeData.monthlyTrend} avgMonthly={allTimeData.avgMonthly} />
            )}
          </>
        ) : null}
      </div>

      {/* Phase */}
      <div className="laras-card p-6 mb-5">
        <h2 className="font-display text-base font-semibold text-on-surface mb-1">Phase Analysis</h2>
        <p className="text-sm text-on-surface-variant mb-4">
          {view === "all" ? "All-time distribution of interview phases" : "Distribution of interview phases this month"}
        </p>
        {data.phaseData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-on-surface-variant/70 text-sm">
            No phase data yet — add phases to your applications
          </div>
        ) : (
          <PhaseBarChart data={data.phaseData} />
        )}
      </div>

      {/* Position & Skill Analysis */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-on-surface">
            Position & Skill Analysis{" "}
            <span className="text-xs font-normal text-on-surface-variant/70 ml-1">(all time)</span>
          </h2>
        </div>
        <PositionSkillAnalysis positions={positionSkillData.positions} skills={positionSkillData.skills} />
      </div>

      {/* Location Analysis */}
      <div className="laras-card p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="font-display text-base font-semibold text-on-surface">Location Analysis</h2>
          <span className="ml-1 text-xs font-normal text-on-surface-variant/70">(all time)</span>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          Where are you applying and which locations respond better.
        </p>

        {/* Work type breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {LOCATION_TYPES.map(({ value, label }) => {
            const d = locationData.typeMap[value] ?? { total: 0, approved: 0, rejected: 0 };
            const pct = locationData.total > 0 ? Math.round((d.total / locationData.total) * 100) : 0;
            return (
              <div key={value} className={getLocationTypeCardClass(value)}>
                <p className="mb-1 text-xs font-medium text-on-surface-variant">{label}</p>
                <p className="font-display text-2xl font-bold text-on-surface">{d.total}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant/80">{pct}% of total</p>
                {d.approved > 0 && (
                  <p className="mt-1 text-xs font-medium text-emerald-200">{d.approved} approved</p>
                )}
              </div>
            );
          })}
        </div>
   

        {/* Top cities table */}
        {locationData.topCities.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/50">
                  <th className="text-left font-medium text-on-surface-variant pb-3 pr-4">Location</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-3">Applied</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-3">Approved</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-3">Rejected</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-3">Response</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 pl-3">Success</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {locationData.topCities.map((city, i) => (
                  <tr key={i} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-on-surface">{city.display}</td>
                    <td className="py-2.5 px-3 text-right text-on-surface-variant">{city.total}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-300 font-medium">{city.approved}</td>
                    <td className="py-2.5 px-3 text-right text-red-300">{city.rejected}</td>
                    <td className="py-2.5 px-3 text-right text-on-surface-variant">{city.responseRate}%</td>
                    <td className="py-2.5 pl-3 text-right">
                      <span
                        className={`font-semibold ${
                          city.successRate >= 10
                            ? "text-emerald-200"
                            : city.successRate > 0
                              ? "text-amber-200"
                              : "text-on-surface-variant/70"
                        }`}
                      >
                        {city.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary Insights */}
      {salaryData.withSalaryCount > 0 && (
        <div className="laras-card p-6 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-primary-container" />
            <h2 className="font-display text-base font-semibold text-on-surface">Salary Insights</h2>
            <span className="ml-1 text-xs font-normal text-on-surface-variant/70">(all time · {salaryData.withSalaryCount} applications with salary data)</span>
          </div>
          <p className="text-sm text-on-surface-variant mb-5">
            Average salary range you are targeting vs your current salary.
          </p>

          <div className={`grid gap-4 mb-6 ${salaryData.currentSalary !== null ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3"}`}>
            {salaryData.avgMin !== null && (
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-4">
                <p className="text-xs text-on-surface-variant mb-1">Avg Min Salary</p>
                <p className="text-xl font-bold text-on-surface">${salaryData.avgMin.toLocaleString()}</p>
              </div>
            )}
            {salaryData.avgMax !== null && (
              <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-4">
                <p className="text-xs text-on-surface-variant mb-1">Avg Max Salary</p>
                <p className="text-xl font-bold text-on-surface">${salaryData.avgMax.toLocaleString()}</p>
              </div>
            )}
            {salaryData.avgMid !== null && (
              <div className="rounded-xl border border-outline-variant/50 bg-primary/10 p-4 ring-1 ring-primary/20">
                <p className="mb-1 text-xs text-primary">Avg Mid-Point</p>
                <p className="text-xl font-bold text-on-surface">${salaryData.avgMid.toLocaleString()}</p>
              </div>
            )}
            {salaryData.currentSalary !== null && (
              <div
                className={`rounded-xl border border-outline-variant/50 p-4 ring-1 ${
                  salaryData.pctDiff !== null && salaryData.pctDiff > 0
                    ? "bg-emerald-500/15 ring-emerald-400/25"
                    : "bg-amber-500/15 ring-amber-400/25"
                }`}
              >
                <p
                  className={`mb-1 text-xs ${
                    salaryData.pctDiff !== null && salaryData.pctDiff > 0 ? "text-emerald-200" : "text-amber-200"
                  }`}
                >
                  vs Your Salary
                </p>
                <p
                  className={`text-xl font-bold ${
                    salaryData.pctDiff !== null && salaryData.pctDiff > 0 ? "text-emerald-100" : "text-amber-100"
                  }`}
                >
                  {salaryData.pctDiff !== null
                    ? `${salaryData.pctDiff > 0 ? "+" : ""}${salaryData.pctDiff}%`
                    : "—"}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Your salary: ${salaryData.currentSalary.toLocaleString()}
                </p>
              </div>
            )}
          </div>


        </div>
      )}

      {/* CV Performance */}
      {cvPerformance.length > 0 && (
        <div className="laras-card p-6 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-primary-container" />
            <h2 className="font-display text-base font-semibold text-on-surface">CV Version Performance</h2>
            <span className="ml-1 text-xs font-normal text-on-surface-variant/70">(all time)</span>
          </div>
          <p className="text-sm text-on-surface-variant mb-5">
            Which CV version generates more callbacks and offers.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/50">
                  <th className="text-left font-medium text-on-surface-variant pb-3 pr-4">CV Name</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-4">Applied</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-4">Approved</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-4">Rejected</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-4">Pending</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 px-4">Response Rate</th>
                  <th className="text-right font-medium text-on-surface-variant pb-3 pl-4">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {cvPerformance.map((cv, i) => {
                  const best = cvPerformance[0].successRate;
                  const isBest = cv.successRate === best && cv.successRate > 0 && i === cvPerformance.findIndex((c) => c.successRate === best);
                  return (
                    <tr key={cv.id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-3 pr-4 font-medium text-on-surface">
                        <div className="flex items-center gap-2">
                          {isBest && (
                            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-400/35">
                              Best
                            </span>
                          )}
                          {cv.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-on-surface-variant">{cv.total}</td>
                      <td className="py-3 px-4 text-right text-emerald-300 font-medium">{cv.approved}</td>
                      <td className="py-3 px-4 text-right text-red-300">{cv.rejected}</td>
                      <td className="py-3 px-4 text-right text-on-surface-variant/70">{cv.pending}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary-container/90"
                              style={{ width: `${cv.responseRate}%` }}
                            />
                          </div>
                          <span className="text-on-surface-variant tabular-nums w-10 text-right">{cv.responseRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cv.successRate >= 10
                                  ? "bg-emerald-400"
                                  : cv.successRate > 0
                                    ? "bg-amber-400"
                                    : "bg-outline-variant"
                              }`}
                              style={{ width: `${Math.min(cv.successRate * 2, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`w-10 text-right font-medium tabular-nums ${
                              cv.successRate >= 10
                                ? "text-emerald-200"
                                : cv.successRate > 0
                                  ? "text-amber-200"
                                  : "text-on-surface-variant/70"
                            }`}
                          >
                            {cv.successRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {cvPerformance.length === 1 && (
            <p className="text-xs text-on-surface-variant/70 mt-4 text-center">
              Upload more CV versions and tag applications to compare performance across versions.
            </p>
          )}
        </div>
      )}

      {/* Company History */}
      <div className="laras-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-secondary-container" />
          <h2 className="font-display text-base font-semibold text-on-surface">Company Application History</h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          Search any company to see all applications across all months.
          {companies.length > 0 && (
            <span className="ml-1 text-primary font-medium">
              {companies.length} unique {companies.length === 1 ? "company" : "companies"} tracked.
            </span>
          )}
        </p>
        <CompanyAnalysis companies={companies} />
      </div>
    </div>
  );
}
