# 个人空间改版 · 阶段 3（评论、信箱、审核后台）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 访客能用邮箱登录后在动态下评论、在信箱留言、推荐歌曲；站长有一个只对 owner 开放的审核后台，能通过/驳回留言与歌曲、隐藏/恢复评论、修改页头状态句。首页「此刻」里的三条示例留言换成数据库里的真实留言。

**Architecture:** 先落 `comments` / `letters` / `songs` / `shelf_items` / `site_settings` 五张表（`shelf_items` 供阶段 4 用），并把表单校验收进一个只依赖 zod 的纯函数模块；再按 `moments-server.ts` 的模式写四个读层（`use cache` + `cacheTag` + `available` 标志）；然后依次接三条访客写入链路（留言、评论、推荐歌）与 owner 审核后台；最后把账号菜单做成服务端 `<details>`，不新增常驻客户端组件。

**Tech Stack:** Next.js 16.4.3（App Router、`cacheComponents`、`use cache` / `cacheLife` / `cacheTag` / `updateTag` / `refresh`、Server Actions）、React 19.3、Tailwind CSS 4.3.3、Drizzle ORM 0.45 + postgres.js、zod 4.6、`node --test`。

---

## Global Constraints

- Next.js 是 16.4.3，**写代码前先读 `node_modules/next/dist/docs/` 下对应章节**：`01-app/01-getting-started/07-mutating-data.md`、`08-caching.md`、`09-revalidating.md`、`15-route-handlers.md`、`01-app/02-guides/forms.md`、`authentication-with-cache-components.md`、`01-app/03-api-reference/04-functions/connection.md`、`cacheTag.md`、`cacheLife.md`、`updateTag.md`、`refresh.md`、`cookies.md`、`01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`。这个版本的 API 与训练数据不同，不要凭记忆写。
- 所有注释与面向用户的文案用中文；代码标识符用英文。
- **不新增任何 npm 依赖。** 图标只用 `lucide-react` 现有项。
- 颜色只能来自 `src/app/globals.css` 的 token；组件里不许写死十六进制。Tailwind 类只用 token 映射名（`bg-panel`、`bg-panel-2`、`text-data`、`text-wait`、`text-ok`、`border-rule`…）。
- **无源读数显示 `NOT AVAILABLE`，不许用 0、空数组或示例数据冒充。** 首页留言、评论、歌单、审核列表读不到时都要显式说明，不显示假条目。
- 所有写操作只能走 Server Actions；每个 Action 必须在服务端重新执行 `getSessionUser()` 与角色检查，页面里藏掉按钮不算数。
- 读库函数一律 `"use cache"` + `cacheLife("minutes")` + `cacheTag(...)`；写成功后 `updateTag(...)`，需要当前页面立即变化时再调用 `refresh()`（仅限 Server Action）。
- 页面里使用 `connection()` 或 `cookies()` 的，必须 `export const instant = false`。页头账号菜单通过 `Suspense` 包住，避免把全站静态壳拖成动态。
- 带 `node:` 内置模块的文件不能被 `"use client"` 组件 import。给 `node --test` 用的纯函数模块**不许有 `@/` 别名 import**，只能 import zod 或 `import type`。
- 客户端组件只允许是表单（`useActionState`）；不新增常驻客户端组件，不新增全局定时器。页头时钟仍是唯一常驻客户端读数。
- 日期显示沿用 `src/lib/life.ts` 的 `formatDay`（北京时间）。不新写时区逻辑。
- 键盘可达：所有表单控件有 `<label>`，链接/按钮有可见 focus 样式；菜单用原生 `<details>`，不拦键盘。
- 本阶段在分支 `refactor/personal-space` 上做，**不要部署、不要合进 main**。
- 每个任务单独提交；每个任务结束跑 `npm run type-check` 与 `npm test`；阶段收尾跑全套门禁：`npm run type-check`、`npm run lint`、`npm test`、`node scripts/check-content.mjs`、`npm run build`。
- 单元测试文件里的被测模块不许有 `@/` 别名 import；相对路径的 `import type` 会被擦除，可以用；值导入必须带 `.ts` 后缀或换成零依赖纯函数。
- 设计文档 §6.2 的 `letters.userId` 是外键，但旧留言板记录没有用户。实现增加两列承接迁移：`guest_name` 与 `legacy_guestbook_id`（唯一，允许多个 NULL），**不为旧留言伪造用户**。

---

## 文件结构

**新建**

| 文件 | 职责 |
| --- | --- |
| `src/lib/community-input.ts` | 留言 / 评论 / 推荐歌 / 状态句的 zod 解析与平台推断，纯函数 |
| `src/lib/login-status.ts` | `loginReady()`：会话密钥 + SMTP 都配了才算登录可用 |
| `src/lib/letters-server.ts` | 信箱读层（已通过留言 + 当前用户自己的待审） |
| `src/lib/comments-server.ts` | 动态 / 笔记评论读层（只读 visible） |
| `src/lib/songs-server.ts` | 歌单读层（已通过歌曲 + 当前用户自己的待审） |
| `src/lib/settings-server.ts` | `site_settings` 读层（当前是状态句） |
| `src/components/letters/letter-card.tsx` | 单条留言面板 |
| `src/components/letters/letter-form.tsx` | 留言表单（客户端，`useActionState`） |
| `src/components/life/comment-list.tsx` | 评论列表（服务端） |
| `src/components/life/comment-form.tsx` | 评论表单（客户端，`useActionState`） |
| `src/components/playlist/song-row.tsx` | 歌单行（整行外链 + 平台标签） |
| `src/components/playlist/song-form.tsx` | 推荐一首表单（客户端，`useActionState`） |
| `src/components/site/account-menu.tsx` | 页头账号菜单（服务端 `<details>`） |
| `src/app/(site)/letters/actions.ts` | `submitLetter` |
| `src/app/(site)/life/[id]/actions.ts` | `submitComment` |
| `src/app/(site)/playlist/actions.ts` | `submitSong` |
| `src/app/(site)/admin/page.tsx` | 审核后台（仅 owner） |
| `src/app/(site)/admin/actions.ts` | 审核 / 状态句 / 评论管理 Actions |
| `scripts/community-input.test.mjs` | 纯校验测试 |

**修改**

`src/db/schema.ts`、`src/db/client.ts`、`scripts/schema.test.mjs`、`package.json`、`src/app/(site)/page.tsx`、`src/components/life/now-panel.tsx`、`src/app/(site)/letters/page.tsx`、`src/app/(site)/playlist/page.tsx`、`src/app/(site)/life/[id]/page.tsx`、`src/app/(site)/layout.tsx`、`src/components/site/navbar.tsx`、`src/components/site/observ-bar.tsx`（仅当需要样式复用）、`src/app/globals.css`（仅当需要 focus 样式）、`docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`（记录 `letters` 迁移列）

---

### Task 1: 五张表、迁移与纯校验

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/db/client.ts`
- Create: `src/lib/community-input.ts`
- Modify: `scripts/schema.test.mjs`
- Create: `scripts/community-input.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - Drizzle 表：`comments`、`letters`、`songs`、`shelfItems`、`siteSettings`，以及类型 `CommentDbRow`、`LetterDbRow`、`SongDbRow`、`ShelfItemDbRow`。
  - `parseLetterInput(formData: FormData): ParseResult<LetterInput>`
  - `parseCommentInput(formData: FormData): ParseResult<CommentInput>`
  - `parseSongInput(formData: FormData): ParseResult<SongInput>`
  - `parseStatusInput(formData: FormData): ParseResult<{ status: string }>`
  - `inferPlatform(url: string): Platform`
  - `type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }`
  - `type Platform = "netease" | "qq" | "other"`

- [ ] **Step 1: 在 `scripts/community-input.test.mjs` 写失败测试**

测试覆盖这些行为（每一条一个 `test`）：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLetterInput,
  parseCommentInput,
  parseSongInput,
  parseStatusInput,
  inferPlatform,
} from "../src/lib/community-input.ts";

function fd(entries) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

test("留言：正文去空白后 2–1000 字", () => {
  assert.equal(parseLetterInput(fd({ body: " 你好 " })).ok, true);
  assert.equal(parseLetterInput(fd({ body: "好" })).ok, false);
  assert.equal(parseLetterInput(fd({ body: "   " })).ok, false);
});

