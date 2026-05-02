"use client";

import { useEffect, useMemo, useState } from "react";
import { stripAdviceFormatting } from "@/lib/advice-format";

const CHAR_MS = 19;

type Props = {
  text: string;
};

/**
 * Reveals Laras advice character-by-character; plain normal weight, warm copy (no markdown).
 */
export function LarasTypingAdvice({ text }: Props) {
  const full = useMemo(() => stripAdviceFormatting(text), [text]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!full) return;

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= full.length) {
        setCount(full.length);
        window.clearInterval(id);
        return;
      }
      setCount(i);
    }, CHAR_MS);

    return () => window.clearInterval(id);
  }, [full]);

  const shown = full.slice(0, count);
  const typing = count < full.length;

  return (
    <div className="mt-3 min-h-[4.5rem]">
      <p className="text-[15px] font-normal leading-relaxed tracking-[0.01em] text-on-surface whitespace-pre-wrap">
        {shown}
        {typing ? (
          <span
            className="ml-0.5 inline-block h-[1.05em] w-px translate-y-0.5 bg-primary/70 animate-pulse align-baseline"
            aria-hidden
          />
        ) : null}
      </p>
    </div>
  );
}
