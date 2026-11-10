"use client";

import { useEffect, useRef } from "react";

/**
 * 完整终端页的磷光层。
 *
 * 这里的效果只属于终端，不与其他页面共用：
 *   - 常驻：极淡的磷光尘埃 + 一条缓慢下扫的 CRT 扫描带；
 *   - 敲命令：扫描带加速掠过一次，底部冒几粒磷火；
 *   - 敲键盘：输入行附近溅起一粒小火花；
 *   - 隐藏命令 rain：六秒「字雨」，字符只取站内词汇与十六进制片段。
 *
 * 画在 shell 背景与正文之间，正文背景在独立终端页被设为透明，
 * 所以字雨从输出文字后面落下，而不是盖在文字上。减少动效时只保留静态尘埃。
 */

const RAIN_MS = 6000;
const SCAN_MS = 760;
const GLYPHS = [
  "Z",
  "·",
  "0",
  "1",
  "元",
  "雨",
  "{",
  "}",
  "/",
  "<",
  ">",
  "λ",
  "01",
  "终",
  "录",
  "?",
  "#",
  "+",
];

interface RainColumn {
  x: number;
  y: number;
  speed: number;
  length: number;
  seed: number;
}

interface Spark {
  x: number;
  y: number;
  vy: number;
  life: number;
  seed: number;
}

function hash(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function parseHex(value: string): [number, number, number] {
  const hex = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    return [
      Number.parseInt(hex.slice(1, 3), 16),
      Number.parseInt(hex.slice(3, 5), 16),
      Number.parseInt(hex.slice(5, 7), 16),
    ];
  }
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return [
      Number.parseInt(hex[1] + hex[1], 16),
      Number.parseInt(hex[2] + hex[2], 16),
      Number.parseInt(hex[3] + hex[3], 16),
    ];
  }
  return [169, 220, 204];
}

