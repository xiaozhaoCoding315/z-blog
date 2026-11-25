"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  activeLineIndex,
  sectionAt,
  type LyricSectionKind,
  type ParsedLyrics,
} from "@/lib/lyrics-core";

/**
 * 歌词律动层。
 *
 * 用 canvas 画，不经过 React 渲染：每帧直接读 <audio>.currentTime，
 * 所以歌词页滚动到哪一句、琴键什么时候被按下，都跟播放进度同步。
 *
 * 两个形态：
 *   full    —— 歌词页全屏：底部钢琴键盘 + 音符落下 + 按键涟漪；
 *   ambient —— 歌单页两侧琴弦：不挡正文，只在高潮段变亮、加速。
 *
 * 律动不是“听懂音乐”，而是基于歌词段落：重复副歌段识别为高潮（见 lyrics-core），
 * 主歌柔和、高潮更密更亮、长留白的后半段进入间奏（蓝紫极光向上升），
 * 前奏/尾奏收敛。没有歌词时退化为按时间缓慢呼吸。
 */

type Variant = "ambient" | "full";

interface LyricsStageProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  lyrics: ParsedLyrics | null;
  playing: boolean;
  variant: Variant;
}

interface FallingNote {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  key: number;
  seed: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  life: number;
}

interface SideSpark {
  side: 0 | 1;
  y: number;
  vy: number;
  size: number;
  seed: number;
}

const PALETTE: Record<LyricSectionKind, [number, number, number]> = {
  intro: [124, 196, 186],
  verse: [127, 214, 194],
  bridge: [157, 183, 255],
  chorus: [240, 201, 107],
  outro: [167, 196, 191],
  instrumental: [150, 199, 191],
};

const INTENSITY: Record<LyricSectionKind, number> = {
  intro: 0.35,
  verse: 0.6,
  bridge: 0.75,
  chorus: 1,
  outro: 0.25,
  instrumental: 0.45,
};

const BRIDGE_VIOLET: [number, number, number] = [186, 160, 255];

const KEY_PATTERN = new Set([0, 1, 3, 4, 5]);

