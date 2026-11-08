# Personal Dev OS 阶段 3：内容应用与桌面细节 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把窗口里的占位内容换成真实内容应用：日志标签与钉选便签、相册、项目看板、代码片段、关于页、状态组件和桌面物件；同时保持数据诚实与移动端可用。

**Architecture:** 标签是 `moments.tags jsonb string[]`，读取侧宽松、发布侧严格；钉选是 `site_settings.desktop_pin_moment`。相册/看板/片段/关于都是共享服务端数据 + 可复用客户端视图：窗口内容与独立路由渲染同一个组件，窗口只负责滚动与尺寸。看板顺序只存 localStorage，不改项目配置。状态组件只读现有 `observation/weather/github/moments`，不新增心跳或在线数。

**Tech Stack:** Drizzle、zod、Node test、Shiki `css-variables`、React 19、CSS columns、HTML5 drag & drop、现有 Next `use cache`。

## Global Constraints

- 继承阶段 1/2 的全部 token、窗口、键盘、无 JS、减少动效/透明度、反 AI 感约束。
- 标签：最多 5 个、单个 1–16 字素、不存 `#`、AND 过滤；读取侧遇到脏数据要丢弃而不是让整页失败。
- 钉选：只认 `parseMomentId` 的规范十进制；`site_settings` 里没有记录或动态被删时不显示便签，不显示占位。
- 相册只收 `/media/` 站内图片；懒加载；空状态说「还没有照片」，不放假图。
- 看板列：待启动 / 进行中 / 已完成；`维护中` 放进「进行中」并带徽标；未知状态回退「待启动」。列内顺序只存 `z-os:kanban`，不改 `portfolio.ts`。
- 片段只有 6 条，全部来自本仓库真实代码；Shiki 服务端高亮，颜色映射语义 token，不允许蓝紫语法主题。
- 关于页/状态组件只显示真实值；`neofetch` 标明 `Shell: zsh (simulated)`；没有 AI Key 就显示未配置。
- 状态组件不出现「在线 / 心跳 / 实时在线人数」；提交读数按 `available` 与 `truncated` 显示。
- 桌面物件是真实按钮/链接，有 `aria-label`；无 canvas/three；减少动效时静止。
- 首屏 shell 预算不变；相册/看板/片段/关于的代码随窗口首次打开按需进入客户端 chunk（服务端内容本身不增加客户端 JS）。

## 文件结构

**新建**

| 文件 | 职责 |
|---|---|
| `src/lib/tags.ts` | 标签解析/过滤/统计纯函数 |
| `src/components/life/tag-filter.tsx` | `/life` 标签过滤条 |
| `src/components/life/moment-tags.tsx` | 动态上的标签行 |
| `src/components/desktop/sticky-note.tsx` | 桌面便签 |
| `src/components/desktop/status-widget.tsx` | 状态组件（客户端时钟 + 服务端读数） |
| `src/components/desktop/desk-objects.tsx` | 咖啡杯/拍立得/磁带 |
| `src/components/gallery/gallery-view.tsx` | 相册网格 + 窗口内 lightbox |
| `src/lib/gallery.ts` | 相册图片收集纯函数 |
| `src/components/projects/kanban-board.tsx` | 看板 + 详情面板 + 本地拖拽 |
| `src/lib/kanban.ts` | 状态映射/分组/本地顺序纯函数 |
| `src/config/snippets.ts` | 6 条真实片段 |
| `src/lib/snippets-server.ts` | Shiki 高亮 |
| `src/components/snippets/snippet-browser.tsx` | 片段列表/代码/复制 |
| `src/components/about/about-profile.tsx` | neofetch 档案 |
| `scripts/tags.test.mjs`、`scripts/gallery.test.mjs`、`scripts/kanban.test.mjs` | 纯函数测试 |

**修改**

