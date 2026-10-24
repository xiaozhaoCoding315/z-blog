import {
  pgTable,
  text,
  integer,
  bigserial,
  jsonb,
  timestamp,
  vector,
  index,
} from "drizzle-orm/pg-core";

/**
 * posts：每篇文章的同步状态 + AI 摘要 + 摘要向量（用于相关文章推荐）
 */
export const posts = pgTable("posts", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  contentHash: text("content_hash").notNull(),
  summary: text("summary"),
  suggestedTags: jsonb("suggested_tags").$type<string[]>().default([]),
  summaryEmbedding: vector("summary_embedding", { dimensions: 1024 }),
  syncedAt: timestamp("synced_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * chunks：文章分块及其向量（语义搜索 / RAG 检索的数据源）
 */
export const chunks = pgTable(
  "chunks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postSlug: text("post_slug")
      .notNull()
      .references(() => posts.slug, { onDelete: "cascade" }),
    heading: text("heading"),
    orderIndex: integer("order_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
  },
  (table) => [
    index("chunks_post_idx").on(table.postSlug),
    // HNSW 余弦距离索引：向量检索毫秒级
    index("chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

/**
 * views：浏览量
 */
export const views = pgTable("views", {
  slug: text("slug").primaryKey(),
  count: integer("count").notNull().default(0),
});

export type PostRow = typeof posts.$inferSelect;
export type ChunkRow = typeof chunks.$inferSelect;
