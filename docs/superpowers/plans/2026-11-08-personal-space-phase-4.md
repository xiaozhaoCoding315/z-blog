# 个人空间改版 · 阶段 4（书架、歌单）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/shelf` 能按书 / 影 / 音三个标签浏览，`/playlist` 的「此刻循环」「我的歌单」「大家推荐的」「我的待审」全部可用；站长在审核后台能添加书架条目、添加自己的歌、指定「此刻循环」、删除条目。所有外链跳转正确。

**Architecture:** 表结构在阶段 3 Task 1 已经建好（`shelf_items`、`songs` 的 `pinned` / `status` / `source`），本阶段只补两个 UI 面与站长维护入口。书架是纯读页面，标签用 URL `?type=` 表达，不引入客户端筛选；歌单沿用阶段 3 的读层，补 pinned 卡片与站长操作。审核后台延续阶段 3 的「服务端表单 + Server Actions」结构。

**Tech Stack:** Next.js 16.4.3（App Router、`cacheComponents`、`use cache` / `cacheTag` / `updateTag` / `refresh`、Server Actions）、React 19.3、Tailwind CSS 4.3.3、Drizzle ORM 0.45 + postgres.js、zod 4.6、`node --test`。

---

## Global Constraints

- 继承阶段 3 的全部约束：Next 16 文档先读后写、中文文案、token 配色、无新依赖、无假数据、Server Action 内重新鉴权、`use cache` + `cacheTag` + `updateTag`、`connection()` 页面 `instant = false`、`node --test` 纯函数无 `@/` 别名、不部署不合 main。
- 书架页读库，必须 `await connection()` 且 `export const instant = false`。
- 标签是链接，不是客户端状态：`/shelf?type=book|film|music`；非法值回退 `book`，不报错。
- 没有封面时显示 `--panel-2` 占位块，不放示例图片、不引用外部占位图服务。
- 评分只显示真实值；`rating` 为空就不显示评分，不显示 0 星。
- 外链必须 `target="_blank" rel="noreferrer noopener"`，只接受 http(s)。
- 歌单「此刻循环」最多一首；没有就不显示假卡片。访客推荐仍是 pending，只有本人与站长可见。
- 每个任务单独提交；任务结束 `npm run type-check` + `npm test`；阶段收尾跑全套门禁。

---

## 文件结构

**新建**

| 文件 | 职责 |
| --- | --- |
| `src/lib/shelf-server.ts` | 书架读层（`use cache` + tag `shelf`） |
| `src/components/shelf/shelf-row.tsx` | 书架单行 |
| `scripts/shelf-input.test.mjs` | 书架表单校验测试（阶段 3 的 `community-input.ts` 增补） |

**修改**

`src/lib/community-input.ts`（加 `parseShelfInput`）、`src/app/(site)/shelf/page.tsx`、`src/app/(site)/playlist/page.tsx`（补 pinned 卡片与锚点）、`src/app/(site)/admin/page.tsx`（加书架 / 歌单维护段）、`src/app/(site)/admin/actions.ts`（加 `addShelfItem` / `deleteShelfItem` / `addSong` / `pinSong` / `deleteSong`）、`package.json`、`docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`（阶段 4 完成记录）

---

### Task 1: 书架页与站长维护

