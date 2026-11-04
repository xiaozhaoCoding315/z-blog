import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAllPosts, getPostBySlug } from "@/content";
import { siteConfig } from "@/config/site";

export const alt = "文章分享卡片";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 墨与纸的配色，直接取自 globals.css 里的设计令牌（OKLCH 换算成十六进制，
 * satori 只认 rgb/hex）。改主题时这两个地方要一起改。
 */
const PAPER = "#ecede9"; // --background
const INK = "#131413"; // --foreground
const INK_SOFT = "#646764"; // --muted-foreground
const TEAL = "#215148"; // --primary
const RULE = "#d6d7d2"; // --border

/**
 * 字体从仓库内读，不打运行时网络请求。
 *
 * satori 只认 glyf 轮廓的 TrueType：woff2 会抛「Unsupported OpenType
 * signature wOF2」，SubsetOTF（CFF 轮廓）会报 DataView 越界。两个字体都按
 * GB2312 常用字集（6884 字）子集化过，正文缺字会退化成方框——换字体时记得
 * 重新子集化，别直接塞完整字库（那有 10MB+）。
 */
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

let serifCache: Buffer | null = null;
let sansCache: Buffer | null = null;

async function loadFont(name: string, cache: "serif" | "sans") {
  const hit = cache === "serif" ? serifCache : sansCache;
  if (hit) return hit;
  try {
    const data = await readFile(path.join(FONT_DIR, name));
    if (cache === "serif") serifCache = data;
    else sansCache = data;
    return data;
  } catch {
    // 字体缺失时退化为默认字体：卡片仍能生成，只是中文可能缺字
    return null;
  }
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

  const [serif, sans] = await Promise.all([
    loadFont("NotoSerifSC-Bold.ttf", "serif"),
    loadFont("NotoSansSC-Bold.ttf", "sans"),
  ]);

  const title = post?.meta.title ?? siteConfig.title;
  const tags = post?.meta.tags.slice(0, 3) ?? [];
  const date = post?.meta.date ?? "";
  const fonts = [
    ...(serif ? [{ name: "Serif SC", data: serif, weight: 700 as const }] : []),
    ...(sans ? [{ name: "Sans SC", data: sans, weight: 700 as const }] : []),
  ];

  // 标题越长字号越小：长标题在 1200px 宽度上会撑成三行，压掉底部信息。
  // 中英混排的标题比纯中文更占宽度，阈值按「字宽」而不是字符数粗估。
  const visualWidth = title.replace(/[\x00-\x7F]/g, "xx").length;
  const titleSize =
    visualWidth > 44 ? 50 : visualWidth > 30 ? 58 : visualWidth > 20 ? 66 : 74;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: PAPER,
          padding: "64px 72px",
        }}
      >
        {/* 左侧竖线：文章页的页边线搬到卡片上，是这套视觉里最认得出来的一个记号 */}
        <div
          style={{
            width: 2,
            backgroundColor: TEAL,
            display: "flex",
            marginRight: 36,
          }}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* 顶部：站点名 + 分隔点 + 日期，全部等宽小字 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: serif ? "Serif SC" : "sans-serif",
              fontSize: 26,
              color: INK,
            }}
          >
            {siteConfig.name}
            {date ? (
              <span style={{ margin: "0 18px", color: RULE, fontSize: 22 }}>
                ／
              </span>
            ) : null}
            {date ? (
              <span style={{ color: INK_SOFT, fontSize: 22 }}>{date}</span>
            ) : null}
          </div>

          {/* 标题：衬线，紧字距，左对齐 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: serif ? "Serif SC" : "sans-serif",
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.32,
              letterSpacing: "-0.01em",
              color: INK,
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          {/* 底部：标签用细线下划线，不用胶囊——圆角标签是这套视觉里要去掉的东西 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              borderTop: `1px solid ${RULE}`,
              paddingTop: 22,
              fontFamily: serif ? "Serif SC" : "sans-serif",
              fontSize: 22,
              color: INK_SOFT,
            }}
          >
            {tags.map((tag: string) => (
              <div
                key={tag}
                style={{
                  display: "flex",
                  color: TEAL,
                  borderBottom: `1px solid ${TEAL}`,
                  paddingBottom: 4,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
