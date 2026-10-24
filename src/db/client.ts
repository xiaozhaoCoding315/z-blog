import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

/**
 * 数据库连接（懒初始化）。
 * 未配置 DATABASE_URL 时返回 null，调用方据此优雅降级。
 */
let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!db) {
    client = postgres(process.env.DATABASE_URL, { max: 5 });
    db = drizzle(client, { schema });
  }
  return db;
}

/** CLI 脚本结束时调用，避免连接池让进程无法退出 */
export async function closeDb() {
  if (client) {
    await client.end({ timeout: 3 });
    client = null;
    db = null;
  }
}

/**
 * 幂等建表（等价于 drizzle-kit push 的效果）。
 * 同步脚本与 /api/sync 启动时执行，保证容器首次启动即可用。
 */
export async function ensureSchema() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL 未配置");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS posts (
      slug text PRIMARY KEY,
      title text NOT NULL,
      content_hash text NOT NULL,
      summary text,
      suggested_tags jsonb DEFAULT '[]'::jsonb,
      summary_embedding vector(1024),
      synced_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chunks (
      id bigserial PRIMARY KEY,
      post_slug text NOT NULL REFERENCES posts(slug) ON DELETE CASCADE,
      heading text,
      order_index integer NOT NULL,
      content text NOT NULL,
      embedding vector(1024) NOT NULL
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS chunks_post_idx ON chunks (post_slug)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops)`
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS views (
      slug text PRIMARY KEY,
      count integer NOT NULL DEFAULT 0
    )
  `);
}
