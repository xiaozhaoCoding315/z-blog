"use client";

import { useEffect, useState } from "react";

/**
 * 打字机轮播：逐字打出 → 停顿 → 逐字删除 → 换下一个词。
 */
export function TypeRotate({
  words,
  className,
}: {
  words: string[];
  className?: string;
}) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">(
    "typing"
  );

  useEffect(() => {
    const word = words[wordIndex % words.length];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (text.length < word.length) {
        timer = setTimeout(() => setText(word.slice(0, text.length + 1)), 110);
      } else {
        timer = setTimeout(() => setPhase("pausing"), 1800);
      }
    } else if (phase === "pausing") {
      timer = setTimeout(() => setPhase("deleting"), 1200);
    } else {
      if (text.length > 0) {
        timer = setTimeout(() => setText(word.slice(0, text.length - 1)), 45);
      } else {
        setWordIndex((i) => (i + 1) % words.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(timer);
  }, [text, phase, wordIndex, words]);

  return (
    <span className={className}>
      <span className="text-gradient font-semibold">{text}</span>
      <span
        className="caret-blink ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] bg-primary"
        aria-hidden
      />
    </span>
  );
}