`src/db/schema.ts`、`src/db/client.ts`、`src/lib/life.ts`、`src/lib/moment-core.ts`、`src/lib/moment-input.ts`、`src/lib/settings-server.ts`、`src/lib/moments-server.ts`（如需）、`src/app/(site)/write/actions.ts`、`src/components/write/moment-form.tsx`、`src/app/(site)/life/[id]/page.tsx`、`src/app/(site)/life/page.tsx`（阶段 1 新建）、`src/app/(site)/admin/page.tsx`、`src/app/(site)/admin/actions.ts`、`src/app/(site)/gallery/page.tsx`、`src/app/(site)/projects/page.tsx`、`src/app/(site)/snippets/page.tsx`、`src/app/(site)/about/page.tsx`、`src/app/(site)/page.tsx`、`src/components/desktop/desktop-home.tsx`、`src/app/globals.css`、`scripts/schema.test.mjs`、`scripts/moment-input.test.mjs`、`package.json`（test 清单）。

---

### Task 1: 标签数据层、schema 与测试

**Files:** Create `src/lib/tags.ts`、`scripts/tags.test.mjs`；Modify `src/db/schema.ts`、`src/db/client.ts`、`src/lib/life.ts`、`src/lib/moment-core.ts`、`src/lib/moment-input.ts`、`src/app/(site)/write/actions.ts`、`scripts/schema.test.mjs`、`scripts/moment-input.test.mjs`、`package.json`。

**Interfaces:**
- `MAX_TAGS = 5`、`MAX_TAG_LENGTH = 16`
- `parseTagInput(input: string): { ok: true; tags: string[] } | { ok: false; error: string }`
- `readTags(value: unknown): string[]`
- `filterByTags(moments: Moment[], tags: string[]): Moment[]`
- `collectTags(moments: Moment[]): { tag: string; count: number }[]`
- `Moment.tags?: string[]`；`MomentInput.tags: string[]`

- [ ] **Step 1: 写失败的纯函数测试**

`scripts/tags.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  collectTags,
  filterByTags,
  parseTagInput,
  readTags,
} from "../src/lib/tags.ts";

test("parseTagInput：空格/逗号/# 前缀，去重保序", () => {
  assert.deepEqual(parseTagInput("#杭州, 雨天 杭州，咖啡").tags, ["杭州", "雨天", "咖啡"]);
});

test("parseTagInput：最多 5 个，单个最多 16 字素", () => {
  assert.equal(parseTagInput("a b c d e f").ok, false);
  assert.equal(parseTagInput("字".repeat(17)).ok, false);
  assert.equal(parseTagInput("👨‍💻".repeat(16)).ok, true);
});

test("parseTagInput：空输入是合法空数组", () => {
  assert.deepEqual(parseTagInput("  ,  # ").tags, []);
});

test("readTags：丢弃非字符串、超长、# 前缀，截到 5 个", () => {
  assert.deepEqual(
    readTags(["#杭州", "杭州", 3, "字".repeat(17), "a", "b", "c", "d"]),
    ["杭州", "a", "b", "c", "d"]
  );
  assert.deepEqual(readTags(null), []);
});

test("filterByTags：多标签 AND", () => {
  const moments = [
    { id: "1", tags: ["杭州", "雨天"] },
    { id: "2", tags: ["杭州"] },
    { id: "3", tags: [] },
  ];
  assert.deepEqual(filterByTags(moments, ["杭州", "雨天"]).map((m) => m.id), ["1"]);
  assert.equal(filterByTags(moments, []).length, 3);
});

test("collectTags：按次数降序，次数相同按中文排序", () => {
  const moments = [
    { id: "1", tags: ["杭州", "雨天"] },
    { id: "2", tags: ["杭州", "咖啡"] },
    { id: "3", tags: ["咖啡"] },
  ];
  assert.deepEqual(collectTags(moments), [
    { tag: "杭州", count: 2 },
    { tag: "咖啡", count: 2 },
    { tag: "雨天", count: 1 },
  ]);
});
```

- [ ] **Step 2: 运行测试确认失败** — `node --test scripts/tags.test.mjs`，Expected `ERR_MODULE_NOT_FOUND`。
- [ ] **Step 3: 实现 `src/lib/tags.ts`**

