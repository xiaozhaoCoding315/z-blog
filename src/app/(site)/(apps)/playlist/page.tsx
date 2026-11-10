import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { loginReady } from "@/lib/login-status";
import {
  getApprovedPlaylists,
  getSongsForViewer,
  type PlaylistView,
} from "@/lib/songs-server";
import { PLATFORM_LABEL, SongRow } from "@/components/playlist/song-row";
import { SongForm } from "@/components/playlist/song-form";

export const metadata: Metadata = { title: "歌单" };

// 读会话与数据库，每次请求现算
export const instant = false;

const PLAYLIST_PLATFORM_LABEL = {
  netease: "网易云",
  qq: "QQ 音乐",
  other: "手动",
} as const;

export default async function PlaylistPage() {
  await connection();
  const user = await getSessionUser();
  const [songs, playlists] = await Promise.all([
    getSongsForViewer(user?.id ?? null),
    getApprovedPlaylists(),
  ]);
  const ready = loginReady();

  // 读数只数已通过的；自己的待审另报，不能混进「已通过」
  const approvedCount = songs.songs.filter((song) => !song.pending).length;
  const pendingCount = songs.songs.filter((song) => song.pending).length;

  // 「此刻循环」只展示站长自己的歌：访客推荐即使被误 pin 也不该占这一格
  const pinnedSong = songs.songs.find(
    (song) => song.pinned && !song.pending && song.source === "owner"
  );
  const ownerSingles = songs.songs.filter(
    (song) => song.source === "owner" && !song.pinned && !song.pending
  );
  const recommended = songs.songs.filter(
    (song) => song.source === "visitor" && !song.pending
  );
  const pendingSongs = songs.songs.filter((song) => song.pending);

  const pinnedPlaylist = playlists.playlists.find((playlist) => playlist.pinned);
  const otherPlaylists = playlists.playlists.filter(
    (playlist) => !playlist.pinned
  );

  return (
    <div className="playlist-page">
      <header className="playlist-page-head">
        <div>
          <p className="playlist-page-eyebrow">LISTENING ROOM · 随时开听</p>
          <h1>歌单</h1>
          <p>
            站长从网易云和 QQ 音乐整张导入，曲目可以直接在站内播放；
            也留着访客推荐单曲的位置。没有假装能播的条目。
          </p>
        </div>
        <div className="playlist-page-head-side">
          <p>
            {approvedCount} 首单曲 · {playlists.playlists.length} 张歌单
            {pendingCount > 0 && ` · ${pendingCount} 首待审`}
          </p>
          {user?.role === "owner" && (
            <Link href="/playlist/import" className="playlist-import-link">
              导入歌单
            </Link>
          )}
        </div>
      </header>

      {!songs.available || !playlists.available ? (
        <div className="playlist-unavailable">
          <p className="playlist-unavailable-code">NOT AVAILABLE</p>
          <h2>歌单暂时读不到</h2>
          <p>数据库现在连不上。已有的歌没有丢，过一会儿再刷新。</p>
        </div>
      ) : (
        <>
          <section className="playlist-feature" aria-labelledby="playlist-feature-title">
            <h2 id="playlist-feature-title" className="sr-only">
              推荐歌单
            </h2>
            {pinnedPlaylist ? (
              <FeaturedPlaylist playlist={pinnedPlaylist} />
            ) : (
              <div className="playlist-feature-empty">
                <p className="playlist-page-eyebrow">FEATURED</p>
                <h3>还没有推荐歌单</h3>
                <p>
                  {user?.role === "owner"
                    ? "导入一张歌单后，可以在后台把它设为推荐位。"
                    : "站长还没有挂出推荐歌单，先听下面的单曲。"}
                </p>
                {user?.role === "owner" && (
                  <Link href="/playlist/import">导入第一张</Link>
                )}
              </div>
            )}

            {pinnedSong && (
              <a
                href={pinnedSong.url}
                target="_blank"
                rel="noreferrer noopener"
                className="playlist-now-spinning"
              >
                <span className="playlist-now-label">此刻循环</span>
                <span className="playlist-now-disc" aria-hidden="true">
                  <i />
                </span>
                <span className="playlist-now-copy">
                  <strong>{pinnedSong.title}</strong>
                  <small>
                    {pinnedSong.artist} · {PLATFORM_LABEL[pinnedSong.platform]}
                  </small>
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </section>

          <section className="playlist-shelf" aria-labelledby="playlist-shelf-title">
            <header className="playlist-section-head">
              <div>
                <h2 id="playlist-shelf-title">站长的歌单</h2>
                <p>整张导入，点进任意一张就能连续听。</p>
              </div>
              {playlists.playlists.length > 0 && (
                <span>{playlists.playlists.length} 张</span>
              )}
            </header>
            {playlists.playlists.length === 0 ? (
              <p className="playlist-empty">
                还没有导入歌单。
                {user?.role === "owner"
                  ? "把网易云或 QQ 音乐的分享链接粘进来就行。"
                  : "站长随时会放新的进来。"}
              </p>
            ) : (
              <div className="playlist-grid">
                {(pinnedPlaylist
                  ? [pinnedPlaylist, ...otherPlaylists]
                  : otherPlaylists
                ).map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            )}
          </section>

          {ownerSingles.length > 0 && (
            <section className="playlist-singles" aria-labelledby="playlist-singles-title">
              <header className="playlist-section-head">
                <div>
                  <h2 id="playlist-singles-title">站长单曲</h2>
                  <p>没有归进歌单的零散推荐。</p>
                </div>
                <span>{ownerSingles.length} 首</span>
              </header>
              <div className="song-list">
                {ownerSingles.map((song) => (
                  <SongRow key={song.id} song={song} />
                ))}
              </div>
            </section>
          )}

          <section
            id="recommend"
            className="playlist-recommendations"
            aria-labelledby="playlist-recommendations-title"
          >
            <header className="playlist-section-head">
              <div>
                <h2 id="playlist-recommendations-title">大家推荐的</h2>
                <p>访客推荐的单曲，站长听过才挂出来。</p>
              </div>
              <span>{recommended.length} 首</span>
            </header>
            {recommended.length === 0 ? (
              <p className="playlist-empty">还没有人推荐。第一首可以是你推的。</p>
            ) : (
              <div className="song-list">
                {recommended.map((song) => (
                  <SongRow key={song.id} song={song} />
                ))}
              </div>
            )}
          </section>

          {pendingSongs.length > 0 && (
            <section className="playlist-pending" aria-labelledby="playlist-pending-title">
              <header className="playlist-section-head">
                <div>
                  <h2 id="playlist-pending-title">我的待审</h2>
                  <p>只有你和站长看得到。</p>
                </div>
                <span>{pendingSongs.length} 首</span>
              </header>
              <div className="song-list">
                {pendingSongs.map((song) => (
                  <SongRow key={song.id} song={song} />
                ))}
              </div>
            </section>
          )}

          <section className="playlist-submit" aria-labelledby="playlist-submit-title">
            <div>
              <h2 id="playlist-submit-title">推荐一首</h2>
              <p>
                填歌名、艺人和平台链接，写一句推荐语。登录后提交，站长听过了才会挂出来。
              </p>
            </div>
            <div className="playlist-submit-body">
              {user ? (
                <SongForm />
              ) : ready ? (
                <div className="playlist-login-cta">
                  <Link href="/login?next=/playlist">去登录</Link>
                  <span>推荐需要登录；提交后待审，只有你和站长看得到</span>
                </div>
              ) : (
                <div className="playlist-unavailable">
                  <p className="playlist-unavailable-code">NOT AVAILABLE</p>
                  <p>
                    服务器还没配置会话密钥或发信账号，暂时收不了推荐。浏览不受影响。
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FeaturedPlaylist({ playlist }: { playlist: PlaylistView }) {
  return (
    <Link href={`/playlist/${playlist.id}`} className="playlist-feature-card">
      <div className="playlist-feature-cover">
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
      <div className="playlist-feature-copy">
        <p className="playlist-page-eyebrow">PINNED · 站长推荐</p>
        <h3>{playlist.title}</h3>
        <p>
          {playlist.description ||
            "一张完整的歌单，点进去从第一首开始听。"}
        </p>
        <div className="playlist-feature-meta">
          <span>{playlist.songCount} 首</span>
          <span>{PLAYLIST_PLATFORM_LABEL[playlist.platform]}</span>
          <span className="playlist-feature-play">开始听 →</span>
        </div>
      </div>
    </Link>
  );
}

function PlaylistCard({ playlist }: { playlist: PlaylistView }) {
  return (
    <Link href={`/playlist/${playlist.id}`} className="playlist-card">
      <span className="playlist-card-cover">
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={`${playlist.title} 封面`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span aria-hidden="true">{playlist.title.slice(0, 1)}</span>
        )}
        <span className="playlist-card-platform">
          {PLAYLIST_PLATFORM_LABEL[playlist.platform]}
        </span>
      </span>
      <span className="playlist-card-copy">
        <strong>{playlist.title}</strong>
        <small>
          {playlist.songCount} 首 · {playlist.date}
        </small>
        {playlist.description && <span>{playlist.description}</span>}
      </span>
    </Link>
  );
}