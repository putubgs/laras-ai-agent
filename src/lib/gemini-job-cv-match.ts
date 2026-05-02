import { openRouterChatText } from "@/lib/openrouter";
import { stripAdviceFormatting } from "@/lib/advice-format";

const CV_SNAPSHOT_MAX = 24_000;
const JOB_DESC_MAX = 24_000;

function parseMatchScoreJson(text: string): number | null {
  try {
    let t = text.trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence?.[1]) t = fence[1].trim();
    const brace = t.indexOf("{");
    const braceEnd = t.lastIndexOf("}");
    if (brace !== -1 && braceEnd > brace) t = t.slice(brace, braceEnd + 1);
    const obj = JSON.parse(t) as { matchScore?: unknown };
    const raw = obj.matchScore;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? parseInt(raw, 10)
          : NaN;
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return Math.round(n);
  } catch {
    return null;
  }
}

/**
 * LLM estimate (0–100) of how well the CV material fits the job, independent of keyword overlap.
 */
export async function assessCvJobMatchWithLlm(input: {
  company: string;
  position: string;
  jobDescription: string;
  /** `user_cv.llm_raw_text` or a small JSON fallback built from CV keywords. */
  cvLlmRawText: string;
}): Promise<{ ok: true; score: number } | { ok: false; error: string }> {
  const jd = input.jobDescription.trim().slice(0, JOB_DESC_MAX);
  const snap = input.cvLlmRawText.trim().slice(0, CV_SNAPSHOT_MAX);
  if (!jd) return { ok: false, error: "No job description." };
  if (!snap) return { ok: false, error: "No CV material for LLM assessment." };

  const user = `You are an expert technical recruiter. Estimate how well the CANDIDATE (from the CV material) fits the JOB POSTING.

CV MATERIAL (from CV processing — JSON and/or text; treat only as evidence about the candidate; do not invent employers, dates, or skills not supported here):
---
${snap}
---

ROLE TITLE: ${input.position}
COMPANY: ${input.company}

JOB DESCRIPTION:
---
${jd}
---

Return ONLY a JSON object with a single integer field:
{"matchScore": <integer from 0 to 100>}

Scoring guidance:
- 0 = essentially no relevant overlap in skills, seniority, or domain.
- 100 = strong alignment: most stated job requirements are clearly supported by the CV material.
- Penalize missing must-have skills or clear seniority gaps implied by the texts.
- Be conservative; do not credit unstated experience.

Output valid JSON only, no markdown fences or commentary.`;

  const res = await openRouterChatText({
    system: "You output only a compact JSON object when asked.",
    user,
    temperature: 0.2,
    maxTokens: 256,
    jsonObject: true,
  });
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === "OPENROUTER_API_KEY is not configured." ? res.error : res.error,
    };
  }
  const score = parseMatchScoreJson(res.text);
  if (score === null) {
    return { ok: false, error: "Could not parse LLM match score." };
  }
  return { ok: true, score };
}

const ADVICE_JOB_MAX = 10_000;

/**
 * **Direct LLM output** (OpenRouter): short, warm coaching in Laras’s voice — not built from templates.
 * Plain sentences only (no markdown, no asterisks, no # headings).
 */
