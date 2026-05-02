import { openRouterChatText } from "@/lib/openrouter";
import { parseKeywordsJson } from "@/lib/gemini-cv-keywords";

const JOB_TEXT_MAX = 48_000;
const JOB_KEYWORD_MAX = 40;

/**
 * Extract role-relevant keyword phrases from a job posting via OpenRouter.
 */
export async function extractKeywordsFromJobDescription(
  jobDescription: string
): Promise<
  | { ok: true; keywords: string[]; modelText: string }
  | { ok: false; error: string }
> {
  const trimmed = jobDescription.slice(0, JOB_TEXT_MAX).trim();
  if (!trimmed) {
    return { ok: false, error: "Job description is empty." };
  }

  const user = `You analyze job postings. From the text below, extract a diverse list of keyword phrases useful for matching a candidate CV.

Include where clearly stated in the posting:
- Required and preferred technical skills (languages, frameworks, tools, platforms)
- Domains (e.g. fintech, B2B SaaS, e-commerce)
- Methodologies (e.g. Agile, CI/CD, TDD)
- Soft skills or collaboration expectations when explicit
- Certifications, degrees, or compliance only if explicitly required

Rules:
- Between 12 and ${JOB_KEYWORD_MAX} items; never more than ${JOB_KEYWORD_MAX}.
- Each item: 1–5 words, no full sentences, no bullet symbols.
- Do not invent requirements not implied by the posting.
- Prefer English phrases if the posting mixes languages.

Return ONLY a single JSON object (no markdown, no prose) in this exact shape:
{"keywords":["First phrase","Second phrase",...]}

JOB POSTING:
---
${trimmed}
---`;

  const res = await openRouterChatText({
    system: "You output only valid JSON objects when asked.",
    user,
    temperature: 0.3,
    maxTokens: 2048,
    jsonObject: true,
  });
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === "OPENROUTER_API_KEY is not configured." ? res.error : res.error,
    };
  }
  const keywords = parseKeywordsJson(res.text).slice(0, JOB_KEYWORD_MAX);
  if (keywords.length === 0) {
    return { ok: false, error: "Model returned no usable keywords." };
  }
  return { ok: true, keywords, modelText: res.text };
}
