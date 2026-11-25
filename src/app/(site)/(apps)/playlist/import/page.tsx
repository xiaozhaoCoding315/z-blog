import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getLinkedNetease } from "@/lib/music-server";
import { PlaylistImportForm } from "@/components/playlist/playlist-import-form";
import { MusicLinkPanel } from "@/components/playlist/music-link-panel";

export const metadata: Metadata = {
  title: "导入歌单",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function PlaylistImportPage() {
  await connection();
  const user = await getSessionUser();
  const linked = user?.role === "owner" ? await getLinkedNetease(user.id) : null;

  return (
    <div className="playlist-import-page">
      <header data-reveal>
        <p className="playlist-import-eyebrow">PLAYLIST IMPORT · 站长入口</p>
        <h1>把歌单搬进来，然后开听</h1>
        <p>
          扫码绑定网易云账号，可以一键导入账号里的歌单；不绑定也能直接粘贴
          网易云 / QQ 音乐的分享文案（整段文字，不用自己挑链接）。
          平台接口不可用时，仍可以用「歌名 - 歌手」手动建一张。
        </p>
      </header>

      {!user ? (
        <div className="playlist-import-gate">
          <h2>先登录站长账号</h2>
          <p>导入会写入站内歌单，只有站长能操作。访客可以在歌单页推荐单曲。</p>
          <Link href="/login?next=/playlist/import">去登录</Link>
        </div>
      ) : user.role !== "owner" ? (
        <div className="playlist-import-gate">
          <h2>只对站长开放</h2>
          <p>你现在是访客身份，可以浏览歌单、在站内听歌，也可以推荐一首。</p>
          <Link href="/playlist">回歌单页</Link>
        </div>
      ) : (
        <>
          <MusicLinkPanel
            linked={
              linked
                ? {
                    nickname: linked.account.nickname,
                    avatarUrl: linked.account.avatarUrl,
                    externalUserId: linked.account.externalUserId,
                  }
                : null
            }
            playlists={linked?.playlists ?? []}
          />

          <div className="playlist-import-notes">
            <div>
              <span>01</span>
              <p>导入的曲目直接公开，不再逐首审核；平台删掉的歌，重新导入即可同步。</p>
            </div>
            <div>
              <span>02</span>
              <p>同一张平台歌单重复导入会整张替换，不会叠出两份。</p>
            </div>
            <div>
              <span>03</span>
              <p>
                网易云多数曲目可用站内播放器暂停、拖进度；版权受限时自动切到官方播放器。
                QQ 音乐受版权限制，跳到官方页面。
              </p>
            </div>
          </div>

          <PlaylistImportForm />
        </>
      )}
    </div>
  );
}