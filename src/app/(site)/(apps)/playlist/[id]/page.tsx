import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPlaylistDetail } from "@/lib/songs-server";
import { PlaylistPlayer } from "@/components/playlist/playlist-player";
import { ImportNotice } from "@/components/playlist/import-notice";
import { pinPlaylist, unpinPlaylist } from "@/app/(site)/(apps)/playlist/import-actions";
import { profileHref } from "@/lib/profile-core";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    imported?: string;
    skipped?: string;
    checked?: string;
  }>;
}) {
  await connection();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const numeric = Number(id);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) notFound();

  const [user, result] = await Promise.all([
    getSessionUser(),
    getPlaylistDetail(numeric),
  ]);
  const importedCount = Number(query.imported);
  const skippedCount = Number(query.skipped);
  const showImportNotice =
    Number.isSafeInteger(importedCount) && importedCount >= 0;

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

      {showImportNotice && (
        <ImportNotice
          imported={importedCount}
          skipped={Number.isSafeInteger(skippedCount) ? skippedCount : 0}
          checked={query.checked === "1"}
        />
      )}

      <header
        className="playlist-detail-hero"
        data-spotlight
        data-reveal
      >
        <div
          className="playlist-detail-cover"
          data-empty={playlist.coverUrl ? "false" : "true"}
          data-tilt
        >
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
            {playlist.pinned
              ? "PINNED · 站长推荐"
              : playlist.suggestedBy
                ? "COMMUNITY · 大家推荐"
                : "PLAYLIST · 站长歌单"}
          </p>
          <h1>{playlist.title}</h1>
          {playlist.description && <p>{playlist.description}</p>}
          {playlist.suggestedBy && (
            <p className="playlist-detail-suggester">
              由{" "}
              <Link href={profileHref(playlist.suggestedBy.id) ?? "/playlist"}>
                {playlist.suggestedBy.name}
              </Link>{" "}
              推荐
              {playlist.suggestionNote ? `：「${playlist.suggestionNote}」` : ""}
            </p>
          )}
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
              <>
                <Link href="/playlist/import">再导入一张</Link>
                <form
                  action={playlist.pinned ? unpinPlaylist : pinPlaylist}
                  className="playlist-detail-pin"
                >
                  <input type="hidden" name="id" value={playlist.id} />
                  <button type="submit">
                    {playlist.pinned ? "取消推荐位" : "设为推荐位"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </header>

      {playlist.songs.length === 0 ? (
        <p className="playlist-detail-empty">这张歌单还没有曲目。</p>
      ) : (
        <PlaylistPlayer
          playlistTitle={playlist.title}
          playlistCover={playlist.coverUrl}
          tracks={playlist.songs}
        />
      )}

      <footer className="playlist-detail-note" data-reveal>
        <p>
          网易云曲目优先用站内播放器直接播放，可暂停、拖动进度、自动下一首；
          版权受限的曲目会自动切到官方播放器。QQ 音乐没有官方嵌入播放器，
          点击曲目会跳到官方页面收听。没有可播放来源的条目不会伪装成能播。
        </p>
        <Link href="/playlist#recommend">我也想推荐一张</Link>
      </footer>
    </div>
  );
}