**Files:**
- Modify: `src/lib/community-input.ts`
- Create: `src/lib/shelf-server.ts`
- Create: `src/components/shelf/shelf-row.tsx`
- Modify: `src/app/(site)/shelf/page.tsx`
- Modify: `src/app/(site)/admin/page.tsx`
- Modify: `src/app/(site)/admin/actions.ts`
- Create: `scripts/shelf-input.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `type ShelfType = "book" | "film" | "music"`
  - `interface ShelfInput { type: ShelfType; title: string; creator: string; rating: number | null; note: string; coverUrl: string | null; finishedAt: string | null }`
  - `parseShelfInput(formData: FormData): ParseResult<ShelfInput>`
  - `interface ShelfItemView { id: number; type: ShelfType; title: string; creator: string; rating: number | null; note: string; coverUrl: string | null; finishedAt: string | null; date: string }`
  - `getShelfItems(): Promise<{ available: boolean; items: ShelfItemView[] }>`
  - `addShelfItem(formData: FormData): Promise<void>`
  - `deleteShelfItem(formData: FormData): Promise<void>`

- [ ] **Step 1: 在 `scripts/shelf-input.test.mjs` 写失败测试**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShelfInput } from "../src/lib/community-input.ts";

function fd(entries) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

test("书架：类型只收 book / film / music", () => {
  const base = { type: "book", title: "置身事内", creator: "兰小欢" };
  assert.equal(parseShelfInput(fd(base)).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, type: "game" })).ok, false);
  assert.equal(parseShelfInput(fd({ ...base, title: " " })).ok, false);
});

test("书架：评分只能 1–5，空值表示不打分", () => {
  const base = { type: "film", title: "海街日记", creator: "是枝裕和" };
  assert.equal(parseShelfInput(fd(base)).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, rating: "5" })).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, rating: "0" })).ok, false);
  assert.equal(parseShelfInput(fd({ ...base, rating: "6" })).ok, false);
});

test("书架：封面只收 http(s) 或站内 /images 路径", () => {
  const base = { type: "music", title: "冀西南林路行", creator: "万能青年旅店" };
  assert.equal(parseShelfInput(fd({ ...base, coverUrl: "https://example.com/a.jpg" })).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, coverUrl: "/images/cover.webp" })).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, coverUrl: "javascript:alert(1)" })).ok, false);
});

test("书架：完成日期只收 YYYY-MM-DD 或空", () => {
  const base = { type: "book", title: "书", creator: "人" };
  assert.equal(parseShelfInput(fd({ ...base, finishedAt: "2026-10-31" })).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, finishedAt: "2026-13-01" })).ok, false);
  assert.equal(parseShelfInput(fd({ ...base, finishedAt: "10/31" })).ok, false);
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node --test scripts/shelf-input.test.mjs`
Expected: FAIL，`parseShelfInput is not a function` 或模块导出缺失。

- [ ] **Step 3: 在 `src/lib/community-input.ts` 追加书架校验**

```ts
export type ShelfType = "book" | "film" | "music";

export interface ShelfInput {
  type: ShelfType;
  title: string;
  creator: string;
  rating: number | null;
  note: string;
  coverUrl: string | null;
  finishedAt: string | null;
}

const shelfTypeSchema = z.enum(["book", "film", "music"]);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "日期不存在");

const coverSchema = z
  .string()
  .max(500, "封面地址太长")
  .refine(
    (v) => v.startsWith("/images/") || /^https?:\/\//i.test(v),
    "封面必须是 http(s) 地址或 /images/ 下的路径"
  );

export function parseShelfInput(fd: FormData): ParseResult<ShelfInput> {
  const type = shelfTypeSchema.safeParse(fd.get("type"));
  if (!type.success) return { ok: false, error: "类型只能是书、影、音" };

  const title = String(fd.get("title") ?? "").trim();
  const creator = String(fd.get("creator") ?? "").trim();
  if (!title || [...title].length > 120) {
    return { ok: false, error: "标题要填，最多 120 字" };
  }
  if ([...creator].length > 120) return { ok: false, error: "作者/艺人最多 120 字" };

  const rawRating = String(fd.get("rating") ?? "").trim();
  const rating = rawRating ? Number(rawRating) : null;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return { ok: false, error: "评分只能是 1 到 5" };
  }

  const note = String(fd.get("note") ?? "").trim();
  if ([...note].length > 200) return { ok: false, error: "短评最多 200 字" };

  const rawCover = String(fd.get("coverUrl") ?? "").trim();
  if (rawCover && !coverSchema.safeParse(rawCover).success) {
    return { ok: false, error: "封面必须是 http(s) 地址或 /images/ 下的路径" };
  }

  const rawDate = String(fd.get("finishedAt") ?? "").trim();
  if (rawDate && !dateOnly.safeParse(rawDate).success) {
    return { ok: false, error: "完成日期格式应为 YYYY-MM-DD" };
  }

  return {
    ok: true,
    value: {
      type: type.data,
      title,
      creator,
      rating,
      note,
      coverUrl: rawCover || null,
      finishedAt: rawDate || null,
    },
  };
}
```

- [ ] **Step 4: 写 `src/lib/shelf-server.ts`**

