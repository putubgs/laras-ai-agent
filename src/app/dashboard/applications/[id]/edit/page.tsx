import { Suspense } from "react";
import ApplicationForm from "@/components/dashboard/ApplicationForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import {
  getApplicationForUser,
  listPhases,
  listApplicationSummariesForUser,
  listUserCvOptions,
} from "@/lib/dashboard-repo";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

async function getData(userId: string, id: string) {
  const supabase = createServiceRoleClient();
  const [application, phases, existingApps, cvVersions, userRes] = await Promise.all([
    getApplicationForUser(userId, id),
    listPhases({ activeOnly: true }),
    listApplicationSummariesForUser(userId),
    listUserCvOptions(userId),
    supabase.from("users").select("full_name").eq("id", userId).maybeSingle(),
  ]);

  if (!application) return null;

  const fullName = (userRes.data?.full_name as string) ?? "";

  return { application, phases, existingApps, cvVersions, fullName };
}

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await requireDashboardUser();
  const { id } = await params;
  const data = await getData(userId, id);
  if (!data) notFound();

  const { application, phases, existingApps, cvVersions, fullName } = data;

  const formApplication = {
    id: application.id,
    company: application.company,
    position: application.position,
    location: application.location,
    locationType: application.locationType,
    jobUrl: application.jobUrl,
    source: application.source,
    status: application.status,
    salaryMin: application.salaryMin,
    salaryMax: application.salaryMax,
    contactName: application.contactName,
    notes: application.notes,
    jobDescription: application.jobDescription,
    coverLetter: application.coverLetter,
    cvId: application.cvId,
    appliedAt: application.appliedAt,
    phases: application.phases,
    matchPercentage: application.matchPercentage,
    jobMatchKeywords: application.jobMatchKeywords,
    matchedJobCvKeywords: application.matchedJobCvKeywords,
    isApplied: application.isApplied,
  };

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
        <h1 className="font-display text-on-surface">
          {application.company} — {application.position}
        </h1>
        <p className="text-on-surface-variant mt-1">Edit application details and track phases</p>
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
          application={formApplication}
        />
      </Suspense>
    </div>
  );
}
