"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Globe } from "lucide-react";

type Props = {
  view: "month" | "all";
  year: number;
  month: number;
};

export default function ViewToggle({ view, year, month }: Props) {
  const router = useRouter();

  const go = (v: "month" | "all") => {
    if (v === "month") {
      router.push(`/dashboard/analytics?view=month&year=${year}&month=${month}`);
    } else {
      router.push(`/dashboard/analytics?view=all`);
    }
  };

  const active =
    "bg-surface-container-low/95 text-on-surface shadow-[inset_0_0_0_1px_rgba(0,218,243,0.35)] ring-1 ring-primary/20";
  const inactive = "text-on-surface-variant hover:bg-surface-container-high/80 hover:text-on-surface";

  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-container-high/80 p-1">
      <button
        type="button"
        onClick={() => go("month")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
          view === "month" ? active : inactive
        }`}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Monthly
      </button>
      <button
        type="button"
        onClick={() => go("all")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
          view === "all" ? active : inactive
        }`}
      >
        <Globe className="h-3.5 w-3.5" />
        All Time
      </button>
    </div>
  );
}
