# 个人空间改版 · 阶段 1.5（视觉语言换成观测台）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把阶段 1 的「信笺与邮戳」整体换成「观测台」——暗色为默认，界面上每个读数和每处动效都有真实数据源，无源就显示 `NOT AVAILABLE`。

**Architecture:** 先换 token（保留 shadcn 变量名，旧名字降级为别名，页面不会中途烂掉），再把生活流从「邮戳 + 齿孔 + 卡片」改成「主脊线 + 节点色」，然后自下而上补数据层（天气、GitHub、观测条）与「此刻」面板，最后重排首页、给内页换皮、补齐五个死链。全站只有一个客户端常驻组件：页头的本地时钟。

**Tech Stack:** Next.js 16.4.3（App Router、`cacheComponents`、`use cache` + `cacheLife`）、React 19.3、Tailwind CSS 4.3.3、TypeScript、`node --test`。**不新增任何 npm 依赖。**

---

## Global Constraints

- Next.js 是 16.4.3，**写代码前先读 `node_modules/next/dist/docs/01-app/` 下对应章节**（本阶段主要看 `01-getting-started/08-caching.md`、`03-api-reference/04-functions/cacheLife.md`、`03-api-reference/04-functions/cacheTag.md`、`01-getting-started/11-css.md`）。这个版本的 API 与训练数据不同，不要凭记忆写。
- 所有注释与面向用户的文案用中文；代码标识符用英文。
- **不新增任何 npm 依赖**，图标一律用 `lucide-react` 已有项。
- 颜色只能来自 `src/app/globals.css` 里的 token，**组件里不许写死十六进制**。Tailwind 类只许用 token 映射出来的名字（`bg-panel`、`text-data`、`border-rule`…）。
- 动效只允许设计文档 §2.6 表里那六条；其余一律不加。**不许复用 `src/components/site/reveal.tsx`**——它把 `opacity: 0` 写进产物，关 JS 内容永久消失。
- 关闭 JavaScript 时，首页正文、观测条读数、脊线必须完整可见。
- 不引入 canvas、不引入 `three`、不做 WebGL。
- 本阶段在分支 `refactor/personal-space` 上做，**不要部署、不要合进 main**。
- 每个任务单独提交；每个任务结束跑 `npm run type-check` 与 `npm test`。

---

## 文件结构

**新建**

| 文件 | 职责 |
| --- | --- |
| `src/components/life/moment-meta.tsx` | 动态头部那行 mono 读数（日期 · 天气 · 地点 · 心情） |
| `src/components/life/month-tick.tsx` | 脊线上的月份刻度（替代 `month-divider.tsx`） |
| `src/components/site/observ-bar.tsx` | 观测条：五个读数 |
| `src/components/site/local-clock.tsx` | 唯一常驻客户端组件：本地时间走秒 |
| `src/components/life/now-panel.tsx` | 右栏「此刻」（替代 `now-card.tsx`） |
| `src/components/life/activity-strip.tsx` | 90 天密度格 |
| `src/components/site/not-yet-open.tsx` | 未开放页面的诚实面板 |
| `src/lib/weather.ts` | WMO 天气码 → 中文，纯函数 |
| `src/lib/weather-server.ts` | Open-Meteo 取数（`use cache`，5 分钟） |
| `src/lib/github-server.ts` | GitHub 90 天活跃度（`use cache`，1 小时） |
| `src/lib/observation.ts` | 观测条的读数聚合 |
| `src/app/(site)/shelf/page.tsx` | 书架占位 |
| `src/app/(site)/playlist/page.tsx` | 歌单占位 |
| `src/app/(site)/letters/page.tsx` | 信箱占位 |
| `scripts/weather.test.mjs` | 天气码映射与读数聚合的单元测试 |

**修改**

`src/app/globals.css`、`src/app/layout.tsx`、`src/app/(site)/page.tsx`、`src/app/(site)/style/page.tsx`、`src/components/site/navbar.tsx`、`src/components/site/footer.tsx`、`src/components/theme-toggle.tsx`、`src/components/life/moment.tsx`、`moment-text.tsx`、`moment-photo.tsx`、`moment-card.tsx`、`src/lib/life.ts`、`src/config/site.ts`、`src/app/api/github/route.ts`、`scripts/life.test.mjs`、`scripts/tokens.test.mjs`、`package.json`（`test` 脚本加一个文件）

**删除**

`src/components/site/postmark.tsx`、`src/components/life/month-divider.tsx`、`src/components/life/now-card.tsx`、`src/config/mock-moments.ts` 里的 `mockNow`（`mockMoments` 保留到阶段 2）

---

### Task 1: token 系统换成观测台

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx:48-53`
- Modify: `src/components/theme-toggle.tsx`
- Modify: `scripts/tokens.test.mjs`

**Interfaces:**
- Produces: CSS 变量 `--panel`、`--panel-2`、`--rule`、`--ok`、`--data`、`--wait`、`--alert`，以及 Tailwind 类 `bg-panel`、`bg-panel-2`、`text-ok`、`text-data`、`text-wait`、`text-alert`、`border-rule`、`bg-rule`。后续所有任务只用这些。
- 过渡期保留旧名 `--stamp`、`--postmark`、`--paper-raised`、`--vermilion` 作为**别名**（指向新 token），Task 6 删除。

- [ ] **Step 1: 先写会失败的对比度测试**

把 `scripts/tokens.test.mjs` 整个替换为：

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
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

const light = block(":root");
const dark = block(".dark");

/** 别名（var(--x)）先解析成真正的颜色，测试只认十六进制 */
function resolve(tokens, key) {
  let value = tokens[key];
  for (let i = 0; i < 5 && value?.startsWith("var("); i++) {
    value = tokens[value.slice(6, -1)];
  }
  return value;
}

const rgb = (hex) => {
  assert.match(hex, /^#[0-9a-fA-F]{6}$/, `不是六位十六进制：${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
};

