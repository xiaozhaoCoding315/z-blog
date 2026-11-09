import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  comments as commentsTable,
  letters as lettersTable,
  moments as momentsTable,
  shelfItems as shelfTable,
  siteSettings,
  songs as songsTable,
  users,
} from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import {
  getDesktopPin,
  getStatusSentence,
  STATUS_KEY,
} from "@/lib/settings-server";
import { formatDay, momentExcerpt } from "@/lib/life";
import {
  addShelfItem,
  addSong,
  deleteShelfItem,
  deleteSong,
  moderateComment,
  moderateLetter,
  moderateSong,
  pinSong,
  setDesktopPin,
  updateStatus,
} from "./actions";

export const metadata: Metadata = {
  title: "审核后台",
  robots: { index: false, follow: false },
};

// 读会话与数据库，每次请求现算；后台查询不走缓存，站长操作后要立即看到结果
export const instant = false;

type Db = NonNullable<ReturnType<typeof getDb>>;
type SectionData<T> = { available: true; data: T } | { available: false };

interface AdminLetter {
  id: number;
  name: string;
  body: string;
  songTitle: string | null;
  songArtist: string | null;
  songUrl: string | null;
  date: string;
}

interface AdminSong {
  id: number;
  title: string;
  artist: string;
  url: string;
  note: string;
  recommender: string;
}

interface AdminSongEntry {
  id: number;
  title: string;
  artist: string;
  status: string;
  source: string;
  pinned: boolean;
  recommender: string | null;
}

interface AdminComment {
  id: number;
  author: string;
  targetType: string;
  targetId: string;
  body: string;
  status: string;
}

interface AdminMomentChoice {
  id: number;
  date: string;
  excerpt: string;
}

interface AdminShelfItem {
  id: number;
  type: string;
  title: string;
  creator: string;
  rating: number | null;
  finishedAt: string | null;
}

const SHELF_TYPE_LABEL: Record<string, string> = {
  book: "书",
  film: "影",
  music: "音",
};

const shelfLabelClass =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
const shelfFieldClass =
  "mt-1.5 h-9 w-full min-w-0 rounded-none border border-rule bg-transparent px-2.5 font-mono text-[13px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";
const shelfSelectClass = `${shelfFieldClass} [&>option]:bg-panel [&>option]:text-foreground`;
const shelfTextareaClass =
  "mt-1.5 w-full min-w-0 rounded-none border border-rule bg-transparent px-2.5 py-2 font-mono text-[13px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring";

function unavailable<T>(): SectionData<T> {
  return { available: false };
}

/**
 * 状态句展示仍走读层，保证与首页页头一致；
 * 但后台直连数据库探一次，确认库确实可读——读层会把查询失败
 * 悄悄回退成配置默认值，后台不能拿这个默认值冒充「当前状态句」。
 */
async function loadStatus(db: Db): Promise<SectionData<string>> {
  try {
    await db
      .select({ key: siteSettings.key })
      .from(siteSettings)
      .where(eq(siteSettings.key, STATUS_KEY))
      .limit(1);
    return { available: true, data: await getStatusSentence() };
  } catch (err) {
    console.error("[admin] 状态句读取失败：", err);
    return unavailable();
  }
}

/** 桌面便签候选：最近 20 条动态，只要 id / 日期 / 正文。 */
async function loadRecentMoments(
  db: Db
): Promise<SectionData<AdminMomentChoice[]>> {
  try {
    const rows = await db
      .select({
        id: momentsTable.id,
        publishedAt: momentsTable.publishedAt,
        body: momentsTable.body,
      })
      .from(momentsTable)
      .orderBy(desc(momentsTable.publishedAt), desc(momentsTable.id))
      .limit(20);

    return {
      available: true,
      data: rows.map((row) => ({
        id: row.id,
        date: formatDay(row.publishedAt.toISOString()),
        excerpt: momentExcerpt({ body: row.body }, 30),
      })),
    };
  } catch (err) {
    console.error("[admin] 桌面便签候选读取失败：", err);
    return unavailable();
  }
}