```ts
import type { Moment } from "./life";

export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 16;

const segmenter = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });

function graphemes(value: string): string[] {
  return Array.from(segmenter.segment(value), (x) => x.segment);
}

function normalize(raw: string): string {
  return raw.trim().replace(/^#+/, "").trim();
}

export function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const tag = normalize(item);
    if (!tag || graphemes(tag).length > MAX_TAG_LENGTH) continue;
    if (!tags.includes(tag)) tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }
  return tags;
}

export function parseTagInput(
  input: string
): { ok: true; tags: string[] } | { ok: false; error: string } {
  const tags: string[] = [];
  for (const part of input.split(/[\s,，]+/)) {
    const tag = normalize(part);
    if (!tag) continue;
    if (graphemes(tag).length > MAX_TAG_LENGTH) {
      return { ok: false, error: `单个标签最多 ${MAX_TAG_LENGTH} 个字符` };
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > MAX_TAGS) {
    return { ok: false, error: `最多 ${MAX_TAGS} 个标签` };
  }
  return { ok: true, tags };
}

export function filterByTags(moments: Moment[], tags: string[]): Moment[] {
  if (tags.length === 0) return moments;
  return moments.filter((moment) =>
    tags.every((tag) => (moment.tags ?? []).includes(tag))
  );
}

export function collectTags(moments: Moment[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const moment of moments) {
    for (const tag of moment.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"));
}
```

- [ ] **Step 4: 接通数据层**
  - `src/lib/life.ts` 的 `Moment` 增加 `tags?: string[]`。
  - `src/lib/moment-core.ts` 的 `MomentDbRowLike` 增加 `tags?: unknown`；`toMoment` 用 `readTags(row.tags)`，非空才赋 `moment.tags`。
  - `src/lib/moment-input.ts`：`MomentInput` 增加 `tags: string[]`；`parseMomentInput` 读取 `String(formData.get("tags") ?? "")`，调用 `parseTagInput`，失败返回中文错误，成功写 `value.tags`。在 zod 校验之后做，保持 zod schema 不变。
  - `src/app/(site)/write/actions.ts` 解构 `tags` 并写入 `momentsTable`。
- [ ] **Step 5: schema 与 DDL**
  - `src/db/schema.ts` 的 `moments` 增加 `tags: jsonb("tags").$type<string[]>().notNull().default([]),`。
  - `src/db/client.ts` 的 `CREATE TABLE IF NOT EXISTS moments` 增加 `tags jsonb NOT NULL DEFAULT '[]'::jsonb,`。
  - `scripts/schema.test.mjs`：`moments` 期望列加 `"tags"`，并断言 `/tags jsonb NOT NULL DEFAULT '\[\]'::jsonb/`。
- [ ] **Step 6: 补 input 测试** — `scripts/moment-input.test.mjs` 增加：`tags: "#杭州 雨天"` 解析为 `["杭州","雨天"]`；6 个标签被拒且 `error` 含「最多 5 个」；超长标签被拒。
- [ ] **Step 7: test 脚本** — `package.json` 的 `test` 末尾加 `scripts/tags.test.mjs`。
- [ ] **Step 8: 运行测试** — `node --test scripts/tags.test.mjs scripts/moment-input.test.mjs scripts/schema.test.mjs`，Expected 全绿。
- [ ] **Step 9: 提交** — `git add ... && git commit -m "feat(life): 动态标签数据层与 schema"`

---

### Task 2: 日志 UI、标签过滤与钉选便签

**Files:** Create `src/components/life/tag-filter.tsx`、`moment-tags.tsx`、`src/components/desktop/sticky-note.tsx`；Modify `src/app/(site)/life/page.tsx`、`src/app/(site)/life/[id]/page.tsx`、`src/app/(site)/write/page.tsx`、`src/components/write/moment-form.tsx`、`src/app/(site)/admin/page.tsx`、`src/app/(site)/admin/actions.ts`、`src/lib/settings-server.ts`、`src/app/(site)/page.tsx`、`src/components/desktop/desktop-home.tsx`、`globals.css`。

**Interfaces:**
- `TagFilter({ tags, active }: { tags: {tag,count}[]; active: string[] })`，纯链接，无客户端 JS。
- `MomentTags({ tags }: { tags: string[] })`，每个标签链到 `/life?tag=...`；单条页使用。
- `StickyNote({ moment }: { moment: Moment })`，220×180，展示日期 + 短文本 + 「→」；无关闭。
- `getDesktopPin(): Promise<string | null>`；`setDesktopPin(formData)` owner-only。
- `getPinnedMoment(): Promise<Moment | null>`（settings-server 调 `getMomentById`）。

