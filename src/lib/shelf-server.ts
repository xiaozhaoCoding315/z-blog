import { cacheLife, cacheTag } from "next/cache";
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { shelfItems as shelfTable } from "@/db/schema";
import { formatDay } from "@/lib/life";
import type { ShelfType } from "@/lib/community-input";

export interface ShelfItemView {
  id: number;
  type: ShelfType;
  title: string;
  creator: string;
  rating: number | null;
  note: string;
  coverUrl: string | null;
  finishedAt: string | null;
  date: string;
}

/**
 * 公开书架：只读已收录的条目。连不上时 available: false，
 * 页面显示 NOT AVAILABLE，不拿空数组冒充「书架还空着」。
 */
export async function getShelfItems(): Promise<{
  available: boolean;
  items: ShelfItemView[];
}> {
  return getShelfItemsCached();
}

async function getShelfItemsCached(): Promise<{
  available: boolean;
  items: ShelfItemView[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shelf");

  const db = getDb();
  if (!db) return { available: false, items: [] };

  try {
    const rows = await db
      .select()
      .from(shelfTable)
      // Postgres 的 DESC 默认 NULLS FIRST，没有完成日期的条目会跑到最前；
      // 这里显式 NULLS LAST，再用创建时间与 id 兜底。
      .orderBy(
        sql`${shelfTable.finishedAt} DESC NULLS LAST`,
        desc(shelfTable.createdAt),
        desc(shelfTable.id)
      );

    return {
      available: true,
      items: rows.map((row) => ({
        id: row.id,
        type: row.type === "film" || row.type === "music" ? row.type : "book",
        title: row.title,
        creator: row.creator,
        rating: row.rating,
        note: row.note,
        coverUrl: row.coverUrl,
        finishedAt: row.finishedAt,
        date: row.finishedAt
          ? row.finishedAt.replaceAll("-", ".")
          : formatDay(row.createdAt.toISOString()),
      })),
    };
  } catch {
    return { available: false, items: [] };
  }
}
