import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { letters as lettersTable, users } from "@/db/schema";
import { formatDay } from "@/lib/life";

export interface LetterView {
  id: number;
  name: string;
  body: string;
  songTitle: string | null;
  songArtist: string | null;
  songUrl: string | null;
  date: string;
  pending: boolean;
}

export interface LettersResult {
  available: boolean;
  letters: LetterView[];
}

/**
 * 公开留言：只读 approved。旧留言板迁来的记录没有 userId，用 guestName。
 * 连不上时 available: false——首页与信箱都要显示 NOT AVAILABLE，不给空数组冒充「还没人留言」。
 */
export async function getApprovedLetters(limit = 100): Promise<LettersResult> {
  return getApprovedLettersCached(limit);
}

async function getApprovedLettersCached(limit: number): Promise<LettersResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("letters");

  const db = getDb();
  if (!db) return { available: false, letters: [] };

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
      .where(eq(lettersTable.status, "approved"))
      .orderBy(desc(lettersTable.createdAt), desc(lettersTable.id))
      .limit(limit);

    return { available: true, letters: rows.map((row) => toLetterView(row, "approved")) };
  } catch {
    return { available: false, letters: [] };
  }
}

/**
 * 当前用户视角：公开留言 + 自己的待审。
 * 待审查询不走缓存（每条都跟人有关），公开部分复用上面的缓存函数。
 *
 * 自己的行按真实 status 决定 pending——公开列表有 limit，
 * 落在 limit 之外的已通过留言不能因此被标成「审核中」。
 * rejected 不再展示给作者：LetterView 只有 pending 一个布尔位，
 * 表达不了第三种状态，硬塞进来会被当成已通过。
 */
export async function getLettersForViewer(
  userId: number | null,
  limit = 100
): Promise<LettersResult> {
  const publicResult = await getApprovedLetters(limit);
  if (!userId) return publicResult;

  const db = getDb();
  if (!db) return publicResult;

  try {
    const own = await db
      .select({
        id: lettersTable.id,
        guestName: lettersTable.guestName,
        login: users.login,
        body: lettersTable.body,
        songTitle: lettersTable.songTitle,
        songArtist: lettersTable.songArtist,
        songUrl: lettersTable.songUrl,
        status: lettersTable.status,
        createdAt: lettersTable.createdAt,
      })
      .from(lettersTable)
      .leftJoin(users, eq(users.id, lettersTable.userId))
      .where(
        and(
          eq(lettersTable.userId, userId),
          inArray(lettersTable.status, ["approved", "pending"])
        )
      )
      .orderBy(desc(lettersTable.createdAt), desc(lettersTable.id))
      .limit(limit);

    const existingIds = new Set(publicResult.letters.map((l) => l.id));
    const extra = own
      .filter((row) => !existingIds.has(row.id))
      .map((row) => toLetterView(row, row.status));

    return {
      available: publicResult.available,
      letters: [...publicResult.letters, ...extra],
    };
  } catch {
    return publicResult;
  }
}

function toLetterView(
  row: {
    id: number;
    guestName: string | null;
    login: string | null;
    body: string;
    songTitle: string | null;
    songArtist: string | null;
    songUrl: string | null;
    createdAt: Date;
  },
  status: string
): LetterView {
  return {
    id: row.id,
    name: row.login ?? row.guestName ?? "匿名",
    body: row.body,
    songTitle: row.songTitle,
    songArtist: row.songArtist,
    songUrl: row.songUrl,
    date: formatDay(row.createdAt.toISOString()),
    pending: status === "pending",
  };
}
