"use client";

import { useState } from "react";
import { Loader2, MapPin, Briefcase, FileText, Search, ExternalLink } from "lucide-react";
import {
  scrapeLinkedInJobsForUser,
  scoreFindJobListingsForUser,
  type FindJobListing,
} from "@/lib/actions/find-jobs";
import {
  stashFindJobApplyDraftForNewTab,
  useJobApplyDraftStore,
} from "@/stores/job-apply-draft-store";

type CvOption = { id: string; name: string };

/** Match badge: 0–30% low fit, 30–70% mid, 70–100% strong. */
function matchPercentBadgeClass(pct: number): string {
  if (pct <= 30) {
    return "bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/40 shadow-[0_0_14px_-3px_rgba(251,113,133,0.35)]";
  }
  if (pct <= 70) {
    return "bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/35 shadow-[0_0_14px_-3px_rgba(251,191,36,0.28)]";
  }
  return "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-400/40 shadow-[0_0_14px_-3px_rgba(52,211,153,0.32)]";
}

export default function FindJobClient({ cvVersions }: { cvVersions: CvOption[] }) {
  const setDraft = useJobApplyDraftStore((s) => s.setJobApplyDraft);
  const [jobName, setJobName] = useState("");
  const [location, setLocation] = useState("");
  const [cvId, setCvId] = useState(cvVersions[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dailyTarget, setDailyTarget] = useState<number | null>(null);
  const [jobsReturned, setJobsReturned] = useState<number | null>(null);
  const [jobs, setJobs] = useState<FindJobListing[]>([]);
  const [showEmptyNotice, setShowEmptyNotice] = useState(false);

  const showFindButton = !busy && !statusMessage;

  const handleSearch = async () => {
    setError(null);
    setShowEmptyNotice(false);
    setJobs([]);
    setDailyTarget(null);
    setJobsReturned(null);
    setStatusMessage(null);
    setBusy(true);

    try {
      setStatusMessage("Searching LinkedIn…");
      const scraped = await scrapeLinkedInJobsForUser({
        jobName,
        location,
      });

      if (!scraped.ok) {
        setError(scraped.error);
        return;
      }

      setDailyTarget(scraped.dailyTarget);
      const n = scraped.jobs.length;
      if (n === 0) {
        setShowEmptyNotice(true);
        setStatusMessage(null);
        return;
      }

      const label = n === 1 ? "job" : "jobs";
      setStatusMessage(
        `${n} ${label} found — please wait, Laras is assessing them for you.`,
      );

      const scored = await scoreFindJobListingsForUser({
        cvId,
        jobs: scraped.jobs,
      });

      if (!scored.ok) {
        setError(scored.error);
        return;
      }

      setJobsReturned(scored.jobs.length);
      setJobs(scored.jobs);
      setShowEmptyNotice(scored.jobs.length === 0);
    } finally {
      setBusy(false);
      setStatusMessage(null);
    }
  };

  const handleApply = (job: FindJobListing) => {
    const draft = {
      company: job.company,
      position: job.title,
      jobUrl: job.url,
      jobDescription: job.fullDescription,
      location: location.trim() || "",
      cvId,
    };
    setDraft(draft);
    const handoffId = stashFindJobApplyDraftForNewTab(draft);
    if (!handoffId) {
      setError(
        "Could not open apply tab — browser storage is blocked or full. Allow site data for this origin and try again.",
      );
      return;
    }
    window.open(
      `/dashboard/applications/new?fromFind=${encodeURIComponent(handoffId)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="space-y-8">
      <div className="laras-card p-6">
        <h2 className="font-display text-base font-semibold text-on-surface mb-4">
          Search LinkedIn
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Job title or keywords <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="e.g. Senior React Developer"
                className="laras-field w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Jakarta, Remote"
                className="laras-field w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              CV for match score <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <select
                value={cvId}
                onChange={(e) => setCvId(e.target.value)}
                className="laras-field w-full appearance-none rounded-xl py-2.5 pl-9 pr-4 text-sm"
              >
                {cvVersions.length === 0 ? (
                  <option value="">Upload a CV first</option>
                ) : (
                  cvVersions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">
          Listing count follows your dashboard daily target (capped at 50). Each card uses the same CV
          match model as Check CV match (75% role fit + 25% keyword overlap).
        </p>
        {error && (
          <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}
        {statusMessage && (
          <div
            className="relative mt-5 overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-surface-container-high/95 via-surface-container-low/85 to-primary/[0.07] p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_8px_32px_-12px_rgba(0,218,243,0.35)]"
            role="status"
            aria-live="polite"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_100%_0%,rgba(0,218,243,0.14),transparent_50%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(99,102,241,0.08),transparent_45%)]" />
            <div className="relative flex items-center gap-4 rounded-[0.9rem] bg-surface-container-low/40 px-4 py-4 sm:px-5 sm:py-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/45">
                <span className="absolute inset-0 rounded-xl bg-primary/30 opacity-40 blur-md" aria-hidden />
                <Loader2 className="relative h-6 w-6 animate-spin text-primary" aria-hidden />
              </div>
              <p className="text-sm font-medium leading-snug tracking-tight text-on-surface sm:text-[0.9375rem]">
                {statusMessage}
              </p>
            </div>
          </div>
        )}
        {showFindButton && (
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={!jobName.trim() || !cvId}
            className="laras-btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Find jobs
          </button>
        )}
      </div>

      {dailyTarget != null && jobsReturned != null && jobs.length > 0 && (
        <p className="text-sm text-on-surface-variant">
          Daily target pace: <strong className="text-on-surface">{dailyTarget}</strong> — showing{" "}
          <strong className="text-on-surface">{jobsReturned}</strong> roles (after scoring).
        </p>
      )}

      {jobs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <article
              key={job.id}
              className="laras-card flex flex-col border border-outline-variant/50 p-5"
            >
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold leading-snug text-on-surface">
                    {job.title}
                  </h3>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums ${matchPercentBadgeClass(job.matchPercentage)}`}
                  >
                    {job.matchPercentage}%
                  </span>
                </div>
                <p className="text-xs font-medium text-on-surface-variant">{job.company}</p>
                <p className="line-clamp-4 flex-1 text-sm text-on-surface-variant">{job.shortDescription}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant/40 pt-4">
                {job.url ? (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Job posting
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleApply(job)}
                  className="laras-btn-primary ml-auto text-sm"
                >
                  Apply
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showEmptyNotice && !busy && (
        <p className="text-sm text-on-surface-variant">
          No roles returned — try different keywords or location.
        </p>
      )}
    </div>
  );
}
