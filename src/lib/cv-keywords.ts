import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeKeyword(k: string): string | null {
  const s = k.trim().replace(/\s+/g, " ").slice(0, 200);
  if (s.length < 2) return null;
  return s.toLowerCase();
}

/**
 * Upserts `keywords` rows and links them to a CV via `cv_keywords`.
 * On success, updates `user_cv.llm_raw_text` with a JSON snapshot (keywords + short text preview).
 * Does not write error payloads to `llm_raw_text` — callers surface failures separately.
 */
export async function persistCvKeywordsForUpload(
  supabase: SupabaseClient,
  userCvId: string,
  keywords: string[],
  llmRawText: string
): Promise<void> {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const k of keywords) {
    const n = normalizeKeyword(k);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    normalized.push(n);
  }

  const keywordIds: string[] = [];

  for (const keyword of normalized) {
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

  const uniqueKeywordIds = [...new Set(keywordIds)];

  const { error: delErr } = await supabase.from("cv_keywords").delete().eq("user_cv_id", userCvId);
  if (delErr) {
    throw new Error(`cv_keywords delete: ${delErr.message}`);
  }

  if (uniqueKeywordIds.length > 0) {
    const rows = uniqueKeywordIds.map((keyword_id) => ({
      user_cv_id: userCvId,
      keyword_id,
    }));
    const { error: linkErr } = await supabase.from("cv_keywords").insert(rows);
    if (linkErr) {
      throw new Error(`cv_keywords insert: ${linkErr.message}`);
    }
  }

  const { error: upErr } = await supabase
    .from("user_cv")
    .update({ llm_raw_text: llmRawText.slice(0, 100_000) })
    .eq("id", userCvId);
  if (upErr) throw new Error(upErr.message);
}