```ts
import { cacheLife, cacheTag } from "next/cache";
import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { shelfItems as shelfTable } from "@/db/schema";
import { formatDay } from "@/lib/life";
import type { ShelfType } from "@/lib/community-input";

export interface ShelfItemView {
  id: number;
  type: ShelfType;
  title: string;
  creator: string;
  rating: number | null;
  note: string;
  coverUrl: string | null;
  finishedAt: string | null;
  date: string;
}

export async function getShelfItems(): Promise<{
  available: boolean;
  items: ShelfItemView[];
}> {
  return getShelfItemsCached();
}

async function getShelfItemsCached(): Promise<{
  available: boolean;
  items: ShelfItemView[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shelf");

  const db = getDb();
  if (!db) return { available: false, items: [] };

  try {
    const rows = await db
      .select()
      .from(shelfTable)
      .orderBy(desc(shelfTable.finishedAt), desc(shelfTable.createdAt), desc(shelfTable.id));

    return {
      available: true,
      items: rows.map((row) => ({
        id: row.id,
        type: row.type === "film" || row.type === "music" ? row.type : "book",
        title: row.title,
        creator: row.creator,
        rating: row.rating,
        note: row.note,
        coverUrl: row.coverUrl,
        finishedAt: row.finishedAt,
        date: row.finishedAt
          ? row.finishedAt.replaceAll("-", ".")
          : formatDay(row.createdAt.toISOString()),
      })),
    };
  } catch {
    return { available: false, items: [] };
  }
}
```

注意：`orderBy(desc(finishedAt))` 在 Postgres 里 NULL 排在前（DESC 时 NULLS FIRST 默认），没有完成日期的条目会跑到最前。实现时改成 `sql\`${shelfTable.finishedAt} DESC NULLS LAST\``，并用 `createdAt DESC` 兜底；这是可用性细节，不要留给读的人猜。

- [ ] **Step 5: 写 `ShelfRow`**

结构：`article` 一行 `flex gap-4 border-b border-rule py-4`。
- 封面：有 `coverUrl` 时 `<img src ... alt={title} className="h-16 w-12 shrink-0 border border-rule object-cover" />`；没有时 `div` 同样尺寸 `bg-panel-2`，里面 mono 首字。`img` 加 eslint-disable 注释（与 `moment-photo.tsx` 同做法）。
- 正文：标题（`text-[15px]`）、作者/艺人（mono 11px muted）、短评（14px）、底部 mono 读数：日期 + `rating ? \`${rating}/5\` : "未评分"`。评分用 `aria-label={\`${rating} 分，满分 5 分\`}`，不只靠视觉。
- 不加卡片底、不加圆角、不加阴影。

- [ ] **Step 6: 重写 `/shelf` 页面**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getShelfItems } from "@/lib/shelf-server";
import { ShelfRow } from "@/components/shelf/shelf-row";

export const metadata: Metadata = { title: "书架" };
export const instant = false;

const TABS = [
  { type: "book", label: "书" },
  { type: "film", label: "影" },
  { type: "music", label: "音" },
] as const;

export default async function ShelfPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await connection();
  const { type } = await searchParams;
  const active = TABS.some((t) => t.type === type) ? type : "book";
  const shelf = await getShelfItems();
  // 过滤 items；标题 + mono 读数（N 条）；标签链接带 ?type=；
  // !available → NOT AVAILABLE 面板；空 → 「这一类还空着」
  return null; // 实现时替换成完整 JSX
}
```

标签样式：横向一行，`border-b border-rule`，每项 `px-3 py-2 font-mono text-[11px]`；当前项 `text-data` + 底部 2px `bg-data`，其余 `text-muted-foreground hover:text-foreground`。当前项加 `aria-current="page"`。

- [ ] **Step 7: 在 `src/app/(site)/admin/actions.ts` 加书架 Actions**

```ts
export async function addShelfItem(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const parsed = parseShelfInput(formData);
  if (!parsed.ok) return;
  const db = getDb();
  if (!db) return;
  await db.insert(shelfItems).values(parsed.value);
  updateTag("shelf");
  refresh();
}

