"use client";

import { useEffect, useRef } from "react";
import { useScrollRoot } from "@/components/desktop/app-frame";

/**
 * 顶部阅读进度条：跟随真正的滚动容器填充。
 * 桌面端是 AppFrame 的内部容器，移动端是 window。
 */
export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const scrollRoot = useScrollRoot();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const node = scrollRoot?.current ?? null;

    const update = () => {
      const total = node
        ? node.scrollHeight - node.clientHeight
        : document.documentElement.scrollHeight -
          document.documentElement.clientHeight;
      const top = node ? node.scrollTop : window.scrollY;
      const progress =
        total > 0 ? Math.min(1, Math.max(0, top / total)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };

    update();
    const target: EventTarget = node ?? window;
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      target.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollRoot]);

  return <div ref={barRef} aria-hidden="true" className="os-reading-progress" />;
}
