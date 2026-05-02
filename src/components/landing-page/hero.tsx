import Link from "next/link";
import LightningIcon from "@/components/icons/lightning-icon";
import ArrowRightIcon from "@/components/icons/arrow-right-icon";
import PlayCircleIcon from "@/components/icons/play-circle-icon";
import HeroProfileCard from "@/components/landing-page/hero-profile-card";

const DEMO_VIDEO_URL =
  "https://drive.google.com/drive/folders/14lUMlh_6tCqh9J_6cNbCS4qnuUiDanYo?usp=sharing";

const AVATAR_INITIALS = ["JD", "MK", "AS"] as const;

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-background">
      {/* GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f3a5f1a_3px,transparent_3px),linear-gradient(to_bottom,#1f3a5f1a_3px,transparent_3px)] bg-[size:40px_40px]" />

      {/* RADIAL GRADIENT (center glow) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#07223F_0%,transparent_70%)] mix-blend-lighten opacity-60" />

      {/* AI scan — slow vertical light pass (subtle) */}
      <div className="laras-hero-scan" aria-hidden>
        <div className="laras-hero-scan-beam" />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-16 md:px-10 lg:flex-row lg:items-center lg:gap-16 lg:px-12 lg:py-12">
        {/* LEFT — copy & CTAs */}
        <div className="flex max-w-xl flex-1 flex-col lg:max-w-none lg:pr-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-surface-container-low/85 px-4 py-2 backdrop-blur-sm">
            <LightningIcon className="h-3.5 w-3.5 shrink-0 text-primary-container" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              Next-gen career intelligence
            </p>
          </div>

          <h1 className="font-display mt-8 text-[2rem] font-bold leading-[1.12] tracking-tight text-[#D9E2FF] sm:text-[2.35rem] md:text-[2.75rem] lg:text-[3rem] xl:text-[3.25rem]">
            Meet{" "}
            <span className="bg-gradient-to-r from-[#A5F3FC] to-[#22D3EE] bg-clip-text text-transparent">
              Laras
            </span>
            : <br /> Your Assistant in the Modern Job Search
          </h1>

          <p className="mt-6 max-w-[34rem] text-base leading-relaxed text-on-surface-variant md:text-lg">
            Search relevant jobs, track your progress, and get strategic advice
            to land your next role. Stop applying into the void. Start applying
            with intelligence.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-primary-container px-7 py-3.5 text-sm font-semibold text-on-primary shadow-[0_0_28px_-4px_rgba(44,233,255,0.45)] transition hover:brightness-110 hover:shadow-[0_0_40px_-2px_rgba(44,233,255,0.55)]"
            >
              Get Started
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant/55 bg-surface-container-high/45 px-6 py-3.5 text-sm font-medium text-on-surface backdrop-blur-md transition hover:border-primary/35 hover:bg-surface-container-highest/55 hover:text-primary"
            >
              <PlayCircleIcon className="h-5 w-5 text-on-surface-variant" />
              Watch Demo
            </a>
          </div>

          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              {AVATAR_INITIALS.map((initials) => (
                <div
                  key={initials}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-surface-container-highest text-[11px] font-semibold tracking-wide text-on-surface-variant"
                >
                  {initials}
                </div>
              ))}
            </div>
            <p className="text-sm text-on-surface-variant md:text-base">
              <span className="bg-gradient-to-r from-[#A5F3FC] to-[#22D3EE] bg-clip-text text-transparent">
                10,000+
              </span>{" "}
              professionals hired.
            </p>
          </div>
        </div>

        {/* RIGHT — profile card */}
        <div className="mt-14 flex flex-1 justify-center lg:mt-0 lg:justify-end">
          <HeroProfileCard />
        </div>
      </div>
    </section>
  );
}