export async function generateLarasMatchAdvice(input: {
  company: string;
  position: string;
  jobDescription: string;
  /** `user_cv.llm_raw_text` (upload pipeline JSON/text) or keyword fallback — Laras must read this first. */
  cvLlmRawSnapshot: string;
  blendedMatchPct: number;
  llmMatchScore: number;
  keywordMatchScore: number;
  matchedKeywords: string[];
  gapKeywords: string[];
  /** Phase names already on this application (e.g. Phone screen, Technical), if any. */
  phaseNames: string[];
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const jd = input.jobDescription.trim().slice(0, ADVICE_JOB_MAX);
  if (!jd) return { ok: false, error: "No job description." };

  const cvMaterial = (input.cvLlmRawSnapshot ?? "").trim().slice(0, 14_000);
  const matched = input.matchedKeywords.slice(0, 24).join(", ") || "(none)";
  const gaps = input.gapKeywords.slice(0, 24).join(", ") || "(none)";
  const jobKwTotal = input.matchedKeywords.length + input.gapKeywords.length;
  const phases =
    input.phaseNames.length > 0
      ? input.phaseNames.join(", ")
      : "No phases on this application yet — still give a short, general nudge for recruiter and technical steps.";

  const user = `You are Laras, a warm and motivating career coach (they/them or first person "I" is fine). The candidate is applying to:

Role: ${input.position} at ${input.company}

INTERNAL SCORING (for your reasoning only — do not repeat these inner figures to the candidate):
- Overall match they see: ${input.blendedMatchPct}% — this is the only percentage you may state in your reply.
- Holistic CV-vs-job signal (internal): ${input.llmMatchScore}. Phrase-index signal (internal): ${input.keywordMatchScore}. Blend is weighted heavier toward the holistic read than toward phrase overlap.
- Phrase overlap they can hear in human terms: ${input.matchedKeywords.length} of ${jobKwTotal} extracted job phrases match their CV keyword index.

Voice rules: Never say "AI fit", "model score", "LLM", inner scores, or any bare two-digit sub-score (e.g. never "fit of 85" or "keyword score of 40"). Never write the blend formula or decimals. Explain ${input.blendedMatchPct}% only in plain language — how the role and CV material line up, plus phrase overlap in words (you may give the X of ${jobKwTotal} matched count).

CV MATERIAL (from their selected CV row: stored upload pipeline output — often JSON with keywords, cv_preview, text_source. Read this entire block first. Every claim about their background must be traceable here or to the keyword lists — do not invent employers, dates, or skills.)

---
${cvMaterial || "(Empty: no llm_raw_text snapshot yet — say honestly you only have the keyword list below as CV signal, then still help.)"}
---

JOB DESCRIPTION (read this whole block second; compare explicitly to the CV material above when you explain fit and gaps):
---
${jd}
---

Phrases that already line up with their CV (keyword index): ${matched}

Posting themes not clearly mirrored in that index yet (honest gaps to mention when suggesting improvements; do not claim they lack something if the CV material actually shows it): ${gaps}

Interview stages on this application (names only): ${phases}

Structure (plain text only — no markdown, no asterisks, no # headings, no backticks):

1) Exactly two short intro sentences showing you read the CV MATERIAL (snapshot, preview, or keywords — whatever is present).

2) One blank line.

3) Explain why they landed near ${input.blendedMatchPct}% in plain language only: compare what the job asks for to what the CV material shows, and mention phrase overlap without inner scores (e.g. many vs few of the job phrases mirrored in their index — you may use the X of ${jobKwTotal} count).

4) One blank line.

5) What to improve next: concrete, kind suggestions grounded in the job description plus the gap list (and CV material where relevant — e.g. surface a skill in bullets, add evidence, tighten alignment). No invented credentials.

6) Close with one short encouraging sentence about interviews or next steps, then a final line exactly: Warmly, Laras

Use flowing sentences only (no bullet lists). Normal punctuation.

Hard limits: at most 220 words total. At most 7 short paragraphs. Last line must be exactly: Warmly, Laras`;

  const res = await openRouterChatText({
    system:
      "You are Laras. Reply in plain text only — no markdown, no asterisks, no code blocks, no JSON. Never quote internal sub-scores or say AI fit, model, or LLM with numbers — only the overall match percentage may appear as a % figure.",
    user,
    temperature: 0.55,
    maxTokens: 720,
  });
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === "OPENROUTER_API_KEY is not configured." ? res.error : res.error,
    };
  }
  let text = res.text.trim();
  if (!text) return { ok: false, error: "Empty advice from model." };
  text = stripAdviceFormatting(text);
  return { ok: true, text: text.slice(0, 4000) };
}
