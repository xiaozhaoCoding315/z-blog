# 个人空间改版 · 阶段 1（视觉系统 + 布局壳 + 首页）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把站点从「技术博客」换成「信笺与邮戳」的视觉系统，并用假数据做出可评审的新首页。

**Architecture:** 先替换 `globals.css` 的设计 token（保留 shadcn 现有的变量名，只换值），再补上邮戳、齿孔、信笺三个基础类；然后按 `生活流 → 动态三形态 → 此刻卡 → 首页` 的顺序自下而上组装。阶段 1 全部用 `src/config/mock-moments.ts` 的假数据，不碰数据库、不碰认证。

**Tech Stack:** Next.js 16.4.3（App Router、`cacheComponents`）、React 19、Tailwind CSS v4（`@theme inline`）、TypeScript、`node --test`。

---

## Global Constraints

- Next.js 版本是 16.4.3，**写任何代码前先读 `node_modules/next/dist/docs/01-app/01-getting-started/` 里对应的章节**（本阶段主要看 `11-css.md`、`03-layouts-and-pages.md`、`12-images.md`）。这个版本的 API 与训练数据可能不同，不要凭记忆写。
- 所有注释和面向用户的文案用中文；代码标识符用英文。
- 不新增任何 npm 依赖。图标一律用 `lucide-react` 里已有的。
- 颜色只能来自本计划定义的 token，**不允许在组件里写死十六进制值**。
- 字体保持现有的三档不变：`--font-heading`（思源宋体）、`--font-sans`（思源黑体/系统）、`--font-mono`（Geist Mono）。本阶段不引入新字体、不做手写体。
- 动效只允许照片 hover 抬升 2px；不做整页淡入、不做视差。
- 不使用渐变、玻璃拟态、彩色投影。
- 不在任何位置使用装饰性的 `01 / 02 / 03` 编号。
- 本阶段在分支 `refactor/personal-space` 上做，**不要部署、不要合进 main**。整套改版到阶段 5 才上线。
- 每完成一个任务跑一次 `npm run type-check`；每个任务单独提交。
- 站点当前的线上版本是旧设计，改 token 会让旧页面跟着变样，这是预期的，不需要为旧页面做兼容。

---

## 文件结构

**新建**

| 文件 | 职责 |
| --- | --- |
| `src/lib/life.ts` | 生活流的纯函数：按月分组、日期格式化、邮戳角度。不依赖 React。 |
| `scripts/life.test.mjs` | `src/lib/life.ts` 的单元测试。 |
| `scripts/tokens.test.mjs` | 设计 token 的对比度护栏。 |
| `src/components/site/postmark.tsx` | 邮戳组件，全站唯一的签名元素。 |
| `src/components/life/moment.tsx` | 动态分发器：按 `kind` 选形态。 |
| `src/components/life/moment-text.tsx` | 纯文字短记。 |
| `src/components/life/moment-photo.tsx` | 图文形态（含照片占位）。 |
| `src/components/life/moment-card.tsx` | 卡片形态：歌单、书架、摘录、链接。 |
| `src/components/life/month-divider.tsx` | 月份粘性分隔条。 |
| `src/components/life/now-card.tsx` | 右栏「此刻」卡。 |
| `src/config/mock-moments.ts` | 阶段 1 的假数据。阶段 2 会被数据库替代。 |
| `src/app/(site)/style/page.tsx` | 开发期样式走廊，生产环境返回 404。 |

**修改**

| 文件 | 改动 |
| --- | --- |
| `src/app/globals.css` | 替换 `:root` / `.dark` 的 token；`@theme inline` 增加映射；追加 `.postmark`、`.perforated`、`.paper-sheet` 三个类。 |
| `src/config/site.ts` | 站名、简介、状态句、主导航、页脚导航。 |
| `src/app/(site)/page.tsx` | 整页重写：首页从文章列表改为生活流。 |

---

### Task 1: 视觉 token 与对比度护栏

**Files:**
- Modify: `src/app/globals.css:1-135`
- Create: `scripts/tokens.test.mjs`

**Interfaces:**
- Produces: CSS 变量 `--stamp`、`--postmark`、`--rule`、`--paper-raised`；Tailwind 颜色类 `text-stamp`、`bg-stamp`、`border-rule`、`bg-paper-raised`；`--radius: 0.125rem`。

- [ ] **Step 1: 写失败的测试**

创建 `scripts/tokens.test.mjs`：

```js
/**
 * 设计 token 的护栏：颜色可以改，但不能改到看不清。
 * 直接读 globals.css，不依赖浏览器。
 *   node --test scripts/tokens.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8"
);

function block(selector) {
  const start = css.indexOf(selector + " {");
  assert.notEqual(start, -1, `globals.css 里找不到 ${selector} 块`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const map = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

const light = block(":root");
const dark = block(".dark");

const rgb = (hex) => {
  assert.match(hex, /^#[0-9a-fA-F]{6}$/, `不是六位十六进制：${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
};

