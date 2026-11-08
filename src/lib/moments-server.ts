import { cacheLife, cacheTag } from "next/cache";
import { asc, desc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { moments as momentsTable } from "@/db/schema";
import { toMoment, type MomentDbRowLike } from "@/lib/moment-core";
import type { Moment } from "@/lib/life";

/**
 * 生活流读取层。
 *
 * 三条纪律：
 * 1. 全部 `use cache` + `cacheTag("moments")`：发布一条之后 Server Action 里
 *    `updateTag("moments")` 立刻失效，读的人马上看到新条目。
 * 2. 取不到就是 available: false，调用方显示 NOT AVAILABLE，
 *    不许拿空数组冒充「还没发过」。
 * 3. 调用方必须在 `connection()` 之后调用。否则构建期（本地构建时没有
 *    DATABASE_URL）会把「没有数据」烤进静态壳，线上一直空着。
 */

export interface MomentsResult {
  available: boolean;
  moments: Moment[];
}

export async function getMoments(): Promise<MomentsResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("moments");

  const db = getDb();
  if (!db) return { available: false, moments: [] };

  try {
    const rows = await db
      .select()
      .from(momentsTable)
      .orderBy(desc(momentsTable.publishedAt), desc(momentsTable.id));
    return {
      available: true,
      moments: rows.map((row) => toMoment(row as MomentDbRowLike)),
    };
  } catch {
    return { available: false, moments: [] };
  }
}

export async function getMomentById(id: string): Promise<{
  available: boolean;
  moment: Moment | null;
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("moments");

  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return { available: true, moment: null };
  }

  const db = getDb();
  if (!db) return { available: false, moment: null };

  try {
    const [row] = await db
      .select()
      .from(momentsTable)
      .where(eq(momentsTable.id, numeric))
      .limit(1);
    return {
      available: true,
      moment: row ? toMoment(row as MomentDbRowLike) : null,
    };
  } catch {
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
  "use cache";
  cacheLife("minutes");
  cacheTag("moments");

  const numeric = Number(id);
  const db = getDb();
  if (!db || !Number.isInteger(numeric) || numeric <= 0) {
    return { prev: null, next: null };
  }

  try {
    const [self] = await db
      .select({ publishedAt: momentsTable.publishedAt })
      .from(momentsTable)
      .where(eq(momentsTable.id, numeric))
      .limit(1);
    if (!self) return { prev: null, next: null };

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

    return {
      prev: older ? toMoment(older as MomentDbRowLike) : null,
      next: newer ? toMoment(newer as MomentDbRowLike) : null,
    };
  } catch {
    return { prev: null, next: null };
  }
}
