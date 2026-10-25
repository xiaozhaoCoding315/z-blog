"use client";

import { useEffect, useRef } from "react";

/**
 * Hero 星空粒子背景：canvas 自绘（零依赖），星星缓慢漂移 + 呼吸闪烁，
 * 带少量流星；随鼠标轻微视差。requestAnimationFrame 驱动，页面隐藏时自动暂停。
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let mouseX = 0.5;
    let mouseY = 0.5;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    interface Star {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      twinkle: number;
      phase: number;
      hue: number;
    }
    interface Meteor {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
    }

    let stars: Star[] = [];
    const meteors: Meteor[] = [];

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(160, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.05,
        twinkle: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.25 ? 265 : Math.random() < 0.5 ? 200 : 0,
      }));
    }

    function spawnMeteor() {
      meteors.push({
        x: Math.random() * w * 0.7 + w * 0.3,
        y: -10,
        vx: -(2.2 + Math.random() * 2),
        vy: 1.6 + Math.random() * 1.2,
        life: 1,
      });
    }

    let last = performance.now();
    let meteorTimer = 0;

    function frame(now: number) {
      const dt = Math.min((now - last) / 16.7, 3);
      last = now;
      meteorTimer -= dt;
      if (meteorTimer <= 0) {
        if (Math.random() < 0.5) spawnMeteor();
        meteorTimer = 180 + Math.random() * 240;
      }

      ctx!.clearRect(0, 0, w, h);
      const px = (mouseX - 0.5) * 14;
      const py = (mouseY - 0.5) * 10;

      for (const star of stars) {
        star.x += star.vx * dt;
        star.y += star.vy * dt;
        star.phase += 0.02 * star.twinkle * dt;
        if (star.x < 0) star.x += w;
        if (star.x > w) star.x -= w;
        if (star.y < 0) star.y += h;
        if (star.y > h) star.y -= h;

        const alpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(star.phase));
        const color =
          star.hue === 0
            ? `rgba(235,235,245,${alpha})`
            : `hsla(${star.hue}, 90%, 80%, ${alpha})`;

        ctx!.beginPath();
        ctx!.fillStyle = color;
        ctx!.arc(star.x + px * star.r, star.y + py * star.r, star.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= 0.008 * dt;
        if (m.life <= 0 || m.x < -80 || m.y > h + 40) {
          meteors.splice(i, 1);
          continue;
        }
        const grad = ctx!.createLinearGradient(
          m.x,
          m.y,
          m.x - m.vx * 22,
          m.y - m.vy * 22
        );
        grad.addColorStop(0, `rgba(180,170,255,${0.9 * m.life})`);
        grad.addColorStop(1, "rgba(180,170,255,0)");
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.4;
        ctx!.beginPath();
        ctx!.moveTo(m.x, m.y);
        ctx!.lineTo(m.x - m.vx * 22, m.y - m.vy * 22);
        ctx!.stroke();
      }

      raf = requestAnimationFrame(frame);
    }

    function onMouse(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = (e.clientY - rect.top) / rect.height;
    }

    resize();
    raf = requestAnimationFrame(frame);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener("mousemove", onMouse);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
