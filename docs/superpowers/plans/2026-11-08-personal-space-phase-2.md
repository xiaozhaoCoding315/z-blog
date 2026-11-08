# 个人空间改版 · 阶段 2（账号、动态发布、图片上传）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把生活流从 `src/config/mock-moments.ts` 的假数据换成数据库，让站长能用邮箱验证码登录、发一条图文动态，并在首页看到它。

**Architecture:** 先落表（`users` 改造 + `login_codes` + `moments`），再写只读数据层（`use cache` + `cacheTag`，`connection()` 挡在页面顶部防止构建期把空结果烤进静态壳），然后是邮箱验证码登录与图片上传两条写入链路，接着是站长的发布页与 `/life/[id]` 单条页，最后补 §2.6 遗留的两条纯 CSS 动效。读取全部服务端渲染，客户端常驻组件仍只有页头时钟。

**Tech Stack:** Next.js 16.4.3（App Router、`cacheComponents`、`use cache` / `cacheLife` / `cacheTag` / `updateTag`、Server Actions）、React 19.3、Tailwind CSS 4.3.3、Drizzle ORM 0.45 + postgres.js、zod 4.6、nodemailer 10.4、`node --test`。

---

## Global Constraints

- Next.js 是 16.4.3，**写代码前先读 `node_modules/next/dist/docs/` 下对应章节**（本阶段主要看 `01-app/01-getting-started/07-mutating-data.md`、`08-caching.md`、`09-revalidating.md`、`15-route-handlers.md`、`01-app/03-api-reference/03-file-conventions/route.md`、`04-functions/connection.md`、`cacheTag.md`、`cacheLife.md`、`updateTag.md`、`01-app/02-guides/authentication-with-cache-components.md`、`03-api-reference/03-file-conventions/02-route-segment-config/instant.md`）。这个版本的 API 与训练数据不同，不要凭记忆写。
- 所有注释与面向用户的文案用中文；代码标识符用英文。
- **只允许新增一个 npm 依赖：`nodemailer@10.4.0`（站长已批准，且已装好、未提交）**。图标一律用 `lucide-react` 已有项。图片压缩用浏览器 canvas，不引入 sharp / 图片库。
- 颜色只能来自 `src/app/globals.css` 里的 token，**组件里不许写死十六进制**。Tailwind 类只许用 token 映射出来的名字（`bg-panel`、`bg-panel-2`、`text-data`、`border-rule`…）。
- 动效只允许设计文档 §2.6 表里那几条；其余一律不加。**不许复用 `src/components/site/reveal.tsx`**——它把 `opacity: 0` 写进产物，关 JS 内容永久消失。
- 关闭 JavaScript 时，首页正文、观测条读数、`/life/[id]` 正文必须完整可见。
- 不引入 canvas 库、不引入 `three`、不做 WebGL；页面上不出现自动播放音频。
- 无源读数显示 `NOT AVAILABLE`，**不许用 0 顶替**；「在听 / 在读」旁边永远跟「手动 · 更新于」。
- 密码学一律走 `node:crypto`（`randomInt` / `createHmac` / `timingSafeEqual` / `createHash`）；验证码只存哈希，**绝不存明文**。
- **带 `node:` 内置模块的文件不能被 `"use client"` 组件 import**。客户端要用的常量（图片数量、体积上限）单独放 `src/lib/media-limits.ts`，该文件零 import。
- 本阶段在分支 `refactor/personal-space` 上做，**不要部署、不要合进 main**。
- 每个任务单独提交；每个任务结束跑 `npm run type-check` 与 `npm test`；阶段收尾跑全套门禁。
- 单元测试文件里的被测模块**不许有 `@/` 别名 import**（`node --test` 不解析 tsconfig paths）。相对路径的 `import type` 会被擦除，可以用；值导入必须带 `.ts` 后缀或换成零依赖的纯函数。

---

## 文件结构

**新建**

| 文件 | 职责 |
| --- | --- |
| `src/lib/media-limits.ts` | 图片数量 / 体积上限常量（零 import，客户端也能用） |
| `src/lib/moment-core.ts` | 数据库行 → `Moment` 的纯映射（只有 `import type`） |
| `src/lib/moments-server.ts` | 生活流只读数据层（`use cache` + `cacheTag("moments")`） |
| `src/lib/email-code.ts` | 验证码生成 / 哈希 / 校验 / 邮箱规范化，纯函数 |
| `src/lib/mailer.ts` | nodemailer 发送验证码，未配置 SMTP 时返回 false |
| `src/lib/moment-input.ts` | 发布表单的 zod 校验（只 import zod 与 `import type`） |
| `src/lib/upload-core.ts` | 图片魔数嗅探、内容哈希、路径拼装与安全校验（只 import `node:crypto`，不引任何相对模块） |
| `src/lib/uploads-server.ts` | 落盘与读取（`UPLOAD_DIR`） |
| `src/app/api/auth/email/request/route.ts` | 申请验证码 |
| `src/app/api/auth/email/verify/route.ts` | 校验验证码并签发会话 |
| `src/app/api/auth/email/logout/route.ts` | 退出登录 |
| `src/app/api/uploads/route.ts` | 站长上传图片（POST） |
| `src/app/media/[...path]/route.ts` | 读上传目录，供 `<img src="/media/...">` |
| `src/app/(site)/login/page.tsx` | 登录页（已登录时显示身份与出口） |
| `src/components/auth/login-form.tsx` | 两步登录表单（客户端） |
| `src/app/(site)/write/page.tsx` | 发布页（仅 owner） |
| `src/app/(site)/write/actions.ts` | `createMoment` Server Action |
| `src/components/write/moment-form.tsx` | 发布表单（客户端，`useActionState`） |
| `src/components/write/image-picker.tsx` | 选图 → canvas 压缩 → 上传 |
| `src/components/life/digit-roll.tsx` | 观测条数字上翻（纯 CSS） |
| `src/app/(site)/life/[id]/page.tsx` | 单条动态页 |
| `scripts/schema.test.mjs` | 幂等 DDL 的守卫测试 |
| `scripts/moment-core.test.mjs` | 行映射测试 |
| `scripts/email-code.test.mjs` | 验证码测试 |
| `scripts/upload-core.test.mjs` | 魔数与路径测试 |
| `scripts/moment-input.test.mjs` | 发布校验测试 |

**修改**

`src/db/schema.ts`、`src/db/client.ts`、`src/lib/session.ts`、`src/lib/auth.ts`、`src/lib/observation.ts`、`src/app/(site)/page.tsx`、`src/components/site/observ-bar.tsx`、`src/components/life/activity-strip.tsx`、`src/components/life/moment.tsx`、`src/components/life/moment-meta.tsx`、`src/components/life/moment-text.tsx`、`src/components/life/moment-photo.tsx`、`src/components/life/moment-card.tsx`、`src/components/site/navbar.tsx`、`src/app/globals.css`、`next.config.ts`、`docker-compose.yml`、`Dockerfile`、`.gitignore`、`.dockerignore`、`.env.example`、`package.json`、`docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`

**删除**

`src/config/mock-moments.ts`（整份）

---

### Task 1: 数据库表与幂等 DDL

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/db/client.ts`
- Create: `scripts/schema.test.mjs`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`

**Interfaces:**
- Produces: 表 `login_codes`、`moments`；`users.email` / `users.role`；`users.githubId` 可空。
- Produces: Drizzle 导出 `loginCodes`、`moments`，行类型 `LoginCodeRow`、`MomentDbRow`（**叫 `MomentDbRow` 而不是 `Moment`**，避免和 `@/lib/life` 的领域类型撞名）。
- Produces: `ensureSchema()` 幂等执行全部 DDL。

- [ ] **Step 1: 先写会失败的守卫测试**

创建 `scripts/schema.test.mjs`：

```js
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
```

- [ ] **Step 2: 跑一遍确认它失败**

Run: `node --test scripts/schema.test.mjs`
Expected: FAIL —— 第一条 `ALTER TABLE users ... DROP NOT NULL` 找不到。

- [ ] **Step 3: 改 `src/db/schema.ts`**

把 `users` 表整段替换为：

```ts
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
```

在文件末尾的类型导出区补上：

```ts
export type LoginCodeRow = typeof loginCodes.$inferSelect;
/** 名字带 Db 后缀：`Moment` 已经是生活流组件的领域类型，别混用 */
export type MomentDbRow = typeof moments.$inferSelect;
```

- [ ] **Step 4: 改 `src/db/client.ts` 的 `ensureSchema`**

在 `users` 建表语句之后、`interview_mastery` 之前插入：

```ts
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
```

- [ ] **Step 5: `package.json` 的 test 脚本加上新文件**

```json
"test": "node --test scripts/life.test.mjs scripts/tokens.test.mjs scripts/weather.test.mjs scripts/github-activity.test.mjs scripts/schema.test.mjs"
```

- [ ] **Step 6: 跑测试**

Run: `node --test scripts/schema.test.mjs`
Expected: PASS（5 个用例）。

- [ ] **Step 7: 真库跑一遍幂等 DDL**

本地起一个临时库（Docker 在 WSL 里；镜像走镜像站）：

```bash
wsl.exe -d Ubuntu -- bash -lc 'docker run -d --name zb-p2-db -e POSTGRES_DB=blog -e POSTGRES_USER=blog -e POSTGRES_PASSWORD=blog -p 5432:5432 pgvector/pgvector:pg17 && sleep 6 && docker exec zb-p2-db pg_isready -U blog -d blog'
```

然后（**必须用 `127.0.0.1`**：Windows 会把 `localhost` 先解析成 `::1`，而容器只发布了 IPv4）：

```bash
DATABASE_URL="postgres://blog:blog@127.0.0.1:5432/blog" npx tsx -e "import { ensureSchema, closeDb } from './src/db/client'; (async()=>{ await ensureSchema(); await ensureSchema(); await closeDb(); console.log('DDL 连跑两次通过'); })()"
```

Expected: 打印 `DDL 连跑两次通过`，无报错（第二次是幂等验证）。

- [ ] **Step 8: 改设计文档 §6.1 与 §6.2**

§6.1 的 `users` 三条之后补一句：

```markdown
`email` 的唯一性用普通唯一索引实现（`CREATE UNIQUE INDEX ... ON users (email)`）：普通唯一索引允许多个 NULL，GitHub 老用户没有邮箱，不会因此互相冲突。
```

§6.2 的 `moments` 表里，在 `images` 之后补一行：

```markdown
| card | jsonb，可空。`song` / `shelf` / `quote` / `link` 四种形态的卡片数据（title / meta / note / href）。原表漏了这一列，这四种形态没有它无处安放 |
```

- [ ] **Step 9: 门禁与提交**

```bash
npm run type-check && npm test
git add -A
git commit -m "feat(db): 生活流落表——users 支持邮箱账号、新增 login_codes 与 moments"
```

---

### Task 2: 生活流只读层，首页改读数据库

**Files:**
- Create: `src/lib/moment-core.ts`
- Create: `src/lib/moments-server.ts`
- Create: `scripts/moment-core.test.mjs`
- Modify: `src/lib/observation.ts`
- Modify: `src/app/(site)/page.tsx`
- Modify: `package.json`
- Delete: `src/config/mock-moments.ts`

**Interfaces:**
- Consumes: Task 1 的 `moments` 表与 `MomentDbRow`。
- Produces:
  - `MOMENT_KINDS: readonly MomentKind[]`、`isMomentKind(v: unknown): v is MomentKind`
  - `toMoment(row: MomentDbRowLike): Moment`（`publishedAt` 接受 `Date | string`）
  - `getMoments(): Promise<{ available: boolean; moments: Moment[] }>`
  - `getMomentById(id: string): Promise<{ available: boolean; moment: Moment | null }>`
  - `getMomentNeighbors(id: string): Promise<{ prev: Moment | null; next: Moment | null }>`
  - `getObservation(): Promise<{ days: string | null; commits90: number | null; city: string; year: number; month: number }>`（**不再含 `moments` / `thisMonth`**）

