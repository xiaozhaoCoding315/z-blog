import Link from "next/link";
import type { SongView } from "@/lib/songs-server";
import { profileHref } from "@/lib/profile-core";
import { UserAvatar } from "@/components/site/user-avatar";

export const PLATFORM_LABEL = {
  netease: "NETEASE",
  qq: "QQ MUSIC",
  other: "LINK",
} as const;

/**
 * 一行一首歌：标题与平台是外链，推荐人是独立的站内链接。
 *
 * 不能把推荐人链接嵌进整行 <a> 里——那是嵌套交互元素，键盘和读屏都会乱。
 * 推荐人只在访客推荐上显示：站长自己的歌不需要署名。
 */
export function SongRow({ song }: { song: SongView }) {
  const recommenderHref =
    song.source === "visitor" ? profileHref(song.recommenderId) : null;

  return (
    <div className="song-row">
      <span className="song-row-platform">
        {PLATFORM_LABEL[song.platform]}
      </span>
      <a
        href={song.url}
        target="_blank"
        rel="noreferrer noopener"
        className="song-row-main"
      >
        <span className="song-row-title">{song.title}</span>
        <span className="song-row-meta">
          {song.artist}
          {song.note ? ` · ${song.note}` : ""}
        </span>
      </a>
      {song.source === "visitor" && song.recommender && (
        <span className="song-row-recommender">
          {recommenderHref ? (
            <Link href={recommenderHref} className="song-row-recommender-link">
              <UserAvatar
                name={song.recommender}
                avatarUrl={song.recommenderAvatarUrl}
                size="sm"
              />
              {song.recommender}
            </Link>
          ) : (
            song.recommender
          )}
        </span>
      )}
      {song.pinned && <span className="song-row-state is-pin">PINNED</span>}
      {song.pending && <span className="song-row-state is-wait">PENDING</span>}
    </div>
  );
}