test("留言：歌曲字段要么全空，要么歌名与艺人都有", () => {
  assert.equal(parseLetterInput(fd({ body: "你好" })).ok, true);
  assert.equal(
    parseLetterInput(fd({ body: "你好", songTitle: "越难越爱" })).ok,
    false
  );
  assert.equal(
    parseLetterInput(
      fd({ body: "你好", songTitle: "越难越爱", songArtist: "吴若希" })
    ).ok,
    true
  );
});

test("留言：推荐链接只收 http(s)", () => {
  const base = { body: "你好", songTitle: "歌", songArtist: "人" };
  assert.equal(
    parseLetterInput(fd({ ...base, songUrl: "https://music.163.com/song?id=1" })).ok,
    true
  );
  assert.equal(
    parseLetterInput(fd({ ...base, songUrl: "javascript:alert(1)" })).ok,
    false
  );
});

test("评论：正文 1–500 字，目标类型只收 moment / note", () => {
  assert.equal(
    parseCommentInput(
      fd({ targetType: "moment", targetId: "5", body: "写得真好" })
    ).ok,
    true
  );
  assert.equal(
    parseCommentInput(fd({ targetType: "page", targetId: "5", body: "x" })).ok,
    false
  );
});

test("评论：moment 目标只认规范十进制，note 目标只认 slug", () => {
  assert.equal(
    parseCommentInput(fd({ targetType: "moment", targetId: "05", body: "x" })).ok,
    false
  );
  assert.equal(
    parseCommentInput(fd({ targetType: "note", targetId: "hello-world", body: "x" })).ok,
    true
  );
  assert.equal(
    parseCommentInput(fd({ targetType: "note", targetId: "../etc", body: "x" })).ok,
    false
  );
});

test("推荐歌：曲名、艺人、链接必填，推荐语可空", () => {
  const ok = { title: "越难越爱", artist: "吴若希", url: "https://music.163.com/song?id=1" };
  assert.equal(parseSongInput(fd(ok)).ok, true);
  assert.equal(parseSongInput(fd({ ...ok, url: "" })).ok, false);
  assert.equal(parseSongInput(fd({ ...ok, title: " " })).ok, false);
});

test("平台按域名推断：网易云、QQ、其他", () => {
  assert.equal(inferPlatform("https://music.163.com/song?id=1"), "netease");
  assert.equal(inferPlatform("https://y.qq.com/n/ryqq/songDetail/1"), "qq");
  assert.equal(inferPlatform("https://example.com/song"), "other");
});

test("状态句去空白后 1–40 字", () => {
  assert.equal(parseStatusInput(fd({ status: "在杭州，最近在学做饭" })).ok, true);
  assert.equal(parseStatusInput(fd({ status: "   " })).ok, false);
  assert.equal(parseStatusInput(fd({ status: "字".repeat(41) })).ok, false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test scripts/community-input.test.mjs`
Expected: FAIL，`Cannot find module .../community-input.ts`。

- [ ] **Step 3: 在 `src/db/schema.ts` 加表**

在 `users` 定义之后追加：

```ts
/**
 * comments：动态 / 笔记下的评论。
 * status 只有 visible / hidden：评论先公开，站长看到不合适再隐藏，
 * 不走「先审后发」——那会让每一条评论都卡在站长身上。
 */
export const comments = pgTable(
  "comments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: text("status").notNull().default("visible"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comments_target_idx").on(
      table.targetType,
      table.targetId,
      table.status,
      table.createdAt.desc()
    ),
    index("comments_user_idx").on(table.userId),
  ]
);

/**
 * letters：信箱留言。
 *
 * 新留言都有 userId；从旧留言板迁过来的记录没有账号，用 guestName 显示名字，
 * legacyGuestbookId 只用于幂等迁移（唯一索引允许多个 NULL）。
 */
export const letters = pgTable(
  "letters",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    guestName: text("guest_name"),
    legacyGuestbookId: integer("legacy_guestbook_id").unique(),
    body: text("body").notNull(),
    songTitle: text("song_title"),
    songArtist: text("song_artist"),
    songUrl: text("song_url"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("letters_status_idx").on(table.status, table.createdAt.desc()),
    index("letters_user_idx").on(table.userId),
  ]
);

/**
 * songs：歌单条目。owner 添加的直接 approved；访客推荐默认 pending。
 * pinned 表示「此刻循环」，同一时间只应该有一首，由 Action 保证。
 */
export const songs = pgTable(
  "songs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    url: text("url").notNull(),
    platform: text("platform").notNull().default("other"),
    note: text("note").notNull().default(""),
    source: text("source").notNull().default("owner"),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("songs_status_idx").on(table.status, table.createdAt.desc()),
    index("songs_user_idx").on(table.userId),
  ]
);

/**
 * shelf_items：书架条目。type 三档，rating 1–5 可空，
 * finishedAt 只存日期（读出来是 YYYY-MM-DD 字符串）。
 */
export const shelfItems = pgTable(
  "shelf_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    creator: text("creator").notNull().default(""),
    rating: integer("rating"),
    note: text("note").notNull().default(""),
    coverUrl: text("cover_url"),
    finishedAt: date("finished_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("shelf_items_type_idx").on(table.type, table.finishedAt.desc()),
  ]
);

/** site_settings：站长可在后台修改的小配置，当前只有 status_sentence */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

同时把 `boolean`、`date` 加进 `drizzle-orm/pg-core` 的 import，并在文件末尾补类型：

```ts
export type CommentDbRow = typeof comments.$inferSelect;
export type LetterDbRow = typeof letters.$inferSelect;
export type SongDbRow = typeof songs.$inferSelect;
export type ShelfItemDbRow = typeof shelfItems.$inferSelect;
```

- [ ] **Step 4: 在 `src/db/client.ts` 的 `ensureSchema()` 末尾加幂等 DDL 与迁移**

```ts
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
```

- [ ] **Step 5: 实现 `src/lib/community-input.ts`**

```ts
/**
 * 社群写入的纯校验层（留言 / 评论 / 推荐歌 / 状态句）。
 *
 * 只 import zod，不 import 任何 `@/` 模块——`node --test` 解析不了路径别名，
 * 这个文件要能被 `scripts/community-input.test.mjs` 直接跑。
 */
import { z } from "zod";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type Platform = "netease" | "qq" | "other";
export type TargetType = "moment" | "note";

const httpUrl = z
  .string()
  .trim()
  .max(500, "链接太长了")
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "链接必须是 http(s) 地址");

const letterSchema = z
  .object({
    body: z.string().trim().min(2, "至少写两个字").max(1000, "最多 1000 字"),
    songTitle: z.string().trim().max(120, "歌名太长").optional(),
    songArtist: z.string().trim().max(120, "艺人名太长").optional(),
    songUrl: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    const hasSong = Boolean(v.songTitle || v.songArtist || v.songUrl);
    if (!hasSong) return;
    if (!v.songTitle) ctx.addIssue({ code: "custom", message: "推荐歌需要歌名" });
    if (!v.songArtist) ctx.addIssue({ code: "custom", message: "推荐歌需要艺人" });
    if (v.songUrl) {
      const parsed = httpUrl.safeParse(v.songUrl);
      if (!parsed.success) {
        ctx.addIssue({ code: "custom", message: "推荐链接必须是 http(s) 地址" });
      }
    }
  });

export interface LetterInput {
  body: string;
  songTitle?: string;
  songArtist?: string;
  songUrl?: string;
}

/** FormData 里空字符串按「没填」处理，避免 zod 把 "" 当成有值 */
function optional(fd: FormData, key: string): string | undefined {
  const value = fd.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function fail(error: z.ZodError): { ok: false; error: string } {
  return { ok: false, error: error.issues[0]?.message ?? "内容不合法" };
}

export function parseLetterInput(fd: FormData): ParseResult<LetterInput> {
  const parsed = letterSchema.safeParse({
    body: fd.get("body") ?? "",
    songTitle: optional(fd, "songTitle"),
    songArtist: optional(fd, "songArtist"),
    songUrl: optional(fd, "songUrl"),
  });
  if (!parsed.success) return fail(parsed.error);
  return { ok: true, value: parsed.data };
}

const targetTypeSchema = z.enum(["moment", "note"]);

export interface CommentInput {
  targetType: TargetType;
  targetId: string;
  body: string;
}

export function parseCommentInput(fd: FormData): ParseResult<CommentInput> {
  const targetType = targetTypeSchema.safeParse(fd.get("targetType"));
  if (!targetType.success) return { ok: false, error: "评论目标不合法" };
  const rawTarget = String(fd.get("targetId") ?? "");
  const targetId =
    targetType.data === "moment"
      ? /^[1-9]\d{0,15}$/.test(rawTarget)
        ? rawTarget
        : null
      : /^[a-z0-9-]{1,120}$/.test(rawTarget)
        ? rawTarget
        : null;
  if (!targetId) return { ok: false, error: "评论目标不合法" };

  const body = String(fd.get("body") ?? "").trim();
  if (body.length < 1) return { ok: false, error: "评论不能为空" };
  if ([...body].length > 500) return { ok: false, error: "最多 500 字" };
  return { ok: true, value: { targetType: targetType.data, targetId, body } };
}

export interface SongInput {
  title: string;
  artist: string;
  url: string;
  platform: Platform;
  note: string;
}

export function inferPlatform(url: string): Platform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "music.163.com" || host.endsWith(".music.163.com")) return "netease";
    if (host === "y.qq.com" || host.endsWith(".y.qq.com")) return "qq";
    return "other";
  } catch {
    return "other";
  }
}

export function parseSongInput(fd: FormData): ParseResult<SongInput> {
  const title = String(fd.get("title") ?? "").trim();
  const artist = String(fd.get("artist") ?? "").trim();
  const url = String(fd.get("url") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();
  if (!title || [...title].length > 120) return { ok: false, error: "歌名要填，最多 120 字" };
  if (!artist || [...artist].length > 120) return { ok: false, error: "艺人要填，最多 120 字" };
  if (!httpUrl.safeParse(url).success) return { ok: false, error: "链接必须是 http(s) 地址" };
  if ([...note].length > 200) return { ok: false, error: "推荐语最多 200 字" };
  return { ok: true, value: { title, artist, url, platform: inferPlatform(url), note } };
}

export function parseStatusInput(fd: FormData): ParseResult<{ status: string }> {
  const status = String(fd.get("status") ?? "").trim();
  if (!status) return { ok: false, error: "状态句不能为空" };
  if ([...status].length > 40) return { ok: false, error: "状态句最多 40 字" };
  return { ok: true, value: { status } };
}
```

