"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * 页面氛围层。
 *
 * 与音乐律动刻意区分：这里不读音频时钟、没有钢琴、没有节拍，
 * 只用「页面自己的时间 / 滚动 / 指针」画各入口独有的静态气质：
 *   笔记、日志、写作 —— 墨迹与纸尘
 *   项目             —— 蓝图网格与节点脉冲
 *   画廊             —— 胶片漏光与光斑
 *   留言             —— 暖色纸屑与印章涟漪
 *   生活             —— 叶片与风
 *   其余阅读页        —— 极轻的尘埃与弧线
 *
 * 音乐页(/playlist)有自己的琴弦，助手页(/assistant)有自己的控制台，
 * 终端也有独立界面，这里主动让位，不叠加第二套动效。
 */

export type AmbientVariant =
  | "ink"
  | "blueprint"
  | "film"
  | "letters"
  | "life"
  | "quiet";

const ROUTES: Array<[string, AmbientVariant]> = [
  ["/notes", "ink"],
  ["/journal", "ink"],
  ["/write", "ink"],
  ["/projects", "blueprint"],
  ["/gallery", "film"],
  ["/letters", "letters"],
  ["/life", "life"],
];

export function ambientVariantFor(pathname: string): AmbientVariant | null {
  if (pathname === "/") return null;
  if (
    pathname === "/assistant" ||
    pathname.startsWith("/assistant/") ||
    pathname === "/playlist" ||
    pathname.startsWith("/playlist/") ||
    pathname === "/terminal" ||
    pathname.startsWith("/terminal/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/")
  ) {
    return null;
  }
  for (const [prefix, variant] of ROUTES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return variant;
  }
  return "quiet";
}

const TAU = Math.PI * 2;

