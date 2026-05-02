import FindJobClient from "@/components/dashboard/FindJobClient";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { listUserCvOptions } from "@/lib/dashboard-repo";
import { Search } from "lucide-react";

/** Apify + OpenRouter scoring can exceed default function limits on hosts. */
export const maxDuration = 300;

export default async function FindJobPage() {
  const { userId } = await requireDashboardUser();
  const cvVersions = await listUserCvOptions(userId);

  return (
    <div className="laras-page max-w-5xl">
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <Search className="h-3.5 w-3.5" />
          LinkedIn
        </div>
        <h1 className="font-display text-on-surface text-2xl font-semibold">Find a job</h1>
        <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Search LinkedIn via Apify, score each listing against your CV with the same blend as Check CV match,
          then open a role in New application with fields prefilled.
        </p>
      </div>

      {cvVersions.length === 0 ? (
        <div className="laras-card p-8 text-center text-on-surface-variant">
          <p className="text-sm">Upload a CV under My CVs first, then return here to search.</p>
        </div>
      ) : (
        <FindJobClient cvVersions={cvVersions} />
      )}
    </div>
  );
}
