import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { extractKeywordsFromJobDescription } from "@/lib/gemini-job-keywords";
import { assessCvJobMatchWithLlm } from "@/lib/gemini-job-cv-match";
import { keywordStorageForm } from "@/lib/job-keywords";

type Supabase = ReturnType<typeof createServiceRoleClient>;

export type ComputeJobCvMatchOk = {
  ok: true;
  matchPercentage: number;
  llmMatchScore: number;
  keywordMatchScore: number;
  jobKeywordsDisplay: string[];
  matchedKeywords: string[];
  cvSnapshotForLlm: string;
};

export type ComputeJobCvMatchResult = ComputeJobCvMatchOk | { ok: false; error: string };

/**
 * Same scoring pipeline as “Check CV match” (75% LLM fit + 25% keyword overlap), without DB writes or Laras.
 */
export async function computeJobCvMatchScores(
  supabase: Supabase,
  userId: string,
  cvId: string,
  input: { company: string; position: string; jobDescription: string }
): Promise<ComputeJobCvMatchResult> {
  const jobDescription = input.jobDescription.trim();
  if (!jobDescription) {
    return { ok: false, error: "No job description text to score." };
  }

  const { data: cvData, error: cvErr } = await supabase
    .from("user_cv")
    .select("id, llm_raw_text")
    .eq("id", cvId)
    .eq("user_id", userId)
    .maybeSingle();
  if (cvErr) return { ok: false, error: cvErr.message };
  if (!cvData) return { ok: false, error: "CV not found or access denied." };

  const gem = await extractKeywordsFromJobDescription(jobDescription);
  if (!gem.ok) return { ok: false, error: gem.error };

  const displayByNorm = new Map<string, string>();
  for (const raw of gem.keywords) {
    const n = keywordStorageForm(raw);
    if (!n || displayByNorm.has(n)) continue;
    displayByNorm.set(n, raw.trim().replace(/\s+/g, " "));
  }
  const orderedNorm = [...displayByNorm.keys()];
  const jobKeywordsDisplay = orderedNorm.map((n) => displayByNorm.get(n)!);
  if (jobKeywordsDisplay.length === 0) {
    return { ok: false, error: "No usable job keywords after normalization." };
  }

  const { data: cvJoin, error: jkErr } = await supabase
    .from("cv_keywords")
    .select("keywords(keyword)")
    .eq("user_cv_id", cvId);
  if (jkErr) return { ok: false, error: jkErr.message };

  const cvNorm = new Set<string>();
  for (const r of cvJoin ?? []) {
    const w = (r.keywords as { keyword?: string } | null)?.keyword;
    const n = keywordStorageForm(w ?? "");
    if (n) cvNorm.add(n);
  }

  const matchedKeywords = orderedNorm.filter((n) => cvNorm.has(n)).map((n) => displayByNorm.get(n)!);
  const keywordMatchScore =
    orderedNorm.length === 0 ? 0 : Math.round((100 * matchedKeywords.length) / orderedNorm.length);

  const llmRaw = ((cvData.llm_raw_text as string) ?? "").trim();
  const cvKeywordLabels = (cvJoin ?? [])
    .map((r) => (r.keywords as { keyword?: string } | null)?.keyword)
    .filter((s): s is string => Boolean(s?.trim()));
  const cvSnapshotForLlm =
    llmRaw ||
    (cvKeywordLabels.length > 0
      ? JSON.stringify({
          source: "cv_keywords_fallback",
          cv_keywords: cvKeywordLabels,
        })
      : "");

  let llmMatchScore = keywordMatchScore;
  if (cvSnapshotForLlm) {
    const llm = await assessCvJobMatchWithLlm({
      company: input.company.trim(),
      position: input.position.trim(),
      jobDescription,
      cvLlmRawText: cvSnapshotForLlm,
    });
    if (llm.ok) {
      llmMatchScore = llm.score;
    }
  }

  const matchPercentage = Math.round(0.75 * llmMatchScore + 0.25 * keywordMatchScore);

  return {
    ok: true,
    matchPercentage,
    llmMatchScore,
    keywordMatchScore,
    jobKeywordsDisplay,
    matchedKeywords,
    cvSnapshotForLlm,
  };
}