- [ ] **Step 1: 标签过滤条**
  - `/life` 页面 `searchParams: Promise<{ tag?: string | string[] }>`；`const raw = ...; const active = readTags(Array.isArray(raw.tag) ? raw.tag : raw.tag ? [raw.tag] : [])`；过滤 `filterByTags(life.moments, active)`。
  - `TagFilter` 渲染全部标签（`collectTags(life.moments)`），每个是 `Link`，点击切换：已选则移除，未选则追加；`aria-pressed`；active 用 `border-data text-data`，其余 `border-rule text-muted-foreground`。URL 用 `URLSearchParams` 生成，保留多个 `tag`。
  - 顶部显示 `N 条 · 标签 AND`；没有匹配时「没有同时带这些标签的动态」+「清除过滤」；数据库不可用时沿用 `Not Available`，不显标签条。
  - 桌面日志窗口顶部也渲染同一批 chips（最多显示 8 个），窗口内点击是真实 `Link` 到 `/life?tag=...`，不在窗口内做过滤；底部「全部日志 →」。站长在 `/life` 与窗口内都显示「+ 写一条」。
  - 页面底部「← 桌面」。
- [ ] **Step 2: 动态标签**
  - `MomentTags`：小号等宽 `#tag`，`Link` 到 `/life?tag=...`；放在 `Moment` 下方的 `MomentMeta` 之后；单条页也显示。
  - 修改 `Moment` 组件（或三个子组件）统一在底部渲染标签；无标签不占位。
- [ ] **Step 3: 发布表单**
  - `moment-form.tsx` 的 draft 增加 `tags: ""`；在心情/天气/地点后加一个 `Input`，label「标签（可选，空格分隔，最多 5 个）」，`name="tags"`，`maxLength={120}`，受控。
  - `write/page.tsx` 副标题加「标签」。
- [ ] **Step 4: 钉选读取**
  - `settings-server.ts`：`DESKTOP_PIN_KEY = "desktop_pin_moment"`；`getDesktopPin()` 用 `use cache` + `cacheTag("settings")`，读 `siteSettings`，返回 `parseMomentId(row.value)` 的规范字符串或 null；`getPinnedMoment()` 调 `getMomentById`，`moment` 不存在或不可用返回 null。
- [ ] **Step 5: 后台选择器**
  - `admin/page.tsx` 增加 Section「桌面便签」：读最近 20 条动态 `{id, publishedAt, body}`（直连 DB，失败 `NotAvailable`），`<select name="momentId">` 选项 `MM.DD · 正文前 30 字`，空选项「不钉选」；默认选中当前 pin；表单 action `setDesktopPin`。
  - `admin/actions.ts`：`requireOwner`；`parseMomentId(String(formData.get("momentId") ?? ""))`；空值删除 `site_settings` 行（`eq(key, DESKTOP_PIN_KEY)`）；有效 id 先确认该动态存在，再 upsert；`updateTag("settings")`；`refresh()`。
- [ ] **Step 6: 桌面便签**
  - `(site)/page.tsx` 读取 `getPinnedMoment()`，有则 `stickyNote={<StickyNote moment={pinned}/>} `；无则不传。
  - `StickyNote`：`aside`，`--window-2` 底 + 1px `--rule`，`rotate(-1.5deg)`，顶部一个琥珀圆点；日期等宽 10px；正文 `line-clamp-5`，`momentText`；底部 `打开 →` 链到 `/life/{id}`；`aria-label="桌面便签"`。移动端隐藏（或变为普通卡片，按 §5.3 显示最近日志卡）。
  - CSS `.os-sticky-note` 定位右上，`top: 56px; right: 24px;` 220×180；`@media (max-width: 767px) { display:none }`。
- [ ] **Step 7: 手动验收** — 发一条带 `#杭州 雨天` 的动态；`/life?tag=杭州&tag=雨天` 只剩它；标签点击可切换；后台钉选后桌面右上出现便签，取消后消失；便签链接正确；无 JS 时过滤链接仍可用。
- [ ] **Step 8: 提交** — `git commit -m "feat(life): 标签过滤、发布标签与桌面便签"`

---

### Task 3: 相册、状态组件与桌面物件