export async function deleteShelfItem(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  if (!id) return;
  const db = getDb();
  if (!db) return;
  await db.delete(shelfItems).where(eq(shelfItems.id, id));
  updateTag("shelf");
  refresh();
}
```

注意 import：`shelfItems` 从 `@/db/schema`，`parseShelfInput` 从 `@/lib/community-input`。`deleteShelfItem` 用主键删除；不接受负数/零。

- [ ] **Step 8: 在 `/admin` 页加「书架」段**

位置放在评论管理之后。内容：
- 添加表单：`<form action={addShelfItem}>`；字段 `type`（原生 `<select name="type">`：书/影/音）、`title`、`creator`、`rating`（`<select>`：不评分 / 1–5）、`note`（textarea）、`coverUrl`（url）、`finishedAt`（`type="date"`）。标签沿用 mono 小标签。
- 列表：直接查 DB `shelfItems`，按 `finishedAt` 空值后置排序；每条显示类型、标题、作者、评分、日期 + 删除按钮（`<form action={deleteShelfItem}>` + hidden id）。
- DB 不可用 → 该段显示 `NOT AVAILABLE`，不显示空表单的成功假象。

- [ ] **Step 9: 把新测试加进 `package.json` 并跑门禁**

`test` 脚本追加 `scripts/shelf-input.test.mjs`。

Run:
```bash
node --test scripts/shelf-input.test.mjs
npm run type-check
npm test
```
Expected: 全部通过。

- [ ] **Step 10: 提交**

```bash
git add src/lib/community-input.ts src/lib/shelf-server.ts src/components/shelf/shelf-row.tsx src/app/'(site)'/shelf/page.tsx src/app/'(site)'/admin/page.tsx src/app/'(site)'/admin/actions.ts scripts/shelf-input.test.mjs package.json
git commit -m "feat(phase-4): 书架页与站长书架维护"
```

---

### Task 2: 歌单补全与站长维护

**Files:**
- Modify: `src/app/(site)/playlist/page.tsx`
- Modify: `src/app/(site)/admin/page.tsx`
- Modify: `src/app/(site)/admin/actions.ts`

**Interfaces:**
- Produces: `addSong(formData: FormData): Promise<void>`、`pinSong(formData: FormData): Promise<void>`、`deleteSong(formData: FormData): Promise<void>`。

- [ ] **Step 1: 在 `admin/actions.ts` 加歌单 Actions**

```ts
export async function addSong(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const parsed = parseSongInput(formData);
  if (!parsed.ok) return;
  const db = getDb();
  if (!db) return;
  // owner 添加的歌直接 approved；source 固定 owner，userId 记 owner
  await db.insert(songsTable).values({
    ...parsed.value,
    source: "owner",
    status: "approved",
    userId: (await requireOwner())!.id,
  });
  updateTag("songs");
  refresh();
}

export async function pinSong(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  if (!id) return;
  const db = getDb();
  if (!db) return;
  await db.transaction(async (tx) => {
    await tx.update(songsTable).set({ pinned: false });
    await tx.update(songsTable).set({ pinned: true }).where(eq(songsTable.id, id));
  });
  updateTag("songs");
  refresh();
}

export async function deleteSong(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  if (!id) return;
  const db = getDb();
  if (!db) return;
  await db.delete(songsTable).where(eq(songsTable.id, id));
  updateTag("songs");
  refresh();
}
```

`await requireOwner()` 在 `addSong` 里调用了两次——实现时先存 `const owner = await requireOwner(); if (!owner) return;`，不要重复查会话。`pinSong` 只允许 pin 已通过的歌曲：在事务前查 `status === 'approved'`，不通过就返回。

- [ ] **Step 2: 在 `/admin` 页加「歌单」段**

- 添加表单：`title`、`artist`、`url`、`note`；`<form action={addSong}>`。
- 列表：直接查 DB `songs`（approved + pending 都显示，方便站长管理）；每行显示 title/artist/status/pinned + 「设为此刻循环」按钮（`pinSong`）+ 删除按钮（`deleteSong`）。pending 的访客推荐在此也能直接看到并删除；通过/驳回仍走阶段 3 的「待审歌曲」段。
- 没有歌曲 → 「歌单还空着」；DB 不可用 → `NOT AVAILABLE`。

- [ ] **Step 3: 补全 `/playlist` 页面**

阶段 3 已实现大部分；本任务确认并补：
1. 「此刻循环」只取 `songs.find((s) => s.pinned && !s.pending && s.source === "owner")`；有则大面板（标题 24px 宋体、艺人 mono、推荐语、平台外链）；无则 `--panel-2` 面板写「还没有设定此刻循环」。
2. 「我的歌单」过滤 `source === "owner" && !pinned && !pending`。
3. 「大家推荐的」过滤 `source === "visitor" && !pending`。
4. 「我的待审」容器加 `id="mine"`，账号菜单的「我的推荐」链接到 `/playlist#mine`。
5. 所有整行外链用 `SongRow`；「此刻循环」卡片本身也是外链。
6. 平台标签：`NETEASE` / `QQ MUSIC` / `LINK`，不引入图标库。