const luminance = ([r, g, b]) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a, b) => {
  const x = luminance(rgb(a));
  const y = luminance(rgb(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

test("亮色：正文对纸底不低于 7:1", () => {
  assert.ok(contrast(light.foreground, light.background) >= 7);
});

test("亮色：次要文字对纸底不低于 4.5:1", () => {
  assert.ok(contrast(light["muted-foreground"], light.background) >= 4.5);
});

test("暗色：正文对纸底不低于 7:1", () => {
  assert.ok(contrast(dark.foreground, dark.background) >= 7);
});

test("暗色：次要文字对纸底不低于 4.5:1", () => {
  assert.ok(contrast(dark["muted-foreground"], dark.background) >= 4.5);
});

test("两套主题都定义了邮戳、朱红与格线", () => {
  for (const [name, tokens] of [
    ["亮色", light],
    ["暗色", dark],
  ]) {
    for (const key of ["stamp", "postmark", "rule"]) {
      assert.match(
        tokens[key] ?? "",
        /^#[0-9a-fA-F]{6}$/,
        `${name}主题缺少 --${key}`
      );
    }
  }
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
node --test scripts/tokens.test.mjs
```

预期：至少 3 条失败——旧的 `--background` 是 `oklch(...)`，`rgb()` 里的断言会报「不是六位十六进制」，并且 `--stamp` 不存在。

- [ ] **Step 3: 替换 `:root` 块**

把 `src/app/globals.css` 里从 `/*` 开头那段「墨与纸」注释到 `:root { ... }` 的结束大括号整体替换为：

```css
/*
 * 信笺与邮戳：道林纸底、墨字、邮戳蓝。
 * 一个主色（--stamp），一个朱红（--postmark）只给日期章和未读。
 * 变量名继续沿用 shadcn 的约定，只换值，组件不用改。
 */
:root {
  --background: #f4f4ef;
  --foreground: #1a1b18;
  --card: #fbfbf7;
  --card-foreground: #1a1b18;
  --popover: #fbfbf7;
  --popover-foreground: #1a1b18;
  --primary: #2f4f74;
  --primary-foreground: #f7f8fb;
  --secondary: #e9e9e2;
  --secondary-foreground: #2a2b28;
  --muted: #e9e9e2;
  --muted-foreground: #6b6e67;
  --accent: #e2e6ec;
  --accent-foreground: #223a55;
  --destructive: #a83f30;
  --border: #dcdcd3;
  --input: #dcdcd3;
  --ring: #2f4f7480;
  --chart-1: #2f4f74;
  --chart-2: #a83f30;
  --chart-3: #5c7089;
  --chart-4: #7d807a;
  --chart-5: #3a3b38;
  /* 信笺的边不是圆角卡片，是裁切过的纸 */
  --radius: 0.125rem;
  --sidebar: #ecece5;
  --sidebar-foreground: #1a1b18;
  --sidebar-primary: #2f4f74;
  --sidebar-primary-foreground: #f7f8fb;
  --sidebar-accent: #e2e6ec;
  --sidebar-accent-foreground: #223a55;
  --sidebar-border: #dcdcd3;
  --sidebar-ring: #2f4f7480;

  /* 信笺与邮戳专用 */
  --stamp: #2f4f74;
  --postmark: #a83f30;
  --rule: #dcdcd3;
  --paper-raised: #fbfbf7;

  /* 旧组件还在用这个名字，别让它们断掉 */
  --vermilion: #a83f30;
}
```

- [ ] **Step 4: 替换 `.dark` 块**

```css
.dark {
  --background: #17181a;
  --foreground: #e6e6df;
  --card: #1e1f22;
  --card-foreground: #e6e6df;
  --popover: #1e1f22;
  --popover-foreground: #e6e6df;
  --primary: #8fb0d6;
  --primary-foreground: #141518;
  --secondary: #232427;
  --secondary-foreground: #e6e6df;
  --muted: #232427;
  --muted-foreground: #9a9d96;
  --accent: #232a33;
  --accent-foreground: #cfe0f2;
  --destructive: #d9776a;
  --border: #2c2d31;
  --input: #33343a;
  --ring: #8fb0d680;
  --chart-1: #8fb0d6;
  --chart-2: #d9776a;
  --chart-3: #9aa6b5;
  --chart-4: #a8b0a4;
  --chart-5: #cfd0c9;
  --sidebar: #1b1c1f;
  --sidebar-foreground: #e6e6df;
  --sidebar-primary: #8fb0d6;
  --sidebar-primary-foreground: #141518;
  --sidebar-accent: #232a33;
  --sidebar-accent-foreground: #cfe0f2;
  --sidebar-border: #2c2d31;
  --sidebar-ring: #8fb0d680;

  --stamp: #8fb0d6;
  --postmark: #d9776a;
  --rule: #2c2d31;
  --paper-raised: #1e1f22;

  --vermilion: #d9776a;
}
```

- [ ] **Step 5: 在 `@theme inline` 里加映射**

找到 `@theme inline {` 块里 `--color-vermilion: var(--vermilion);` 那一行，在它下面追加：

```css
  --color-stamp: var(--stamp);
  --color-postmark: var(--postmark);
  --color-rule: var(--rule);
  --color-paper-raised: var(--paper-raised);
```

- [ ] **Step 6: 运行测试，确认通过**

```bash
node --test scripts/tokens.test.mjs
```

预期：`pass 5`，`fail 0`。

- [ ] **Step 7: 类型检查**

```bash
npm run type-check
```

预期：无输出错误。

- [ ] **Step 8: 提交**

```bash
git add src/app/globals.css scripts/tokens.test.mjs
git commit -m "feat(design): 换成信笺与邮戳的 token，加对比度护栏"
```

---

### Task 2: 站点配置与导航

**Files:**
- Modify: `src/config/site.ts:18-58`

**Interfaces:**
- Produces: `siteConfig.name === "赵小元"`、`siteConfig.status`（首页页头那句状态话）、`siteConfig.nav` 四项（生活/书架/歌单/信箱）、`siteConfig.footerNav` 六项。

- [ ] **Step 1: 改站名、简介与状态句**

把 `siteConfig` 开头这几项替换成：

```ts
export const siteConfig = {
  name: envOr(process.env.NEXT_PUBLIC_SITE_NAME, "赵小元"),
  title: envOr(process.env.NEXT_PUBLIC_SITE_NAME, "赵小元"),
  description: "赵小元的个人空间：记录生活，收信，听歌，看书。",
  url: envOr(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"),
  /**
   * 首页页头那句状态话，是首页唯一的自我介绍。
   * 阶段 1 先写死；阶段 3 挪进数据库，由站长在管理页改。
   */
  status: "在杭州，最近在学做饭",
```

`startedAt` 以及它上面的注释保持原样，接在 `status` 后面。

- [ ] **Step 2: 改主导航**

```ts
  // 主导航只放四个真正会点的地方；其余沉到页脚。
  nav: [
    { title: "生活", href: "/" },
    { title: "书架", href: "/shelf" },
    { title: "歌单", href: "/playlist" },
    { title: "信箱", href: "/letters" },
  ],
  footerNav: [
    { title: "笔记", href: "/notes" },
    { title: "项目", href: "/projects" },
    { title: "日志", href: "/journal" },
    { title: "友链", href: "/friends" },
    { title: "关于", href: "/about" },
  ],
```

- [ ] **Step 3: 页脚只显示次级导航**

页脚现在渲染 `allNavItems`（主导航 + 次级导航），改版后会重复显示「生活 / 书架 / 歌单 / 信箱」。把 `src/components/site/footer.tsx` 里的导入和遍历改掉：

```tsx
import { siteConfig, footerNavItems } from "@/config/site";
```

```tsx
{footerNavItems.map((item) => (
```

- [ ] **Step 4: 类型检查**

```bash
npm run type-check
```

预期：通过。

- [ ] **Step 4: 提交**

```bash
git add src/config/site.ts
git commit -m "feat(config): 站名改为赵小元，导航改为生活/书架/歌单/信箱"
```

---

### Task 3: 生活流的纯函数

**Files:**
- Create: `src/lib/life.ts`
- Create: `scripts/life.test.mjs`

**Interfaces:**
- Produces:
  - `type MomentKind = "text" | "photo" | "song" | "shelf" | "quote" | "link"`
  - `interface Moment { id: string; kind: MomentKind; publishedAt: string; body: string; images?: string[]; mood?: string; weather?: string; place?: string; card?: { title: string; meta: string; note?: string; href?: string } }`
  - `interface MonthGroup { key: string; label: string; moments: Moment[] }`
  - `formatPostmark(iso: string): string` → `"11.03"`
  - `monthLabel(year: number, month: number, currentYear: number): string`
  - `groupByMonth(moments: Moment[], currentYear: number): MonthGroup[]`
  - `rotateForSeed(seed: string): number` → `-12` 到 `-8` 之间的整数

- [ ] **Step 1: 写失败的测试**

创建 `scripts/life.test.mjs`：

```js
/**
 * 生活流纯函数的单元测试。
 *   node --test scripts/life.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPostmark,
  groupByMonth,
  monthLabel,
  rotateForSeed,
} from "../src/lib/life.ts";

const moment = (id, publishedAt, kind = "text") => ({
  id,
  kind,
  publishedAt,
  body: id,
});

test("邮戳日期按北京时间换算", () => {
  // UTC 16:30 已经是北京时间次日 00:30
  assert.equal(formatPostmark("2026-11-03T16:30:00Z"), "11.04");
  assert.equal(formatPostmark("2026-11-03T23:30:00+08:00"), "11.03");
  // 个位数月日补零
  assert.equal(formatPostmark("2026-01-05T09:00:00+08:00"), "01.05");
});

test("月份名用中文，跨年时带年份", () => {
  assert.equal(monthLabel(2026, 11, 2026), "十一月");
  assert.equal(monthLabel(2025, 12, 2026), "2025 年 十二月");
});

test("按月倒序分组，同月内保持时间倒序", () => {
  const groups = groupByMonth(
    [
      moment("a", "2026-10-02T10:00:00+08:00"),
      moment("b", "2026-11-05T10:00:00+08:00"),
      moment("c", "2026-11-01T10:00:00+08:00"),
    ],
    2026
  );
  assert.deepEqual(
    groups.map((g) => g.key),
    ["2026-11", "2026-10"]
  );
  assert.deepEqual(
    groups[0].moments.map((m) => m.id),
    ["b", "c"]
  );
  assert.equal(groups[0].label, "十一月");
  assert.equal(groups[1].label, "十月");
});

test("分组不修改传入的数组", () => {
  const input = [
    moment("a", "2026-10-02T10:00:00+08:00"),
    moment("b", "2026-11-05T10:00:00+08:00"),
  ];
  groupByMonth(input, 2026);
  assert.deepEqual(
    input.map((m) => m.id),
    ["a", "b"]
  );
});

test("邮戳角度稳定且落在 -12 到 -8 之间", () => {
  const a = rotateForSeed("11.03南京西路");
  assert.equal(a, rotateForSeed("11.03南京西路"));
  for (const seed of ["", "11.03", "十二月", "阿远"]) {
    const deg = rotateForSeed(seed);
    assert.ok(deg >= -12 && deg <= -8, `${seed} 得到 ${deg}`);
  }
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
node --test scripts/life.test.mjs
```

预期：`ERR_MODULE_NOT_FOUND`，因为 `src/lib/life.ts` 还不存在。

- [ ] **Step 3: 实现 `src/lib/life.ts`**

```ts
/**
 * 生活流的纯函数：分组、日期格式、邮戳角度。
 * 刻意不依赖 React 和数据库，这样可以直接用 node --test 跑。
 */

export type MomentKind =
  | "text"
  | "photo"
  | "song"
  | "shelf"
  | "quote"
  | "link";

export interface Moment {
  id: string;
  kind: MomentKind;
  /** ISO 8601，必须带时区 */
  publishedAt: string;
  body: string;
  images?: string[];
  mood?: string;
  weather?: string;
  place?: string;
  /** 卡片形态才有 */
  card?: {
    title: string;
    meta: string;
    note?: string;
    href?: string;
  };
}

export interface MonthGroup {
  key: string;
  label: string;
  moments: Moment[];
}

const MONTHS = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

/** 全站时间一律按北京时间显示，不跟随访客时区 */
const TZ = "Asia/Shanghai";

const dateFmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parts(iso: string) {
  const p = Object.fromEntries(
    dateFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value])
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
  };
}

/** 邮戳上的日期：11.03 */
export function formatPostmark(iso: string): string {
  const { month, day } = parts(iso);
  return `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

/** 月份分隔上的字：十一月；不是今年就补上年份 */
export function monthLabel(
  year: number,
  month: number,
  currentYear: number
): string {
  const name = MONTHS[month - 1];
  return year === currentYear ? name : `${year} 年 ${name}`;
}

/**
 * 按年月倒序分组，同月内保持时间倒序。
 * 不修改传入的数组——调用方可能还要拿原数组做别的事。
 */
export function groupByMonth(
  moments: Moment[],
  currentYear: number
): MonthGroup[] {
  const sorted = [...moments].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  );

  const groups: MonthGroup[] = [];
  for (const m of sorted) {
    const { year, month } = parts(m.publishedAt);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: monthLabel(year, month, currentYear), moments: [] };
      groups.push(group);
    }
    group.moments.push(m);
  }
  return groups;
}

/**
 * 邮戳的倾斜角：同一个日期永远得到同一个角度。
 * 范围 -12°~-8°，一屏之内不会显得乱七八糟。
 */
export function rotateForSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 1000;
  }
  return -8 - (h % 5);
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
node --test scripts/life.test.mjs
```

预期：`pass 5`，`fail 0`。

- [ ] **Step 5: 提交**

```bash
git add src/lib/life.ts scripts/life.test.mjs
git commit -m "feat(life): 生活流的分组与日期纯函数"
```

---

### Task 4: 邮戳组件与三个基础类

**Files:**
- Modify: `src/app/globals.css`（在文件末尾追加）
- Create: `src/components/site/postmark.tsx`
- Create: `src/app/(site)/style/page.tsx`

**Interfaces:**
- Consumes: `rotateForSeed` from `@/lib/life`。
- Produces: `<Postmark date={string} label={string} size?: "sm" | "md" | "lg" rotate?: number className?: string />`；CSS 类 `.postmark`、`.perforated`、`.paper-sheet`。

- [ ] **Step 1: 追加基础类**

在 `src/app/globals.css` 末尾追加：

```css
/* ============ 信笺与邮戳 ============ */

/* 一张信笺。2px 圆角是裁切过的纸，不是卡片 */
.paper-sheet {
  background: var(--paper-raised);
  border: 1px solid var(--rule);
  border-radius: 2px;
}

/*
 * 邮戳：全站唯一的签名元素。
 * 尺寸和角度由行内样式传进来，这里只管形状。
 */
.postmark {
  --pm-size: 88px;
  --pm-rotate: -9deg;
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: var(--pm-size);
  height: var(--pm-size);
  border: 1.5px solid currentColor;
  border-radius: 50%;
  color: var(--postmark);
  font-family: var(--font-mono), ui-monospace, monospace;
  line-height: 1;
  transform: rotate(var(--pm-rotate));
  /* 邮戳本来就不是正的 */
  flex: none;
}

/* 内圈：双环才像戳，单环像标签 */
.postmark::before {
  content: "";
  position: absolute;
  inset: 4px;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: 0.5;
}

.postmark-date {
  font-size: calc(var(--pm-size) * 0.19);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.postmark-label {
  max-width: calc(var(--pm-size) * 0.62);
  overflow: hidden;
  font-size: calc(var(--pm-size) * 0.115);
  letter-spacing: 0.08em;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
}

/*
 * 齿孔：照片和纸条的上下边各打一排半圆缺口。
 * 用纸色圆点盖住图片边缘，比 mask 兼容性好——Safari 的 mask-composite 关键字不同。
 * 注意：它假设图片直接铺在 --background 上，放进卡片的图片不要用。
 */
.perforated {
  position: relative;
  --hole: 5px;
  --step: 14px;
}

.perforated::before,
.perforated::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: calc(var(--hole) * 2);
  background-image: radial-gradient(
    circle var(--hole) at 50% 50%,
    var(--background) 97%,
    transparent 100%
  );
  background-size: var(--step) calc(var(--hole) * 2);
  background-repeat: repeat-x;
  pointer-events: none;
}

.perforated::before {
  top: calc(var(--hole) * -1);
}

.perforated::after {
  bottom: calc(var(--hole) * -1);
}
```

- [ ] **Step 2: 写组件**

创建 `src/components/site/postmark.tsx`：

```tsx
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { rotateForSeed } from "@/lib/life";

const SIZES = { sm: 64, md: 88, lg: 112 } as const;

/**
 * 邮戳。全站只出现在四处：动态的日期、信箱的留言、月份分隔、404。
 * 日期本身另外用 <time> 输出给读屏软件，这里对辅助技术隐藏。
 */
export function Postmark({
  date,
  label,
  size = "md",
  rotate,
  className,
}: {
  date: string;
  label: string;
  size?: keyof typeof SIZES;
  rotate?: number;
  className?: string;
}) {
  const deg = rotate ?? rotateForSeed(`${date}${label}`);
  return (
    <span
      aria-hidden
      className={cn("postmark", className)}
      style={
        {
          "--pm-size": `${SIZES[size]}px`,
          "--pm-rotate": `${deg}deg`,
        } as CSSProperties
      }
    >
      <span className="postmark-date">{date}</span>
      <span className="postmark-label">{label}</span>
    </span>
  );
}
```

- [ ] **Step 3: 建样式走廊**

创建 `src/app/(site)/style/page.tsx`。这个页面只在开发时存在，用来单独看组件，不用等首页拼好。

```tsx
import { notFound } from "next/navigation";
import { Postmark } from "@/components/site/postmark";

/**
 * 样式走廊：只在开发环境存在，生产构建时直接 404。
 * 组件做完就在这里看一眼，不必等首页拼好。
 */
export default function StylePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">样式走廊</h1>

      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          邮戳
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-8">
          <Postmark date="11.03" label="南京西路" size="sm" />
          <Postmark date="11.03" label="南京西路" />
          <Postmark date="十一月" label="二〇二六" size="lg" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          信笺与齿孔
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="paper-sheet p-5">
            <p className="text-sm leading-relaxed">
              一张信笺：2px 圆角，1px 格线，纸色比页面底浅一档。
            </p>
          </div>
          <div className="perforated flex aspect-[4/3] items-center justify-center bg-secondary">
            <span className="font-mono text-[11px] text-muted-foreground">
              照片
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: 起开发服务器看效果**

```bash
npm run dev
```

打开 `http://localhost:3000/style`，确认：

- 三个邮戳都是圆形、双环、彼此倾斜角度不同；
- 邮戳在小尺寸下日期仍然读得清；
- 右侧方块的上下边缘各有一排半圆缺口，缺口颜色与页面底色一致。

- [ ] **Step 5: 类型检查与 lint**

```bash
npm run type-check && npm run lint
```

预期：都通过。

- [ ] **Step 6: 提交**

```bash
git add src/app/globals.css src/components/site/postmark.tsx "src/app/(site)/style/page.tsx"
git commit -m "feat(site): 邮戳组件、信笺与齿孔基础类"
```

---

### Task 5: 动态的三种形态

**Files:**
- Create: `src/components/life/moment.tsx`
- Create: `src/components/life/moment-text.tsx`
- Create: `src/components/life/moment-photo.tsx`
- Create: `src/components/life/moment-card.tsx`
- Modify: `src/app/(site)/style/page.tsx`（追加一组示例）

**Interfaces:**
- Consumes: `Moment`, `MomentKind`, `formatPostmark` from `@/lib/life`; `Postmark`。
- Produces: `<Moment moment={Moment} />`；三个形态组件都接收 `{ moment: Moment }`。

- [ ] **Step 1: 写纯文字短记**

创建 `src/components/life/moment-text.tsx`：

```tsx
import { formatPostmark, type Moment } from "@/lib/life";
import { Postmark } from "@/components/site/postmark";

/**
 * 纯文字短记：没有边框，只占左栏一半宽。
 * 生活流里最轻的一种形态，不能让一句话住进一张卡片。
 */
export function MomentText({ moment }: { moment: Moment }) {
  const place = moment.place ?? moment.weather ?? "日常";
  return (
    <article className="max-w-[34rem]">
      <div className="mb-3 flex items-end gap-3">
        <Postmark
          date={formatPostmark(moment.publishedAt)}
          label={place}
          size="sm"
        />
        <p className="pb-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <time dateTime={moment.publishedAt}>
            {formatPostmark(moment.publishedAt)}
          </time>
          {moment.weather && <span> · {moment.weather}</span>}
          {moment.place && <span> · {moment.place}</span>}
          {moment.mood && <span> · {moment.mood}</span>}
        </p>
      </div>
      <p className="whitespace-pre-line text-[16px] leading-[1.85]">
        {moment.body}
      </p>
    </article>
  );
}
```

- [ ] **Step 2: 写图文形态**

创建 `src/components/life/moment-photo.tsx`：

```tsx
import { formatPostmark, type Moment } from "@/lib/life";
import { Postmark } from "@/components/site/postmark";

/**
 * 图文：照片是主角，正文是图注。
 * 没有照片时画一块占位——阶段 1 的假数据没有真实图片。
 */
export function MomentPhoto({ moment }: { moment: Moment }) {
  const images = moment.images ?? [];
  return (
    <article>
      <div className="mb-3 flex items-end gap-3">
        <Postmark
          date={formatPostmark(moment.publishedAt)}
          label={moment.place ?? "照片"}
          size="sm"
        />
        <p className="pb-1 font-mono text-[11px] text-muted-foreground">
          <time dateTime={moment.publishedAt}>
            {formatPostmark(moment.publishedAt)}
          </time>
          {moment.place && <span> · {moment.place}</span>}
        </p>
      </div>

      {images.length === 0 ? (
        <div className="perforated flex aspect-[4/3] items-center justify-center bg-secondary">
          <span className="font-mono text-[11px] text-muted-foreground">
            照片
          </span>
        </div>
      ) : (
        <div
          className={
            images.length > 1 ? "grid grid-cols-2 gap-2" : undefined
          }
        >
          {images.map((src) => (
            <div
              key={src}
              className="perforated overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="block w-full"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 max-w-[34rem] text-[16px] leading-[1.85]">
        {moment.body}
      </p>
    </article>
  );
}
```

- [ ] **Step 3: 写卡片形态**

创建 `src/components/life/moment-card.tsx`：

```tsx
import { formatPostmark, type Moment, type MomentKind } from "@/lib/life";
import { Postmark } from "@/components/site/postmark";

const KIND_LABEL: Record<MomentKind, string> = {
  text: "短记",
  photo: "照片",
  song: "正在听",
  shelf: "书架",
  quote: "摘录",
  link: "链接",
};

/**
 * 卡片：只有歌单、书架、摘录、链接才配住进一个盒子。
 * 邮戳贴在右上角，压住纸边。
 */
export function MomentCard({ moment }: { moment: Moment }) {
  const card = moment.card;
  if (!card) return null;

  return (
    <article className="relative max-w-[38rem]">
      <div className="paper-sheet p-6 pr-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {KIND_LABEL[moment.kind]}
        </p>
        <h3 className="mt-3 font-heading text-[18px] font-bold leading-snug">
          {card.href ? (
            <a href={card.href} className="link-underline" rel="noreferrer noopener" target="_blank">
              {card.title}
            </a>
          ) : (
            card.title
          )}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{card.meta}</p>
        {card.note && (
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
            {card.note}
          </p>
        )}
        {moment.body && (
          <p className="mt-3 text-[15px] leading-[1.8]">{moment.body}</p>
        )}
      </div>
      <Postmark
        className="absolute right-4 top-4"
        date={formatPostmark(moment.publishedAt)}
        label={moment.place ?? KIND_LABEL[moment.kind]}
        size="sm"
      />
    </article>
  );
}
```

- [ ] **Step 4: 写分发器**

创建 `src/components/life/moment.tsx`：

```tsx
import type { Moment as MomentData } from "@/lib/life";
import { MomentText } from "./moment-text";
import { MomentPhoto } from "./moment-photo";
import { MomentCard } from "./moment-card";

/**
 * 按 kind 选形态。有 card 字段的一律走卡片，
 * 有图片的走图文，其余走短记。
 */
export function Moment({ moment }: { moment: MomentData }) {
  if (moment.card) return <MomentCard moment={moment} />;
  if (moment.kind === "photo") return <MomentPhoto moment={moment} />;
  return <MomentText moment={moment} />;
}
```

- [ ] **Step 5: 在样式走廊里加三种形态**

在 `src/app/(site)/style/page.tsx` 顶部加：

```tsx
import { Moment } from "@/components/life/moment";
```

在最后一个 `</section>` 之后、`</div>` 之前插入：

```tsx
      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          动态的三种形态
        </h2>
        <div className="mt-6 flex flex-col gap-10">
          <Moment
            moment={{
              id: "s1",
              kind: "text",
              publishedAt: "2026-11-05T21:40:00+08:00",
              body: "降温了。把阳台上的薄荷搬进屋，顺手给自己煮了碗面。",
              weather: "阴",
              place: "杭州",
              mood: "安静",
            }}
          />
          <Moment
            moment={{
              id: "s2",
              kind: "photo",
              publishedAt: "2026-11-03T16:20:00+08:00",
              body: "城南那家旧书店，二楼靠窗的位置还在。老板换了台唱片机。",
              place: "南京西路",
            }}
          />
          <Moment
            moment={{
              id: "s3",
              kind: "song",
              publishedAt: "2026-11-01T23:10:00+08:00",
              body: "十一月的第一首歌。",
              card: {
                title: "Merry Christmas Mr. Lawrence",
                meta: "坂本龍一",
                note: "每年入冬都会翻出来听一遍。",
              },
            }}
          />
        </div>
      </section>
```

- [ ] **Step 6: 看效果**

```bash
npm run dev
```

打开 `http://localhost:3000/style`，确认：

- 短记没有边框，邮戳在左上；
- 图文是 4:3 的占位块，上下有齿孔；
- 卡片是浅纸色底、2px 圆角，邮戳压在右上角且没有压到标题文字。

- [ ] **Step 7: 类型检查与 lint**

```bash
npm run type-check && npm run lint
```

- [ ] **Step 8: 提交**

```bash
git add src/components/life "src/app/(site)/style/page.tsx"
git commit -m "feat(life): 动态的短记/图文/卡片三种形态"
```

---

### Task 6: 月份分隔与「此刻」卡

**Files:**
- Create: `src/components/life/month-divider.tsx`
- Create: `src/components/life/now-card.tsx`
- Modify: `src/app/(site)/style/page.tsx`（追加示例）

**Interfaces:**
- Produces:
  - `<MonthDivider label={string} />`
  - `<NowCard song={{ title: string; artist: string }} shelf={{ type: string; title: string; meta: string }} letters={{ id: string; name: string; body: string; date: string }[]} />`

- [ ] **Step 1: 写月份分隔**

创建 `src/components/life/month-divider.tsx`：

```tsx
/**
 * 月份分隔：粘在顶部，滚动时一直告诉你现在是几月。
 * 背景必须是不透明的纸色，否则下面的内容会透上来。
 */
export function MonthDivider({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-8 flex items-baseline gap-3 bg-background px-4 py-2 sm:-mx-6 sm:px-6">
      <h2 className="font-heading text-[20px] font-bold tracking-tight">
        {label}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-rule" />
    </div>
  );
}
```

- [ ] **Step 2: 写「此刻」卡**

创建 `src/components/life/now-card.tsx`：

```tsx
import Link from "next/link";

export interface NowSong {
  title: string;
  artist: string;
}

export interface NowShelf {
  type: string;
  title: string;
  meta: string;
}

export interface NowLetter {
  id: string;
  name: string;
  body: string;
  date: string;
}

/**
 * 右栏「此刻」：这个人现在的生活切片。
 * 三块内容，多了就成了侧边栏广告。
 */
export function NowCard({
  song,
  shelf,
  letters,
  compact = false,
}: {
  song: NowSong;
  shelf: NowShelf;
  letters: NowLetter[];
  /** 手机端：只留一行正在听，高度不超过 120px */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="paper-sheet flex items-center gap-4 p-4">
        <span aria-hidden className="font-mono text-[14px] text-stamp">
          ♪
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-[15px] font-bold leading-snug">
            {song.title}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {song.artist} · 正在听
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="paper-sheet p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          此刻
        </h2>
        <p className="mt-3 font-heading text-[17px] font-bold leading-snug">
          {song.title}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">{song.artist}</p>
        <p className="mt-4 font-mono text-[11px] text-stamp">♪ 正在听</p>
      </section>

      <section className="paper-sheet p-5">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          在读
        </h2>
        <p className="mt-3 font-heading text-[15px] font-bold leading-snug">
          {shelf.title}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">{shelf.meta}</p>
      </section>

      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          最近的信
        </h2>
        <ul className="mt-3 space-y-3">
          {letters.map((letter) => (
            <li
              key={letter.id}
              className="border-b border-rule pb-3 last:border-0"
            >
              <p className="text-[13px] leading-relaxed">{letter.body}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {letter.name} · {letter.date}
              </p>
            </li>
          ))}
        </ul>
        <Link
          href="/letters"
          className="link-underline mt-4 inline-block text-[12px] text-stamp"
        >
          写一封
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: 在样式走廊里加两块**

在 `/style` 页面顶部加：

```tsx
import { MonthDivider } from "@/components/life/month-divider";
import { NowCard } from "@/components/life/now-card";
```

在最后一个 `</section>` 之后插入：

```tsx
      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          月份分隔与此刻卡
        </h2>
        <div className="mt-6 grid gap-10 sm:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <MonthDivider label="十一月" />
            <p className="text-sm text-muted-foreground">
              这一条只是为了让分隔条有东西可分隔。
            </p>
          </div>
          <NowCard
            song={{ title: "Merry Christmas Mr. Lawrence", artist: "坂本龍一" }}
            shelf={{ type: "书", title: "《城市与狗》", meta: "巴尔加斯·略萨" }}
            letters={[
              { id: "l1", name: "阿远", body: "路过，祝好。", date: "11.05" },
              { id: "l2", name: "小满", body: "这首歌我也在循环。", date: "11.02" },
            ]}
          />
        </div>
      </section>
```

- [ ] **Step 4: 看效果**

```bash
npm run dev
```

打开 `http://localhost:3000/style`，确认：

- 「此刻」两张卡片是浅纸色底，和页面底有清楚的层次；
- 「最近的信」没有卡片边框，只有细分隔线；
- 「写一封」是邮戳蓝、带下划线。

- [ ] **Step 5: 类型检查与 lint**

```bash
npm run type-check && npm run lint
```

- [ ] **Step 6: 提交**

```bash
git add src/components/life "src/app/(site)/style/page.tsx"
git commit -m "feat(life): 月份分隔与「此刻」卡"
```

---

### Task 7: 首页组装

**Files:**
- Create: `src/config/mock-moments.ts`
- Modify: `src/app/(site)/page.tsx`（整页重写）

**Interfaces:**
- Consumes: `groupByMonth`、`Moment`、`Postmark`、`Moment`、`MonthDivider`、`NowCard`。
- Produces: 首页 `http://localhost:3000/`。

- [ ] **Step 1: 写假数据**

创建 `src/config/mock-moments.ts`：

```ts
import type { Moment } from "@/lib/life";

/**
 * 阶段 1 的假数据。阶段 2 接上数据库后整份删除。
 * 时间一律带 +08:00，避免和服务端时区打架。
 */
export const mockMoments: Moment[] = [
  {
    id: "m-2026-11-05",
    kind: "text",
    publishedAt: "2026-11-05T21:40:00+08:00",
    body: "降温了。把阳台上的薄荷搬进屋，顺手给自己煮了碗面。",
    weather: "阴",
    place: "杭州",
    mood: "安静",
  },
  {
    id: "m-2026-11-03",
    kind: "photo",
    publishedAt: "2026-11-03T16:20:00+08:00",
    body: "城南那家旧书店，二楼靠窗的位置还在。老板换了台唱片机。",
    place: "南京西路",
  },
  {
    id: "m-2026-11-01",
    kind: "song",
    publishedAt: "2026-11-01T23:10:00+08:00",
    body: "十一月的第一首歌。",
    card: {
      title: "Merry Christmas Mr. Lawrence",
      meta: "坂本龍一",
      note: "每年入冬都会翻出来听一遍。",
    },
  },
  {
    id: "m-2026-10-28",
    kind: "text",
    publishedAt: "2026-10-28T09:15:00+08:00",
    body: "早起去菜场，卖豆腐的阿姨记得我不吃香菜。",
    weather: "晴",
    place: "杭州",
  },
  {
    id: "m-2026-10-24",
    kind: "shelf",
    publishedAt: "2026-10-24T22:00:00+08:00",
    body: "",
    card: {
      title: "《城市与狗》",
      meta: "巴尔加斯·略萨",
      note: "读到最后才发现，前面所有的玩笑都是为了最后那一页。",
    },
  },
  {
    id: "m-2026-10-19",
    kind: "quote",
    publishedAt: "2026-10-19T20:30:00+08:00",
    body: "",
    card: {
      title: "“把日子过成日子，而不是过成任务。”",
      meta: "摘自已忘记名字的播客",
    },
  },
];

export const mockNow = {
  song: { title: "Merry Christmas Mr. Lawrence", artist: "坂本龍一" },
  shelf: { type: "书", title: "《城市与狗》", meta: "巴尔加斯·略萨" },
  letters: [
    { id: "l1", name: "阿远", body: "路过，祝好。", date: "11.05" },
    { id: "l2", name: "小满", body: "这首歌我也在循环。", date: "11.02" },
    { id: "l3", name: "老陈", body: "旧书店叫什么名字？", date: "10.30" },
  ],
};
```

- [ ] **Step 2: 重写首页**

把 `src/app/(site)/page.tsx` 整体替换为：

```tsx
import { Fragment } from "react";
import { siteConfig } from "@/config/site";
import { mockMoments, mockNow } from "@/config/mock-moments";
import { groupByMonth } from "@/lib/life";
import { Moment } from "@/components/life/moment";
import { MonthDivider } from "@/components/life/month-divider";
import { NowCard } from "@/components/life/now-card";

/**
 * 首页 = 生活流。
 * 左栏是时间，右栏是「此刻」——访客先看到这个人在过什么生活，
 * 而不是最新一篇文章。
 *
 * 「此刻」在桌面是右栏，在手机是首条动态下面的一条横向卡：
 * 同一个组件渲染两次，用 lg 断点二选一显示，避免两套内容不同步。
 */
export default function HomePage() {
  const currentYear = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
    }).format(new Date())
  );
  const groups = groupByMonth(mockMoments, currentYear);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <header className="border-b border-rule py-10 sm:py-14">
        <h1 className="font-heading text-[28px] font-bold tracking-tight sm:text-[32px]">
          {siteConfig.name}
        </h1>
        <p className="mt-2 font-mono text-[12px] text-muted-foreground">
          {siteConfig.status}
        </p>
      </header>

      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
        <div className="min-w-0">
          {groups.map((group, groupIndex) => (
            <section key={group.key} className="mt-10 first:mt-0">
              <MonthDivider label={group.label} />
              <div className="flex flex-col gap-12">
                {group.moments.map((moment, momentIndex) => (
                  <Fragment key={moment.id}>
                    <Moment moment={moment} />
                    {groupIndex === 0 && momentIndex === 0 && (
                      <div className="lg:hidden">
                        <NowCard {...mockNow} compact />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
          <NowCard {...mockNow} />
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 看首页**

```bash
npm run dev
```

打开 `http://localhost:3000/`，确认：

- 页头是「赵小元」和状态句；
- 左栏按「十一月 / 十月」分成两组，月份条在滚动时停在顶部；
- 一屏之内至少有三种形态：短记、图文、卡片；
- 右栏「此刻」在桌面端跟随滚动，且不遮挡左栏；
- 浏览器缩到 375px 宽时，右栏消失、首条动态下面出现一条横向的「此刻」，且不出现横向滚动条。

- [ ] **Step 4: 类型检查与 lint**

```bash
npm run type-check && npm run lint
```

- [ ] **Step 5: 提交**

```bash
git add src/config/mock-moments.ts "src/app/(site)/page.tsx"
git commit -m "feat(home): 首页改为生活流 + 此刻"
```

---

### Task 8: 两套主题与三档宽度的验收

**Files:**
- Modify: 视验收结果而定（通常只改 `globals.css` 或组件里的间距）

**Interfaces:**
- Consumes: 前面所有任务。

- [ ] **Step 1: 跑完整校验**

```bash
npm run type-check && npm run lint && node scripts/check-content.mjs && node --test scripts/life.test.mjs && node --test scripts/tokens.test.mjs
```

预期：全部通过，`check-content` 报 `0 个错误`。

- [ ] **Step 2: 生产构建**

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build
```

预期：构建成功。特别注意 `/style` 不应出现在可访问路由里（它在生产构建时返回 404）。

- [ ] **Step 3: 亮色下截图三档宽度**

开发服务器上依次把视口设为 1280×800、768×1024、375×812，各截一张首页整图。逐张确认：

- 1280：左栏约 2/3，右栏 300px，右栏内容不换行溢出；
- 768：右栏不显示，首条动态下面出现横向「此刻」条，生活流是单列；
- 375：页头、动态、邮戳都不溢出，没有横向滚动条。

- [ ] **Step 4: 暗色下重复一次**

切到暗色后重复 Step 3，额外确认：

- 纸色与页面底拉得开，信笺不糊成一片；
- 邮戳的朱红在暗色下不刺眼（应接近 `#d9776a`）；
- 齿孔的缺口颜色跟着变成暗色纸底，不能出现亮色小圆点。

- [ ] **Step 5: 检查有没有违反约束**

在首页源码里搜索，确认：

```bash
grep -nE "#[0-9a-fA-F]{6}" "src/app/(site)/page.tsx" src/components/life/*.tsx src/components/site/postmark.tsx
```

预期：无输出（颜色全部来自 token）。

- [ ] **Step 6: 修正验收中发现的问题并提交**

```bash
git add -A
git commit -m "fix(home): 按两套主题三档宽度的验收结果调整间距"
```

- [ ] **Step 7: 推送分支**

```bash
git push -u origin refactor/personal-space
```

预期：分支推到远端，**不合并、不部署**。

---

## 阶段 1 之后

阶段 2–5（账号、动态发布与上传、评论与信箱、书架歌单、旧内容迁移上线）各自单独写计划，每份计划开工前重新读一遍设计文档 `docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md` 的对应章节。

阶段 1 结束时，以下内容**仍未完成**，这是预期的：

- 首页数据来自 `mock-moments.ts`，发新动态不会变化；
- `/shelf`、`/playlist`、`/letters`、`/notes`、`/journal` 仍然是旧页面或 404；
- 导航里指向新路径的链接会 404——阶段 1 只做首页，导航是提前占位。
