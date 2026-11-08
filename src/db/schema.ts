import {
  pgTable,
  text,
  integer,
  bigserial,
  jsonb,
  timestamp,
  vector,
  index,
  primaryKey,
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

/**
 * likes：点赞
 */
export const likes = pgTable("likes", {
  slug: text("slug").primaryKey(),
  count: integer("count").notNull().default(0),
});

/**
 * guestbook：留言板
 */
export const guestbook = pgTable("guestbook", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * users：站内账号。
 *
 * 两种身份来源共用一张表：
 *   - GitHub OAuth（历史遗留，服务面试题库的掌握度）→ githubId 有值、email 为空
 *   - 邮箱验证码（阶段 2 起的正门）→ email 有值、githubId 为空
 * 所以两个列都可空，各自的唯一性靠索引保证。
 *
 * role 只有 owner / visitor 两档：站长一个邮箱，其余都是访客。
 */
export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  githubId: text("github_id").unique(),
  email: text("email").unique(),
  role: text("role").notNull().default("visitor"),
  login: text("login").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * login_codes：邮箱登录的一次性验证码。
 *
 * 只存 HMAC 哈希，不存明文——库被拖走也换不出能用的码。
 * attempts 到了上限就整条作废，逼用户重新申请，避免六位数被穷举。
 */
export const loginCodes = pgTable(
  "login_codes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("login_codes_email_idx").on(table.email)]
);

/**
 * moments：生活流。
 *
 * body 允许为空（一条纯照片、一张读数卡都可以没有正文）；
 * card 是 jsonb，只给 song / shelf / quote / link 四种形态用——
 * 设计文档 §6.2 的表里漏了这一列，没有它这四种形态无处安放。
 */
export const moments = pgTable(
  "moments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kind: text("kind").notNull(),
    body: text("body").notNull().default(""),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    mood: text("mood"),
    weather: text("weather"),
    place: text("place"),
    card: jsonb("card").$type<{
      title: string;
      meta: string;
      note?: string;
      href?: string;
    } | null>(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("moments_published_idx").on(table.publishedAt.desc())]
);

/**
 * interviewMastery：每道题的掌握状态
 *
 * level 用三档而不是布尔值：「会 / 不会」这个二分类太粗，
 * 真实准备状态是「能背要点」「被追问会卡」「能从容应对」三种。
 *
 * reviewCount / nextReviewAt 为后续的间隔重复留位（当前先只写 level）。
 */
export const interviewMastery = pgTable(
  "interview_mastery",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    /** 0 = 未掌握，1 = 模糊，2 = 掌握，3 = 熟练 */
    level: integer("level").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.slug] }),
    index("interview_mastery_user_idx").on(table.userId),
  ]
);

/**
 * interviewReview：用户主动标记的错误题/待复盘题。
 * 这是复习队列的数据源，掌握度只描述当前状态，这里记录为什么进入复习。
 */
export const interviewReview = pgTable(
  "interview_review",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    reason: text("reason").notNull().default("错误后进入复习"),
    tag: text("tag"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.slug] }),
    index("interview_review_user_idx").on(table.userId),
  ]
);

export type PostRow = typeof posts.$inferSelect;
export type ChunkRow = typeof chunks.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type MasteryRow = typeof interviewMastery.$inferSelect;
export type ReviewRow = typeof interviewReview.$inferSelect;
export type LoginCodeRow = typeof loginCodes.$inferSelect;
/** 名字带 Db 后缀：`Moment` 已经是生活流组件的领域类型，别混用 */
export type MomentDbRow = typeof moments.$inferSelect;
