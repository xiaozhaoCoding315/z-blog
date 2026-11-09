/**
 * 表结构守卫：DDL 是部署时唯一的建表入口，删掉一行就没人会知道。
 * 直接读源文件文本，不连数据库。
 *   node --test scripts/schema.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync(
  new URL("../src/db/client.ts", import.meta.url),
  "utf8"
);
const schema = readFileSync(
  new URL("../src/db/schema.ts", import.meta.url),
  "utf8"
);

/** 按空白压平整个文件，便于逐条断言 */
const ddl = client.replace(/\s+/g, " ");

/**
 * 从压平后的 DDL 里取出某张表声明的列名。
 *
 * 不靠括号配对（`DEFAULT now()` 自带括号），改成「标识符 + 类型关键字」配对：
 * 建表语句里只有列定义长这样，索引与约束都不带类型。
 */
function ddlColumns(table) {
  const start = ddl.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`);
  if (start === -1) return null;
  const next = ddl.indexOf("CREATE ", start + 1);
  const body = ddl.slice(start, next === -1 ? undefined : next);
  return [...body.matchAll(/\b([a-z_]+) (bigserial|text|integer|jsonb|timestamptz|boolean|date)\b/g)]
    .map((m) => m[1]);
}

/** 取 schema.ts 里某张表的定义片段（表名与 pgTable 之间可能换行） */
function schemaTableBody(table) {
  const match = new RegExp(`pgTable\\(\\s*"${table}"`).exec(schema);
  if (!match) return null;
  const start = match.index;
  const next = schema.indexOf("pgTable(", start + match[0].length);
  return schema.slice(start, next === -1 ? undefined : next);
}

/** drizzle schema 里是否声明了这一列（列名以字符串字面量出现在该表定义中） */
function schemaHasColumn(table, column) {
  const body = schemaTableBody(table);
  return body !== null && body.includes(`("${column}"`);
}

test("老库的 users.github_id 必须被放开为可空", () => {
  assert.match(
    ddl,
    /ALTER TABLE users ALTER COLUMN github_id DROP NOT NULL/,
    "邮箱用户没有 GitHub id，这一步漏了会导致邮箱登录写库失败"
  );
});

test("users 补上 email 与 role，且 email 唯一索引允许多个 NULL", () => {
  assert.match(ddl, /ALTER TABLE users ADD COLUMN IF NOT EXISTS email text/);
  assert.match(
    ddl,
    /ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'visitor'/
  );
  assert.match(
    ddl,
    /CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users \(email\)/
  );
});

test("login_codes 只存哈希，不许出现明文 code 列", () => {
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS login_codes/);
  assert.match(ddl, /code_hash text NOT NULL/);
  assert.match(ddl, /attempts integer NOT NULL DEFAULT 0/);
  assert.match(ddl, /expires_at timestamptz NOT NULL/);
  assert.doesNotMatch(ddl, /\bcode text NOT NULL/);
});

test("moments 有发布时间的倒序索引，且卡片数据能落库", () => {
  assert.match(ddl, /CREATE TABLE IF NOT EXISTS moments/);
  assert.match(ddl, /kind text NOT NULL/);
  assert.match(ddl, /images jsonb NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.match(ddl, /tags jsonb NOT NULL DEFAULT '\[\]'::jsonb/);
  assert.match(ddl, /card jsonb/);
  assert.match(ddl, /published_at timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(
    ddl,
    /CREATE INDEX IF NOT EXISTS moments_published_idx ON moments \(published_at DESC\)/
  );
  // 已有部署走不到 CREATE TABLE：标签列必须靠幂等 ALTER 补上
  assert.match(
    ddl,
    /ALTER TABLE moments ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '\[\]'::jsonb/
  );
});

test("drizzle schema 与 DDL 逐列对得上", () => {
  // 这条是防漂移的唯一护栏：DDL 是部署时的建表入口，schema.ts 是查询入口，
  // 两边列名一旦分叉，运行时才会以「column does not exist」的形式暴露。
  // 所以按列名逐个比对，而不是只查表名——只查表名的话，删掉 users.email
  // 也能被 login_codes.email 蒙混过关。
  const expected = {
    users: ["id", "github_id", "email", "role", "login", "avatar_url", "created_at", "last_seen_at"],
    login_codes: ["id", "email", "code_hash", "expires_at", "attempts", "created_at"],
    moments: ["id", "kind", "body", "images", "tags", "mood", "weather", "place", "card", "published_at", "created_at"],
  };

  for (const [table, columns] of Object.entries(expected)) {
    const inDdl = ddlColumns(table);
    // 按集合比，不按顺序：users 的 email / role 是后面 ALTER 补的，
    // 落在 CREATE TABLE 之后，顺序和 schema.ts 天然不同。顺序对这条守卫没有意义。
    assert.deepEqual(
      [...inDdl].sort(),
      [...columns].sort(),
      `${table} 的 DDL 列与预期不符（多列或少列）`
    );
    for (const column of columns) {
      assert.ok(
        schemaHasColumn(table, column),
        `schema.ts 的 ${table} 缺少列 ${column}`
      );
    }
  }
});

test("github_id 与 email 必须都可空——两种身份来源各缺一半", () => {
  // GitHub 用户没有 email，邮箱用户没有 github_id；
  // 任一列被写回 notNull() 都会让另一条登录路径写库失败。
  const users = schemaTableBody("users");
  assert.match(users, /githubId: text\("github_id"\)\.unique\(\)/);
  assert.match(users, /email: text\("email"\)\.unique\(\)/);
});

test("comments / letters / songs / shelf_items / site_settings 都进了幂等 DDL", () => {
  for (const table of ["comments", "letters", "songs", "shelf_items", "site_settings"]) {
    assert.ok(ddl.includes(`CREATE TABLE IF NOT EXISTS ${table} (`), `${table} 缺建表语句`);
    assert.ok(schema.includes(`pgTable(\n  "${table}"`) || schema.includes(`pgTable("${table}"`), `${table} 缺 drizzle 定义`);
  }
});

test("letters 为旧留言板保留 guest_name 与幂等迁移键", () => {
  assert.ok(ddlColumns("letters").includes("guest_name"));
  assert.ok(ddlColumns("letters").includes("legacy_guestbook_id"));
  assert.match(ddl, /CREATE UNIQUE INDEX IF NOT EXISTS letters_legacy_guestbook_key/);
  assert.match(ddl, /ON CONFLICT \(legacy_guestbook_id\) DO NOTHING/);
  assert.ok(schemaHasColumn("letters", "legacy_guestbook_id"));
});

test("songs.pinned 是 boolean，shelf_items 的 rating / finished_at 可空", () => {
  assert.ok(ddlColumns("songs").includes("pinned"));
  assert.match(ddl, /pinned boolean NOT NULL DEFAULT false/);
  assert.ok(ddlColumns("shelf_items").includes("rating"));
  assert.ok(ddlColumns("shelf_items").includes("finished_at"));
  assert.match(ddl, /finished_at date/);
});
