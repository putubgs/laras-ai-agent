"use client";

import { useState, useTransition, useMemo } from "react";
import { formatInTimeZone } from "date-fns-tz";
import {
  Building2,
  Search,
  Loader2,
  ExternalLink,
  Pencil,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import Link from "next/link";
import { getApplicationsByCompany } from "@/lib/actions/applications";
import { getStatus, getSource } from "@/lib/constants";
import { APP_TIME_ZONE } from "@/lib/app-timezone";

type CompanyEntry = { company: string; count: number };

type Application = {
  id: string;
  company: string;
  position: string;
  status: string;
  source: string;
  appliedAt: Date;
  locationType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  notes: string | null;
  phases: { phase: { name: string; color: string }; status: string }[];
};

type SortKey = "appliedAt" | "position" | "status";
type SortDir = "asc" | "desc";

export default function CompanyAnalysis({ companies }: { companies: CompanyEntry[] }) {
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isPending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey>("appliedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(
    () =>
      companies.filter((c) =>
        c.company.toLowerCase().includes(search.toLowerCase())
      ),
    [companies, search]
  );

  const handleSelect = (company: string) => {
    setSelectedCompany(company);
    setSearch(company);
    setShowDropdown(false);
    startTransition(async () => {
      const data = await getApplicationsByCompany(company);
      setApplications(data as Application[]);
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...applications].sort((a, b) => {
    if (sortKey === "appliedAt") {
      const diff = new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
      return sortDir === "asc" ? diff : -diff;
    }
    const av = a[sortKey].toLowerCase();
    const bv = b[sortKey].toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const jakartaDistinctMonthCount = useMemo(
    () =>
      new Set(
        applications.map((a) =>
          formatInTimeZone(new Date(a.appliedAt), APP_TIME_ZONE, "yyyy-MM"),
        ),
      ).size,
    [applications],
  );

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? (
      <ChevronsUpDown className="w-3 h-3 text-on-surface-variant/70" />
    ) : sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );

  return (
    <div>
      {/* Company search */}
      <div className="relative max-w-md mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70" />
          <input
            type="text"
            placeholder="Search for a company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
              if (!e.target.value) {
                setSelectedCompany(null);
                setApplications([]);
              }
            }}
            onFocus={() => setShowDropdown(true)}
            className="laras-field w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setSelectedCompany(null); setApplications([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface-variant"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && search && !selectedCompany && filtered.length > 0 && (
          <div
            className="laras-glass-strong absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-outline-variant/60 shadow-xl"
            onMouseDown={(e) => e.preventDefault()}
          >
            {filtered.slice(0, 20).map((c) => (
              <button
                key={c.company}
                onClick={() => handleSelect(c.company)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-primary/10 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="laras-icon-box flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                    <span className="text-primary font-semibold text-xs">
                      {c.company.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-on-surface">{c.company}</span>
                </div>
                <span className="text-xs text-on-surface-variant/70 font-medium">
                  {c.count} application{c.count !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
            {filtered.length > 20 && (
              <p className="text-center text-xs text-on-surface-variant/70 py-2">
                {filtered.length - 20} more — type to narrow down
              </p>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {isPending && (
        <div className="flex items-center gap-2 text-on-surface-variant text-sm py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading applications for {selectedCompany}…
        </div>
      )}

      {/* Results */}
      {!isPending && selectedCompany && applications.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="laras-icon-box flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold">
              <span className="text-primary font-bold text-sm">
                {selectedCompany.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-on-surface">{selectedCompany}</h3>
              <p className="text-xs text-on-surface-variant">
                {applications.length} application{applications.length !== 1 ? "s" : ""} across{" "}
                {jakartaDistinctMonthCount} month{jakartaDistinctMonthCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-outline-variant/50 bg-surface-container-low/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/50 bg-surface-container-low/80">
                  {(
                    [
                      { key: "appliedAt", label: "Date Applied" },
                      { key: "position", label: "Position" },
                      { key: "status", label: "Status" },
                    ] as { key: SortKey; label: string }[]
                  ).map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-4 py-3 text-left font-medium text-on-surface-variant cursor-pointer hover:text-on-surface select-none"
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        <SortIcon col={key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">Phases</th>
                  <th className="px-4 py-3 text-left font-medium text-on-surface-variant">Month</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {sorted.map((app) => {
                  const status = getStatus(app.status);
                  const source = getSource(app.source);
                  const appliedDate = new Date(app.appliedAt);
                  return (
                    <tr key={app.id} className="hover:bg-surface-container-low/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant font-medium">
                        {formatInTimeZone(appliedDate, APP_TIME_ZONE, "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant max-w-[200px] truncate">
                        {app.position}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
                        >
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
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {app.phases.map((p, i) => (
                            <span
                              key={i}
                              className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                              style={{ backgroundColor: p.phase.color }}
                            >
                              {p.phase.name.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                        {formatInTimeZone(appliedDate, APP_TIME_ZONE, "MMMM yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/applications/${app.id}/edit`}
                          className="inline-flex rounded-lg p-1.5 text-on-surface-variant/70 transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Notes preview if any */}
          {applications.some((a) => a.notes) && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                Notes
              </p>
              {applications
                .filter((a) => a.notes)
                .map((a) => (
                  <div key={a.id} className="bg-surface-container-low/80 rounded-xl p-3 border border-outline-variant/50">
                    <p className="text-xs font-medium text-on-surface-variant mb-1">
                      {a.position} ·{" "}
                      {formatInTimeZone(new Date(a.appliedAt), APP_TIME_ZONE, "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-on-surface-variant whitespace-pre-wrap line-clamp-3">
                      {a.notes}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {!isPending && selectedCompany && applications.length === 0 && (
        <div className="text-center py-10 text-on-surface-variant/70 text-sm">
          No applications found for {selectedCompany}
        </div>
      )}

      {!selectedCompany && companies.length === 0 && (
        <div className="text-center py-10 text-on-surface-variant/70 text-sm">
          <Building2 className="w-8 h-8 mx-auto mb-2 text-on-surface-variant/50" />
          No applications tracked yet
        </div>
      )}
    </div>
  );
}
