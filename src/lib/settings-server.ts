import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { siteConfig } from "@/config/site";
import { getMomentById } from "@/lib/moments-server";
import { parseMomentId } from "@/lib/moment-core";
import type { Moment } from "@/lib/life";

export const STATUS_KEY = "status_sentence";
export const DESKTOP_PIN_KEY = "desktop_pin_moment";

/**
 * 页头状态句：站长在后台改，读不到库时回退配置文件里的默认值。
 * 这是文案的回退，不是读数——不会把「连不上」伪装成某个真实状态。
 * 失败按 60 秒回查；expire=300 秒保持 Next 16 可预渲染的静态壳下限。
 */
export async function getStatusSentence(): Promise<string> {
  return getStatusSentenceCached();
}

async function getStatusSentenceCached(): Promise<string> {
  "use cache";
  cacheTag("settings");

  const db = getDb();
  if (!db) {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return siteConfig.status;
  }

  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, STATUS_KEY))
      .limit(1);
    cacheLife("minutes");
    return row?.value?.trim() || siteConfig.status;
  } catch {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return siteConfig.status;
  }
}

/**
 * 桌面便签钉的 moment id。
 *
 * 存的是字符串，读出来先过 `parseMomentId`：库里可能是脏值，
 * 只有规范十进制才算数。与状态句共用 `settings` 缓存标签，
 * 后台保存后 `updateTag("settings")` 会同时刷新两处。
 */
export async function getDesktopPin(): Promise<string | null> {
  return getDesktopPinCached();
}

async function getDesktopPinCached(): Promise<string | null> {
  "use cache";
  cacheTag("settings");

  const db = getDb();
  if (!db) {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return null;
  }

  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, DESKTOP_PIN_KEY))
      .limit(1);
    cacheLife("minutes");
    if (!row) return null;
    const id = parseMomentId(row.value.trim());
    return id === null ? null : String(id);
  } catch {
    cacheLife({ stale: 60, revalidate: 60, expire: 300 });
    return null;
  }
}

/**
 * 钉选的那条动态。动态被删、id 不合法、数据库读不到都返回 null——
 * 桌面上不摆空便签，也不拿别的条目顶替。
 */
export async function getPinnedMoment(): Promise<Moment | null> {
  const id = await getDesktopPin();
  if (!id) return null;
  const { available, moment } = await getMomentById(id);
  return available ? moment : null;
}
