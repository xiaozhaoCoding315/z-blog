"use client";

import { useEffect, useRef } from "react";

/**
 * 壁纸上的光斑只跟鼠标，不自己跑。
 * 指针停下来后动画就停，静止页面不烧 CPU。
 */
export function Wallpaper() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const light = lightRef.current;
    if (!root || !light) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    let x = window.innerWidth * 0.72;
    let y = window.innerHeight * 0.28;
    let targetX = x;
    let targetY = y;
    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      x += (targetX - x) * Math.min(1, dt / 160);
      y += (targetY - y) * Math.min(1, dt / 160);
      light.style.setProperty("--light-x", `${x.toFixed(1)}px`);
      light.style.setProperty("--light-y", `${y.toFixed(1)}px`);
      const dx = (x / window.innerWidth - 0.5) * 4;
      const dy = (y / window.innerHeight - 0.5) * 4;
      root.style.setProperty("--parallax-x", `${dx.toFixed(2)}px`);
      root.style.setProperty("--parallax-y", `${dy.toFixed(2)}px`);
      const settled = Math.abs(targetX - x) < 0.5 && Math.abs(targetY - y) < 0.5;
      frame = settled ? 0 : requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="os-wallpaper" aria-hidden="true">
      <div className="os-wallpaper-grid" />
      <div className="os-wallpaper-glow" />
      <div ref={lightRef} className="os-pointer-light" />
      <div className="os-wallpaper-noise" />
    </div>
  );
}
