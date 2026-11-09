/**
 * 代码片段——只放这个站里真正跑过的代码。
 *
 * 每条 `code` 都是从 `source` 指向的文件原样摘录（不做逻辑改写）；
 * 改源文件时记得同步这里。`snippetSummaries` 是给终端 / Spotlight 的
 * 轻量投影，不把完整代码带进这些客户端索引。
 *
 * 代码里含模板字符串字面量，所以用行数组拼接，避免嵌套反引号。
 */

export interface Snippet {
  id: string;
  title: string;
  language: string;
  useCase: string;
  tags: string[];
  code: string;
  /** 使用场景 / 踩坑 */
  note?: string;
  updatedAt?: string;
  /** 文件:行号，供界面追溯 */
  source?: string;
}

const lines = (...rows: string[]) => rows.join("\n");

export const snippets: Snippet[] = [
  {
    id: "next-connection",
    title: "Next 16：数据库页面别把空数据烤进静态壳",
    language: "tsx",
    useCase: "首页读数据库时停在请求期，避免构建机的空库结果被预渲染进静态壳。",
    tags: ["next", "cache-components", "ssr"],
    code: lines(
      'import { connection } from "next/server";',
      "",
      "// 读会话与 SMTP 配置，每次请求现算；预渲染停在 connection()，静态壳校验随之关掉",
      "export const instant = false;",
      "",
      "export default async function LoginPage() {",
      "  await connection();",
      "  const user = await getSessionUser();",
      "  const mail = mailConfig();",
      "  const secret = sessionSecret();",
      "}"
    ),
    source: "src/app/(site)/(apps)/login/page.tsx:3",
    note: "连接与数据读取留在请求期；桌面图标等静态部分由独立 Suspense 洞流式补齐。",
  },
  {
    id: "clock-store",
    title: "useSyncExternalStore 版站内时钟",
    language: "ts",
    useCase: "全站共用一个秒级 ticker，任务栏与状态组件读同一个值而不在 effect 里 setState。",
    tags: ["react", "clock", "store"],
    code: lines(
      "function subscribe(listener: () => void) {",
      "  listeners.add(listener);",
      "  if (listeners.size === 1) {",
      "    current = Math.floor(Date.now() / 1000) * 1000;",
      "    timer = setInterval(tick, 1000);",
      "  }",
      "  return () => {",
      "    listeners.delete(listener);",
      "    if (listeners.size === 0 && timer) {",
      "      clearInterval(timer);",
      "      timer = null;",
      "    }",
      "  };",
      "}",
      "",
      "/** 全站共用一个秒级心跳；任务栏和生活流时钟读同一个值。 */",
      "export function useClockSeconds() {",
      "  return useSyncExternalStore(",
      "    subscribe,",
      "    () => current,",
      "    () => 0",
      "  );",
      "}"
    ),
    source: "src/components/desktop/clock-store.ts:16",
    note: "服务端快照固定为 0，水合后再由订阅补上真实时间，避免首帧读数不一致。",
  },
  {
    id: "spine-scroll",
    title: "滚动驱动的脊线：CSS animation-timeline",
    language: "css",
    useCase: "随页面滚动描出生活流主脊线；不支持滚动时间线时保持完整静态线。",
    tags: ["css", "scroll", "progressive-enhancement"],
    code: lines(
      "@supports (animation-timeline: scroll()) {",
      "  @media (prefers-reduced-motion: no-preference) {",
      "    .life-spine-fill {",
      "      transform-origin: top;",
      "      animation: spine-draw linear both;",
      "      animation-timeline: scroll(nearest block);",
      "    }",
      "  }",
      "}",
      "",
      "@keyframes spine-draw {",
      "  from {",
      "    transform: scaleY(0);",
      "  }",
      "  to {",
      "    transform: scaleY(1);",
      "  }",
      "}"
    ),
    source: "src/app/globals.css:528",
    note: "关 JS 也看得见完整脊线；减少动效时不做滚动描出。",
  },
  {
    id: "pgvector-hnsw",
    title: "Drizzle + pgvector：HNSW 余弦索引",
    language: "ts",
    useCase: "为 1024 维笔记向量建立余弦距离索引，让 RAG 检索走近似最近邻。",
    tags: ["postgres", "pgvector", "rag"],
    code: lines(
      "  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);",
      "  await db.execute(sql`",
      "    CREATE TABLE IF NOT EXISTS chunks (",
      "      id bigserial PRIMARY KEY,",
      "      post_slug text NOT NULL REFERENCES posts(slug) ON DELETE CASCADE,",
      "      heading text,",
      "      order_index integer NOT NULL,",
      "      content text NOT NULL,",
      "      embedding vector(1024) NOT NULL",
      "    )",
      "  `);",
      "  await db.execute(",
      "    sql`CREATE INDEX IF NOT EXISTS chunks_post_idx ON chunks (post_slug)`",
      "  );",
      "  await db.execute(",
      "    sql`CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops)`",
      "  );"
    ),
    source: "src/db/client.ts:38",
    note: "向量维度要和嵌入模型一致；建表语句用 IF NOT EXISTS 保证同步脚本可重复执行。",
  },
  {
    id: "token-contrast",
    title: "设计 token 的 WCAG 护栏",
    language: "js",
    useCase: "机器检查三套预设的文字对比度与语义色 OKLCH 彩度，防止读数不可读或霓虹化。",
    tags: ["a11y", "css", "test"],
    code: lines(
      "function contrast(a, b) {",
      "  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);",
      "  return (light + 0.05) / (dark + 0.05);",
      "}",
      "",
      "// ...",
      "",
      "test(\"正文对比度 ≥ 7:1\", () => {",
      "  for (const [name, preset] of Object.entries(presets)) {",
      '    const ratio = contrast(resolve(preset, "ink"), resolve(preset, "window-2"));',
      "    assert.ok(ratio >= 7, `${name}: ink on window-2 = ${ratio.toFixed(2)}`);",
      "  }",
      "});",
      "",
      "// ...",
      "",
      "test(\"所有阅读用色的 chroma ≤ 0.12\", () => {",
      "  for (const [name, preset] of Object.entries(presets)) {",
      '    for (const token of ["ink", "ink-dim", "phosphor", "ok", "warn", "danger", "info"]) {',
      "      assert.ok(chroma(resolve(preset, token)) <= 0.12, `${name}: ${token} too saturated`);",
      "    }",
      "  }",
      "});"
    ),
    source: "scripts/tokens.test.mjs:51",
    note: "阈值来自设计文档：正文 ≥ 7:1，弱字/语义色 ≥ 4.5:1，彩度 ≤ 0.12。",
  },
  {
    id: "ai-citations",
    title: "AI SDK：把引用来源随流下发",
    language: "ts",
    useCase: "在生成回答之前把检索到的来源写入 data-sources 数据部件，前端即可渲染可点引用。",
    tags: ["ai-sdk", "rag", "streaming"],
    code: lines(
      "  // ---- 流式生成 + 引用数据部件 ----",
      "  const sources = retrieved.map((chunk, i) => ({",
      "    id: i + 1,",
      "    slug: chunk.post_slug,",
      "    title: chunk.title,",
      "    heading: chunk.heading,",
      "    href: `/notes/${chunk.post_slug}${",
      '      chunk.heading ? `#${githubSlug(chunk.heading)}` : ""',
      "    }`,",
      "  }));",
      "",
      "  const stream = createUIMessageStream({",
      "    execute: async ({ writer }) => {",
      '      writer.write({ type: "data-sources", id: "sources", data: sources });',
      "      const modelMessages = await convertToModelMessages(messages);",
      "      const result = streamText({",
      "        model: chatModel,",
      "        system: systemPrompt,",
      "        messages: modelMessages,",
      "        maxOutputTokens: MAX_OUTPUT_TOKENS,",
      "      });",
      "      // result.toUIMessageStream() 已标记废弃，改用独立 helper",
      "      writer.merge(toUIMessageStream({ stream: result.stream }));",
      "    },",
      "  });",
      "",
      "  return createUIMessageStreamResponse({ stream });"
    ),
    source: "src/app/api/chat/route.ts:133",
    note: "先下发来源再合并文本流，引用编号与系统提示里的 [1]、[2] 保持同一顺序。",
  },
];

/** 终端 / Spotlight / 列表页用的轻量投影：不含完整代码。 */
export interface SnippetSummary {
  id: string;
  title: string;
  language: string;
  useCase: string;
  source: string;
  tags: string[];
}

export const snippetSummaries: SnippetSummary[] = snippets.map((snippet) => ({
  id: snippet.id,
  title: snippet.title,
  language: snippet.language,
  useCase: snippet.useCase,
  source: snippet.source ?? "",
  tags: snippet.tags,
}));
