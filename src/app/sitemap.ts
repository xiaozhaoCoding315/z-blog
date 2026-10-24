import type { MetadataRoute } from "next";
import { getAllPosts } from "@/content";
import { siteConfig } from "@/config/site";


export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
    .filter((p) => !p.meta.draft)
    .map((post) => ({
      url: `${siteConfig.url}/blog/${post.slug}`,
      lastModified: new Date(`${post.meta.date}T00:00:00+08:00`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const staticPages = ["", "/blog", "/projects", "/friends", "/about"].map(
    (path) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: new Date(`${siteConfig.startedAt}T00:00:00+08:00`),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })
  );

  return [...staticPages, ...posts];
}
