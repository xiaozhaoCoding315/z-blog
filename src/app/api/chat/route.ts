import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  embed,
} from "ai";
import type { UIMessage } from "ai";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiEnabled, chatModel, embeddingModel } from "@/lib/ai";
import { githubSlug } from "@/lib/slug";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

/** GET /api/chat：查询 AI 是否可用（前端用于降级提示） */
export async function GET() {
  return NextResponse.json({ enabled: aiEnabled });
}

interface RetrievedChunk {
  [key: string]: unknown;
  post_slug: string;
  title: string;
  heading: string | null;
  content: string;
}

/**
 * POST /api/chat —— RAG 问答：
 * 问题向量化 → pgvector 检索 top-6 分块 → 带引用流式生成。
 * 引用来源通过 data-sources 数据部件随流下发，前端渲染可点击的溯源链接。
 */
export async function POST(request: Request) {
  if (!aiEnabled) {
    return NextResponse.json(
      { error: "AI 功能未启用：请在 .env 中配置 AI_API_KEY" },
      { status: 503 }
    );
  }

  // 限频：单 IP 每分钟最多 5 次问答、每天最多 60 次（防公网刷 token）
  const ip = getClientIp(request);
  if (
    !rateLimit(`chat:m:${ip}`, 5, 60_000) ||
    !rateLimit(`chat:d:${ip}`, 60, 86_400_000)
  ) {
    return NextResponse.json(
      { error: "提问太频繁啦，休息一下再来～" },
      { status: 429 }
    );
  }

  const body = (await request.json()) as { messages: UIMessage[] };
  const messages = body.messages ?? [];
  const question = getLastUserText(messages);

  // ---- 检索 ----
  let retrieved: RetrievedChunk[] = [];
  const db = getDb();
  if (db && question) {
    try {
      const { embedding } = await embed({
        model: embeddingModel,
        value: question,
      });
      const vectorStr = `[${embedding.join(",")}]`;
      retrieved = await db.execute<RetrievedChunk>(
        sql`SELECT c.post_slug, p.title, c.heading, c.content
            FROM chunks c JOIN posts p ON p.slug = c.post_slug
            ORDER BY c.embedding <=> ${vectorStr}::vector
            LIMIT 6`
      );
    } catch (err) {
      console.warn("[api/chat] 检索失败，退化为无上下文回答：", err);
    }
  }

  const context = retrieved
    .map((chunk, i) => {
      const heading = chunk.heading ? `《${chunk.heading}》小节` : "";
      return `[${i + 1}] 来源：${chunk.title} ${heading}\n${chunk.content}`;
    })
    .join("\n\n");

  const systemPrompt = `你是这个个人博客的 AI 助手，帮助访客了解博客内容与博主的技术分享。

规则：
- 优先依据下方「参考资料」回答，并在对应句子末尾用 [1]、[2] 这样的编号标注引用来源。
- 资料中没有的问题，可以基于常识简要回答，但要说明「博客中暂无相关内容」。
- 回答使用中文，简洁直接，适度使用 Markdown 列表，不要过度客套。
${
  context
    ? `\n参考资料：\n${context}`
    : "\n（当前没有检索到相关文章资料）"
}`;

  // ---- 流式生成 + 引用数据部件 ----
  const sources = retrieved.map((chunk, i) => ({
    id: i + 1,
    slug: chunk.post_slug,
    title: chunk.title,
    heading: chunk.heading,
    href: `/blog/${chunk.post_slug}${
      chunk.heading ? `#${githubSlug(chunk.heading)}` : ""
    }`,
  }));

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "data-sources", id: "sources", data: sources });
      const modelMessages = await convertToModelMessages(messages);
      const result = streamText({
        model: chatModel,
        system: systemPrompt,
        messages: modelMessages,
      });
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const textPart = message.parts.find(
      (part): part is { type: "text"; text: string } => part.type === "text"
    );
    if (textPart?.text) return textPart.text;
  }
  return "";
}
