"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Search,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
} from "lucide-react";
import { APPLICATION_STATUSES, APPLICATION_SOURCES, getStatus, getSource } from "@/lib/constants";
import { deleteApplication } from "@/lib/actions/applications";

type Application = {
  id: string;
  company: string;
  position: string;
  location: string | null;
  locationType: string;
  jobUrl: string | null;
  source: string;
  status: string;
  salaryMin: number | null;
  salaryMax: number | null;
  appliedAt: Date;
  isApplied: boolean;
  phases: { phase: { name: string; color: string }; status: string }[];
};

type SortKey = "company" | "position" | "status" | "source" | "appliedAt";
type SortDir = "asc" | "desc";

export default function ApplicationsTable({
  applications,
}: {
  applications: Application[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("appliedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 text-on-surface-variant" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 text-primary" />
    );
  };

  const filtered = applications
    .filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        a.company.toLowerCase().includes(q) ||
        a.position.toLowerCase().includes(q) ||
        (a.location ?? "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || a.status === statusFilter;
      const matchesSource = !sourceFilter || a.source === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    })
    .sort((a, b) => {
      let aVal: string | Date = a[sortKey] as string | Date;
      let bVal: string | Date = b[sortKey] as string | Date;
      if (sortKey === "appliedAt") {
        aVal = new Date(aVal as Date);
        bVal = new Date(bVal as Date);
        return sortDir === "asc"
          ? (aVal as Date).getTime() - (bVal as Date).getTime()
          : (bVal as Date).getTime() - (aVal as Date).getTime();
      }
      aVal = (aVal as string).toLowerCase();
      bVal = (bVal as string).toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const handleDelete = (id: string) => {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteApplication(id);
      setDeletingId(null);
    });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search company, position, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="laras-field w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/90 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container-low/90 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-surface-tint appearance-none cursor-pointer"
          >
            <option value="">All Sources</option>
            {APPLICATION_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <Link
            href="/dashboard/applications/new"
            className="laras-btn-primary flex items-center gap-2 whitespace-nowrap text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add New
          </Link>
        </div>
      </div>

      <div className="text-xs text-on-surface-variant mb-3">
        {filtered.length} of {applications.length} applications
      </div>

      {/* Table */}
      <div className="laras-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low/50">
                {(
                  [
                    { key: "company", label: "Company" },
                    { key: "position", label: "Position" },
                    { key: "status", label: "Status" },
                    { key: "source", label: "Source" },
                    { key: "appliedAt", label: "Applied" },
                  ] as { key: SortKey; label: string }[]
                ).map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-4 py-3 text-left font-medium text-on-surface-variant cursor-pointer hover:text-on-surface select-none"
                    onClick={() => handleSort(key)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon col={key} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium text-on-surface-variant">Phases</th>
                <th className="px-4 py-3 text-left font-medium text-on-surface-variant">Salary</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-on-surface-variant">
                    <p className="font-medium">No applications found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const status = getStatus(app.status);
                  const source = getSource(app.source);
                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-surface-container-high/60 transition-colors ${
                        deletingId === app.id ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="laras-icon-box h-8 w-8 rounded-lg text-xs font-semibold">
                            <span>{app.company.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-on-surface flex items-center gap-2 flex-wrap">
                              {app.company}
                              {!app.isApplied && (
                                <span className="rounded-md bg-sky-500/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                                  Draft
                                </span>
                              )}
                            </p>
                            {app.location && (
                              <p className="text-xs text-on-surface-variant">{app.location}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant max-w-[180px] truncate">
                        {app.position}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: source.color }}
                        >
                          {source.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                        {format(new Date(app.appliedAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap max-w-[140px]">
                          {app.phases.map((p, i) => (
                            <span
                              key={i}
                              className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                              style={{ backgroundColor: p.phase.color }}
                              title={`${p.phase.name}: ${p.status}`}
                            >
                              {p.phase.name.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-xs">
                        {app.salaryMin || app.salaryMax
                          ? `$${(app.salaryMin ?? 0).toLocaleString()}${app.salaryMax ? ` – $${app.salaryMax.toLocaleString()}` : "+"}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {app.jobUrl && (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                              title="Open job posting"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Link
                            href={`/dashboard/applications/${app.id}/edit`}
                            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-primary/15 hover:text-primary"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(app.id)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
