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
  /** 给 canvas 动效读的实时播放头；不要用它驱动 React 渲染 */
  getAudioTime: () => number;
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

export const PLAY_QUEUE_EVENT = "z-os:play-queue";

export interface PlayQueueRequest {
  tracks: TrackView[];
  index: number;
  meta: MusicQueueMeta;
}

/**
 * 不消费 `useMusic()` 也能把歌送进全站播放器。
 *
 * context 里带着每帧变化的播放时间，小元面板一旦订阅，整段对话会跟着
 * 播放进度重渲染。改用一次性的 window 事件：谁想点歌就发一条请求，
 * Provider 收到后走正常的 `playQueue`，播放器、mediaSession 与萌宠的
 * data-music-playing 全部照旧。
 */
export function requestPlayQueue(
  tracks: TrackView[],
  index: number,
  meta: MusicQueueMeta
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PlayQueueRequest>(PLAY_QUEUE_EVENT, {
      detail: { tracks, index, meta },
    })
  );
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [framePlaying, setFramePlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  /** 每次主动选曲都 +1：单曲循环时 audioSrc 不变，靠它重新 load/起播 */
  const [playToken, setPlayToken] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);
  const [skipNotice, setSkipNotice] = useState<{ id: number; text: string } | null>(
    null
  );
  const [lyricsOpen, setLyricsOpen] = useState(false);
  /** 播放器收起为右下角悬浮唱片入口：只隐藏面板，不打断播放 */
  const [dockHidden, setDockHidden] = useState(false);
  const [lyricsReload, setLyricsReload] = useState(0);
  const [lyricsResult, setLyricsResult] = useState<{
    key: string;
    status: "ready" | "error";
    lyrics: LyricsLoadState["lyrics"];
    error?: string;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLButtonElement | null>(null);
  const coverButtonRef = useRef<HTMLButtonElement | null>(null);
  const autoplayRef = useRef(false);
  /** 连续音源失败计数：一首坏歌跳过即可，整队都坏时停下来，避免死循环切歌 */
  const audioFailuresRef = useRef(0);
  /**
   * 每次「想让音乐开始播」的意图序号：select / startPlayback 同步 +1。
   * 失效音源的 play() 会以 NotSupportedError 拒绝，而这个拒绝往往晚于
   * 跳歌 state 已提交、新曲目的 effect 已排队；只看 cleanup 的 cancelled
   * 标志来不及，会把刚设好的 autoplayRef 清掉，下一首就只加载不播放。
   */
  const playIntentRef = useRef(0);
  const noticeIdRef = useRef(0);

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
  // 除小元同学控制台外，其余页面共用歌单的两侧琴弦；助手页用自己的粒子场。
  const ambientAllowed = !pathname.startsWith("/assistant");

  const select = useCallback((index: number) => {
    playIntentRef.current += 1;
    autoplayRef.current = true;
    setCurrentIndex(index);
    setPlaying(true);
    setFramePlaying(true);
    setAudioFailed(false);
    setTime(0);
    setDuration(0);
    setPlayToken((value) => value + 1);
  }, []);

  const playQueue = useCallback(
    (tracks: TrackView[], index: number, meta: MusicQueueMeta) => {
      if (!tracks[index]) return;
      audioFailuresRef.current = 0;
      setSkipNotice(null);
      setQueue({ tracks, title: meta.title, cover: meta.cover });
      // 主动点歌才重新展开播放器；自动切下一首保持收起，不打断用户腾出的空间。
      setDockHidden(false);
      select(index);
    },
    [select]
  );

  // 小元等不订阅 context 的调用方，用一条 window 事件请求点歌。
  useEffect(() => {
    const onRequest = (event: Event) => {
      const detail = (event as CustomEvent<PlayQueueRequest>).detail;
      if (!detail || !Array.isArray(detail.tracks) || detail.tracks.length === 0) {
        return;
      }
      if (!detail.meta || typeof detail.meta.title !== "string") return;
      const index =
        Number.isInteger(detail.index) &&
        detail.index >= 0 &&
        detail.index < detail.tracks.length
          ? detail.index
          : 0;
      playQueue(detail.tracks, index, detail.meta);
    };
    window.addEventListener(PLAY_QUEUE_EVENT, onRequest);
    return () => window.removeEventListener(PLAY_QUEUE_EVENT, onRequest);
  }, [playQueue]);

  const startPlayback = useCallback(() => {
    playIntentRef.current += 1;
    const intent = playIntentRef.current;
    autoplayRef.current = true;
    audioFailuresRef.current = 0;
    const audio = audioRef.current;
    if (!audio) return;
    setPlaying(true);
    if (audio.paused) {
      // 自动播放被拦或音源失效时回落到暂停态；用户再点一次即可重新起播。
      // 只有「这一意图仍是最新」时才落回暂停，避免旧曲目的拒绝覆盖新一次选曲。
      audio.play().catch(() => {
        if (intent !== playIntentRef.current) return;
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
    audioFailuresRef.current = 0;
    setLyricsOpen(false);
    setQueue(null);
    setCurrentIndex(null);
    setPlaying(false);
    setFramePlaying(true);
    setAudioFailed(false);
    setSkipNotice(null);
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

  const announceSkip = useCallback((text: string) => {
    setSkipNotice({ id: ++noticeIdRef.current, text });
  }, []);

  /**
   * VIP / 失效音源：不要在坏歌上停住，直接切下一首。
   * 失败计数不在这里清零——只有真正开始播放、用户重新起播或换队列才清零，
   * 否则整队都坏时会无限循环。计数达到队列长度就停在官方播放器兜底。
   */
  const handleAudioError = useCallback(() => {
    if (!audioSrc) return;
    audioFailuresRef.current += 1;
    const queueLength = queue?.tracks.length ?? 0;

    if (
      queue &&
      currentIndex !== null &&
      queueLength > 1 &&
      audioFailuresRef.current < queueLength
    ) {
      announceSkip(`《${current?.title ?? "当前曲目"}》音源不可用，已自动播放下一首`);
      step(1);
      return;
    }

    autoplayRef.current = false;
    setAudioFailed(true);
    setPlaying(false);
    setFramePlaying(true);
    announceSkip(
      queueLength > 1
        ? "队列里的音源都不可用，先停在这里。"
        : "这首曲目的音源不可用，已切换到官方播放器。"
    );
  }, [audioSrc, queue, currentIndex, current, step, announceSkip]);

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setTime(value);
  }, []);

  const getAudioTime = useCallback(
    () => audioRef.current?.currentTime ?? 0,
    []
  );

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
    const intent = playIntentRef.current;
    audio.currentTime = 0;
    audio.load();
    if (autoplayRef.current) {
      audio.play().catch(() => {
        // 旧音源的拒绝可能比新曲目的 effect 更早执行：意图序号已变就让它作废，
        // 否则会把 autoplayRef 清掉，导致跳歌后的下一首永远停在暂停态。
        if (cancelled || intent !== playIntentRef.current) return;
        autoplayRef.current = false;
        setPlaying(false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [audioSrc, playToken]);

  // dock 是 fixed 的：把实际占用的高度写成 CSS 变量（含底部间距），
  // 终端输入行与小元同学的输入区据此预留空间，不会被播放器盖住。
  // 收起后只剩右下角的一张悬浮唱片：宽屏时它落在 1240px 主栏之外，页面
  // 无须再让出整条底部空间；窄屏仍按入口的实测尺寸预留，避免压住输入区。
  useEffect(() => {
    const root = document.documentElement;
    if (!current || !queue) {
      root.style.removeProperty("--music-dock-clearance");
      return;
    }
    const node = dockHidden ? restoreRef.current : dockRef.current;
    if (!node) return;

    const sync = () => {
      const bottom = Number.parseFloat(getComputedStyle(node).bottom) || 0;
      const mainWidth = Math.min(1240, Math.max(0, window.innerWidth - 44));
      const gutter = (window.innerWidth - mainWidth) / 2;
      const reserve =
        dockHidden && gutter >= node.offsetWidth + 24
          ? 0
          : node.offsetHeight + bottom + 12;
      root.style.setProperty(
        "--music-dock-clearance",
        `${Math.ceil(reserve)}px`
      );
    };
    sync();
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(sync) : null;
    observer?.observe(node);
    window.addEventListener("resize", sync);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
      root.style.removeProperty("--music-dock-clearance");
    };
  }, [current, queue, frameMode, dockHidden]);

  // 萌宠只靠这个根节点标记判断要不要戴耳机、跟拍摇摆。用属性而不是 useMusic，
  // 是因为播放时 time 会频繁更新，消费 context 会把整段对话一起重渲染。
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.musicPlaying = playing ? "true" : "false";
    return () => {
      delete root.dataset.musicPlaying;
    };
  }, [playing]);

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

  // 跳过提示只停留几秒，不占住播放器；同一秒内连续跳歌只显示最新一条。
  useEffect(() => {
    if (!skipNotice) return;
    const timer = window.setTimeout(() => {
      setSkipNotice((value) => (value?.id === skipNotice.id ? null : value));
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [skipNotice]);

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
      getAudioTime,
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
      getAudioTime,
    ]
  );

  return (
    <MusicContext.Provider value={value}>
      {children}

      <audio
        ref={audioRef}
        src={audioFailed ? undefined : audioSrc ?? undefined}
        preload="metadata"
        onPlay={() => {
          audioFailuresRef.current = 0;
          setSkipNotice(null);
          syncPlaying();
        }}
        onPause={syncPlaying}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const next = event.currentTarget.duration;
          if (Number.isFinite(next) && next > 0) setDuration(next);
        }}
        onEnded={() => step(1)}
        onError={handleAudioError}
      />

      <AnimatePresence>
        {current && queue && !dockHidden && (
          <motion.div
            ref={dockRef}
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

              {skipNotice && (
                <p className="playlist-dock-skip" role="status">
                  {skipNotice.text}
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
                className="playlist-dock-min"
                onClick={() => setDockHidden(true)}
                aria-label="收起播放器（音乐继续播放）"
                title="收起播放器，音乐继续播放"
              >
                ▾
              </button>
              <button
                type="button"
                className="playlist-dock-close"
                onClick={stop}
                aria-label="停止播放并关闭播放器"
                title="停止播放并关闭"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {current && queue && dockHidden && (
          <motion.button
            ref={restoreRef}
            type="button"
            className="playlist-restore"
            onClick={() => setDockHidden(false)}
            aria-label={`展开播放器：${current.title}`}
            title="展开播放器"
            data-playing={playing ? "true" : "false"}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <span
              className="playlist-restore-disc"
              data-spin={playing ? "true" : "false"}
            >
              {cover ? (
                <img src={cover} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span>{current.title.slice(0, 1)}</span>
              )}
            </span>
            <span className="playlist-restore-caret" aria-hidden="true">
              ▴
            </span>
          </motion.button>
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