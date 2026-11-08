import type { MetadataRoute } from "next";
import { getAllNotes } from "@/content";
import { getChangelog } from "@/config/changelog";
import { siteConfig } from "@/config/site";


export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllNotes()
    .filter((p) => !p.meta.draft)
    .map((post) => ({
      url: `${siteConfig.url}/notes/${post.slug}`,
      lastModified: new Date(`${post.meta.date}T00:00:00+08:00`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const staticPages = [
    "",
    "/notes",
    "/projects",
    "/friends",
    "/about",
    "/archives",
  ].map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: new Date(`${siteConfig.startedAt}T00:00:00+08:00`),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  // 日志用最新一条的日期作为 lastModified
  const latestChange = getChangelog()[0]?.date ?? siteConfig.startedAt;
  const journalPage = {
    url: `${siteConfig.url}/journal`,
    lastModified: new Date(`${latestChange}T00:00:00+08:00`),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  };

  return [...staticPages, journalPage, ...posts];
}