**Files:** Create `src/lib/gallery.ts`、`scripts/gallery.test.mjs`、`src/components/gallery/gallery-view.tsx`、`src/components/desktop/status-widget.tsx`、`desk-objects.tsx`；Modify `src/app/(site)/gallery/page.tsx`、`src/app/(site)/page.tsx`、`src/components/desktop/desktop-home.tsx`、`globals.css`、`package.json`。

**Interfaces:**
- `collectGalleryImages(moments: Moment[]): GalleryImage[]`，`GalleryImage = { src; momentId; date; alt }`。
- `<GalleryView images={GalleryImage[]} />`，客户端 lightbox。
- `<StatusWidget weather={Weather|null} listening={string} reading={string[]} activity={GithubActivity} />`。
- `<DeskObjects photo={{src,momentId}|null />`。

- [ ] **Step 1: 相册纯函数测试** — 收集所有 `images`，只留 `/media/`，按时间倒序；同一 `src` 去重；无图返回空；每张图带 `momentId/date/place/body/tags`。`scripts/gallery.test.mjs` 覆盖这些点。
- [ ] **Step 2: 实现 `gallery.ts` 与 `GalleryView`**
  - 网格 `columns-2 gap-3 sm:columns-3`，每张 `<button>` 包 `<img loading="lazy" decoding="async" className="w-full">`；`break-inside-avoid`；alt 用「{日期} 的照片」；悬停显示日期 + `momentExcerpt(moment,30)`。
  - Lightbox：`role="dialog" aria-modal="true"`，打开时锁 body 滚动、焦点进关闭按钮、Esc 关闭、←/→ 切换、关闭归还焦点；背景 `--desk` 95%；图片 `object-contain`；底部日期、地点、正文摘要、标签 + `查看动态 →`。
  - 空状态：「还没有照片。等第一条带图的动态。」+「去写一条」链接；不放假图。
  - 窗口内 lightbox 用 `absolute inset-0`，独立滚动；`/gallery` 页用 `fixed inset-0`。用 `variant` prop 控制。
- [ ] **Step 3: `/gallery` 页与窗口内容**
  - 页面 `connection()` + `getMoments()`；不可用显示 Not Available；可用渲染 `GalleryView`（variant page，全部图片）。
  - 首页窗口内容传 `GalleryView`（variant window），按时间取最近 12 张。
- [ ] **Step 4: 状态组件**
  - 服务端传真实读数：天气、`portfolio.now.listening`、`reading`、`activity.days.slice(-14)` 求和 + `truncated`、`getObservation()` 的建站天数/动态总数/本月条数、`activity.days` 90 天。
  - 收起 280×56：两行；第一行时钟（`Clock withSeconds`）+ 日期；第二行 `杭州 18° 多云 · 14D 提交 N`；展开 360px：天气、在听、在读、14 天提交、建站天数、动态总数、本月条数、90 天提交热图（复用 `ActivityHeatmap` 的纯展示部分或简化格点），`数据更新于 …`。展开按钮 `aria-expanded`。
  - 明确标注手动字段「手动」；天气/提交不可用显示 `NOT AVAILABLE`；`truncated` 时提交数前加 `≥`；无在线/心跳。
  - 客户端 Clock 已有；组件整体可客户端（只接收已算好的 props）。
  - CSS 右下定位，`bottom: 64px; right: 24px;` 280px，展开 360px；`< 1024px` 折叠为 280×56 窄条放在任务栏上方，移动端变成图标网格下方两列卡片（不隐藏）。
- [ ] **Step 5: 桌面物件**
  - `DeskObjects` 客户端：咖啡杯（CSS 杯体 + 热气，点击触发 `z-os:coffee` 自定义事件并短暂冒热气；若终端已打开，终端打印 ASCII 咖啡）、拍立得（真实最新照片；无图时空白相纸 + `NO PHOTO`，`Link` 到 `/gallery`）、磁带（`Link` 到 `/playlist`，标签固定 `PLAYLIST`，不冒充实时播放）。
  - 桌面杯子左下 `left:24px; bottom:72px`；拍立得右下在状态组件上方；磁带底部中间偏右。窗口层 z-index 低于窗口；物件 `pointer-events` 不挡窗口。
  - 移动端隐藏；减少动效时热气/浮动/回正停止。