function hash(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function PageAmbient() {
  const pathname = usePathname() ?? "/";
  const variant = ambientVariantFor(pathname);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!variant) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const glow = (
      x: number,
      y: number,
      radius: number,
      color: [number, number, number],
      alpha: number
    ) => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`);
      gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, TAU);
      context.fill();
    };

    const drawInk = (time: number, scroll: number) => {
      const teal: [number, number, number] = [28, 92, 82];
      const side = width > 900 ? Math.min(420, width * 0.28) : 0;
      glow(side * 0.35, height * 0.16, 330, teal, 0.1);
      glow(width - side * 0.3, height * 0.78, 380, teal, 0.09);

      context.strokeStyle = "rgba(28,92,82,0.16)";
      context.lineWidth = 1;
      const lineX = width * 0.045 + Math.sin(time * 0.12) * 3;
      context.beginPath();
      context.moveTo(lineX, 0);
      context.lineTo(lineX, height);
      context.stroke();
      const beadY = ((scroll * 0.06 + time * 9) % (height + 80)) - 40;
      glow(lineX, beadY, 14, teal, 0.3);

      const sig = variant === "ink" ? 1 : 2;
      for (let index = 0; index < 30; index += 1) {
        const seed = index + sig * 100;
        const x = (hash(seed) < 0.5 ? hash(seed + 1) * 0.2 : 0.8 + hash(seed + 1) * 0.2) * width;
        const drift = Math.sin(time * (0.08 + hash(seed + 2) * 0.1) + seed) * 14;
        const y = (hash(seed + 3) * height + time * (3 + hash(seed + 4) * 5) + scroll * 0.02) % (height + 60) - 30;
        const length = 5 + hash(seed + 5) * 18;
        context.strokeStyle = `rgba(36,110,98,${0.12 + hash(seed + 6) * 0.15})`;
        context.lineWidth = 0.8 + hash(seed + 7) * 1.2;
        context.beginPath();
        context.moveTo(x + drift, y);
        context.lineTo(x + drift + Math.sin(time + seed) * 3, y + length);
        context.stroke();
      }
    };

    const drawBlueprint = (time: number) => {
      const cyan: [number, number, number] = [20, 104, 112];
      const step = 72;
      context.strokeStyle = "rgba(20,104,112,0.22)";
      context.lineWidth = 1;
      for (let x = ((time * 2) % step) - step; x < width + step; x += step) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y < height; y += step) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      const nodes = Array.from({ length: 10 }, (_, index) => {
        const left = index % 2 === 0;
        return {
          x: (left ? 0.04 + hash(index + 1) * 0.13 : 0.83 + hash(index + 1) * 0.13) * width,
          y: (0.12 + hash(index + 7) * 0.76) * height,
          phase: hash(index + 13) * TAU,
          size: 2 + hash(index + 19) * 2.5,
        };
      });

      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.8 + node.phase);
        glow(node.x, node.y, 28 + pulse * 18, cyan, 0.18 + pulse * 0.14);
        context.fillStyle = `rgba(20,104,112,${0.4 + pulse * 0.4})`;
        context.beginPath();
        context.arc(node.x, node.y, node.size, 0, TAU);
        context.fill();
        const next = nodes[(index + 1) % nodes.length];
        if (next && Math.sign(next.x - width / 2) === Math.sign(node.x - width / 2)) {
          context.strokeStyle = "rgba(20,104,112,0.24)";
          context.beginPath();
          context.moveTo(node.x, node.y);
          context.lineTo(next.x, next.y);
          context.stroke();
          const t = (time * 0.12 + hash(index + 29)) % 1;
          const dotX = node.x + (next.x - node.x) * t;
          const dotY = node.y + (next.y - node.y) * t;
          glow(dotX, dotY, 8, cyan, 0.35);
        }
      }
    };

    const drawFilm = (time: number) => {
      const warm: [number, number, number] = [190, 156, 96];
      const leak = 0.4 + 0.6 * Math.sin(time * 0.18);
      glow(width * 0.9, height * 0.08, 260 + leak * 60, warm, 0.16 + leak * 0.08);
      glow(width * 0.08, height * 0.9, 300, [120, 150, 130], 0.14);

      for (let index = 0; index < 22; index += 1) {
        const seed = 300 + index;
        const x = (hash(seed) < 0.5 ? 0.04 + hash(seed + 1) * 0.22 : 0.74 + hash(seed + 1) * 0.22) * width;
        const y = (hash(seed + 2) * height + time * (4 + hash(seed + 3) * 8)) % (height + 120) - 60;
        const radius = 18 + hash(seed + 4) * 62;
        glow(x + Math.sin(time * 0.2 + seed) * 10, y, radius, warm, 0.16 + hash(seed + 5) * 0.16);
        context.strokeStyle = `rgba(214,196,160,${0.2 + hash(seed + 6) * 0.12})`;
        context.lineWidth = 0.7;
        context.beginPath();
        context.arc(x, y, radius * 0.55, 0, TAU);
        context.stroke();
      }

      // 胶片颗粒：低频闪烁，不用满屏噪点拖慢滚动
      for (let index = 0; index < 70; index += 1) {
        const seed = 700 + index;
        const x = hash(seed) * width;
        const y = hash(seed + 1) * height;
        const alpha = 0.1 + hash(seed + 2 + Math.floor(time * 2)) * 0.08;
        context.fillStyle = `rgba(236,224,200,${alpha})`;
        context.fillRect(x, y, 1, 1);
      }
    };

    const drawLetters = (time: number) => {
      const amber: [number, number, number] = [182, 136, 78];
      for (let index = 0; index < 26; index += 1) {
        const seed = 500 + index;
        const x = (hash(seed) < 0.55 ? 0.03 + hash(seed + 1) * 0.2 : 0.77 + hash(seed + 1) * 0.2) * width;
        const y = height - ((hash(seed + 2) * height + time * (5 + hash(seed + 3) * 7)) % (height + 80));
        context.fillStyle = `rgba(182,136,78,${0.18 + hash(seed + 4) * 0.16})`;
        context.beginPath();
        context.ellipse(
          x + Math.sin(time * 0.4 + seed) * 8,
          y,
          1.2 + hash(seed + 5) * 1.8,
          2.4 + hash(seed + 5) * 2.4,
          time * 0.2 + seed,
          0,
          TAU
        );
        context.fill();
      }

      for (const [x, y, phase] of [
        [width * 0.06, height * 0.8, 0],
        [width * 0.94, height * 0.24, 2.4],
      ] as const) {
        const pulse = (time * 0.16 + phase) % 1;
        context.strokeStyle = `rgba(182,136,78,${0.32 * (1 - pulse)})`;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(x, y, 20 + pulse * 90, 0, TAU);
        context.stroke();
        glow(x, y, 40, amber, 0.18);
      }
    };

    const drawLife = (time: number, scroll: number) => {
      for (let index = 0; index < 24; index += 1) {
        const seed = 600 + index;
        const x = (hash(seed) < 0.5 ? 0.02 + hash(seed + 1) * 0.24 : 0.76 + hash(seed + 1) * 0.22) * width;
        const y = (hash(seed + 2) * height + time * (4 + hash(seed + 3) * 6) + scroll * 0.03) % (height + 100) - 50;
        const sway = Math.sin(time * (0.3 + hash(seed + 4) * 0.3) + seed) * 18;
        context.save();
        context.translate(x + sway, y);
        context.rotate(Math.sin(time * 0.5 + seed) * 0.6 + 0.5);
        context.fillStyle = `rgba(92,146,110,${0.16 + hash(seed + 5) * 0.14})`;
        context.beginPath();
        context.ellipse(0, 0, 2.2 + hash(seed + 6) * 3, 6 + hash(seed + 6) * 8, 0, 0, TAU);
        context.fill();
        context.strokeStyle = `rgba(92,146,110,${0.16 + hash(seed + 7) * 0.12})`;
        context.lineWidth = 0.6;
        context.beginPath();
        context.moveTo(0, -6);
        context.lineTo(0, 10);
        context.stroke();
        context.restore();
      }
    };

    const drawQuiet = (time: number) => {
      const teal: [number, number, number] = [96, 142, 132];
      for (let index = 0; index < 26; index += 1) {
        const seed = 800 + index;
        const x = (hash(seed) < 0.5 ? 0.03 + hash(seed + 1) * 0.2 : 0.8 + hash(seed + 1) * 0.17) * width;
        const y = (hash(seed + 2) * height + time * (2 + hash(seed + 3) * 3)) % (height + 40) - 20;
        glow(x + Math.sin(time * 0.2 + seed) * 10, y, 3.5, teal, 0.2 + hash(seed + 4) * 0.14);
      }
      for (let ring = 0; ring < 3; ring += 1) {
        const radius = 70 + ring * 46 + Math.sin(time * 0.25 + ring) * 6;
        context.strokeStyle = `rgba(96,142,132,${0.14 - ring * 0.025})`;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(width * 0.88, height * 0.14, radius, 0, TAU);
        context.stroke();
      }
    };

    const drawStatic = () => {
      context.clearRect(0, 0, width, height);
      if (variant === "ink") drawInk(0, 0);
      else if (variant === "blueprint") drawBlueprint(0);
      else if (variant === "film") drawFilm(0);
      else if (variant === "letters") drawLetters(0);
      else if (variant === "life") drawLife(0, 0);
      else drawQuiet(0);
    };

    if (reduced) {
      drawStatic();
      const onResize = () => {
        resize();
        drawStatic();
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let scroll = 0;
    let lastScroll = window.scrollY;
    let visible = !document.hidden;
    let frameId = 0;
    let previous = performance.now();

    const onScroll = () => {
      const next = window.scrollY;
      scroll += next - lastScroll;
      lastScroll = next;
      scroll *= 0.85;
    };
    const onVisibility = () => {
      visible = !document.hidden;
      previous = performance.now();
      if (!visible) cancelAnimationFrame(frameId);
      else frameId = requestAnimationFrame(frame);
    };

    const frame = (now: number) => {
      if (!visible) return;
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const time = now / 1000;
      scroll *= Math.max(0, 1 - delta * 1.6);

      context.clearRect(0, 0, width, height);
      if (variant === "ink") drawInk(time, scroll);
      else if (variant === "blueprint") drawBlueprint(time);
      else if (variant === "film") drawFilm(time);
      else if (variant === "letters") drawLetters(time);
      else if (variant === "life") drawLife(time, scroll);
      else drawQuiet(time);

      frameId = requestAnimationFrame(frame);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", resize);
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", resize);
    };
  }, [variant]);

  if (!variant) return null;

  return (
    <div className="page-ambient" data-variant={variant} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}