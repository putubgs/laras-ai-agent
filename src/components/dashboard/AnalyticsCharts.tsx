"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";

const GRID = "rgba(255,255,255,0.06)";
const TICK = "#bac9cc";
const LINE_PRIMARY = "#00daf3";
const LINE_TARGET = "#fbbf24";
const BAR_LOW = "rgba(0, 218, 243, 0.35)";
const BAR_HIGH = "#00daf3";

type StatusData = { name: string; value: number; color: string };
type SourceData = { name: string; count: number; color: string };
type TrendData = { date: string; count: number };
type PhaseData = { name: string; scheduled: number; passed: number; failed: number; color: string };

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="laras-glass-strong rounded-xl border border-outline-variant/60 p-3 text-sm text-on-surface shadow-xl">
      {label && <p className="mb-1 font-medium text-on-surface">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-on-surface-variant">{p.name}:</span>
          <span className="font-semibold text-on-surface">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function StatusPieChart({ data }: { data: StatusData[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} strokeWidth={0} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-2 grid w-full grid-cols-2 gap-x-6 gap-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-xs text-on-surface-variant">{item.name}</span>
            <span className="ml-auto text-xs font-semibold text-on-surface">{item.value}</span>
            <span className="text-xs text-on-surface-variant/70">
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SourceBarChart({ data }: { data: SourceData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: TICK }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" name="Applications" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data, dailyTarget }: { data: TrendData[]; dailyTarget: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: TICK }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px", color: TICK }}
        />
        <Line
          type="monotone"
          dataKey="count"
          name="Applications"
          stroke={LINE_PRIMARY}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey={() => dailyTarget}
          name="Daily Target"
          stroke={LINE_TARGET}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({
  data,
  avgMonthly,
}: {
  data: { date: string; count: number }[];
  avgMonthly: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: TICK }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        {avgMonthly > 0 && (
          <ReferenceLine
            y={avgMonthly}
            stroke={LINE_PRIMARY}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: `Avg ${avgMonthly}`,
              fill: LINE_PRIMARY,
              fontSize: 11,
              position: "insideTopRight",
            }}
          />
        )}
        <Bar dataKey="count" name="Applications" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.count >= avgMonthly && avgMonthly > 0 ? BAR_HIGH : BAR_LOW}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PhaseBarChart({ data }: { data: PhaseData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: TICK }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px", color: TICK }}
        />
        <Bar dataKey="scheduled" name="Scheduled" fill="#38bdf8" radius={[0, 4, 4, 0]} stackId="a" />
        <Bar dataKey="passed" name="Passed" fill="#34d399" radius={[0, 4, 4, 0]} stackId="a" />
        <Bar dataKey="failed" name="Failed" fill="#f87171" radius={[0, 4, 4, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
