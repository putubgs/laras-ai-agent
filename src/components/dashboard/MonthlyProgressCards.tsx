"use client";

import { useState, useTransition } from "react";
import { Target, Flame, Pencil, Check, X, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { upsertMonthlyTarget } from "@/lib/actions/targets";

type Props = {
  year: number;
  month: number;
  monthlyTarget: number;
  monthCount: number;
  todayCount: number;
  daysRemainingInMonth: number;
  daysElapsedInMonth: number;
  isCurrentMonth: boolean;
};

export default function MonthlyProgressCards({
  year,
  month,
  monthlyTarget: initialTarget,
  monthCount,
  todayCount,
  daysRemainingInMonth,
  daysElapsedInMonth,
  isCurrentMonth,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(initialTarget.toString());
  const [currentTarget, setCurrentTarget] = useState(initialTarget);

  const remaining = Math.max(currentTarget - monthCount, 0);
  const monthPercent = Math.min((monthCount / currentTarget) * 100, 100);

  const monthCountBeforeToday = monthCount - todayCount;
  const remainingBeforeToday = Math.max(currentTarget - monthCountBeforeToday, 0);
  const dynamicDailyTarget =
    isCurrentMonth && daysRemainingInMonth > 0
      ? Math.ceil(remainingBeforeToday / daysRemainingInMonth)
      : 0;

  const dailyPercent =
    dynamicDailyTarget > 0
      ? Math.min((todayCount / dynamicDailyTarget) * 100, 100)
      : todayCount > 0
        ? 100
        : 0;

  const pace =
    daysElapsedInMonth > 0 ? Math.round(monthCount / daysElapsedInMonth) : 0;
  const projectedMonthTotal = pace * (daysElapsedInMonth + daysRemainingInMonth);
  const isOnTrack = projectedMonthTotal >= currentTarget;

  const saveTarget = () => {
    const val = parseInt(targetInput);
    if (isNaN(val) || val < 1) return;
    setCurrentTarget(val);
    setEditingTarget(false);
    startTransition(async () => {
      await upsertMonthlyTarget(year, month, val);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="laras-card p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-display font-semibold text-on-surface">Monthly Target</p>
              <p className="text-xs text-on-surface-variant">
                {daysRemainingInMonth} days remaining this month
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {editingTarget ? (
              <>
                <input
                  type="number"
                  min={1}
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTarget();
                    if (e.key === "Escape") setEditingTarget(false);
                  }}
                  autoFocus
                  className="w-24 border-b-2 border-surface-tint bg-transparent text-right text-2xl font-bold text-on-surface focus:outline-none"
                />
                <button
                  onClick={saveTarget}
                  disabled={isPending}
                  className="rounded-lg bg-primary-container p-1 text-on-primary-container hover:brightness-110 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setEditingTarget(false)}
                  className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-high"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setTargetInput(currentTarget.toString());
                  setEditingTarget(true);
                }}
                className="group flex items-center gap-1"
                title="Click to edit monthly target"
              >
                <span className="font-display text-3xl font-bold text-on-surface transition-colors group-hover:text-primary">
                  {monthCount.toLocaleString()}
                </span>
                <span className="text-lg font-medium text-on-surface-variant">
                  /{currentTarget.toLocaleString()}
                </span>
                <Pencil className="ml-1 h-3.5 w-3.5 text-on-surface-variant/50 transition-colors group-hover:text-primary" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-2 h-3 w-full rounded-full bg-surface-container-high">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-primary-container to-secondary-container shadow-[0_0_12px_rgba(0,229,255,0.35)] transition-all duration-500"
            style={{ width: `${monthPercent}%` }}
          />
        </div>
        <div className="mb-3 flex justify-between text-xs text-on-surface-variant">
          <span>{monthPercent.toFixed(1)}% complete</span>
          <span>{remaining.toLocaleString()} remaining</span>
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs font-medium ${isOnTrack ? "text-emerald-300" : "text-amber-300"}`}
        >
          {isOnTrack ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          Avg {pace}/day → projected {projectedMonthTotal.toLocaleString()} this month
          {isOnTrack ? " (on track 🎯)" : " (behind pace)"}
        </div>
      </div>

      <div className="laras-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-400/35">
              <Flame className="h-5 w-5 text-orange-300" />
            </div>
            <div>
              <p className="font-display font-semibold text-on-surface">
                {isCurrentMonth ? "Today's Goal" : "Daily Avg Needed"}
              </p>
              <p className="text-xs text-on-surface-variant">
                {isCurrentMonth
                  ? "To stay on pace for the month"
                  : "Based on remaining workload"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold text-on-surface">
              {isCurrentMonth ? todayCount : pace}
            </p>
            <p className="text-sm text-on-surface-variant">
              {isCurrentMonth ? `/ ${dynamicDailyTarget} needed` : "avg/day so far"}
            </p>
          </div>
        </div>

        {isCurrentMonth && (
          <>
            <div className="mb-2 h-3 w-full rounded-full bg-surface-container-high">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  dailyPercent >= 100
                    ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                    : "bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.35)]"
                }`}
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>{dailyPercent.toFixed(0)}% of today&apos;s goal</span>
              <span>
                {todayCount >= dynamicDailyTarget
                  ? "🎉 Daily goal met!"
                  : `${Math.max(dynamicDailyTarget - todayCount, 0)} more needed today`}
              </span>
            </div>

            <div className="mt-3 space-y-0.5 rounded-xl bg-surface-container-low/80 p-3 text-xs text-on-surface-variant ring-1 ring-outline-variant/40">
              <div className="flex justify-between">
                <span>Today&apos;s target (fixed at day start)</span>
                <span className="font-semibold text-on-surface">{dynamicDailyTarget}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining days (incl. today)</span>
                <span className="font-semibold text-on-surface">{daysRemainingInMonth}</span>
              </div>
              <div className="flex justify-between">
                <span>Jobs still needed this month</span>
                <span className="font-semibold text-on-surface">{remaining.toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