const linear = (v) => {
  v /= 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** sRGB → OKLCH 彩度。用来卡「不许霓虹」。 */
function chroma(hex) {
  const [r, g, b] = rgb(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675718 * s;
  return Math.hypot(A, B);
}

const THEMES = [
  ["报表模式", light],
  ["观测台", dark],
];

test("两套主题都定义了观测台的语义 token", () => {
  for (const [name, tokens] of THEMES) {
    for (const key of [
      "background",
      "panel",
      "panel-2",
      "foreground",
      "muted-foreground",
      "rule",
      "ok",
      "data",
      "wait",
      "alert",
    ]) {
      assert.match(
        resolve(tokens, key) ?? "",
        /^#[0-9a-fA-F]{6}$/,
        `${name}主题缺少 --${key}`
      );
    }
  }
});

test("正文对最深的一层底不低于 7:1", () => {
  for (const [name, tokens] of THEMES) {
    const ratio = contrast(
      resolve(tokens, "foreground"),
      resolve(tokens, "panel-2")
    );
    assert.ok(ratio >= 7, `${name}：正文只有 ${ratio.toFixed(2)}:1`);
  }
});

test("弱字与四个语义色对最深的一层底不低于 4.5:1", () => {
  for (const [name, tokens] of THEMES) {
    for (const key of ["muted-foreground", "ok", "data", "wait", "alert"]) {
      const ratio = contrast(resolve(tokens, key), resolve(tokens, "panel-2"));
      assert.ok(
        ratio >= 4.5,
        `${name}：--${key} 只有 ${ratio.toFixed(2)}:1`
      );
    }
  }
});

test("语义色的彩度不超过 0.12（不像霓虹）", () => {
  for (const [name, tokens] of THEMES) {
    for (const key of ["ok", "data", "wait", "alert"]) {
      const c = chroma(resolve(tokens, key));
      assert.ok(c <= 0.12, `${name}：--${key} 彩度 ${c.toFixed(3)} 过高`);
    }
  }
});

test("语义色两两不同，不许一个色兼职两个状态", () => {
  for (const [name, tokens] of THEMES) {
    const colors = ["ok", "data", "wait", "alert"].map((k) =>
      resolve(tokens, k).toLowerCase()
    );
    assert.equal(new Set(colors).size, 4, `${name}：有语义色重复`);
  }
});
```

- [ ] **Step 2: 跑测试确认它失败**

```bash
npm test
```

Expected: FAIL —— `报表模式主题缺少 --panel`。

- [ ] **Step 3: 换掉 `globals.css` 的 token 块**

把 `:root { ... }` 与 `.dark { ... }` 两个块整体替换为（保留文件其余部分不动）：

```css
/*
 * 观测台：暗色是默认，界面上每个读数都有源。
 * 「报表模式」是同一块面板打印出来的样子，不是附属主题。
 * 变量名继续沿用 shadcn 的约定，只换值，组件不用改。
 */
:root {
  /* 报表模式（亮） */
  --background: #f5f5f3;
  --foreground: #12141a;
  --card: #ffffff;
  --card-foreground: #12141a;
  --popover: #ffffff;
  --popover-foreground: #12141a;
  --primary: #2b5c93;
  --primary-foreground: #f7f8fb;
  --secondary: #ecece8;
  --secondary-foreground: #12141a;
  --muted: #ecece8;
  --muted-foreground: #5a6068;
  --accent: #e4e9f1;
  --accent-foreground: #1e3f63;
  --destructive: #9e4a3b;
  --border: #d9dce1;
  --input: #d9dce1;
  --ring: #2b5c9380;
  --chart-1: #2b5c93;
  --chart-2: #2b7655;
  --chart-3: #88631d;
  --chart-4: #9e4a3b;
  --chart-5: #5a6068;
  /* 面板是切出来的，不是圆角卡片 */
  --radius: 0.125rem;
  --sidebar: #f0f0ec;
  --sidebar-foreground: #12141a;
  --sidebar-primary: #2b5c93;
  --sidebar-primary-foreground: #f7f8fb;
  --sidebar-accent: #e4e9f1;
  --sidebar-accent-foreground: #1e3f63;
  --sidebar-border: #d9dce1;
  --sidebar-ring: #2b5c9380;

  /* 观测台专用语义 */
  --panel: #ffffff;
  --panel-2: #ecece8;
  --rule: #d9dce1;
  --ok: #2b7655;
  --data: #2b5c93;
  --wait: #88631d;
  --alert: #9e4a3b;

  /* 旧名字降级为别名：Task 6 删 */
  --stamp: var(--data);
  --postmark: var(--alert);
  --paper-raised: var(--panel);
  --vermilion: var(--alert);
}

.dark {
  /* 观测台（默认） */
  --background: #0d0f12;
  --foreground: #e8eaed;
  --card: #14171c;
  --card-foreground: #e8eaed;
  --popover: #14171c;
  --popover-foreground: #e8eaed;
  --primary: #6f9bd1;
  --primary-foreground: #0d0f12;
  --secondary: #1a1e24;
  --secondary-foreground: #e8eaed;
  --muted: #1a1e24;
  --muted-foreground: #8b9099;
  --accent: #1c2530;
  --accent-foreground: #cfe0f2;
  --destructive: #c66e5c;
  --border: #262b32;
  --input: #33343a;
  --ring: #6f9bd180;
  --chart-1: #6f9bd1;
  --chart-2: #46a37a;
  --chart-3: #cea04c;
  --chart-4: #c66e5c;
  --chart-5: #8b9099;
  --sidebar: #11141a;
  --sidebar-foreground: #e8eaed;
  --sidebar-primary: #6f9bd1;
  --sidebar-primary-foreground: #0d0f12;
  --sidebar-accent: #1c2530;
  --sidebar-accent-foreground: #cfe0f2;
  --sidebar-border: #262b32;
  --sidebar-ring: #6f9bd180;

  --panel: #14171c;
  --panel-2: #1a1e24;
  --rule: #262b32;
  --ok: #46a37a;
  --data: #6f9bd1;
  --wait: #cea04c;
  --alert: #c66e5c;

  --stamp: var(--data);
  --postmark: var(--alert);
  --paper-raised: var(--panel);
  --vermilion: var(--alert);
}
```

在 `@theme inline` 块里，`--color-rule` 那一行下面补五行映射：

```css
  --color-panel: var(--panel);
  --color-panel-2: var(--panel-2);
  --color-ok: var(--ok);
  --color-data: var(--data);
  --color-wait: var(--wait);
  --color-alert: var(--alert);
```

- [ ] **Step 4: 跑测试确认通过**

```bash
npm test
```

Expected: PASS，`tokens.test.mjs` 5 个用例全绿。

- [ ] **Step 5: 默认切到观测台，浏览器主题色跟着换**

`src/app/layout.tsx` 里 `viewport` 的 themeColor 改成：

```tsx
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0f12" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f3" },
  ],
};
```

`ThemeProvider` 的 `defaultTheme` 从 `"light"` 改成 `"dark"`（`enableSystem={false}` 保持不变）。

`src/components/theme-toggle.tsx` 的 `aria-label` 改成随状态变化，让切换器自称「观测台 / 报表」：

```tsx
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "切到报表模式" : "切到观测台模式"}
      className="text-muted-foreground"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-[1.1rem]" /> : <Moon className="size-[1.1rem]" />}
    </Button>
  );
}
```

- [ ] **Step 6: 跑类型检查与构建**

```bash
npm run type-check
```

Expected: 无错误。

- [ ] **Step 7: 提交**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/theme-toggle.tsx scripts/tokens.test.mjs
git commit -m "feat(design): token 换成观测台，暗色为默认，对比度与彩度进测试"
```

---

### Task 2: 主脊线与生活流三种形态

**Files:**
- Modify: `src/lib/life.ts`
- Create: `src/components/life/moment-meta.tsx`
- Create: `src/components/life/month-tick.tsx`
- Modify: `src/components/life/moment.tsx`、`moment-text.tsx`、`moment-photo.tsx`、`moment-card.tsx`
- Modify: `src/app/globals.css`（追加脊线样式）
- Modify: `scripts/life.test.mjs`
- Delete: `src/components/site/postmark.tsx`、`src/components/life/month-divider.tsx`
- Modify: `src/app/(site)/page.tsx`（只改到能编译：先继续用旧结构，Task 5 重排）
- Modify: `src/app/(site)/style/page.tsx`（**必须改**：它 import 了要删掉的 `Postmark` 与 `MonthDivider`，不改就编译不过；完整重写在 Task 6）