- [ ] **Step 1: 先写会失败的映射测试**

创建 `scripts/moment-core.test.mjs`：

```js
/**
 * 数据库行 → 生活流条目的映射。
 *   node --test scripts/moment-core.test.mjs
 *
 * moment-core.ts 只有 import type，node 能把类型导入擦掉直接跑。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isMomentKind, toMoment } from "../src/lib/moment-core.ts";

const row = (over = {}) => ({
  id: 7,
  kind: "text",
  body: "降温了。",
  images: [],
  mood: null,
  weather: null,
  place: null,
  card: null,
  publishedAt: new Date("2026-11-05T13:40:00.000Z"),
  createdAt: new Date("2026-11-05T13:40:00.000Z"),
  ...over,
});

test("kind 白名单只认设计文档里的六种", () => {
  for (const k of ["text", "photo", "song", "shelf", "quote", "link"]) {
    assert.equal(isMomentKind(k), true);
  }
  for (const bad of ["", "Text", "video", null, 3]) {
    assert.equal(isMomentKind(bad), false);
  }
});

test("未知 kind 退成短记，不抛错也不丢内容", () => {
  const m = toMoment(row({ kind: "video" }));
  assert.equal(m.kind, "text");
  assert.equal(m.body, "降温了。");
});

test("id 转字符串，时间转 ISO，空串字段直接不出现", () => {
  const m = toMoment(row({ mood: "  ", place: "杭州" }));
  assert.equal(m.id, "7");
  assert.equal(m.publishedAt, "2026-11-05T13:40:00.000Z");
  assert.equal(m.place, "杭州");
  assert.equal("mood" in m, false, "空白心情不该渲染成一个空的分隔符");
});

test("images 只留 /media/ 开头的路径", () => {
  const m = toMoment(
    row({ kind: "photo", images: ["/media/2026/11/a.webp", "https://evil/x.png", 3] })
  );
  assert.deepEqual(m.images, ["/media/2026/11/a.webp"]);
});

test("card 只有四类形态才带，且字段必须齐", () => {
  const card = { title: "Merry Christmas Mr. Lawrence", meta: "坂本龍一" };
  assert.ok(toMoment(row({ kind: "song", card })).card);
  assert.equal(toMoment(row({ kind: "text", card })).card, undefined);
  assert.equal(toMoment(row({ kind: "song", card: { title: "x" } })).card, undefined);
});

test("没有正文也没有图片的条目仍然映射，不在这里做业务裁剪", () => {
  const m = toMoment(
    row({ kind: "quote", body: "", card: { title: "一句话", meta: "出处" } })
  );
  assert.equal(m.body, "");
  assert.equal(m.card.title, "一句话");
});
```

- [ ] **Step 2: 跑一遍确认失败**

Run: `node --test scripts/moment-core.test.mjs`
Expected: FAIL —— `Cannot find module '../src/lib/moment-core.ts'`。

- [ ] **Step 3: 写 `src/lib/moment-core.ts`**

```ts
import type { Moment, MomentKind } from "./life";

/**
 * 数据库行 → 生活流条目。
 *
 * 这里只做形状转换，不做业务判断：哪些能发、发出去长什么样，由发布表单的
 * 校验（lib/moment-input.ts）负责。读取侧要宽松——库里已有的数据永远要读得出来，
 * 一个不认识的 kind 不该让整页 500。
 */

export const MOMENT_KINDS = [
  "text",
  "photo",
  "song",
  "shelf",
  "quote",
  "link",
] as const;

export function isMomentKind(value: unknown): value is MomentKind {
  return (
    typeof value === "string" &&
    (MOMENT_KINDS as readonly string[]).includes(value)
  );
}

/** 卡片形态只认这四种，其余 kind 即使库里带了 card 也不渲染 */
const CARD_KINDS = new Set<MomentKind>(["song", "shelf", "quote", "link"]);

export interface MomentDbRowLike {
  id: number;
  kind: string;
  body: string;
  images: unknown;
  mood: string | null;
  weather: string | null;
  place: string | null;
  card: unknown;
  publishedAt: Date | string;
}

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** 只接受站内 /media/ 路径：外链和脏数据都丢掉，不让它们进 <img src> */
function mediaPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (x): x is string => typeof x === "string" && x.startsWith("/media/")
  );
}

function cardOf(value: unknown): Moment["card"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== "string" || typeof raw.meta !== "string") {
    return undefined;
  }
  const title = raw.title.trim();
  const meta = raw.meta.trim();
  if (!title || !meta) return undefined;
  return {
    title,
    meta,
    note: text(typeof raw.note === "string" ? raw.note : null),
    href: text(typeof raw.href === "string" ? raw.href : null),
  };
}

export function toMoment(row: MomentDbRowLike): Moment {
  const kind: MomentKind = isMomentKind(row.kind) ? row.kind : "text";
  const images = mediaPaths(row.images);
  const moment: Moment = {
    id: String(row.id),
    kind,
    publishedAt:
      row.publishedAt instanceof Date
        ? row.publishedAt.toISOString()
        : row.publishedAt,
    body: row.body ?? "",
  };

  if (images.length > 0) moment.images = images;
  const mood = text(row.mood);
  const weather = text(row.weather);
  const place = text(row.place);
  if (mood) moment.mood = mood;
  if (weather) moment.weather = weather;
  if (place) moment.place = place;

  if (CARD_KINDS.has(kind)) {
    const card = cardOf(row.card);
    if (card) moment.card = card;
  }

  return moment;
}
```

- [ ] **Step 4: 跑测试**

Run: `node --test scripts/moment-core.test.mjs`
Expected: PASS（6 个用例）。

- [ ] **Step 5: 写 `src/lib/moments-server.ts`**

```ts
import { cacheLife, cacheTag } from "next/cache";
import { asc, desc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { moments as momentsTable } from "@/db/schema";
import { toMoment, type MomentDbRowLike } from "@/lib/moment-core";
import type { Moment } from "@/lib/life";

/**
 * 生活流读取层。
 *
 * 三条纪律：
 * 1. 全部 `use cache` + `cacheTag("moments")`：发布一条之后 Server Action 里
 *    `updateTag("moments")` 立刻失效，读的人马上看到新条目。
 * 2. 取不到就是 available: false，调用方显示 NOT AVAILABLE，
 *    不许拿空数组冒充「还没发过」。
 * 3. 调用方必须在 `connection()` 之后调用。否则构建期（本地构建时没有
 *    DATABASE_URL）会把「没有数据」烤进静态壳，线上一直空着。
 */

export interface MomentsResult {
  available: boolean;
  moments: Moment[];
}

export async function getMoments(): Promise<MomentsResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("moments");

  const db = getDb();
  if (!db) return { available: false, moments: [] };

  try {
    const rows = await db
      .select()
      .from(momentsTable)
      .orderBy(desc(momentsTable.publishedAt), desc(momentsTable.id));
    return {
      available: true,
      moments: rows.map((row) => toMoment(row as MomentDbRowLike)),
    };
  } catch {
    return { available: false, moments: [] };
  }
}

export async function getMomentById(id: string): Promise<{
  available: boolean;
  moment: Moment | null;
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("moments");

  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return { available: true, moment: null };
  }

  const db = getDb();
  if (!db) return { available: false, moment: null };

  try {
    const [row] = await db
      .select()
      .from(momentsTable)
      .where(eq(momentsTable.id, numeric))
      .limit(1);
    return {
      available: true,
      moment: row ? toMoment(row as MomentDbRowLike) : null,
    };
  } catch {
    return { available: false, moment: null };
  }
}

/**
 * 单条页的上一条 / 下一条。
 * 「上一条」指时间上更早的那条（页面上显示在下方），与生活流倒序一致。
 */
export async function getMomentNeighbors(id: string): Promise<{
  prev: Moment | null;
  next: Moment | null;
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("moments");

  const numeric = Number(id);
  const db = getDb();
  if (!db || !Number.isInteger(numeric) || numeric <= 0) {
    return { prev: null, next: null };
  }

  try {
    const [self] = await db
      .select({ publishedAt: momentsTable.publishedAt })
      .from(momentsTable)
      .where(eq(momentsTable.id, numeric))
      .limit(1);
    if (!self) return { prev: null, next: null };

    const [older] = await db
      .select()
      .from(momentsTable)
      .where(lt(momentsTable.publishedAt, self.publishedAt))
      .orderBy(desc(momentsTable.publishedAt))
      .limit(1);
    const [newer] = await db
      .select()
      .from(momentsTable)
      .where(gt(momentsTable.publishedAt, self.publishedAt))
      .orderBy(asc(momentsTable.publishedAt))
      .limit(1);

    return {
      prev: older ? toMoment(older as MomentDbRowLike) : null,
      next: newer ? toMoment(newer as MomentDbRowLike) : null,
    };
  } catch {
    return { prev: null, next: null };
  }
}
```

- [ ] **Step 6: 改 `src/lib/observation.ts`（整份替换）**

```ts
import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { daysSince } from "@/lib/uptime";
import { getGithubActivity } from "@/lib/github-server";

export interface Observation {
  days: string | null;
  commits90: number | null;
  city: string;
  /** 北京时间当前年 / 月：分组与「本月条数」共用这一份口径 */
  year: number;
  month: number;
}

/**
 * 观测条里不依赖生活流的那三条读数（建站天数、90 天提交、城市），
 * 外加一个北京时间年月——天气仍单独走 5 分钟一档，不放进这里。
 *
 * 动态条数与本月条数**不在这里算**：它们必须和首页正在渲染的那一份生活流
 * 用同一份数据，否则两个缓存各自过期时会互相打架（条数说 27，列表只有 26）。
 * 调用方拿 `year` / `month` 配 `countThisMonth()` 自己算。
 *
 * 「建站第 N 天」读的是 siteConfig.startedAt，不是服务器存活时间——
 * 所以面板上不许出现「在线 / 心跳」这类字样。
 */
export async function getObservation(): Promise<Observation> {
  "use cache";
  cacheLife("hours");

  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);

  const github = await getGithubActivity();
  const days = daysSince(siteConfig.startedAt);

  return {
    days: days === null ? null : String(days),
    commits90: github.available ? github.total90 : null,
    city: siteConfig.weather.city,
    year,
    month,
  };
}
```

- [ ] **Step 7: 改 `src/app/(site)/page.tsx`**

`import` 区改为（删掉 `cacheLife`、`mockMoments`，加 `connection`、`getMoments`、`countThisMonth`）：

```tsx
import { Fragment } from "react";
import { connection } from "next/server";
import { siteConfig } from "@/config/site";
import { now as portfolioNow } from "@/config/portfolio";
import { countThisMonth, groupByMonth } from "@/lib/life";
import { getObservation } from "@/lib/observation";
import { getMoments } from "@/lib/moments-server";
import { getWeather } from "@/lib/weather-server";
import { getGithubActivity } from "@/lib/github-server";
import { Moment, NODE_CLASS } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";
import { NowPanel } from "@/components/life/now-panel";
import { ObservBar } from "@/components/site/observ-bar";
import { LocalClock } from "@/components/site/local-clock";
```

**删掉整个 `getCurrentYear()` 函数**（年月改由 `getObservation()` 给）。

在 `HomePage` 上方加：

```tsx
/**
 * 生活流要读数据库，首页不再是纯静态页（设计文档 §6.3 已接受这一点）。
 *
 * `await connection()` 让预渲染停在这一行：本地构建时没有 DATABASE_URL，
 * 否则 `use cache` 读库会把「没有数据」烤进静态壳，线上永远空着。
 *
 * `instant = false` 是配套的一步：预渲染停得太早，页面产不出静态壳，
 * 而 Cache Components 会校验每页必须有非空静态壳。这个导出只关掉那条校验，
 * 不影响运行时行为。
 */
export const instant = false;
```

