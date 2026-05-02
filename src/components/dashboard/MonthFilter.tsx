"use client";

import { useRouter } from "next/navigation";
import { subMonths } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { CalendarDays, ChevronDown } from "lucide-react";
import { APP_TIME_ZONE, jakartaYearMonthDayNow } from "@/lib/app-timezone";

type Props = {
  year: number;
  month: number;
  basePath: string;
};

export default function MonthFilter({ year, month, basePath }: Props) {
  const router = useRouter();
  const j = jakartaYearMonthDayNow();
  const anchor = fromZonedTime(new Date(j.year, j.month - 1, 15, 12, 0, 0, 0), APP_TIME_ZONE);

  const months = [
    { label: "All Time", value: "all" },
    ...Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(anchor, i);
      return {
        label: formatInTimeZone(d, APP_TIME_ZONE, "MMMM yyyy"),
        value: formatInTimeZone(d, APP_TIME_ZONE, "yyyy-M"),
      };
    }),
  ];

  const currentValue = year === 0 ? "all" : `${year}-${month}`;

  const handleChange = (value: string) => {
    if (value === "all") {
      router.push(basePath);
    } else {
      const [y, m] = value.split("-");
      router.push(`${basePath}?year=${y}&month=${m}`);
    }
  };

  return (
    <div className="relative min-w-[220px]">
      <CalendarDays
        className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary"
        aria-hidden
      />
      <select
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Filter by month"
        className="w-full cursor-pointer appearance-none rounded-xl border border-primary/35 bg-surface-container-low/95 py-2.5 pl-10 pr-10 font-display text-sm font-semibold tracking-tight text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(0,218,243,0.06)] backdrop-blur-md transition-[border-color,box-shadow] hover:border-primary/50 focus:border-surface-tint focus:outline-none focus:ring-2 focus:ring-surface-tint/35"
      >
        {months.map((m) => (
          <option key={m.value} value={m.value} className="bg-surface-container-low text-on-surface">
            {m.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
        aria-hidden
      />
    </div>
  );
}
