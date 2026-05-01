"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  className?: string;
  children: ReactNode;
};

export default function FeaturesNavLink({ className, children }: Props) {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return;

    e.preventDefault();
    const el = document.getElementById("features");
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    el.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <Link
      href="/#features"
      className={className}
      scroll={false}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
