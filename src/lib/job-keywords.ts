import type { SupabaseClient } from "@supabase/supabase-js";

/** Same normalization as stored `keywords.keyword` values (lowercase, trimmed). */
export function keywordStorageForm(phrase: string): string | null {
  const s = phrase.trim().replace(/\s+/g, " ").slice(0, 200);
  if (s.length < 2) return null;
  return s.toLowerCase();
}

/**
 * Upserts `keywords` rows and replaces `job_keywords` links for one application.
 */
export async function persistJobKeywords(
  supabase: SupabaseClient,
  jobApplicationId: string,
  keywords: string[]
): Promise<{ keywordIds: string[]; jobKeywordsDisplay: string[] }> {
  const displayByNorm = new Map<string, string>();
  const orderedNorm: string[] = [];

  for (const k of keywords) {
    const n = keywordStorageForm(k);
    if (!n || displayByNorm.has(n)) continue;
    displayByNorm.set(n, k.trim().replace(/\s+/g, " "));
    orderedNorm.push(n);
  }

  const keywordIds: string[] = [];

  for (const keyword of orderedNorm) {
    const { data, error } = await supabase
      .from("keywords")
      .upsert({ keyword }, { onConflict: "keyword" })
      .select("id")
      .single();
    if (error) {
      throw new Error(`keywords upsert (${keyword}): ${error.message}`);
    }
    const id = data?.id as string | undefined;
    if (!id) {
      throw new Error(`keywords upsert (${keyword}): no id returned`);
    }
    keywordIds.push(id);
  }

  const { error: delErr } = await supabase
    .from("job_keywords")
    .delete()
    .eq("job_application_id", jobApplicationId);
  if (delErr) {
    throw new Error(`job_keywords delete: ${delErr.message}`);
  }

  if (keywordIds.length > 0) {
    const rows = keywordIds.map((keyword_id) => ({
      job_application_id: jobApplicationId,
      keyword_id,
      importance_weight: 1.0,
    }));
    const { error: linkErr } = await supabase.from("job_keywords").insert(rows);
    if (linkErr) {
      throw new Error(`job_keywords insert: ${linkErr.message}`);
    }
  }

  const jobKeywordsDisplay = orderedNorm.map((n) => displayByNorm.get(n) ?? n);

  return { keywordIds, jobKeywordsDisplay };
}
