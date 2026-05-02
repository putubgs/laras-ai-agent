"use server";

import { createHash } from "node:crypto";
import { ApifyClient } from "apify-client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { computeJobCvMatchScores } from "@/lib/compute-job-cv-match";
import { getDailyTargetForUser } from "@/lib/dashboard-repo";

/** LinkedIn Jobs Scraper (Apify) — input uses `urls` + `count` as in the project example. */
const LINKEDIN_JOBS_ACTOR_ID = "hKByXkMQaC5Qt9UMN";

function apifyToken(): string | null {
  const t =
    process.env.APIFY_API_KEY?.trim() ||
    process.env.APIFY_API_TOKEN?.trim() ||
    process.env.APIFY_TOKEN?.trim() ||
    process.env["APIFY-API-KEY"]?.trim();
  return t || null;
}

function buildLinkedInSearchUrl(keywords: string, location: string): string {
  const params = new URLSearchParams();
  if (keywords.trim()) params.set("keywords", keywords.trim());
  if (location.trim()) params.set("location", location.trim());
  params.set("position", "1");
  params.set("pageNum", "0");
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

function pickString(item: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export type FindJobListing = {
  id: string;
  title: string;
  company: string;
  url: string;
  shortDescription: string;
  /** Full text used for CV match scoring (prefill job description on Apply). */
  fullDescription: string;
  matchPercentage: number;
};

/** Plain job row after Apify (before CV scoring). Safe to pass to `scoreFindJobListingsForUser`. */
export type ScrapedJobPayload = Omit<FindJobListing, "matchPercentage">;

type DatasetPage = { items?: unknown[] };

/**
 * Fetch up to `cap` items from the default dataset (handles API pagination).
 */
async function loadDatasetItems(
  client: ApifyClient,
  datasetId: string,
  cap: number
): Promise<Record<string, unknown>[]> {
  const acc: Record<string, unknown>[] = [];
  let offset = 0;
  const chunk = Math.min(250, Math.max(1, cap));

  while (acc.length < cap) {
    const limit = Math.min(chunk, cap - acc.length);
    const page = (await client.dataset(datasetId).listItems({
      limit,
      offset,
    })) as DatasetPage;
    const batch = page.items ?? [];
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const row of batch) {
      if (typeof row === "object" && row !== null) {
        acc.push(row as Record<string, unknown>);
      }
    }
    if (batch.length < limit) break;
    offset += batch.length;
  }

  return acc.slice(0, cap);
}

function normalizeListing(
  item: Record<string, unknown>,
  index: number
): ScrapedJobPayload {
  const title =
    pickString(item, ["title", "jobTitle", "name"]) || `Role ${index + 1}`;
  const company =
    pickString(item, ["companyName", "company", "company_name"]) || "Company";
  const url = pickString(item, ["link", "url", "jobUrl", "applyUrl"]);
  let body = pickString(item, ["descriptionText", "description", "jobDescription"]);
  if (!body) {
    const html = pickString(item, ["descriptionHtml"]);
    body = html ? stripHtml(html) : "";
  }
  if (!body) {
    body = `${title} at ${company}.`;
  }
  const shortDescription =
    body.length > 280 ? `${body.slice(0, 277).trim()}…` : body;
  const fullDescription = body.slice(0, 24_000);
  const id =
    pickString(item, ["id", "jobId"]) ||
    (url
      ? createHash("sha256").update(url).digest("hex").slice(0, 24)
      : `idx-${index}`);
  return { id, title, company, url, shortDescription, fullDescription };
}

export async function scrapeLinkedInJobsForUser(input: {
  jobName: string;
  location: string;
}): Promise<
  | {
      ok: true;
      dailyTarget: number;
      jobs: ScrapedJobPayload[];
    }
  | { ok: false; error: string }
> {
  const token = apifyToken();
  if (!token) {
    return {
      ok: false,
      error:
        "Apify is not configured. Set APIFY_API_KEY or APIFY-API-KEY (or APIFY_API_TOKEN) in .env — then restart the dev server.",
    };
  }

  const jobName = input.jobName?.trim() ?? "";
  const location = input.location?.trim() ?? "";
  if (!jobName) return { ok: false, error: "Enter a job title or keywords." };

  const { userId } = await requireDashboardUser();
  const dailyTarget = await getDailyTargetForUser(userId);
  const jobCount = Math.max(1, Math.min(50, dailyTarget));

  const searchUrl = buildLinkedInSearchUrl(jobName, location);
  const client = new ApifyClient({ token });

  let items: Record<string, unknown>[] = [];
  try {
    const run = await client.actor(LINKEDIN_JOBS_ACTOR_ID).call({
      urls: [searchUrl],
      scrapeCompany: true,
      count: jobCount,
      splitByLocation: false,
    });
    const datasetId = run.defaultDatasetId;
    if (!datasetId) {
      return { ok: false, error: "Apify run finished without a dataset id." };
    }
    items = await loadDatasetItems(client, datasetId, jobCount);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Apify LinkedIn scrape failed.";
    return { ok: false, error: msg };
  }

  const jobs = items.map((row, i) => normalizeListing(row, i)).slice(0, jobCount);
  return { ok: true, dailyTarget, jobs };
}

export async function scoreFindJobListingsForUser(input: {
  cvId: string;
  jobs: ScrapedJobPayload[];
}): Promise<
  | { ok: true; jobs: FindJobListing[] }
  | { ok: false; error: string }
> {
  const cvId = input.cvId?.trim() ?? "";
  if (!cvId) return { ok: false, error: "Select a CV." };
  const jobsIn = input.jobs ?? [];
  if (jobsIn.length === 0) return { ok: true, jobs: [] };

  const { userId } = await requireDashboardUser();
  const supabase = createServiceRoleClient();

  const { data: cvRow, error: cvErr } = await supabase
    .from("user_cv")
    .select("id")
    .eq("id", cvId)
    .eq("user_id", userId)
    .maybeSingle();
  if (cvErr) return { ok: false, error: cvErr.message };
  if (!cvRow) return { ok: false, error: "CV not found or access denied." };

  const jobs: FindJobListing[] = [];
  const concurrency = 2;
  for (let i = 0; i < jobsIn.length; i += concurrency) {
    const slice = jobsIn.slice(i, i + concurrency);
    const batch = await Promise.all(
      slice.map(async (listing) => {
        const scored = await computeJobCvMatchScores(supabase, userId, cvId, {
          company: listing.company,
          position: listing.title,
          jobDescription: listing.fullDescription,
        });
        const matchPercentage = scored.ok ? scored.matchPercentage : 0;
        return {
          ...listing,
          matchPercentage,
        };
      })
    );
    jobs.push(...batch);
  }

  return { ok: true, jobs };
}