export function TerminalAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = canvas?.parentElement;
    if (!canvas || !box) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let phosphor: [number, number, number] = [169, 220, 204];
    let columns: RainColumn[] = [];
    const sparks: Spark[] = [];
    let rainUntil = 0;
    let pulseAt = -SCAN_MS;

    const refreshColor = () => {
      const value = getComputedStyle(box).getPropertyValue("--phosphor");
      if (value) phosphor = parseHex(value);
    };
    refreshColor();

    const buildColumns = () => {
      const gap = width < 520 ? 26 : 22;
      const count = Math.max(1, Math.floor(width / gap));
      columns = Array.from({ length: count }, (_, index) => {
        const seed = index * 19 + 7;
        return {
          x: index * gap + hash(seed) * 10,
          y: -hash(seed + 1) * height,
          speed: 46 + hash(seed + 2) * 86,
          length: 3 + Math.floor(hash(seed + 3) * 8),
          seed,
        };
      });
    };

    const resize = () => {
      const rect = box.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildColumns();
    };
    resize();

    const drawDust = (time: number, energy: number) => {
      for (let index = 0; index < 42; index += 1) {
        const seed = index + 900;
        const x = hash(seed) * width;
        const drift = 2 + hash(seed + 1) * 6;
        const y = (hash(seed + 2) * height - time * drift) % (height + 30);
        const wrapped = y < -10 ? y + height + 30 : y;
        const alpha = 0.035 + hash(seed + 3) * 0.05 + energy * 0.025;
        context.fillStyle = `rgba(${phosphor[0]},${phosphor[1]},${phosphor[2]},${alpha})`;
        context.fillRect(x, wrapped, 1, 2 + hash(seed + 4) * 5);
      }
    };

    const drawScan = (now: number) => {
      const ambient = ((now / 8200) % 1) * (height + 120) - 60;
      const gradient = context.createLinearGradient(0, ambient - 30, 0, ambient + 30);
      gradient.addColorStop(0, "rgba(169,220,204,0)");
      gradient.addColorStop(0.5, `rgba(${phosphor[0]},${phosphor[1]},${phosphor[2]},0.04)`);
      gradient.addColorStop(1, "rgba(169,220,204,0)");
      context.fillStyle = gradient;
      context.fillRect(0, ambient - 30, width, 60);

      const elapsed = now - pulseAt;
      if (elapsed >= 0 && elapsed < SCAN_MS) {
        const progress = elapsed / SCAN_MS;
        const y = -20 + progress * (height + 40);
        const alpha = 0.26 * (1 - progress);
        const line = context.createLinearGradient(0, y - 8, 0, y + 22);
        line.addColorStop(0, "rgba(169,220,204,0)");
        line.addColorStop(0.35, `rgba(${phosphor[0]},${phosphor[1]},${phosphor[2]},${alpha})`);
        line.addColorStop(1, "rgba(169,220,204,0)");
        context.fillStyle = line;
        context.fillRect(0, y - 8, width, 30);
        context.fillStyle = `rgba(${phosphor[0]},${phosphor[1]},${phosphor[2]},${alpha * 0.8})`;
        context.fillRect(0, y, width, 1);
      }
    };

    const drawRain = (now: number, delta: number) => {
      if (now >= rainUntil) return;
      const left = rainUntil - now;
      const intensity = Math.min(1, left / 900);
      context.font = '12px "SFMono-Regular", Consolas, "Noto Sans SC", monospace';
      context.textBaseline = "top";

      for (const column of columns) {
        for (let index = 0; index < column.length; index += 1) {
          const y = column.y - index * 14;
          if (y < -20 || y > height + 10) continue;
          const tick = Math.floor(now / 320) + index;
          const glyph =
            GLYPHS[Math.floor(hash(column.seed + index + tick * 3.7) * GLYPHS.length)] ??
            "·";
          const fade = 1 - index / column.length;
          const alpha = fade * (0.12 + intensity * 0.5);
          context.fillStyle = `rgba(${phosphor[0]},${phosphor[1]},${phosphor[2]},${alpha})`;
          context.fillText(glyph, column.x, y);
        }
        context.fillStyle = `rgba(${phosphor[0]},${phosphor[1]},${phosphor[2]},${intensity * 0.7})`;
        context.fillRect(column.x, column.y, 1.5, 5);

        column.y += column.speed * delta * (0.55 + intensity * 0.75);
        if (column.y - column.length * 14 > height + 30) {
          const seed = column.seed + Math.floor(now / 1000);
          column.y = -30 - hash(seed) * 120;
          column.x = hash(seed + 1) * width;
        }
      }
    };

    const drawSparks = (delta: number) => {
      for (let index = sparks.length - 1; index >= 0; index -= 1) {
        const spark = sparks[index];
        spark.y += spark.vy * delta;
        spark.life -= delta * 1.5;
        if (spark.life <= 0) {
          sparks.splice(index, 1);
          continue;
        }
        context.fillStyle = `rgba(${phosphor[0]},${phosphor[1]},${phosphor[2]},${spark.life * 0.55})`;
        context.fillRect(spark.x, spark.y, 1, 2 + hash(spark.seed) * 3);
      }
    };

    const spawnSparks = (count: number, atY: number) => {
      for (let index = 0; index < count; index += 1) {
        if (sparks.length > 70) sparks.shift();
        const seed = Math.random() * 10_000;
        sparks.push({
          x: hash(seed) * width,
          y: atY,
          vy: -18 - hash(seed + 1) * 46,
          life: 0.7 + hash(seed + 2) * 0.5,
          seed,
        });
      }
    };

    const onPulse = () => {
      pulseAt = performance.now();
      spawnSparks(3, height - 18);
    };
    const onRain = () => {
      rainUntil = performance.now() + RAIN_MS;
      spawnSparks(6, height - 24);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.length !== 1 && event.key !== "Enter") return;
      spawnSparks(1, height - 28);
    };

    window.addEventListener("z-os:terminal-pulse", onPulse);
    window.addEventListener("z-os:terminal-rain", onRain);
    box.addEventListener("keydown", onKeyDown);
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(box);

    const drawStatic = () => {
      context.clearRect(0, 0, width, height);
      drawDust(0, 0);
    };

    if (reduced) {
      drawStatic();
      const onResize = () => {
        resize();
        drawStatic();
      };
      window.addEventListener("resize", onResize);
      return () => {
        observer?.disconnect();
        window.removeEventListener("z-os:terminal-pulse", onPulse);
        window.removeEventListener("z-os:terminal-rain", onRain);
        box.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", onResize);
      };
    }

    let frameId = 0;
    let previous = performance.now();
    let visible = !document.hidden;
    let colorTick = 0;

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

      context.clearRect(0, 0, width, height);
      drawDust(time, 1);
      drawScan(now);
      drawRain(now, delta);
      drawSparks(delta);

      colorTick += 1;
      if (colorTick % 90 === 0) refreshColor();
      frameId = requestAnimationFrame(frame);
    };

    document.addEventListener("visibilitychange", onVisibility);
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("z-os:terminal-pulse", onPulse);
      window.removeEventListener("z-os:terminal-rain", onRain);
      box.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="terminal-atmosphere" aria-hidden="true" />;
}