**Interfaces:**
- Produces: `formatDay(iso): string`（原 `formatPostmark` 改名，输出 `11.03`）、`monthKeyOf(iso): string`（`2026-11`）、`MomentMeta`、`MonthTick({ label, count })`、`NODE_CLASS: Record<MomentKind, string>`、CSS 类 `.life-spine` / `.life-spine-fill`。
- 删除：`rotateForSeed`、`formatPostmark`、`Postmark`、`MonthDivider`。

- [ ] **Step 1: 先改测试**

`scripts/life.test.mjs` 整个替换为：

```js
/**
 * 生活流纯函数的单元测试。
 *   node --test scripts/life.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDay, groupByMonth, monthKeyOf, monthLabel } from "../src/lib/life.ts";

const moment = (id, publishedAt, kind = "text") => ({
  id,
  kind,
  publishedAt,
  body: id,
});

test("日期按北京时间换算，输出 MM.DD", () => {
  assert.equal(formatDay("2026-11-03T16:30:00Z"), "11.04");
  assert.equal(formatDay("2026-11-03T23:30:00+08:00"), "11.03");
  assert.equal(formatDay("2026-01-05T09:00:00+08:00"), "01.05");
});

test("monthKeyOf 给出分组用的年月键", () => {
  assert.equal(monthKeyOf("2026-11-03T23:30:00+08:00"), "2026-11");
  assert.equal(monthKeyOf("2026-11-01T07:30:00+08:00"), "2026-11");
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
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npm test
```

Expected: FAIL —— `formatDay is not a function`。

- [ ] **Step 3: 改 `src/lib/life.ts`**

- 把注释块第一行改成 `生活流的纯函数：分组、日期格式、年月键。`
- 删除 `rotateForSeed` 整个函数及其注释。
- `formatPostmark` 改名为 `formatDay`，注释改成 `/** 动态头部那行读数里的日期：11.03 */`。
- 在 `formatDay` 下面新增：

```ts
/** 分组用的年月键：2026-11 */
export function monthKeyOf(iso: string): string {
  const { year, month } = parts(iso);
  return `${year}-${String(month).padStart(2, "0")}`;
}
```

- `groupByMonth` 里那段手写 key 改成调用 `monthKeyOf`：

```ts
  for (const m of sorted) {
    const key = monthKeyOf(m.publishedAt);
    const { year, month } = parts(m.publishedAt);
```

- [ ] **Step 4: 跑测试确认通过**

```bash
npm test
```

Expected: PASS。

- [ ] **Step 5: 追加脊线 CSS**

在 `src/app/globals.css` 的 `@layer components` 块里，**替换掉** `.paper-sheet`、`.postmark*`、`.perforated*` 的全部规则（Task 6 才彻底删 token，这里先删类），改为：

```css
/* 主脊线：生活流的走线，也是时间轴。全站唯一的装饰性结构。 */
.life-spine {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: var(--rule);
}

.life-spine-fill {
  display: block;
  width: 1px;
  height: 100%;
  background: var(--data);
}

/*
 * 滚动时脊线自上而下描出来。
 * 关键：transform 只在支持滚动时间线的浏览器里才置零，
 * 不支持时它就是一条完整静态的线——关 JS 也看得见。
 */
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .life-spine-fill {
      transform-origin: top;
      animation: spine-draw linear both;
      animation-timeline: scroll(root block);
    }
  }
}

@keyframes spine-draw {
  from {
    transform: scaleY(0);
  }
  to {
    transform: scaleY(1);
  }
}
```

- [ ] **Step 6: 新建 `src/components/life/moment-meta.tsx`**

```tsx
import { formatDay, type Moment } from "@/lib/life";

/**
 * 动态头部那一行读数：日期 · 天气 · 地点 · 心情。
 * 等宽 + 表格数字，和观测条同一套语气。
 */
export function MomentMeta({ moment }: { moment: Moment }) {
  const rest = [moment.weather, moment.place, moment.mood].filter(
    (x): x is string => Boolean(x)
  );

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] tabular-nums text-muted-foreground">
      <time dateTime={moment.publishedAt}>
        {formatDay(moment.publishedAt)}
      </time>
      {rest.map((item) => (
        <span key={item}>
          <span aria-hidden>·</span> {item}
        </span>
      ))}
    </p>
  );
}
```

- [ ] **Step 7: 新建 `src/components/life/month-tick.tsx`，删掉 `month-divider.tsx`**

```tsx
/**
 * 脊线上的月份刻度：宋体标题 + 条数 + 一条横线。
 * 粘在顶部，滚动时一直告诉你现在是几月。
 */
export function MonthTick({ label, count }: { label: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 -ml-6 flex items-baseline gap-3 bg-background py-2 sm:-ml-8">
      <h2 className="font-heading text-[19px] font-bold tracking-tight">
        {label}
      </h2>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {count} 条
      </span>
      <span aria-hidden className="h-px flex-1 bg-rule" />
    </div>
  );
}
```

```bash
git rm src/components/life/month-divider.tsx src/components/site/postmark.tsx
```

- [ ] **Step 8: 重写三种形态**

`src/components/life/moment.tsx`：

```tsx
import type { Moment as MomentData, MomentKind } from "@/lib/life";
import { MomentText } from "./moment-text";
import { MomentPhoto } from "./moment-photo";
import { MomentCard } from "./moment-card";

/**
 * 脊线上那个节点的颜色：它表示内容类型，不表示情绪。
 * 短记最轻，所以是无彩度的；其余按语义色分配，全站唯一一处用颜色分类。
 */
export const NODE_CLASS: Record<MomentKind, string> = {
  text: "bg-muted-foreground",
  photo: "bg-data",
  song: "bg-ok",
  shelf: "bg-wait",
  quote: "bg-data",
  link: "bg-data",
};

/**
 * 分发顺序：先看 moment.card，有则走卡片；再看 kind === "photo"，是则走图文；其余一律走短记。
 */
export function Moment({ moment }: { moment: MomentData }) {
  if (moment.card) return <MomentCard moment={moment} />;
  if (moment.kind === "photo") return <MomentPhoto moment={moment} />;
  return <MomentText moment={moment} />;
}
```

`src/components/life/moment-text.tsx`：

```tsx
import type { Moment } from "@/lib/life";
import { MomentMeta } from "./moment-meta";

/**
 * 纯文字短记：没有边框，只占左栏一半宽。
 * 生活流里最轻的一种形态，不能让一句话住进一个面板。
 * 正文用宋体——硬界面里唯一的长文是软的，这个反差是故意的。
 */
export function MomentText({ moment }: { moment: Moment }) {
  return (
    <article className="max-w-[34rem]">
      <MomentMeta moment={moment} />
      <p className="mt-2 whitespace-pre-line font-heading text-[16px] leading-[1.7]">
        {moment.body}
      </p>
    </article>
  );
}
```

`src/components/life/moment-photo.tsx`：