`HomePage` 的函数体开头与读数区改为：

```tsx
export default async function HomePage() {
  await connection();

  const [observation, weather, activity, life] = await Promise.all([
    getObservation(),
    getWeather(),
    getGithubActivity(),
    getMoments(),
  ]);

  const currentYear = observation.year;
  const groups = groupByMonth(life.moments, currentYear);
  /** 手机窄带只放在全站首条动态之后，不是每个月各放一条 */
  const firstGroupKey = groups[0]?.key;
  const momentsCount = life.available ? life.moments.length : null;
  const thisMonth = life.available
    ? countThisMonth(life.moments, observation.year, observation.month)
    : null;

  const readings = [
    {
      label: "Days",
      value: observation.days ?? "",
      unit: "建站",
      available: observation.days !== null,
    },
    {
      label: "Moments",
      value: momentsCount === null ? "" : String(momentsCount),
      unit: "条",
      available: momentsCount !== null,
    },
    {
      label: "Month",
      value: thisMonth === null ? "" : String(thisMonth),
      unit: "本月",
      available: thisMonth !== null,
    },
    {
      label: "Commits",
      // 事件接口按页截断时 total90 只是下限，读数前加「≥」，不冒充精确值
      value:
        observation.commits90 === null
          ? ""
          : `${activity.truncated ? "≥" : ""}${observation.commits90}`,
      unit: "90 天",
      available: observation.commits90 !== null,
    },
    {
      label: "Weather",
      value: weather ? `${weather.temperature}°` : "",
      unit: weather?.label ?? observation.city,
      available: weather !== null,
    },
  ];
```

左栏（`<div className="relative min-w-0 pl-6 sm:pl-8">`）内部改成三支：

```tsx
        <div className="relative min-w-0 pl-6 sm:pl-8">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>

          {!life.available ? (
            <div className="border border-rule bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
                Not Available
              </p>
              <h2 className="mt-3 font-heading text-[19px] font-bold">
                生活流暂时读不到
              </h2>
              <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
                这一栏的内容存在数据库里，现在连不上。页面其余部分照常显示，不拿空列表冒充「还没发过」。
              </p>
            </div>
          ) : groups.length === 0 ? (
            <div className="border border-rule bg-panel p-6">
              <h2 className="font-heading text-[19px] font-bold">还没有第一条</h2>
              <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
                数据库是通的，只是这条时间线还空着。
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="mt-8 first:mt-0">
                <MonthTick label={group.label} count={group.moments.length} />
                <ul className="mt-6 flex flex-col gap-10">
                  {group.moments.map((moment, index) => (
                    <Fragment key={moment.id}>
                      <li className="relative">
                        <span
                          aria-hidden
                          className={`absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full sm:-left-8 ${NODE_CLASS[moment.kind]}`}
                        />
                        <Moment moment={moment} />
                      </li>
                      {index === 0 && group.key === firstGroupKey && (
                        <li className="lg:hidden">
                          <details className="border-y border-rule py-3">
                            <summary className="flex cursor-pointer items-baseline gap-2 font-mono text-[11px] text-muted-foreground">
                              <span className="shrink-0 uppercase tracking-[0.14em]">此刻</span>
                              <span className="shrink-0 tabular-nums">
                                {weather
                                  ? `${observation.city} ${weather.temperature}° ${weather.label}`
                                  : observation.city}
                              </span>
                              <span aria-hidden className="shrink-0">·</span>
                              <span aria-hidden className="shrink-0">♪</span>
                              <span className="min-w-0 truncate">{portfolioNow.listening}</span>
                            </summary>
                            <div className="mt-4">{nowPanel}</div>
                          </details>
                        </li>
                      )}
                    </Fragment>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
```

（`nowPanel` 常量与右侧 `<aside>` 保持原样不动。）

- [ ] **Step 8: 删掉假数据**

```bash
rm src/config/mock-moments.ts
```

确认全仓没有引用：

```bash
grep -rn "mock-moments\|mockMoments" src/ scripts/ || echo "无残留"
```

Expected: `无残留`。

- [ ] **Step 9: `package.json` 加测试文件，跑门禁**

```json
"test": "node --test scripts/life.test.mjs scripts/tokens.test.mjs scripts/weather.test.mjs scripts/github-activity.test.mjs scripts/schema.test.mjs scripts/moment-core.test.mjs"
```

```bash
npm run type-check && npm run lint && npm test
```

Expected: 全绿。

- [ ] **Step 10: 起开发服务器确认空库与有数据两种情况**

先确认空库（Task 1 建的 `zb-p2-db` 是空的）：

```bash
DATABASE_URL="postgres://blog:blog@127.0.0.1:5432/blog" npm run dev
```

检查：首页观测条 Moments / Month 显示 `0`（库是通的、真的没数据）；左栏显示「还没有第一条」；其余读数正常。

再插一条手工数据，刷新：

```bash
DATABASE_URL="postgres://blog:blog@127.0.0.1:5432/blog" npx tsx -e "import postgres from 'postgres'; const sql=postgres(process.env.DATABASE_URL,{max:1}); (async()=>{ await sql\`INSERT INTO moments (kind, body, place, published_at) VALUES ('text','降温了。把阳台上的薄荷搬进屋。','杭州', now())\`; await sql.end(); console.log('插入完成'); })()"
```

Expected: 刷新后首页出现这一条，观测条 Moments 变 1。

- [ ] **Step 11: 提交**

```bash
git add -A
git commit -m "feat(life): 生活流改读数据库，观测条条数随数据源，无源显示 NOT AVAILABLE"
```

---

### Task 3: 邮箱验证码登录

**Files:**
- Create: `src/lib/email-code.ts`
- Create: `scripts/email-code.test.mjs`
- Create: `src/lib/mailer.ts`
- Create: `src/app/api/auth/email/request/route.ts`
- Create: `src/app/api/auth/email/verify/route.ts`
- Create: `src/app/api/auth/email/logout/route.ts`
- Create: `src/app/(site)/login/page.tsx`
- Create: `src/components/auth/login-form.tsx`
- Modify: `src/lib/session.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/components/site/navbar.tsx`
- Modify: `next.config.ts`
- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 的 `users.email` / `users.role` / `login_codes`。
- Produces:
  - `normalizeEmail(raw: string): string`、`isValidEmail(raw: string): boolean`
  - `generateCode(): string`、`hashCode(code, secret): string`、`codeMatches(code, hash, secret): boolean`、`codeExpiry(now: number): Date`
  - 常量 `CODE_TTL_MS`（10 分钟）、`MAX_ATTEMPTS`（5）、`RESEND_COOLDOWN_MS`（60s）、`HOURLY_EMAIL_LIMIT`（5）
  - `mailConfig(): { enabled: boolean; host: string; port: number; user: string }`、`sendLoginCode(to, code): Promise<boolean>`
  - `SessionUser` 增加 `role: "owner" | "visitor"`

- [ ] **Step 1: 先写会失败的验证码测试**

创建 `scripts/email-code.test.mjs`：

```js
/**
 * 验证码的纯逻辑：生成、哈希、比对、过期。
 *   node --test scripts/email-code.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  codeMatches,
  generateCode,
  hashCode,
  isValidEmail,
  normalizeEmail,
} from "../src/lib/email-code.ts";

const SECRET = "test-secret";

test("验证码永远是六位数字，允许前导 0", () => {
  for (let i = 0; i < 200; i++) {
    const code = generateCode();
    assert.match(code, /^\d{6}$/, `生成了非法验证码 ${code}`);
  }
});

test("同一份码与密钥哈希稳定，换密钥就变", () => {
  assert.equal(hashCode("123456", SECRET), hashCode("123456", SECRET));
  assert.notEqual(hashCode("123456", SECRET), hashCode("123456", "other"));
});

test("比对认得出对与错，且不因长度不同抛错", () => {
  const hash = hashCode("123456", SECRET);
  assert.equal(codeMatches("123456", hash, SECRET), true);
  assert.equal(codeMatches("123457", hash, SECRET), false);
  assert.equal(codeMatches("12345", hash, SECRET), false);
  assert.equal(codeMatches("1234567", hash, SECRET), false);
});

test("常量对得上文档：10 分钟有效、5 次上限", () => {
  assert.equal(CODE_TTL_MS, 10 * 60_000);
  assert.equal(MAX_ATTEMPTS, 5);
});

test("邮箱规范化：去空白、转小写；明显不是邮箱的拒绝", () => {
  assert.equal(normalizeEmail("  Foo@Example.COM "), "foo@example.com");
  assert.equal(isValidEmail("foo@example.com"), true);
  assert.equal(isValidEmail("foo@example"), false);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("a b@example.com"), false);
});
```

- [ ] **Step 2: 跑一遍确认失败**

Run: `node --test scripts/email-code.test.mjs`
Expected: FAIL —— 模块不存在。

- [ ] **Step 3: 写 `src/lib/email-code.ts`**

```ts
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * 邮箱验证码的全部纯逻辑。
 *
 * 没有 import 任何 `@/` 模块——`node --test` 解析不了路径别名，
 * 只有这种零依赖的纯函数才测得到。
 */

/** 验证码有效期：10 分钟 */
export const CODE_TTL_MS = 10 * 60_000;
/** 同一条码最多试 5 次，超过作废 */
export const MAX_ATTEMPTS = 5;
/** 同一邮箱 60 秒内只能申请一次 */
export const RESEND_COOLDOWN_MS = 60_000;
/** 同一邮箱每小时最多 5 次 */
export const HOURLY_EMAIL_LIMIT = 5;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * 只做形状判断，不做 DNS 校验：验证码本身就是最强的验证——
 * 发不出去就登不上，没必要在这里猜域名存不存在。
 */
export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (email.length < 6 || email.length > 254) return false;
  if (/\s/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** 六位数字，允许前导 0（randomInt 上界不含，所以是 0–999999） */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * 验证码只存哈希。加的是 AUTH_SECRET 这类密钥，
 * 库被拖走也换不出能用的码（六位数空间只有一百万，纯 SHA-256 挡不住彩虹表）。
 */
export function hashCode(code: string, secret: string): string {
  return createHmac("sha256", secret).update(code).digest("hex");
}

export function codeMatches(
  code: string,
  hash: string,
  secret: string
): boolean {
  const actual = Buffer.from(hashCode(code, secret), "hex");
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function codeExpiry(now: number): Date {
  return new Date(now + CODE_TTL_MS);
}
```

- [ ] **Step 4: 跑测试**

Run: `node --test scripts/email-code.test.mjs`
Expected: PASS（5 个用例）。

- [ ] **Step 5: 确认 nodemailer 已在依赖里，写 `src/lib/mailer.ts`**

`nodemailer@10.4.0` 已经装好并写进 `package.json`（本次会话之前完成，未提交）。**不要再装一次**；先确认：

```bash
node -e "console.log(require('./package.json').dependencies.nodemailer)"
```

Expected: 打印 `^10.4.0`。若为 undefined，再执行 `npm i nodemailer@10.4.0 --save`。

```ts
import nodemailer from "nodemailer";
import { siteConfig } from "@/config/site";

/**
 * 登录验证码的发信口。
 *
 * 只走 QQ 邮箱的 SMTP（465 / SSL，站长已验证服务器到它可通）。
 * 没配 SMTP_USER / SMTP_PASS 时 `enabled` 为假：登录整体关闭，
 * 页面显示「暂未开放」，浏览不受影响（设计文档 §7.3）。
 */
export function mailConfig() {
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const host = process.env.SMTP_HOST ?? "smtp.qq.com";
  const port = Number(process.env.SMTP_PORT ?? 465);
  return { user, pass, host, port, enabled: Boolean(user && pass) };
}

export async function sendLoginCode(
  to: string,
  code: string
): Promise<boolean> {
  const cfg = mailConfig();
  if (!cfg.enabled) return false;

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });

  try {
    await transport.sendMail({
      from: `"${siteConfig.name}" <${cfg.user}>`,
      to,
      subject: `登录验证码 ${code}`,
      text: [
        `你的验证码是 ${code}，10 分钟内有效。`,
        "",
        "如果不是你本人操作，忽略这封邮件即可，什么都不会发生。",
        "收不到的话先翻一下垃圾箱——自动发的信常被扔进去。",
      ].join("\n"),
    });
    return true;
  } catch (err) {
    console.error("[mail] 验证码发送失败：", err);
    return false;
  } finally {
    transport.close();
  }
}
```

