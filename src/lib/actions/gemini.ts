"use server";

import { openRouterChatText } from "@/lib/openrouter";
import { requireDashboardUser } from "@/lib/auth/dashboard-session";
import { getCvCoverLetterContext } from "@/lib/dashboard-repo";

export async function generateCoverLetter(data: {
  company: string;
  position: string;
  jobDescription: string;
  candidateName: string;
  /** Summary + optional CV-derived text from the client. */
  candidateContext: string;
  /** When set, server loads keywords / CV excerpt from `user_cv` if client context is empty. */
  cvId?: string | null;
  companyNotes?: string;
}): Promise<{ success: boolean; text?: string; error?: string }> {
  const { userId } = await requireDashboardUser();
  let candidateContext = (data.candidateContext ?? "").trim();
  const cvId = data.cvId?.trim();
  if (!candidateContext && cvId) {
    candidateContext = (await getCvCoverLetterContext(userId, cvId)) ?? "";
  }

  if (!data.candidateName?.trim() || !candidateContext) {
    return {
      success: false,
      error: cvId
        ? "Could not load text or keywords from the selected CV. Try re-uploading the file or check that keyword extraction completed."
        : "Add a professional summary or select a CV under Status & Source before generating a cover letter.",
    };
  }

  const user = `You are an expert cover letter writer. Write a compelling, personalized cover letter.

ROLE: ${data.position} at ${data.company}

JOB DESCRIPTION:
${data.jobDescription}

CANDIDATE NAME: ${data.candidateName}

CANDIDATE BACKGROUND (summary, CV text, keywords — use faithfully, do not invent employers or dates not present here):
${candidateContext}

${data.companyNotes ? `NOTES ABOUT THE COMPANY / ROLE:\n${data.companyNotes.slice(0, 800)}\n` : ""}

Write 3–4 paragraphs (300–380 words). First person. Tie concrete details from the candidate background to requirements in the job description. No placeholder text. No address block or date line.

End with: "Sincerely,\\n${data.candidateName}"`;

  const res = await openRouterChatText({
    user,
    temperature: 0.5,
    maxTokens: 2048,
  });
  if (!res.ok) {
    return { success: false, error: res.error === "OPENROUTER_API_KEY is not configured." ? res.error : `Generation failed: ${res.error}` };
  }
  const text = res.text.trim();
  if (!text) return { success: false, error: "Generation failed: empty response." };
  return { success: true, text };
}

export async function translateToEnglish(
  text: string,
  context: "job_description" | "notes"
): Promise<{ success: boolean; text?: string; error?: string }> {
  if (!text.trim()) return { success: false, error: "No text to translate." };

  const instructions =
    context === "job_description"
      ? `You are a professional translator and editor. The text below is a job description or role requirement that may be in any language or written informally. 
Translate it to clear, professional English. Preserve all technical terms, role titles, requirements, and bullet points. Keep the full meaning intact — do not summarise or remove details. Output only the translated/cleaned text, nothing else.`
      : `You are a professional translator and editor. The text below is a job application note that may be in any language or written informally.
Translate it to clear, professional English. Preserve all specific details, observations, and context. Output only the translated/cleaned text, nothing else.`;

  const user = `${instructions}\n\n---\n${text}\n---`;

  const res = await openRouterChatText({
    user,
    temperature: 0.2,
    maxTokens: 8192,
  });
  if (!res.ok) {
    return { success: false, error: res.error === "OPENROUTER_API_KEY is not configured." ? res.error : `Translation failed: ${res.error}` };
  }
  const out = res.text.trim();
  if (!out) return { success: false, error: "Translation failed: empty response." };
  return { success: true, text: out };
}

export async function generateCompanyOverview(companyName: string): Promise<{
  success: boolean;
  text?: string;
  error?: string;
}> {
  if (!companyName.trim()) {
    return { success: false, error: "Company name is required." };
  }

  const user = `You are a job research assistant helping a candidate prepare for their job application. Write a concise, factual company overview for "${companyName}" to help the candidate understand the company before applying or interviewing.

Structure the overview with these sections (use plain text, no markdown symbols):

WHAT THEY DO
Describe the core product, service, or platform. What problem do they solve? Who are their customers?

INDUSTRY & POSITION
What industry are they in? Are they a market leader, challenger, or niche player? Who are their main competitors?

COMPANY SIZE & STAGE
Approximate employee count, funding stage (bootstrapped, seed, Series A-D, public, etc.), founding year if notable.

TECH STACK
Known or likely technologies used (languages, frameworks, cloud providers, infrastructure). If uncertain, mention what is publicly known.

CULTURE & WORK ENVIRONMENT
What is the company known for culturally? Any notable benefits, work style (remote-first, hybrid, in-office), or values?

WHY IT'S INTERESTING
What makes this company worth applying to? Growth trajectory, mission, impact, or unique aspects.

Be accurate and honest. If the company is not well-known or you are uncertain about specific details, say so rather than guessing. Keep the overview practical and useful for a job application context. Total length: 250-350 words.`;

  const res = await openRouterChatText({
    user,
    temperature: 0.4,
    maxTokens: 2048,
  });
  if (!res.ok) {
    return {
      success: false,
      error: res.error === "OPENROUTER_API_KEY is not configured." ? res.error : `Failed to generate overview: ${res.error}`,
    };
  }
  const text = res.text.trim();
  if (!text) return { success: false, error: "Failed to generate overview: empty response." };
  return { success: true, text };
}
