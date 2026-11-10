import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPlaylistDetail } from "@/lib/songs-server";
import { PlaylistPlayer } from "@/components/playlist/playlist-player";

export const instant = false;

const PLATFORM_LABEL = {
  netease: "网易云音乐",
  qq: "QQ 音乐",
  other: "手动歌单",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) {
    return { title: "歌单" };
  }
  const { playlist } = await getPlaylistDetail(numeric);
  if (!playlist) return { title: "歌单" };
  return {
    title: playlist.title,
    description:
      playlist.description ||
      `${playlist.title}，共 ${playlist.songCount} 首，来自${PLATFORM_LABEL[playlist.platform]}。`,
  };
}

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) notFound();

  const [user, result] = await Promise.all([
    getSessionUser(),
    getPlaylistDetail(numeric),
  ]);

  if (!result.available) {
    return (
      <div className="playlist-detail-page">
        <div className="playlist-detail-unavailable">
          <p>NOT AVAILABLE</p>
          <h1>歌单暂时读不到</h1>
          <p>数据库现在连不上。曲目没有丢，过一会儿再刷新。</p>
          <Link href="/playlist">回歌单页</Link>
        </div>
      </div>
    );
  }
  if (!result.playlist) notFound();
  const playlist = result.playlist;

  return (
    <div className="playlist-detail-page">
      <nav className="playlist-detail-breadcrumb" aria-label="返回">
        <Link href="/playlist">← 全部歌单</Link>
        <span>{PLATFORM_LABEL[playlist.platform]}</span>
      </nav>

      <header className="playlist-detail-hero">
        <div className="playlist-detail-cover" data-empty={playlist.coverUrl ? "false" : "true"}>
          {playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={`${playlist.title} 封面`}
              loading="eager"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span aria-hidden="true">{playlist.title.slice(0, 1)}</span>
          )}
        </div>
        <div className="playlist-detail-copy">
          <p className="playlist-detail-platform">
            {playlist.pinned ? "PINNED · 站长推荐" : "PLAYLIST · 站长歌单"}
          </p>
          <h1>{playlist.title}</h1>
          {playlist.description && <p>{playlist.description}</p>}
          <div className="playlist-detail-meta">
            <span>{playlist.songCount} 首</span>
            <span>{playlist.date}</span>
            {playlist.externalUrl && (
              <a
                href={playlist.externalUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                平台原歌单 ↗
              </a>
            )}
            {user?.role === "owner" && (
              <Link href="/playlist/import">再导入一张</Link>
            )}
          </div>
        </div>
      </header>

      {playlist.songs.length === 0 ? (
        <p className="playlist-detail-empty">这张歌单还没有曲目。</p>
      ) : (
        <PlaylistPlayer playlistTitle={playlist.title} tracks={playlist.songs} />
      )}

      <footer className="playlist-detail-note">
        <p>
          网易云曲目由官方外链播放器站内播放；QQ 音乐受版权限制，点击曲目会跳到官方页面收听。
          没有可嵌入播放器的条目不会伪装成能播。
        </p>
        <Link href="/playlist#recommend">我也想推荐一首</Link>
      </footer>
    </div>
  );
}