- [ ] **Step 6: `next.config.ts` 把 nodemailer 设为服务端外部包**

在 `cacheComponents: true,` 之后加：

```ts
  // nodemailer 走原生 socket，不进打包器更稳
  serverExternalPackages: ["nodemailer"],
```

- [ ] **Step 7: `src/lib/auth.ts` 改 `sanitizeNext` 的兜底**

`/interview` 阶段 5 会整个删掉，登录兜底不该再指它：

```ts
export function sanitizeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
```

- [ ] **Step 8: `src/lib/session.ts` 带上 role（整份替换）**

```ts
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { SESSION_COOKIE, sessionSecret, verifySession } from "@/lib/auth";

export interface SessionUser {
  id: number;
  login: string;
  avatarUrl: string | null;
  role: "owner" | "visitor";
}

/**
 * 从请求 cookie 解出当前登录用户。
 * 未登录 / 未配置 / 用户已删除一律返回 null，调用方据此降级。
 *
 * 用 cookies() 会让调用它的路由进入动态渲染——这正是我们要的。
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const userId = await verifySession(token, secret);
  if (userId === null) return null;

  const db = getDb();
  if (!db) return null;

  try {
    const [row] = await db
      .select({
        id: users.id,
        login: users.login,
        avatarUrl: users.avatarUrl,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      login: row.login,
      avatarUrl: row.avatarUrl,
      role: row.role === "owner" ? "owner" : "visitor",
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 9: 写 `src/app/api/auth/email/request/route.ts`**

```ts
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { loginCodes } from "@/db/schema";
import {
  HOURLY_EMAIL_LIMIT,
  RESEND_COOLDOWN_MS,
  codeExpiry,
  generateCode,
  hashCode,
  isValidEmail,
  normalizeEmail,
} from "@/lib/email-code";
import { mailConfig, sendLoginCode } from "@/lib/mailer";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sessionSecret } from "@/lib/auth";

