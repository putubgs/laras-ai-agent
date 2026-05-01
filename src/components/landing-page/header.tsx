import Image from "next/image";
import Link from "next/link";
import FeaturesNavLink from "@/components/landing-page/features-nav-link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-primary/12 bg-surface-container-lowest/80 shadow-[0_1px_0_rgba(58,232,251,0.06),0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-container/55 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3.5 md:px-10 md:py-4 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-1 rounded-xl py-1 outline-none transition focus-visible:ring-2 focus-visible:ring-surface-tint/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

        <nav
          className="flex shrink-0 items-center gap-0.5 sm:gap-1"
          aria-label="Primary navigation"
        >
          <FeaturesNavLink className="rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high/75 hover:text-primary md:px-3.5">
            Features
          </FeaturesNavLink>
          <button
            type="button"
            className="ml-2 inline-flex items-center justify-center rounded-full bg-primary-container px-5 py-2.5 text-xs font-semibold text-on-primary shadow-[0_0_28px_-4px_rgba(44,233,255,0.45)] transition hover:brightness-110 hover:shadow-[0_0_40px_-2px_rgba(44,233,255,0.55)] md:ml-3 md:px-6 md:text-sm"
          >
            Sign in
          </button>
        </nav>
      </div>
    </header>
  );
}
