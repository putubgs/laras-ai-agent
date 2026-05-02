"use client";

import Image from "next/image";
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
    <div className="w-full rounded-2xl border border-outline-variant/50 bg-surface-container-low/90 p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1 rounded-xl py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-surface-tint/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
        >
          <Image
            src="/laras-logo.png"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 object-contain md:h-10 md:w-10"
            priority
          />
          <span className="font-display bg-gradient-to-r from-[#f6f8ff] via-[#c5e8ff] to-[#42ecff] bg-clip-text text-xl font-bold tracking-tight text-transparent md:text-2xl">
            Laras AI
          </span>
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
  );
}
