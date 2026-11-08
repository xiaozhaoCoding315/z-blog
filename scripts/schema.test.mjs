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

/** 把 ensureSchema 里的语句按空白压平，便于逐条断言 */
const ddl = client.replace(/\s+/g, " ");

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
  assert.match(ddl, /card jsonb/);
  assert.match(ddl, /published_at timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(
    ddl,
    /CREATE INDEX IF NOT EXISTS moments_published_idx ON moments \(published_at DESC\)/
  );
});

test("drizzle schema 与 DDL 保持同名同列", () => {
  for (const name of ["login_codes", "moments"]) {
    assert.ok(schema.includes(`"${name}"`), `schema.ts 里缺少表 ${name}`);
  }
  assert.ok(schema.includes('"email"'));
  assert.ok(schema.includes('"role"'));
});
