"use client";

import { useRouter } from "next/navigation";
import { format, addMonths, subMonths } from "date-fns";
import { jakartaYearMonthDayNow } from "@/lib/app-timezone";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

type Props = {
  year: number;
  month: number;
  basePath?: string;
  extraParams?: Record<string, string>;
};

export default function MonthNav({ year, month, basePath = "", extraParams = {} }: Props) {
  const router = useRouter();
  const current = new Date(year, month - 1, 1);
  const jNow = jakartaYearMonthDayNow();
  const isCurrentMonth = year === jNow.year && month === jNow.month;
  const isFuture = year > jNow.year || (year === jNow.year && month > jNow.month);

  const buildUrl = (y: number, m: number) => {
    const params = new URLSearchParams({ year: String(y), month: String(m), ...extraParams });
    return `${basePath}?${params.toString()}`;
  };

  const navigate = (date: Date) => {
    router.push(buildUrl(date.getFullYear(), date.getMonth() + 1));
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(subMonths(current, 1))}
        className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        title="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="laras-month-display min-w-[148px] justify-center py-2.5">
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-[110px] text-center font-display text-sm font-semibold tracking-tight text-on-surface">
          {format(current, "MMMM yyyy")}
        </span>
      </div>

      <button
        onClick={() => navigate(addMonths(current, 1))}
        disabled={isFuture}
        className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-30"
        title="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!isCurrentMonth && (
        <button
          onClick={() => router.push(buildUrl(jNow.year, jNow.month))}
          className="laras-link ml-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-primary/10"
        >
          Today
        </button>
      )}
    </div>
  );
}
