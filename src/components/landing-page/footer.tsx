import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative border-t border-outline-variant/30 bg-surface-container-lowest">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-container/55 to-transparent"
        aria-hidden
      />

      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-12 text-center md:px-10 lg:px-12">
        <div className="flex items-center justify-center gap-1">
          <Image
            src="/laras-logo.png"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 object-contain md:h-10 md:w-10"
          />
          <p className="font-display bg-gradient-to-r from-[#f6f8ff] via-[#c5e8ff] to-[#42ecff] bg-clip-text text-xl font-bold text-transparent">
            Laras AI
          </p>
        </div>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant">
          AI-native career intelligence—match roles, track outcomes, and apply
          with clarity.
        </p>
        <p className="mt-8 text-xs text-on-surface-variant">
          © {new Date().getFullYear()} Laras. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
