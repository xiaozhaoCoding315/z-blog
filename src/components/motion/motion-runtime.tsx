"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 全站交互运行时：只做三件事，全部挂在属性上，服务端页面不必变成客户端组件。
 *
 *   1. [data-reveal]      元素进入视口时加 .is-in，做一次性入场
 *   2. [data-spotlight]   鼠标跟随光斑，写入 --spot-x / --spot-y
 *   3. [data-tilt]        轻量 3D 倾斜，写入 --tilt-x / --tilt-y
 *
 * 全部尊重 prefers-reduced-motion；触摸设备不开启指针光斑与倾斜。
 * 路由变化后重新扫描，但不重放已经入场的元素。
 */
export function MotionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    // 运行中改系统设置也要跟着变：不是刷新页面才生效。
    let reduce = motionQuery.matches;
    document.documentElement.classList.add("motion-ready");
    document.documentElement.classList.add("motion-booted");
    document.documentElement.classList.remove("motion-fallback");

    const revealTargets = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
    );

    // 锚点跳转、滚动恢复一瞬间跨过整屏时，IntersectionObserver 只看到
    // 0 → 0，不会补发通知；已经在视口上方的元素会永远停在透明里。
    // 这条 rAF 兜底按「元素顶部已进入视口」直接补 is-in。
    let revealFrame = 0;
    const revealPassed = () => {
      revealFrame = 0;
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)")
        .forEach((element) => {
          if (element.getBoundingClientRect().top >= window.innerHeight * 0.94) return;
          element.classList.add("is-in");
          observer.unobserve(element);
        });
    };
    const queueReveal = () => {
      if (!revealFrame) revealFrame = requestAnimationFrame(revealPassed);
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        if (revealTargets.has(element) || element.classList.contains("is-in")) return;
        revealTargets.add(element);
        if (reduce) element.classList.add("is-in");
        else observer.observe(element);
      });
      // 首扫同步补一遍，标签页在后台时 rAF 不触发也不至于留一屏透明内容
      revealPassed();
    };

    // 等 React 把整页水合完再改 className：否则并发水合会把手动加的
    // is-in 当成「服务端与客户端不一致」，开发环境里刷一屏警告。
    let mutation: MutationObserver | null = null;
    const startTimer = window.setTimeout(() => {
      scan();
      mutation = new MutationObserver(scan);
      mutation.observe(document.body, { childList: true, subtree: true });
    }, 80);
    window.addEventListener("scroll", queueReveal, { passive: true });
    window.addEventListener("resize", queueReveal);
    const onVisible = () => {
      if (!document.hidden) revealPassed();
    };
    document.addEventListener("visibilitychange", onVisible);

    let active: HTMLElement | null = null;
    let frame = 0;
    let lastX = 0;
    let lastY = 0;

    const paint = () => {
      frame = 0;
      if (!active) return;
      const rect = active.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = lastX - rect.left;
      const y = lastY - rect.top;
      active.style.setProperty("--spot-x", `${x}px`);
      active.style.setProperty("--spot-y", `${y}px`);
      if (active.hasAttribute("data-tilt")) {
        const nx = Math.max(-1, Math.min(1, (x / rect.width) * 2 - 1));
        const ny = Math.max(-1, Math.min(1, (y / rect.height) * 2 - 1));
        active.style.setProperty("--tilt-x", `${(-ny * 2.4).toFixed(2)}deg`);
        active.style.setProperty("--tilt-y", `${(nx * 2.8).toFixed(2)}deg`);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (reduce || event.pointerType !== "mouse") return;
      const target = (event.target as Element | null)?.closest?.(
        "[data-spotlight], [data-tilt]"
      ) as HTMLElement | null;
      if (!target) {
        if (active) {
          active.style.removeProperty("--tilt-x");
          active.style.removeProperty("--tilt-y");
          active = null;
        }
        return;
      }
      active = target;
      lastX = event.clientX;
      lastY = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const reset = () => {
      if (!active) return;
      active.style.removeProperty("--tilt-x");
      active.style.removeProperty("--tilt-y");
      active = null;
    };

    // 系统在「减少动效」与「正常」之间切换时：新出现的元素直接给终态，
    // 已经入场的元素撤掉指针光斑残留，不让旧状态卡在页面上。
    const onMotionChange = (event: MediaQueryListEvent) => {
      reduce = event.matches;
      if (reduce) {
        reset();
        document
          .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)")
          .forEach((element) => {
            element.classList.add("is-in");
            observer.unobserve(element);
          });
      } else {
        scan();
      }
    };
    motionQuery.addEventListener("change", onMotionChange);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", reset);

    return () => {
      observer.disconnect();
      window.clearTimeout(startTimer);
      motionQuery.removeEventListener("change", onMotionChange);
      mutation?.disconnect();
      window.removeEventListener("scroll", queueReveal);
      window.removeEventListener("resize", queueReveal);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", reset);
      if (revealFrame) cancelAnimationFrame(revealFrame);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}