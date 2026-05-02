"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.7 10.7a3 3 0 0 0 4.2 4.2" />
      <path d="M6.4 6.4C3.8 8 2 12 2 12s3.5 7 10 7c2.2 0 4.1-.6 5.6-1.4" />
      <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a18.8 18.8 0 0 1-2.8 4.4" />
      <path d="M14.1 14.1 17 17" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

export function AuthField({
  id,
  label,
  error,
  passwordToggle,
  className,
  ...props
}: {
  id: string;
  label: string;
  error?: string | null;
  /** When `type="password"`, show a show/hide control (default: true). Set `false` to disable. */
  passwordToggle?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  const { type = "text", ...inputProps } = props;
  const showToggle = type === "password" && passwordToggle !== false;
  const [visible, setVisible] = useState(false);
  const inputType = showToggle && visible ? "text" : type;

  const inputClassName = [
    "w-full rounded-lg border border-outline-variant/60 bg-surface-container/80 py-2.5 text-sm text-on-surface outline-none ring-primary-container/30 placeholder:text-on-surface-variant/50 focus:border-primary-container/50 focus:ring-2",
    showToggle ? "pl-3 pr-10" : "px-3",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const controlId = id;
  const toggleId = `${id}-password-toggle`;

  const inputEl = (
    <input
      id={controlId}
      type={inputType}
      className={inputClassName}
      {...inputProps}
    />
  );

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={controlId}
        className="block text-sm font-medium text-on-surface-variant"
      >
        {label}
      </label>
      {showToggle ? (
        <div className="relative">
          {inputEl}
          <button
            id={toggleId}
            type="button"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/40"
            aria-controls={controlId}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? (
              <EyeOffIcon className="h-4 w-4 shrink-0" />
            ) : (
              <EyeIcon className="h-4 w-4 shrink-0" />
            )}
          </button>
        </div>
      ) : (
        inputEl
      )}
      {error ? (
        <p className="text-xs font-medium text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
