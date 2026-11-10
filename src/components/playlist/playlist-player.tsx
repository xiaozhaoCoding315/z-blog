"use client";

import { useMusic } from "@/components/playlist/music-provider";
import type { TrackView } from "@/lib/songs-server";
import {
  formatDuration,
  isDirectAudioUrl,
  neteaseOuterAudioUrl,
} from "@/lib/playlist-core";

/**
 * 歌单页的队列列表。
 *
 * 音频和 dock 由站点级的 MusicProvider 持有，所以从这里点一首歌之后，
 * 跳到笔记、文章或项目页，播放都不会中断。
 *
 * 网易云曲目优先走官方 outer 直链（<audio>，能暂停、拖进度、自动下一首）；
 * 版权受限的曲目 outer 会落到 404，此时回退到官方 outchain iframe；
 * QQ 音乐没有可嵌入的官方播放器，老老实实跳转，不假装站内能放。
 */
export function PlaylistPlayer({
  playlistTitle,
  playlistCover,
  tracks,
}: {
  playlistTitle: string;
  playlistCover: string | null;
  tracks: TrackView[];
}) {
  const { current, playing, playQueue, toggle } = useMusic();
  const playableCount = tracks.filter(
    (track) => directAudioSrc(track) || canEmbed(track)
  ).length;

  return (
    <div className="playlist-player" data-playing={playing ? "true" : "false"}>
      <div className="playlist-player-head">
        <p>
          曲目 <span>{tracks.length}</span>
        </p>
        <p>
          站内可播 <span>{playableCount}</span>
          <em>VIP / 版权受限自动转官方播放器</em>
        </p>
      </div>

      <ol className="playlist-track-list">
        {tracks.map((track, index) => {
          const inSite = Boolean(directAudioSrc(track) || canEmbed(track));
          const active = current?.id === track.id;
          const body = (
            <>
              <span className="playlist-track-cover" aria-hidden="true">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <span>{track.title.slice(0, 1)}</span>
                )}
                {active && (
                  <span className="playlist-track-eq" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </span>
              <span className="playlist-track-copy">
                <span className="playlist-track-title">{track.title}</span>
                <span className="playlist-track-artist">{track.artist}</span>
              </span>
              <span className="playlist-track-time">{formatDuration(track.duration)}</span>
              <span
                className={inSite ? "playlist-track-action" : "playlist-track-action is-external"}
                aria-hidden="true"
              >
                {inSite ? (active && playing ? "▮▮" : "▶") : "↗"}
              </span>
            </>
          );

          return (
            <li key={track.id} data-active={active ? "true" : "false"} className="playlist-track">
              {inSite ? (
                <button
                  type="button"
                  className="playlist-track-main"
                  onClick={() => {
                    if (active) {
                      toggle();
                      return;
                    }
                    playQueue(tracks, index, {
                      title: playlistTitle,
                      cover: playlistCover,
                    });
                  }}
                  aria-label={`${active && playing ? "暂停" : "播放"} ${track.title} — ${track.artist}`}
                >
                  {body}
                </button>
              ) : (
                <a
                  href={track.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="playlist-track-main"
                  title={`在 ${track.platform === "qq" ? "QQ 音乐" : "外部页面"}打开`}
                >
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </div>
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