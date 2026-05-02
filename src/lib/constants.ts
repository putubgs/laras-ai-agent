export const APPLICATION_STATUSES = [
  { value: "pending", label: "Pending", color: "#fbbf24", bg: "bg-amber-500/20", text: "text-amber-100 ring-1 ring-amber-400/35" },
  { value: "in_review", label: "In Review", color: "#38bdf8", bg: "bg-sky-500/20", text: "text-sky-100 ring-1 ring-sky-400/35" },
  { value: "interview", label: "Interview", color: "#a78bfa", bg: "bg-violet-500/20", text: "text-violet-100 ring-1 ring-violet-400/35" },
  { value: "offer", label: "Offer", color: "#34d399", bg: "bg-emerald-500/20", text: "text-emerald-100 ring-1 ring-emerald-400/35" },
  { value: "accepted", label: "Accepted", color: "#10b981", bg: "bg-teal-500/25", text: "text-teal-100 ring-1 ring-teal-400/35" },
  { value: "rejected", label: "Rejected", color: "#f87171", bg: "bg-red-500/20", text: "text-red-100 ring-1 ring-red-400/35" },
  { value: "withdrawn", label: "Withdrawn", color: "#94a3b8", bg: "bg-slate-500/25", text: "text-slate-200 ring-1 ring-slate-400/30" },
  { value: "ghosted", label: "Ghosted", color: "#64748b", bg: "bg-slate-600/25", text: "text-slate-300 ring-1 ring-slate-500/30" },
] as const;

export const APPLICATION_SOURCES = [
  { value: "linkedin", label: "LinkedIn", color: "#0077b5" },
  { value: "indeed", label: "Indeed", color: "#2164f3" },
  { value: "glints", label: "Glints", color: "#0caa41" },
  { value: "company_website", label: "Company Website", color: "#6366f1" },
  { value: "jobstreet", label: "JobStreet", color: "#ff8300" },
  { value: "referral", label: "Referral", color: "#f59e0b" },
  { value: "twitter", label: "X / Twitter", color: "#000000" },
  { value: "hired", label: "Hired.com", color: "#ff6b6b" },
  { value: "other", label: "Other", color: "#94a3b8" },
] as const;

export const LOCATION_TYPES = [
  { value: "intern", label: "Intern" },
  { value: "part-time/freelance", label: "Part-time/Freelance" },
  { value: "contract", label: "Contract" },
  { value: "full-time", label: "Full-time" },
] as const;

export type LocationType = typeof LOCATION_TYPES[number]["value"];

/** Dark UI card shells for analytics (match laras-card / surface-tint language). */
export const LOCATION_TYPE_CARD_CLASSES: Record<LocationType, string> = {
  intern:
    "rounded-xl border border-outline-variant/50 bg-primary/10 p-4 ring-1 ring-primary/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  "part-time/freelance":
    "rounded-xl border border-outline-variant/50 bg-secondary-container/12 p-4 ring-1 ring-secondary-container/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  contract:
    "rounded-xl border border-outline-variant/50 bg-sky-500/10 p-4 ring-1 ring-sky-400/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
  "full-time":
    "rounded-xl border border-outline-variant/50 bg-emerald-500/10 p-4 ring-1 ring-emerald-400/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
};

export function getLocationTypeCardClass(value: string): string {
  const key = value as LocationType;
  return LOCATION_TYPE_CARD_CLASSES[key] ?? LOCATION_TYPE_CARD_CLASSES.intern;
}

export const PHASE_STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "#38bdf8", bg: "bg-sky-500/20", text: "text-sky-100 ring-1 ring-sky-400/35" },
  { value: "pending", label: "Pending", color: "#fbbf24", bg: "bg-amber-500/20", text: "text-amber-100 ring-1 ring-amber-400/35" },
  { value: "passed", label: "Passed", color: "#34d399", bg: "bg-emerald-500/20", text: "text-emerald-100 ring-1 ring-emerald-400/35" },
  { value: "failed", label: "Failed", color: "#f87171", bg: "bg-red-500/20", text: "text-red-100 ring-1 ring-red-400/35" },
] as const;

export const DEFAULT_MONTHLY_TARGET = 1000;

/** Saved applications (`is_applied`) required before Laras strategic insights on Analytics unlock. */
export const ANALYTICS_LARAS_INSIGHTS_MIN_APPLICATIONS = 10;

export const SKILL_CATEGORIES = [
  "Technical",
  "Framework",
  "Tool",
  "Database",
  "Cloud",
  "Soft Skill",
  "Language",
  "Other",
] as const;

export const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner", bg: "bg-slate-500/25", text: "text-slate-200 ring-1 ring-slate-400/30" },
  { value: "intermediate", label: "Intermediate", bg: "bg-sky-500/20", text: "text-sky-100 ring-1 ring-sky-400/35" },
  { value: "advanced", label: "Advanced", bg: "bg-violet-500/20", text: "text-violet-100 ring-1 ring-violet-400/35" },
  { value: "expert", label: "Expert", bg: "bg-amber-500/20", text: "text-amber-100 ring-1 ring-amber-400/35" },
] as const;

export type SkillCategory = typeof SKILL_CATEGORIES[number];
export type SkillLevel = typeof SKILL_LEVELS[number]["value"];

export function getSkillLevel(value: string) {
  return SKILL_LEVELS.find((l) => l.value === value) ?? SKILL_LEVELS[1];
}

export type ApplicationStatus = typeof APPLICATION_STATUSES[number]["value"];
export type ApplicationSource = typeof APPLICATION_SOURCES[number]["value"];
export type PhaseStatus = typeof PHASE_STATUSES[number]["value"];

export function getStatus(value: string) {
  return APPLICATION_STATUSES.find((s) => s.value === value) ?? APPLICATION_STATUSES[0];
}

export function getSource(value: string) {
  return APPLICATION_SOURCES.find((s) => s.value === value) ?? APPLICATION_SOURCES[APPLICATION_SOURCES.length - 1];
}

export function getPhaseStatus(value: string) {
  return PHASE_STATUSES.find((s) => s.value === value) ?? PHASE_STATUSES[0];
}

// Group statuses for analytics
export const STATUS_GROUPS = {
  active: ["pending", "in_review", "interview"],
  approved: ["offer", "accepted"],
  rejected: ["rejected", "withdrawn", "ghosted"],
};