/** POST /api/auth/email/request —— 发一封验证码 */
export async function POST(request: Request) {
  await connection();

  const cfg = mailConfig();
  const secret = sessionSecret();
  if (!cfg.enabled || !secret) {
    return NextResponse.json(
      { error: "登录暂未开放：服务器还没配置发信" },
      { status: 503 }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "邮箱看起来不对" }, { status: 400 });
  }

  // 按 IP 限频：单实例内存桶够用（容器重启清零，可接受）
  if (!rateLimit(`${getClientIp(request)}:email-code`, 20, 3_600_000)) {
    return NextResponse.json(
      { error: "请求太频繁了，过会儿再试" },
      { status: 429 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库暂时不可用" }, { status: 503 });
  }

  const now = Date.now();

  // 顺手清掉一天前就过期的记录，避免这张表只长不消
  try {
    await db.execute(
      sql`DELETE FROM login_codes WHERE expires_at < now() - interval '1 day'`
    );
  } catch {
    // 清理失败不影响发码
  }

  const [latest] = await db
    .select({ createdAt: loginCodes.createdAt })
    .from(loginCodes)
    .where(eq(loginCodes.email, email))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);

  if (latest && now - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return NextResponse.json(
      { error: "刚发过一封，60 秒后再来" },
      { status: 429 }
    );
  }

  const [hourly] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginCodes)
    .where(
      and(
        eq(loginCodes.email, email),
        gte(loginCodes.createdAt, new Date(now - 3_600_000))
      )
    );
  if ((hourly?.count ?? 0) >= HOURLY_EMAIL_LIMIT) {
    return NextResponse.json(
      { error: "这个邮箱一小时内申请太多次了" },
      { status: 429 }
    );
  }

  const code = generateCode();
  try {
    await db.insert(loginCodes).values({
      email,
      codeHash: hashCode(code, secret),
      expiresAt: codeExpiry(now),
    });
  } catch {
    return NextResponse.json({ error: "保存验证码失败" }, { status: 500 });
  }

  const sent = await sendLoginCode(email, code);
  if (!sent) {
    return NextResponse.json(
      { error: "验证码没发出去，请稍后再试" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 10: 写 `src/app/api/auth/email/verify/route.ts`**

```ts
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { loginCodes, users } from "@/db/schema";
import {
  MAX_ATTEMPTS,
  codeMatches,
  isValidEmail,
  normalizeEmail,
} from "@/lib/email-code";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sanitizeNext,
  sessionSecret,
  signSession,
} from "@/lib/auth";
import { siteConfig } from "@/config/site";

/** POST /api/auth/email/verify —— 校验验证码，签发会话 */
export async function POST(request: Request) {
  await connection();

  const secret = sessionSecret();
  if (!secret) {
    return NextResponse.json({ error: "登录暂未开放" }, { status: 503 });
  }

  let body: { email?: string; code?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  const code = (body.code ?? "").trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "邮箱或验证码不对" }, { status: 400 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库暂时不可用" }, { status: 503 });
  }

  const [record] = await db
    .select()
    .from(loginCodes)
    .where(eq(loginCodes.email, email))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "请先申请验证码" }, { status: 400 });
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "验证码过期了，重新申请一封" },
      { status: 400 }
    );
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "这条验证码试太多次了，重新申请一封" },
      { status: 400 }
    );
  }

  if (!codeMatches(code, record.codeHash, secret)) {
    // 失败也要计数：六位数只有一百万种，不计数就能慢慢试出来
    await db
      .update(loginCodes)
      .set({ attempts: sql`${loginCodes.attempts} + 1` })
      .where(eq(loginCodes.id, record.id));
    return NextResponse.json({ error: "验证码不对" }, { status: 400 });
  }

  // 用完即焚：同一个邮箱的旧码全部清掉
  await db.delete(loginCodes).where(eq(loginCodes.email, email));

  const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL ?? "");
  const role = ownerEmail && email === ownerEmail ? "owner" : "visitor";

  const [user] = await db
    .insert(users)
    .values({ email, login: email.split("@")[0], role })
    .onConflictDoUpdate({
      target: users.email,
      // 站长邮箱可能后来才配进环境变量，所以每次登录都按当前配置重算角色
      set: { role, lastSeenAt: new Date() },
    })
    .returning({ id: users.id, role: users.role });

  if (!user) {
    return NextResponse.json({ error: "写入用户失败" }, { status: 500 });
  }

  const session = await signSession(user.id, secret);
  const res = NextResponse.json({
    ok: true,
    role: user.role,
    next: sanitizeNext(body.next ?? null),
  });
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: siteConfig.url.startsWith("https://"),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
```

- [ ] **Step 11: 写退出登录 `src/app/api/auth/email/logout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { siteConfig } from "@/config/site";

/** POST /api/auth/email/logout —— 清掉会话 cookie 后回首页 */
export async function POST() {
  const res = NextResponse.redirect(new URL("/", siteConfig.url), {
    status: 303,
  });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 12: 写登录页 `src/app/(site)/login/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { mailConfig } from "@/lib/mailer";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "登录" };

// 读会话与 SMTP 配置，每次请求现算；预渲染停在 connection()，静态壳校验随之关掉
export const instant = false;

export default async function LoginPage() {
  await connection();
  const user = await getSessionUser();
  const mail = mailConfig();
  const ownerConfigured = Boolean(process.env.OWNER_EMAIL?.trim());

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">登录</h1>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        邮箱验证码 · 不需要密码
      </p>

      {user ? (
        <div className="mt-8 divide-y divide-rule border-y border-rule">
          <div className="flex items-baseline justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="truncate font-heading text-[16px] font-bold">
                {user.login}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {user.role === "owner" ? "站长" : "访客"}
              </p>
            </div>
            {user.role === "owner" && (
              <Link
                href="/write"
                className="shrink-0 border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
              >
                写一条
              </Link>
            )}
          </div>
          <form action="/api/auth/email/logout" method="post" className="py-4">
            <button
              type="submit"
              className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              退出登录
            </button>
          </form>
        </div>
      ) : !mail.enabled ? (
        <div className="mt-8 border border-rule bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h2 className="mt-3 font-heading text-[19px] font-bold">
            登录暂未开放
          </h2>
          <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
            服务器还没配置发信账号（SMTP_USER / SMTP_PASS），验证码发不出去。浏览不受影响。
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <LoginForm ownerConfigured={ownerConfigured} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 13: 写 `src/components/auth/login-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 两步登录：先要码，再验码。
 *
 * 两步都自己发 fetch 而不是 Server Action：登录要在响应里写 cookie，
 * Route Handler 比 Action 直白。
 */
export function LoginForm({ ownerConfigured }: { ownerConfigured: boolean }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function requestCode() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "发送失败");
        return;
      }
      setStep("code");
      setNotice("验证码已发出。收不到先翻一下垃圾箱。");
    } catch {
      setError("网络异常，稍后再试");
    } finally {
      setPending(false);
    }
  }

  async function verify() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "验证失败");
        return;
      }
      window.location.assign(data?.next ?? "/");
    } catch {
      setError("网络异常，稍后再试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="divide-y divide-rule border-y border-rule"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "email") void requestCode();
        else void verify();
      }}
    >
      <div className="py-4">
        <label
          htmlFor="email"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={step === "code"}
          className="mt-2 h-10 rounded-none border-rule bg-transparent font-mono text-[14px]"
          placeholder="you@example.com"
        />
      </div>

      {step === "code" && (
        <div className="py-4">
          <label
            htmlFor="code"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            Code
          </label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            pattern="\d{6}"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-2 h-10 rounded-none border-rule bg-transparent font-mono text-[20px] tracking-[0.3em] tabular-nums"
            placeholder="000000"
          />
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            10 分钟内有效 · 最多试 5 次
          </p>
        </div>
      )}

      {notice && (
        <p className="py-3 font-mono text-[11px] text-ok" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="py-3 font-mono text-[11px] text-alert" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 py-4">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-data px-4 font-mono text-[12px] text-background hover:bg-data/90"
        >
          {pending ? "处理中…" : step === "email" ? "发验证码" : "登录"}
        </Button>
        {step === "code" && (
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setNotice(null);
              setError(null);
            }}
            className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            换个邮箱
          </button>
        )}
      </div>

      {!ownerConfigured && (
        <p className="py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          服务器没配 OWNER_EMAIL：登录能成功，但没人会被认成站长，发布页仍然进不去。
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 14: 导航加「登录」入口**

`src/components/site/navbar.tsx`：在 GitHub 按钮之后、`<ThemeToggle />` 之前插入（**不读会话**，保持全站布局静态）：

```tsx
            <Link
              href="/login"
              className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              登录
            </Link>
```

- [ ] **Step 15: 补环境变量样例与 compose**

`.env.example` 末尾追加：

```bash
# 邮箱验证码登录（QQ 邮箱：设置 → 账户 → 开启 SMTP，拿到的是授权码不是登录密码）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
# 站长邮箱：只有这个邮箱登录后是 owner，能发动态
OWNER_EMAIL=
```

`docker-compose.yml` 的 app 服务 `environment` 里、`AUTH_SECRET: ${AUTH_SECRET:-}` 之后追加：

```yaml
      SMTP_HOST: ${SMTP_HOST:-smtp.qq.com}
      SMTP_PORT: ${SMTP_PORT:-465}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      OWNER_EMAIL: ${OWNER_EMAIL:-}
```

- [ ] **Step 16: `package.json` 加测试，跑门禁**

```json
"test": "node --test scripts/life.test.mjs scripts/tokens.test.mjs scripts/weather.test.mjs scripts/github-activity.test.mjs scripts/schema.test.mjs scripts/moment-core.test.mjs scripts/email-code.test.mjs"
```

```bash
npm run type-check && npm run lint && npm test && npm run build
```

Expected: 全绿。构建日志里 `/login` 与 `/api/auth/email/*` 都应是 `ƒ`（动态）。

- [ ] **Step 17: 手工验证未配置 SMTP 的降级**

不带 SMTP 变量起 dev，打开 `/login`：

Expected: 显示「登录暂未开放」面板，不是报错，也不是空表单。

- [ ] **Step 18: 提交**

```bash
git add -A
git commit -m "feat(auth): 邮箱验证码登录——只存哈希、限频、用完即焚，未配 SMTP 时整体降级"
```

---

### Task 4: 图片上传与 /media 读取

**Files:**
- Create: `src/lib/media-limits.ts`
- Create: `src/lib/upload-core.ts`
- Create: `scripts/upload-core.test.mjs`
- Create: `src/lib/uploads-server.ts`
- Create: `src/app/api/uploads/route.ts`
- Create: `src/app/media/[...path]/route.ts`
- Create: `src/components/write/image-picker.tsx`
- Modify: `Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `.gitignore`
- Modify: `.dockerignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 3 的 `getSessionUser()`（含 `role`）。
- Produces:
  - `MAX_IMAGE_BYTES`（2MB）、`MAX_IMAGES_PER_MOMENT`（9）——只定义在 `src/lib/media-limits.ts`，**零 import**，客户端与服务端都直接引这一份（`upload-core.ts` 不转发）
  - `sniffImageType(bytes: Uint8Array): "webp" | "jpeg" | "png" | null`
  - `contentHash(bytes: Uint8Array): string`、`mediaDirName(date: Date): string`、`mediaFileName(hash, type): string`、`isSafeMediaPath(segments: string[]): boolean`
  - `uploadRoot()`、`writeUpload(relPath, bytes)`、`readUpload(segments): Promise<{ bytes: Uint8Array; mime: string } | null>`
  - `POST /api/uploads` → `{ path: "/media/YYYY/MM/<hash>.<ext>" }`
  - `<ImagePicker value={string[]} onChange={(next: string[]) => void} />`

- [ ] **Step 1: 先写会失败的魔数测试**

创建 `scripts/upload-core.test.mjs`：

```js
/**
 * 图片落盘的纯逻辑：认格式、算哈希、拼路径、挡穿越。
 *   node --test scripts/upload-core.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contentHash,
  isSafeMediaPath,
  mediaDirName,
  mediaFileName,
  sniffImageType,
} from "../src/lib/upload-core.ts";

const bytes = (...xs) => new Uint8Array(xs);

test("认得 WebP / JPEG / PNG 的魔数", () => {
  const webp = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);
  const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
  const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0);
  assert.equal(sniffImageType(webp), "webp");
  assert.equal(sniffImageType(jpeg), "jpeg");
  assert.equal(sniffImageType(png), "png");
});

test("别的一律不认：改个扩展名骗不过去", () => {
  assert.equal(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38)), null); // GIF
  assert.equal(
    sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20)),
    null
  ); // RIFF/AVI
  assert.equal(sniffImageType(new Uint8Array(0)), null);
  assert.equal(sniffImageType(bytes(0x3c, 0x73, 0x76, 0x67)), null);
});

test("内容哈希稳定且是 64 位十六进制", () => {
  const a = contentHash(bytes(1, 2, 3));
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(a, contentHash(bytes(1, 2, 3)));
  assert.notEqual(a, contentHash(bytes(1, 2, 4)));
});

test("目录按北京时间分年月", () => {
  // 2026-10-31T17:00:00Z = 北京时间 11 月 1 日 01:00
  assert.equal(mediaDirName(new Date("2026-10-31T17:00:00Z")), "2026/11");
  assert.equal(mediaDirName(new Date("2026-01-05T00:00:00Z")), "2026/01");
});

test("文件名用哈希前 32 位加扩展名", () => {
  const hash = "a".repeat(64);
  assert.equal(
    mediaFileName(hash, "webp"),
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp"
  );
  assert.equal(
    mediaFileName(hash, "jpeg"),
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"
  );
  assert.equal(
    mediaFileName(hash, "png"),
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png"
  );
});

test("路径穿越一律拒绝", () => {
  assert.equal(
    isSafeMediaPath(["2026", "11", "a".repeat(32) + ".webp"]),
    true
  );
  for (const bad of [
    ["..", "etc", "passwd"],
    ["2026", "..", "x.webp"],
    ["2026/11/x.webp"],
    ["2026", "11", "x.webp/../../y"],
    ["2026", "11", ".hidden.webp"],
    [],
  ]) {
    assert.equal(isSafeMediaPath(bad), false, `应当拒绝 ${JSON.stringify(bad)}`);
  }
});
```

- [ ] **Step 2: 跑一遍确认失败**

Run: `node --test scripts/upload-core.test.mjs`
Expected: FAIL —— 模块不存在。

- [ ] **Step 3: 写 `src/lib/media-limits.ts`**

```ts
/**
 * 图片上限。单独一个文件、零 import，因为 `"use client"` 组件要读它——
 * 带 `node:` 内置模块的 upload-core.ts 一旦被客户端引用就会打包失败。
 */

/** 单张上限 2MB（压缩之后仍然超标就拒绝，不偷偷降质量） */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** 一条动态最多 9 张 */
export const MAX_IMAGES_PER_MOMENT = 9;
```

- [ ] **Step 4: 写 `src/lib/upload-core.ts`**

```ts
import { createHash } from "node:crypto";

/**
 * 图片上传的纯逻辑。
 *
 * 为什么自己嗅魔数而不是信 Content-Type：请求头是客户端说了算的，
 * 只按 MIME 放行等于让人随便往服务器塞任意字节。
 *
 * 注意这里**不 import `./media-limits`**：本文件要被 `node --test` 直接加载，
 * 而 Node 不解析无扩展名的相对导入（Next 的打包器能，Node 不能）。
 * 上限常量只在 media-limits.ts 定义，需要它的地方（路由、客户端组件）直接引那一份。
 */

export type ImageType = "webp" | "jpeg" | "png";

const EXT: Record<ImageType, string> = {
  webp: "webp",
  jpeg: "jpg",
  png: "png",
};

const MIME: Record<ImageType, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
};

export function mimeOf(type: ImageType): string {
  return MIME[type];
}

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  return null;
}

/** 文件名用内容哈希：同一张图传两次只占一份，也顺手做了去重 */
export function contentHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** 按北京时间分年月，和全站其余日期口径一致 */
export function mediaDirName(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}/${month}`;
}

export function mediaFileName(hash: string, type: ImageType): string {
  return `${hash.slice(0, 32)}.${EXT[type]}`;
}

const FILE = /^[a-f0-9]{32}\.(webp|jpg|png)$/;

/**
 * 只放行 `YYYY/MM/<32 位哈希>.<ext>` 这一种形状。
 * 拒绝 `..`、拒绝带斜杠的段、拒绝隐藏文件——路径拼接之前先过这一关。
 */
export function isSafeMediaPath(segments: string[]): boolean {
  if (segments.length !== 3) return false;
  const [year, month, file] = segments;
  if (!/^\d{4}$/.test(year)) return false;
  if (!/^\d{2}$/.test(month)) return false;
  return FILE.test(file);
}
```

- [ ] **Step 5: 跑测试**

Run: `node --test scripts/upload-core.test.mjs`
Expected: PASS（6 个用例）。

- [ ] **Step 6: 写 `src/lib/uploads-server.ts`**

```ts
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { mimeOf, sniffImageType } from "@/lib/upload-core";

/**
 * 上传目录的读写。
 *
 * 不写 `public/`：standalone 产物里的 public 是构建时拷进去的只读快照，
 * 运行期往里写既不会进镜像，也活不过下一次部署。所以挂在容器 volume 上，
 * 由 `/media/[...path]` 这个 Route Handler 读出来。
 */
export function uploadRoot(): string {
  return process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "uploads");
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** 写一张图；同内容已存在就直接复用，不重写 */
export async function writeUpload(
  relPath: string,
  bytes: Uint8Array
): Promise<void> {
  const target = path.join(uploadRoot(), ...relPath.split("/"));
  if (await exists(target)) return;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

export async function readUpload(
  segments: string[]
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const target = path.join(uploadRoot(), ...segments);
  try {
    const buf = await readFile(target);
    const type = sniffImageType(buf);
    if (!type) return null;
    return { bytes: new Uint8Array(buf), mime: mimeOf(type) };
  } catch {
    return null;
  }
}
```

- [ ] **Step 7: 写 `src/app/api/uploads/route.ts`**

```ts
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { MAX_IMAGE_BYTES } from "@/lib/media-limits";
import {
  contentHash,
  mediaDirName,
  mediaFileName,
  sniffImageType,
} from "@/lib/upload-core";
import { writeUpload } from "@/lib/uploads-server";

/** POST /api/uploads —— 只有站长能传图，一张一个请求 */
export async function POST(request: Request) {
  await connection();

  const user = await getSessionUser();
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "只有站长能上传图片" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "没有收到文件" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "单张图片不能超过 2MB" },
      { status: 413 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) {
    return NextResponse.json(
      { error: "只接受 WebP / JPEG / PNG" },
      { status: 415 }
    );
  }

  const dir = mediaDirName(new Date());
  const name = mediaFileName(contentHash(bytes), type);
  const relPath = `${dir}/${name}`;

  try {
    await writeUpload(relPath, bytes);
  } catch (err) {
    console.error("[upload] 落盘失败：", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }

  return NextResponse.json({ path: `/media/${relPath}` });
}
```

- [ ] **Step 8: 写 `src/app/media/[...path]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { isSafeMediaPath } from "@/lib/upload-core";
import { readUpload } from "@/lib/uploads-server";

/**
 * GET /media/2026/11/<hash>.webp —— 把上传目录里的图读出来。
 *
 * 文件名是内容哈希，所以可以放心 immutable 长缓存。
 * 路径先过白名单：`..`、隐藏文件、多层嵌套一律 404，绝不拼进文件系统。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  await connection();
  const { path: segments } = await params;

  if (!isSafeMediaPath(segments)) {
    return new NextResponse(null, { status: 404 });
  }

  const file = await readUpload(segments);
  if (!file) return new NextResponse(null, { status: 404 });

  // 先拷成独立的 ArrayBuffer 再交给 Response，类型上不需要强转
  const copy = new Uint8Array(file.bytes.byteLength);
  copy.set(file.bytes);
  return new NextResponse(copy.buffer, {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

- [ ] **Step 9: 写 `src/components/write/image-picker.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
// 只从零依赖的 media-limits 取常量：upload-core 带 node:crypto，不能进客户端包
import { MAX_IMAGES_PER_MOMENT } from "@/lib/media-limits";

/** 长边压到 2400px 以内、转 WebP 0.82——手机原图动辄 5MB，压完通常 300KB 上下 */
const MAX_EDGE = 2400;
const QUALITY = 0.82;

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("这个浏览器不支持 canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY)
  );
  if (!blob) throw new Error("压缩失败");
  return blob;
}

/**
 * 选图 → 压缩 → 上传，拿回站内路径。
 * 上传失败的图直接报出来，不静默丢掉——用户以为传上去了才是最糟的。
 */
export function ImagePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setPending(true);
    const next = [...value];
    try {
      for (const file of Array.from(files)) {
        if (next.length >= MAX_IMAGES_PER_MOMENT) {
          setError(`最多 ${MAX_IMAGES_PER_MOMENT} 张`);
          break;
        }
        const blob = await compress(file);
        const form = new FormData();
        form.append(
          "file",
          new File([blob], "photo.webp", { type: "image/webp" })
        );
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.path) {
          setError(data?.error ?? "上传失败");
          break;
        }
        next.push(data.path);
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "压缩失败");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((src) => (
          <div key={src} className="relative border border-rule">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="block size-20 object-cover" />
            <button
              type="button"
              aria-label="移除这张图"
              onClick={() => onChange(value.filter((x) => x !== src))}
              className="absolute -right-2 -top-2 rounded-full border border-rule bg-background p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {value.length < MAX_IMAGES_PER_MOMENT && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="flex size-20 items-center justify-center border border-dashed border-rule font-mono text-[10px] text-muted-foreground transition-colors hover:border-data hover:text-foreground disabled:opacity-50"
          >
            {pending ? "上传中" : "加图"}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        multiple
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {error && (
        <p className="mt-2 font-mono text-[11px] text-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 10: 容器与本地都挂上上传目录**

`Dockerfile` 的 runner 阶段，在 `RUN chmod +x ./entrypoint.sh` 之后、`USER nextjs` 之前加：

```dockerfile
# 上传目录：镜像里只建空目录并交给运行用户，实际内容由 volume 覆盖
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
```

`docker-compose.yml` 的 app 服务里，在 `ports:` 之前加：

```yaml
    volumes:
      - uploads:/app/uploads
```

并在该服务的 `environment:` 块里加一行：

```yaml
      UPLOAD_DIR: /app/uploads
```

文件末尾的 `volumes:` 段改成：

```yaml
volumes:
  pgdata:
  uploads:
```

`.gitignore` 末尾加：

```gitignore
# 本地开发时的上传目录
/uploads
```

`.dockerignore` 末尾加（别把本地照片打进镜像）：

```gitignore
uploads
```

- [ ] **Step 11: 手工验证一条链路**

```bash
DATABASE_URL="postgres://blog:blog@127.0.0.1:5432/blog" UPLOAD_DIR="./uploads" AUTH_SECRET="local-dev" OWNER_EMAIL="me@example.com" npm run dev
```

SMTP 没配时无法真收信，可以临时把库里那条验证码改成已知值再走登录：

```bash
DATABASE_URL="postgres://blog:blog@127.0.0.1:5432/blog" AUTH_SECRET="local-dev" npx tsx -e "import postgres from 'postgres'; import { hashCode } from './src/lib/email-code'; const sql=postgres(process.env.DATABASE_URL!,{max:1}); (async()=>{ const h=hashCode('123456', process.env.AUTH_SECRET!); await sql\`UPDATE login_codes SET code_hash=\${h}, expires_at=now()+interval '10 minutes'\`; await sql.end(); console.log('已把最新验证码改成 123456'); })()"
```

Expected: 登录成功；`/api/uploads` 收到图后返回 `/media/YYYY/MM/<hash>.webp`；直接打开该地址能看到图；`uploads/YYYY/MM/` 下出现同名文件；用非 owner 账号调用返回 403。

- [ ] **Step 12: `package.json` 加测试，跑门禁**

```json
"test": "node --test scripts/life.test.mjs scripts/tokens.test.mjs scripts/weather.test.mjs scripts/github-activity.test.mjs scripts/schema.test.mjs scripts/moment-core.test.mjs scripts/email-code.test.mjs scripts/upload-core.test.mjs"
```

```bash
npm run type-check && npm run lint && npm test
```

- [ ] **Step 13: 提交**

```bash
git add -A
git commit -m "feat(upload): 图片上传——浏览器端压到 2400px WebP，服务端嗅魔数、按内容哈希落盘"
```

---

### Task 5: 发布页与 createMoment

**Files:**
- Create: `src/lib/moment-input.ts`
- Create: `scripts/moment-input.test.mjs`
- Create: `src/app/(site)/write/actions.ts`
- Create: `src/app/(site)/write/page.tsx`
- Create: `src/components/write/moment-form.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 的 `moments` 表；Task 2 的 `cacheTag("moments")` 契约；Task 3 的 `getSessionUser()`；Task 4 的 `ImagePicker` 与 `media-limits`。
- Produces:
  - `momentInputSchema`（zod）
  - `parseMomentInput(formData: FormData): { ok: true; value: MomentInput } | { ok: false; error: string }`
  - `MomentInput`（见下）
  - `createMoment(prev: MomentFormState, formData: FormData): Promise<MomentFormState>`
  - `MomentFormState = { error?: string }`

- [ ] **Step 1: 先写会失败的校验测试**

创建 `scripts/moment-input.test.mjs`：

```js
/**
 * 发布表单的校验。
 *   node --test scripts/moment-input.test.mjs
 *
 * 这个模块 import zod（裸包名，node 解析得到），不碰 `@/` 别名。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MOMENT_KIND_VALUES,
  momentInputSchema,
  parseMomentInput,
} from "../src/lib/moment-input.ts";
import { MOMENT_KINDS } from "../src/lib/moment-core.ts";

const fd = (entries) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else f.append(k, v);
  }
  return f;
};

const MEDIA = `/media/2026/11/${"a".repeat(32)}.webp`;

test("纯文字：正文够长就能发，卡片字段被丢掉", () => {
  const r = parseMomentInput(fd({ kind: "text", body: "降温了。" }));
  assert.equal(r.ok, true);
  assert.equal(r.value.kind, "text");
  assert.equal(r.value.body, "降温了。");
  assert.equal(r.value.card, undefined);
});

test("图文：没有图也没有正文要拒绝", () => {
  const r = parseMomentInput(fd({ kind: "photo", body: "" }));
  assert.equal(r.ok, false);
});

test("图文：只有图也行", () => {
  const r = parseMomentInput(fd({ kind: "photo", body: "", images: MEDIA }));
  assert.equal(r.ok, true);
  assert.equal(r.value.images.length, 1);
});

test("图路径必须是 /media/ 下的哈希名", () => {
  const r = parseMomentInput(
    fd({ kind: "photo", body: "x", images: "https://evil.example/x.png" })
  );
  assert.equal(r.ok, false);
});

test("读数卡：缺标题要拒绝，字段齐了能发", () => {
  assert.equal(
    parseMomentInput(fd({ kind: "song", cardTitle: "", cardMeta: "坂本龍一" }))
      .ok,
    false
  );
  const r = parseMomentInput(
    fd({ kind: "song", cardTitle: "Merry Christmas", cardMeta: "坂本龍一" })
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.card, {
    title: "Merry Christmas",
    meta: "坂本龍一",
  });
});

test("未知 kind 拒绝，不猜", () => {
  assert.equal(parseMomentInput(fd({ kind: "video", body: "x" })).ok, false);
});

test("正文超长拒绝", () => {
  const r = parseMomentInput(fd({ kind: "text", body: "字".repeat(2001) }));
  assert.equal(r.ok, false);
});

test("可选字段去空白后为空就不进对象", () => {
  const r = parseMomentInput(
    fd({ kind: "text", body: "x", mood: "   ", place: "杭州" })
  );
  assert.equal(r.ok, true);
  assert.equal(r.value.mood, undefined);
  assert.equal(r.value.place, "杭州");
});

test("schema 单独可用（给将来的编辑接口留口子）", () => {
  assert.equal(
    momentInputSchema.safeParse({ kind: "text", body: "" }).success,
    false
  );
});

test("kind 清单与读取层那份必须一致", () => {
  // 两份清单不能合并：moment-input.ts 要被 node --test 直接加载，
  // 而 Node 不解析无扩展名的相对导入，所以它没法 import moment-core.ts。
  // 与其留一个无声的漂移口子，不如让这条断言替我们盯着。
  assert.deepEqual([...MOMENT_KIND_VALUES], [...MOMENT_KINDS]);
});
```

- [ ] **Step 2: 跑一遍确认失败**

Run: `node --test scripts/moment-input.test.mjs`
Expected: FAIL —— 模块不存在。

- [ ] **Step 3: 写 `src/lib/moment-input.ts`**

```ts
import { z } from "zod";
import type { Moment } from "./life";

/**
 * 发布表单的校验。
 *
 * 服务端和客户端共用同一份规则：客户端拿它做即时提示，服务端拿它当唯一防线
 * （Server Action 能被直接 POST，界面上的 required 不算数）。
 */

export const MOMENT_KIND_VALUES = [
  "text",
  "photo",
  "song",
  "shelf",
  "quote",
  "link",
] as const;

const CARD_KINDS = new Set<string>(["song", "shelf", "quote", "link"]);

const MEDIA_PATH = /^\/media\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(webp|jpg|png)$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const momentInputSchema = z
  .object({
    kind: z.enum(MOMENT_KIND_VALUES),
    body: z.string().trim().max(2000).default(""),
    images: z.array(z.string().regex(MEDIA_PATH)).max(9).default([]),
    mood: optionalText(20),
    weather: optionalText(20),
    place: optionalText(40),
    cardTitle: optionalText(120),
    cardMeta: optionalText(120),
    cardNote: optionalText(400),
    cardHref: optionalText(500),
  })
  .superRefine((value, ctx) => {
    const hasBody = value.body.length > 0;
    const hasImages = value.images.length > 0;

    if (CARD_KINDS.has(value.kind)) {
      if (!value.cardTitle || !value.cardMeta) {
        ctx.addIssue({
          code: "custom",
          message: "读数卡要有标题和来源",
          path: ["cardTitle"],
        });
      }
      return;
    }

    // 短记 / 图文：至少得有字或有图，空条目不该发出去
    if (!hasBody && !hasImages) {
      ctx.addIssue({
        code: "custom",
        message: "写点什么，或者放张图",
        path: ["body"],
      });
    }
  });

export interface MomentInput {
  kind: Moment["kind"];
  body: string;
  images: string[];
  mood?: string;
  weather?: string;
  place?: string;
  card?: { title: string; meta: string; note?: string; href?: string };
}

type ParseResult =
  | { ok: true; value: MomentInput }
  | { ok: false; error: string };

export function parseMomentInput(formData: FormData): ParseResult {
  const raw = {
    kind: String(formData.get("kind") ?? ""),
    body: String(formData.get("body") ?? ""),
    images: formData.getAll("images").map(String),
    mood: String(formData.get("mood") ?? ""),
    weather: String(formData.get("weather") ?? ""),
    place: String(formData.get("place") ?? ""),
    cardTitle: String(formData.get("cardTitle") ?? ""),
    cardMeta: String(formData.get("cardMeta") ?? ""),
    cardNote: String(formData.get("cardNote") ?? ""),
    cardHref: String(formData.get("cardHref") ?? ""),
  };

  const parsed = momentInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "表单内容不对" };
  }

  const v = parsed.data;
  const value: MomentInput = {
    kind: v.kind,
    body: v.body,
    images: v.images,
  };
  if (v.mood) value.mood = v.mood;
  if (v.weather) value.weather = v.weather;
  if (v.place) value.place = v.place;

  if (CARD_KINDS.has(v.kind) && v.cardTitle && v.cardMeta) {
    value.card = { title: v.cardTitle, meta: v.cardMeta };
    if (v.cardNote) value.card.note = v.cardNote;
    if (v.cardHref) value.card.href = v.cardHref;
  }

  return { ok: true, value };
}
```

- [ ] **Step 4: 跑测试**

Run: `node --test scripts/moment-input.test.mjs`
Expected: PASS（9 个用例）。

- [ ] **Step 5: 写 `src/app/(site)/write/actions.ts`**

```ts
"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { moments as momentsTable } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseMomentInput } from "@/lib/moment-input";

export interface MomentFormState {
  error?: string;
}

/**
 * 发一条动态。
 *
 * 三道关必须都在服务端：Action 是公开的 POST 入口，页面上藏掉表单不算数。
 * 写成功后 `updateTag("moments")`——这是 read-your-own-writes 场景，
 * 站长发完立刻要在首页看到它，不能等缓存自然过期。
 */
export async function createMoment(
  _prev: MomentFormState,
  formData: FormData
): Promise<MomentFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "先登录" };
  if (user.role !== "owner") return { error: "只有站长能发动态" };

  const parsed = parseMomentInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用" };

  const { kind, body, images, mood, weather, place, card } = parsed.value;

  let id: number;
  try {
    const [row] = await db
      .insert(momentsTable)
      .values({
        kind,
        body,
        images,
        mood: mood ?? null,
        weather: weather ?? null,
        place: place ?? null,
        card: card ?? null,
        publishedAt: new Date(),
      })
      .returning({ id: momentsTable.id });
    if (!row) return { error: "保存失败" };
    id = row.id;
  } catch (err) {
    console.error("[write] 保存动态失败：", err);
    return { error: "保存失败，稍后再试" };
  }

  updateTag("moments");
  redirect(`/life/${id}`);
}
```

- [ ] **Step 6: 写 `src/app/(site)/write/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { MomentForm } from "@/components/write/moment-form";

export const metadata: Metadata = { title: "写一条" };

// 读会话，每次请求现算
export const instant = false;

export default async function WritePage() {
  await connection();
  const user = await getSessionUser();

  if (!user) {
    return (
      <Shell>
        <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
          发布需要登录。
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
        >
          去登录
        </Link>
      </Shell>
    );
  }

  if (user.role !== "owner") {
    return (
      <Shell>
        <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
          这个入口只对站长开放。你现在是访客身份。
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mt-8">
        <MomentForm />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">写一条</h1>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        短记 / 图文 / 读数卡 · 发布后立刻出现在首页
      </p>
      {children}
    </div>
  );
}
```

- [ ] **Step 7: 写 `src/components/write/moment-form.tsx`**

```tsx
"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "./image-picker";
import { createMoment, type MomentFormState } from "@/app/(site)/write/actions";

const KINDS = [
  { value: "text", label: "短记" },
  { value: "photo", label: "图文" },
  { value: "song", label: "在听" },
  { value: "shelf", label: "书影音" },
  { value: "quote", label: "摘录" },
  { value: "link", label: "链接" },
] as const;

const CARD_KINDS = new Set(["song", "shelf", "quote", "link"]);

const initialState: MomentFormState = {};

/**
 * 发布表单。
 *
 * 图片先走 /api/uploads 拿到站内路径，再把路径放进隐藏字段跟着 Action 提交——
 * 图片不走 Action 的请求体（Action 默认 1MB 上限，一张图就能顶爆）。
 */
export function MomentForm() {
  const [state, formAction, pending] = useActionState(createMoment, initialState);
  const [kind, setKind] = useState<string>("text");
  const [images, setImages] = useState<string[]>([]);
  const isCard = CARD_KINDS.has(kind);

  return (
    <form action={formAction} className="divide-y divide-rule border-y border-rule">
      <fieldset className="py-4">
        <legend className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Kind
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <label
              key={k.value}
              className={`cursor-pointer border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                kind === k.value
                  ? "border-data text-data"
                  : "border-rule text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
                className="sr-only"
              />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      {isCard ? (
        <div className="space-y-4 py-4">
          <Field label="标题 / 曲名" name="cardTitle" maxLength={120} />
          <Field label="作者 / 艺人 / 出处" name="cardMeta" maxLength={120} />
          <Field label="一句推荐（可选）" name="cardNote" maxLength={400} />
          <Field
            label="外链（可选，https://）"
            name="cardHref"
            type="url"
            maxLength={500}
          />
        </div>
      ) : null}

      <div className="py-4">
        <label
          htmlFor="body"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          {isCard ? "正文（可选）" : "正文"}
        </label>
        <Textarea
          id="body"
          name="body"
          rows={5}
          maxLength={2000}
          className="mt-2 min-h-28 rounded-none border-rule bg-transparent font-heading text-[16px] leading-[1.7]"
          placeholder="一两句话就够。"
        />
      </div>

      {kind === "photo" && (
        <div className="py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Images
          </p>
          <div className="mt-3">
            <ImagePicker value={images} onChange={setImages} />
            {images.map((src) => (
              <input key={src} type="hidden" name="images" value={src} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 py-4 sm:grid-cols-3">
        <Field label="心情（可选）" name="mood" maxLength={20} />
        <Field label="天气（可选）" name="weather" maxLength={20} />
        <Field label="地点（可选）" name="place" maxLength={40} />
      </div>

      {state.error && (
        <p className="py-3 font-mono text-[11px] text-alert" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 py-4">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none bg-data px-4 font-mono text-[12px] text-background hover:bg-data/90"
        >
          {pending ? "发布中…" : "发布"}
        </Button>
        <span className="font-mono text-[10px] text-muted-foreground">
          发布后立刻出现在首页
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        maxLength={maxLength}
        className="mt-2 h-9 rounded-none border-rule bg-transparent font-mono text-[13px]"
      />
    </div>
  );
}
```

- [ ] **Step 8: `package.json` 加测试，跑门禁**

```json
"test": "node --test scripts/life.test.mjs scripts/tokens.test.mjs scripts/weather.test.mjs scripts/github-activity.test.mjs scripts/schema.test.mjs scripts/moment-core.test.mjs scripts/email-code.test.mjs scripts/upload-core.test.mjs scripts/moment-input.test.mjs"
```

```bash
npm run type-check && npm run lint && npm test && npm run build
```

Expected: 全绿；构建日志里 `/write` 为 `ƒ`。

- [ ] **Step 9: 真机走一遍发布**

按 Task 4 Step 11 的方式登录成 owner，打开 `/write`，选「图文」、写一句、传一张图、发布。

Expected: 跳到 `/life/<id>`；回首页，新条目在最上面（`updateTag` 生效，不需要等缓存过期）。

- [ ] **Step 10: 提交**

```bash
git add -A
git commit -m "feat(write): 站长发布页——三种形态、图片先传后引用、发完立刻刷新生活流"
```

---

### Task 6: 单条动态页 `/life/[id]`

**Files:**
- Create: `src/app/(site)/life/[id]/page.tsx`
- Modify: `src/components/life/moment-meta.tsx`
- Modify: `src/components/life/moment.tsx`
- Modify: `src/components/life/moment-text.tsx`
- Modify: `src/components/life/moment-photo.tsx`
- Modify: `src/components/life/moment-card.tsx`

**Interfaces:**
- Consumes: Task 2 的 `getMomentById` / `getMomentNeighbors`；Task 4 的 `/media/*`。
- Produces: 路由 `/life/[id]`；`MomentMeta` / `Moment` 及三个形态组件都多一个可选 `linked`（默认 `true`）。

- [ ] **Step 1: 让日期成为入口**

把 `src/components/life/moment-meta.tsx` 整份替换为：

```tsx
import Link from "next/link";
import { formatDay, type Moment } from "@/lib/life";

/**
 * 动态头部那一行读数：日期 · 天气 · 地点 · 心情。
 * 等宽 + 表格数字，和观测条同一套语气。
 *
 * 日期同时是「这条的固定链接」——生活流里没有别的地方可以点进单条页，
 * 又不想为它加一个多余的「详情」按钮。
 */
export function MomentMeta({
  moment,
  linked = true,
}: {
  moment: Moment;
  /** 单条页自己不需要链回自己 */
  linked?: boolean;
}) {
  const rest = [moment.weather, moment.place, moment.mood].filter(
    (x): x is string => Boolean(x)
  );

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] tabular-nums text-muted-foreground">
      {linked ? (
        <Link
          href={`/life/${moment.id}`}
          className="transition-colors hover:text-foreground"
        >
          <time dateTime={moment.publishedAt}>
            {formatDay(moment.publishedAt)}
          </time>
        </Link>
      ) : (
        <time dateTime={moment.publishedAt}>
          {formatDay(moment.publishedAt)}
        </time>
      )}
      {rest.map((item, index) => (
        <span key={`${item}-${index}`}>
          <span aria-hidden>·</span> {item}
        </span>
      ))}
    </p>
  );
}
```

- [ ] **Step 2: 把 `linked` 透传下去**

`src/components/life/moment.tsx` 的 `Moment` 改为：

```tsx
export function Moment({
  moment,
  linked = true,
}: {
  moment: MomentData;
  linked?: boolean;
}) {
  if (moment.card) return <MomentCard moment={moment} linked={linked} />;
  if (moment.kind === "photo") {
    return <MomentPhoto moment={moment} linked={linked} />;
  }
  return <MomentText moment={moment} linked={linked} />;
}
```

`moment-text.tsx`、`moment-photo.tsx`、`moment-card.tsx` 三处签名都改成（以 `MomentText` 为例，另两个同名改）：

```tsx
export function MomentText({
  moment,
  linked = true,
}: {
  moment: Moment;
  linked?: boolean;
}) {
```

并把三处内部的 `<MomentMeta moment={moment} />` 改成：

```tsx
      <MomentMeta moment={moment} linked={linked} />
```

- [ ] **Step 3: 写 `src/app/(site)/life/[id]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getMomentById, getMomentNeighbors } from "@/lib/moments-server";
import { formatDay } from "@/lib/life";
import { Moment, NODE_CLASS } from "@/components/life/moment";

// 读数据库，每次请求现算
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { moment } = await getMomentById(id);
  if (!moment) return { title: "动态" };
  const excerpt = moment.body.slice(0, 60) || moment.card?.title || "一条动态";
  return {
    title: `${formatDay(moment.publishedAt)} · ${excerpt}`,
    description: excerpt,
    openGraph: {
      title: excerpt,
      description: excerpt,
      type: "article",
      publishedTime: moment.publishedAt,
    },
  };
}

export default async function MomentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [result, neighbors] = await Promise.all([
    getMomentById(id),
    getMomentNeighbors(id),
  ]);

  if (!result.available) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <div className="border border-rule bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h1 className="mt-3 font-heading text-[19px] font-bold">
            这条动态暂时读不到
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            数据库现在连不上。链接本身是对的，过一会儿再刷新。
          </p>
        </div>
      </div>
    );
  }

  const moment = result.moment;
  if (!moment) notFound();

  const tags = [
    moment.mood ? { label: "MOOD", value: moment.mood } : null,
    moment.weather ? { label: "WEATHER", value: moment.weather } : null,
    moment.place ? { label: "PLACE", value: moment.place } : null,
  ].filter((x): x is { label: string; value: string } => x !== null);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← 生活
      </Link>

      <article className="mt-6">
        <div className="flex items-baseline gap-3 border-b border-rule pb-4">
          <span
            aria-hidden
            className={`size-2 rounded-full ${NODE_CLASS[moment.kind]}`}
          />
          <h1 className="font-mono text-[13px] tabular-nums text-muted-foreground">
            <time dateTime={moment.publishedAt}>
              {formatDay(moment.publishedAt)}
            </time>
          </h1>
        </div>

        {tags.length > 0 && (
          <dl className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <div key={t.label} className="bg-panel-2 px-2 py-1">
                <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t.label}
                </dt>
                <dd className="mt-0.5 font-mono text-[11px]">{t.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-8">
          <Moment moment={moment} linked={false} />
        </div>
      </article>

      <nav className="mt-12 flex items-center justify-between border-t border-rule pt-4 font-mono text-[11px]">
        {neighbors.prev ? (
          <Link
            href={`/life/${neighbors.prev.id}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            ← 上一条
          </Link>
        ) : (
          <span className="text-muted-foreground">这是最早的一条</span>
        )}
        {neighbors.next ? (
          <Link
            href={`/life/${neighbors.next.id}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            下一条 →
          </Link>
        ) : (
          <span className="text-muted-foreground">这是最新的一条</span>
        )}
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: 实测**

```bash
DATABASE_URL="postgres://blog:blog@127.0.0.1:5432/blog" npm run dev
```

Expected: 首页每条动态的日期可点，点进 `/life/<id>`；单条页的日期不可点（自链已去掉）；上一条 / 下一条可用；不存在的 id 走 404；把 `DATABASE_URL` 去掉再刷新，单条页显示「暂时读不到」而不是 404。

- [ ] **Step 5: 门禁与提交**

```bash
npm run type-check && npm run lint && npm test && npm run build
git add -A
git commit -m "feat(life): 单条动态页——固定链接、读数标签、上一条下一条"
```

---

### Task 7: §2.6 遗留的两条动效（纯 CSS）

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/site/observ-bar.tsx`
- Modify: `src/components/life/activity-strip.tsx`
- Create: `src/components/life/digit-roll.tsx`
- Modify: `docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`

**Interfaces:**
- Consumes: 观测条的 `Reading[]`、`GithubActivity`。
- Produces: `<DigitRoll text={string} />`；CSS 类 `.moment-digit`、`.moment-cell`。

**关键原则（两条动效共用）：** 元素的基础样式**就是它的终点状态**，`@keyframes` 只写 `from`。这样动画没跑、跑不了、被 `prefers-reduced-motion` 掐掉时，元素都停在正确位置——没有任何一条规则把内容藏起来等脚本。

- [ ] **Step 1: 先加 CSS**

在 `src/app/globals.css` 的 `@layer components` 块里（`.life-spine` 之前）插入：

```css
/*
 * 观测条数字上翻。
 *
 * 基础样式直接就是终点：`translate` 停在目标数字上；关键帧只写 from（0 位）。
 * 动画只是把它从 0 滚到终点，跑不完或跑不了都还是正确读数。
 */
.moment-digit {
  translate: 0 var(--to);
  animation: digit-roll 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes digit-roll {
  from {
    translate: 0 0;
  }
}

/*
 * 90 天热图逐格点亮。
 *
 * 同理：opacity 的基础值就是这一格该有的深浅，关键帧只写 from（全透明）。
 * backwards 让还在等延迟的格子保持透明，不会先亮一下再重来。
 */
.moment-cell {
  opacity: var(--o);
  animation: cell-in 180ms ease-out backwards;
  animation-delay: calc(var(--i) * 5ms);
}

@keyframes cell-in {
  from {
    opacity: 0;
  }
}
```

并在文件里已有的 `@media (prefers-reduced-motion: reduce)` 块中补一行（否则 90 格 × 5ms 的延迟还在，最后一格要等半秒）：

```css
    animation-delay: 0s !important;
```

- [ ] **Step 2: 写 `src/components/life/digit-roll.tsx`**

```tsx
import type { CSSProperties } from "react";

const DIGITS = "0123456789".split("");

/**
 * 数字上翻：每一位是一条 0–9 的竖带，从 0 滚到自己的数字。
 *
 * 纯 CSS：目标位移写进 `--to`，基础样式就是终点，关键帧只写 from。
 * 没有 JS、没有 effect，关脚本时浏览器照样把动画跑完，终点就是读数本身。
 * 读屏读的是外层那份 `sr-only` 静态文本，这条带子是 `aria-hidden` 的。
 */
export function DigitRoll({ text }: { text: string }) {
  return (
    <span aria-hidden className="inline-flex items-start overflow-hidden">
      {[...text].map((ch, index) =>
        /\d/.test(ch) ? (
          <span
            key={`${ch}-${index}`}
            className="inline-block h-[1em] overflow-hidden"
          >
            <span
              className="moment-digit block"
              style={{ "--to": `-${Number(ch) * 10}%` } as CSSProperties}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`${ch}-${index}`} className="inline-block">
            {ch}
          </span>
        )
      )}
    </span>
  );
}
```

- [ ] **Step 3: 观测条接上（保留一份给读屏的静态文本）**

`src/components/site/observ-bar.tsx` 顶部加 import：

```tsx
import { DigitRoll } from "@/components/life/digit-roll";
```

读数那一格替换为：

```tsx
            {r.available ? (
              <>
                <span className="sr-only">{r.value}</span>
                <span className="font-mono text-[24px] leading-none tabular-nums text-data">
                  <DigitRoll text={r.value} />
                </span>
              </>
            ) : (
```

- [ ] **Step 4: 热图逐格点亮**

`src/components/life/activity-strip.tsx` 顶部加：

```tsx
import type { CSSProperties } from "react";
```

格子替换为：

```tsx
        {activity.days.map((d, index) => (
          <span
            key={d.date}
            className="moment-cell size-[7px] rounded-[1px] bg-data"
            style={
              {
                "--o": d.count === 0 ? 0.12 : Math.min(0.3 + d.count * 0.18, 1),
                "--i": index,
              } as CSSProperties
            }
          />
        ))}
```

- [ ] **Step 5: 改设计文档 §2.6**

表里两行的阶段改成 `2`，并把「读数闪一下」那行改掉：

```markdown
| 读数闪一下 | 缓存刷新的时刻 | 有刷新才动 | 不做 |
```

表下补一段：

```markdown
阶段 2 交付了「观测条数字上翻」与「90 天热图逐格点亮」，两条都是纯 CSS：元素基础样式就是终点状态，关键帧只写 `from`，所以关 JS、`prefers-reduced-motion: reduce`、动画跑不完时都直接停在正确读数上。「读数闪一下」放弃：它要求客户端知道「缓存刚刷新过」，那就得加一个常驻客户端组件去观察，与「全站唯一的客户端常驻组件是页头时钟」直接冲突——为一个装饰性闪动破这条线不值。
```

- [ ] **Step 6: 实测**

```bash
DATABASE_URL="postgres://blog:blog@127.0.0.1:5432/blog" npm run dev
```

逐条确认：
1. 刷新首页，观测条数字从 0 滚到各自的值，约 0.5 秒；
2. 90 格热图从左到右依次亮起；
3. 系统开「减少动态效果」后刷新：数字与格子直接落位，无滚动、无延迟；
4. 禁用 JS 后刷新：数字与格子仍然完整可见且位置正确；
5. 读屏读到的是 `sr-only` 那份静态数字，不是逐位条带。

- [ ] **Step 7: 门禁与提交**

```bash
npm run type-check && npm run lint && npm test && npm run build
git add -A
git commit -m "feat(motion): 观测条数字上翻与热图逐格点亮，纯 CSS，关 JS 直接落位"
```

---

### Task 8: 阶段验收

**Files:**
- Modify: `docs/superpowers/plans/2026-11-08-personal-space-phase-2.md`（追加「## 验收结果」）

- [ ] **Step 1: 全套门禁**

```bash
npm run type-check && npm run lint && npm test && node scripts/check-content.mjs && npm run build
```

Expected: 全绿；`npm test` 用例数 = 阶段 1.5 的 21 + 本阶段新增 31（schema 5 + moment-core 6 + email-code 5 + upload-core 6 + moment-input 9）= 52。

- [ ] **Step 2: 三种数据库状态都要过一遍**

1. **没有 `DATABASE_URL`**：首页观测条 Moments / Month 显示 `NOT AVAILABLE`，左栏显示「生活流暂时读不到」，其余读数照常；`/life/1` 显示「暂时读不到」；`/login` 在没配 SMTP 时显示「登录暂未开放」。
2. **有库、空表**：Moments / Month 显示 `0`，左栏显示「还没有第一条」。
3. **有库、有数据**：首页出现条目，观测条条数与列表长度一致，`/life/<id>` 可达。

- [ ] **Step 3: 关 JS 与两套模式**

关掉 JavaScript 后确认：首页正文、观测条读数、单条页正文全部可见；**服务端返回的 HTML 里没有 `opacity:0`**。

注意不能去 `.next/server/app/` 里找 HTML：首页、`/login`、`/write`、`/life/[id]` 在本阶段都变成了动态路由（`ƒ`），构建期不产出 `.html` 文件，`grep` 一个空集永远「通过」，是假绿灯。必须打运行中的服务器：

```bash
npm run build && (npm start >/tmp/zb-start.log 2>&1 &) && sleep 8
curl -s http://127.0.0.1:3000/ | grep -c "opacity:0" || echo "首页 0 处"
curl -s http://127.0.0.1:3000/login | grep -c "opacity:0" || echo "/login 0 处"
curl -s http://127.0.0.1:3000/write | grep -c "opacity:0" || echo "/write 0 处"
curl -s http://127.0.0.1:3000/life/1 | grep -c "opacity:0" || echo "/life/1 0 处"
```

Expected: 四条都打印 `… 0 处`（`grep -c` 无匹配时退出码 1，所以走 `||` 分支；若打印的是数字 `0`，同样算通过，但不要接受任何非零数字）。

再用浏览器关掉 JS 各页截图确认正文可见；观测台（暗）与报表（亮）两套模式下各截一张首页与一张单条页。

- [ ] **Step 4: 诚实性检查**

```bash
grep -rn "mockMoments\|mock-moments" src/ scripts/ || echo "假数据已删净"
grep -rn "在线\|心跳\|实时" src/app src/components | head
```

Expected: 第一条打印「假数据已删净」；第二条只剩注释或文章正文，没有 UI 文案。

- [ ] **Step 5: 写验收结果并提交**

在计划末尾追加 `## 验收结果`，记下：门禁数字、三种库状态的实际表现、关 JS 结论、两模式截图文件名、遗留项。

```bash
git add -A
git commit -m "docs(phase-2): 验收结果——门禁、三种库状态、关 JS 与两模式实测"
```

---

## 自审

**规格覆盖**：§6.1 `users` 改造 → Task 1；§6.2 `moments` → Task 1（`login_codes` 一并）；§6.3 渲染与缓存 → Task 2（`connection()` + `use cache` + `cacheTag` + `updateTag`）；§7.1 邮箱验证码 → Task 3；§7.2 角色 → Task 3（`OWNER_EMAIL`）；§7.3 降级 → Task 3 Step 17；§8 图片上传 → Task 4；§5.1 单条动态 → Task 6；§2.6 两条动效 → Task 7；§11 验收 → Task 8。

**未覆盖且有意留到后续阶段**：评论（§6.2 `comments`）、信箱（`letters`）、审核后台 → 阶段 3；书架与歌单（`shelf_items` / `songs`）→ 阶段 4；状态句挪进数据库（§13 待定项）→ 阶段 3；`/notes`、`/journal` 路由改名 → 阶段 5；`reveal.tsx` 与 `/interview` 的清理 → 阶段 5。阶段 2 的导航只加一个「登录」链接，头像菜单（登录/登出、我的推荐、管理入口）随阶段 3 的审核后台一起做——现在没有「我的推荐」，先摆一个空菜单是假的。

**类型一致性**：`Moment` 只在 `@/lib/life` 定义一次；Drizzle 行类型叫 `MomentDbRow`，映射函数 `toMoment` 在 `moment-core.ts`，读取层 `moments-server.ts` 三个函数都返回 `Moment`；`SessionUser.role` 由 Task 3 定义，Task 4/5 消费；`ImagePicker` 的 `value` / `onChange` 在 Task 4 定义、Task 5 使用；`updateTag("moments")` 的标签名与 Task 2 的 `cacheTag("moments")` 一致；`MEDIA_PATH` 正则（`moment-input.ts`）与 `isSafeMediaPath`（`upload-core.ts`）描述同一种形状（32 位哈希 + webp/jpg/png）；`MAX_IMAGES_PER_MOMENT` 与 `MAX_IMAGE_BYTES` 只在 `media-limits.ts` 定义一次，`upload-core.ts` 既不定义也不转发（它要被 `node --test` 直接加载，Node 不解析无扩展名相对导入），`image-picker.tsx` 与 `/api/uploads` 各自直接引零依赖那份。

**与设计文档的有意偏差**：`moments.card` 是 §6.2 漏掉的一列，Task 1 Step 8 会把文档补上；观测条的条数读数从 `getObservation()` 移到首页就地计算（避免两个缓存各自过期时条数与列表不一致），`Observation` 的返回类型因此收窄；`sanitizeNext` 的兜底从 `/interview` 改成 `/`（`/interview` 阶段 5 会删）。
