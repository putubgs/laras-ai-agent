import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ApplicationForm from "@/components/dashboard/ApplicationForm";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import {
  listPhases,
  listApplicationSummariesForUser,
  listUserCvOptions,
} from "@/lib/dashboard-repo";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function NewApplicationPage() {
  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const fullName = (userRow?.full_name as string) ?? "";

  const [phases, existingApps, cvVersions] = await Promise.all([
    listPhases({ activeOnly: true }),
    listApplicationSummariesForUser(userId),
    listUserCvOptions(userId),
  ]);

  return (
    <div className="laras-page max-w-4xl">
      <div className="mb-8">
        <Link
          href="/dashboard/applications"
          className="laras-link mb-4 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Applications
        </Link>
        <h1 className="font-display text-on-surface">New Application</h1>
        <p className="text-on-surface-variant mt-1">Track a new job application</p>
      </div>

      <Suspense
        fallback={
          <div className="laras-card p-8 text-sm text-on-surface-variant">Loading form…</div>
        }
      >
        <ApplicationForm
          phases={phases}
          existingApps={existingApps}
          candidateName={fullName}
          candidateSummary={null}
          cvContext={null}
          cvVersions={cvVersions}
        />
      </Suspense>
    </div>
  );
}