/** 待审留言：leftJoin users，新留言显示 login，旧留言板迁来的记录回退 guestName。 */
async function loadPendingLetters(db: Db): Promise<SectionData<AdminLetter[]>> {
  try {
    const rows = await db
      .select({
        id: lettersTable.id,
        guestName: lettersTable.guestName,
        login: users.login,
        body: lettersTable.body,
        songTitle: lettersTable.songTitle,
        songArtist: lettersTable.songArtist,
        songUrl: lettersTable.songUrl,
        createdAt: lettersTable.createdAt,
      })
      .from(lettersTable)
      .leftJoin(users, eq(users.id, lettersTable.userId))
      .where(eq(lettersTable.status, "pending"))
      .orderBy(desc(lettersTable.createdAt), desc(lettersTable.id));

    return {
      available: true,
      data: rows.map((row) => ({
        id: row.id,
        name: row.login ?? row.guestName ?? "匿名",
        body: row.body,
        songTitle: row.songTitle,
        songArtist: row.songArtist,
        songUrl: row.songUrl,
        date: formatDay(row.createdAt.toISOString()),
      })),
    };
  } catch (err) {
    console.error("[admin] 待审留言读取失败：", err);
    return unavailable();
  }
}

/** 待审歌曲：leftJoin users 拿推荐人；没有账号（用户已删）时回退「匿名」。 */
async function loadPendingSongs(db: Db): Promise<SectionData<AdminSong[]>> {
  try {
    const rows = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        artist: songsTable.artist,
        url: songsTable.url,
        note: songsTable.note,
        login: users.login,
      })
      .from(songsTable)
      .leftJoin(users, eq(users.id, songsTable.userId))
      .where(eq(songsTable.status, "pending"))
      .orderBy(desc(songsTable.createdAt), desc(songsTable.id));

    return {
      available: true,
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        url: row.url,
        note: row.note,
        recommender: row.login ?? "匿名",
      })),
    };
  } catch (err) {
    console.error("[admin] 待审歌曲读取失败：", err);
    return unavailable();
  }
}

/**
 * 歌单管理：approved + pending 都列出来，站长可直接删除。
 * 只有 approved 且 source = owner 的行能设为此刻循环；
 * pending 的通过 / 驳回仍走「待审歌曲」段。
 */
async function loadSongList(db: Db): Promise<SectionData<AdminSongEntry[]>> {
  try {
    const rows = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        artist: songsTable.artist,
        status: songsTable.status,
        source: songsTable.source,
        pinned: songsTable.pinned,
        login: users.login,
      })
      .from(songsTable)
      .leftJoin(users, eq(users.id, songsTable.userId))
      .where(inArray(songsTable.status, ["approved", "pending"]))
      .orderBy(desc(songsTable.createdAt), desc(songsTable.id));

    return {
      available: true,
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        status: row.status,
        source: row.source,
        pinned: row.pinned,
        recommender: row.login,
      })),
    };
  } catch (err) {
    console.error("[admin] 歌单读取失败：", err);
    return unavailable();
  }
}

/** 最近 50 条评论（含 hidden）；userId NOT NULL，innerJoin users 拿作者。 */
async function loadRecentComments(db: Db): Promise<SectionData<AdminComment[]>> {
  try {
    const rows = await db
      .select({
        id: commentsTable.id,
        author: users.login,
        targetType: commentsTable.targetType,
        targetId: commentsTable.targetId,
        body: commentsTable.body,
        status: commentsTable.status,
      })
      .from(commentsTable)
      .innerJoin(users, eq(users.id, commentsTable.userId))
      .orderBy(desc(commentsTable.createdAt), desc(commentsTable.id))
      .limit(50);

    return { available: true, data: rows };
  } catch (err) {
    console.error("[admin] 评论读取失败：", err);
    return unavailable();
  }
}

/**
 * 书架条目：与公开读层同一排序，finishedAt 空值后置。
 * 后台直连数据库，不走缓存——站长改完必须立即看到真实结果。
 */
async function loadShelfItems(db: Db): Promise<SectionData<AdminShelfItem[]>> {
  try {
    const rows = await db
      .select({
        id: shelfTable.id,
        type: shelfTable.type,
        title: shelfTable.title,
        creator: shelfTable.creator,
        rating: shelfTable.rating,
        finishedAt: shelfTable.finishedAt,
      })
      .from(shelfTable)
      .orderBy(
        sql`${shelfTable.finishedAt} DESC NULLS LAST`,
        desc(shelfTable.createdAt),
        desc(shelfTable.id)
      );

    return { available: true, data: rows };
  } catch (err) {
    console.error("[admin] 书架读取失败：", err);
    return unavailable();
  }
}

