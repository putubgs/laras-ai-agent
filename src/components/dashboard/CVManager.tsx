"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import {
  FileText,
  Upload,
  Pencil,
  Trash2,
  ExternalLink,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Info,
} from "lucide-react";
import { uploadCV, updateCV, deleteCV } from "@/lib/actions/cv";
import type { CvVersion } from "@/lib/actions/cv";
import { formatDistanceToNow } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TIME_ZONE, parseDbInstant } from "@/lib/app-timezone";

function cvCreatedInstant(value: Date | string): Date {
  return parseDbInstant(value);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileExt(filePath: string, fileName: string) {
  const fromName = fileName.split(".").pop();
  if (fromName) return fromName.toUpperCase();
  return filePath.split(".").pop()?.toUpperCase() ?? "FILE";
}

// ── Upload Form ───────────────────────────────────────────────────────────────

function UploadForm({
  onDone,
  onCancel,
}: {
  onDone: (created: CvVersion, warning?: string) => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const res = await uploadCV(data);
      if (res.error || !res.cv) {
        setError(res.error ?? "Upload failed.");
      } else {
        form.reset();
        setFileName(null);
        onDone(res.cv, res.warning);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="laras-label-caps mb-2 block">
          CV Name <span className="text-error">*</span>
        </label>
        <input
          name="name"
          required
          placeholder="e.g. Software Engineer Resume v2"
          className="laras-field"
        />
      </div>
      <div>
        <label className="laras-label-caps mb-2 block">Description</label>
        <textarea
          name="description"
          rows={2}
          placeholder="What changes did you make? Target role, tone changes, etc."
          className="laras-field-lg resize-y"
        />
      </div>
      <div>
        <label className="laras-label-caps mb-2 block">
          File <span className="text-error">*</span>{" "}
          <span className="font-normal normal-case tracking-normal text-on-surface-variant/80">
            (PDF or DOCX)
          </span>
        </label>
        <div
          className="laras-dropzone laras-scan-hover"
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
        >
          {fileName ? (
            <p className="text-sm font-semibold text-primary">{fileName}</p>
          ) : (
            <>
              <Upload className="mx-auto mb-2 h-7 w-7 text-primary opacity-90" />
              <p className="text-sm font-medium text-on-surface">Drop a file or click to browse</p>
              <p className="mt-1 text-xs text-on-surface-variant">PDF or DOCX · max size per server limits</p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </div>
      {error && (
        <p className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => onCancel?.()} className="laras-btn-secondary px-5 py-2 text-sm">
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="laras-btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50">
          <Upload className="h-4 w-4" />
          {isPending ? "Uploading…" : "Upload CV"}
        </button>
      </div>
    </form>
  );
}

// ── Edit inline form ──────────────────────────────────────────────────────────

function EditForm({
  cv,
  onDone,
  onSaved,
}: {
  cv: CvVersion;
  onDone: () => void;
  onSaved: (updated: Pick<CvVersion, "id" | "name" | "description">) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(cv.name);
  const [description, setDescription] = useState(cv.description ?? "");

  function handleSave() {
    startTransition(async () => {
      await updateCV(cv.id, { name, description });
      onSaved({ id: cv.id, name, description: description || null });
      onDone();
    });
  }

  return (
    <div className="mt-3 space-y-3 border-t border-outline-variant/50 pt-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="laras-field"
        placeholder="CV name"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="laras-field-lg resize-y"
        placeholder="Description"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high">
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/15 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── CV Card ───────────────────────────────────────────────────────────────────

function CVCard({
  cv,
  onDelete,
  onUpdate,
}: {
  cv: CvVersion;
  onDelete: (id: string) => void;
  onUpdate: (updated: Pick<CvVersion, "id" | "name" | "description">) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const ext = fileExt(cv.filePath, cv.fileName);
  const isPDF = ext === "PDF";

  function handleDelete() {
    if (!confirm(`Delete "${cv.name}"? Applications using it won't be affected.`)) return;
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteCV(cv.id);
        onDelete(cv.id);
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "Could not delete this CV.");
      }
    });
  }

  return (
    <div className="laras-card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-lg ring-1 ring-white/10 ${
              isPDF ? "bg-red-600" : "bg-secondary-container"
            }`}
          >
            {ext}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-on-surface">{cv.name}</p>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {cv.fileName} · {cv.fileSize ? formatBytes(cv.fileSize) : "—"}
              <span className="text-on-surface-variant/80">
                {" · "}
                <time
                  dateTime={cvCreatedInstant(cv.createdAt).toISOString()}
                  title={formatInTimeZone(cvCreatedInstant(cv.createdAt), APP_TIME_ZONE, "PPpp")}
                >
                  {formatInTimeZone(cvCreatedInstant(cv.createdAt), APP_TIME_ZONE, "MMM d, yyyy · h:mm a")}
                </time>
                <span className="text-on-surface-variant/60">
                  {" "}
                  ({formatDistanceToNow(cvCreatedInstant(cv.createdAt), { addSuffix: true })})
                </span>
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <a
            href={`/api/dashboard/cv/${cv.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
            title="Preview / Download"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {deleteError && (
        <p
          className="rounded-lg border border-error/40 bg-error-container/15 px-3 py-2 text-xs text-on-error-container"
          role="alert"
        >
          {deleteError}
        </p>
      )}

      {cv.description && !editing && (
        <div className="border-t border-outline-variant/50 pt-3">
          <p
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface-variant ${
              !expanded ? "line-clamp-3" : ""
            }`}
          >
            {cv.description}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary-container"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}

      {editing && (
        <EditForm
          cv={cv}
          onDone={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdate(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

// ── Main Manager ──────────────────────────────────────────────────────────────

export default function CVManager({ initialCVs }: { initialCVs: CvVersion[] }) {
  const [cvs, setCvs] = useState(initialCVs);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPipelineWarning, setUploadPipelineWarning] = useState<string | null>(null);

  function handleUploadDone(created: CvVersion, warning?: string) {
    setShowUpload(false);
    setUploadPipelineWarning(warning?.trim() || null);
    setCvs((prev) => [created, ...prev]);
  }

  const handleDelete = useCallback((id: string) => {
    setCvs((prev) => prev.filter((cv) => cv.id !== id));
  }, []);

  const handleUpdate = useCallback(
    (updated: Pick<CvVersion, "id" | "name" | "description">) => {
      setCvs((prev) =>
        prev.map((cv) =>
          cv.id === updated.id ? { ...cv, name: updated.name, description: updated.description } : cv
        )
      );
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-on-surface">My CV Versions</h2>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            {cvs.length === 0
              ? "No CVs uploaded yet."
              : `${cvs.length} version${cvs.length > 1 ? "s" : ""} stored`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setUploadPipelineWarning(null);
            setShowUpload((v) => !v);
          }}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            showUpload ? "laras-btn-secondary" : "laras-btn-primary"
          }`}
        >
          {showUpload ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showUpload ? "Close" : "Upload CV"}
        </button>
      </div>

      {uploadPipelineWarning && (
        <div className="flex gap-3 rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-200" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-100">CV saved — text / keywords incomplete</p>
            <p className="mt-1 text-sm text-amber-100/90">{uploadPipelineWarning}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadPipelineWarning(null)}
            className="flex-shrink-0 rounded-lg p-1 text-amber-200/80 hover:bg-amber-500/20 hover:text-amber-50"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showUpload && (
        <div className="laras-card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute left-0 top-0 h-px w-24 bg-gradient-to-r from-primary to-transparent opacity-80" />
          <h3 className="mb-5 flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-on-surface">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <FileText className="h-4 w-4 text-primary" />
            </span>
            New CV Version
          </h3>
          <UploadForm onDone={handleUploadDone} onCancel={() => setShowUpload(false)} />
        </div>
      )}

      {cvs.length === 0 && !showUpload ? (
        <div className="laras-card border-dashed border-outline-variant/60 py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-on-surface-variant/40" />
          <p className="text-sm text-on-surface-variant">Upload your first CV to get started.</p>
          <button type="button" onClick={() => setShowUpload(true)} className="laras-btn-primary mt-4 px-5 py-2 text-sm">
            Upload CV
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cvs.map((cv) => (
            <CVCard key={cv.id} cv={cv} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
