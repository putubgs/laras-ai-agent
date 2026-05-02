<!-- BEGIN:nextjs-agent-rules -->
## Rules
- Use App Router only
- Use Supabase for all DB operations
- Use server actions instead of API routes when possible
- Follow modular AI agent architecture

## Tech Stack
- Next.js (latest experimental)
- Supabase
- OpenRouter (OpenAI-compatible chat API)

## Coding Style
- TypeScript strict
- Functional approach
- Postgres datetime columns use **`timestamptz`** (absolute instants). Parse API values with `parseDbInstant` from `src/lib/app-timezone.ts`. Show user-facing times in **`Asia/Jakarta`** via `formatInTimeZone`; naive form datetimes without offset are interpreted as WIB in `naiveFormDateTimeToUtcIso`.
- LLM: **`OPENROUTER_API_KEY`** (see `src/lib/openrouter.ts`). Optional **`OPENROUTER_MODEL`** (default `openai/gpt-4o-mini`), **`OPENROUTER_HTTP_REFERER`**, **`OPENROUTER_APP_TITLE`**. Server actions live in `src/lib/actions/gemini.ts` (name kept for imports); CV keywords use `src/lib/gemini-cv-keywords.ts`.
<!-- END:nextjs-agent-rules -->
