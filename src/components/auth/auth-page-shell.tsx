import type { ReactNode } from "react";

/**
 * Full-viewport auth layout: hero-style grid, radial glow, AI scan beam,
 * and content centered horizontally and vertically.
 */
export default function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f3a5f1a_3px,transparent_3px),linear-gradient(to_bottom,#1f3a5f1a_3px,transparent_3px)] bg-[size:40px_40px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#07223F_0%,transparent_70%)] mix-blend-lighten opacity-60" />
      <div className="laras-hero-scan" aria-hidden>
        <div className="laras-hero-scan-beam" />
      </div>
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
