import { create } from "zustand";

export type JobApplyDraft = {
  company: string;
  position: string;
  jobUrl: string;
  jobDescription: string;
  location: string;
  cvId: string;
};

const FIND_JOB_HANDOFF_PREFIX = "laras_job_apply_handoff_";

/**
 * Cross-tab job apply handoff must use **localStorage** (shared per origin across tabs).
 * `sessionStorage` is per-tab only — a `window.open` new tab cannot read the opener's sessionStorage.
 */
const findJobHandoffCache = new Map<string, JobApplyDraft>();

function parseJobApplyDraft(raw: string): JobApplyDraft | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.company !== "string" ||
      typeof o.position !== "string" ||
      typeof o.jobUrl !== "string" ||
      typeof o.jobDescription !== "string" ||
      typeof o.location !== "string" ||
      typeof o.cvId !== "string"
    ) {
      return null;
    }
    return {
      company: o.company,
      position: o.position,
      jobUrl: o.jobUrl,
      jobDescription: o.jobDescription,
      location: o.location,
      cvId: o.cvId,
    };
  } catch {
    return null;
  }
}

/**
 * Store draft for a new tab; returns `fromFind` query value, or `null` if `localStorage` failed.
 * Open `/dashboard/applications/new?fromFind=<id>` (e.g. via `window.open`).
 * Uses **localStorage** (shared across tabs); do not use `sessionStorage` for this — it is per-tab only.
 */
/** Returns handoff id, or `null` if storage is unavailable (e.g. private mode). */
export function stashFindJobApplyDraftForNewTab(draft: JobApplyDraft): string | null {
  const id = crypto.randomUUID();
  const key = `${FIND_JOB_HANDOFF_PREFIX}${id}`;
  try {
    const payload = JSON.stringify(draft);
    localStorage.setItem(key, payload);
    if (localStorage.getItem(key) !== payload) return null;
  } catch {
    return null;
  }
  return id;
}

/** Resolve handoff: localStorage on first read (visible in new tabs), then in-memory cache (Strict Mode safe). */
export function takeFindJobHandoffDraft(fromFindId: string | null): JobApplyDraft | null {
  if (!fromFindId) return null;
  const cached = findJobHandoffCache.get(fromFindId);
  if (cached) return cached;
  if (typeof window === "undefined") return null;
  const key = `${FIND_JOB_HANDOFF_PREFIX}${fromFindId}`;
  try {
    let raw = localStorage.getItem(key);
    if (!raw) {
      raw = sessionStorage.getItem(key);
      if (raw) sessionStorage.removeItem(key);
    } else {
      localStorage.removeItem(key);
    }
    if (!raw) return null;
    const draft = parseJobApplyDraft(raw);
    if (!draft) return null;
    findJobHandoffCache.set(fromFindId, draft);
    return draft;
  } catch {
    return null;
  }
}

type JobApplyDraftState = {
  draft: JobApplyDraft | null;
  setJobApplyDraft: (draft: JobApplyDraft) => void;
  consumeJobApplyDraft: () => JobApplyDraft | null;
};

export const useJobApplyDraftStore = create<JobApplyDraftState>((set, get) => ({
  draft: null,
  setJobApplyDraft: (draft) => set({ draft }),
  consumeJobApplyDraft: () => {
    const d = get().draft;
    set({ draft: null });
    return d;
  },
}));
