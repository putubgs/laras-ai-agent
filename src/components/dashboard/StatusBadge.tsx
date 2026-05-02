import { getStatus, getSource } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const s = getStatus(status);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const s = getSource(source);
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: s.color }}
    >
      {s.label}
    </span>
  );
}
