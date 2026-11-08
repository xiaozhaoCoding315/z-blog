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
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS likes (
      slug text PRIMARY KEY,
      count integer NOT NULL DEFAULT 0
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS guestbook (
      id bigserial PRIMARY KEY,
      name text NOT NULL,
      message text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id bigserial PRIMARY KEY,
      github_id text NOT NULL UNIQUE,
      login text NOT NULL,
      avatar_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  // 邮箱用户没有 GitHub id；老库的 NOT NULL 必须放开（这条语句本身幂等）
  await db.execute(sql`ALTER TABLE users ALTER COLUMN github_id DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email text`);
  await db.execute(
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'visitor'`
  );
  // 普通唯一索引允许多个 NULL：GitHub 老用户没有邮箱，不能因此互相冲突
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email)`
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS login_codes (
      id bigserial PRIMARY KEY,
      email text NOT NULL,
      code_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      attempts integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS login_codes_email_idx ON login_codes (email)`
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS moments (
      id bigserial PRIMARY KEY,
      kind text NOT NULL,
      body text NOT NULL DEFAULT '',
      images jsonb NOT NULL DEFAULT '[]'::jsonb,
      mood text,
      weather text,
      place text,
      card jsonb,
      published_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS moments_published_idx ON moments (published_at DESC)`
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS interview_mastery (
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug text NOT NULL,
      level integer NOT NULL DEFAULT 0,
      review_count integer NOT NULL DEFAULT 0,
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      next_review_at timestamptz,
      PRIMARY KEY (user_id, slug)
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS interview_mastery_user_idx ON interview_mastery (user_id)`
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS interview_review (
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug text NOT NULL,
      reason text NOT NULL DEFAULT '错误后进入复习',
      tag text,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, slug)
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS interview_review_user_idx ON interview_review (user_id)`
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS comments (
      id bigserial PRIMARY KEY,
      target_type text NOT NULL,
      target_id text NOT NULL,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body text NOT NULL,
      status text NOT NULL DEFAULT 'visible',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS comments_target_idx ON comments (target_type, target_id, status, created_at DESC)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS comments_user_idx ON comments (user_id)`
  );

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS letters (
      id bigserial PRIMARY KEY,
      user_id integer REFERENCES users(id) ON DELETE SET NULL,
      guest_name text,
      legacy_guestbook_id integer,
      body text NOT NULL,
      song_title text,
      song_artist text,
      song_url text,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS letters_legacy_guestbook_key ON letters (legacy_guestbook_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS letters_status_idx ON letters (status, created_at DESC)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS letters_user_idx ON letters (user_id)`
  );

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS songs (
      id bigserial PRIMARY KEY,
      title text NOT NULL,
      artist text NOT NULL,
      url text NOT NULL,
      platform text NOT NULL DEFAULT 'other',
      note text NOT NULL DEFAULT '',
      source text NOT NULL DEFAULT 'owner',
      user_id integer REFERENCES users(id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'pending',
      pinned boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS songs_status_idx ON songs (status, created_at DESC)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS songs_user_idx ON songs (user_id)`
  );

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shelf_items (
      id bigserial PRIMARY KEY,
      type text NOT NULL,
      title text NOT NULL,
      creator text NOT NULL DEFAULT '',
      rating integer,
      note text NOT NULL DEFAULT '',
      cover_url text,
      finished_at date,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS shelf_items_type_idx ON shelf_items (type, finished_at DESC)`
  );

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  /*
   * 旧留言板并入信箱：旧记录没有账号，用 guest_name 显示名字。
   * legacy_guestbook_id 与唯一索引让这条语句可以在每次启动时安全重跑。
   */
  await db.execute(sql`
    INSERT INTO letters (legacy_guestbook_id, guest_name, body, status, created_at)
    SELECT id, name, message, 'approved', created_at FROM guestbook
    ON CONFLICT (legacy_guestbook_id) DO NOTHING
  `);
}