注意：`z.enum(["moment", "note"])` 推断出的类型就是 `TargetType`；若 TS 报错，显式写 `z.enum<TargetType>(["moment", "note"])`，不要用 `as` 绕过。

- [ ] **Step 6: 扩展 `scripts/schema.test.mjs`**

在现有测试后追加（`ddlColumns` 的类型正则要加 `date`，否则 `shelf_items` 的 `finished_at` 读不到）：

```js
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
```

- [ ] **Step 7: 把新测试加进 `package.json` 的 `test` 脚本**

在 `scripts/moment-input.test.mjs` 后追加 `scripts/community-input.test.mjs`。

- [ ] **Step 8: 跑测试与类型检查**

Run:
```bash
node --test scripts/community-input.test.mjs scripts/schema.test.mjs
npm run type-check
```
Expected: 全部通过，类型检查 exit 0。若 `schema.includes('pgTable(\n  "comments"')` 因换行不匹配，放宽成去掉空白的比较，不要改源码格式迎合测试。

- [ ] **Step 9: 提交**

```bash
git add src/db/schema.ts src/db/client.ts src/lib/community-input.ts scripts/schema.test.mjs scripts/community-input.test.mjs package.json
git commit -m "feat(phase-3): 社群五张表、旧留言迁移与纯校验"
```

---

### Task 2: 读层与首页真实读数

**Files:**
- Create: `src/lib/letters-server.ts`
- Create: `src/lib/comments-server.ts`
- Create: `src/lib/songs-server.ts`
- Create: `src/lib/settings-server.ts`
- Create: `src/lib/login-status.ts`
- Modify: `src/app/(site)/page.tsx`
- Modify: `src/components/life/now-panel.tsx`

**Interfaces:**
- Produces:
  - `interface LetterView { id: number; name: string; body: string; songTitle: string | null; songArtist: string | null; songUrl: string | null; date: string; pending: boolean }`
  - `interface LettersResult { available: boolean; letters: LetterView[] }`
  - `getApprovedLetters(limit?: number): Promise<LettersResult>`（缓存，tag `letters`）
  - `getLettersForViewer(userId: number | null, limit?: number): Promise<LettersResult>`
  - `interface CommentView { id: number; author: string; body: string; date: string }`
  - `getVisibleComments(targetType: "moment" | "note", targetId: string): Promise<{ available: boolean; comments: CommentView[] }>`（缓存，tag `comments`）
  - `interface SongView { id: number; title: string; artist: string; url: string; platform: "netease" | "qq" | "other"; note: string; source: "owner" | "visitor"; recommender: string | null; pinned: boolean; date: string; pending: boolean }`
  - `getApprovedSongs(): Promise<{ available: boolean; songs: SongView[] }>`（缓存，tag `songs`）
  - `getSongsForViewer(userId: number | null): Promise<{ available: boolean; songs: SongView[] }>`
  - `getStatusSentence(): Promise<string>`（缓存，tag `settings`，无记录/连不上时回退 `siteConfig.status`）
  - `loginReady(): boolean`

- [ ] **Step 1: 写 `src/lib/login-status.ts`**

```ts
import { sessionSecret } from "@/lib/auth";
import { mailConfig } from "@/lib/mailer";

/**
 * 登录是否可用：签发会话要密钥，发信要 SMTP，缺一不可。
 * 页面据此决定显示表单还是「暂未开放」，不靠客户端猜。
 */
export function loginReady(): boolean {
  return Boolean(sessionSecret()) && mailConfig().enabled;
}
```

- [ ] **Step 2: 写 `src/lib/letters-server.ts`**

```ts
import { cacheLife, cacheTag } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { letters as lettersTable, users } from "@/db/schema";
import { formatDay } from "@/lib/life";

export interface LetterView {
  id: number;
  name: string;
  body: string;
  songTitle: string | null;
  songArtist: string | null;
  songUrl: string | null;
  date: string;
  pending: boolean;
}

export interface LettersResult {
  available: boolean;
  letters: LetterView[];
}

/**
 * 公开留言：只读 approved。旧留言板迁来的记录没有 userId，用 guestName。
 * 连不上时 available: false——首页与信箱都要显示 NOT AVAILABLE，不给空数组冒充「还没人留言」。
 */
export async function getApprovedLetters(limit = 100): Promise<LettersResult> {
  return getApprovedLettersCached(limit);
}

async function getApprovedLettersCached(limit: number): Promise<LettersResult> {
  "use cache";
  cacheLife("minutes");
  cacheTag("letters");

  const db = getDb();
  if (!db) return { available: false, letters: [] };

  try {
    const rows = await db
      .select({
        id: lettersTable.id,
        guestName: lettersTable.guestName,
        login: users.login,
        body: lettersTable.body,
        songTitle: lettersTable.songTitle,
        songArtist: lettersTable.songArtist,
        songUrl: lettersTable.songUrl,
        createdAt: lettersTable.createdAt,
      })
      .from(lettersTable)
      .leftJoin(users, eq(users.id, lettersTable.userId))
      .where(eq(lettersTable.status, "approved"))
      .orderBy(desc(lettersTable.createdAt), desc(lettersTable.id))
      .limit(limit);

    return { available: true, letters: rows.map(toLetterView) };
  } catch {
    return { available: false, letters: [] };
  }
}

/**
 * 当前用户视角：公开留言 + 自己的待审。
 * 待审查询不走缓存（每条都跟人有关），公开部分复用上面的缓存函数。
 */
export async function getLettersForViewer(
  userId: number | null,
  limit = 100
): Promise<LettersResult> {
  const publicResult = await getApprovedLetters(limit);
  if (!userId) return publicResult;

  const db = getDb();
  if (!db) return publicResult;

  try {
    const own = await db
      .select({
        id: lettersTable.id,
        guestName: lettersTable.guestName,
        login: users.login,
        body: lettersTable.body,
        songTitle: lettersTable.songTitle,
        songArtist: lettersTable.songArtist,
        songUrl: lettersTable.songUrl,
        createdAt: lettersTable.createdAt,
      })
      .from(lettersTable)
      .leftJoin(users, eq(users.id, lettersTable.userId))
      .where(eq(lettersTable.userId, userId))
      .orderBy(desc(lettersTable.createdAt), desc(lettersTable.id))
      .limit(limit);

    const pending = own
      .filter((row) => row.id !== undefined)
      .map((row) => ({ ...row, status: "pending" as const }));
    const existingIds = new Set(publicResult.letters.map((l) => l.id));
    const extra = pending
      .filter((row) => !existingIds.has(row.id))
      .map((row) => toLetterView({ ...row, status: "pending" }));

    return {
      available: publicResult.available,
      letters: [...publicResult.letters, ...extra],
    };
  } catch {
    return publicResult;
  }
}

function toLetterView(row: {
  id: number;
  guestName: string | null;
  login: string | null;
  body: string;
  songTitle: string | null;
  songArtist: string | null;
  songUrl: string | null;
  createdAt: Date;
  status?: string;
}): LetterView {
  return {
    id: row.id,
    name: row.login ?? row.guestName ?? "匿名",
    body: row.body,
    songTitle: row.songTitle,
    songArtist: row.songArtist,
    songUrl: row.songUrl,
    date: formatDay(row.createdAt.toISOString()),
    pending: row.status === "pending",
  };
}
```

