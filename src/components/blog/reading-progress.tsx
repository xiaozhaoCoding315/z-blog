"use client";

import { useEffect, useRef } from "react";

/**
 * 顶部阅读进度条：跟随滚动填充。
 */
export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const progress = total > 0 ? window.scrollY / total : 0;
      el.style.transform = `scaleX(${progress})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left scale-x-0 bg-gradient-to-r from-[oklch(0.62_0.23_285)] via-[oklch(0.7_0.17_250)] to-[oklch(0.75_0.15_215)]"
      ref={ref}
    />
  );
}
