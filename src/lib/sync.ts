import { inArray, notInArray, sql } from "drizzle-orm";
import { embedMany, generateText } from "ai";
import { getDb, ensureSchema } from "@/db/client";
import { chunks, posts as postsTable } from "@/db/schema";
import { listRawPosts } from "@/lib/content-core";
import { chunkMarkdown } from "@/lib/chunk";
import {
  chatEnabled,
  chatModel,
  embeddingEnabled,
  embeddingModel,
} from "@/lib/ai";

/**
 * 博客内容同步引擎：
 * 读取 MDX → 内容哈希比对（增量）→ 分块 → 向量化 → AI 摘要 → 写入 pgvector。
 * 被 scripts/sync.ts（CLI）与 /api/sync（容器启动）共用。
 */

const EMBED_BATCH = 16;

export interface SyncResult {
  total: number;
  synced: number;
  skipped: number;
  aiEnabled: boolean;
}

export async function syncPosts(options?: {
  force?: boolean;
}): Promise<SyncResult> {
  const db = getDb();
  if (!db) {
    throw new Error("DATABASE_URL 未配置，无法同步");
  }
  await ensureSchema();

  const fsPosts = listRawPosts().filter((p) => !p.meta.draft);
  const existing = await db.select().from(postsTable);
  const existingBySlug = new Map(existing.map((row) => [row.slug, row]));

  let synced = 0;
  const processedSlugs: string[] = [];

  for (const post of fsPosts) {
    processedSlugs.push(post.slug);
    const prev = existingBySlug.get(post.slug);
    if (!options?.force && prev?.contentHash === post.hash) {
      continue;
    }

    console.log(`[sync] 同步文章：${post.slug}`);

    // ---- AI 摘要（frontmatter 已有 description 时直接复用）----
    let summary: string | null = post.meta.description ?? null;
    if (!summary && chatEnabled) {
      summary = await generateSummary(post.meta.title, post.content);
      console.log(`[sync]   AI 摘要已生成`);
    }

    // ---- 摘要向量（相关文章推荐用）----
    let summaryEmbedding: number[] | null = null;
    if (summary && embeddingEnabled) {
      try {
        const { embeddings } = await embedMany({
          model: embeddingModel,
          values: [summary],
        });
        summaryEmbedding = embeddings[0];
      } catch (err) {
        console.warn(`[sync]   摘要向量化失败，跳过：`, err);
      }
    }

    await db
      .insert(postsTable)
      .values({
        slug: post.slug,
        title: post.meta.title,
        contentHash: post.hash,
        summary,
        suggestedTags: post.meta.tags,
        summaryEmbedding,
      })
      .onConflictDoUpdate({
        target: postsTable.slug,
        set: {
          title: post.meta.title,
          contentHash: post.hash,
          summary,
          suggestedTags: post.meta.tags,
          summaryEmbedding,
          syncedAt: sql`now()`,
        },
      });

    // ---- 分块向量化 ----
    if (embeddingEnabled) {
      const pieces = chunkMarkdown(post.content);
      await db.delete(chunks).where(inArray(chunks.postSlug, [post.slug]));

      for (let i = 0; i < pieces.length; i += EMBED_BATCH) {
        const batch = pieces.slice(i, i + EMBED_BATCH);
        const { embeddings } = await embedMany({
          model: embeddingModel,
          values: batch.map((c) => c.text),
        });
        await db.insert(chunks).values(
          batch.map((piece, j) => ({
            postSlug: post.slug,
            heading: piece.heading,
            orderIndex: i + j,
            content: piece.text,
            embedding: embeddings[j],
          }))
        );
      }
      console.log(`[sync]   ${pieces.length} 个分块已向量化`);
    }

    synced++;
  }

  // ---- 清理已删除的文章 ----
  if (existing.length > 0 && processedSlugs.length > 0) {
    const removed = await db
      .delete(postsTable)
      .where(notInArray(postsTable.slug, processedSlugs))
      .returning({ slug: postsTable.slug });
    for (const row of removed) {
      console.log(`[sync] 移除文章：${row.slug}`);
    }
  }

  const result: SyncResult = {
    total: fsPosts.length,
    synced,
    skipped: fsPosts.length - synced,
    aiEnabled: chatEnabled && embeddingEnabled,
  };
  console.log(
    `[sync] 完成：${result.total} 篇（更新 ${synced}，跳过 ${result.skipped}）` +
      (embeddingEnabled
        ? ""
        : " · 向量服务未启用，仅同步元数据")
  );
  return result;
}

async function generateSummary(title: string, content: string) {
  const truncated = content.slice(0, 3000);
  const { text } = await generateText({
    model: chatModel,
    prompt: `请为下面这篇博客文章写一段不超过 120 字的中文摘要，直接输出摘要正文，不要任何前缀或解释。

标题：${title}

正文：
${truncated}`,
  });
  return text.trim().slice(0, 200);
}