- [ ] **Step 6: 首页接线**
  - `(site)/page.tsx` 计算 `statusWidget`、`photo`、`galleryImages`；`DesktopHome` 接收并渲染。
  - 状态组件与便签不重叠：便签右上，状态右下，物件左下。
- [ ] **Step 7: 提交** — `git commit -m "feat(desktop): 相册、状态组件与桌面物件"`

---

### Task 4: 项目看板与代码片段

**Files:** Create `src/lib/kanban.ts`、`scripts/kanban.test.mjs`、`src/components/projects/kanban-board.tsx`、`src/config/snippets.ts`、`src/lib/snippets-server.ts`、`src/components/snippets/snippet-browser.tsx`；Modify `src/app/(site)/projects/page.tsx`、`src/app/(site)/snippets/page.tsx`、`src/app/(site)/page.tsx`、`globals.css`、`package.json`。

**Interfaces:**
- `KANBAN_COLUMNS: { id: "backlog"|"doing"|"done"; title: string }[]`
- `columnOf(status: string): KanbanColumnId`；`groupProjects(projects: Project[]): Record<KanbanColumnId, Project[]>`
- `readKanbanOrder(): Record<string, { column: KanbanColumnId; order: number }>` / `writeKanbanOrder`（仅 localStorage，客户端用）
- `snippets: Snippet[]`，`Snippet = { id; title; language; description; code; source; tags }`
- `highlightSnippets(): Promise<{ id; html }[]>`（`use cache`，Shiki `css-variables`）

- [ ] **Step 1: 看板纯函数测试** — `进行中`→doing；`维护中`→doing；`已完成`→done；`待启动`→backlog；未知→doing（开发环境 `console.warn`，生产不猜）；顺序保持配置顺序；`groupProjects` 三列齐全。
- [ ] **Step 2: 实现 `kanban.ts` 与看板**
  - 三列 `grid-cols-3`（窄窗口单列/横向滚动），列头 `待启动 2`；卡片：项目名、tagline、stack 前 3、状态徽标（维护中 amber）、仓库/访问链接（阻止冒泡）。
  - 点击卡片打开右侧详情面板（`项目名 / 状态 / Why / Feeling / Highlights / Outcomes / Stack / 链接`），关闭按钮；Esc 关闭。
  - 拖拽：HTML5 `draggable`，`onDragStart` 存项目名，`onDrop` 改本地列与顺序；`localStorage` 键 `z-os:kanban`，只存 `{name:{column,order}}`；「重置顺序」按钮。无 JS/键盘：每张卡提供「← / →」按钮移动。
  - 窗口 880×560 内横向滚动；`/projects` 页同样渲染。
- [ ] **Step 3: 6 条真实片段（严格按设计文档 §6.6 的选题）**
  - `src/config/snippets.ts` 放 6 条，代码从以下文件原样摘录（由实现者读取并复制，不许改写逻辑）：
    1. `next-connection` — `src/app/(site)/page.tsx` 的 `connection()` + `instant = false` 注释与导出（标题「Next 16：数据库页面别把空数据烤进静态壳」，`tsx`）。
    2. `clock-store` — 阶段 1 Task 4 创建的 `src/components/desktop/clock-store.ts` 的 `useSyncExternalStore` 时钟（标题「useSyncExternalStore 版站内时钟」，`ts`）。
    3. `spine-scroll` — `src/app/globals.css` 的 `.life-spine-fill` / `animation-timeline: scroll(...)` 规则（标题「滚动驱动的脊线：CSS animation-timeline」，`css`）。
    4. `pgvector-hnsw` — `src/db/client.ts` 的 pgvector 列与 HNSW 余弦索引 DDL（标题「Drizzle + pgvector：HNSW 余弦索引」，`sql`）。
    5. `token-contrast` — `scripts/tokens.test.mjs` 的 `contrast()` / `chroma()` 与阈值断言（标题「设计 token 的 WCAG 护栏」，`js`）。
    6. `ai-citations` — `src/app/api/chat/route.ts` 的 `data-sources` 引用随流下发片段（标题「AI SDK：把引用来源随流下发」，`ts`）。
  - 每条补 `title`/`useCase`/`tags`/`code`/`source`（`文件:行`），`language` 用 shiki 支持名（`ts`/`tsx`/`css`/`sql`/`js`）。`useCase` 是一句话用途，不是标题复读。
