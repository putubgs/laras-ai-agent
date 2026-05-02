"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Briefcase } from "lucide-react";

const CHART_GRID = "rgba(255,255,255,0.06)";
const CHART_TICK = "#aabbd8";
const BAR_APPROVED = "#34d399";
const BAR_REJECTED = "#f87171";
const BAR_PENDING = "#38bdf8";

type PositionStat = {
  position: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
};

type Props = {
  positions: PositionStat[];
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="laras-glass-strong rounded-xl border border-outline-variant/60 p-3 text-xs text-on-surface shadow-xl">
      <p className="mb-1.5 max-w-[200px] truncate font-semibold text-on-surface">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-on-surface-variant">{p.name}:</span>
          <span className="font-semibold text-on-surface">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function PositionSkillAnalysis({ positions }: Props) {
  const hasPositions = positions.length > 0;

  return (
    <div className="space-y-5">
      <div className="laras-card p-6">
        <div className="mb-1 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-on-surface">Position Analysis</h2>
        </div>
        <p className="mb-5 text-sm text-on-surface-variant">
          Which roles you apply to most — and how they convert.
        </p>

        {!hasPositions ? (
          <div className="flex h-40 items-center justify-center text-sm text-on-surface-variant/70">
            No application data yet.
          </div>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={positions}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} fill="none" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="position"
                    width={160}
                    tick={{ fontSize: 11, fill: CHART_TICK }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 22)}…` : v)}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Legend wrapperStyle={{ fontSize: 11, color: CHART_TICK }} />
                  <Bar dataKey="approved" name="Approved" fill={BAR_APPROVED} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="rejected" name="Rejected" fill={BAR_REJECTED} stackId="a" />
                  <Bar dataKey="pending" name="Pending / Active" fill={BAR_PENDING} stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/50">
                    <th className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-on-surface-variant">
                      Position
                    </th>
                    <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-on-surface-variant">
                      Applied
                    </th>
                    <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-on-surface-variant">
                      Approved
                    </th>
                    <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-on-surface-variant">
                      Rejected
                    </th>
                    <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider text-on-surface-variant">
                      Success %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, i) => {
                    const rate = p.total > 0 ? ((p.approved / p.total) * 100).toFixed(0) : "0";
                    return (
                      <tr
                        key={i}
                        className="border-b border-outline-variant/40 transition-colors hover:bg-surface-container-low/60"
                      >
                        <td className="max-w-[220px] truncate px-3 py-2.5 font-medium text-on-surface">{p.position}</td>
                        <td className="px-3 py-2.5 text-center text-on-surface-variant">{p.total}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-emerald-200">{p.approved}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-red-300">{p.rejected}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              parseInt(rate) >= 15
                                ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/35"
                                : parseInt(rate) >= 5
                                  ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/35"
                                  : "bg-surface-container-high/80 text-on-surface-variant ring-1 ring-outline-variant/50"
                            }`}
                          >
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
