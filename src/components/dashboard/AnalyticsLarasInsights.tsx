"use client";

import { useState, useTransition } from "react";
import { Sparkles, Lock, Loader2 } from "lucide-react";
import { generateAnalyticsStrategicAdvice } from "@/lib/actions/analytics-insights";
import { LarasTypingAdvice } from "@/components/dashboard/LarasTypingAdvice";
import { ANALYTICS_LARAS_INSIGHTS_MIN_APPLICATIONS } from "@/lib/constants";

type Props = {
  appliedSavedCount: number;
  view: "month" | "all";
  year: number;
  month: number;
};

export default function AnalyticsLarasInsights({ appliedSavedCount, view, year, month }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unlocked = appliedSavedCount >= ANALYTICS_LARAS_INSIGHTS_MIN_APPLICATIONS;

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateAnalyticsStrategicAdvice({ view, year, month });
      if (!res.ok) {
        setText(null);
        setError(res.error);
        return;
      }
      setText(res.text);
    });
  };

  return (
    <div className="laras-card relative mb-8 overflow-hidden border border-primary/25 p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-on-surface">
              Laras strategic insights
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Overall coaching from your analytics — sources, outcomes, and where to focus next.
            </p>
          </div>
        </div>
      </div>

      {!unlocked ? (
        <div className="relative mt-5 flex items-start gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low/50 px-4 py-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
          <p className="text-sm text-on-surface-variant">
            Save at least <strong className="text-on-surface">{ANALYTICS_LARAS_INSIGHTS_MIN_APPLICATIONS}</strong> applications
            (not drafts) to unlock this. You currently have{" "}
            <strong className="text-on-surface">{appliedSavedCount}</strong> saved.
          </p>
        </div>
      ) : (
        <>
          <div className="relative mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isPending}
              className="laras-btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {text ? "Regenerate insights" : "Ask Laras for insights"}
            </button>
            <span className="text-xs text-on-surface-variant/80">
              Uses OpenRouter · reflects current view ({view === "month" ? "month + all-time context" : "all time"})
            </span>
          </div>
          {error && (
            <p className="relative mt-3 rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          )}
          {text && (
            <div className="relative mt-5 rounded-xl border border-outline-variant/50 bg-surface-container-low/40 px-4 py-4">
              <div className="text-sm leading-relaxed text-on-surface/95">
                <LarasTypingAdvice text={text} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