function hash(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function LyricsStage(props: LyricsStageProps) {
  const { audioRef, lyrics, playing, variant } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const keyCount = variant === "full" ? Math.max(8, Math.min(22, Math.floor(width / 62))) : 0;
    const keyboardHeight = variant === "full" ? Math.min(104, height * 0.15) : 0;
    const keyTop = height - keyboardHeight;
    const keyWidth = keyCount > 0 ? width / keyCount : 0;

    const pressed = new Array<number>(keyCount).fill(0);
    const notes: FallingNote[] = [];
    const ripples: Ripple[] = [];
    const sparks: SideSpark[] = [];
    let hoverKey = -1;
    let lastLine = -1;
    let nextNoteAt = 0;
    let nextSparkAt = 0;

    const pressKeys = (lineIndex: number, section: LyricSectionKind) => {
      if (keyCount === 0) return;
      const amount = section === "chorus" ? 4 : section === "verse" ? 3 : 2;
      const center = Math.floor(hash(lineIndex + 1) * keyCount);
      for (let offset = 0; offset < amount; offset += 1) {
        const key = (center + offset * 2 + lineIndex) % keyCount;
        pressed[key] = 1;
        const x = key * keyWidth + keyWidth / 2;
        ripples.push({ x, y: keyTop + 6, radius: 4, life: 1 });
      }
    };

    const spawnNote = (section: LyricSectionKind) => {
      if (keyCount === 0) return;
      const key = Math.floor(hash(performance.now() + notes.length * 17) * keyCount);
      notes.push({
        x: key * keyWidth + keyWidth / 2 + (hash(key + 7) - 0.5) * 6,
        y: -30,
        vy: 140 + hash(key) * 120 + INTENSITY[section] * 90,
        width: section === "chorus" ? 5 : 3,
        height: 22 + hash(key + 3) * 46,
        key,
        seed: key + notes.length,
      });
    };

    const spawnSpark = (section: LyricSectionKind) => {
      const side = (sparks.length % 2) as 0 | 1;
      sparks.push({
        side,
        y: height + 10,
        vy: 70 + hash(sparks.length + 11) * 90 + INTENSITY[section] * 40,
        size: section === "chorus" ? 2.4 : 1.6,
        seed: sparks.length,
      });
    };

    const drawGlow = (
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
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    };

    const drawKeyboard = (
      time: number,
      section: LyricSectionKind,
      color: [number, number, number],
      energy: number
    ) => {
      const swell =
        section === "chorus"
          ? 0.5 + 0.5 * Math.sin((time * Math.PI * 2) / 0.48)
          : section === "bridge"
            ? 0.3 + 0.25 * Math.sin((time * Math.PI * 2) / 1.4)
            : 0.25;
      context.fillStyle = `rgba(6, 28, 26, ${0.55 + swell * 0.18})`;
      context.fillRect(0, keyTop, width, keyboardHeight);

      for (let index = 0; index < keyCount; index += 1) {
        const x = index * keyWidth;
        const press = pressed[index];
        const near = hoverKey === index ? 0.22 : 0;
        const lit = Math.min(1, press + near);
        context.fillStyle =
          lit > 0.02
            ? `rgba(${color[0]},${color[1]},${color[2]},${0.12 + lit * 0.5})`
            : `rgba(228, 248, 242, ${0.05 + energy * 0.035})`;
        context.beginPath();
        const inset = 1.5;
        const radius = 5;
        roundedRect(context, x + inset, keyTop + 5, keyWidth - inset * 2, keyboardHeight - 10, radius);
        context.fill();

        context.strokeStyle = `rgba(160, 210, 199, ${0.14 + lit * 0.4})`;
        context.lineWidth = 1;
        context.stroke();

        if (press > 0.02) {
          context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${press * 0.38})`;
          context.fillRect(x + keyWidth * 0.32, keyTop + 9, keyWidth * 0.36, keyboardHeight - 20);
        }
      }

      for (let octave = 0; octave * 7 < keyCount - 1; octave += 1) {
        for (const step of KEY_PATTERN) {
          const index = octave * 7 + step;
          if (index >= keyCount - 1) continue;
          const x = (index + 1) * keyWidth;
          const blackWidth = keyWidth * 0.56;
          context.fillStyle = "rgba(6, 20, 19, 0.92)";
          roundedRect(context, x - blackWidth / 2, keyTop + 4, blackWidth, keyboardHeight * 0.62, 4);
          context.fill();
          context.strokeStyle = `rgba(190, 230, 220, ${0.08 + energy * 0.08})`;
          context.stroke();
        }
      }

      context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.16 + energy * 0.12})`;
      context.fillRect(0, keyTop, width, 1.5);
    };

    /**
     * 间奏专属：不落音符，改画三层缓慢起伏的极光带与向上飘的光尘。
     * 它和主歌的绿、高潮的金都不同调，但仍在同一块钢琴键盘上呼吸。
     */
    const drawBridgeAurora = (
      time: number,
      color: [number, number, number],
      energy: number
    ) => {
      for (let ribbon = 0; ribbon < 3; ribbon += 1) {
        const baseline = height * (0.2 + ribbon * 0.16);
        const accent = ribbon % 2 === 0 ? color : BRIDGE_VIOLET;
        const gradient = context.createLinearGradient(0, baseline - 70, width, baseline + 70);
        gradient.addColorStop(0, `rgba(${accent[0]},${accent[1]},${accent[2]},0)`);
        gradient.addColorStop(
          0.3,
          `rgba(${accent[0]},${accent[1]},${accent[2]},${0.09 + energy * 0.05})`
        );
        gradient.addColorStop(
          0.7,
          `rgba(${accent[0]},${accent[1]},${accent[2]},${0.06 + energy * 0.04})`
        );
        gradient.addColorStop(1, `rgba(${accent[0]},${accent[1]},${accent[2]},0)`);
        context.strokeStyle = gradient;
        context.lineWidth = 1.7 - ribbon * 0.35;
        context.beginPath();
        for (let x = -40; x <= width + 40; x += 24) {
          const y =
            baseline +
            Math.sin(x * 0.0035 + time * 0.55 + ribbon * 1.8) * 34 +
            Math.sin(x * 0.0012 - time * 0.28 + ribbon) * 26;
          if (x <= -40) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }

      for (let index = 0; index < 26; index += 1) {
        const seed = 900 + index;
        const travel = (time * (0.035 + hash(seed) * 0.035) + hash(seed + 1)) % 1;
        const y = height * 0.82 - travel * height * 0.58;
        const x =
          width * (0.08 + hash(seed + 2) * 0.84) +
          Math.sin(time * 0.6 + seed) * 20;
        const fade = Math.sin(travel * Math.PI);
        const accent = index % 3 === 0 ? BRIDGE_VIOLET : color;
        drawGlow(x, y, 11, accent, 0.2 * fade * (0.55 + energy * 0.45));
        context.fillStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},${0.45 * fade})`;
        context.fillRect(x, y - 4, 1.2, 8);
      }

      drawGlow(width / 2, keyTop - 36, width * 0.48, BRIDGE_VIOLET, 0.05 + energy * 0.04);
    };

    const drawFull = (time: number, section: LyricSectionKind) => {
      const color = PALETTE[section];
      const energy = INTENSITY[section];
      context.clearRect(0, 0, width, height);

      drawGlow(width / 2, height + 40, Math.max(width * 0.6, 420), color, 0.1 + energy * 0.1);
      drawGlow(width * 0.14, height * 0.9, 260, color, 0.05 + energy * 0.05);

      if (section === "bridge") {
        drawBridgeAurora(time, color, energy);
      } else {
        for (const note of notes) {
          const alpha = 0.35 + energy * 0.4;
          drawGlow(note.x, note.y + note.height, 16, color, alpha * 0.5);
          const gradient = context.createLinearGradient(0, note.y, 0, note.y + note.height);
          gradient.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0)`);
          gradient.addColorStop(0.5, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`);
          gradient.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},${alpha * 0.6})`);
          context.fillStyle = gradient;
          context.fillRect(note.x - note.width / 2, note.y, note.width, note.height);
        }
      }

      drawKeyboard(time, section, color, energy);

      for (const ripple of ripples) {
        context.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${ripple.life * 0.5})`;
        context.lineWidth = 1.5;
        context.beginPath();
        context.ellipse(ripple.x, ripple.y, ripple.radius, ripple.radius * 0.4, 0, 0, Math.PI * 2);
        context.stroke();
      }
    };

    const drawAmbient = (time: number, section: LyricSectionKind) => {
      const color = PALETTE[section];
      const energy = INTENSITY[section];
      context.clearRect(0, 0, width, height);

      const columns = [26, width - 26];
      for (const x of columns) {
        const strings = 5;
        for (let index = 0; index < strings; index += 1) {
          const offset = (index - (strings - 1) / 2) * 9;
          const pulse =
            section === "chorus"
              ? 0.35 + 0.65 * Math.abs(Math.sin(time * 3 + index * 1.7))
              : section === "bridge"
                ? 0.25 + 0.5 * Math.abs(Math.sin(time * 1.4 + index * 1.7))
                : 0.2 + 0.25 * Math.abs(Math.sin(time * 0.9 + index * 1.3));
          context.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${pulse * (0.25 + energy * 0.4)})`;
          context.lineWidth = index === 2 ? 1.6 : 1;
          context.beginPath();
          context.moveTo(x + offset, height * 0.18);
          context.lineTo(x + offset, height * 0.78);
          context.stroke();
        }
        drawGlow(x, height * 0.46, 90, color, 0.04 + energy * 0.07);
      }

      for (const spark of sparks) {
        const x = spark.side === 0 ? 26 + 18 * hash(spark.seed) : width - 26 - 18 * hash(spark.seed);
        drawGlow(x, spark.y, 10, color, 0.3 + energy * 0.3);
        context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.4 + energy * 0.4})`;
        context.fillRect(x - spark.size / 2, spark.y, spark.size, spark.size * 4);
      }

      if (section === "bridge") {
        for (let index = 0; index < 12; index += 1) {
          const seed = 1200 + index;
          const side = index % 2;
          const x = side === 0 ? 26 + 30 * hash(seed) : width - 26 - 30 * hash(seed);
          const travel = (time * (0.03 + hash(seed + 1) * 0.04) + hash(seed + 2)) % 1;
          const y = height * 0.78 - travel * height * 0.54;
          const fade = Math.sin(travel * Math.PI);
          drawGlow(x, y, 13, index % 3 === 0 ? BRIDGE_VIOLET : color, 0.2 * fade);
          context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${0.5 * fade})`;
          context.fillRect(x - 0.8, y, 1.6, 9);
        }
      }
    };

    const drawResting = () => {
      context.clearRect(0, 0, width, height);
      if (variant === "full") {
        drawKeyboard(0, "verse", PALETTE.verse, 0.2);
        drawGlow(width / 2, height + 30, width * 0.5, PALETTE.verse, 0.08);
      }
    };

    if (reduced || !playing) {
      drawResting();
      const onResize = () => {
        resize();
        drawResting();
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    const onMove = (event: PointerEvent) => {
      if (variant !== "full" || keyWidth === 0) return;
      hoverKey = Math.max(0, Math.min(keyCount - 1, Math.floor(event.clientX / keyWidth)));
    };
    const onLeave = () => {
      hoverKey = -1;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);

    let frameId = 0;
    let previous = performance.now();

    const frame = (now: number) => {
      const delta = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const audio = audioRef.current;
      const time = audio ? audio.currentTime : 0;
      const section: LyricSectionKind = lyrics
        ? sectionAt(time, lyrics)
        : "instrumental";

      if (lyrics && lyrics.lines.length > 0) {
        const index = activeLineIndex(lyrics, time);
        if (index !== lastLine) {
          lastLine = index;
          if (index >= 0) pressKeys(index, section);
        }
      }

      if (variant === "full") {
        for (let index = 0; index < pressed.length; index += 1) {
          pressed[index] = Math.max(0, pressed[index] - delta * 2.4);
        }
        while (notes.length > 0 && notes[0].y > height + 40) notes.shift();
        for (const note of notes) {
          note.y += note.vy * delta;
          if (note.y + note.height >= keyTop && note.y < keyTop) {
            pressed[note.key] = Math.min(1, pressed[note.key] + 0.9);
            ripples.push({ x: note.x, y: keyTop + 4, radius: 3, life: 1 });
          }
        }
        for (let index = ripples.length - 1; index >= 0; index -= 1) {
          ripples[index].radius += delta * 46;
          ripples[index].life -= delta * 1.4;
          if (ripples[index].life <= 0) ripples.splice(index, 1);
        }

        const interval =
          section === "chorus" ? 0.2 : section === "verse" ? 0.55 : section === "bridge" ? 0.9 : 1.1;
        if (now >= nextNoteAt) {
          if (section === "bridge") {
            // 间奏没有歌词可落，改用稀疏琴键触点托住极光
            pressKeys(Math.floor(hash(now) * 997), section);
          } else {
            spawnNote(section);
            if (section === "chorus") spawnNote(section);
          }
          nextNoteAt = now + interval * (0.75 + hash(now) * 0.5) * 1000;
        }

        drawFull(time, section);
      } else {
        while (sparks.length > 0 && sparks[0].y < -40) sparks.shift();
        for (const spark of sparks) spark.y -= spark.vy * delta;
        const interval =
          section === "chorus" ? 0.32 : section === "verse" ? 0.8 : section === "bridge" ? 0.5 : 1.4;
        if (now >= nextSparkAt) {
          spawnSpark(section);
          nextSparkAt = now + interval * (0.7 + hash(now) * 0.6) * 1000;
        }
        drawAmbient(time, section);
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, [audioRef, lyrics, playing, variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`lyrics-stage lyrics-stage-${variant}`}
      aria-hidden="true"
    />
  );
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const limited = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + limited, y);
  context.arcTo(x + width, y, x + width, y + height, limited);
  context.arcTo(x + width, y + height, x, y + height, limited);
  context.arcTo(x, y + height, x, y, limited);
  context.arcTo(x, y, x + width, y, limited);
  context.closePath();
}