"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import {
  Building2,
  Briefcase,
  MapPin,
  Link2,
  Globe,
  DollarSign,
  User,
  FileText,
  Calendar,
  Loader2,
  Save,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Sparkles,
  CheckCircle2,
  Percent,
} from "lucide-react";
import {
  APPLICATION_STATUSES,
  APPLICATION_SOURCES,
  LOCATION_TYPES,
  PHASE_STATUSES,
} from "@/lib/constants";
import {
  createApplication,
  updateApplication,
  addApplicationPhase,
  updateApplicationPhase,
  removeApplicationPhase,
  analyzeJobCvMatchAndSave,
  type ApplicationFormData,
  type AnalyzeJobCvMatchInput,
} from "@/lib/actions/applications";
import { generateCompanyOverview, translateToEnglish } from "@/lib/actions/gemini";
import CoverLetterSection from "@/components/dashboard/CoverLetterSection";
import { LarasTypingAdvice } from "@/components/dashboard/LarasTypingAdvice";
import { APP_TIME_ZONE } from "@/lib/app-timezone";

type Phase = { id: string; name: string; color: string; order: number };
type AppPhase = {
  id: string;
  phaseId: string;
  phase: { name: string; color: string };
  status: string;
  scheduledAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
};

export type ExistingAppSummary = {
  id: string;
  company: string;
  position: string;
  appliedAt: Date;
  isApplied: boolean;
};

type CVOption = { id: string; name: string };

