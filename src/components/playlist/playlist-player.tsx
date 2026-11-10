"use client";

import { useState } from "react";
import type { TrackView } from "@/lib/songs-server";
import {
  formatDuration,
  isDirectAudioUrl,
  neteaseEmbedUrl,
} from "@/lib/playlist-core";

function canPlayInline(track: TrackView): boolean {
  return (
    (track.platform === "netease" && Boolean(track.externalId)) ||
    isDirectAudioUrl(track.url)
  );
}

/**
 * 站内播放器：点击曲目后在页面底部展开一条固定播放条。
 *
 * 网易云走官方 outchain 播放器（iframe，不需要密钥）；直接音频走原生 <audio>；
 * QQ 音乐没有可嵌入的官方播放器，老老实实跳转，不假装站内能放。
 * iframe 没有播放事件，所以不自动切歌，只给上一首 / 下一首。
 */
export function PlaylistPlayer({
  playlistTitle,
  tracks,
}: {
  playlistTitle: string;
  tracks: TrackView[];
}) {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const current =
    currentIndex === null ? null : tracks[currentIndex] ?? null;
  const playableCount = tracks.filter(canPlayInline).length;

  const play = (index: number) => {
    const track = tracks[index];
    if (!track || !canPlayInline(track)) return;
    setCurrentIndex(index);
  };

  const step = (delta: number) => {
    if (currentIndex === null) return;
    for (let offset = 1; offset <= tracks.length; offset += 1) {
      const next =
        (currentIndex + delta * offset + tracks.length) % tracks.length;
      if (canPlayInline(tracks[next])) {
        setCurrentIndex(next);
        return;
      }
    }
  };

  return (
    <div className="playlist-player" data-playing={current ? "true" : "false"}>
      <div className="playlist-player-head">
        <p>
          曲目 <span>{tracks.length}</span>
        </p>
        <p>
          可站内播放 <span>{playableCount}</span>
          {playableCount < tracks.length && (
            <em>其余为平台外链</em>
          )}
        </p>
      </div>

      <ol className="playlist-track-list">
        {tracks.map((track, index) => {
          const playable = canPlayInline(track);
          const active = currentIndex === index;
          const content = (
            <>
              <span className="playlist-track-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="playlist-track-copy">
                <span className="playlist-track-title">{track.title}</span>
                <span className="playlist-track-artist">{track.artist}</span>
              </span>
              <span className="playlist-track-time">
                {formatDuration(track.duration)}
              </span>
              <span
                className={
                  playable
                    ? "playlist-track-action"
                    : "playlist-track-action is-external"
                }
                aria-hidden="true"
              >
                {playable ? (active ? "▮▮" : "▶") : "↗"}
              </span>
            </>
          );

          return (
            <li
              key={track.id}
              data-active={active ? "true" : "false"}
              className="playlist-track"
            >
              {playable ? (
                <button
                  type="button"
                  className="playlist-track-main"
                  onClick={() => play(index)}
                  aria-label={`播放 ${track.title} — ${track.artist}`}
                >
                  {content}
                </button>
              ) : (
                <a
                  href={track.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="playlist-track-main"
                  title={`在 ${
                    track.platform === "qq" ? "QQ 音乐" : "外部页面"
                  }打开`}
                >
                  {content}
                </a>
              )}
            </li>
          );
        })}
      </ol>

      {current && (
        <div className="playlist-dock" role="region" aria-label="正在播放">
          <div className="playlist-dock-meta">
            <span className="playlist-dock-label">NOW PLAYING</span>
            <p className="playlist-dock-title">{current.title}</p>
            <p className="playlist-dock-artist">
              {current.artist} · {playlistTitle}
            </p>
          </div>

          <div className="playlist-dock-stage">
            {current.platform === "netease" && current.externalId ? (
              <iframe
                key={current.externalId}
                title={`网易云播放器：${current.title}`}
                src={neteaseEmbedUrl(current.externalId)}
                height={66}
                allow="autoplay; encrypted-media"
              />
            ) : isDirectAudioUrl(current.url) ? (
              <audio
                key={current.url}
                src={current.url}
                controls
                autoPlay
                preload="metadata"
              />
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

          <div className="playlist-dock-controls">
            <button type="button" onClick={() => step(-1)} aria-label="上一首">
              ‹
            </button>
            <button type="button" onClick={() => step(1)} aria-label="下一首">
              ›
            </button>
            <button
              type="button"
              className="playlist-dock-close"
              onClick={() => setCurrentIndex(null)}
              aria-label="收起播放器"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}