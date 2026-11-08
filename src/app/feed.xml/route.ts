import { connection } from "next/server";
import { getAllNotes } from "@/content";
import { getMoments } from "@/lib/moments-server";
import { momentExcerpt, momentText } from "@/lib/life";
import { siteConfig } from "@/config/site";

interface FeedItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description: string;
  categories: string[];
  timestamp: number;
}

function escapeXml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** 笔记日期只有 YYYY-MM-DD，按北京时间零点换算 */
function noteTimestamp(date: string) {
  return new Date(`${date}T00:00:00+08:00`).getTime();
}

export async function GET() {
  // 本地构建时没有数据库；不先停在请求期，会把「只有笔记」的结果烤进静态 RSS
  await connection();

  const noteItems: FeedItem[] = getAllNotes().map((note) => {
    const url = `${siteConfig.url}/notes/${note.slug}`;
    const timestamp = noteTimestamp(note.meta.date);
    return {
      title: note.meta.title,
      link: url,
      guid: url,
      pubDate: new Date(timestamp).toUTCString(),
      description: note.meta.description ?? "",
      categories: note.meta.tags,
      timestamp,
    };
  });

  // 数据库不可用时只输出笔记，不拿空条目或假日期充数
  const { available, moments } = await getMoments();
  const momentItems: FeedItem[] = available
    ? moments.flatMap((moment) => {
        const timestamp = Date.parse(moment.publishedAt);
        // 库里时间戳坏掉的条目宁可不发，也不写 Invalid Date
        if (!Number.isFinite(timestamp)) return [];
        const url = `${siteConfig.url}/life/${moment.id}`;
        return [
          {
            title: momentExcerpt(moment, 40),
            link: url,
            guid: url,
            pubDate: new Date(timestamp).toUTCString(),
            description: momentText(moment),
            categories: [],
            timestamp,
          },
        ];
      })
    : [];

  const items = [...noteItems, ...momentItems]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description>${escapeXml(item.description)}</description>${
        item.categories.length > 0
          ? `\n      ${item.categories
              .map((tag) => `<category>${escapeXml(tag)}</category>`)
              .join("\n      ")}`
          : ""
      }
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <link>${escapeXml(siteConfig.url)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>zh-CN</language>
    <atom:link href="${escapeXml(`${siteConfig.url}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
