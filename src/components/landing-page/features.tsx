import BulbIcon from "@/components/icons/bulb-icon";
import ChartIcon from "@/components/icons/chart-icon";
import DocumentEditIcon from "@/components/icons/document-edit-icon";
import TargetIcon from "@/components/icons/target-icon";

const FEATURES = [
  {
    title: "AI Job Match",
    description:
      "Matches relevant applications to your CV instantly, scoring compatibility based on deep industry data.",
    icon: TargetIcon,
    tone: "accent" as const,
  },
  {
    title: "Track & Analyze",
    description:
      "Manage daily/monthly targets with visual analytics. Understand your funnel from application to interview.",
    icon: ChartIcon,
    tone: "muted" as const,
  },
  {
    title: "Strategic Advice",
    description:
      "Data-driven insights to optimize your application strategy, interview prep, and salary negotiation.",
    icon: BulbIcon,
    tone: "muted" as const,
  },
  {
    title: "Cover Letter Generator",
    description:
      "Automated, highly tailored cover letters for every role, ensuring you always put your best foot forward.",
    icon: DocumentEditIcon,
    tone: "accent" as const,
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="laras-features-section scroll-mt-24 border-t border-outline-variant/25 md:scroll-mt-28"
      aria-labelledby="features-heading"
    >
      <div className="laras-features-blob-a" aria-hidden />
      <div className="laras-features-blob-b" aria-hidden />
      <div className="laras-features-shine" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 lg:px-12">
        <header className="mx-auto max-w-3xl text-center">
          <h2
            id="features-heading"
            className="font-display text-3xl font-bold tracking-tight text-on-surface md:text-4xl"
          >
            The Command Center for Your Career
          </h2>
          <p className="mt-4 text-base leading-relaxed text-on-surface-variant md:text-lg">
            Leverage advanced AI to streamline your workflow, target the right
            roles, and position yourself as the optimal candidate.
          </p>
        </header>

        <ul className="mt-14 grid list-none gap-6 p-0 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-5">
          {FEATURES.map((item, index) => {
            const Icon = item.icon;
            const iconWrap =
              item.tone === "accent"
                ? "bg-gradient-to-br from-primary-container/35 via-[#0068ed]/20 to-surface-container-low text-primary shadow-[0_0_24px_-6px_rgba(0,229,255,0.45)] ring-1 ring-primary-container/40"
                : "bg-surface-container-high text-on-surface ring-1 ring-outline-variant/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

            return (
              <li key={item.title} className="laras-animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <article
                  className="laras-scan-hover group relative flex h-full flex-col rounded-2xl border border-outline-variant/60 bg-gradient-to-b from-surface-container-low/95 to-surface-container/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-primary-container/40 hover:shadow-[0_0_48px_-12px_rgba(0,229,255,0.22),inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "linear-gradient(145deg, rgba(0,229,255,0.08) 0%, transparent 42%, rgba(0,104,237,0.06) 100%)",
                    }}
                    aria-hidden
                  />

                  <div
                    className={`relative flex h-11 w-11 items-center justify-center rounded-lg ${iconWrap}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="relative mt-5 font-display text-lg font-bold text-on-surface">
                    {item.title}
                  </h3>
                  <p className="relative mt-2 flex-1 text-sm leading-relaxed text-on-surface-variant">
                    {item.description}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
