import { openRouterChatText } from "@/lib/openrouter";

const CV_TEXT_MAX = 48_000;
const CV_KEYWORD_MAX = 45;

export function parseKeywordsJson(text: string): string[] {
  try {
    let jsonStr = text.trim();
    const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence?.[1]) jsonStr = fence[1].trim();
    const brace = jsonStr.indexOf("{");
    const braceEnd = jsonStr.lastIndexOf("}");
    if (brace !== -1 && braceEnd > brace) {
      jsonStr = jsonStr.slice(brace, braceEnd + 1);
    }
    const obj = JSON.parse(jsonStr) as { keywords?: unknown };
    if (!Array.isArray(obj.keywords)) return [];
    return obj.keywords
      .filter((k): k is string => typeof k === "string")
      .map((k) => k.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Ask OpenRouter (OpenAI-compatible) to infer skill / experience keywords from CV plain text.
 */
export async function extractKeywordsFromCvPlainText(
  cvPlainText: string
): Promise<
  | { ok: true; keywords: string[]; modelText: string }
  | { ok: false; error: string }
> {
  const trimmed = cvPlainText.slice(0, CV_TEXT_MAX).trim();
  if (!trimmed) {
    return { ok: false, error: "No readable text in the CV." };
  }

  const user = `You analyze candidate CVs. From the CV plain text below, extract a diverse list of keyword phrases useful for job search and matching.

Include where clearly supported by the CV:
- Technical / hard skills (languages, frameworks, cloud platforms, databases, tools)
- Soft skills (communication, leadership, mentoring, stakeholder management, …)
- Domains & industries (e.g. fintech, e-commerce, B2B SaaS)
- Concise role-relevant phrases (e.g. "system design", "REST APIs", "CI/CD")
- Seniority or tenure only when explicitly stated (e.g. "8 years backend", "Staff engineer")

Rules:
- Between 15 and ${CV_KEYWORD_MAX} items; never more than ${CV_KEYWORD_MAX}.
- Each item: 1–5 words, no full sentences, no bullet symbols.
- Do not invent employers, dates, or credentials not present in the text.
- Prefer English phrases if the CV mixes languages.

Return ONLY a single JSON object (no markdown, no prose) in this exact shape:
{"keywords":["First phrase","Second phrase",...]}

CV TEXT:
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
  const modelText = res.text;
  const keywords = parseKeywordsJson(modelText).slice(0, CV_KEYWORD_MAX);
  if (keywords.length === 0) {
    return { ok: false, error: "Model returned no usable keywords." };
  }
  return { ok: true, keywords, modelText };
}
