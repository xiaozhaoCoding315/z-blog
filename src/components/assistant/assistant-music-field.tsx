"use client";

import { useEffect, useRef } from "react";
import { useMusic } from "@/components/playlist/music-provider";

/**
 * 小元同学的音乐粒子场。
 *
 * 助手页不共用歌单两侧的琴弦：这里用一层向上漂移的粒子网络表达「上行链路」。
 * 音频是跨域直链，接 AnalyserNode 会被 CORS 静音——所以能量只从播放头合成：
 * 以每首歌的种子取一个稳定节拍，鼓点包络让粒子在拍上轻微加速、连线变亮。
 * canvas 直接读 <audio>.currentTime，不经过 React 逐帧渲染。
 */

interface Particle {
  x: number;
  y: number;
  depth: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  offsetX: number;
  offsetY: number;
  cyan: boolean;
}

interface Packet {
  x: number;
  y: number;
  speed: number;
  size: number;
  amber: boolean;
}

function hash(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const MINT: [number, number, number] = [111, 255, 210];
const CYAN: [number, number, number] = [107, 217, 255];
const AMBER: [number, number, number] = [255, 211, 122];

export function AssistantMusicField() {
  const { current, playing, frameMode, getAudioTime } = useMusic();
  const active = Boolean(current && playing && !frameMode);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
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
    let particles: Particle[] = [];
    let packets: Packet[] = [];
    const pointer = { x: -9999, y: -9999 };

    const seedBase = String(current?.id ?? "x")
      .split("")
      .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

    const build = () => {
      const count = Math.min(88, Math.max(34, Math.round((width * height) / 14_000)));
      particles = Array.from({ length: count }, (_, index) => {
        const seed = seedBase + index * 13;
        return {
          x: hash(seed) * width,
          y: hash(seed + 1) * height,
          depth: 0.25 + hash(seed + 2) * 0.75,
          size: 0.6 + hash(seed + 3) * 1.9,
          speed: 3 + hash(seed + 4) * 11,
          drift: (hash(seed + 5) - 0.5) * 7,
          phase: hash(seed + 6) * Math.PI * 2,
          offsetX: 0,
          offsetY: 0,
          cyan: hash(seed + 7) > 0.62,
        };
      });

      const streamX = width * 0.82;
      packets = Array.from({ length: 5 }, (_, index) => ({
        x: streamX + (hash(seedBase + index + 20) - 0.5) * 46,
        y: hash(seedBase + index + 30) * height,
        speed: 26 + hash(seedBase + index + 40) * 34,
        size: 1.4 + hash(seedBase + index + 50) * 2,
        amber: index === 0,
      }));
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
      build();
    };
    resize();

    const onPointerMove = (event: PointerEvent) => {
      const rect = box.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    box.addEventListener("pointermove", onPointerMove);
    box.addEventListener("pointerleave", onPointerLeave);
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(box);

    const drawLinks = (energy: number) => {
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          if (Math.abs(a.depth - b.depth) > 0.32) continue;
          const dx = a.x + a.offsetX - (b.x + b.offsetX);
          const dy = a.y + a.offsetY - (b.y + b.offsetY);
          const distance = Math.hypot(dx, dy);
          if (distance > 96) continue;
          const alpha = (1 - distance / 96) * (0.08 + energy * 0.16) * Math.min(a.depth, b.depth);
          context.strokeStyle = `rgba(111,255,210,${alpha})`;
          context.lineWidth = 0.6;
          context.beginPath();
          context.moveTo(a.x + a.offsetX, a.y + a.offsetY);
          context.lineTo(b.x + b.offsetX, b.y + b.offsetY);
          context.stroke();
        }
      }
    };

    const drawParticles = (energy: number) => {
      for (const particle of particles) {
        const color = particle.cyan ? CYAN : MINT;
        const alpha = (0.16 + energy * 0.34) * (0.45 + particle.depth * 0.55);
        const x = particle.x + particle.offsetX;
        const y = particle.y + particle.offsetY;
        context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
        context.beginPath();
        context.arc(x, y, particle.size * (0.7 + particle.depth * 0.8), 0, Math.PI * 2);
        context.fill();
        if (particle.size > 1.9 && particle.depth > 0.7) {
          const glow = context.createRadialGradient(x, y, 0, x, y, 12);
          glow.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${alpha * 0.34})`);
          glow.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
          context.fillStyle = glow;
          context.beginPath();
          context.arc(x, y, 12, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    const drawStream = (energy: number, time: number) => {
      const streamX = width * 0.82;
      const beam = context.createLinearGradient(0, 0, 0, height);
      beam.addColorStop(0, "rgba(107,217,255,0)");
      beam.addColorStop(0.48, `rgba(107,217,255,${0.035 + energy * 0.05})`);
      beam.addColorStop(1, "rgba(107,217,255,0)");
      context.fillStyle = beam;
      context.fillRect(streamX - 26, 0, 52, height);
      context.strokeStyle = `rgba(111,255,210,${0.08 + energy * 0.12})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(streamX, 0);
      context.lineTo(streamX, height);
      context.stroke();

      for (const packet of packets) {
        const color = packet.amber ? AMBER : CYAN;
        const tail = context.createLinearGradient(0, packet.y, 0, packet.y + 22);
        tail.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0)`);
        tail.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},${0.3 + energy * 0.35})`);
        context.fillStyle = tail;
        context.fillRect(packet.x - 0.8, packet.y, 1.6, 22);
        context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.5 + energy * 0.4})`;
        context.fillRect(packet.x - packet.size / 2, packet.y, packet.size, packet.size);
        packet.y -= packet.speed * (0.016 + energy * 0.012);
        if (packet.y < -30) {
          packet.y = height + 30;
          packet.x = streamX + Math.sin(time * 1.7 + packet.size * 9) * 24;
        }
      }
    };

    const frameOnce = (t: number, energy: number, delta: number) => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const pulse = 1 + energy * 0.65;
        particle.y -= particle.speed * pulse * delta;
        particle.x += particle.drift * delta;
        if (particle.y < -12) {
          particle.y = height + 12;
          particle.x = hash(seedBase + particle.phase * 100 + t) * width;
        }
        if (particle.x < -12) particle.x = width + 12;
        else if (particle.x > width + 12) particle.x = -12;

        particle.offsetX *= Math.max(0, 1 - delta * 3.2);
        particle.offsetY *= Math.max(0, 1 - delta * 3.2);

        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 90 && distance > 0.1) {
          const push = ((90 - distance) / 90) * 46 * delta;
          particle.offsetX += (dx / distance) * push;
          particle.offsetY += (dy / distance) * push;
        }
      }

      drawLinks(energy);
      drawParticles(energy);
      drawStream(energy, t);
    };

    const drawStatic = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const color = particle.cyan ? CYAN : MINT;
        context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.2 + particle.depth * 0.2})`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      drawStream(0.35, 0);
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
        box.removeEventListener("pointermove", onPointerMove);
        box.removeEventListener("pointerleave", onPointerLeave);
        window.removeEventListener("resize", onResize);
      };
    }

    let frameId = 0;
    let previous = performance.now();
    let visible = !document.hidden;

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
      const audioTime = getAudioTime();
      const period = 60 / (74 + (seedBase % 9) * 6);
      const beat = Math.exp(-((audioTime / period) % 1) * 7);
      const energy = 0.32 + beat * 0.5 + Math.sin(audioTime * 0.33 + seedBase) * 0.08;
      frameOnce(audioTime, Math.max(0.18, Math.min(1, energy)), delta);
      frameId = requestAnimationFrame(frame);
    };

    document.addEventListener("visibilitychange", onVisibility);
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      box.removeEventListener("pointermove", onPointerMove);
      box.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [active, current?.id, getAudioTime]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="assistant-music-field" aria-hidden="true" />;
}