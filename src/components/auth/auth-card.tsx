"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low/90 p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-on-surface"
          >
            Laras AI
          </Link>
          <h1 className="mt-4 font-display text-2xl font-bold text-on-surface">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-on-surface-variant">{subtitle}</p>
          ) : null}
        </div>
        {children}
        {footer ? (
          <div className="mt-8 border-t border-outline-variant/40 pt-6 text-center text-sm text-on-surface-variant">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