- [ ] **Step 4: Shiki 高亮**
  - `snippets-server.ts`：`import { codeToHtml } from "shiki"`；`"use cache"; cacheLife("max"); cacheTag("snippets")`；`codeToHtml(code, { lang, theme: "css-variables" })`；返回 id/html。
  - `globals.css` 定义 `.shiki` 变量：foreground ink、background transparent、comment ink-dim、constant/function phosphor、string ok、keyword/operator warn、number danger、variable/parameter ink-dim。禁止蓝紫。
- [ ] **Step 5: 片段浏览器**
  - 左侧列表（标题、语言、tags），右侧代码 + 复制按钮（`navigator.clipboard`，失败提示「复制失败」；1.5s「已复制」）；`?s=id` 选中，`router.replace` 更新；`aria-selected`。
  - 窗口 760×520 两栏；`/snippets` 页单栏列表 + 代码；空状态不会出现（6 条固定），但高亮失败时回退 `<pre><code>` 原文。
- [ ] **Step 6: 接线** — 首页窗口内容传 `KanbanBoard` 和 `SnippetBrowser`；`/projects`、`/snippets` 页复用。
- [ ] **Step 7: 提交** — `git commit -m "feat(apps): 项目看板与代码片段"`

---

### Task 5: 关于页 neofetch 与阶段 3 收口

**Files:** Create `src/components/about/about-profile.tsx`；Modify `src/app/(site)/about/page.tsx`、`src/app/(site)/page.tsx`、`globals.css`、`package.json`；Test all.

- [ ] **Step 1: 实现档案组件**
  - 顶部两栏：左侧现有 `siteConfig.author.avatar` 的 Z 字标（`next/image` unoptimized）、姓名、状态句、GitHub/邮箱；右侧 `key: value` 档案卡：`OS: Z·OS`、`Host: 杭州`、`Uptime: 建站 N 天`、`Shell: zsh (simulated)`、`Stack: Next.js 16 / React 19 / PostgreSQL`、`Apps: 12`、`Notes: N`、`AI: 已配置/未配置`。
  - 真实数据：`siteConfig`、`getStatusSentence()`、`getUptimeSnapshot()`、`getAllNotes().length`、`aiEnabled`；不写死版本号。
  - 下方保留现有「现在 / 能力 / 关于本站」三段，全部 token 化；「现在」标「手动 · 更新于」；移动端单列，档案卡可横向滚动。
- [ ] **Step 2: 关于窗口** — 首页 `windowContent.about` 渲染 `AboutProfile` + 「打开完整关于页 →」；`/about` 页复用。
- [ ] **Step 3: 阶段 3 验证**
  - `npm test`（新增 tags/gallery/kanban）、`npm run type-check`、`npm run lint`、`npm run build`。
  - 1440×900 检查：便签/状态/物件不重叠；打开日志窗滚动 12 条；相册 lightbox 键盘；看板拖拽刷新后仍保留（同浏览器）；片段复制；关于 neofetch 与真实值一致。
  - 390×844：桌面变主屏；相册单列；看板横向滚动；无物件遮挡。
  - 无 JS：`/life` 标签链接、`/gallery` 图片、`/projects` 列表/看板静态卡、`/snippets` 代码、`/about` 全部可读。
- [ ] **Step 4: 提交** — `git commit -m "feat(about): neofetch 档案与阶段 3 收口"`

## 阶段 3 完成标准

- 标签可发布/过滤/聚合，AND 语义正确；便签可钉选/取消/删除动态后自动消失。
- 相册只显示真实站内图片，lightbox 可键盘操作；看板三列 + 维护中徽标 + 本地顺序；片段 6 条真实代码可复制；关于页全真实。
- 状态组件只读真实数据，无在线/心跳；桌面物件有真实链接/按钮。
- 全量测试/类型/构建通过；窗口与独立路由复用同一内容组件。

## 明确不在阶段 3

- 右键菜单、设置面板完整项、更多文件夹、404/错误页、最终清理（阶段 4）。