- [ ] **Step 4: 类型检查与测试**

Run:
```bash
npm run type-check
npm test
```
Expected: exit 0。

- [ ] **Step 5: 提交**

```bash
git add src/app/'(site)'/playlist/page.tsx src/app/'(site)'/admin/page.tsx src/app/'(site)'/admin/actions.ts
git commit -m "feat(phase-4): 歌单此刻循环与站长歌曲维护"
```

---

### Task 3: 阶段 4 验收

**Files:**
- Modify: `docs/superpowers/plans/2026-11-08-personal-space-phase-4.md`（追加 `## 验收结果`）
- Modify: `docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`（阶段 4 完成记录）

- [ ] **Step 1: 全套门禁**

```bash
npm run type-check
npm run lint
npm test
node scripts/check-content.mjs
npm run build
```
Expected: 全部 exit 0。

- [ ] **Step 2: 起本地数据库并造数据**

沿用阶段 3 的 `zb-check-db`。插入：
- 书架：书 2 条（一条有封面 URL、一条无封面、有/无评分各一）、影 1 条、音 1 条；完成日期一条空、一条 2026-10-31。
- 歌单：owner approved + pinned 1 首；owner approved 未 pin 1 首；visitor approved 1 首；visitor pending 1 首（属于测试访客）。

- [ ] **Step 3: 运行时检查**

1. `/shelf`：默认「书」标签；`?type=film`、`?type=music` 切换正确；非法 `?type=game` 回退「书」；无评分条目不显示 `0/5`；无封面显示占位块；有封面 `<img>` 有 1px 边。
2. 书架排序：没有完成日期的条目不在最前（`NULLS LAST` 生效）。
3. `/playlist`：pinned 歌曲在「此刻循环」且不在「我的歌单」重复；「我的歌单」「大家推荐的」分组正确；pending 只对本人可见；整行外链地址与 DB 一致，`target`/`rel` 正确。
4. `/admin`：owner 添加书架条目后 `/shelf` 立即出现（`updateTag("shelf")` + `refresh()`）；删除后消失；添加歌曲后 `/playlist`「我的歌单」出现；pin 后「此刻循环」切换且旧 pinned 取消；删除后消失。
5. 未登录访问 `/shelf`、`/playlist`：书架可看；歌单可看，推荐表单位置显示登录说明。
6. 两种模式目视检查 `/shelf`、`/playlist`、`/admin`；键盘 Tab 能走完标签、外链、表单、审核按钮。
7. 诚实性：没有封面的条目不出现 `example.com` 占位图；没有 pinned 时显示「还没有设定此刻循环」，不显示假卡片。

- [ ] **Step 4: 清理与记录**

停进程、停容器、删临时脚本。追加验收结果：门禁、路由、数据状态、上述证据、Minor 清单。规格文档阶段 4 标完成。

```bash
git add docs/superpowers/plans/2026-11-08-personal-space-phase-4.md docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md
git commit -m "docs(phase-4): 验收结果"
```

---

## 自审

- **规格覆盖**：§5.2 书架三标签与字段、§5.3 歌单四段与平台外链、§10 阶段 4 完成标志「三个页面可用，跳转外部平台正确」，均有任务对应。
- **无占位**：schema 已由阶段 3 建好；本计划只补 `parseShelfInput`、读层、页面与 owner Actions，接口签名齐全。
- **类型一致**：`ShelfType` 与 `SongView` 直接复用阶段 3 的 `community-input.ts` / `songs-server.ts`，不重复定义平台枚举。