```tsx
import type { Moment } from "@/lib/life";
import { MomentMeta } from "./moment-meta";

/**
 * 图文：照片是主角，正文是图注。
 * 照片在暗底上会显灰，所以永不降饱和、不加滤镜、不加圆角投影，只给 1px 边；
 * hover 只抬 2px 并把边染成 --data，不加深阴影（层级不靠阴影）。
 * 没有照片时画一块占位——阶段 1 的假数据没有真实图片。
 */
export function MomentPhoto({ moment }: { moment: Moment }) {
  const images = moment.images ?? [];
  return (
    <article className="max-w-[38rem]">
      <MomentMeta moment={moment} />

      {images.length === 0 ? (
        <div className="mt-3 flex aspect-[4/3] items-center justify-center border border-rule bg-panel-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            照片
          </span>
        </div>
      ) : (
        <div className={images.length > 1 ? "mt-3 grid grid-cols-2 gap-2" : "mt-3"}>
          {images.map((src) => (
            <div
              key={src}
              className="border border-rule transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-data motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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

      <p className="mt-4 max-w-[34rem] whitespace-pre-line font-heading text-[16px] leading-[1.7]">
        {moment.body}
      </p>
    </article>
  );
}
```

`src/components/life/moment-card.tsx`：

```tsx
import type { Moment, MomentKind } from "@/lib/life";
import { MomentMeta } from "./moment-meta";

const KIND_LABEL: Record<MomentKind, string> = {
  text: "短记",
  photo: "照片",
  song: "正在听",
  shelf: "书架",
  quote: "摘录",
  link: "链接",
};

/**
 * 读数卡：只有歌、书影音、摘录、链接才配住进一个面板。
 * 面板底 + 左上角类型标签，不用边框强调——脊线上的节点已经说了类型。
 */
export function MomentCard({ moment }: { moment: Moment }) {
  const card = moment.card;
  if (!card) return null;

  return (
    <article className="max-w-[38rem]">
      <MomentMeta moment={moment} />
      <div className="mt-3 border border-rule bg-panel p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {KIND_LABEL[moment.kind]}
        </p>
        <h3 className="mt-2 font-heading text-[17px] font-bold leading-snug">
          {card.href ? (
            <a
              href={card.href}
              className="link-underline"
              rel="noreferrer noopener"
              target="_blank"
            >
              {card.title}
            </a>
          ) : (
            card.title
          )}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">{card.meta}</p>
        {card.note && (
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            {card.note}
          </p>
        )}
        {moment.body && (
          <p className="mt-3 whitespace-pre-line font-heading text-[16px] leading-[1.7]">
            {moment.body}
          </p>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 9: 让首页先能编译**

`src/app/(site)/page.tsx` 里只做最小改动，让 Task 5 再重排：

1. 删掉 `MonthDivider` 的 import，改成 `import { MonthTick } from "@/components/life/month-tick";`
2. 删掉 `NowCard` 的 import 与两处用法（`<NowCard {...mockNow} compact />` 和 `<NowCard {...mockNow} />`），改成占位注释 `{/* 此刻面板在 Task 4 补上 */}`；同时把 `mockNow` 从 `@/config/mock-moments` 的 import 里去掉，只留 `mockMoments`
3. `<MonthDivider label={group.label} />` 改成 `<MonthTick label={group.label} count={group.moments.length} />`
4. 左栏整段改成下面这样——内边距加在容器上，`li` 不再加 `pl`，节点用 `left-0 -translate-x-1/2` 压在脊线上；月份刻度的 `-ml-6 sm:-ml-8` 正好抵消容器的 padding：

```tsx
        <div className="relative min-w-0 pl-6 sm:pl-8">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>

          {groups.map((group) => (
            <section key={group.key} className="mt-8 first:mt-0">
              <MonthTick label={group.label} count={group.moments.length} />
              <ul className="mt-6 flex flex-col gap-10">
                {group.moments.map((moment) => (
                  <li key={moment.id} className="relative">
                    <span
                      aria-hidden
                      className={`absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full sm:-left-8 ${NODE_CLASS[moment.kind]}`}
                    />
                    <Moment moment={moment} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
```

`NODE_CLASS` 从 `@/components/life/moment` 引入。

- [ ] **Step 10: 让样式走廊先能编译**

`src/app/(site)/style/page.tsx` 现在 import 了 `Postmark` 与 `MonthDivider`，两个文件都已删。**最小改动**（完整重写在 Task 6）：

1. 删掉 `import { Postmark } from "@/components/site/postmark";` 与 `import { MonthDivider } from "@/components/life/month-divider";`
2. 删掉「邮戳」那一整节 `<section>`（含三个 `<Postmark />`）
3. `MonthDivider label="十一月"` 改成 `<MonthTick label="十一月" count={3} />`，并 import `MonthTick`
4. `.paper-sheet` 改成 `border border-rule bg-panel`，`.perforated` 删掉，`<NowCard ...>` 那一节整节删掉（组件已删）

- [ ] **Step 11: 跑检查**

```bash
npm run type-check && npm run lint && npm test
```

Expected: 全绿。

- [ ] **Step 12: 提交**

```bash
git add -A
git commit -m "feat(life): 邮戳与齿孔换成主脊线，节点色承担内容类型"
```

---

### Task 3: 数据层与观测条

**Files:**
- Create: `src/lib/weather.ts`、`src/lib/weather-server.ts`、`src/lib/github-server.ts`、`src/lib/observation.ts`、`src/components/site/observ-bar.tsx`、`scripts/weather.test.mjs`
- Modify: `src/config/site.ts`、`src/app/api/github/route.ts`、`package.json`

**Interfaces:**
- Produces:
  - `weatherLabel(code: number): string`
  - `getWeather(): Promise<{ temperature: number; label: string } | null>`
  - `getGithubActivity(): Promise<{ days: { date: string; count: number }[]; total90: number; available: boolean }>`
  - `countThisMonth(moments, year, month): number`（在 `src/lib/life.ts`）
  - `getObservation(): Promise<Observation>`，其中 `Observation = { days: string | null; moments: number; thisMonth: number; commits90: number | null; city: string }`
  - `ObservBar({ readings }: { readings: Reading[] })`，`Reading = { label: string; value: string; unit?: string; available: boolean }`

- [ ] **Step 1: 先写纯函数的测试**

新建 `scripts/weather.test.mjs`：

```js
/**
 * 天气码映射的单元测试。
 *   node --test scripts/weather.test.mjs
 *
 * 只测 weather.ts —— 它没有任何 import，node 能直接跑。
 * 带 `@/` 别名的模块（observation.ts 等）不在这里测：
 * node --test 不解析 tsconfig 的 paths，测它们会直接报模块找不到。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { weatherLabel } from "../src/lib/weather.ts";

test("WMO 天气码翻成中文", () => {
  assert.equal(weatherLabel(0), "晴");
  assert.equal(weatherLabel(2), "多云");
  assert.equal(weatherLabel(3), "阴");
  assert.equal(weatherLabel(61), "小雨");
  assert.equal(weatherLabel(75), "大雪");
  assert.equal(weatherLabel(95), "雷雨");
});

test("没见过的天气码不许编，返回未知", () => {
  assert.equal(weatherLabel(-1), "未知");
  assert.equal(weatherLabel(1234), "未知");
});
```

`countThisMonth` 放进 `src/lib/life.ts`（它本来就没有任何 import，`node --test` 能直接跑），测试写进 `scripts/life.test.mjs`。

- [ ] **Step 2: 跑测试确认失败**

```bash
node --test scripts/weather.test.mjs
```

Expected: FAIL —— 找不到 `../src/lib/weather.ts`。

- [ ] **Step 3: 新建 `src/lib/weather.ts`**

```ts
/**
 * Open-Meteo 的 WMO 天气码 → 中文。
 * 只做映射，不做请求——这样能直接 node --test。
 */
const LABELS: Record<number, string> = {
  0: "晴",
  1: "晴间多云",
  2: "多云",
  3: "阴",
  45: "雾",
  48: "雾凇",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "毛毛雨",
  56: "冻雨",
  57: "冻雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "霰",
  80: "阵雨",
  81: "阵雨",
  82: "强阵雨",
  85: "阵雪",
  86: "强阵雪",
  95: "雷雨",
  96: "雷雨冰雹",
  99: "雷雨冰雹",
};

export function weatherLabel(code: number): string {
  return LABELS[code] ?? "未知";
}
```

- [ ] **Step 4: 在 `src/lib/life.ts` 末尾加 `countThisMonth`，并把它的测试加进 `scripts/life.test.mjs`**

`src/lib/life.ts` 末尾追加（该文件没有 import，`node --test` 能直接跑）：

```ts
/**
 * 本月条数。只按北京时间算，跨年不算。
 * 放在这里而不是 observation.ts，是因为 observation.ts 要 import 服务端模块，
 * node --test 解析不了 `@/` 别名——纯函数留在本文件才测得到。
 */
export function countThisMonth(
  moments: Pick<Moment, "publishedAt">[],
  year: number,
  month: number
): number {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  return moments.filter((m) => monthKeyOf(m.publishedAt) === key).length;
}
```

`scripts/life.test.mjs` 的 import 行改成：

```js
import {
  countThisMonth,
  formatDay,
  groupByMonth,
  monthKeyOf,
  monthLabel,
} from "../src/lib/life.ts";
```

末尾追加：

```js
test("本月条数只算当月，跨年不算", () => {
  const moments = [
    { publishedAt: "2026-11-05T21:40:00+08:00" },
    { publishedAt: "2026-11-01T09:00:00+08:00" },
    { publishedAt: "2026-10-31T23:00:00+08:00" },
    { publishedAt: "2025-11-03T09:00:00+08:00" },
  ];
  assert.equal(countThisMonth(moments, 2026, 11), 2);
  assert.equal(countThisMonth(moments, 2026, 10), 1);
  assert.equal(countThisMonth(moments, 2027, 1), 0);
});
```

- [ ] **Step 5: 跑测试确认通过**

```bash
node --test scripts/weather.test.mjs
```

Expected: PASS，2 个用例。

- [ ] **Step 6: 补服务端取数与聚合**

`src/config/site.ts` 里 `links` 之后加：

```ts
  /** 观测条的天气读数：城市写死，坐标由城市决定；不采集访客位置 */
  weather: {
    city: "杭州",
    latitude: 30.2741,
    longitude: 120.1551,
  },
```

新建 `src/lib/weather-server.ts`：

```ts
import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { weatherLabel } from "@/lib/weather";

export interface Weather {
  temperature: number;
  label: string;
}

/**
 * 当前天气。Open-Meteo 免注册、免 key。
 * 只在服务端取，客户端不直连第三方。
 *
 * 5 分钟一档：天气的变化尺度就是分钟级，没必要更勤。
 * 失败返回 null，调用方显示 NOT AVAILABLE——不许拿上一次的值冒充现在。
 */
export async function getWeather(): Promise<Weather | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  const { latitude, longitude } = siteConfig.weather;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
    `&longitude=${longitude}&current=temperature_2m,weather_code&timezone=Asia%2FShanghai`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    const temperature = data?.current?.temperature_2m;
    const code = data?.current?.weather_code;
    if (typeof temperature !== "number" || typeof code !== "number") {
      return null;
    }
    return {
      temperature: Math.round(temperature),
      label: weatherLabel(code),
    };
  } catch {
    return null;
  }
}
```

新建 `src/lib/github-server.ts`：

```ts
import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";

export interface GithubActivity {
  days: { date: string; count: number }[];
  total90: number;
  available: boolean;
}

/**
 * 最近 90 天的 GitHub 公开活跃度。
 * 和 /api/github 共用这一份逻辑：那个路由只是它的 HTTP 外壳。
 * 1 小时一档——匿名 Events API 每小时只给 60 次。
 */
export async function getGithubActivity(): Promise<GithubActivity> {
  "use cache";
  cacheLife("hours");

  const username = /github\.com\/([^/]+)/.exec(siteConfig.links.github)?.[1];
  if (!username) {
    return { days: [], total90: 0, available: false };
  }

  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=100`,
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const events: { created_at: string }[] = await res.json();
    const counts = new Map<string, number>();
    for (const event of events) {
      const day = event.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    const days: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const date = d.toISOString().slice(0, 10);
      days.push({ date, count: counts.get(date) ?? 0 });
    }

    return {
      days,
      total90: days.reduce((sum, d) => sum + d.count, 0),
      available: true,
    };
  } catch {
    return { days: [], total90: 0, available: false };
  }
}
```

`src/app/api/github/route.ts` 整个替换为外壳：

```ts
import { NextResponse } from "next/server";
import { getGithubActivity } from "@/lib/github-server";

/**
 * GET /api/github —— 最近 90 天 GitHub 公开活跃度。
 * 取数逻辑在 lib/github-server.ts，这里只负责 HTTP。
 */
export async function GET() {
  return NextResponse.json(await getGithubActivity());
}
```

新建 `src/lib/observation.ts`（`countThisMonth` 已在 Step 4 放进 `life.ts`，这里只放服务端聚合）：

```ts
import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { daysSince } from "@/lib/uptime";
import { countThisMonth } from "@/lib/life";
import { getGithubActivity } from "@/lib/github-server";
import { mockMoments } from "@/config/mock-moments";

export interface Observation {
  days: string | null;
  moments: number;
  thisMonth: number;
  commits90: number | null;
  city: string;
}

/**
 * 观测条的四条读数（天气单独 5 分钟一档，不放进这里）。
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

  return {
    days: (() => {
      const d = daysSince(siteConfig.startedAt);
      return d === null ? null : String(d);
    })(),
    moments: mockMoments.length,
    thisMonth: countThisMonth(mockMoments, year, month),
    commits90: github.available ? github.total90 : null,
    city: siteConfig.weather.city,
  };
}
```

> 注意：`getGithubActivity` 自己也有 `use cache`。嵌套缓存是允许的（见 `cacheLife.md` 的 Nested caching 一节），两层各自按自己的 profile 失效——GitHub 1 小时、观测条 1 小时，恰好对齐。

- [ ] **Step 7: 新建观测条组件**

`src/components/site/observ-bar.tsx`：

```tsx
export interface Reading {
  /** 英文标签，mono 全大写，像进口仪器 */
  label: string;
  value: string;
  /** 中文说明，可选 */
  unit?: string;
  /** 没有数据源时显示 NOT AVAILABLE，不显示 0 */
  available: boolean;
}

/**
 * 观测条：页面头部下方一整条读数。
 * 它是首页唯一的横幅，也是 --data 唯一大面积出现的地方。
 */
export function ObservBar({ readings }: { readings: Reading[] }) {
  return (
    <dl className="grid grid-cols-2 divide-rule border-b border-rule sm:grid-cols-5 sm:divide-x">
      {readings.map((r) => (
        <div key={r.label} className="px-3 py-4 first:pl-0">
          <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {r.label}
          </dt>
          <dd className="mt-1.5">
            {r.available ? (
              <span className="font-mono text-[24px] leading-none tabular-nums text-data">
                {r.value}
              </span>
            ) : (
              <span className="font-mono text-[11px] leading-none text-muted-foreground">
                NOT AVAILABLE
              </span>
            )}
            {r.unit && (
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                {r.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 8: 把新测试接进 `npm test`**

`package.json` 的 `test` 脚本改成：

```json
    "test": "node --test scripts/life.test.mjs scripts/tokens.test.mjs scripts/weather.test.mjs",
```

- [ ] **Step 9: 跑检查**

```bash
npm run type-check && npm test
```

Expected: 全绿。

- [ ] **Step 10: 提交**

```bash
git add -A
git commit -m "feat(observ): 观测条的数据层——天气、GitHub、条数，无源显示 NOT AVAILABLE"
```

---

### Task 4: 此刻面板与本地时钟

**Files:**
- Create: `src/components/site/local-clock.tsx`、`src/components/life/now-panel.tsx`、`src/components/life/activity-strip.tsx`
- Delete: `src/components/life/now-card.tsx`
- Modify: `src/config/mock-moments.ts`（删 `mockNow`）

**Interfaces:**
- Consumes: `getWeather()`、`getGithubActivity()`、`portfolio.now`。
- Produces: `LocalClock`（无 props）、`NowPanel({ weather, listening, reading, letters, updatedAt, activity })`、`ActivityStrip({ days, total })`、`NowLetter` 类型。

- [ ] **Step 1: 本地时钟（全站唯一的客户端常驻组件）**

`src/components/site/local-clock.tsx`：

```tsx
"use client";

import { useSyncExternalStore } from "react";

const fmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

/**
 * 全站唯一走秒的地方。
 *
 * 服务端快照给 --:--:-- 而不是编一个时间：没有 JS 时它诚实地表示「这里本该有个钟」。
 * 用 useSyncExternalStore 而不是 effect 里 setState，避免水合不匹配与多渲染一次。
 */
export function LocalClock() {
  const text = useSyncExternalStore(
    subscribe,
    () => fmt.format(new Date()),
    () => "--:--:--"
  );

  return (
    <span
      className="font-mono text-[22px] leading-none tabular-nums text-data sm:text-[26px]"
      suppressHydrationWarning
    >
      {text}
    </span>
  );
}
```

- [ ] **Step 2: 90 天密度格**

`src/components/life/activity-strip.tsx`：

```tsx
/**
 * 90 天密度格。一格一天，颜色深浅表示当天提交数。
 * 没有数据源时整块显示 NOT AVAILABLE——不画一排空格冒充「那天没做事」。
 */
export function ActivityStrip({
  days,
  total,
}: {
  days: { date: string; count: number }[];
  total: number;
}) {
  if (days.length === 0) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        NOT AVAILABLE
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-[3px]" aria-hidden>
        {days.map((d) => (
          <span
            key={d.date}
            className="size-[7px] rounded-[1px] bg-data"
            style={{ opacity: d.count === 0 ? 0.12 : Math.min(0.3 + d.count * 0.18, 1) }}
          />
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
        {total} 次 / 90 天
      </p>
    </div>
  );
}
```

- [ ] **Step 3: 此刻面板**

`src/components/life/now-panel.tsx`：

```tsx
import Link from "next/link";
import type { Weather } from "@/lib/weather-server";
import type { GithubActivity } from "@/lib/github-server";
import { ActivityStrip } from "./activity-strip";

export interface NowLetter {
  id: string;
  name: string;
  body: string;
  date: string;
}

/**
 * 右栏「此刻」：这个人现在的生活切片。
 *
 * 在听 / 在读来自 portfolio.ts 的 now，是站长手填的，
 * 所以旁边永远标着「手动 · 更新于」——不许伪装成抓取。
 */
export function NowPanel({
  weather,
  listening,
  reading,
  letters,
  updatedAt,
  activity,
}: {
  weather: Weather | null;
  /** portfolio.now.listening，一句话，不是「曲名 / 艺人」两段 */
  listening: string;
  /** portfolio.now.reading，按数组顺序显示 */
  reading: string[];
  letters: NowLetter[];
  updatedAt: string;
  activity: GithubActivity;
}) {
  return (
    <div className="divide-y divide-rule border-y border-rule">
      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Weather
        </h2>
        <p className="mt-2 font-mono text-[15px] tabular-nums">
          {weather ? (
            <>
              {weather.temperature}° <span className="text-muted-foreground">{weather.label}</span>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">NOT AVAILABLE</span>
          )}
        </p>
      </section>

      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Listening
        </h2>
        <p className="mt-2 font-heading text-[15px] font-bold leading-snug">
          {listening}
        </p>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          手动 · 更新于 {updatedAt.slice(5).replace("-", ".")}
        </p>
      </section>

      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Reading
        </h2>
        <ul className="mt-2 space-y-1">
          {reading.map((item) => (
            <li key={item} className="font-heading text-[15px] leading-snug">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          手动 · 更新于 {updatedAt.slice(5).replace("-", ".")}
        </p>
      </section>

      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Commits · 90D
        </h2>
        <div className="mt-2">
          <ActivityStrip days={activity.days} total={activity.total90} />
        </div>
      </section>

      <section className="py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Letters
        </h2>
        <ul className="mt-2 space-y-3">
          {letters.map((letter) => (
            <li key={letter.id} className="border-b border-rule pb-3 last:border-0 last:pb-0">
              <p className="text-[13px] leading-relaxed">{letter.body}</p>
              <p className="mt-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                {letter.name} · {letter.date}
              </p>
            </li>
          ))}
        </ul>
        <Link
          href="/letters"
          className="mt-4 inline-block border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:bg-data hover:text-background"
        >
          写一封
        </Link>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: 删掉旧组件与旧假数据**

```bash
git rm src/components/life/now-card.tsx
```

`src/config/mock-moments.ts`：删除 `mockNow` 整个导出（从 `export const mockNow = {` 到文件末尾）。`mockMoments` 保留。

- [ ] **Step 5: 跑检查**

```bash
npm run type-check && npm run lint && npm test
```

Expected: 全绿。此时首页还没用新面板（Task 5 接上），`page.tsx` 里的 `NowCard` 已在 Task 2 删掉，不会引用旧组件。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat(now): 此刻面板与本地时钟，手动填写的读数永远标明来源"
```

---

### Task 5: 首页重排

**Files:**
- Modify: `src/app/(site)/page.tsx`（整份重写）
- Modify: `docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`（§4 时钟位置一行）

**Interfaces:**
- Consumes: Task 2 的 `MonthTick`/`NODE_CLASS`/`.life-spine`，Task 3 的 `getObservation`/`getWeather`/`ObservBar`，Task 4 的 `NowPanel`/`LocalClock`。

- [ ] **Step 1: 整份重写 `src/app/(site)/page.tsx`**

```tsx
import { Fragment } from "react";
import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { mockMoments } from "@/config/mock-moments";
import { now as portfolioNow } from "@/config/portfolio";
import { groupByMonth } from "@/lib/life";
import { getObservation } from "@/lib/observation";
import { getWeather } from "@/lib/weather-server";
import { getGithubActivity } from "@/lib/github-server";
import { Moment, NODE_CLASS } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";
import { NowPanel } from "@/components/life/now-panel";
import { ObservBar } from "@/components/site/observ-bar";
import { LocalClock } from "@/components/site/local-clock";

/**
 * 当前年份。Cache Components 下预渲染期直接读时间是错误，
 * 按仓库既有做法（见 lib/uptime-server.ts）把值包进 `use cache`。
 */
async function getCurrentYear() {
  "use cache";
  cacheLife("hours");
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
    }).format(new Date())
  );
}

/**
 * 首页 = 观测台主屏。
 *
 * 左栏是生活流（一条主脊线贯穿），右栏是「此刻」。
 * 全站只有一个客户端常驻组件：页头的本地时钟。其余读数都在服务端算好。
 */
export default async function HomePage() {
  const [currentYear, observation, weather, activity] = await Promise.all([
    getCurrentYear(),
    getObservation(),
    getWeather(),
    getGithubActivity(),
  ]);

  const groups = groupByMonth(mockMoments, currentYear);

  const readings = [
    {
      label: "Days",
      value: observation.days ?? "—",
      unit: "建站",
      available: observation.days !== null,
    },
    {
      label: "Moments",
      value: String(observation.moments),
      unit: "条",
      available: true,
    },
    {
      label: "Month",
      value: String(observation.thisMonth),
      unit: "本月",
      available: true,
    },
    {
      label: "Commits",
      value: observation.commits90 === null ? "—" : String(observation.commits90),
      unit: "90 天",
      available: observation.commits90 !== null,
    },
    {
      label: "Weather",
      value: weather ? `${weather.temperature}°` : "—",
      unit: weather?.label ?? observation.city,
      available: weather !== null,
    },
  ];

  const nowPanel = (
    <NowPanel
      weather={weather}
      listening={portfolioNow.listening}
      reading={portfolioNow.reading}
      letters={[
        { id: "l1", name: "阿远", body: "路过，祝好。", date: "11.05" },
        { id: "l2", name: "小满", body: "这首歌我也在循环。", date: "11.02" },
        { id: "l3", name: "老陈", body: "旧书店叫什么名字？", date: "10.30" },
      ]}
      updatedAt={portfolioNow.updatedAt}
      activity={activity}
    />
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <header className="flex items-end justify-between gap-4 border-b border-rule py-6">
        <div className="min-w-0">
          <h1 className="font-heading text-[26px] font-bold tracking-tight">
            {siteConfig.name}
          </h1>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {siteConfig.status}
          </p>
        </div>
        <LocalClock />
      </header>

      <ObservBar readings={readings} />

      <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
        <div className="relative min-w-0 pl-6 sm:pl-8">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>

          {groups.map((group) => (
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
                    {index === 0 && (
                      <li className="lg:hidden">
                        <details className="border-y border-rule py-3">
                          <summary className="flex cursor-pointer items-baseline gap-2 font-mono text-[11px] text-muted-foreground">
                            <span className="uppercase tracking-[0.14em]">此刻</span>
                            <span className="tabular-nums">
                              {weather
                                ? `${observation.city} ${weather.temperature}° ${weather.label}`
                                : observation.city}
                            </span>
                          </summary>
                          <div className="mt-4">{nowPanel}</div>
                        </details>
                      </li>
                    )}
                  </Fragment>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
          {nowPanel}
        </aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 设计文档里改掉时钟位置那两处**

`docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md` §4 桌面图与说明：

把图里 `├ 建站 128 天 …` 上方的头部行保留，把「此刻」面板里的 `07:42` 去掉（时钟在页头），并把说明里「右栏『此刻』是全站唯一走秒的地方」改成「页头的本地时钟是全站唯一走秒的地方；右栏『此刻』不再重复放钟」。手机窄带那一行的 `07:42 ·` 也去掉。

- [ ] **Step 3: 跑检查**

```bash
npm run type-check && npm run lint && npm test
```

Expected: 全绿。

- [ ] **Step 4: 起开发服务器看一眼**

```bash
npm run dev
```

检查：观测条五个读数都在、天气有数、脊线在左缘、节点颜色按类型不同、右栏此刻面板、手机断点下窄带可展开。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat(home): 首页改为观测台主屏——观测条、主脊线、此刻面板"
```

---

### Task 6: 内页换皮、补齐死链、删旧 token

**Files:**
- Create: `src/app/(site)/shelf/page.tsx`、`playlist/page.tsx`、`letters/page.tsx`、`src/components/site/not-yet-open.tsx`
- Modify: `src/app/(site)/style/page.tsx`（整份重写）、`src/config/site.ts`、`src/components/site/navbar.tsx`、`src/components/site/footer.tsx`、`src/app/(site)/archives/page.tsx`、`src/components/blog/post-card.tsx`、`src/components/chat/chat-widget.tsx`、`src/app/globals.css`

- [ ] **Step 1: 未开放面板**

`src/components/site/not-yet-open.tsx`：

```tsx
/**
 * 还没做出来的页面。说清它将来是什么、什么时候有，
 * 比一个 404 诚实，也比「敬请期待」有用。
 */
export function NotYetOpen({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="border border-rule bg-panel p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
        Not Available
      </p>
      <h2 className="mt-3 font-heading text-[19px] font-bold">{title}</h2>
      <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      <p className="mt-4 font-mono text-[11px] text-muted-foreground">
        {phase}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 三个占位页**

`src/app/(site)/shelf/page.tsx`：

```tsx
import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = { title: "书架" };

export default function ShelfPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-[24px] font-bold">书架</h1>
      <div className="mt-8">
        <NotYetOpen
          title="书、影、音，按时间倒序"
          description="读过的书、看过的电影、反复听的专辑，每一条一句话短评。不分类，只按时间排——这是过日子，不是建数据库。"
          phase="阶段 4 上线"
        />
      </div>
    </div>
  );
}
```

`src/app/(site)/playlist/page.tsx`：

```tsx
import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = { title: "歌单" };

export default function PlaylistPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-[24px] font-bold">歌单</h1>
      <div className="mt-8">
        <NotYetOpen
          title="此刻循环、我的歌单、大家推荐的"
          description="每首歌一条推荐理由，整行跳到网易云或 QQ 音乐。你推荐的需要审核，通过之后署上你的名字。"
          phase="阶段 3–4 上线"
        />
      </div>
    </div>
  );
}
```

`src/app/(site)/letters/page.tsx`：

```tsx
import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = { title: "信箱" };

export default function LettersPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-[24px] font-bold">信箱</h1>
      <div className="mt-8">
        <NotYetOpen
          title="留言墙"
          description="写一句话，可以顺手推荐一首歌。登录后提交，站长看过了才会挂出来——不是不信任，是怕有人往墙上贴广告。"
          phase="阶段 3 上线"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 页脚两个死链改指现有页面**

`src/config/site.ts` 的 `footerNav` 改成：

```ts
  footerNav: [
    { title: "笔记", href: "/blog" },
    { title: "项目", href: "/projects" },
    { title: "日志", href: "/changelog" },
    { title: "友链", href: "/friends" },
    { title: "关于", href: "/about" },
  ],
```

- [ ] **Step 4: 删掉旧 token 与旧类**

`src/app/globals.css`：
- 删除 `--stamp`、`--postmark`、`--paper-raised`、`--vermilion` 四个变量（`:root` 与 `.dark` 各一处）。
- 删除 `@theme inline` 里的 `--color-vermilion`、`--color-stamp`、`--color-postmark`、`--color-paper-raised` 四行。
- 确认 `.paper-sheet`、`.postmark*`、`.perforated*` 在 Task 2 已删干净。

把三个旧引用换成新 token：

```tsx
// src/app/(site)/archives/page.tsx
- <span className="ml-2 font-mono text-[10px] text-vermilion">
+ <span className="ml-2 font-mono text-[10px] text-alert">

// src/components/blog/post-card.tsx
- <span className="inline-flex items-center gap-1 text-vermilion">
+ <span className="inline-flex items-center gap-1 text-alert">

// src/components/chat/chat-widget.tsx
- <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-vermilion ring-2 ring-background" />
+ <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-alert ring-2 ring-background" />
```

- [ ] **Step 5: 导航与页脚对齐到新容器与颜色**

`src/components/site/navbar.tsx`：把 `max-w-5xl` 改成 `max-w-6xl`（两处：header 内层容器；Sheet 不用改）。导航项的 active 状态从 `text-foreground underline` 改成 `text-data`：

```tsx
                  isActive(item.href)
                    ? "text-data"
                    : "text-muted-foreground hover:text-foreground"
```

`src/components/site/footer.tsx`：`max-w-5xl` 改成 `max-w-6xl`。

- [ ] **Step 6: 样式走廊重写**

`src/app/(site)/style/page.tsx` 整个替换为：

```tsx
import { notFound } from "next/navigation";
import { Moment } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";
import { ObservBar } from "@/components/site/observ-bar";
import { NotYetOpen } from "@/components/site/not-yet-open";

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
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          观测条
        </h2>
        <div className="mt-6">
          <ObservBar
            readings={[
              { label: "Days", value: "128", unit: "建站", available: true },
              { label: "Moments", value: "26", unit: "条", available: true },
              { label: "Month", value: "6", unit: "本月", available: true },
              { label: "Commits", value: "—", unit: "90 天", available: false },
              { label: "Weather", value: "17°", unit: "阴", available: true },
            ]}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          语义色
        </h2>
        <div className="mt-6 flex flex-wrap gap-6">
          {[
            ["在线 / 已完成", "bg-ok"],
            ["读数 / 链接", "bg-data"],
            ["待审 / 进行中", "bg-wait"],
            ["告警 / 未读", "bg-alert"],
          ].map(([label, cls]) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`size-3 rounded-full ${cls}`} />
              <span className="font-mono text-[11px] text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          动态的三种形态与主脊线
        </h2>
        <div className="relative mt-6 min-w-0 pl-6 sm:pl-8">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>
          <MonthTick label="十一月" count={3} />
          <ul className="mt-6 flex flex-col gap-10">
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-muted-foreground sm:-left-8" />
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
            </li>
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-data sm:-left-8" />
              <Moment
                moment={{
                  id: "s2",
                  kind: "photo",
                  publishedAt: "2026-11-03T16:20:00+08:00",
                  body: "城南那家旧书店，二楼靠窗的位置还在。老板换了台唱片机。",
                  place: "南京西路",
                }}
              />
            </li>
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-ok sm:-left-8" />
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
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          未开放面板
        </h2>
        <div className="mt-6">
          <NotYetOpen
            title="书、影、音，按时间倒序"
            description="读过的书、看过的电影、反复听的专辑，每一条一句话短评。"
            phase="阶段 4 上线"
          />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 7: 跑全量检查**

```bash
npm run type-check && npm run lint && npm test && node scripts/check-content.mjs
```

Expected: 全绿。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "feat(site): 内页换皮、补齐三个占位页、页脚死链改指现有页面"
```

---

### Task 7: 验收

**Files:** 无代码改动（发现问题回到对应任务修）

- [ ] **Step 1: 全量门禁**

```bash
npm run type-check && npm run lint && npm test && node scripts/check-content.mjs && npm run build
```

Expected: 全部通过，构建成功。

- [ ] **Step 2: 关掉 JS 看首页**

```bash
npm run dev
```

在浏览器里禁用 JavaScript 后打开 `/`，逐条确认：

- 正文、观测条四个读数（天气可能是 `NOT AVAILABLE`，取决于网络）都可见。
- 脊线是一条完整的静态线，不是半截。
- 时钟显示 `--:--:--`（这是诚实的，不是 bug）。
- 没有任何内容因为 `opacity: 0` 消失。

- [ ] **Step 3: 两套模式截图**

观测台（默认）与报表模式各截 1280×900 与 375×812 两张，放在 `.superpowers/sdd/`。逐条确认：

- 手机首屏至少两条动态。
- 375 宽无横向滚动（`document.documentElement.scrollWidth === innerWidth`）。
- 语义色只出现在节点、状态点、链接、读数和热图格上，没有大面积铺色。
- 照片区在暗底上有 1px 边，不是一块发灰的方。

- [ ] **Step 4: 读数的诚实性抽查**

在页面源码里搜 `NOT AVAILABLE`、`手动 · 更新于`，确认：

- 天气取不到时确实是 `NOT AVAILABLE`，不是 0。
- 「在听 / 在读」两处都带「手动 · 更新于」。
- 全站搜不到「在线」「心跳」「实时」这类词（除非后面真接了存活探测）。

- [ ] **Step 5: 把结论写进进度台账**

在 `.superpowers/sdd/progress.md` 末尾追加阶段 1.5 的逐任务结论与遗留项。

- [ ] **Step 6: 提交台账**

```bash
git add .superpowers/sdd/progress.md
git commit -m "docs(sdd): 阶段 1.5 完成，记录验收结论与遗留"
```

---

## 自审

**规格覆盖**：设计文档 v2 §2.2 token → Task 1；§2.3 字体 → Task 2（宋体只给站名/月份/正文）；§2.4 脊线 → Task 2；§2.5 观测条 → Task 3 + Task 5；§2.6 动效 → Task 2（脊线）、Task 4（密度格按天着色）、Task 1（无整页淡入）；§2.7 三种形态 → Task 2；§4 首页 → Task 5；§5.4 信箱 → Task 6 占位；§6.3 缓存与天气 → Task 3；§11 验收 → Task 7。§5.2/5.3 书架与歌单的真实页面属于阶段 4，本阶段只给诚实占位。

**未覆盖且有意留到后续阶段**：`/life/[id]`、`/notes`、`/journal`（阶段 2、5）；评论与审核（阶段 3）；`terminal-palette.tsx` 的去留（设计文档 §13 待定，本阶段不动）；`reveal.tsx` 在旧路由上的 `opacity: 0`（`/interview` 阶段 5 删除，本阶段不动，但首页不许用）。

**类型一致性**：`formatDay` 在 Task 2 定义、测试与组件同名使用；`monthKeyOf` 由 Task 2 定义、Task 3 的 `countThisMonth` 使用；`Weather` 由 `weather-server.ts` 导出、`NowPanel` 与首页共用；`GithubActivity` 由 `github-server.ts` 导出、`ActivityStrip` 与观测条共用。
