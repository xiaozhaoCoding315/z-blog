import { getAllPosts } from "@/content";
import { siteConfig } from "@/config/site";


function escapeXml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const posts = getAllPosts().filter((p) => !p.meta.draft);

  const items = posts
    .map((post) => {
      const url = `${siteConfig.url}/blog/${post.slug}`;
      return `    <item>
      <title>${escapeXml(post.meta.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${post.meta.date}T00:00:00+08:00`).toUTCString()}</pubDate>
      <description>${escapeXml(post.meta.description ?? "")}</description>
      ${
        post.meta.tags.length > 0
          ? post.meta.tags.map((t) => `<category>${escapeXml(t)}</category>`).join("\n      ")
          : ""
      }
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${siteConfig.url}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>zh-CN</language>
    <atom:link href="${siteConfig.url}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