注意：上面的 `pending` 拼装写法要让类型对齐——直接用 `status` 字段决定 `pending`，不要构造两个形状不同的数组。实现时可以把 `toLetterView` 的 `status` 参数改成显式第二参数，读起来更清楚。

- [ ] **Step 3: 写 `src/lib/comments-server.ts`**

```ts
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { comments as commentsTable, users } from "@/db/schema";
import { formatDay } from "@/lib/life";

export interface CommentView {
  id: number;
  author: string;
  body: string;
  date: string;
}

export async function getVisibleComments(
  targetType: "moment" | "note",
  targetId: string
): Promise<{ available: boolean; comments: CommentView[] }> {
  return getVisibleCommentsCached(targetType, targetId);
}

async function getVisibleCommentsCached(
  targetType: "moment" | "note",
  targetId: string
): Promise<{ available: boolean; comments: CommentView[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("comments");

  const db = getDb();
  if (!db) return { available: false, comments: [] };

  try {
    const rows = await db
      .select({
        id: commentsTable.id,
        author: users.login,
        body: commentsTable.body,
        createdAt: commentsTable.createdAt,
      })
      .from(commentsTable)
      .innerJoin(users, eq(users.id, commentsTable.userId))
      .where(
        and(
          eq(commentsTable.targetType, targetType),
          eq(commentsTable.targetId, targetId),
          eq(commentsTable.status, "visible")
        )
      )
      .orderBy(asc(commentsTable.createdAt), asc(commentsTable.id));

    return {
      available: true,
      comments: rows.map((row) => ({
        id: row.id,
        author: row.author,
        body: row.body,
        date: formatDay(row.createdAt.toISOString()),
      })),
    };
  } catch {
    return { available: false, comments: [] };
  }
}
```

- [ ] **Step 4: 写 `src/lib/songs-server.ts`**

```ts
import { cacheLife, cacheTag } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { songs as songsTable, users } from "@/db/schema";
import { formatDay } from "@/lib/life";
import type { Platform } from "@/lib/community-input";

export interface SongView {
  id: number;
  title: string;
  artist: string;
  url: string;
  platform: Platform;
  note: string;
  source: "owner" | "visitor";
  recommender: string | null;
  pinned: boolean;
  date: string;
  pending: boolean;
}

export async function getApprovedSongs(): Promise<{
  available: boolean;
  songs: SongView[];
}> {
  return getApprovedSongsCached();
}

async function getApprovedSongsCached(): Promise<{
  available: boolean;
  songs: SongView[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) return { available: false, songs: [] };

  try {
    const rows = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        artist: songsTable.artist,
        url: songsTable.url,
        platform: songsTable.platform,
        note: songsTable.note,
        source: songsTable.source,
        pinned: songsTable.pinned,
        login: users.login,
        createdAt: songsTable.createdAt,
      })
      .from(songsTable)
      .leftJoin(users, eq(users.id, songsTable.userId))
      .where(eq(songsTable.status, "approved"))
      .orderBy(desc(songsTable.createdAt), desc(songsTable.id));

    return { available: true, songs: rows.map((row) => toSongView(row)) };
  } catch {
    return { available: false, songs: [] };
  }
}

export async function getSongsForViewer(userId: number | null): Promise<{
  available: boolean;
  songs: SongView[];
}> {
  const publicResult = await getApprovedSongs();
  if (!userId) return publicResult;

  const db = getDb();
  if (!db) return publicResult;

  try {
    const own = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        artist: songsTable.artist,
        url: songsTable.url,
        platform: songsTable.platform,
        note: songsTable.note,
        source: songsTable.source,
        pinned: songsTable.pinned,
        login: users.login,
        createdAt: songsTable.createdAt,
        status: songsTable.status,
      })
      .from(songsTable)
      .leftJoin(users, eq(users.id, songsTable.userId))
      .where(eq(songsTable.userId, userId))
      .orderBy(desc(songsTable.createdAt), desc(songsTable.id));

    const existingIds = new Set(publicResult.songs.map((s) => s.id));
    const extra = own
      .filter((row) => row.status === "pending" && !existingIds.has(row.id))
      .map((row) => toSongView(row, true));

    return { available: publicResult.available, songs: [...publicResult.songs, ...extra] };
  } catch {
    return publicResult;
  }
}

function toSongView(
  row: {
    id: number;
    title: string;
    artist: string;
    url: string;
    platform: string;
    note: string;
    source: string;
    pinned: boolean;
    login: string | null;
    createdAt: Date;
  },
  pending = false
): SongView {
  const platform: Platform =
    row.platform === "netease" || row.platform === "qq" ? row.platform : "other";
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    url: row.url,
    platform,
    note: row.note,
    source: row.source === "visitor" ? "visitor" : "owner",
    recommender: row.login,
    pinned: row.pinned,
    date: formatDay(row.createdAt.toISOString()),
    pending,
  };
}
```

- [ ] **Step 5: 写 `src/lib/settings-server.ts`**

```ts
import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { siteConfig } from "@/config/site";

export const STATUS_KEY = "status_sentence";

/**
 * 页头状态句：站长在后台改，读不到库时回退配置文件里的默认值。
 * 这是文案的回退，不是读数——不会把「连不上」伪装成某个真实状态。
 */
export async function getStatusSentence(): Promise<string> {
  return getStatusSentenceCached();
}

async function getStatusSentenceCached(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  cacheTag("settings");

  const db = getDb();
  if (!db) return siteConfig.status;

  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, STATUS_KEY))
      .limit(1);
    return row?.value?.trim() || siteConfig.status;
  } catch {
    return siteConfig.status;
  }
}
```

- [ ] **Step 6: 改 `src/app/(site)/page.tsx` 与 `NowPanel`**

首页 `Promise.all` 增加 `getStatusSentence()` 与 `getApprovedLetters(3)`；页头 `<p>` 里的 `siteConfig.status` 改用 `statusSentence`。`NowPanel` 的 letters 参数改成：

```ts
letters: {
  available: boolean;
  items: { id: string; name: string; body: string; date: string }[];
};
```

首页传：

```ts
letters: {
  available: letters.available,
  items: letters.letters.slice(0, 3).map((l) => ({
    id: String(l.id),
    name: l.name,
    body: l.body,
    date: l.date,
  })),
},
```

`NowPanel` 的留言区：删掉「示例 · 阶段 3 上线」字样；`!letters.available` 时显示 `NOT AVAILABLE`；`items.length === 0` 时显示「还没有留言」；否则渲染真实三条（姓名、日期、正文截两行 `line-clamp-2`）。「写一封」链接保持 `/letters`。

- [ ] **Step 7: 类型检查与测试**

Run:
```bash
npm run type-check
npm test
```
Expected: exit 0。首页此时还读不到库时用 fallback，不影响构建。

- [ ] **Step 8: 提交**

```bash
git add src/lib/letters-server.ts src/lib/comments-server.ts src/lib/songs-server.ts src/lib/settings-server.ts src/lib/login-status.ts src/app/'(site)'/page.tsx src/components/life/now-panel.tsx
git commit -m "feat(phase-3): 信箱/评论/歌单读层，首页换真实留言"
```

---

### Task 3: 信箱页与留言提交

**Files:**
- Modify: `src/app/(site)/letters/page.tsx`
- Create: `src/app/(site)/letters/actions.ts`
- Create: `src/components/letters/letter-card.tsx`
- Create: `src/components/letters/letter-form.tsx`

