"use client";

import type { InputHTMLAttributes } from "react";

export function AuthField({
  id,
  label,
  error,
  ...props
}: {
  id: string;
  label: string;
  error?: string | null;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-on-surface-variant"
      >
        {label}
      </label>
      <input
        id={id}
        className="w-full rounded-lg border border-outline-variant/60 bg-surface-container/80 px-3 py-2.5 text-sm text-on-surface outline-none ring-primary-container/30 placeholder:text-on-surface-variant/50 focus:border-primary-container/50 focus:ring-2"
        {...props}
      />
      {error ? (
        <p className="text-xs font-medium text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