type Props = {
  phases: Phase[];
  existingApps: ExistingAppSummary[];
  candidateName: string;
  candidateSummary: string | null;
  cvContext: string | null;
  cvVersions: CVOption[];
  application?: {
    id: string;
    company: string;
    position: string;
    location: string | null;
    locationType: string;
    jobUrl: string | null;
    source: string;
    status: string;
    salaryMin: number | null;
    salaryMax: number | null;
    contactName: string | null;
    notes: string | null;
    jobDescription: string | null;
    coverLetter: string | null;
    cvId: string | null;
    appliedAt: Date;
    phases: AppPhase[];
    matchPercentage?: number | null;
    jobMatchKeywords?: string[];
    matchedJobCvKeywords?: string[];
    /** False until the user saves the application (not match-only). */
    isApplied?: boolean;
  };
};

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export default function ApplicationForm({
  phases,
  existingApps,
  candidateName,
  candidateSummary,
  cvContext,
  cvVersions,
  application,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [overviewAiError, setOverviewAiError] = useState<string | null>(null);
  const [overviewAiSuccess, setOverviewAiSuccess] = useState(false);

  const [isTranslatingJob, setIsTranslatingJob] = useState(false);
  const [translateJobError, setTranslateJobError] = useState<string | null>(null);
  const [isTranslatingNotes, setIsTranslatingNotes] = useState(false);
  const [translateNotesError, setTranslateNotesError] = useState<string | null>(null);

  const [phaseForm, setPhaseForm] = useState<{
    phaseId: string;
    status: string;
    scheduledAt: string;
    notes: string;
  } | null>(null);

  const isEdit = !!application;

  // Controlled fields for duplicate detection + AI helpers
  const [company, setCompany] = useState(application?.company ?? "");
  const [position, setPosition] = useState(application?.position ?? "");
  const [notes, setNotes] = useState(application?.notes ?? "");
  const [jobDescription, setJobDescription] = useState(
    application?.jobDescription ?? "",
  );
  const [coverLetter, setCoverLetter] = useState(
    application?.coverLetter ?? "",
  );
  const [cvId, setCvId] = useState(application?.cvId ?? "");
  const [salaryMin, setSalaryMin] = useState(application?.salaryMin?.toString() ?? "");
  const [salaryMax, setSalaryMax] = useState(application?.salaryMax?.toString() ?? "");
  const salaryError =
    salaryMin && salaryMax && parseInt(salaryMin) > parseInt(salaryMax)
      ? "Min salary cannot be greater than max salary"
      : null;

  const [matchUi, setMatchUi] = useState<{
    percentage: number;
    llmMatchScore: number | null;
    keywordMatchScore: number | null;
    jobKeywords: string[];
    matchedKeywords: string[];
    larasAdvice: string | null;
  } | null>(() => {
    if (!application || application.matchPercentage == null) return null;
    return {
      percentage: application.matchPercentage,
      llmMatchScore: null,
      keywordMatchScore: null,
      jobKeywords: application.jobMatchKeywords ?? [],
      matchedKeywords: application.matchedJobCvKeywords ?? [],
      larasAdvice: null,
    };
  });
  const [matchError, setMatchError] = useState<string | null>(null);
  const [isMatchingJob, setIsMatchingJob] = useState(false);

  // Debounced values for duplicate check
  const [debouncedCompany, setDebouncedCompany] = useState(company);
  const [debouncedPosition, setDebouncedPosition] = useState(position);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCompany(company), 400);
    return () => clearTimeout(t);
  }, [company]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPosition(position), 400);
    return () => clearTimeout(t);
  }, [position]);

  /** One-shot: after first match on a new app we redirect to edit — Laras text is not in DB, so recover from sessionStorage. */
  useEffect(() => {
    const id = application?.id;
    if (!id) return;
    const matchPercentage = application.matchPercentage;
    const jobMatchKeywords = application.jobMatchKeywords;
    const matchedJobCvKeywords = application.matchedJobCvKeywords;
    queueMicrotask(() => {
      try {
        const key = `laras_match_advice_flash_${id}`;
        const raw = sessionStorage.getItem(key);
        if (!raw) return;
        sessionStorage.removeItem(key);
        setMatchUi((prev) => {
          if (prev) return { ...prev, larasAdvice: raw };
          if (matchPercentage == null) return prev;
          return {
            percentage: matchPercentage,
            llmMatchScore: null,
            keywordMatchScore: null,
            jobKeywords: jobMatchKeywords ?? [],
            matchedKeywords: matchedJobCvKeywords ?? [],
            larasAdvice: raw,
          };
        });
      } catch {
        /* ignore */
      }
    });
  }, [
    application?.id,
    application?.matchPercentage,
    application?.jobMatchKeywords,
    application?.matchedJobCvKeywords,
  ]);

  const now = new Date();
  const todayStr = formatInTimeZone(now, APP_TIME_ZONE, "yyyy-MM-dd");

  const duplicates = useMemo(() => {
    if (!debouncedCompany.trim() || !debouncedPosition.trim()) return [];
    const nc = normalize(debouncedCompany);
    const np = normalize(debouncedPosition);
    return existingApps.filter((app) => {
      if (isEdit && app.id === application?.id) return false;
      return normalize(app.company) === nc && normalize(app.position) === np;
    });
  }, [
    debouncedCompany,
    debouncedPosition,
    existingApps,
    isEdit,
    application?.id,
  ]);

  const { currentMonthDupes, otherMonthDupes } = useMemo(() => {
    const thisMonthYm = formatInTimeZone(new Date(), APP_TIME_ZONE, "yyyy-MM");
    const current: typeof duplicates = [];
    const other: typeof duplicates = [];
    for (const d of duplicates) {
      const ym = formatInTimeZone(new Date(d.appliedAt), APP_TIME_ZONE, "yyyy-MM");
      if (ym === thisMonthYm) current.push(d);
      else other.push(d);
    }
    return { currentMonthDupes: current, otherMonthDupes: other };
  }, [duplicates]);

  const handleGenerateNotes = async () => {
    if (!company.trim()) return;
    setIsGenerating(true);
    setOverviewAiError(null);
    setOverviewAiSuccess(false);
    const result = await generateCompanyOverview(company.trim());
    setIsGenerating(false);
    if (result.success && result.text) {
      setNotes(result.text);
      setOverviewAiSuccess(true);
      setTimeout(() => setOverviewAiSuccess(false), 3000);
    } else {
      setOverviewAiError(result.error ?? "Failed to generate overview.");
    }
  };

  const handleTranslateJob = async () => {
    if (!jobDescription.trim()) return;
    setIsTranslatingJob(true);
    setTranslateJobError(null);
    const result = await translateToEnglish(jobDescription, "job_description");
    setIsTranslatingJob(false);
    if (result.success && result.text) {
      setJobDescription(result.text);
    } else {
      setTranslateJobError(result.error ?? "Translation failed.");
    }
  };

  const handleJobCvMatch = async () => {
    if (!formRef.current) return;
    if (!company.trim() || !position.trim()) return;
    if (!jobDescription.trim() || !cvId.trim()) return;

    setMatchError(null);
    setIsMatchingJob(true);
    const formData = new FormData(formRef.current);
    const appliedAtRaw =
      (formData.get("appliedAt") as string) ||
      formatInTimeZone(new Date(), APP_TIME_ZONE, "yyyy-MM-dd");

    const payload: AnalyzeJobCvMatchInput = {
      applicationId: isEdit ? application!.id : undefined,
      company: (formData.get("company") as string) || company,
      position: (formData.get("position") as string) || position,
      location: formData.get("location") as string,
      locationType: formData.get("locationType") as string,
      jobUrl: formData.get("jobUrl") as string,
      source: formData.get("source") as string,
      status: formData.get("status") as string,
      salaryMin: formData.get("salaryMin") as string,
      salaryMax: formData.get("salaryMax") as string,
      contactName: formData.get("contactName") as string,
      notes,
      jobDescription,
      coverLetter,
      cvId: cvId || undefined,
      appliedAt: appliedAtRaw,
    };

    const result = await analyzeJobCvMatchAndSave(payload);
    setIsMatchingJob(false);
    if (!result.ok) {
      setMatchError(result.error);
      return;
    }
    setMatchUi({
      percentage: result.matchPercentage,
      llmMatchScore: result.llmMatchScore,
      keywordMatchScore: result.keywordMatchScore,
      jobKeywords: result.jobKeywords,
      matchedKeywords: result.matchedKeywords,
      larasAdvice: result.larasAdvice,
    });
    if (!isEdit) {
      try {
        sessionStorage.setItem(
          `laras_match_advice_flash_${result.applicationId}`,
          result.larasAdvice,
        );
      } catch {
        /* quota / private mode */
      }
      router.replace(`/dashboard/applications/${result.applicationId}/edit`);
    }
  };

  const handleTranslateNotes = async () => {
    if (!notes.trim()) return;
    setIsTranslatingNotes(true);
    setTranslateNotesError(null);
    const result = await translateToEnglish(notes, "notes");
    setIsTranslatingNotes(false);
    if (result.success && result.text) {
      setNotes(result.text);
    } else {
      setTranslateNotesError(result.error ?? "Translation failed.");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (salaryError) return;
    const form = e.currentTarget;
    const formData = new FormData(form);

    const data: ApplicationFormData = {
      company: formData.get("company") as string,
      position: formData.get("position") as string,
      location: formData.get("location") as string,
      locationType: formData.get("locationType") as string,
      jobUrl: formData.get("jobUrl") as string,
      source: formData.get("source") as string,
      status: formData.get("status") as string,
      salaryMin: formData.get("salaryMin") as string,
      salaryMax: formData.get("salaryMax") as string,
      contactName: formData.get("contactName") as string,
      notes,
      jobDescription,
      coverLetter,
      cvId: cvId || undefined,
      appliedAt: formData.get("appliedAt") as string,
    };

    startTransition(async () => {
      if (isEdit) {
        await updateApplication(application.id, data);
      } else {
        await createApplication(data);
      }
    });
  };

  const handleAddPhase = () => {
    if (!phaseForm || !application) return;
    startTransition(async () => {
      await addApplicationPhase(application.id, phaseForm.phaseId, {
        status: phaseForm.status,
        scheduledAt: phaseForm.scheduledAt || undefined,
        notes: phaseForm.notes || undefined,
      });
      setPhaseForm(null);
    });
  };

  const handleRemovePhase = (phaseRecordId: string) => {
    if (!application) return;
    startTransition(async () => {
      await removeApplicationPhase(phaseRecordId, application.id);
    });
  };

  const handleUpdatePhaseStatus = (
    phaseRecordId: string,
    newStatus: string,
  ) => {
    if (!application) return;
    startTransition(async () => {
      await updateApplicationPhase(phaseRecordId, application.id, {
        status: newStatus,
        completedAt: ["passed", "failed"].includes(newStatus)
          ? new Date().toISOString()
          : undefined,
      });
    });
  };

  const availablePhases = phases.filter(
    (p) => !application?.phases.some((ap) => ap.phaseId === p.id),
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Duplicate Warning Banners */}
      {currentMonthDupes.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-red-400/35 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-semibold text-red-200">
              Already applied this month!
            </p>
            <p className="mt-0.5 text-sm text-red-100/90">
              You applied to{" "}
              <strong>
                {currentMonthDupes[0].company} — {currentMonthDupes[0].position}
              </strong>{" "}
              on{" "}
              {formatInTimeZone(
                new Date(currentMonthDupes[0].appliedAt),
                APP_TIME_ZONE,
                "MMMM d, yyyy",
              )}
              . Submitting again will create a duplicate entry.
            </p>
          </div>
        </div>
      )}

      {otherMonthDupes.length > 0 && currentMonthDupes.length === 0 && (
        <div className="flex gap-3 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-100">
              Applied previously in another month
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-amber-100/90">
              {otherMonthDupes.map((d) => (
                <li key={d.id}>
                  • {d.company} — {d.position} on{" "}
                  <strong>
                    {formatInTimeZone(new Date(d.appliedAt), APP_TIME_ZONE, "MMMM d, yyyy")}
                  </strong>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-amber-200/80">
              Re-applying is fine — just a heads-up.
            </p>
          </div>
        </div>
      )}

      {isEdit && application?.isApplied === false && (
        <div className="flex gap-3 rounded-2xl border border-sky-400/35 bg-sky-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-300" />
          <div>
            <p className="text-sm font-semibold text-sky-100">Draft — not saved yet</p>
            <p className="mt-0.5 text-sm text-sky-100/90">
              This application was created from Check CV match only. It does not appear in analytics until
              you click Save application below.
            </p>
          </div>
        </div>
      )}

      {/* Job Details */}
      <div className="laras-card p-6">
        <h2 className="font-display text-base font-semibold text-on-surface mb-5">
          Job Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                name="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                placeholder="e.g. Google, Stripe, Vercel"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint focus:border-transparent transition-colors ${
                  currentMonthDupes.length > 0
                    ? "border-red-400/50 bg-red-500/15"
                    : otherMonthDupes.length > 0
                      ? "border-amber-400/50 bg-amber-500/15"
                      : "border-outline-variant"
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Position / Role <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                name="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
                placeholder="e.g. Senior Software Engineer"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint focus:border-transparent transition-colors ${
                  currentMonthDupes.length > 0
                    ? "border-red-400/50 bg-red-500/15"
                    : otherMonthDupes.length > 0
                      ? "border-amber-400/50 bg-amber-500/15"
                      : "border-outline-variant"
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                name="location"
                defaultValue={application?.location ?? ""}
                placeholder="e.g. San Francisco, CA"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Work Type
            </label>
            <select
              name="locationType"
              defaultValue={application?.locationType ?? "intern"}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint bg-surface-container-low/95"
            >
              {LOCATION_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Job URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                name="jobUrl"
                type="url"
                defaultValue={application?.jobUrl ?? ""}
                placeholder="https://..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Salary Range <span className="text-on-surface-variant font-normal text-xs">(annual, optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  name="salaryMin"
                  type="number"
                  min="0"
                  step="1000"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="Min (e.g. 80000)"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint ${salaryError ? "border-red-400/50 bg-red-500/15" : "border-outline-variant"}`}
                />
              </div>
              <span className="text-on-surface-variant text-sm flex-shrink-0">–</span>
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  name="salaryMax"
                  type="number"
                  min="0"
                  step="1000"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="Max (e.g. 120000)"
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint ${salaryError ? "border-red-400/50 bg-red-500/15" : "border-outline-variant"}`}
                />
              </div>
            </div>
            {salaryError && (
              <p className="text-xs text-red-500 mt-1">{salaryError}</p>
            )}
          </div>
        </div>
      </div>

      {/* About the Job */}
      <div className="laras-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="w-4 h-4 text-on-surface-variant shrink-0" />
            <h2 className="font-display text-base font-semibold text-on-surface">About the Job</h2>
            <span className="text-xs font-normal text-primary">required for AI cover letter</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void handleJobCvMatch()}
              disabled={
                isMatchingJob ||
                !jobDescription.trim() ||
                !cvId.trim() ||
                !company.trim() ||
                !position.trim()
              }
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-primary/45 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                !cvId.trim()
                  ? "Select a CV under Status & Source first"
                  : !company.trim() || !position.trim()
                    ? "Enter company and position first"
                    : undefined
              }
            >
              {isMatchingJob ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Percent className="w-3.5 h-3.5" />
              )}
              {isMatchingJob ? "Analyzing…" : "Check CV match"}
            </button>
            <button
              type="button"
              onClick={handleTranslateJob}
              disabled={isTranslatingJob || !jobDescription.trim()}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-secondary/40 bg-secondary/15 px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isTranslatingJob ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isTranslatingJob ? "Translating…" : "Generate to English"}
            </button>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant mb-3">
          Paste the job description or a summary of the role requirements. The AI will use this to tailor the cover letter.
          Use <strong className="text-on-surface">Check CV match</strong> to extract the match percentage and receive advice from laras.
        </p>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={6}
          placeholder="Paste the job posting description, key responsibilities, and requirements here…"
          className="w-full px-4 py-3 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint resize-y leading-relaxed"
        />
        {translateJobError && (
          <p className="text-xs text-red-500 mt-1.5">{translateJobError}</p>
        )}
        {matchError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {matchError}
          </div>
        )}
        {matchUi ? (
          <div className="mt-4 rounded-xl border border-primary/35 bg-primary/8 p-4 space-y-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-primary tabular-nums">
                {matchUi.percentage}%
              </span>
              <span className="text-sm text-on-surface-variant">
                blended match
                {matchUi.llmMatchScore != null && matchUi.keywordMatchScore != null
                  ? " (75% AI on CV snapshot + job description, 25% keyword overlap)"
                  : ""}
              </span>
            </div>
            {matchUi.llmMatchScore != null && matchUi.keywordMatchScore != null ? (
              <p className="text-xs text-on-surface-variant">
                AI assessment: <strong className="text-on-surface">{matchUi.llmMatchScore}%</strong>
                {" · "}
                Keyword overlap: <strong className="text-on-surface">{matchUi.keywordMatchScore}%</strong>
                {" "}
                (weighted blend for the headline score).
              </p>
            ) : null}
            <p className="text-xs text-on-surface-variant">
              {matchUi.matchedKeywords.length} of {matchUi.jobKeywords.length} job keyword phrases overlap your
              selected CV. Match score and job keywords are saved. The Laras comment is generated each time you run
              the analysis and is not stored in the database.
            </p>
            {matchUi.matchedKeywords.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-on-surface mb-2">Matched keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchUi.matchedKeywords.map((k, i) => (
                    <span
                      key={`m-${i}-${k}`}
                      className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-100"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {matchUi.larasAdvice ? (
              <div className="rounded-xl border border-outline-variant/55 bg-surface-container-low/35 p-4">
                <div className="flex gap-3">
                  <Image
                    src="/laras.png"
                    alt="Laras"
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-xl border border-outline-variant/40 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold text-on-surface">Comment from Laras</p>
                    <p className="mt-1 text-xs font-normal leading-snug text-primary/85">
                      A little warmth for your next step — it will type out below.
                    </p>
                    <LarasTypingAdvice text={matchUi.larasAdvice} />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Status, Source & Date */}
      <div className="laras-card p-6">
        <h2 className="font-display text-base font-semibold text-on-surface mb-5">
          Status & Source
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Status
            </label>
            <select
              name="status"
              defaultValue={application?.status ?? "pending"}
              className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint bg-surface-container-low/95"
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Source
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <select
                name="source"
                defaultValue={application?.source ?? "linkedin"}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint bg-surface-container-low/95 appearance-none"
              >
                {APPLICATION_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date: auto for new, editable for edit */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              Date Applied
            </label>
            {isEdit ? (
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                <input
                  name="appliedAt"
                  type="date"
                  defaultValue={formatInTimeZone(
                    new Date(application.appliedAt),
                    APP_TIME_ZONE,
                    "yyyy-MM-dd",
                  )}
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low/80 px-3 py-2.5 text-sm text-on-surface">
                <Calendar className="h-4 w-4 flex-shrink-0 text-primary" />
                <span>
                  <span className="font-medium">
                    {formatInTimeZone(now, APP_TIME_ZONE, "MMMM d, yyyy")}
                  </span>
                  <span className="text-on-surface-variant ml-1">(today, auto-set)</span>
                </span>
                <input type="hidden" name="appliedAt" value={todayStr} />
              </div>
            )}
          </div>

          {/* CV Version */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1.5">
              CV Used <span className="text-red-500">*</span>
            </label>
            {cvVersions.length === 0 ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
                No CVs uploaded yet.{" "}
                <a href="/dashboard/cv" className="underline font-medium">
                  Upload one
                </a>{" "}
                first.
              </div>
            ) : (
              <select
                required
                value={cvId}
                onChange={(e) => setCvId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint bg-surface-container-low/95"
              >
                <option value="">Select a CV…</option>
                {cvVersions.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="laras-card p-6">
        <h2 className="font-display text-base font-semibold text-on-surface mb-5">
          Contact (Optional)
        </h2>
        <div>
          <label className="block text-sm font-medium text-on-surface mb-1.5">
            Contact Name
          </label>
          <div className="relative max-w-md">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              name="contactName"
              defaultValue={application?.contactName ?? ""}
              placeholder="Recruiter or hiring manager"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
            />
          </div>
        </div>
      </div>

      {/* Notes with AI overview */}
      <div className="laras-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-on-surface-variant" />
            <h2 className="font-display text-base font-semibold text-on-surface">Notes</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTranslateNotes}
              disabled={isTranslatingNotes || !notes.trim()}
              className="flex items-center gap-1.5 rounded-lg border border-secondary/40 bg-secondary/15 px-3 py-1.5 text-xs font-medium text-secondary transition-colors hover:bg-secondary/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isTranslatingNotes ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isTranslatingNotes ? "Translating…" : "Generate to English"}
            </button>

            <button
              type="button"
              onClick={handleGenerateNotes}
              disabled={!company.trim() || isGenerating}
              title={
                !company.trim()
                  ? "Enter a company name first"
                  : "Generate company overview with AI"
              }
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                !company.trim()
                  ? "cursor-not-allowed bg-surface-container-high text-on-surface-variant"
                  : overviewAiSuccess
                    ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                    : "bg-gradient-to-r from-[#00e5ff] to-[#0068ed] text-on-primary shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:brightness-110"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating…
                </>
              ) : overviewAiSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Generated!
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate with AI
                </>
              )}
            </button>
          </div>
        </div>

        {!company.trim() && (
          <p className="text-xs text-on-surface-variant mb-3 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Enter a company name above to enable AI-generated overview
          </p>
        )}

        {overviewAiError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {overviewAiError}
          </div>
        )}

        <textarea
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder="Any additional notes, requirements, or impressions about the company and role…"
          className="w-full px-4 py-3 rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint resize-y leading-relaxed"
        />
        {translateNotesError && (
          <p className="text-xs text-red-500 mt-1.5">{translateNotesError}</p>
        )}
      </div>

      {/* Cover Letter */}
      <CoverLetterSection
        candidateName={candidateName}
        candidateSummary={candidateSummary}
        cvContext={cvContext}
        cvId={cvId}
        hasCvOptions={cvVersions.length > 0}
        company={company}
        position={position}
        jobDescription={jobDescription}
        companyNotes={notes}
        coverLetter={coverLetter}
        onCoverLetterChange={setCoverLetter}
      />

      {/* Phases — edit only */}
      {isEdit && (
        <div className="laras-card p-6">
          <h2 className="font-display text-base font-semibold text-on-surface mb-5">
            Interview Phases
          </h2>

          {application.phases.length === 0 && !phaseForm ? (
            <p className="text-on-surface-variant text-sm mb-4">No phases added yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {application.phases.map((ap) => {
                const phaseStatus = PHASE_STATUSES.find(
                  (ps) => ps.value === ap.status,
                );
                return (
                  <div
                    key={ap.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/80 border border-outline-variant"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ap.phase.color }}
                      />
                      <span className="text-sm font-medium text-on-surface">
                        {ap.phase.name}
                      </span>
                      {ap.scheduledAt && (
                        <span className="text-xs text-on-surface-variant">
                          {formatInTimeZone(new Date(ap.scheduledAt), APP_TIME_ZONE, "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={ap.status}
                        onChange={(e) =>
                          handleUpdatePhaseStatus(ap.id, e.target.value)
                        }
                        className={`rounded-full border-0 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-surface-tint ${
                          phaseStatus?.bg ?? "bg-surface-container-high"
                        } ${phaseStatus?.text ?? "text-on-surface-variant"}`}
                        disabled={isPending}
                      >
                        {PHASE_STATUSES.map((ps) => (
                          <option key={ps.value} value={ps.value}>
                            {ps.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemovePhase(ap.id)}
                        disabled={isPending}
                        className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {phaseForm ? (
            <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Phase
                  </label>
                  <select
                    value={phaseForm.phaseId}
                    onChange={(e) =>
                      setPhaseForm({ ...phaseForm, phaseId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-surface-container-low/95 focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  >
                    <option value="">Select phase...</option>
                    {availablePhases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Status
                  </label>
                  <select
                    value={phaseForm.status}
                    onChange={(e) =>
                      setPhaseForm({ ...phaseForm, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-surface-container-low/95 focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  >
                    {PHASE_STATUSES.map((ps) => (
                      <option key={ps.value} value={ps.value}>
                        {ps.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={phaseForm.scheduledAt}
                    onChange={(e) =>
                      setPhaseForm({
                        ...phaseForm,
                        scheduledAt: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={phaseForm.notes}
                    onChange={(e) =>
                      setPhaseForm({ ...phaseForm, notes: e.target.value })
                    }
                    placeholder="Optional notes"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddPhase}
                  disabled={!phaseForm.phaseId || isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-primary-container px-3 py-1.5 text-xs font-semibold text-on-primary-container transition-colors hover:brightness-110 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Phase
                </button>
                <button
                  type="button"
                  onClick={() => setPhaseForm(null)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            availablePhases.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setPhaseForm({
                    phaseId: availablePhases[0].id,
                    status: "scheduled",
                    scheduledAt: "",
                    notes: "",
                  })
                }
                className="laras-link flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Phase
              </button>
            )
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="laras-btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="laras-btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-70"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isEdit ? "Save Changes" : "Add Application"}
        </button>
      </div>
    </form>
  );
}
