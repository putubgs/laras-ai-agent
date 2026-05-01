"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, startTransition } from "react";

const LARAS_QUOTES = [
  "Hello, I'm Laras.",
  "We can do this—together.",
  "Your search just got smarter.",
  "Let's find roles that fit you.",
  "Apply with clarity, not noise.",
  "Ready when you are.",
  "Turn your CV into a strategy.",
  "Small moves, big outcomes.",
  "Let's land your next chapter.",
  "Track progress like a pro.",
] as const;

const TYPE_INTERVAL_MS = 36;
/** Match chip + quote transition duration before clearing text on close */
const PANEL_CLOSE_MS = 480;

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    startTransition(() => setReduce(mq.matches));
    const onChange = () => startTransition(() => setReduce(mq.matches));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduce;
}

/**
 * True only when the UA says the primary input can hover with a fine pointer.
 * Touch phones/tablets are `(hover: none)` or `(pointer: coarse)` — avoids phantom
 * `mouseenter` opening the quote strip with no typing.
 */
function useSupportsPointerHover() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setSupported(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return supported;
}

export default function HeroProfileCard() {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const pointerHover = useSupportsPointerHover();
  const reduceMotion = usePrefersReducedMotion();

  /** Touch / no-hover UAs: only `pinned`. Desktop hover: `hover` or `pinned`. Before mount: `pinned` only. */
  const active = pinned || (pointerHover === true && hover);

  const [displayText, setDisplayText] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ignore synthetic `click` shortly after touch/pen `pointerup` (same gesture) */
  const lastNonMousePointerToggleAt = useRef(0);

  useEffect(() => {
    if (pointerHover !== true) {
      startTransition(() => setHover(false));
    }
  }, [pointerHover]);

  const stopTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Close: stop typing immediately; clear text after panel collapse animation
  useEffect(() => {
    if (active) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      return;
    }

    stopTyping();
    const delay = reduceMotion ? 0 : PANEL_CLOSE_MS;
    closeTimerRef.current = setTimeout(() => {
      setDisplayText("");
      closeTimerRef.current = null;
    }, delay);

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [active, reduceMotion, stopTyping]);

  // Open: type quote (or show instantly when reduced motion)
  useEffect(() => {
    if (!active) return;

    const full =
      LARAS_QUOTES[Math.floor(Math.random() * LARAS_QUOTES.length)] ?? "";

    if (reduceMotion) {
      startTransition(() => setDisplayText(full));
      return;
    }

    let i = 0;
    startTransition(() => setDisplayText(""));

    intervalRef.current = setInterval(() => {
      i += 1;
      setDisplayText(full.slice(0, i));
      if (i >= full.length && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, TYPE_INTERVAL_MS);

    return () => {
      stopTyping();
    };
  }, [active, reduceMotion, stopTyping]);

  function togglePinned() {
    setPinned((p) => !p);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !e.isPrimary) return;
    // Mouse: use `click` only; touch/pen: `pointerup` (click can double-toggle)
    if (e.pointerType === "mouse") return;
    lastNonMousePointerToggleAt.current =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    togglePinned();
  }

  function handleClick() {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastNonMousePointerToggleAt.current < 700) return;
    togglePinned();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      togglePinned();
    }
  }

  const panelEase =
    "ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:duration-0";
  const panelDuration = reduceMotion ? "duration-0" : "duration-[480ms]";

  return (
    <div
      className="relative w-[min(100%,17.5rem)] sm:w-[19.5rem] md:w-[21rem] lg:w-[22rem]"
      style={{ perspective: "1200px" }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-pressed={pinned}
        aria-label="Laras profile — hover or activate to hear a message"
        className={`relative cursor-pointer overflow-hidden rounded-[1.75rem] border border-primary/25 bg-gradient-to-b from-surface-container-high via-surface-container-low to-surface-container-lowest shadow-[0_0_0_1px_rgba(58,232,251,0.12),0_28px_56px_-14px_rgba(0,0,0,0.65),0_0_90px_-24px_rgba(44,233,255,0.2)] transition-transform duration-300 ease-out [-webkit-tap-highlight-color:transparent] touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-primary-container/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          active ? "rotate-0" : "rotate-[3deg]"
        }`}
        onMouseEnter={() => {
          if (pointerHover === true) setHover(true);
        }}
        onMouseLeave={() => {
          if (pointerHover === true) setHover(false);
        }}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="relative aspect-[3/4] w-full">
          <Image
            src="/laras.png"
            alt="Laras — AI career partner"
            fill
            className="object-cover object-[center_15%]"
            sizes="(max-width: 1024px) 90vw, 22rem"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050a14]/88 via-transparent to-[#0a1628]/35" />
        </div>

        {/* Mobile closed: avoid `inset-x` — full-width bar looked like an empty quote strip */}
        <div
          className={`pointer-events-none absolute bottom-4 left-4 sm:right-auto ${
            active
              ? "right-4 w-auto min-w-0 max-w-full"
              : "right-auto w-max max-w-[calc(100%-2rem)]"
          }`}
        >
          <div
            className={`max-w-full items-center rounded-xl border border-outline-variant/40 bg-surface-container/65 py-2 shadow-lg backdrop-blur-xl ${panelDuration} ${panelEase} transition-[gap,padding-left,padding-right] ${
              active
                ? "flex w-full min-w-0 gap-3 px-3 sm:w-auto sm:pr-4"
                : "inline-flex gap-0 px-2"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-surface-container-low/90 ${panelDuration} ${panelEase} transition-[box-shadow,border-color] ${
                active
                  ? "border-sky-500/75 shadow-[0_0_16px_-2px_rgba(56,189,248,0.55),0_0_28px_-6px_rgba(14,165,233,0.35)]"
                  : "border-current text-on-surface-variant shadow-none"
              }`}
            >
              <Image
                src="/laras-logo.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </div>
            <p
              className={`min-w-0 overflow-hidden text-left text-sm font-medium leading-snug text-on-surface truncate will-change-[max-width,opacity] ${panelDuration} ${panelEase} motion-reduce:will-change-auto ${
                active
                  ? "max-w-[min(18rem,calc(100vw-6rem))] translate-x-0 opacity-100"
                  : "max-w-0 -translate-x-1.5 opacity-0"
              }`}
              aria-live="polite"
            >
              {displayText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
