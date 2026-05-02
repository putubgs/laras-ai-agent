"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Loader2,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { generateCoverLetter } from "@/lib/actions/gemini";
import { downloadCoverLetterDocx } from "@/lib/docx";

type Props = {
  candidateName: string;
  /** Short professional summary (optional). */
  candidateSummary: string | null;
  /** CV-derived context from the server (optional). Selected CV context is loaded in the generate action. */
  cvContext: string | null;
  /** Same `cvId` as Status & Source → CV Used. */
  cvId: string;
  /** User has at least one CV to choose from (Status & Source). */
  hasCvOptions: boolean;
  company: string;
  position: string;
  jobDescription: string;
  companyNotes: string;
  coverLetter: string;
  onCoverLetterChange: (v: string) => void;
};

export default function CoverLetterSection({
  candidateName,
  candidateSummary,
  cvContext,
  cvId,
  hasCvOptions,
  company,
  position,
  jobDescription,
  companyNotes,
  coverLetter,
  onCoverLetterChange,
}: Props) {
  const [isGenerating, startGenTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ctxExpanded, setCtxExpanded] = useState(true);

  const contextBlock = [candidateSummary?.trim(), cvContext?.trim()].filter(Boolean).join("\n\n");
  const cvSelected = Boolean(cvId.trim());

  const canGenerate =
    Boolean(candidateName.trim()) &&
    Boolean(company.trim()) &&
    Boolean(position.trim()) &&
    Boolean(jobDescription.trim()) &&
    (hasCvOptions ? cvSelected : contextBlock.length > 0);

  const handleGenerate = () => {
    setError(null);
    setSuccess(false);
    startGenTransition(async () => {
      const result = await generateCoverLetter({
        company,
        position,
        jobDescription,
        candidateName: candidateName.trim(),
        candidateContext: contextBlock,
        cvId: cvSelected ? cvId.trim() : undefined,
        companyNotes: companyNotes.trim() || undefined,
      });
      if (result.success && result.text) {
        onCoverLetterChange(result.text);
        setSuccess(true);
      } else {
        setError(result.error ?? "Generation failed.");
      }
    });
  };

  const handleDownload = async () => {
    if (!coverLetter.trim()) return;
    setIsDownloading(true);
    setError(null);
    try {
      await downloadCoverLetterDocx({
        coverLetter,
        candidateName: candidateName.trim() || "Candidate",
        company,
        position,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="laras-card space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-on-surface">Cover Letter</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Select your CV under Status &amp; Source, then generate from your name, CV context, and the job
            description.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate || isGenerating}
            className="inline-flex items-center gap-2 rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_0_20px_-4px_rgba(44,233,255,0.35)] transition hover:brightness-110 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!coverLetter.trim() || isDownloading}
            className="laras-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Download .docx
          </button>
        </div>
      </div>

      {hasCvOptions && !cvSelected ? (
        <div className="flex gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Select your CV to help laras generate a cover letter for you.</p>
        </div>
      ) : null}

      {contextBlock ? (
        <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low/40">
          <button
            type="button"
            onClick={() => setCtxExpanded((e) => !e)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-on-surface"
          >
            <span className="laras-label-caps text-[11px] text-on-surface">Context sent to the model</span>
            {ctxExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {ctxExpanded ? (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap border-t border-outline-variant/40 px-4 py-3 text-xs text-on-surface-variant">
              {contextBlock}
            </pre>
          ) : null}
        </div>
      ) : cvSelected ? (
        <p className="text-xs text-on-surface-variant">
          CV keywords and excerpt are loaded from your selected CV when you generate (not shown here).
        </p>
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <textarea
        value={coverLetter}
        onChange={(e) => onCoverLetterChange(e.target.value)}
        rows={14}
        placeholder="Your cover letter…"
        className="laras-field-lg resize-y font-mono leading-relaxed"
      />
    </div>
  );
}