**Interfaces:**
- Consumes: `parseLetterInput`, `getLettersForViewer`, `loginReady`, `getSessionUser`.
- Produces: `submitLetter(_prev: LetterFormState, formData: FormData): Promise<LetterFormState>`，`LetterFormState = { error?: string; ok?: boolean }`；`LetterCard({ letter }: { letter: LetterView })`；`LetterForm()`。

- [ ] **Step 1: 写 Action `src/app/(site)/letters/actions.ts`**

```ts
"use server";

import { refresh, updateTag } from "next/cache";
import { getDb } from "@/db/client";
import { letters as lettersTable } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseLetterInput } from "@/lib/community-input";
import { and, eq, gt } from "drizzle-orm";

export interface LetterFormState {
  error?: string;
  ok?: boolean;
}

/** 同一用户 24 小时内最多 5 封，防刷屏；不靠页面藏按钮 */
const DAILY_LIMIT = 5;

export async function submitLetter(
  _prev: LetterFormState,
  formData: FormData
): Promise<LetterFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "先登录再留言" };

  const parsed = parseLetterInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用，稍后再试" };

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db
      .select({ id: lettersTable.id })
      .from(lettersTable)
      .where(and(eq(lettersTable.userId, user.id), gt(lettersTable.createdAt, since)));
    if (recent.length >= DAILY_LIMIT) {
      return { error: "今天留得有点多了，明天再来" };
    }

    await db.insert(lettersTable).values({
      userId: user.id,
      body: parsed.value.body,
      songTitle: parsed.value.songTitle ?? null,
      songArtist: parsed.value.songArtist ?? null,
      songUrl: parsed.value.songUrl ?? null,
      status: "pending",
    });

    updateTag("letters");
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[letters] 保存失败：", err);
    return { error: "保存失败，稍后再试" };
  }
}
```

- [ ] **Step 2: 写 `LetterCard`**

服务端组件；`article` 用 `border border-rule bg-panel p-5`；头部一行 mono：日期、姓名、状态点（`pending` 时 `bg-wait`，否则 `bg-ok`，`aria-label` 分别「待审」「已通过」）；正文 `whitespace-pre-line text-[14px] leading-relaxed`；有歌时一行 `♪` + 歌名/艺人，链接 `target="_blank" rel="noreferrer noopener"`。不加倾斜、纸条质感。

- [ ] **Step 3: 写 `LetterForm`（客户端）**

```tsx
"use client";

import { useActionState } from "react";
import { submitLetter, type LetterFormState } from "@/app/(site)/letters/actions";

const initial: LetterFormState = {};

export function LetterForm() {
  const [state, formAction, pending] = useActionState(submitLetter, initial);
  // 受控字段：body / songTitle / songArtist / songUrl，onChange 存 draft
  // form 用 onReset={(e) => e.preventDefault()}
  // 字段 label 沿用 moment-form 的 mono 小标签写法
  // 成功时显示「已放进信箱，等站长看过」；有 error 时显示 error
  return null; // 实现时替换成完整表单，见 Step 4 的结构要求
}
```

实现要求：
- `textarea name="body"` 必填，`maxLength={1000}`，行数 4。
- 可选歌曲三项：`songTitle`、`songArtist`、`songUrl`，`maxLength` 分别为 120/120/500。
- 三个歌曲字段都空 = 不推荐歌；只填一部分由服务端返回错误，客户端不做「联动禁用」。
- 提交按钮文案：`pending ? "投递中…" : "投进信箱"`；成功文案「已放进信箱，等站长看过」。
- 所有控件 `rounded-none border-rule bg-transparent font-mono text-[13px]`，focus 用现有 `focus-visible:ring-1 focus-visible:ring-ring` 之类的 token 类，不写颜色字面量。

- [ ] **Step 4: 重写 `src/app/(site)/letters/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { loginReady } from "@/lib/login-status";
import { getLettersForViewer } from "@/lib/letters-server";
import { LetterCard } from "@/components/letters/letter-card";
import { LetterForm } from "@/components/letters/letter-form";

export const metadata: Metadata = { title: "信箱" };
export const instant = false;

export default async function LettersPage() {
  await connection();
  const user = await getSessionUser();
  const letters = await getLettersForViewer(user?.id ?? null);
  const ready = loginReady();
  // 结构：标题 + mono 读数（N 封 · 已通过）
  // 1) !letters.available → NOT AVAILABLE 面板，不渲染空墙
  // 2) 有留言 → 网格 sm:grid-cols-2 lg:grid-cols-3，LetterCard
  // 3) 没有留言 → 「信箱还空着」
  // 4) 表单区：
  //    user → <LetterForm />
  //    !user && ready → 说明 + 去登录链接（/login）
  //    !user && !ready → 「登录暂未开放」，解释 SMTP / 密钥缺失
  return null; // 实现时替换成完整 JSX
}
```

要求：`pending` 的留言只在 `getLettersForViewer` 里出现，公开访客看不到；待审卡片只用一个 `--wait` 状态点，不写「请耐心等待审核」。

- [ ] **Step 5: 类型检查、构建此路由相关的快速验证**

Run:
```bash
npm run type-check
npm test
```
Expected: exit 0。

- [ ] **Step 6: 提交**

```bash
git add src/app/'(site)'/letters/page.tsx src/app/'(site)'/letters/actions.ts src/components/letters/letter-card.tsx src/components/letters/letter-form.tsx
git commit -m "feat(phase-3): 信箱留言墙与登录后投递"
```

---

### Task 4: 动态评论

**Files:**
- Modify: `src/app/(site)/life/[id]/page.tsx`
- Create: `src/app/(site)/life/[id]/actions.ts`
- Create: `src/components/life/comment-list.tsx`
- Create: `src/components/life/comment-form.tsx`

**Interfaces:**
- Consumes: `parseCommentInput`, `getVisibleComments`, `getMomentById`, `getSessionUser`, `loginReady`, `rateLimit`.
- Produces: `submitComment(_prev: CommentFormState, formData: FormData): Promise<CommentFormState>`，`CommentFormState = { error?: string; ok?: boolean }`；`CommentList({ comments, available }: { comments: CommentView[]; available: boolean })`；`CommentForm({ targetType, targetId }: { targetType: "moment" | "note"; targetId: string })`。

- [ ] **Step 1: 写 Action**

```ts
"use server";

import { refresh, updateTag } from "next/cache";
import { getDb } from "@/db/client";
import { comments as commentsTable } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseCommentInput } from "@/lib/community-input";
import { rateLimit } from "@/lib/rate-limit";
import { getMomentById } from "@/lib/moments-server";
import { getNoteBySlug } from "@/content";

export interface CommentFormState {
  error?: string;
  ok?: boolean;
}

export async function submitComment(
  _prev: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "先登录再评论" };

  const parsed = parseCommentInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const { targetType, targetId, body } = parsed.value;

  // 目标必须真实存在，避免往任意 id 上灌评论
  if (targetType === "moment") {
    const target = await getMomentById(targetId);
    if (!target.available) return { error: "动态暂时读不到，稍后再试" };
    if (!target.moment) return { error: "这条动态不存在" };
  } else {
    const note = getNoteBySlug(targetId);
    if (!note || note.meta.draft) return { error: "这篇笔记不存在" };
  }

  if (!rateLimit(`comment:${user.id}`, 20, 24 * 60 * 60 * 1000)) {
    return { error: "今天评论得有点多，明天再来" };
  }

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用，稍后再试" };

  try {
    await db.insert(commentsTable).values({
      targetType,
      targetId,
      userId: user.id,
      body,
      status: "visible",
    });
    updateTag("comments");
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[comments] 保存失败：", err);
    return { error: "保存失败，稍后再试" };
  }
}
```

`getNoteBySlug` 在阶段 5 才改名；**本阶段先 import `getPostBySlug as getNoteBySlug` 或直接写 `getPostBySlug`，并在阶段 5 改名时同步更新**。为了不让阶段 3 依赖未来接口，本阶段直接 import `getPostBySlug`，变量名写 `note`。

- [ ] **Step 2: 写 `CommentList` 与 `CommentForm`**

`CommentList` 服务端组件：`available === false` → `NOT AVAILABLE` 小面板；空数组 → 「还没有评论」；否则 `divide-y divide-rule border-y border-rule`，每条一行 `py-4`：作者 mono、日期 mono、正文 `whitespace-pre-line`。

