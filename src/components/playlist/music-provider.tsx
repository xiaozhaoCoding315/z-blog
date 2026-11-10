"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { loadSongLyrics } from "@/app/(site)/(apps)/playlist/lyrics-actions";
import { LyricsOverlay, type LyricsLoadState } from "@/components/playlist/lyrics-overlay";
import { LyricsStage } from "@/components/playlist/lyrics-stage";
import type { TrackView } from "@/lib/songs-server";
import {
  formatDuration,
  isDirectAudioUrl,
  neteaseEmbedUrl,
  neteaseOuterAudioUrl,
} from "@/lib/playlist-core";

/**
 * 全站唯一音乐源。
 *
 * 它挂在站点布局里、位于路由页面之外，所以从歌单跳到笔记、文章、项目页时，
 * `<audio>` 不会被卸载，播放进度自然延续。各页面只通过 `useMusic()` 选择队列。
 *
 * 播放控制仍然全部命令式：按钮直接操作 <audio>，事件只同步 UI。
 * 绝不能让「playing 状态 → effect → play()/pause()」反向驱动元素，
 * 否则异步事件迟到会把状态翻到元素真实状态的反面，形成卡顿死循环。
 */

export interface MusicQueueMeta {
  title: string;
  cover: string | null;
}

interface MusicContextValue {
  current: TrackView | null;
  currentIndex: number | null;
  playing: boolean;
  frameMode: boolean;
  time: number;
  duration: number;
  playQueue: (tracks: TrackView[], index: number, meta: MusicQueueMeta) => void;
  toggle: () => void;
  step: (delta: number) => void;
  seek: (value: number) => void;
  stop: () => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function useMusic(): MusicContextValue {
  const value = useContext(MusicContext);
  if (!value) throw new Error("useMusic 必须在 MusicProvider 内使用");
  return value;
}

interface QueueState extends MusicQueueMeta {
  tracks: TrackView[];
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [framePlaying, setFramePlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsReload, setLyricsReload] = useState(0);
  const [lyricsResult, setLyricsResult] = useState<{
    key: string;
    status: "ready" | "error";
    lyrics: LyricsLoadState["lyrics"];
    error?: string;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const coverButtonRef = useRef<HTMLButtonElement | null>(null);
  const autoplayRef = useRef(false);

  const current =
    queue && currentIndex !== null ? queue.tracks[currentIndex] ?? null : null;
  const audioSrc = current ? directAudioSrc(current) : null;
  const cover = current?.coverUrl ?? queue?.cover ?? null;
  const frameMode = Boolean(current && !audioSrc) || audioFailed;
  const trackId = current?.id ?? null;
  const trackPlatform = current?.platform ?? null;
  const trackExternalId = current?.externalId ?? null;
  const lyricsRequestKey =
    trackId === null ? null : `${trackPlatform}:${trackExternalId ?? trackId}#${lyricsReload}`;
  const ambientAllowed = pathname.startsWith("/playlist");

  const select = useCallback((index: number) => {
    autoplayRef.current = true;
    setCurrentIndex(index);
    setPlaying(true);
    setFramePlaying(true);
    setAudioFailed(false);
    setTime(0);
    setDuration(0);
  }, []);

  const playQueue = useCallback(
    (tracks: TrackView[], index: number, meta: MusicQueueMeta) => {
      if (!tracks[index]) return;
      setQueue({ tracks, title: meta.title, cover: meta.cover });
      select(index);
    },
    [select]
  );

  const startPlayback = useCallback(() => {
    autoplayRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;
    setPlaying(true);
    if (audio.paused) {
      // 自动播放被拦或音源失效时回落到暂停态；用户再点一次即可重新起播
      audio.play().catch(() => {
        autoplayRef.current = false;
        setPlaying(false);
      });
    }
  }, []);

  const pausePlayback = useCallback(() => {
    autoplayRef.current = false;
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  /** 事件可能迟到：以元素此刻的 paused 为准，而不是事件类型 */
  const syncPlaying = useCallback(() => {
    const audio = audioRef.current;
    if (audio) setPlaying(!audio.paused);
  }, []);

  const stop = useCallback(() => {
    autoplayRef.current = false;
    setLyricsOpen(false);
    setQueue(null);
    setCurrentIndex(null);
    setPlaying(false);
    setFramePlaying(true);
    setAudioFailed(false);
    setTime(0);
    setDuration(0);
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (!current) return;
    if (frameMode) {
      setFramePlaying((value) => !value);
      setPlaying((value) => !value);
      return;
    }
    if (playing) pausePlayback();
    else startPlayback();
  }, [current, frameMode, playing, pausePlayback, startPlayback]);

  const step = useCallback(
    (delta: number) => {
      if (!queue || currentIndex === null) return;
      const tracks = queue.tracks;
      for (let offset = 1; offset <= tracks.length; offset += 1) {
        const next = (currentIndex + delta * offset + tracks.length) % tracks.length;
        const track = tracks[next];
        if (track && (directAudioSrc(track) || canEmbed(track))) {
          select(next);
          return;
        }
      }
    },
    [currentIndex, queue, select]
  );

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setTime(value);
  }, []);

  const openLyrics = useCallback(() => setLyricsOpen(true), []);
  const closeLyrics = useCallback(() => {
    setLyricsOpen(false);
    window.setTimeout(() => coverButtonRef.current?.focus(), 0);
  }, []);
  const retryLyrics = useCallback(() => setLyricsReload((value) => value + 1), []);

  // 只在「换曲」时碰一次 <audio>：重置、加载、按意图起播。
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    let cancelled = false;
    audio.currentTime = 0;
    audio.load();
    if (autoplayRef.current) {
      audio.play().catch(() => {
        if (cancelled) return;
        autoplayRef.current = false;
        setPlaying(false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [audioSrc]);

  // 当前曲目的歌词只读一次：歌词页和两侧琴弦共用同一份，避免重复请求。
  useEffect(() => {
    if (!lyricsRequestKey || trackPlatform !== "netease" || !trackExternalId) return;
    let cancelled = false;
    const requestKey = lyricsRequestKey;
    loadSongLyrics(trackPlatform, trackExternalId)
      .then((result) => {
        if (cancelled) return;
        setLyricsResult(
          result.ok && result.lyrics
            ? { key: requestKey, status: "ready", lyrics: result.lyrics }
            : {
                key: requestKey,
                status: "error",
                lyrics: null,
                error: result.error ?? "歌词暂时读不到",
              }
        );
      })
      .catch(() => {
        if (!cancelled) {
          setLyricsResult({
            key: requestKey,
            status: "error",
            lyrics: null,
            error: "歌词暂时读不到",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lyricsRequestKey, trackPlatform, trackExternalId]);

  const lyricsState: LyricsLoadState = useMemo(() => {
    if (trackId === null) return { status: "idle", lyrics: null };
    if (trackPlatform !== "netease" || !trackExternalId) {
      return { status: "error", lyrics: null, error: "这首歌没有站内歌词" };
    }
    if (!lyricsResult || lyricsResult.key !== lyricsRequestKey) {
      return { status: "loading", lyrics: null };
    }
    return {
      status: lyricsResult.status,
      lyrics: lyricsResult.lyrics,
      error: lyricsResult.error,
    };
  }, [trackId, trackPlatform, trackExternalId, lyricsRequestKey, lyricsResult]);

  useEffect(() => {
    if (!current || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: queue?.title ?? "站内歌单",
        artwork: cover ? [{ src: cover, sizes: "300x300" }] : [],
      });
      navigator.mediaSession.setActionHandler("play", startPlayback);
      navigator.mediaSession.setActionHandler("pause", pausePlayback);
      navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
      navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
    } catch {
      // 浏览器不支持完整 Media Session 时静默降级
    }
  }, [cover, current, queue?.title, step, startPlayback, pausePlayback]);

  const value = useMemo<MusicContextValue>(
    () => ({
      current,
      currentIndex,
      playing,
      frameMode,
      time,
      duration,
      playQueue,
      toggle,
      step,
      seek,
      stop,
    }),
    [
      current,
      currentIndex,
      playing,
      frameMode,
      time,
      duration,
      playQueue,
      toggle,
      step,
      seek,
      stop,
    ]
  );

  return (
    <MusicContext.Provider value={value}>
      {children}

      <audio
        ref={audioRef}
        src={audioFailed ? undefined : audioSrc ?? undefined}
        preload="metadata"
        onPlay={syncPlaying}
        onPause={syncPlaying}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const next = event.currentTarget.duration;
          if (Number.isFinite(next) && next > 0) setDuration(next);
        }}
        onEnded={() => step(1)}
        onError={() => {
          if (!audioSrc) return;
          autoplayRef.current = false;
          setAudioFailed(true);
          setPlaying(false);
          setFramePlaying(true);
        }}
      />

      <AnimatePresence>
        {current && queue && (
          <motion.div
            className="playlist-dock"
            data-home={pathname === "/" ? "true" : "false"}
            role="region"
            aria-label="正在播放"
            data-frame={frameMode ? "true" : "false"}
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            <div
              className="playlist-dock-glow"
              style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
              aria-hidden="true"
            />

            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`${current.id}-cover`}
                className="playlist-dock-cover"
                initial={{ x: -34, scale: 0.72, rotate: -14, opacity: 0 }}
                animate={{ x: 0, scale: 1, rotate: 0, opacity: 1 }}
                exit={{ x: 34, scale: 0.72, rotate: 12, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
              >
                <button
                  ref={coverButtonRef}
                  type="button"
                  className="playlist-dock-cover-open"
                  onClick={openLyrics}
                  aria-label={`打开《${current.title}》歌词页`}
                >
                  <span className="playlist-dock-vinyl" data-spin={playing ? "true" : "false"}>
                    {cover ? (
                      <img src={cover} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{current.title.slice(0, 1)}</span>
                    )}
                  </span>
                  <span className="playlist-dock-cover-hint" aria-hidden="true">
                    歌词
                  </span>
                </button>
              </motion.div>
            </AnimatePresence>

            <div className="playlist-dock-meta">
              <span className="playlist-dock-label">
                {frameMode ? "OFFICIAL PLAYER" : playing ? "NOW PLAYING" : "PAUSED"}
              </span>
              <p className="playlist-dock-title">{current.title}</p>
              <p className="playlist-dock-artist">
                {current.artist} · {queue.title}
              </p>

              {frameMode ? (
                <div className="playlist-dock-frame">
                  {current.platform === "netease" && current.externalId ? (
                    framePlaying ? (
                      <iframe
                        key={`${current.externalId}-${framePlaying ? "on" : "off"}`}
                        title={`网易云播放器：${current.title}`}
                        src={neteaseEmbedUrl(current.externalId)}
                        height={66}
                        allow="autoplay; encrypted-media"
                      />
                    ) : (
                      <p className="playlist-dock-frame-note">官方播放器已暂停</p>
                    )
                  ) : (
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="playlist-dock-external"
                    >
                      去平台收听 ↗
                    </a>
                  )}
                </div>
              ) : (
                <div className="playlist-dock-progress">
                  <span>{formatElapsed(time)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || current.duration || 0}
                    step={1}
                    value={Math.min(time, duration || current.duration || 0)}
                    onChange={(event) => seek(Number(event.target.value))}
                    aria-label="播放进度"
                  />
                  <span>{formatDuration(Math.round(duration) || current.duration)}</span>
                </div>
              )}

              {audioFailed && frameMode && (
                <p className="playlist-dock-fallback">
                  这首曲目受版权限制，已切换到网易云官方播放器。
                </p>
              )}
            </div>

            <div className="playlist-dock-controls">
              <button type="button" onClick={() => step(-1)} aria-label="上一首">
                ‹
              </button>
              <button
                type="button"
                className="playlist-dock-play"
                onClick={toggle}
                aria-label={playing ? "暂停" : "播放"}
                aria-pressed={playing}
              >
                {playing ? "▮▮" : "▶"}
              </button>
              <button type="button" onClick={() => step(1)} aria-label="下一首">
                ›
              </button>
              <button
                type="button"
                className="playlist-dock-close"
                onClick={stop}
                aria-label="收起播放器"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {current && playing && !frameMode && !lyricsOpen && ambientAllowed && (
        <LyricsStage
          audioRef={audioRef}
          lyrics={lyricsState.lyrics}
          playing={playing}
          variant="ambient"
        />
      )}

      <AnimatePresence>
        {lyricsOpen && current && queue && (
          <LyricsOverlay
            track={current}
            playlistTitle={queue.title}
            playlistCover={queue.cover}
            audioRef={audioRef}
            playing={playing}
            time={time}
            duration={duration}
            frameMode={frameMode}
            lyricsState={lyricsState}
            onRetryLyrics={retryLyrics}
            onToggle={toggle}
            onSeek={seek}
            onClose={closeLyrics}
            onNext={() => step(1)}
            onPrev={() => step(-1)}
          />
        )}
      </AnimatePresence>
    </MusicContext.Provider>
  );
}

function directAudioSrc(track: TrackView): string | null {
  if (track.platform === "netease" && track.externalId) {
    return neteaseOuterAudioUrl(track.externalId);
  }
  if (isDirectAudioUrl(track.url)) return track.url;
  return null;
}

function canEmbed(track: TrackView): boolean {
  return track.platform === "netease" && Boolean(track.externalId);
}

function formatElapsed(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  return formatDuration(Math.round(seconds));
}