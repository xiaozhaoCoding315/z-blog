import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  embed,
} from "ai";
import type { UIMessage } from "ai";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  aiEnabled,
  chatEnabled,
  chatModel,
  embeddingEnabled,
  embeddingModel,
} from "@/lib/ai";
import { githubSlug } from "@/lib/slug";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

/** 一次检索先多捞几条候选，再按分数收敛 */
const RETRIEVAL_CANDIDATES = 12;
/** 最终进上下文的块数上限 */
const MAX_CONTEXT_CHUNKS = 6;
/** 同一篇文章最多贡献几块——避免一篇长文把其余文章挤掉 */
const MAX_CHUNKS_PER_POST = 2;
/**
 * 相似度下限。低于它的分块基本是噪声。
 * 注意这是**绝对**阈值，只用来挡「明显无关」，
 * 真正的取舍交给下面的相对窗口——见文章《语义搜索的召回率，被一个写死的阈值坑了》。
 */
const SIMILARITY_FLOOR = 0.28;
/** 相对窗口：与最佳命中差距超过这个值的分块不进上下文 */
const SIMILARITY_WINDOW = 0.12;
/** 输出上限：公网接口不设上限，等于把 token 账单交给陌生人 */
const MAX_OUTPUT_TOKENS = 800;

/** 指代类开头：这类追问单独拿去向量化会失去指代对象 */
const CONTINUATION_START =
  /^(那|这|它|他|她|还有|以及|继续|再|那么|所以|然后|呢|为什么|怎么)/;

/** GET /api/chat：查询能力状态（前端据此显示不同的引导文案） */
export async function GET() {
  return NextResponse.json({ enabled: chatEnabled, retrieval: aiEnabled });
}

interface RetrievedChunk {
  [key: string]: unknown;
  post_slug: string;
  title: string;
  heading: string | null;
  content: string;
  similarity: number;
}

/**
 * POST /api/chat —— RAG 问答：
 * 问题向量化 → pgvector 检索候选 → 分数收敛 → 带引用流式生成。
 * 引用来源通过 data-sources 数据部件随流下发，前端渲染可点击的溯源链接。
 */
export async function POST(request: Request) {
  // 只有聊天能力是硬性要求；没有 embedding 时退化为「无检索的问答」
  if (!chatEnabled) {
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
  if (db && embeddingEnabled && question) {
    try {
      const { embedding } = await embed({
        model: embeddingModel,
        value: buildRetrievalQuery(messages),
      });
      const vectorStr = `[${embedding.join(",")}]`;
      const candidates = await db.execute<RetrievedChunk>(
        sql`SELECT c.post_slug, p.title, c.heading, c.content,
                  1 - (c.embedding <=> ${vectorStr}::vector) AS similarity
            FROM chunks c JOIN posts p ON p.slug = c.post_slug
            ORDER BY c.embedding <=> ${vectorStr}::vector
            LIMIT ${RETRIEVAL_CANDIDATES}`
      );
      retrieved = pickContext(candidates);
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

  const systemPrompt = `你是这个个人博客的 AI 助手。博客主是一位 Java 后端 + Agent 方向的程序员。

规则：
- 优先依据下方「参考资料」回答，并在对应句子末尾用 [1]、[2] 这样的编号标注引用来源。
- 资料中没有的问题：如果是技术问题（编程、框架、原理、面试八股、系统设计等），直接基于你自己的知识认真回答，并在开头说明「这个问题博客里暂无相关文章，以下基于我的知识回答」。
- 与博客和技术都无关的问题，礼貌引导回技术话题。
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
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      // result.toUIMessageStream() 已标记废弃，改用独立 helper
      writer.merge(toUIMessageStream({ stream: result.stream }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}

/**
 * 候选块 → 上下文块。
 *
 * 绝对阈值只负责挡住明显无关的，真正决定取舍的是「离最佳命中多远」：
 * 相似度分布随查询长度、语言、领域变化，写死一个数字必然在某一类查询上失效。
 * 同时对单篇文章的块数设上限，避免长文垄断上下文。
 */
function pickContext(candidates: RetrievedChunk[]): RetrievedChunk[] {
  const best = candidates[0]?.similarity ?? 0;
  if (best < SIMILARITY_FLOOR) return [];

  const picked: RetrievedChunk[] = [];
  const perPost = new Map<string, number>();
  for (const chunk of candidates) {
    if (chunk.similarity < SIMILARITY_FLOOR) continue;
    if (chunk.similarity < best - SIMILARITY_WINDOW) continue;
    const used = perPost.get(chunk.post_slug) ?? 0;
    if (used >= MAX_CHUNKS_PER_POST) continue;
    perPost.set(chunk.post_slug, used + 1);
    picked.push(chunk);
    if (picked.length >= MAX_CONTEXT_CHUNKS) break;
  }
  return picked;
}

/**
 * 检索用的查询串。
 *
 * 多轮对话里「那部署呢」「这个怎么做的」这类追问本身没有指代对象，
 * 直接拿去向量化会跑偏。所以在追问时把上一轮用户问题一起带上。
 */
function buildRetrievalQuery(messages: UIMessage[]): string {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map(messageText)
    .filter(Boolean);
  const question = userTexts.at(-1) ?? "";
  const previous = userTexts.at(-2);
  const needsContext =
    question.length <= 15 || CONTINUATION_START.test(question.trim());
  return needsContext && previous ? `${previous}\n${question}` : question;
}

function messageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("")
    .trim();
}

function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = messageText(message);
    if (text) return text;
  }
  return "";
}