`CommentForm` 客户端组件：隐藏字段 `targetType` / `targetId`；`textarea name="body"` `maxLength={500}`；`useActionState`；成功文案「评论已发出」；错误显示在按钮上方；按钮 `pending ? "发送中…" : "写评论"`。

- [ ] **Step 3: 在 `/life/[id]` 页面接入**

在 `Promise.all` 里加 `getVisibleComments("moment", String(id))` 与 `getSessionUser()`、`loginReady()`。在文章下方、上下条导航之前加：

```tsx
<section className="mt-12 border-t border-rule pt-8">
  <h2 className="font-heading text-lg font-bold">评论</h2>
  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
    {comments.available ? `${comments.comments.length} 条` : "Not Available"}
  </p>
  <div className="mt-4">
    <CommentList comments={comments.comments} available={comments.available} />
  </div>
  <div className="mt-8">
    {user ? (
      <CommentForm targetType="moment" targetId={String(id)} />
    ) : ready ? (
      <p ...>登录后可以评论。<Link href="/login">去登录</Link></p>
    ) : (
      <p ...>登录暂未开放（服务器还没配好发信），浏览不受影响。</p>
    )}
  </div>
</section>
```

`id` 是已通过 `getMomentById` 校验的原始参数；评论目标用规范 id：用 `String(moment.id)`，不要用原始 `id`（`/life/05` 虽然会 404，但避免把别名写进评论表）。

- [ ] **Step 4: 类型检查与测试**

Run:
```bash
npm run type-check
npm test
```
Expected: exit 0。

- [ ] **Step 5: 提交**

```bash
git add src/app/'(site)'/life/'[id]'/page.tsx src/app/'(site)'/life/'[id]'/actions.ts src/components/life/comment-list.tsx src/components/life/comment-form.tsx
git commit -m "feat(phase-3): 动态评论，登录后可见可发"
```

---

### Task 5: 歌单页与推荐歌

**Files:**
- Modify: `src/app/(site)/playlist/page.tsx`
- Create: `src/app/(site)/playlist/actions.ts`
- Create: `src/components/playlist/song-row.tsx`
- Create: `src/components/playlist/song-form.tsx`

**Interfaces:**
- Consumes: `parseSongInput`, `getSongsForViewer`, `getSessionUser`, `loginReady`.
- Produces: `submitSong(_prev: SongFormState, formData: FormData): Promise<SongFormState>`，`SongFormState = { error?: string; ok?: boolean }`；`SongRow({ song }: { song: SongView })`；`SongForm()`。

- [ ] **Step 1: 写 Action**

与留言 Action 同构：
- 登录检查；
- `parseSongInput`；
- 数据库可用检查；
- 24 小时内该用户 `source = 'visitor'` 的 songs 计数 ≥ 3 → `{ error: "今天已经推荐三首了，明天再来" }`；
- 插入 `{ ...parsed.value, source: "visitor", userId: user.id, status: "pending" }`；
- `updateTag("songs")`、`refresh()`、返回 `{ ok: true }`。

- [ ] **Step 2: 写 `SongRow`**

```tsx
import type { SongView } from "@/lib/songs-server";

const PLATFORM_LABEL = { netease: "NETEASE", qq: "QQ MUSIC", other: "LINK" } as const;

export function SongRow({ song }: { song: SongView }) {
  return (
    <a
      href={song.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-baseline gap-3 border-b border-rule py-3 transition-colors hover:bg-panel"
    >
      <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {PLATFORM_LABEL[song.platform]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] group-hover:text-data">
          {song.title}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
          {song.artist}
          {song.note ? ` · ${song.note}` : ""}
          {song.source === "visitor" && song.recommender
            ? ` · 推荐人 ${song.recommender}`
            : ""}
        </span>
      </span>
      {song.pinned && (
        <span className="shrink-0 font-mono text-[10px] text-ok">PINNED</span>
      )}
      {song.pending && (
        <span className="shrink-0 font-mono text-[10px] text-wait">PENDING</span>
      )}
    </a>
  );
}
```

整行是外链；不加平台图标（不引入新依赖，文字标签更符合仪器语言）。

- [ ] **Step 3: 写 `SongForm`**

字段：`title`、`artist`、`url`、`note`；`useActionState`；成功文案「收到，等站长听过再挂出来」；错误显示；按钮 `pending ? "提交中…" : "推荐一首"`。`url` 输入 `type="url"` 但服务端仍做 http(s) 校验。

- [ ] **Step 4: 重写 `/playlist` 页面**

`connection()`、`instant = false`、`getSongsForViewer(user?.id ?? null)`、`loginReady()`。

结构：
1. 标题 + mono 读数（`N 首 · 已通过`）。
2. `!available` → `NOT AVAILABLE` 面板。
3. 「此刻循环」：`pinned` 的那首（取 `songs.find(s => s.pinned && !s.pending)`），大面板显示 title/artist/note + 外链；没有时诚实写「还没有设定此刻循环」。
4. 「我的歌单」：`source === "owner" && !pinned && !pending` 的歌曲，`SongRow`。
5. 「大家推荐的」：`source === "visitor" && !pending`，`SongRow`。
6. 「我的待审」：`pending` 的歌曲（只有本人能看到），`SongRow`。
7. 表单区：user → `SongForm`；未登录 + ready → 登录说明；未登录 + !ready → 暂未开放。

- [ ] **Step 5: 类型检查与测试**

Run:
```bash
npm run type-check
npm test
```
Expected: exit 0。

- [ ] **Step 6: 提交**

```bash
git add src/app/'(site)'/playlist/page.tsx src/app/'(site)'/playlist/actions.ts src/components/playlist/song-row.tsx src/components/playlist/song-form.tsx
git commit -m "feat(phase-3): 歌单页与访客推荐歌"
```

---

### Task 6: 审核后台

**Files:**
- Create: `src/app/(site)/admin/page.tsx`
- Create: `src/app/(site)/admin/actions.ts`
- Modify: `src/components/site/account-menu.tsx`（Task 7 创建；若顺序相反，先在 Task 7 加链接）

**Interfaces:**
- Consumes: `getSessionUser`, `parseStatusInput`, `getStatusSentence`, `STATUS_KEY`, DB tables.
- Produces: `updateStatus(formData: FormData): Promise<void>`、`moderateLetter(formData: FormData): Promise<void>`、`moderateSong(formData: FormData): Promise<void>`、`moderateComment(formData: FormData): Promise<void>`。每个都在服务端检查 `role === "owner"`。

- [ ] **Step 1: 写 Actions**

```ts
"use server";

import { refresh, updateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  comments as commentsTable,
  letters as lettersTable,
  siteSettings,
  songs as songsTable,
} from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseStatusInput } from "@/lib/community-input";
import { STATUS_KEY } from "@/lib/settings-server";

async function requireOwner() {
  const user = await getSessionUser();
  return user?.role === "owner" ? user : null;
}

function idFrom(formData: FormData): number | null {
  const id = Number(formData.get("id"));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function updateStatus(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const parsed = parseStatusInput(formData);
  if (!parsed.ok) return;
  const db = getDb();
  if (!db) return;
  await db
    .insert(siteSettings)
    .values({ key: STATUS_KEY, value: parsed.value.status })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: parsed.value.status, updatedAt: sql`now()` },
    });
  updateTag("settings");
  refresh();
}

export async function moderateLetter(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  const status = formData.get("status");
  if (!id || (status !== "approved" && status !== "rejected")) return;
  const db = getDb();
  if (!db) return;
  await db.update(lettersTable).set({ status }).where(eq(lettersTable.id, id));
  updateTag("letters");
  refresh();
}

export async function moderateSong(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  const status = formData.get("status");
  if (!id || (status !== "approved" && status !== "rejected")) return;
  const db = getDb();
  if (!db) return;
  await db.update(songsTable).set({ status }).where(eq(songsTable.id, id));
  updateTag("songs");
  refresh();
}

export async function moderateComment(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  const status = formData.get("status");
  if (!id || (status !== "visible" && status !== "hidden")) return;
  const db = getDb();
  if (!db) return;
  await db.update(commentsTable).set({ status }).where(eq(commentsTable.id, id));
  updateTag("comments");
  refresh();
}
```

- [ ] **Step 2: 写后台页**

