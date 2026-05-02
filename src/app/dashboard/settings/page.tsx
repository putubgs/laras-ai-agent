import PhaseManager from "@/components/dashboard/PhaseManager";
import TargetEditor from "@/components/dashboard/TargetEditor";
import { DEFAULT_MONTHLY_TARGET } from "@/lib/constants";
import { Settings, Layers, Target } from "lucide-react";
import { addMonths } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { listPhases, listMonthlyTargetsForUser } from "@/lib/dashboard-repo";
import { APP_TIME_ZONE, jakartaYearMonthDayNow } from "@/lib/app-timezone";

async function getSettings(userId: string) {
  const j = jakartaYearMonthDayNow();
  const anchor = fromZonedTime(new Date(j.year, j.month - 1, 15, 12, 0, 0, 0), APP_TIME_ZONE);
  const rangeMonths = [-3, -2, -1, 0, 1, 2].map((delta) => {
    const d = addMonths(anchor, delta);
    const ym = formatInTimeZone(d, APP_TIME_ZONE, "yyyy-MM");
    const [year, month] = ym.split("-").map((x) => parseInt(x, 10));
    return { year, month };
  });

  const [phases, targets] = await Promise.all([
    listPhases(),
    listMonthlyTargetsForUser(userId, rangeMonths),
  ]);

  return { phases, targets };
}

export default async function SettingsPage() {
  const { userId } = await requireDashboardUser();
  const { phases, targets } = await getSettings(userId);

  return (
    <div className="laras-page max-w-4xl">
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-2">
          <Settings className="h-5 w-5 text-on-surface-variant" />
          <h1 className="text-2xl font-bold text-on-surface">Settings</h1>
        </div>
        <p className="text-on-surface-variant">
          Configure monthly targets and interview phases
        </p>
      </div>

      <div className="laras-card mb-6 p-6">
        <div className="mb-2 flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-semibold text-on-surface">Monthly Targets</h2>
        </div>
        <p className="mb-5 text-sm text-on-surface-variant">
          Set how many job applications you aim to submit each month. Click any number to edit it.
          The daily target is calculated automatically based on remaining days.
        </p>
        <TargetEditor
          targets={targets.map((t) => ({
            year: t.year,
            month: t.month,
            target: t.target,
          }))}
          defaultTarget={DEFAULT_MONTHLY_TARGET}
        />
      </div>

      <div className="laras-card p-6">
        <div className="mb-2 flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-semibold text-on-surface">Interview Phases</h2>
        </div>
        <p className="mb-5 text-sm text-on-surface-variant">
          Customize the phases used to track your interview process. These appear when editing
          individual applications.
        </p>
        <PhaseManager phases={phases} />
      </div>
    </div>
  );
}
