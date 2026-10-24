import { ImageResponse } from "next/og";
import { getAllPosts, getPostBySlug } from "@/content";
import { siteConfig } from "@/config/site";

export const alt = "文章分享卡片";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 中文字体从 jsDelivr（国内可访问）加载并缓存，
 * 失败时优雅降级为默认字体（仅影响渲染样式，不影响生成）。
 */
let fontCache: ArrayBuffer | null = null;

async function loadCjkFont(): Promise<ArrayBuffer | null> {
  if (fontCache) return fontCache;
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.5/files/noto-sans-sc-chinese-simplified-700-normal.woff2"
    );
    if (res.ok) {
      fontCache = await res.arrayBuffer();
    }
  } catch {
    /* 网络不可用时使用默认字体 */
  }
  return fontCache;
}

export function generateStaticParams() {
  return getAllPosts()
    .filter((p) => !p.meta.draft)
    .map((post) => ({ slug: post.slug }));
}

export default async function PostOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const font = await loadCjkFont();
  const title = post?.meta.title ?? siteConfig.title;
  const tags = post?.meta.tags.slice(0, 4) ?? [];
  const date = post?.meta.date ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background:
            "linear-gradient(135deg, #101018 0%, #17122b 55%, #0e1a2b 100%)",
          color: "#f4f4f6",
          fontFamily: font ? "Noto Sans SC" : "sans-serif",
        }}
      >
        {/* 顶部品牌 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #7c5cff, #38bdf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {siteConfig.name.charAt(0)}
          </div>
          <div style={{ fontSize: 28, opacity: 0.9 }}>{siteConfig.name}</div>
        </div>

        {/* 标题 */}
        <div
          style={{
            fontSize: title.length > 30 ? 52 : 64,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {title}
        </div>

        {/* 底部：日期 + 标签 */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {date && <div style={{ fontSize: 26, opacity: 0.7 }}>{date}</div>}
          {tags.map((tag: string) => (
            <div
              key={tag}
              style={{
                fontSize: 24,
                padding: "6px 18px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
                opacity: 0.85,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Noto Sans SC", data: font, weight: 700 }]
        : undefined,
    }
  );
}