`/admin`：`connection()`、`instant = false`、`getSessionUser()`。
- 未登录 → 面板「这是站长入口，先登录」+ `/login` 链接。
- 已登录但 `role !== "owner"` → 面板「只对站长开放」。
- owner → 页面：
  1. **状态句**：当前 `getStatusSentence()`；`<form action={updateStatus}>` + input `name="status" maxLength={40}` + 保存按钮；说明「显示在首页页头」。
  2. **待审留言**：直接查 DB `letters.status = 'pending'`，按时间倒序；每条显示日期/姓名/正文/推荐歌；两个按钮 `<form action={moderateLetter}>` + hidden `id` + `status=approved|rejected`。空时「没有待审留言」。
  3. **待审歌曲**：同上，显示 title/artist/url/note/recommender；通过/驳回。
  4. **评论管理**：最近 50 条（含 hidden），leftJoin users；显示作者、targetType/targetId、正文、状态；按钮 `visible`/`hidden` 切换。空时「还没有评论」。
- 所有列表用 `divide-y divide-rule border-y border-rule`，不堆卡片；每段一个 mono 小标题。
- 后台页需要 `export const instant = false`；后台查询不走 `use cache`（owner 操作要即时），直接 `getDb()`，连不上时每段显示 `NOT AVAILABLE`，不显示空列表冒充「没有待审」。

- [ ] **Step 3: 类型检查与测试**

Run:
```bash
npm run type-check
npm test
```
Expected: exit 0。

- [ ] **Step 4: 提交**

```bash
git add src/app/'(site)'/admin/page.tsx src/app/'(site)'/admin/actions.ts
git commit -m "feat(phase-3): 站长审核后台与状态句编辑"
```

---

### Task 7: 页头账号菜单

**Files:**
- Create: `src/components/site/account-menu.tsx`
- Modify: `src/components/site/navbar.tsx`
- Modify: `src/app/(site)/layout.tsx`

**Interfaces:**
- Produces: `AccountMenu()`（async server component）；`Navbar({ accountMenu }: { accountMenu?: React.ReactNode })`。

- [ ] **Step 1: 写 `AccountMenu`**

```tsx
import Link from "next/link";
import { getSessionUser } from "@/lib/session";

/**
 * 页头账号菜单。原生 <details>，不引客户端状态：
 * 关 JS 也能展开，键盘焦点天然可达。
 */
export async function AccountMenu() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <Link href="/login" className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground">
        登录
      </Link>
    );
  }

  const initial = [...user.login][0]?.toUpperCase() ?? "?";

  return (
    <details className="relative">
      <summary
        className="flex size-8 cursor-pointer list-none items-center justify-center border border-rule font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`账号菜单：${user.login}`}
      >
        {initial}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-44 border border-rule bg-panel p-2 shadow-none">
        <p className="truncate px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {user.login} · {user.role === "owner" ? "站长" : "访客"}
        </p>
        <Link href="/playlist" className="block px-2 py-1.5 text-[13px] hover:text-data">我的推荐</Link>
        {user.role === "owner" && (
          <>
            <Link href="/write" className="block px-2 py-1.5 text-[13px] hover:text-data">写一条</Link>
            <Link href="/admin" className="block px-2 py-1.5 text-[13px] hover:text-data">管理</Link>
          </>
        )}
        <form action="/api/auth/email/logout" method="post" className="border-t border-rule pt-1">
          <button type="submit" className="w-full px-2 py-1.5 text-left text-[13px] text-muted-foreground hover:text-foreground">
            退出登录
          </button>
        </form>
      </div>
    </details>
  );
}
```

- [ ] **Step 2: 改 `Navbar` 接收 `accountMenu`**

`Navbar` 的 props 加 `accountMenu?: React.ReactNode`；桌面右侧把原来的 `<Link href="/login">登录</Link>` 换成 `{accountMenu}`；移动端 Sheet 里在导航后也渲染一次 `{accountMenu}`，带 `onClick` 关闭由外层 Sheet 处理（details 内部链接不影响）。

- [ ] **Step 3: 改 `(site)/layout.tsx`**

```tsx
import { Suspense } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/site/account-menu";

// ...
const accountMenu = (
  <Suspense
    fallback={
      <Link href="/login" className="font-mono text-[11px] text-muted-foreground">
        登录
      </Link>
    }
  >
    <AccountMenu />
  </Suspense>
);

<Navbar accountMenu={accountMenu} />
```

`Suspense` 让 `getSessionUser()` 只在动态洞里读 cookie，静态页面的壳不被拖成整页动态。若构建报「uncached data outside Suspense」，说明边界位置不对，按 `authentication-with-cache-components.md` 调整，不要退回把 layout 改成全动态。

- [ ] **Step 4: 构建验证**

Run:
```bash
npm run type-check
npm run build
```
Expected: 构建通过；记录路由表，确认 `/`、`/letters`、`/playlist`、`/life/[id]` 为动态或 PPR，`/notes` 类静态页（阶段 5 后）仍有静态壳。若 `/` 本来就动态，不算回归。

- [ ] **Step 5: 提交**

```bash
git add src/components/site/account-menu.tsx src/components/site/navbar.tsx src/app/'(site)'/layout.tsx
git commit -m "feat(phase-3): 页头账号菜单，服务端 details 不引客户端状态"
```

---

### Task 8: 阶段 3 验收

**Files:**
- Modify: `docs/superpowers/plans/2026-11-08-personal-space-phase-3.md`（追加 `## 验收结果`）
- Modify: `docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`（只补 `letters` 迁移两列的说明与阶段 3 完成记录）

- [ ] **Step 1: 跑全套门禁**

```bash
npm run type-check
npm run lint
npm test
node scripts/check-content.mjs
npm run build
```
Expected: 全部 exit 0；把测试数量、路由表、构建告警记下来。

- [ ] **Step 2: 起本地数据库并建表**

```bash
# WSL 里已有 pgvector 镜像；容器名沿用阶段 2 的 zb-check-db
docker run -d --name zb-check-db -e POSTGRES_USER=blog -e POSTGRES_PASSWORD=blog -e POSTGRES_DB=blog -p 5432:5432 pgvector/pgvector:pg17
# 等 healthy 后，在仓库根目录：
DATABASE_URL=postgres://blog:blog@localhost:5432/blog npx tsx -e "import('./src/db/client.ts').then(async ({ensureSchema,closeDb})=>{await ensureSchema();await closeDb();console.log('schema ok')})"
```
若容器已存在，先 `docker start zb-check-db`。

- [ ] **Step 3: 造三种身份的数据**

用一个临时 `node --input-type=module` 脚本（不要提交）插入：
- owner 用户：`email = OWNER_EMAIL`（或任意邮箱 + `role='owner'`），`login='owner'`；
- visitor 用户：`login='visitor'`；
- 留言：一条 approved（visitor）、一条 pending（visitor）、一条来自旧留言板的 guest 记录；
- 歌曲：owner approved + pinned 一条、visitor approved 一条、visitor pending 一条；
- 评论：对某条动态（先插一条 moment）visible 一条、hidden 一条；
- `site_settings.status_sentence = '在杭州，最近在学做饭'`。

用真实会话 cookie 访问页面：用 `AUTH_SECRET` 和 `signSession()` 的同一算法生成 `userId.expiry.hmac`（可以临时 `npx tsx` 调用 `signSession`），把 cookie 名 `dsh_blog_session` 写进浏览器上下文；不要改代码绕过鉴权。

- [ ] **Step 4: 运行时检查**

逐项记录证据：
1. `/`：页头状态句来自 `site_settings`；「此刻」三条留言来自数据库；没有「阿远」「小满」「老陈」「示例」字样。
2. `/letters` 未登录：看不到表单，有明确登录说明；登录后：表单可见；提交一条后数据库状态 `pending`，本人页面出现 `PENDING` 标记，公开访客看不到；owner 在 `/admin` 通过后公开可见。
3. `/life/<id>`：未登录有登录说明；登录后发评论，评论出现在列表；owner 在 `/admin` 隐藏后，页面不再显示。
4. `/playlist`：pinned 歌曲在「此刻循环」；owner 歌曲在「我的歌单」；访客已通过歌曲带推荐人；本人 pending 只有本人看到；提交第四首被 3 首/日限制拦下。
5. `/admin`：未登录与 visitor 都被挡；owner 能改状态句、通过/驳回留言与歌曲、隐藏/恢复评论。
6. 两种模式（观测台 / 报表）各看一遍 `/`、`/letters`、`/playlist`、`/life/<id>`、`/admin`；关 JS 后正文可见（表单不可用可以）。
7. 诚实性 grep：`rg -n "阿远|小满|老陈|示例 · 阶段 3|NOT AVAILABLE" src/app/'(site)'/page.tsx src/components/life/now-panel.tsx`，确认没有示例留言残留。

