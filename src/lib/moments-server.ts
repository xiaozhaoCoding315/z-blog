import { cacheLife, cacheTag } from "next/cache";
import { asc, desc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { moments as momentsTable } from "@/db/schema";
import {
  parseMomentId,
  toMoment,
  type MomentDbRowLike,
} from "@/lib/moment-core";
import type { Moment } from "@/lib/life";

/**
 * 生活流读取层。
 *
 * 三条纪律：
 * 1. 所有查库的内层函数都 `use cache` + `cacheTag("moments")`：发布一条之后
 *    Server Action 里 `updateTag("moments")` 立刻失效，读的人马上看到新条目。
 *    按 id 读的两个入口外面还有一层非缓存壳：先把 id 校成规范十进制再进缓存，
 *    否则每个垃圾 id 都会成为缓存键（`/life/1e30` 还会把 bigint 溢出报成「库连不上」）。
 * 2. 取不到就是 available: false，调用方显示 NOT AVAILABLE，
 *    不许拿空数组冒充「还没发过」。失败读数 60 秒后就重新查库；
 *    expire 取 5 分钟是 Next 16 静态壳的下限，避免短 expire 把每个
 *    只读页都变成构建期动态洞。
 * 3. 调用方必须在 `connection()` 之后调用。否则构建期（本地构建时没有
 *    DATABASE_URL）会把「没有数据」烤进静态壳，线上一直空着。
 */

export interface MomentsResult {
  available: boolean;
  moments: Moment[];
}

export async function getMoments(): Promise<MomentsResult> {
  "use cache";
  cacheTag("moments");

  const db = getDb();
  if (!db) {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return { available: false, moments: [] };
  }

  try {
    const rows = await db
      .select()
      .from(momentsTable)
      .orderBy(desc(momentsTable.publishedAt), desc(momentsTable.id));
    cacheLife("minutes");
    return {
      available: true,
      moments: rows.map((row) => toMoment(row as MomentDbRowLike)),
    };
  } catch {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return { available: false, moments: [] };
  }
}

export async function getMomentById(id: string): Promise<{
  available: boolean;
  moment: Moment | null;
}> {
  const numeric = parseMomentId(id);
  if (numeric === null) return { available: true, moment: null };
  return getMomentByIdCached(numeric);
}

async function getMomentByIdCached(numeric: number): Promise<{
  available: boolean;
  moment: Moment | null;
}> {
  "use cache";
  cacheTag("moments");

  const db = getDb();
  if (!db) {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return { available: false, moment: null };
  }

  try {
    const [row] = await db
      .select()
      .from(momentsTable)
      .where(eq(momentsTable.id, numeric))
      .limit(1);
    cacheLife("minutes");
    return {
      available: true,
      moment: row ? toMoment(row as MomentDbRowLike) : null,
    };
  } catch {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return { available: false, moment: null };
  }
}

/**
 * 单条页的上一条 / 下一条。
 * 「上一条」指时间上更早的那条（页面上显示在下方），与生活流倒序一致。
 */
export async function getMomentNeighbors(id: string): Promise<{
  prev: Moment | null;
  next: Moment | null;
}> {
  const numeric = parseMomentId(id);
  if (numeric === null) return { prev: null, next: null };
  return getMomentNeighborsCached(numeric);
}

async function getMomentNeighborsCached(numeric: number): Promise<{
  prev: Moment | null;
  next: Moment | null;
}> {
  "use cache";
  cacheTag("moments");

  const db = getDb();
  if (!db) {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return { prev: null, next: null };
  }

  try {
    const [self] = await db
      .select({ publishedAt: momentsTable.publishedAt })
      .from(momentsTable)
      .where(eq(momentsTable.id, numeric))
      .limit(1);
    if (!self) {
      cacheLife("minutes");
      return { prev: null, next: null };
    }

    const [older] = await db
      .select()
      .from(momentsTable)
      .where(lt(momentsTable.publishedAt, self.publishedAt))
      .orderBy(desc(momentsTable.publishedAt))
      .limit(1);
    const [newer] = await db
      .select()
      .from(momentsTable)
      .where(gt(momentsTable.publishedAt, self.publishedAt))
      .orderBy(asc(momentsTable.publishedAt))
      .limit(1);

    cacheLife("minutes");
    return {
      prev: older ? toMoment(older as MomentDbRowLike) : null,
      next: newer ? toMoment(newer as MomentDbRowLike) : null,
    };
  } catch {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return { prev: null, next: null };
  }
}
