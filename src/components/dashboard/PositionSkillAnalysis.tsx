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
import { getSkillLevel } from "@/lib/constants";
import { Briefcase, Zap, Target, TrendingUp } from "lucide-react";

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

type SkillStat = {
  skillId: string;
  name: string;
  category: string;
  level: string;
  totalApplications: number;
  approved: number;
  rejected: number;
  pending: number;
};

type Props = {
  positions: PositionStat[];
  skills: SkillStat[];
};

const CustomTooltip = ({ active, payload, label }: {
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

export default function PositionSkillAnalysis({ positions, skills }: Props) {
  const hasPositions = positions.length > 0;
  const hasSkills = skills.length > 0;

  return (
    <div className="space-y-5">
      {/* Position Analysis */}
      <div className="laras-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-on-surface">Position Analysis</h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          Which roles you apply to most — and how they convert.
        </p>

        {!hasPositions ? (
          <div className="h-40 flex items-center justify-center text-on-surface-variant/70 text-sm">
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
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_TICK }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="position"
                    width={160}
                    tick={{ fontSize: 11, fill: CHART_TICK }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: string) => v.length > 22 ? `${v.slice(0, 22)}…` : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: CHART_TICK }} />
                  <Bar dataKey="approved" name="Approved" fill={BAR_APPROVED} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="rejected" name="Rejected" fill={BAR_REJECTED} stackId="a" />
                  <Bar dataKey="pending" name="Pending / Active" fill={BAR_PENDING} stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Position table */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/50">
                    <th className="text-left py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Position</th>
                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Applied</th>
                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Approved</th>
                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Rejected</th>
                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, i) => {
                    const rate = p.total > 0 ? ((p.approved / p.total) * 100).toFixed(0) : "0";
                    return (
                      <tr key={i} className="border-b border-outline-variant/40 transition-colors hover:bg-surface-container-low/60">
                        <td className="py-2.5 px-3 font-medium text-on-surface max-w-[220px] truncate">{p.position}</td>
                        <td className="py-2.5 px-3 text-center text-on-surface-variant">{p.total}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-emerald-200">{p.approved}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-red-300">{p.rejected}</td>
                        <td className="py-2.5 px-3 text-center">
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

      {/* Skill Effectiveness */}
      <div className="laras-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-primary-container" />
          <h2 className="text-base font-semibold text-on-surface">Skill Effectiveness</h2>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          How your skills perform across applications — based on outcomes where skills were selected.
        </p>

        {!hasSkills ? (
          <div className="text-center py-10">
            <Target className="w-8 h-8 text-on-surface-variant/50 mx-auto mb-2" />
            <p className="text-sm text-on-surface-variant/70">
              No skill data yet. Add skills to your{" "}
              <a href="/dashboard/profile" className="laras-link font-medium">
                profile
              </a>{" "}
              and select them when adding applications.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              {(() => {
                const mostUsed = [...skills].sort((a, b) => b.totalApplications - a.totalApplications)[0];
                const highestSuccess = [...skills].filter(s => s.totalApplications >= 3)
                  .sort((a, b) => (b.approved / b.totalApplications) - (a.approved / a.totalApplications))[0];
                const unused = skills.filter((s) => s.totalApplications === 0);
                return (
                  <>
                    {mostUsed && (
                      <div className="rounded-xl border border-outline-variant/50 bg-primary/10 p-4 ring-1 ring-primary/20">
                        <div className="mb-1 flex items-center gap-1.5 text-primary">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold uppercase tracking-wider">Most Applied With</span>
                        </div>
                        <p className="text-sm font-semibold text-on-surface">{mostUsed.name}</p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {mostUsed.totalApplications} application{mostUsed.totalApplications !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                    {highestSuccess && (
                      <div className="rounded-xl border border-outline-variant/50 bg-emerald-500/10 p-4 ring-1 ring-emerald-400/25">
                        <div className="mb-1 flex items-center gap-1.5 text-emerald-200">
                          <Zap className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold uppercase tracking-wider">Best Success Rate</span>
                        </div>
                        <p className="text-sm font-semibold text-on-surface">{highestSuccess.name}</p>
                        <p className="mt-0.5 text-xs text-emerald-200">
                          {((highestSuccess.approved / highestSuccess.totalApplications) * 100).toFixed(0)}% success
                        </p>
                      </div>
                    )}
                    {unused.length > 0 && (
                      <div className="rounded-xl border border-outline-variant/50 bg-amber-500/10 p-4 ring-1 ring-amber-400/25">
                        <div className="mb-1 flex items-center gap-1.5 text-amber-200">
                          <Target className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold uppercase tracking-wider">Underutilized</span>
                        </div>
                        <p className="text-sm font-semibold text-on-surface">
                          {unused[0].name}
                          {unused.length > 1 ? ` +${unused.length - 1} more` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">Never selected in applications</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/50">
                    <th className="text-left py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Skill</th>
                    <th className="text-left py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Category</th>
                    <th className="text-left py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Level</th>
                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Used In</th>
                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Approved</th>
                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Rejected</th>
                    <th className="text-center py-2 px-3 font-semibold text-on-surface-variant uppercase tracking-wider">Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {[...skills]
                    .sort((a, b) => b.totalApplications - a.totalApplications)
                    .map((s) => {
                      const level = getSkillLevel(s.level);
                      const rate = s.totalApplications > 0 ? ((s.approved / s.totalApplications) * 100).toFixed(0) : null;
                      return (
                        <tr key={s.skillId} className="border-b border-outline-variant/40 transition-colors hover:bg-surface-container-low/60">
                          <td className="py-2.5 px-3 font-medium text-on-surface">{s.name}</td>
                          <td className="py-2.5 px-3 text-on-surface-variant">{s.category}</td>
                          <td className="py-2.5 px-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${level.bg} ${level.text}`}>
                              {level.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-on-surface-variant">
                            {s.totalApplications > 0 ? s.totalApplications : <span className="font-normal text-on-surface-variant/50">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-emerald-200">
                            {s.approved > 0 ? s.approved : <span className="font-normal text-on-surface-variant/50">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-red-300">
                            {s.rejected > 0 ? s.rejected : <span className="font-normal text-on-surface-variant/50">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {rate !== null ? (
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
                            ) : (
                              <span className="text-on-surface-variant/50">—</span>
                            )}
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