- [ ] **Step 5: 清理**

停掉本地 Next 进程与 `zb-check-db`，删除临时脚本，确认 `git status` 只剩计划/规格文档的验收改动。

- [ ] **Step 6: 写验收结果并提交**

在计划末尾追加 `## 验收结果`：门禁结果、测试数量、路由表、三种库状态（无库 / 空库 / 有数据）、上述运行时证据、遗留 Minor。规格文档 §6.2 的 `letters` 表补一句迁移列说明，§10 阶段 3 标为完成。

```bash
git add docs/superpowers/plans/2026-11-08-personal-space-phase-3.md docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md
git commit -m "docs(phase-3): 验收结果与 letters 迁移列说明"
```

---

## 自审

- **规格覆盖**：§5.1 评论、§5.3 歌单与推荐、§5.4 信箱、§6.2 comments/letters/songs、§6.3 缓存与失效、§7 登录与角色、§10 阶段 3 完成标志、§11 互动入口未登录说明与键盘可达，均有对应任务。
- **无占位**：每个新接口有签名与关键实现；UI 任务给出了结构要求与关键 JSX，实现者需按现有组件模式补全，不允许「自行发挥」出示例数据。
- **类型一致**：`LetterView` / `CommentView` / `SongView` 在 Task 2 定义，Task 3–5 直接消费；`TargetType` 与 `Platform` 从 `community-input.ts` 导出，读层复用。
- **阶段 4/5 接口预留**：`songs.pinned`、`shelf_items`、`comments.targetType = note` 已就位；阶段 4 只加页面与 owner 维护，阶段 5 只把 `getPostBySlug` 改名并接笔记评论。

---

## 验收结果

验收日期：2026-11-08。分支 `refactor/personal-space`，未部署、未合 `main`。

### 门禁

| 命令 | 结果 |
| --- | --- |
| `npm run type-check` | exit 0，`next typegen` + `tsc --noEmit` 通过 |
| `npm run lint` | exit 0，无输出 |
| `npm test` | 69 tests，69 pass，0 fail，0 skipped |
| `node scripts/check-content.mjs` | 检查 30 篇文章：0 个错误，0 个提醒 |
| `npm run build` | exit 0，347/347 静态页面生成 |

构建只有 2 条既有 Turbopack 警告（`src/lib/uploads-server.ts` 的动态文件系统访问导致整项目 tracing），与阶段 3 无关。

路由渲染方式（Next 16.4.3，Cache Components + Partial Prefetching）：

- `ƒ` 动态：`/`、`/admin`、`/letters`、`/login`、`/playlist`、`/write`、`/life/[id]`（PPR 壳 + 请求时数据）、API 与 `/media/[...path]`。
- `◐` Partial Prerender：`/about`、`/archives`、`/blog`、`/blog/[slug]`、`/blog/tag/[tag]`、`/changelog`、`/friends`、`/guestbook`、`/interview`、`/interview/[slug]`、`/projects`、`/shelf`、`/style`。
- `○` 静态：`/_not-found`、`/api/github`、`/feed.xml`、`/icon`、`/robots.txt`、`/sitemap.xml`。

页头账号菜单在 `<Suspense>` 内调用 `connection()` 后，静态壳仍保持 Partial Prerender。

### 三种数据库状态

用 WSL Docker `zb-check-db`（`pgvector/pgvector:pg17`）与本地 dev server 实测，dev server 使用临时 `AUTH_SECRET`、占位 `SMTP_USER/SMTP_PASS`、`OWNER_EMAIL=owner@example.test`；会话 cookie 由 `signSession()` 按同一算法生成，未改代码绕过鉴权。

- **无库**（`DATABASE_URL=`）：`/` 出现 6 处 `NOT AVAILABLE`；`/letters`、`/playlist` 显示 `NOT AVAILABLE` 面板与「暂时读不到」，没有假的 `0 封` / `0 首`；`/admin` 未登录仍先显示站长入口登录说明。没有示例留言残留。
- **空库**（新建 `blog_empty` 并 `ensureSchema()`，只插 owner 用户）：`/` 显示「还没有留言」；`/letters` 显示「信箱还空着。第一封可以是你写的。」；`/playlist` 显示「还没有设定此刻循环」「还没有添加歌曲」「还没有人推荐」；`/admin` 显示「没有待审留言」「没有待审歌曲」「还没有评论」，均不是 `NOT AVAILABLE`。
- **有数据**：owner / visitor 两个用户、一条动态、三条留言（含旧留言板迁移记录与 pending）、三首歌曲（owner pinned / visitor approved / visitor pending）、三条评论（visible / hidden）、`site_settings.status_sentence`。

### 运行时证据

1. **首页**：页头状态句来自 `site_settings`（后台改为「在杭州，今天也在改观测台」后首页立即更新）；「此刻」三条留言全部来自数据库，显示 visitor 与「旧留言板的朋友」；页面无「阿远」「小满」「老陈」「示例 · 阶段 3」字样。
2. **信箱**：未登录无表单，显示「去登录」与「投递需要登录；提交后待审」；登录后表单可见，提交后数据库为 `pending`，本人页面出现「待审」标记，公开访客看不到；站长在 `/admin` 通过后公开访客可见，首页「此刻」同步出现。
3. **动态评论**：未登录显示登录说明；登录后发评论立即出现在列表；站长在 `/admin` 隐藏后，公开页面不再显示，计数从 2 条降为 1 条。
4. **歌单**：pinned 歌曲在「此刻循环」；已通过计数排除待审（`3 首 · 已通过 · 1 首待审`）；访客推荐显示推荐人；待审只对本人可见；24 小时 3 首限制实测拦下第 4 首，错误「今天已经推荐三首了，明天再来」，草稿保留。
5. **审核后台**：未登录显示站长入口；visitor 显示「只对站长开放」且不渲染任何审核数据；owner 可改状态句、通过/驳回留言与歌曲、隐藏/恢复评论，操作后列表与公开页面同步更新。
6. **两种模式**：观测台（`<html class="dark">`，背景 `rgb(13, 15, 18)`）与报表模式（背景 `rgb(245, 245, 243)`）各检查 `/`、`/letters`、`/playlist`、`/life/1`、`/admin`，正文长度一致、无 `NOT AVAILABLE`、无控制台错误。
7. **关 JS**：`/`、`/letters`、`/playlist`、`/life/1` 正文均可见；首页时钟显示 `--:--:--`，互动表单按未登录状态给出说明。
8. **移动端账号菜单**：375px 打开 Sheet 后点账号菜单，`<details>` 正常展开，Sheet 保持打开，「我的推荐 / 写一条 / 管理」可见；点「管理」后 Sheet 关闭并跳到 `/admin`。
9. **诚实性 grep**：`src/app/(site)/page.tsx` 与 `src/components/life/now-panel.tsx` 无「阿远 / 小满 / 老陈 / 示例 · 阶段 3」残留。

### 验收中发现并修复

- `3ff2496`：移动端 Sheet 的账号菜单点击 `<summary>` 会冒泡到关闭抽屉的 `onClick`，导致登录用户打不开菜单；改为只在实际点击 `a` / `button` 时关闭。
- `956f59c`：真实会话 cookie 存在时，Next 16 报 `Route "/letters": unstable value Date.now() while prerendering`（`verifySession` 的过期判断）；按官方文档在 `AccountMenu` 调用 `getSessionUser()` 前加 `await connection()`，错误消失且静态壳保持。

### 遗留 Minor

- 账号菜单的 `<summary>` 与链接仍依赖浏览器默认 focus 轮廓，可补 token 级 `focus-visible` 样式。
- 原生 `<details>` 在客户端导航后保持展开，且不响应外部点击；这是无 JS 方案的取舍。
- `next dev` 有一条既有警告：`scroll-behavior: smooth` 建议在 `<html>` 加 `data-scroll-behavior="smooth"`，与阶段 3 无关。
- 只有一条动态时，`/life/[id]` 的「下一条」链接指回自身；属既有相邻导航逻辑，留待后续清理。
