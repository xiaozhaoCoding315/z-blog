import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { siteConfig } from "@/config/site";

export const STATUS_KEY = "status_sentence";

/**
 * 页头状态句：站长在后台改，读不到库时回退配置文件里的默认值。
 * 这是文案的回退，不是读数——不会把「连不上」伪装成某个真实状态。
 */
export async function getStatusSentence(): Promise<string> {
  return getStatusSentenceCached();
}

async function getStatusSentenceCached(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  cacheTag("settings");

  const db = getDb();
  if (!db) return siteConfig.status;

  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, STATUS_KEY))
      .limit(1);
    return row?.value?.trim() || siteConfig.status;
  } catch {
    return siteConfig.status;
  }
}
