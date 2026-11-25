"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import { LyricsStage } from "@/components/playlist/lyrics-stage";
import {
  activeLineIndex,
  sectionAt,
  type LyricSectionKind,
  type ParsedLyrics,
} from "@/lib/lyrics-core";
import { formatDuration } from "@/lib/playlist-core";
import type { TrackView } from "@/lib/songs-server";

export interface LyricsLoadState {
  status: "idle" | "loading" | "ready" | "error";
  lyrics: ParsedLyrics | null;
  error?: string;
}

interface LyricsOverlayProps {
  track: TrackView;
  playlistTitle: string;
  playlistCover: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  playing: boolean;
  time: number;
  duration: number;
  frameMode: boolean;
  lyricsState: LyricsLoadState;
  onRetryLyrics: () => void;
  onToggle: () => void;
  onSeek: (value: number) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const SECTION_LABEL: Record<LyricSectionKind, string> = {
  intro: "INTRO · 前奏",
  verse: "VERSE · 主歌",
  bridge: "BRIDGE · 间奏",
  chorus: "CHORUS · 高潮",
  outro: "OUTRO · 尾奏",
  instrumental: "INSTRUMENTAL · 纯音乐",
};

/**
 * 沉浸式歌词页。
 *
 * 它不是独立路由：播放器就在同一个组件树里，打开/关闭都不会打断音频。
 * 左侧唱片的点击入口在 dock 上，这里负责歌词滚动、进度控制和律动画布。
 */
export function LyricsOverlay({
  track,
  playlistTitle,
  playlistCover,
  audioRef,
  playing,
  time,
  duration,
  frameMode,
  lyricsState,
  onRetryLyrics,
  onToggle,
  onSeek,
  onClose,
  onNext,
  onPrev,
}: LyricsOverlayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [effects, setEffects] = useState(true);

  const lyrics = lyricsState.lyrics;
  const lines = lyrics?.lines ?? [];
  const cover = track.coverUrl ?? playlistCover;
  const activeIndex = useMemo(
    () => (lyrics ? activeLineIndex(lyrics, time) : -1),
    [lyrics, time]
  );
  const section: LyricSectionKind = lyrics ? sectionAt(time, lyrics) : "instrumental";
  const total = duration || track.duration || 0;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = rootRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    if (activeIndex < 0 || frameMode) return;
    const list = listRef.current;
    const line = lineRefs.current[activeIndex];
    if (!list || !line) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({
      top: Math.max(0, line.offsetTop - list.clientHeight * 0.4),
      behavior: reduced ? "auto" : "smooth",
    });
  }, [activeIndex, frameMode]);

  const jump = (index: number) => {
    if (frameMode) return;
    const line = lines[index];
    if (!line) return;
    onSeek(line.time + 0.05);
    if (!playing) onToggle();
  };

  return (
    <motion.div
      ref={rootRef}
      className="lyrics-overlay"
      data-section={section}
      role="dialog"
      aria-modal="true"
      aria-label={`${track.title} 歌词`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
    >
      <div
        className="lyrics-overlay-backdrop"
        style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
        aria-hidden="true"
      />
      <div className="lyrics-overlay-shade" aria-hidden="true" />

      {effects && !frameMode && (
        <LyricsStage
          audioRef={audioRef}
          lyrics={lyrics}
          playing={playing}
          variant="full"
        />
      )}

      <div className="lyrics-overlay-shell">
        <header className="lyrics-overlay-head">
          <div>
            <p className="lyrics-overlay-eyebrow">LYRICS · 歌词</p>
            <p className="lyrics-overlay-playlist">{playlistTitle}</p>
          </div>
          <div className="lyrics-overlay-actions">
            <button
              type="button"
              className="lyrics-overlay-effects"
              onClick={() => setEffects((value) => !value)}
              aria-pressed={effects}
            >
              {effects ? "特效开" : "特效关"}
            </button>
            <button
              type="button"
              className="lyrics-overlay-close"
              onClick={onClose}
              aria-label="关闭歌词页"
              autoFocus
            >
              ×
            </button>
          </div>
        </header>

        <div className="lyrics-overlay-body">
          <aside className="lyrics-overlay-aside">
            <div className="lyrics-disc" data-spin={playing ? "true" : "false"}>
              <span className="lyrics-disc-vinyl">
                {cover ? (
                  <img src={cover} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span aria-hidden="true">{track.title.slice(0, 1)}</span>
                )}
              </span>
              <span className="lyrics-disc-hole" aria-hidden="true" />
            </div>

            <div className="lyrics-overlay-meta">
              <span className="lyrics-overlay-section">{SECTION_LABEL[section]}</span>
              <h1>{track.title}</h1>
              <p className="lyrics-overlay-artist">
                {track.artist} · {playlistTitle}
              </p>

              <div className="lyrics-overlay-progress">
                <span>{formatDuration(Math.round(time))}</span>
                <input
                  type="range"
                  min={0}
                  max={total || 0}
                  step={1}
                  value={Math.min(Math.round(time), total || 0)}
                  onChange={(event) => onSeek(Number(event.target.value))}
                  aria-label="播放进度"
                  disabled={frameMode}
                />
                <span>{formatDuration(Math.round(total))}</span>
              </div>

              <div className="lyrics-overlay-controls">
                <button type="button" onClick={onPrev} aria-label="上一首">
                  ‹
                </button>
                <button
                  type="button"
                  className="lyrics-overlay-play"
                  onClick={onToggle}
                  aria-label={playing ? "暂停" : "播放"}
                  aria-pressed={playing}
                  disabled={frameMode}
                >
                  {playing ? "▮▮" : "▶"}
                </button>
                <button type="button" onClick={onNext} aria-label="下一首">
                  ›
                </button>
              </div>

              {frameMode && (
                <p className="lyrics-overlay-note">
                  版权受限曲目由网易云官方播放器播放，歌词不会自动滚动。
                </p>
              )}
            </div>
          </aside>

          <section className="lyrics-overlay-lyrics" aria-label="歌词正文">
            {lyricsState.status === "loading" && (
              <div className="lyrics-lines lyrics-lines-loading" aria-busy="true">
                {[92, 76, 88, 64, 80, 71, 58].map((width, index) => (
                  <span key={index} style={{ width: `${width}%` }} />
                ))}
              </div>
            )}

            {lyricsState.status === "error" && (
              <div className="lyrics-empty">
                <p>{lyricsState.error ?? "歌词暂时读不到"}</p>
                <button type="button" onClick={onRetryLyrics}>
                  重试
                </button>
              </div>
            )}

            {lyricsState.status === "ready" && lines.length === 0 && (
              <div className="lyrics-empty">
                <p>纯音乐，请欣赏。</p>
                <p>没有歌词时，律动会按播放时间缓慢呼吸。</p>
              </div>
            )}

            {lyricsState.status === "ready" && lines.length > 0 && (
              <div className="lyrics-lines" ref={listRef}>
                {lyrics?.credits.length ? (
                  <p className="lyrics-credits">{lyrics.credits.join(" · ")}</p>
                ) : null}
                {lines.map((line, index) => {
                  const active = index === activeIndex;
                  return (
                    <button
                      key={`${line.time}-${index}`}
                      ref={(node) => {
                        lineRefs.current[index] = node;
                      }}
                      type="button"
                      className={`lyrics-line${active ? " is-active" : ""}${
                        index < activeIndex ? " is-past" : ""
                      }`}
                      aria-current={active ? "true" : undefined}
                      onClick={() => jump(index)}
                      disabled={frameMode}
                    >
                      <span className="lyrics-line-text">{line.text}</span>
                      {line.translation && (
                        <span className="lyrics-line-translation">{line.translation}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <footer className="lyrics-overlay-foot">
          <p>点击歌词跳到对应进度 · 特效随前奏 / 主歌 / 间奏 / 高潮 / 尾奏变化</p>
          <p>Esc 关闭</p>
        </footer>
      </div>
    </motion.div>
  );
}