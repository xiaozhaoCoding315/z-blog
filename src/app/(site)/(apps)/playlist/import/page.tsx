import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { PlaylistImportForm } from "@/components/playlist/playlist-import-form";

export const metadata: Metadata = {
  title: "导入歌单",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function PlaylistImportPage() {
  await connection();
  const user = await getSessionUser();

  return (
    <div className="playlist-import-page">
      <header>
        <p className="playlist-import-eyebrow">PLAYLIST IMPORT · 站长入口</p>
        <h1>把一张歌单搬进来</h1>
        <p>
          粘贴网易云或 QQ 音乐的公开歌单链接，服务端会读取标题、封面与曲目。
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
              <p>网易云用官方外链播放器站内播放；QQ 音乐受版权限制，跳到官方页面。</p>
            </div>
          </div>
          <PlaylistImportForm />
        </>
      )}
    </div>
  );
}