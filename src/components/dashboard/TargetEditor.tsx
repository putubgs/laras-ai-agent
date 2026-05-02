"use client";

import { useState, useTransition } from "react";
import { addMonths } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Target, Pencil, Check, X, Loader2 } from "lucide-react";
import { upsertMonthlyTarget } from "@/lib/actions/targets";
import { APP_TIME_ZONE, jakartaYearMonthDayNow } from "@/lib/app-timezone";

type MonthlyTargetRecord = {
  year: number;
  month: number;
  target: number;
};

type Props = {
  targets: MonthlyTargetRecord[];
  defaultTarget: number;
};

export default function TargetEditor({ targets, defaultTarget }: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [localTargets, setLocalTargets] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    targets.forEach((t) => m.set(`${t.year}-${t.month}`, t.target));
    return m;
  });

  const jNow = jakartaYearMonthDayNow();
  const anchor = fromZonedTime(new Date(jNow.year, jNow.month - 1, 15, 12, 0, 0, 0), APP_TIME_ZONE);
  const rangeMonths = [-3, -2, -1, 0, 1, 2].map((delta) => addMonths(anchor, delta));
  const jakartaTodayYm = formatInTimeZone(new Date(), APP_TIME_ZONE, "yyyy-MM");

  const getTarget = (year: number, month: number) => {
    return localTargets.get(`${year}-${month}`) ?? defaultTarget;
  };

  const startEdit = (year: number, month: number) => {
    const key = `${year}-${month}`;
    setEditingKey(key);
    setInputValue(getTarget(year, month).toString());
  };

  const saveEdit = (year: number, month: number) => {
    const val = parseInt(inputValue);
    if (isNaN(val) || val < 1) return;
    const key = `${year}-${month}`;
    setLocalTargets((prev) => new Map(prev).set(key, val));
    setEditingKey(null);
    startTransition(async () => {
      await upsertMonthlyTarget(year, month, val);
    });
  };

  return (
    <div className="space-y-3">
      {rangeMonths.map((d) => {
        const ym = formatInTimeZone(d, APP_TIME_ZONE, "yyyy-MM");
        const [year, month] = ym.split("-").map((x) => parseInt(x, 10));
        const key = `${year}-${month}`;
        const isCurrentMonth = ym === jakartaTodayYm;
        const isEditing = editingKey === key;
        const target = getTarget(year, month);
        const hasCustomTarget = localTargets.has(key);

        return (
          <div
            key={key}
            className={`laras-scan-hover flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
              isCurrentMonth
                ? "border-primary/40 bg-gradient-to-r from-primary/[0.08] via-surface-container-low/90 to-surface-container-low/70 shadow-[0_0_28px_rgba(0,218,243,0.08),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-primary/15"
                : "border-outline-variant/50 bg-surface-container-low/50 hover:border-outline-variant hover:bg-surface-container-high/35"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`h-2 w-2 shrink-0 rounded-full ${
                  isCurrentMonth
                    ? "bg-surface-tint shadow-[0_0_10px_rgba(0,218,243,0.85)]"
                    : "bg-outline-variant"
                }`}
              />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-display text-sm font-semibold text-on-surface">
                  <span>{formatInTimeZone(d, APP_TIME_ZONE, "MMMM yyyy")}</span>
                  {isCurrentMonth && (
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/35">
                      Current
                    </span>
                  )}
                </p>
                {!hasCustomTarget && (
                  <p className="mt-0.5 text-xs text-on-surface-variant">Using default target</p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pl-2">
              {isEditing ? (
                <>
                  <input
                    type="number"
                    min={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(year, month);
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                    autoFocus
                    className="laras-field w-28 !rounded-lg py-2 text-right font-display text-lg font-bold tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(year, month)}
                    disabled={isPending}
                    className="rounded-lg bg-gradient-to-br from-primary-container to-secondary-container p-2 text-on-primary shadow-[0_0_16px_rgba(0,229,255,0.35)] transition-all hover:brightness-110 disabled:opacity-50"
                    aria-label="Save target"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingKey(null)}
                    className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    aria-label="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(year, month)}
                  className="group flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-primary/5"
                >
                  <span className="font-display text-xl font-bold tabular-nums text-on-surface transition-colors group-hover:text-primary">
                    {target.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-on-surface-variant">jobs</span>
                  <Pencil className="h-3.5 w-3.5 text-on-surface-variant/60 transition-colors group-hover:text-primary" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div className="relative mt-5 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-low/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="pointer-events-none absolute left-0 top-0 h-px w-20 bg-gradient-to-r from-primary/60 to-transparent" />
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
            <Target className="h-4 w-4 text-primary" />
          </span>
          <div>
            <p className="laras-label-caps mb-1 text-[11px] text-on-surface-variant">Default monthly target</p>
            <p className="text-sm leading-relaxed text-on-surface-variant">
              <span className="font-display font-semibold tabular-nums text-primary">
                {defaultTarget.toLocaleString()}
              </span>{" "}
              jobs/month is applied to months without a specific target set. Edit any month above to override.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