export default async function AdminPage() {
  await connection();
  const user = await getSessionUser();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-bold">审核后台</h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          状态句 · 桌面便签 · 待审留言 · 待审歌曲 · 评论 · 书架 · 歌单
        </p>
      </header>

      {!user ? (
        <AccessPanel
          title="这是站长入口，先登录"
          description="登录后如果账号不是站长，这里也不会显示任何审核内容。"
        >
          <Link
            href="/login"
            className="mt-4 inline-block border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
          >
            去登录
          </Link>
        </AccessPanel>
      ) : user.role !== "owner" ? (
        <AccessPanel
          title="只对站长开放"
          description="你现在是访客身份。审核数据只对站长可见。"
        />
      ) : (
        <AdminSections />
      )}
    </div>
  );
}

/**
 * 只有站长身份走到这里。每段单独查库、单独降级：
 * 某一段读不到时只把这一段标成 NOT AVAILABLE，不拿空列表冒充「没有待审」。
 */
async function AdminSections() {
  const db = getDb();
  const pin = await getDesktopPin();
  const status = db ? await loadStatus(db) : unavailable<string>();
  const momentChoices = db
    ? await loadRecentMoments(db)
    : unavailable<AdminMomentChoice[]>();
  const letters = db ? await loadPendingLetters(db) : unavailable<AdminLetter[]>();
  const songs = db ? await loadPendingSongs(db) : unavailable<AdminSong[]>();
  const comments = db ? await loadRecentComments(db) : unavailable<AdminComment[]>();
  const shelf = db ? await loadShelfItems(db) : unavailable<AdminShelfItem[]>();
  const songList = db ? await loadSongList(db) : unavailable<AdminSongEntry[]>();

  return (
    <>
      <Section title="状态句">
        {!status.available ? (
          <NotAvailable what="状态句" />
        ) : (
          <form action={updateStatus} className="mt-3 border-y border-rule py-4">
            <label
              htmlFor="status"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
            >
              首页页头状态句
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                id="status"
                name="status"
                type="text"
                required
                maxLength={40}
                defaultValue={status.data}
                className="h-9 w-full min-w-0 rounded-none border border-rule bg-transparent px-2.5 font-mono text-[13px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="shrink-0 rounded-none border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
              >
                保存
              </button>
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              显示在首页页头 · 最多 40 字
            </p>
          </form>
        )}
      </Section>

      <Section title="桌面便签">
        {!momentChoices.available ? (
          <NotAvailable what="桌面便签" />
        ) : (
          <form action={setDesktopPin} className="mt-3 border-y border-rule py-4">
            <label htmlFor="desktop-pin" className={shelfLabelClass}>
              钉在桌面右上角的动态
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                id="desktop-pin"
                name="momentId"
                defaultValue={pin ?? ""}
                className={shelfSelectClass}
              >
                <option value="">不钉选</option>
                {pin !== null &&
                  !momentChoices.data.some(
                    (item) => String(item.id) === pin
                  ) && (
                    <option value={pin}>当前钉选 #{pin}（不在最近 20 条）</option>
                  )}
                {momentChoices.data.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.date} · {item.excerpt}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="shrink-0 rounded-none border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
              >
                保存
              </button>
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              桌面便签显示日期与正文前五行 · 候选为最近 20 条
            </p>
          </form>
        )}
      </Section>

      <Section title="待审留言">
        {!letters.available ? (
          <NotAvailable what="待审留言" />
        ) : letters.data.length === 0 ? (
          <Empty>没有待审留言</Empty>
        ) : (
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {letters.data.map((letter) => (
              <li key={letter.id} className="py-4">
                <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {letter.date} · {letter.name}
                </p>
                <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-relaxed">
                  {letter.body}
                </p>
                {letter.songTitle && (
                  <p className="mt-2 break-words font-mono text-[11px] text-muted-foreground">
                    ♪ {letter.songTitle}
                    {letter.songArtist ? ` · ${letter.songArtist}` : ""}
                    {letter.songUrl && (
                      <>
                        {" · "}
                        <a
                          href={letter.songUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="link-underline text-data"
                        >
                          试听 ↗
                        </a>
                      </>
                    )}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={moderateLetter}>
                    <input type="hidden" name="id" value={letter.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button
                      type="submit"
                      className="rounded-none border border-ok px-3 py-1.5 font-mono text-[11px] text-ok transition-colors hover:text-foreground"
                    >
                      通过
                    </button>
                  </form>
                  <form action={moderateLetter}>
                    <input type="hidden" name="id" value={letter.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button
                      type="submit"
                      className="rounded-none border border-rule px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-alert hover:text-alert"
                    >
                      驳回
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="待审歌曲">
        {!songs.available ? (
          <NotAvailable what="待审歌曲" />
        ) : songs.data.length === 0 ? (
          <Empty>没有待审歌曲</Empty>
        ) : (
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {songs.data.map((song) => (
              <li key={song.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <p className="break-words font-heading text-[16px] font-bold">
                      {song.title}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {song.artist}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    推荐人 · {song.recommender}
                  </p>
                </div>
                <p className="mt-2 break-all font-mono text-[11px]">
                  <a
                    href={song.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline text-data"
                  >
                    {song.url}
                  </a>
                </p>
                {song.note && (
                  <p className="mt-2 break-words text-[14px] leading-relaxed text-muted-foreground">
                    {song.note}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={moderateSong}>
                    <input type="hidden" name="id" value={song.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button
                      type="submit"
                      className="rounded-none border border-ok px-3 py-1.5 font-mono text-[11px] text-ok transition-colors hover:text-foreground"
                    >
                      通过
                    </button>
                  </form>
                  <form action={moderateSong}>
                    <input type="hidden" name="id" value={song.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button
                      type="submit"
                      className="rounded-none border border-rule px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-alert hover:text-alert"
                    >
                      驳回
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="评论">
        {!comments.available ? (
          <NotAvailable what="评论" />
        ) : comments.data.length === 0 ? (
          <Empty>还没有评论</Empty>
        ) : (
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {comments.data.map((comment) => (
              <li key={comment.id} className="py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="break-all font-mono text-[10px] text-muted-foreground">
                    {comment.author} · {comment.targetType}/{comment.targetId}
                  </p>
                  <span
                    className={
                      comment.status === "visible"
                        ? "font-mono text-[10px] text-ok"
                        : "font-mono text-[10px] text-alert"
                    }
                  >
                    {comment.status === "visible" ? "可见" : "已隐藏"}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-relaxed">
                  {comment.body}
                </p>
                <form action={moderateComment} className="mt-3">
                  <input type="hidden" name="id" value={comment.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={comment.status === "visible" ? "hidden" : "visible"}
                  />
                  <button
                    type="submit"
                    className="rounded-none border border-rule px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {comment.status === "visible" ? "隐藏" : "恢复可见"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="书架">
        {!shelf.available ? (
          <NotAvailable what="书架" />
        ) : (
          <>
            <form action={addShelfItem} className="mt-3 border-y border-rule py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                添加一条
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="shelf-type" className={shelfLabelClass}>
                    类型
                  </label>
                  <select
                    id="shelf-type"
                    name="type"
                    defaultValue="book"
                    className={shelfSelectClass}
                  >
                    <option value="book">书</option>
                    <option value="film">影</option>
                    <option value="music">音</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="shelf-title" className={shelfLabelClass}>
                    标题
                  </label>
                  <input
                    id="shelf-title"
                    name="title"
                    type="text"
                    required
                    maxLength={120}
                    className={shelfFieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="shelf-creator" className={shelfLabelClass}>
                    作者 / 艺人
                  </label>
                  <input
                    id="shelf-creator"
                    name="creator"
                    type="text"
                    maxLength={120}
                    className={shelfFieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="shelf-rating" className={shelfLabelClass}>
                    评分
                  </label>
                  <select
                    id="shelf-rating"
                    name="rating"
                    defaultValue=""
                    className={shelfSelectClass}
                  >
                    <option value="">不评分</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="shelf-finished" className={shelfLabelClass}>
                    完成日期
                  </label>
                  <input
                    id="shelf-finished"
                    name="finishedAt"
                    type="date"
                    className={shelfFieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="shelf-cover" className={shelfLabelClass}>
                    封面地址
                  </label>
                  <input
                    id="shelf-cover"
                    name="coverUrl"
                    type="text"
                    maxLength={500}
                    placeholder="https://… 或 /images/…"
                    className={shelfFieldClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="shelf-note" className={shelfLabelClass}>
                    短评
                  </label>
                  <textarea
                    id="shelf-note"
                    name="note"
                    rows={3}
                    maxLength={200}
                    className={shelfTextareaClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-3 rounded-none border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
              >
                添加
              </button>
            </form>

            {shelf.data.length === 0 ? (
              <Empty>书架还空着</Empty>
            ) : (
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {shelf.data.map((item) => {
                  const meta = [
                    SHELF_TYPE_LABEL[item.type] ?? item.type,
                    item.creator,
                    item.rating ? `${item.rating}/5` : "未评分",
                    item.finishedAt
                      ? item.finishedAt.replaceAll("-", ".")
                      : "未标注日期",
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-[15px]">{item.title}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {meta}
                        </p>
                      </div>
                      <form action={deleteShelfItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="rounded-none border border-rule px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-alert hover:text-alert"
                        >
                          删除
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </Section>

      <Section title="歌单">
        {!songList.available ? (
          <NotAvailable what="歌单" />
        ) : (
          <>
            <form action={addSong} className="mt-3 border-y border-rule py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                添加一首
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="song-title" className={shelfLabelClass}>
                    歌名
                  </label>
                  <input
                    id="song-title"
                    name="title"
                    type="text"
                    required
                    maxLength={120}
                    className={shelfFieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="song-artist" className={shelfLabelClass}>
                    艺人
                  </label>
                  <input
                    id="song-artist"
                    name="artist"
                    type="text"
                    required
                    maxLength={120}
                    className={shelfFieldClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="song-url" className={shelfLabelClass}>
                    平台链接
                  </label>
                  <input
                    id="song-url"
                    name="url"
                    type="url"
                    required
                    maxLength={500}
                    placeholder="https://…"
                    className={shelfFieldClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="song-note" className={shelfLabelClass}>
                    推荐语
                  </label>
                  <textarea
                    id="song-note"
                    name="note"
                    rows={3}
                    maxLength={200}
                    className={shelfTextareaClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-3 rounded-none border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
              >
                添加
              </button>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                站长添加的歌直接挂在「我的歌单」；平台按链接自动识别
              </p>
            </form>

            {songList.data.length === 0 ? (
              <Empty>歌单还空着</Empty>
            ) : (
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {songList.data.map((song) => (
                  <li
                    key={song.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-[15px]">{song.title}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {song.artist}
                        {song.source === "visitor"
                          ? ` · 推荐人 ${song.recommender ?? "匿名"}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          song.status === "approved"
                            ? "font-mono text-[10px] text-ok"
                            : "font-mono text-[10px] text-wait"
                        }
                      >
                        {song.status === "approved" ? "已通过" : "待审"}
                      </span>
                      {song.pinned && (
                        <span className="font-mono text-[10px] text-data">
                          此刻循环
                        </span>
                      )}
                      {song.status === "approved" &&
                        song.source === "owner" &&
                        !song.pinned && (
                          <form action={pinSong}>
                            <input type="hidden" name="id" value={song.id} />
                            <button
                              type="submit"
                              className="rounded-none border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
                            >
                              设为此刻循环
                            </button>
                          </form>
                        )}
                      <form action={deleteSong}>
                        <input type="hidden" name="id" value={song.id} />
                        <button
                          type="submit"
                          className="rounded-none border border-rule px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-alert hover:text-alert"
                        >
                          删除
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function NotAvailable({ what }: { what: string }) {
  return (
    <div className="mt-3 border-y border-rule py-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
        Not Available
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        {what}暂时读不到。数据库现在连不上，过一会儿再刷新。
      </p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 border-y border-rule py-6 text-[14px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

function AccessPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-8 border border-rule bg-panel p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Admin
      </p>
      <h2 className="mt-3 font-heading text-[19px] font-bold">{title}</h2>
      <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children}
    </div>
  );
}
