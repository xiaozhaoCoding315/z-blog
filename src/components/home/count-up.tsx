"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";

/**
 * 数字滚动。
 *
 * 两个约束决定了这里的实现方式：
 * 1. 静态 HTML 必须直接是最终数字——首页统计是给人和爬虫看的信息，
 *    不能先渲染成 0 再等水合补上，否则禁用 JS 的用户看到一片 0。
 * 2. 首屏就已可见的数字不需要动画：它没有「进入视口」这个动作，
 *    强行从 0 滚上来只会闪一下。
 *
 * 因此只有「挂载一段时间后才滚动进入视口」的数字才播动画，
 * 且直接写 DOM 文本而不是 setState（避免每次动画帧触发一次渲染）。
 */
export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const mountedAt = useRef(0);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;

    // 首屏可见（挂载后立刻判定为可见）不播动画
    if (performance.now() - mountedAt.current < 400) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const controls = animate(0, to, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => {
        el.textContent = String(Math.round(value));
      },
      onComplete: () => {
        el.textContent = String(to);
      },
    });
    return () => controls.stop();
  }, [inView, to]);

  return <span ref={ref}>{to}</span>;
}
