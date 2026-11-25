import { formatDay } from "./life.ts";
import type { Moment } from "./life.ts";

/**
 * 相册的一格。
 *
 * `date` 保留原始的 ISO 发布时间：灯箱里的 `<time dateTime>` 需要机器可读值，
 * 展示用的 MM.DD 由调用方用 `formatDay` 现算。`alt` 在纯函数里一次算好，
 * 网格和灯箱共用同一句「11.05 的照片」。
 */
export interface GalleryImage {
  src: string;
  momentId: string;
  date: string;
  alt: string;
}

/**
 * 把所有动态里的照片摊平成相册图片。
 *
 * 三条规则：
 * 1. 只收站内 `/media/` 路径——外链和脏数据不进 `<img src>`；
 * 2. 按动态的 `publishedAt` 倒序，最新的照片在最前（同一动态内保持原顺序）；
 * 3. 同一张图（src 相同）只留一次；如果它出现在多条动态里，保留最新的那条，
 *    这样灯箱里的「查看动态」指向的是最近一次发布。
 *
 * 不修改传入的数组。
 */
export function collectGalleryImages(moments: Moment[]): GalleryImage[] {
  const sorted = [...moments].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  );

  const seen = new Set<string>();
  const images: GalleryImage[] = [];
  for (const moment of sorted) {
    for (const src of moment.images ?? []) {
      if (!src.startsWith("/media/") || seen.has(src)) continue;
      seen.add(src);
      images.push({
        src,
        momentId: moment.id,
        date: moment.publishedAt,
        alt: `${formatDay(moment.publishedAt)} 的照片`,
      });
    }
  }
  return images;
}
