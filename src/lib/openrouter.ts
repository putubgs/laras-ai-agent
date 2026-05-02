import OpenAI from "openai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Default OpenAI model on OpenRouter (`provider/model`). */
export function openRouterModel(): string {
  return "openai/gpt-4o-mini";
}

export function getOpenRouterClient(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;
  const referer =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://laras-ai.vercel.app/";
  const title = "Laras AI Agent";
  return new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": referer,
      "X-Title": title,
    },
  });
}

export async function openRouterChatText(options: {
  system?: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** When true, requests `response_format: { type: "json_object" }` (model must support it). */
  jsonObject?: boolean;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const client = getOpenRouterClient();
  if (!client) {
    return { ok: false, error: "OPENROUTER_API_KEY is not configured." };
  }
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (options.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: options.user });
  try {
    const completion = await client.chat.completions.create({
      model: options.model ?? openRouterModel(),
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 4096,
      ...(options.jsonObject ? { response_format: { type: "json_object" as const } } : {}),
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return { ok: true, text };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "OpenRouter request failed.",
    };
  }
}
