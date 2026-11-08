import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { loginReady } from "@/lib/login-status";
import { getSongsForViewer } from "@/lib/songs-server";
import { PLATFORM_LABEL, SongRow } from "@/components/playlist/song-row";
import { SongForm } from "@/components/playlist/song-form";

export const metadata: Metadata = { title: "歌单" };

// 读会话与数据库，每次请求现算
export const instant = false;

export default async function PlaylistPage() {
  await connection();
  const user = await getSessionUser();
  const songs = await getSongsForViewer(user?.id ?? null);
  const ready = loginReady();

  // 读数只数已通过的；自己的待审另报，不能混进「已通过」
  const approvedCount = songs.songs.filter((song) => !song.pending).length;
  const pendingCount = songs.songs.filter((song) => song.pending).length;

  const pinned = songs.songs.find((song) => song.pinned && !song.pending);
  const mine = songs.songs.filter(
    (song) => song.source === "owner" && !song.pinned && !song.pending
  );
  const recommended = songs.songs.filter(
    (song) => song.source === "visitor" && !song.pending
  );
  const pendingSongs = songs.songs.filter((song) => song.pending);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-bold">歌单</h1>
        {songs.available && (
          <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
            {approvedCount} 首 · 已通过
            {pendingCount > 0 && ` · ${pendingCount} 首待审`}
          </p>
        )}
      </header>

      {!songs.available ? (
        <div className="mt-8 border border-rule bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h2 className="mt-3 font-heading text-[19px] font-bold">
            歌单暂时读不到
          </h2>
          <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
            数据库现在连不上。已有的歌没有丢，过一会儿再刷新。
          </p>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              此刻循环
            </h2>
            {pinned ? (
              <a
                href={pinned.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group mt-3 block border border-rule bg-panel p-6 transition-colors hover:bg-panel-2"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-data">
                  {PLATFORM_LABEL[pinned.platform]} ↗
                </span>
                <span className="mt-3 block font-heading text-2xl font-bold group-hover:text-data">
                  {pinned.title}
                </span>
                <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                  {pinned.artist}
                </span>
                {pinned.note && (
                  <span className="mt-2 block text-[14px] leading-relaxed text-muted-foreground">
                    {pinned.note}
                  </span>
                )}
              </a>
            ) : (
              <p className="mt-3 border border-rule bg-panel-2 p-6 text-[14px] leading-relaxed text-muted-foreground">
                还没有设定此刻循环
              </p>
            )}
          </section>

          <section className="mt-12">
            <h2 className="font-heading text-[19px] font-bold">我的歌单</h2>
            {mine.length === 0 ? (
              <p className="mt-3 border-y border-rule py-6 text-[14px] leading-relaxed text-muted-foreground">
                还没有添加歌曲。
              </p>
            ) : (
              <div className="mt-3 border-t border-rule">
                {mine.map((song) => (
                  <SongRow key={song.id} song={song} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-12">
            <h2 className="font-heading text-[19px] font-bold">大家推荐的</h2>
            {recommended.length === 0 ? (
              <p className="mt-3 border-y border-rule py-6 text-[14px] leading-relaxed text-muted-foreground">
                还没有人推荐。
              </p>
            ) : (
              <div className="mt-3 border-t border-rule">
                {recommended.map((song) => (
                  <SongRow key={song.id} song={song} />
                ))}
              </div>
            )}
          </section>

          {pendingSongs.length > 0 && (
            <section className="mt-12">
              <h2 className="font-heading text-[19px] font-bold">我的待审</h2>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                只有你和站长看得到
              </p>
              <div className="mt-3 border-t border-rule">
                {pendingSongs.map((song) => (
                  <SongRow key={song.id} song={song} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="font-heading text-[19px] font-bold">推荐一首</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          填歌名、艺人和平台链接，写一句推荐语。登录后提交，站长听过了才会挂出来。
        </p>
        <div className="mt-6">
          {user ? (
            <SongForm />
          ) : ready ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
              >
                去登录
              </Link>
              <span className="font-mono text-[10px] text-muted-foreground">
                推荐需要登录；提交后待审
              </span>
            </div>
          ) : (
            <div className="border border-rule bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
                Not Available
              </p>
              <h3 className="mt-3 font-heading text-[19px] font-bold">
                登录暂未开放
              </h3>
              <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
                服务器还没配置会话密钥（AUTH_SECRET / SYNC_SECRET）或发信账号（SMTP_USER / SMTP_PASS），暂时收不了推荐。浏览不受影响。
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
