import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getAllNotes } from "@/content";
import { getMoments } from "@/lib/moments-server";
import { siteConfig } from "@/config/site";

/**
 * 静态页只列站内仍然存在的路由。
 * /archives、/blog、/changelog、/guestbook 都是 301/308 的中转站，不该出现在地图里；
 * 后台与管理动作（/admin、/write、/login）也不该被搜索引擎收录。
 */
const STATIC_PAGES: Array<{
  path: string;
  priority: number;
}> = [
  { path: "", priority: 1 },
  { path: "/notes", priority: 0.8 },
  { path: "/shelf", priority: 0.7 },
  { path: "/playlist", priority: 0.7 },
  { path: "/letters", priority: 0.7 },
  { path: "/projects", priority: 0.6 },
  { path: "/journal", priority: 0.7 },
  { path: "/friends", priority: 0.6 },
  { path: "/about", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 动态条目来自数据库；停在请求期，避免构建时把「没有动态」写死
  await connection();

  const staticPages: MetadataRoute.Sitemap = STATIC_PAGES.map(
    ({ path, priority }) => ({
      url: `${siteConfig.url}${path}`,
      changeFrequency: "weekly",
      priority,
    })
  );

  const notes: MetadataRoute.Sitemap = getAllNotes().map((note) => ({
    url: `${siteConfig.url}/notes/${note.slug}`,
    lastModified: new Date(`${note.meta.date}T00:00:00+08:00`),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // 数据库不可用时跳过动态条目，不写假日期
  const { available, moments } = await getMoments();
  const momentPages: MetadataRoute.Sitemap = available
    ? moments.flatMap((moment) => {
        const lastModified = new Date(moment.publishedAt);
        if (Number.isNaN(lastModified.getTime())) return [];
        return [
          {
            url: `${siteConfig.url}/life/${moment.id}`,
            lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          },
        ];
      })
    : [];

  return [...staticPages, ...notes, ...momentPages];
}
