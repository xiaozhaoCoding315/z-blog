# Personal Dev OS 阶段 1：视觉地基与外壳 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有博客换成「复古终端 × 现代桌面」的外壳：三套预设色板、Geist Mono 标题、桌面壁纸/任务栏/启动器/系统菜单，所有内容页装进最大化应用窗口，移动端退化为主屏 + 全屏应用；不动内容与数据逻辑。

**Architecture:** 首页在阶段 2 才变成多窗口桌面，本阶段先完成 `DesktopShell`（固定壁纸 + 任务栏）与 `AppFrame`（内容页的最大化窗口）。旧页面整体搬进 `src/app/(site)/(apps)/` 路由组，由 `(apps)/layout.tsx` 统一套 `AppFrame`；原首页生活流搬到 `/life`，`/` 变成桌面主屏。预设通过 `<html data-wallpaper>` 与 `.dark` 类切换，首屏内联脚本在绘制前恢复，避免闪白。

**Tech Stack:** Next.js 16.4.3 App Router（`cacheComponents`、`instant`、`connection()`）、React 19.3 Server/Client Components、Tailwind CSS v4 `@theme inline`、next/font（Geist / Geist Mono）、Node 内置测试运行器。

## Global Constraints

- 分支：从 `refactor/personal-space` 拉出 `redesign/dev-os` 实施；验收前不合并 `main`。
- 默认预设 `night`（暗）；`paper` 是亮色；`blueprint` 是暗色。`<html>` 同时带 `class="dark"` 与 `data-wallpaper="night"`。
- 语义色 chroma ≤ 0.12；正文对比度 ≥ 7:1；muted 与语义色 ≥ 4.5:1（相对 `--window-2`）；`--primary-foreground` 对 `--phosphor` ≥ 4.5:1。
- 字体：标题/UI/读数用 Geist Mono（`font-heading` 指向 `--font-geist-mono`），正文用 Geist Sans；移除 `@fontsource-variable/noto-serif-sc`，不得再出现宋体。
- 所有数字读数加 `tabular-nums`。
- 禁止：蓝紫渐变、霓虹、粒子、扫描线、聊天气泡、AI 人形头像、假数据/假统计、满屏毛玻璃。
- 动效只动 `transform` / `opacity` / 颜色；交互 180–260ms，缓动 `cubic-bezier(0.22, 1, 0.36, 1)`；尊重 `prefers-reduced-motion`。
- 旧链接重定向保持 308（`permanent: true`），不改。
- 初始 JS 预算：外壳 ≤ 25KB gzip，全站首屏 ≤ 90KB gzip；不引入 three/canvas/拖拽库。
- 写代码前先读 `node_modules/next/dist/docs/` 对应章节（`AGENTS.md` 强制）。
- 每个任务结束必须提交；提交信息用中文 conventional commits（`feat(desktop): ...`、`refactor(desktop): ...`）。
- 测试命令：`node --test scripts/*.test.mjs` 由 `npm test` 显式列出；本阶段新增 `scripts/apps.test.mjs`。

---

## 文件结构

**新建**

| 文件 | 职责 |
|---|---|
| `src/config/apps.ts` | 应用注册表：id、标题、路径、图标、桌面/启动器可见性、阶段 |
| `src/components/desktop/icons.tsx` | 18 个 24×24 线性图标的统一出口 |
| `src/components/desktop/clock-store.ts` | 全站唯一秒级时钟（`useSyncExternalStore`） |
| `src/components/desktop/clock.tsx` | 时钟展示组件 |
| `src/components/desktop/use-desktop-settings.ts` | 预设/桌面物件偏好，localStorage `z-os:settings` |
| `src/components/desktop/wallpaper.tsx` | 壁纸、网格、鼠标光斑、视差 |
| `src/components/desktop/taskbar.tsx` | 48px 任务栏、启动器与系统菜单开关 |
| `src/components/desktop/launcher.tsx` | 应用启动器 |
| `src/components/desktop/system-menu.tsx` | 预设切换、系统链接、账号 |
| `src/components/desktop/desktop-shell.tsx` | 固定外壳 + `<noscript>` 应用清单 |
| `src/components/desktop/app-frame.tsx` | 最大化应用窗口；导出 `ScrollRootContext` |
| `src/components/desktop/desktop-home.tsx` | 桌面主屏（身份、9 个图标、提示） |
| `src/app/(site)/(apps)/layout.tsx` | 所有内容页的 `AppFrame` |
| `src/app/(site)/(apps)/life/page.tsx` | 原首页生活流 |
| `src/app/(site)/(apps)/gallery/page.tsx` | 阶段 3 的诚实占位 |
| `src/app/(site)/(apps)/snippets/page.tsx` | 阶段 3 的诚实占位 |
| `scripts/apps.test.mjs` | 应用注册表契约测试 |

**修改**

| 文件 | 改动 |
|---|---|
| `src/app/globals.css` | 三套预设 token、别名、Geist Mono 标题、桌面/窗口/任务栏样式 |
| `src/app/layout.tsx` | 首屏预设脚本、themeColor、移除 SearchAction |
| `src/app/(site)/layout.tsx` | 换成 `DesktopShell` |
| `src/app/(site)/page.tsx` | 桌面主屏（原内容移到 `/life`） |
| `src/components/site/account-menu.tsx` | 改成系统菜单里的账号区 |
| `src/components/theme-provider.tsx` | 薄封装 `useDesktopSettings` |
| `src/components/blog/reading-progress.tsx` | 使用 `useScrollRoot()` |
| `src/components/blog/toc.tsx` | IntersectionObserver 使用 `useScrollRoot()` |
| `src/app/(site)/life/[id]/page.tsx` | 返回链接指向 `/life` |
| `src/components/letters/letter-form.tsx` | action 路径加 `(apps)` |
| `src/components/life/comment-form.tsx` | action 路径加 `(apps)` |
| `src/components/playlist/song-form.tsx` | action 路径加 `(apps)` |
| `src/components/write/moment-form.tsx` | action 路径加 `(apps)` |
| `src/config/site.ts` | 删除 nav/footerNav 派生导出 |
| `src/app/sitemap.ts` | 加 `/life`、`/gallery`、`/snippets` |
| `src/app/(site)/(apps)/style/page.tsx` | 展示新 token/图标/窗口 |
| `scripts/tokens.test.mjs` | 重写为三预设校验 |
| `package.json` | 移除 Noto Serif 依赖；test 加 `apps.test.mjs` |

**移动（`git mv`，保留历史）**

`about/`、`admin/`、`friends/`、`journal/`、`letters/`、`life/`、`login/`、`notes/`、`playlist/`、`projects/`、`shelf/`、`style/`、`write/` → `src/app/(site)/(apps)/` 下。

**删除**

`src/components/site/navbar.tsx`、`footer.tsx`、`src/components/theme-toggle.tsx`、`src/components/site/reveal.tsx`、`src/components/chat/chat-widget.tsx`、`src/components/chat/open-chat-button.tsx`、`src/components/terminal/terminal-link-button.tsx`、`src/components/site/local-clock.tsx`、`src/components/terminal/terminal-palette.tsx`。

---

## 执行前

- [ ] 确认工作区干净：`git status --short` 只应看到本计划文件（如果它还未提交）。
- [ ] 从 `refactor/personal-space` 拉出实施分支：

```bash
git switch -c redesign/dev-os
```

- [ ] 按 `AGENTS.md` 要求，先读 `node_modules/next/dist/docs/` 里的 `interactive-apps.md`、`server-and-client-components.md`、`caching.md`、`instant.md`、`connection.md`、`preventing-flash-before-hydration.md`、`preserving-ui-state.md`、`css.md`、`fonts.md`、`route-groups.md`。这些文档与训练数据里的 Next.js 可能不同，不要凭记忆写。
- [ ] 本计划只覆盖阶段 1。阶段 2–4 在阶段 1 验收通过后另写计划，不要提前把窗口系统或终端塞进来。

---

### Task 1: 三套预设色板、Geist Mono 标题与桌面样式

**Files:**
- Modify: `src/app/globals.css`（从第一行到 `@theme inline { ... }` 的整块，替换 imports、`:root`、`.dark`、`@theme inline`）
- Modify: `src/app/globals.css`（末尾追加桌面样式）
- Modify: `scripts/tokens.test.mjs`（整体重写）
- Modify: `package.json`（移除字体依赖，由 `npm uninstall` 完成）

**Interfaces:**
- Produces（CSS 变量）：`--desk`、`--window`、`--window-2`、`--ink`、`--ink-dim`、`--rule`、`--phosphor`、`--ok`、`--warn`、`--danger`、`--info`、`--primary-foreground`；别名 `--background`、`--foreground`、`--card`、`--panel`、`--panel-2`、`--border`、`--primary`、`--muted-foreground`、`--data`、`--wait`、`--alert`。
- Produces（CSS 类）：`.os-shell`、`.os-main`、`.os-wallpaper*`、`.os-taskbar*`、`.os-launcher*`、`.os-system-menu`、`.os-menu-*`、`.os-desktop`、`.os-identity*`、`.os-icon*`、`.os-app-frame`、`.os-app-window`、`.os-titlebar*`、`.os-app-content`、`.os-mobile-appbar`、`.os-reading-progress`、`.os-noscript`。
- Consumes：无。

- [ ] **Step 1: 写失败的三预设 token 测试**

把 `scripts/tokens.test.mjs` 整个替换为：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing block ${selector}`);
  const end = css.indexOf("\n}", start);
  assert.notEqual(end, -1, `unterminated block ${selector}`);
  return css.slice(start, end);
}

function declarations(source) {
  const found = {};
  for (const match of source.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    found[match[1]] = match[2].trim();
  }
  return found;
}

const aliases = declarations(block(":root"));
const presets = {
  night: declarations(block(".dark")),
  paper: declarations(block('[data-wallpaper="paper"]')),
  blueprint: declarations(block('[data-wallpaper="blueprint"]')),
};

function resolve(preset, key) {
  let value = preset[key] ?? aliases[key];
  for (let hop = 0; hop < 6 && value?.startsWith("var("); hop += 1) {
    const name = value.slice(4, -1).trim().replace(/^--/, "");
    value = preset[name] ?? aliases[name];
  }
  return value;
}

function rgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function chroma(hex) {
  const [r, g, b] = rgb(hex).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.450593709 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return Math.hypot(a, bb);
}

const RAW = [
  "desk",
  "window",
  "window-2",
  "ink",
  "ink-dim",
  "rule",
  "phosphor",
  "ok",
  "warn",
  "danger",
  "info",
  "primary-foreground",
];

test("三套预设都定义原始色，且是十六进制", () => {
  for (const [name, preset] of Object.entries(presets)) {
    for (const token of RAW) {
      assert.match(preset[token] ?? "", /^#[0-9a-f]{6}$/i, `${name} missing ${token}`);
    }
  }
});

test("别名在每套预设里解析到正确的原始色", () => {
  for (const [name, preset] of Object.entries(presets)) {
    const expect = {
      background: "desk",
      foreground: "ink",
      card: "window",
      popover: "window-2",
      primary: "phosphor",
      secondary: "window-2",
      muted: "window-2",
      "muted-foreground": "ink-dim",
      accent: "window-2",
      destructive: "danger",
      border: "rule",
      input: "rule",
      panel: "window",
      "panel-2": "window-2",
      "sidebar": "window",
      "sidebar-border": "rule",
      data: "phosphor",
      wait: "warn",
      alert: "danger",
    };
    for (const [alias, raw] of Object.entries(expect)) {
      assert.equal(resolve(preset, alias), resolve(preset, raw), `${name}: --${alias}`);
    }
  }
});

test("正文对比度 ≥ 7:1", () => {
  for (const [name, preset] of Object.entries(presets)) {
    const ratio = contrast(resolve(preset, "ink"), resolve(preset, "window-2"));
    assert.ok(ratio >= 7, `${name}: ink on window-2 = ${ratio.toFixed(2)}`);
  }
});

test("muted 与语义色对比度 ≥ 4.5:1", () => {
  for (const [name, preset] of Object.entries(presets)) {
    for (const token of ["ink-dim", "phosphor", "ok", "warn", "danger"]) {
      const ratio = contrast(resolve(preset, token), resolve(preset, "window-2"));
      assert.ok(ratio >= 4.5, `${name}: ${token} = ${ratio.toFixed(2)}`);
    }
  }
});

test("所有阅读用色的 chroma ≤ 0.12", () => {
  for (const [name, preset] of Object.entries(presets)) {
    for (const token of ["ink", "ink-dim", "phosphor", "ok", "warn", "danger", "info"]) {
      assert.ok(chroma(resolve(preset, token)) <= 0.12, `${name}: ${token} too saturated`);
    }
  }
});

test("四种语义色彼此不同", () => {
  for (const [name, preset] of Object.entries(presets)) {
    const values = ["phosphor", "ok", "warn", "danger"].map((token) => resolve(preset, token));
    assert.equal(new Set(values).size, values.length, `${name}: duplicated semantic colors`);
  }
});

test("主色前景在 phosphor 上可读", () => {
  for (const [name, preset] of Object.entries(presets)) {
    const ratio = contrast(resolve(preset, "primary-foreground"), resolve(preset, "phosphor"));
    assert.ok(ratio >= 4.5, `${name}: primary-foreground = ${ratio.toFixed(2)}`);
  }
});

test("已退役的 v1 token 不再出现", () => {
  for (const retired of [
    "--paper-raised",
    "--paper-sunken",
    "--grid-line",
    "--scanline",
    "--amber",
    "--serif-display",
  ]) {
    assert.equal(css.includes(retired), false, `retired token ${retired} still present`);
  }
});

test("图表与侧栏别名齐全", () => {
  for (const token of [
    "chart-1",
    "chart-2",
    "chart-3",
    "chart-4",
    "chart-5",
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-accent",
    "sidebar-border",
    "sidebar-ring",
  ]) {
    assert.ok(aliases[token], `missing alias --${token}`);
  }
});

test("标题字体是等宽，不再加载宋体", () => {
  assert.match(block("@theme inline"), /--font-heading:\s*var\(--font-geist-mono\)/);
  assert.equal(css.includes("noto-serif"), false);
  assert.equal(css.includes("Noto Serif"), false);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test scripts/tokens.test.mjs`

Expected: FAIL。第一条报 `missing block [data-wallpaper="paper"]`，随后至少 `--font-heading` 断言失败。

- [ ] **Step 3: 替换 `globals.css` 顶部 imports、token 与 `@theme`**

把 `src/app/globals.css` 从第一行到 `@theme inline { ... }` 结束的整块（不含后面的 `@layer base`）替换为：

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

/*
 * Personal Dev OS 三套预设。
 *
 * 原始色（--desk / --window / --ink / --phosphor ...）每套预设各写一份；
 * 语义别名只在 :root 写一次，全部指向原始色。组件只认别名，
 * 换预设时只换原始色，不碰组件。
 *
 * .dark 是夜班；paper 是亮色，所以切到 paper 时必须同时移除 .dark；
 * blueprint 也是暗色，保留 .dark。blueprint 必须排在 .dark 之后。
 */
:root {
  --radius: 0.25rem;

  --background: var(--desk);
  --foreground: var(--ink);
  --card: var(--window);
  --card-foreground: var(--ink);
  --popover: var(--window-2);
  --popover-foreground: var(--ink);
  --primary: var(--phosphor);
  --secondary: var(--window-2);
  --secondary-foreground: var(--ink);
  --muted: var(--window-2);
  --muted-foreground: var(--ink-dim);
  --accent: var(--window-2);
  --accent-foreground: var(--ink);
  --destructive: var(--danger);
  --destructive-foreground: var(--ink);
  --border: var(--rule);
  --input: var(--rule);
  --ring: var(--phosphor);

  --panel: var(--window);
  --panel-2: var(--window-2);
  --data: var(--phosphor);
  --wait: var(--warn);
  --alert: var(--danger);

  --chart-1: var(--phosphor);
  --chart-2: var(--ok);
  --chart-3: var(--warn);
  --chart-4: var(--danger);
  --chart-5: var(--ink-dim);

  --sidebar: var(--window);
  --sidebar-foreground: var(--ink);
  --sidebar-primary: var(--phosphor);
  --sidebar-primary-foreground: var(--primary-foreground);
  --sidebar-accent: var(--window-2);
  --sidebar-accent-foreground: var(--ink);
  --sidebar-border: var(--rule);
  --sidebar-ring: var(--phosphor);
}

.dark {
  /* 夜班：默认 */
  --desk: #0f0e0c;
  --window: #1a1814;
  --window-2: #211e19;
  --ink: #ece6d8;
  --ink-dim: #a39a8a;
  --rule: #352f27;
  --phosphor: #d9a05b;
  --ok: #8fae86;
  --warn: #d3a35c;
  --danger: #cf8070;
  --info: #9fb3bd;
  --primary-foreground: #1a1814;
}

[data-wallpaper="paper"] {
  /* 稿纸：亮色，切到它时必须移除 .dark */
  --desk: #e7e1d5;
  --window: #f6f2e9;
  --window-2: #eee8dc;
  --ink: #1b1915;
  --ink-dim: #625c51;
  --rule: #d2cabd;
  --phosphor: #8a5a24;
  --ok: #3f6241;
  --warn: #8a5f1c;
  --danger: #9e4a3b;
  --info: #47616e;
  --primary-foreground: #f6f2e9;
}

[data-wallpaper="blueprint"] {
  /* 蓝图：暗色，保留 .dark */
  --desk: #131719;
  --window: #1a2023;
  --window-2: #21282c;
  --ink: #e4e8e6;
  --ink-dim: #98a3a1;
  --rule: #2d373a;
  --phosphor: #d9a05b;
  --ok: #87a995;
  --warn: #d0a35f;
  --danger: #c97f70;
  --info: #9fb8c4;
  --primary-foreground: #1a1814;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system,
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC",
    sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SF Mono", "Cascadia Code",
    Consolas, "PingFang SC", "Microsoft YaHei", monospace;
  /* 标题不再是宋体：整站只有 Geist Mono 一种「排版宣言」 */
  --font-heading: var(--font-geist-mono), ui-monospace, "SF Mono",
    "Cascadia Code", Consolas, "PingFang SC", "Microsoft YaHei", monospace;
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-rule: var(--rule);
  --color-panel: var(--panel);
  --color-panel-2: var(--panel-2);
  --color-ok: var(--ok);
  --color-data: var(--data);
  --color-wait: var(--wait);
  --color-alert: var(--alert);
  --color-desk: var(--desk);
  --color-window: var(--window);
  --color-window-2: var(--window-2);
  --color-ink: var(--ink);
  --color-ink-dim: var(--ink-dim);
  --color-phosphor: var(--phosphor);
  --color-warn: var(--warn);
  --color-danger: var(--danger);
  --color-info: var(--info);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}
```

同时把文件末尾的 `.life-spine-fill` 动画时间线从 `scroll(root block)` 改为 `scroll(nearest block)`，让它在窗口内部滚动容器里也能画出来：

```css
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .life-spine-fill {
      transform-origin: top;
      animation: spine-draw linear both;
      animation-timeline: scroll(nearest block);
    }
  }
}
```

- [ ] **Step 4: 在文件末尾追加桌面外壳样式**

在 `src/app/globals.css` 最后新增一个 `@layer components` 块（不要改现有 `@layer components` 内部）：

```css
/* ============ Personal Dev OS 外壳 ============ */
@layer components {
  .os-shell {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--desk);
    color: var(--ink);
  }

  .os-main {
    position: absolute;
    inset: 0 0 48px;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .os-wallpaper {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: var(--desk);
  }

  .os-wallpaper-grid {
    position: absolute;
    inset: -8px;
    background-image:
      linear-gradient(to right, var(--rule) 1px, transparent 1px),
      linear-gradient(to bottom, var(--rule) 1px, transparent 1px);
    background-size: 32px 32px;
    opacity: 0.16;
    transform: translate3d(var(--parallax-x, 0px), var(--parallax-y, 0px), 0);
  }

  .os-wallpaper-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      60% 50% at 72% 28%,
      color-mix(in srgb, var(--phosphor) 9%, transparent),
      transparent 70%
    );
  }

  .os-pointer-light {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      180px circle at var(--light-x, 72vw) var(--light-y, 28vh),
      color-mix(in srgb, var(--phosphor) 6%, transparent),
      transparent 72%
    );
  }

  .os-wallpaper-noise {
    position: absolute;
    inset: 0;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
  }

  /* ---------- 任务栏 ---------- */
  .os-taskbar {
    position: fixed;
    inset: auto 0 0;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    padding: 0 8px;
    border-top: 1px solid var(--rule);
    background: transparent;
  }

  /*
   * 模糊放在伪元素上：taskbar 本体一旦有 backdrop-filter，
   * 就会成为 fixed 子元素的包含块，启动器/系统菜单/遮罩会以 48px 任务栏为参照定位。
   */
  .os-taskbar::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background: color-mix(in srgb, var(--window) 80%, transparent);
    backdrop-filter: blur(14px);
    pointer-events: none;
  }

  @supports not (backdrop-filter: blur(1px)) {
    .os-taskbar::before {
      background: var(--window);
    }
  }

  .os-taskbar
    > :is(
      .os-launcher-button,
      .os-taskbar-menu-button,
      .os-taskbar-apps,
      .os-taskbar-right
    ) {
    position: relative;
    z-index: 2;
  }

  .os-launcher-button,
  .os-taskbar-menu-button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--rule);
    background: var(--window-2);
    color: var(--phosphor);
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 700;
    transition:
      border-color 180ms ease,
      color 180ms ease,
      background-color 180ms ease;
  }

  .os-launcher-button:hover,
  .os-taskbar-menu-button:hover {
    border-color: color-mix(in srgb, var(--phosphor) 55%, var(--rule));
    color: var(--ink);
  }

  .os-taskbar-apps {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .os-taskbar-item {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 10px;
    border: 1px solid transparent;
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    transition:
      border-color 180ms ease,
      background-color 180ms ease,
      color 180ms ease;
  }

  .os-taskbar-item:hover,
  .os-taskbar-item.is-active {
    border-color: var(--rule);
    background: var(--window-2);
    color: var(--ink);
  }

  .os-taskbar-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .os-taskbar-clock {
    padding: 0 8px;
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .os-menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 55;
    border: 0;
    background: transparent;
    cursor: default;
  }

  /* ---------- 启动器 / 系统菜单 ---------- */
  .os-launcher,
  .os-system-menu {
    position: fixed;
    bottom: 56px;
    z-index: 60;
    max-width: calc(100vw - 16px);
    border: 1px solid var(--rule);
    background: var(--window);
    box-shadow: 0 18px 44px rgb(0 0 0 / 0.28);
    animation: os-panel-in 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .os-launcher {
    left: 8px;
    width: 420px;
    padding: 12px;
  }

  .os-system-menu {
    right: 8px;
    width: 280px;
    padding: 12px;
  }

  @keyframes os-panel-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }

  .os-launcher-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .os-launcher-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    margin-top: 10px;
  }

  .os-launcher-app {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 6px;
    border: 1px solid transparent;
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    text-align: center;
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease;
  }

  .os-launcher-app:hover,
  .os-launcher-app:focus-visible {
    border-color: var(--rule);
    background: var(--window-2);
    color: var(--ink);
  }

  .os-launcher-foot {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--rule);
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 10px;
  }

  .os-launcher-foot a:hover {
    color: var(--ink);
  }

  .os-menu-label {
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .os-system-menu section + section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--rule);
  }

  .os-menu-presets {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    margin-top: 8px;
  }

  .os-menu-presets button {
    padding: 6px 4px;
    border: 1px solid var(--rule);
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease;
  }

  .os-menu-presets button[aria-pressed="true"] {
    border-color: var(--phosphor);
    background: var(--window-2);
    color: var(--ink);
  }

  .os-system-menu a,
  .os-system-menu .os-menu-link {
    display: block;
    width: 100%;
    padding: 5px 6px;
    color: var(--ink-dim);
    font-size: 12px;
    text-align: left;
    transition:
      background-color 180ms ease,
      color 180ms ease;
  }

  .os-system-menu a:hover,
  .os-system-menu .os-menu-link:hover {
    background: var(--window-2);
    color: var(--ink);
  }

  .os-menu-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  /* ---------- 桌面主屏 ---------- */
  .os-desktop {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
    padding: 30px 36px;
    overflow: hidden;
  }

  .os-identity {
    max-width: 440px;
  }

  .os-identity-name {
    color: var(--ink);
    font-family: var(--font-heading);
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .os-identity-status {
    margin-top: 6px;
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.6;
  }

  .os-desktop-hint {
    position: absolute;
    left: 36px;
    bottom: 22px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .os-icon-grid {
    display: grid;
    grid-template-columns: repeat(3, 92px);
    gap: 18px 12px;
    width: max-content;
    margin: auto 0;
    align-content: center;
  }

  .os-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 10px 4px;
    border: 1px solid transparent;
    color: var(--ink);
    text-align: center;
    animation: os-icon-in 360ms cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--i) * 30ms);
    transition:
      background-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
      border-color 220ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .os-icon:hover,
  .os-icon:focus-visible {
    border-color: var(--rule);
    background: color-mix(in srgb, var(--window-2) 70%, transparent);
    transform: translateY(-2px);
  }

  .os-icon-tile {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border: 1px solid var(--rule);
    background: var(--window);
    color: var(--phosphor);
    box-shadow:
      0 1px 0 rgb(255 255 255 / 0.03),
      0 6px 14px rgb(0 0 0 / 0.18);
    transition:
      border-color 220ms ease,
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .os-icon:hover .os-icon-tile,
  .os-icon:focus-visible .os-icon-tile {
    border-color: color-mix(in srgb, var(--phosphor) 55%, var(--rule));
    transform: translateY(-3px);
  }

  .os-icon-label {
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.4;
    transition: color 220ms ease;
  }

  .os-icon:hover .os-icon-label,
  .os-icon:focus-visible .os-icon-label {
    color: var(--ink);
  }

  @keyframes os-icon-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  /* ---------- 应用窗口 ---------- */
  .os-app-frame {
    display: flex;
    height: 100%;
    padding: 12px;
  }

  .os-app-window {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    border: 1px solid var(--rule);
    background: var(--window);
    box-shadow: 0 18px 48px rgb(0 0 0 / 0.26);
  }

  .os-titlebar {
    display: flex;
    flex: none;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 8px 0 12px;
    border-bottom: 1px solid var(--rule);
    background: var(--window-2);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .os-titlebar-back {
    padding: 4px 6px;
    color: var(--ink-dim);
    transition: color 180ms ease;
  }

  .os-titlebar-back:hover {
    color: var(--ink);
  }

  .os-titlebar-title {
    color: var(--ink);
    font-weight: 600;
  }

  .os-titlebar-path {
    color: var(--ink-dim);
  }

  .os-titlebar-controls {
    display: flex;
    gap: 2px;
    margin-left: auto;
  }

  .os-titlebar-control {
    display: grid;
    place-items: center;
    width: 28px;
    height: 24px;
    border: 1px solid transparent;
    color: var(--ink-dim);
    transition:
      background-color 180ms ease,
      border-color 180ms ease,
      color 180ms ease;
  }

  .os-titlebar-control:hover {
    border-color: var(--rule);
    background: var(--window);
    color: var(--ink);
  }

  .os-titlebar-control.is-close:hover {
    border-color: color-mix(in srgb, var(--danger) 55%, var(--rule));
    color: var(--danger);
  }

  .os-app-content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .os-mobile-appbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: none;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 14px;
    border-bottom: 1px solid var(--rule);
    background: var(--window);
    color: var(--ink-dim);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .os-mobile-appbar a {
    color: var(--phosphor);
  }

  .os-reading-progress {
    position: sticky;
    top: 0;
    z-index: 20;
    height: 2px;
    margin-bottom: -2px;
    background: var(--phosphor);
    transform: scaleX(0);
    transform-origin: left;
  }

  .os-noscript {
    position: fixed;
    inset: 0 0 48px;
    z-index: 60;
    overflow: auto;
    padding: 32px;
    background: var(--desk);
    color: var(--ink);
    font-family: var(--font-mono);
    font-size: 13px;
  }

  .os-noscript a {
    display: block;
    padding: 6px 0;
    color: var(--phosphor);
  }

  /* ---------- 专注模式 ---------- */
  html[data-focus-mode="true"] .os-taskbar {
    display: none;
  }

  html[data-focus-mode="true"] .os-main {
    inset: 0;
  }

  html[data-focus-mode="true"] .os-app-frame {
    padding: 0;
  }

  html[data-focus-mode="true"] .os-app-window {
    border: 0;
    box-shadow: none;
  }

  html[data-focus-mode="true"] .os-titlebar {
    display: none;
  }

  /* ---------- 移动端：主屏 + 全屏应用 ---------- */
  @media (max-width: 767px) {
    .os-shell {
      position: static;
      min-height: 100dvh;
      overflow: visible;
    }

    .os-main {
      position: static;
      overflow: visible;
      padding-bottom: 72px;
    }

    .os-taskbar {
      height: 56px;
    }

    .os-taskbar-apps {
      display: none;
    }

    .os-desktop {
      min-height: calc(100dvh - 72px);
      padding: 20px 16px 88px;
      overflow: visible;
    }

    .os-identity-name {
      font-size: 16px;
    }

    .os-icon-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px 8px;
      width: 100%;
      margin: 28px 0 0;
      align-content: start;
    }

    .os-icon-tile {
      width: 44px;
      height: 44px;
    }

    .os-icon {
      animation-delay: calc(var(--i) * 20ms);
    }

    .os-desktop-hint {
      display: none;
    }

    .os-launcher,
    .os-system-menu {
      right: 8px;
      left: 8px;
      width: auto;
    }

    .os-app-frame {
      height: auto;
      padding: 0;
    }

    .os-app-window {
      min-height: calc(100dvh - 72px);
      height: auto;
      border: 0;
      box-shadow: none;
    }

    .os-titlebar {
      display: none;
    }

    .os-mobile-appbar {
      display: flex;
    }

    .os-app-content {
      overflow: visible;
    }

    .os-reading-progress {
      top: 44px;
    }

    html[data-focus-mode="true"] .os-taskbar {
      display: flex;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .os-icon,
    .os-launcher,
    .os-system-menu {
      animation: none;
    }

    .os-icon:hover,
    .os-icon:hover .os-icon-tile {
      transform: none;
    }

    .os-wallpaper-grid,
    .os-pointer-light {
      display: none;
    }
  }
}
```

- [ ] **Step 5: 移除宋体依赖**

Run: `npm uninstall @fontsource-variable/noto-serif-sc`

Expected: `package.json` 依赖里不再有该包；`package-lock.json` 更新；命令退出码 0。

- [ ] **Step 6: 运行 token 测试**

Run: `node --test scripts/tokens.test.mjs`

Expected: 全部通过，输出包含 `# pass 10` 与 `# fail 0`，退出码 0。若 `primary-foreground` 对比度低于 4.5，说明把 paper 的前景写成了 `#f6f2e9` 以外的值，按 Step 3 的值改回。

- [ ] **Step 7: 提交**

```bash
git add src/app/globals.css scripts/tokens.test.mjs package.json package-lock.json
git commit -m "feat(desktop): 三套预设 token 与等宽标题字体"
```

### Task 2: 应用注册表与图标

**Files:**
- Create: `src/config/apps.ts`
- Create: `src/components/desktop/icons.tsx`
- Create: `scripts/apps.test.mjs`
- Modify: `package.json`（`scripts.test` 增加 `scripts/apps.test.mjs`）

**Interfaces:**
- Produces:
  - `type IconKey`（18 个字面量联合）
  - `interface AppDefinition { id: string; title: string; path: string | null; icon: IconKey; desktop: boolean; launcher: boolean; phase: 1 | 2 | 3 | 4; description: string }`
  - `type LinkedApp = AppDefinition & { path: string }`
  - `apps: AppDefinition[]`、`desktopApps: AppDefinition[]`、`desktopTileApps: LinkedApp[]`、`launcherApps: LinkedApp[]`、`publicApps: LinkedApp[]`
  - `findAppByPath(pathname: string): AppDefinition | undefined`
  - `AppIcon({ name, ...svgProps })`
- Consumes：无。

- [ ] **Step 1: 写失败的注册表测试**

创建 `scripts/apps.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  apps,
  desktopApps,
  desktopTileApps,
  findAppByPath,
  launcherApps,
} from "../src/config/apps.ts";

test("所有应用 id 唯一，且都有标题和描述", () => {
  assert.equal(new Set(apps.map((app) => app.id)).size, apps.length);
  for (const app of apps) {
    assert.ok(app.title.length > 0, `${app.id} missing title`);
    assert.ok(app.description.length > 0, `${app.id} missing description`);
  }
});

test("桌面图标正好 12 个，顺序是设计文档里的顺序", () => {
  assert.deepEqual(
    desktopApps.map((app) => app.id),
    [
      "terminal",
      "life",
      "gallery",
      "projects",
      "snippets",
      "about",
      "notes",
      "shelf",
      "playlist",
      "letters",
      "more",
      "assistant",
    ]
  );
});

test("阶段 1 桌面只渲染已经有路由的 9 个图标", () => {
  assert.deepEqual(
    desktopTileApps.map((app) => app.id),
    ["life", "gallery", "projects", "snippets", "about", "notes", "shelf", "playlist", "letters"]
  );
});

test("路径唯一，子路径归到父应用，桌面根路径不匹配", () => {
  const paths = apps.filter((app) => app.path).map((app) => app.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(findAppByPath("/notes/hello")?.id, "notes");
  assert.equal(findAppByPath("/life/42")?.id, "life");
  assert.equal(findAppByPath("/notes")?.id, "notes");
  assert.equal(findAppByPath("/"), undefined);
  assert.equal(findAppByPath("/unknown"), undefined);
});

test("启动器只列有路由且允许启动的应用", () => {
  assert.ok(launcherApps.length >= 10);
  for (const app of launcherApps) {
    assert.ok(app.path.startsWith("/"));
    assert.equal(app.launcher, true);
  }
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test scripts/apps.test.mjs`

Expected: FAIL，`Cannot find module ...src/config/apps.ts`（或 `ERR_MODULE_NOT_FOUND`）。

- [ ] **Step 3: 创建应用注册表**

创建 `src/config/apps.ts`：

```ts
export const ICON_KEYS = [
  "terminal",
  "life",
  "gallery",
  "projects",
  "snippets",
  "about",
  "notes",
  "shelf",
  "playlist",
  "letters",
  "more",
  "assistant",
  "journal",
  "friends",
  "settings",
  "write",
  "admin",
  "login",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export interface AppDefinition {
  id: string;
  title: string;
  path: string | null;
  icon: IconKey;
  desktop: boolean;
  launcher: boolean;
  phase: 1 | 2 | 3 | 4;
  description: string;
}

export type LinkedApp = AppDefinition & { path: string };

/**
 * 桌面和启动器的唯一数据源。
 *
 * 阶段 1 只渲染 `path !== null` 的图标；终端、更多、助理在阶段 2
 * 有了窗口之后再把 path 留空、由窗口系统接管。这样阶段 1 不会出现
 * 点不开的图标。
 */
export const apps: AppDefinition[] = [
  {
    id: "terminal",
    title: "终端",
    path: null,
    icon: "terminal",
    desktop: true,
    launcher: true,
    phase: 2,
    description: "在桌面里直接敲命令",
  },
  {
    id: "life",
    title: "每日日志",
    path: "/life",
    icon: "life",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "一条按时间走的生活流",
  },
  {
    id: "gallery",
    title: "生活胶囊",
    path: "/gallery",
    icon: "gallery",
    desktop: true,
    launcher: true,
    phase: 3,
    description: "带照片的瞬间",
  },
  {
    id: "projects",
    title: "项目看板",
    path: "/projects",
    icon: "projects",
    desktop: true,
    launcher: true,
    phase: 3,
    description: "正在做、维护中和已完成",
  },
  {
    id: "snippets",
    title: "代码片段",
    path: "/snippets",
    icon: "snippets",
    desktop: true,
    launcher: true,
    phase: 3,
    description: "这个站里真正用过的代码",
  },
  {
    id: "about",
    title: "关于本机",
    path: "/about",
    icon: "about",
    desktop: true,
    launcher: true,
    phase: 3,
    description: "站长、站点与运行时间",
  },
  {
    id: "notes",
    title: "笔记",
    path: "/notes",
    icon: "notes",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "长文与拆解",
  },
  {
    id: "shelf",
    title: "书架",
    path: "/shelf",
    icon: "shelf",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "书、影、音",
  },
  {
    id: "playlist",
    title: "歌单",
    path: "/playlist",
    icon: "playlist",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "此刻循环与访客推荐",
  },
  {
    id: "letters",
    title: "信箱",
    path: "/letters",
    icon: "letters",
    desktop: true,
    launcher: true,
    phase: 1,
    description: "公开留言与回信",
  },
  {
    id: "more",
    title: "更多",
    path: null,
    icon: "more",
    desktop: true,
    launcher: false,
    phase: 4,
    description: "友链、更新日志与站点信息",
  },
  {
    id: "assistant",
    title: "助理",
    path: null,
    icon: "assistant",
    desktop: true,
    launcher: true,
    phase: 2,
    description: "站内问答，回答带引用",
  },
  {
    id: "journal",
    title: "开发日志",
    path: "/journal",
    icon: "journal",
    desktop: false,
    launcher: true,
    phase: 1,
    description: "这个站每次改了什么",
  },
  {
    id: "friends",
    title: "友链",
    path: "/friends",
    icon: "friends",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "互相认识的人",
  },
  {
    id: "style",
    title: "样式走廊",
    path: "/style",
    icon: "settings",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "开发环境的视觉样张",
  },
  {
    id: "settings",
    title: "系统设置",
    path: null,
    icon: "settings",
    desktop: false,
    launcher: false,
    phase: 4,
    description: "预设、桌面物件与布局",
  },
  {
    id: "write",
    title: "写一条",
    path: "/write",
    icon: "write",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "发布一条生活动态",
  },
  {
    id: "admin",
    title: "管理",
    path: "/admin",
    icon: "admin",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "状态句、留言与内容审核",
  },
  {
    id: "login",
    title: "登录",
    path: "/login",
    icon: "login",
    desktop: false,
    launcher: false,
    phase: 1,
    description: "邮箱验证码登录",
  },
];

export const desktopApps = apps.filter((app) => app.desktop);

export const desktopTileApps: LinkedApp[] = apps.filter(
  (app): app is LinkedApp => app.desktop && app.path !== null
);

export const launcherApps: LinkedApp[] = apps.filter(
  (app): app is LinkedApp => app.launcher && app.path !== null
);

export const publicApps: LinkedApp[] = apps.filter(
  (app): app is LinkedApp => app.path !== null && app.launcher
);

export function findAppByPath(pathname: string): AppDefinition | undefined {
  return apps.find(
    (app) =>
      app.path !== null &&
      (pathname === app.path || pathname.startsWith(`${app.path}/`))
  );
}
```

- [ ] **Step 4: 创建图标组件**

创建 `src/components/desktop/icons.tsx`：

```tsx
import type { ReactNode, SVGProps } from "react";
import type { IconKey } from "@/config/apps";

type BaseProps = SVGProps<SVGSVGElement> & { children: ReactNode };

function Base({ children, ...props }: BaseProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

const PATHS: Record<IconKey, ReactNode> = {
  terminal: (
    <>
      <path d="m5 7 4 5-4 5" />
      <path d="M11 17h8" />
    </>
  ),
  life: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="1" />
      <path d="M7 3v3M17 3v3M3.5 9h17" />
      <path d="M7.5 13h3M13.5 13h3M7.5 16.5h3M13.5 16.5h3" />
    </>
  ),
  gallery: (
    <>
      <rect x="3.5" y="5" width="13" height="11" rx="1" />
      <path d="m7 13 2.5-3 2 2.2 1.7-2 2.8 3.3" />
      <circle cx="7.8" cy="8.4" r="1" />
      <path d="M8 19h11.5a1 1 0 0 0 1-1V8" />
    </>
  ),
  projects: (
    <>
      <rect x="3.5" y="4.5" width="5" height="15" rx="1" />
      <rect x="9.5" y="4.5" width="5" height="10" rx="1" />
      <rect x="15.5" y="4.5" width="5" height="13" rx="1" />
    </>
  ),
  snippets: (
    <>
      <path d="m8.5 8-4 4 4 4" />
      <path d="m15.5 8 4 4-4 4" />
      <path d="m13 5-2 14" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M15 3.5V8h4" />
      <path d="M8.5 12h7M8.5 15.5h7" />
    </>
  ),
  shelf: (
    <>
      <path d="M4 4.5h4v15H4zM10 4.5h4v15h-4z" />
      <path d="m16.5 5.2 3.2-.8 3 14.5-3.2.8z" />
    </>
  ),
  playlist: (
    <>
      <circle cx="7" cy="17" r="2.5" />
      <circle cx="18" cy="15" r="2.5" />
      <path d="M9.5 17V7l11-2v10" />
    </>
  ),
  letters: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  more: (
    <>
      <path d="M3.5 7.5a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
    </>
  ),
  assistant: (
    <>
      <rect x="3.5" y="5.5" width="17" height="12" rx="1" />
      <path d="m7 10 2.5 2L7 14" />
      <path d="M12 15h4" />
      <path d="M12 5.5v-2" />
    </>
  ),
  journal: (
    <>
      <path d="M5 3.5h14v17H5z" />
      <path d="M8.5 3.5v17M11.5 8h4M11.5 12h4M11.5 16h2.5" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c.5-3 2.5-5 5.5-5s5 2 5.5 5" />
      <circle cx="17" cy="10" r="2.2" />
      <path d="M15.5 19c.3-2 1.5-3.5 3.5-3.5 1.2 0 2.2.6 2.8 1.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M5.9 5.9l1.4 1.4M16.7 16.7l1.4 1.4M18.1 5.9l-1.4 1.4M7.3 16.7l-1.4 1.4" />
    </>
  ),
  write: (
    <>
      <path d="M4 20h4l11-11-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3.5 20 7v5c0 4.5-3.2 7.5-8 8.5-4.8-1-8-4-8-8.5V7z" />
      <path d="m8.5 12 2.3 2.3 4.7-5" />
    </>
  ),
  login: (
    <>
      <path d="M14 4h5v16h-5" />
      <path d="m10 8 4 4-4 4" />
      <path d="M14 12H3.5" />
    </>
  ),
};

export function AppIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconKey }) {
  return <Base {...props}>{PATHS[name]}</Base>;
}
```

- [ ] **Step 5: 把测试加进 `npm test`**

修改 `package.json` 的 `scripts.test`，在 `scripts/life.test.mjs` 前加 `scripts/apps.test.mjs`：

```json
"test": "node --test scripts/apps.test.mjs scripts/life.test.mjs scripts/tokens.test.mjs scripts/weather.test.mjs scripts/github-activity.test.mjs scripts/schema.test.mjs scripts/moment-core.test.mjs scripts/email-code.test.mjs scripts/upload-core.test.mjs scripts/moment-input.test.mjs scripts/community-input.test.mjs scripts/shelf-input.test.mjs scripts/content-slug.test.mjs"
```

- [ ] **Step 6: 运行测试**

Run: `node --test scripts/apps.test.mjs`

Expected: `# pass 5`、`# fail 0`，退出码 0。

- [ ] **Step 7: 提交**

```bash
git add src/config/apps.ts src/components/desktop/icons.tsx scripts/apps.test.mjs package.json
git commit -m "feat(desktop): 应用注册表与线性图标"
```

---

### Task 3: 预设偏好、首屏恢复与根布局

**Files:**
- Create: `src/components/desktop/use-desktop-settings.ts`
- Modify: `src/components/theme-provider.tsx`（整体替换）
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces:
  - `type DesktopPreset = "night" | "paper" | "blueprint"`
  - `interface DesktopSettings { preset: DesktopPreset; objects: boolean }`
  - `SETTINGS_KEY = "z-os:settings"`、`DEFAULT_SETTINGS`
  - `useDesktopSettings(): DesktopSettings & { setPreset(preset): void; setObjects(objects): void }`
  - `getDesktopSettings(): DesktopSettings`、`writeSettings(next): void`、`applyDesktopSettings(settings): void`
- Consumes：无。

- [ ] **Step 1: 创建桌面设置 store**

创建 `src/components/desktop/use-desktop-settings.ts`：

```ts
"use client";

import { useSyncExternalStore } from "react";

export type DesktopPreset = "night" | "paper" | "blueprint";

export interface DesktopSettings {
  preset: DesktopPreset;
  objects: boolean;
}

export const SETTINGS_KEY = "z-os:settings";

export const DEFAULT_SETTINGS: DesktopSettings = {
  preset: "night",
  objects: true,
};

const PRESETS: DesktopPreset[] = ["night", "paper", "blueprint"];
const listeners = new Set<() => void>();

let cached: DesktopSettings = DEFAULT_SETTINGS;
let cachedRaw: string | null = null;
/** localStorage 写不进去时（隐私模式）用它保证本次会话仍然生效 */
let memory: DesktopSettings | null = null;

function normalize(raw: unknown): DesktopSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const value = raw as { preset?: unknown; objects?: unknown };
  const preset = PRESETS.includes(value.preset as DesktopPreset)
    ? (value.preset as DesktopPreset)
    : DEFAULT_SETTINGS.preset;
  return {
    preset,
    objects:
      typeof value.objects === "boolean" ? value.objects : DEFAULT_SETTINGS.objects,
  };
}

function read(): DesktopSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    cached = raw ? normalize(JSON.parse(raw)) : DEFAULT_SETTINGS;
    return cached;
  } catch {
    cached = DEFAULT_SETTINGS;
    return cached;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SETTINGS_KEY) {
      memory = null;
      cachedRaw = null;
      read();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getDesktopSettings(): DesktopSettings {
  return read();
}

export function applyDesktopSettings(settings: DesktopSettings) {
  const root = document.documentElement;
  root.dataset.wallpaper = settings.preset;
  // paper 是亮色，必须移除 .dark；另两套是暗色
  root.classList.toggle("dark", settings.preset !== "paper");
  root.dataset.deskObjects = settings.objects ? "on" : "off";
  root.style.colorScheme = settings.preset === "paper" ? "light" : "dark";
}

export function writeSettings(next: DesktopSettings) {
  cached = normalize(next);
  cachedRaw = JSON.stringify(cached);
  try {
    window.localStorage.setItem(SETTINGS_KEY, cachedRaw);
    memory = null;
  } catch {
    // 隐私模式下写不进去：放进内存，本次会话仍然生效
    memory = cached;
  }
  applyDesktopSettings(cached);
  emit();
}

export function useDesktopSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    read,
    () => DEFAULT_SETTINGS
  );

  return {
    ...settings,
    setPreset(preset: DesktopPreset) {
      writeSettings({ ...settings, preset });
    },
    setObjects(objects: boolean) {
      writeSettings({ ...settings, objects });
    },
  };
}
```

- [ ] **Step 2: 替换 ThemeProvider**

把 `src/components/theme-provider.tsx` 整体替换为：

```tsx
"use client";

import { useLayoutEffect, type ReactNode } from "react";
import {
  applyDesktopSettings,
  getDesktopSettings,
  useDesktopSettings,
} from "@/components/desktop/use-desktop-settings";

/**
 * 首屏恢复是 root layout 里的内联脚本干的。
 * 这里只负责两件事：
 * 1. 客户端状态变化时重新套用（切换预设）；
 * 2. 开发环境 StrictMode 清掉 html 属性后，用真实存储值再套一次。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useDesktopSettings();

  useLayoutEffect(() => {
    applyDesktopSettings(getDesktopSettings());
  }, [settings.preset, settings.objects]);

  return <>{children}</>;
}
```

- [ ] **Step 3: 修改根布局**

把 `src/app/layout.tsx` 的 `viewport`、`jsonLd` 和 `<html>/<body>` 返回部分改为：

```tsx
export const viewport: Viewport = {
  themeColor: "#0f0e0c",
};

const PRESET_SCRIPT = `(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("z-os:settings") || "{}");
    const preset = saved.preset === "paper" || saved.preset === "blueprint" ? saved.preset : "night";
    const root = document.documentElement;
    root.dataset.wallpaper = preset;
    root.classList.toggle("dark", preset !== "paper");
    root.dataset.deskObjects = saved.objects === false ? "off" : "on";
    root.style.colorScheme = preset === "paper" ? "light" : "dark";
  } catch {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  // 站点级结构化数据：让搜索引擎知道这是一个人在持续维护的个人空间
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    inLanguage: "zh-CN",
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.url,
      sameAs: [siteConfig.links.github],
    },
  };

  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-wallpaper="night"
      className={cn(
        // 夜班是默认：把 dark 写进服务端 HTML，关掉 JS 也还是夜班
        "dark h-full antialiased",
        geistSans.variable,
        geistMono.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRESET_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
```

同时删除 `metadata` 里的 `potentialAction`（SearchAction）：它指向 `/notes?q=...`，而笔记页此时并不消费 `q`，留着是假承诺。保留 `alternates` 的 RSS 发现。

- [ ] **Step 4: 类型检查**

Run: `npm run type-check`

Expected: `tsc` 无输出，退出码 0。若报 `LayoutProps` 未定义，先运行 `npx next typegen` 再重试。

- [ ] **Step 5: 手动验证首屏恢复**

Run: `npm run dev`，打开 `http://localhost:3000`，在浏览器控制台执行：

```js
localStorage.setItem("z-os:settings", JSON.stringify({ preset: "paper", objects: true }));
location.reload();
```

Expected: 刷新后页面立即是稿纸亮色，没有先亮后暗的闪烁；`document.documentElement.dataset.wallpaper === "paper"`，且 `classList.contains("dark") === false`。再执行：

```js
localStorage.setItem("z-os:settings", JSON.stringify({ preset: "blueprint", objects: true }));
location.reload();
```

Expected: 蓝图暗色，`classList.contains("dark") === true`。

- [ ] **Step 6: 提交**

```bash
git add src/components/desktop/use-desktop-settings.ts src/components/theme-provider.tsx src/app/layout.tsx
git commit -m "feat(desktop): 预设偏好与首屏恢复"
```

### Task 4: 壁纸、时钟、任务栏、启动器、系统菜单与桌面外壳

**Files:**
- Create: `src/components/desktop/wallpaper.tsx`
- Create: `src/components/desktop/clock-store.ts`
- Create: `src/components/desktop/clock.tsx`
- Create: `src/components/desktop/taskbar.tsx`
- Create: `src/components/desktop/launcher.tsx`
- Create: `src/components/desktop/system-menu.tsx`
- Create: `src/components/desktop/desktop-shell.tsx`
- Modify: `src/app/(site)/layout.tsx`（整体替换）
- Modify: `src/components/site/account-menu.tsx`（整体替换）
- Modify: `src/app/globals.css`（末尾追加 `body` 桌面滚动锁定）

**Interfaces:**
- Consumes：`apps`、`launcherApps`、`findAppByPath`、`AppIcon`、`useDesktopSettings`、`DesktopPreset`、`siteConfig`。
- Produces：
  - `Wallpaper()`、`Clock({ withSeconds?, className? })`、`useClockSeconds(): number`、`formatClock(ms, withSeconds?)`
  - `Taskbar({ accountMenu: ReactNode; hasFriends: boolean })`
  - `Launcher({ apps: LinkedApp[]; onNavigate(): void })`
  - `SystemMenu({ onClose(): void; accountMenu: ReactNode; hasFriends: boolean })`
  - `DesktopShell({ accountMenu: ReactNode; hasFriends: boolean; children: ReactNode })`

- [ ] **Step 1: 创建壁纸组件**

创建 `src/components/desktop/wallpaper.tsx`：

```tsx
"use client";

import { useEffect, useRef } from "react";

/**
 * 壁纸上的光斑只跟鼠标，不自己跑。
 * 指针停下来后动画就停，静止页面不烧 CPU。
 */
export function Wallpaper() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const light = lightRef.current;
    if (!root || !light) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    let x = window.innerWidth * 0.72;
    let y = window.innerHeight * 0.28;
    let targetX = x;
    let targetY = y;
    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      x += (targetX - x) * Math.min(1, dt / 160);
      y += (targetY - y) * Math.min(1, dt / 160);
      light.style.setProperty("--light-x", `${x.toFixed(1)}px`);
      light.style.setProperty("--light-y", `${y.toFixed(1)}px`);
      const dx = (x / window.innerWidth - 0.5) * 4;
      const dy = (y / window.innerHeight - 0.5) * 4;
      root.style.setProperty("--parallax-x", `${dx.toFixed(2)}px`);
      root.style.setProperty("--parallax-y", `${dy.toFixed(2)}px`);
      const settled = Math.abs(targetX - x) < 0.5 && Math.abs(targetY - y) < 0.5;
      frame = settled ? 0 : requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="os-wallpaper" aria-hidden="true">
      <div className="os-wallpaper-grid" />
      <div className="os-wallpaper-glow" />
      <div ref={lightRef} className="os-pointer-light" />
      <div className="os-wallpaper-noise" />
    </div>
  );
}
```

- [ ] **Step 2: 创建时钟 store 与展示组件**

创建 `src/components/desktop/clock-store.ts`：

```ts
"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let current = 0;

function tick() {
  const next = Math.floor(Date.now() / 1000) * 1000;
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    current = Math.floor(Date.now() / 1000) * 1000;
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const longFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const shortFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatClock(ms: number, withSeconds = true) {
  if (!ms) return withSeconds ? "--:--:--" : "--:--";
  return (withSeconds ? longFormat : shortFormat).format(new Date(ms));
}

/** 全站共用一个秒级心跳；任务栏和生活流时钟读同一个值。 */
export function useClockSeconds() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => 0
  );
}
```

创建 `src/components/desktop/clock.tsx`：

```tsx
"use client";

import { formatClock, useClockSeconds } from "./clock-store";

export function Clock({
  withSeconds = true,
  className,
}: {
  withSeconds?: boolean;
  className?: string;
}) {
  const ms = useClockSeconds();
  return (
    <time
      className={className}
      dateTime={ms ? new Date(ms).toISOString() : undefined}
      suppressHydrationWarning
    >
      {formatClock(ms, withSeconds)}
    </time>
  );
}
```

- [ ] **Step 3: 创建启动器**

创建 `src/components/desktop/launcher.tsx`：

```tsx
"use client";

import Link from "next/link";
import type { LinkedApp } from "@/config/apps";
import { AppIcon } from "./icons";

export function Launcher({
  apps,
  onNavigate,
}: {
  apps: LinkedApp[];
  onNavigate: () => void;
}) {
  return (
    <div className="os-launcher" role="dialog" aria-label="全部应用">
      <div className="os-launcher-head">
        <span>应用</span>
        <span>{apps.length} 个</span>
      </div>
      <div className="os-launcher-grid">
        {apps.map((app) => (
          <Link
            key={app.id}
            href={app.path}
            onClick={onNavigate}
            className="os-launcher-app"
            title={app.description}
          >
            <AppIcon name={app.icon} className="size-5" />
            <span>{app.title}</span>
          </Link>
        ))}
      </div>
      <div className="os-launcher-foot">
        <Link href="/about" onClick={onNavigate}>
          关于本机
        </Link>
        <span aria-hidden>·</span>
        <Link href="/journal" onClick={onNavigate}>
          开发日志
        </Link>
        <span aria-hidden>·</span>
        <a href="/feed.xml">RSS</a>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建系统菜单**

创建 `src/components/desktop/system-menu.tsx`：

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { siteConfig } from "@/config/site";
import {
  useDesktopSettings,
  type DesktopPreset,
} from "./use-desktop-settings";

const PRESETS: { id: DesktopPreset; label: string }[] = [
  { id: "night", label: "夜班" },
  { id: "paper", label: "稿纸" },
  { id: "blueprint", label: "蓝图" },
];

export function SystemMenu({
  onClose,
  accountMenu,
  hasFriends,
}: {
  onClose: () => void;
  accountMenu: ReactNode;
  hasFriends: boolean;
}) {
  const { preset, setPreset } = useDesktopSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="os-system-menu"
      role="dialog"
      aria-label="系统菜单"
      tabIndex={-1}
    >
      <section>
        <p className="os-menu-label">桌面</p>
        <div className="os-menu-presets">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={preset === item.id}
              onClick={() => setPreset(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="os-menu-label">系统</p>
        <Link href="/about" onClick={onClose}>
          关于本机
        </Link>
        <Link href="/journal" onClick={onClose}>
          开发日志
        </Link>
        {hasFriends && (
          <Link href="/friends" onClick={onClose}>
            友链
          </Link>
        )}
        <a href="/feed.xml">RSS</a>
        <a
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer noopener"
        >
          GitHub ↗
        </a>
      </section>

      <section>
        <p className="os-menu-label">账号</p>
        {accountMenu}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: 创建任务栏**

创建 `src/components/desktop/taskbar.tsx`：

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { findAppByPath, launcherApps } from "@/config/apps";
import { AppIcon } from "./icons";
import { Clock } from "./clock";
import { Launcher } from "./launcher";
import { SystemMenu } from "./system-menu";

export function Taskbar({
  accountMenu,
  hasFriends,
}: {
  accountMenu: ReactNode;
  hasFriends: boolean;
}) {
  const pathname = usePathname();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const current = findAppByPath(pathname);

  useEffect(() => {
    setLauncherOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!launcherOpen && !menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLauncherOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launcherOpen, menuOpen]);

  const closePanels = () => {
    setLauncherOpen(false);
    setMenuOpen(false);
  };

  return (
    <footer className="os-taskbar">
      {(launcherOpen || menuOpen) && (
        <button
          type="button"
          className="os-menu-backdrop"
          aria-label="关闭面板"
          tabIndex={-1}
          onClick={closePanels}
        />
      )}

      <button
        type="button"
        className="os-launcher-button"
        aria-label="打开启动器"
        aria-expanded={launcherOpen}
        onClick={() => {
          setLauncherOpen((open) => !open);
          setMenuOpen(false);
        }}
      >
        Z
      </button>

      <div className="os-taskbar-apps">
        {current?.path && (
          <Link
            href={current.path}
            className="os-taskbar-item is-active"
            aria-current="page"
          >
            <AppIcon name={current.icon} className="size-3.5" />
            <span>{current.title}</span>
          </Link>
        )}
      </div>

      <div className="os-taskbar-right">
        <span className="os-taskbar-clock">
          <Clock withSeconds={false} />
        </span>
        <button
          type="button"
          className="os-taskbar-menu-button"
          aria-label="系统菜单"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((open) => !open);
            setLauncherOpen(false);
          }}
        >
          ≡
        </button>
      </div>

      {launcherOpen && <Launcher apps={launcherApps} onNavigate={closePanels} />}
      {menuOpen && (
        <SystemMenu
          onClose={closePanels}
          accountMenu={accountMenu}
          hasFriends={hasFriends}
        />
      )}
    </footer>
  );
}
```

- [ ] **Step 6: 创建桌面外壳**

创建 `src/components/desktop/desktop-shell.tsx`：

```tsx
import type { ReactNode } from "react";
import { publicApps } from "@/config/apps";
import { Wallpaper } from "./wallpaper";
import { Taskbar } from "./taskbar";

export function DesktopShell({
  accountMenu,
  hasFriends,
  children,
}: {
  accountMenu: ReactNode;
  hasFriends: boolean;
  children: ReactNode;
}) {
  return (
    <div className="os-shell">
      <Wallpaper />
      <main className="os-main">{children}</main>
      <Taskbar accountMenu={accountMenu} hasFriends={hasFriends} />
      <noscript>
        <nav className="os-noscript" aria-label="站点导航">
          <p>Personal Dev OS · 无脚本模式</p>
          {publicApps.map((app) => (
            <a key={app.id} href={app.path}>
              {app.title}
            </a>
          ))}
          <a href="/login">登录</a>
          <a href="/feed.xml">RSS</a>
        </nav>
      </noscript>
    </div>
  );
}
```

- [ ] **Step 7: 替换站点布局**

把 `src/app/(site)/layout.tsx` 整体替换为：

```tsx
import { Suspense } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/site/account-menu";
import { DesktopShell } from "@/components/desktop/desktop-shell";
import { friends } from "@/config/portfolio";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Suspense 把读 cookie 的账号菜单收进动态洞，静态外壳不被拖成整页动态
  const accountMenu = (
    <Suspense
      fallback={
        <Link href="/login" className="os-menu-link">
          登录
        </Link>
      }
    >
      <AccountMenu />
    </Suspense>
  );

  return (
    <DesktopShell accountMenu={accountMenu} hasFriends={friends.length > 0}>
      {children}
    </DesktopShell>
  );
}
```

- [ ] **Step 8: 替换账号菜单**

把 `src/components/site/account-menu.tsx` 整体替换为：

```tsx
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";

/**
 * 系统菜单里的账号区。
 * 展开/收起由客户端的 SystemMenu 负责；这里只负责按会话渲染内容。
 */
export async function AccountMenu() {
  // 会话过期判断会读 Date.now()，必须先声明请求时渲染
  await connection();

  const user = await getSessionUser();
  if (!user) {
    return (
      <Link href="/login" className="os-menu-link">
        登录
      </Link>
    );
  }

  return (
    <div className="os-account">
      <p className="px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {user.login} · {user.role === "owner" ? "站长" : "访客"}
      </p>
      <Link href="/playlist#mine" className="os-menu-link">
        我的推荐
      </Link>
      {user.role === "owner" && (
        <>
          <Link href="/write" className="os-menu-link">
            写一条
          </Link>
          <Link href="/admin" className="os-menu-link">
            管理
          </Link>
        </>
      )}
      <form
        action="/api/auth/email/logout"
        method="post"
        className="mt-1 border-t border-rule pt-1"
      >
        <button type="submit" className="os-menu-link">
          退出登录
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 9: 桌面锁定 body 滚动**

在 `src/app/globals.css` 末尾追加：

```css
@media (min-width: 768px) {
  body {
    overflow: hidden;
  }
}
```

- [ ] **Step 10: 类型检查**

Run: `npm run type-check`

Expected: 退出码 0，无输出。若报 `Property 'path' does not exist on type 'never'`，说明 `current?.path` 的收窄没生效，把条件改为 `{current && current.path && ( ... )}`。

- [ ] **Step 11: 启动开发服务器检查外壳**

Run: `npm run dev`

Expected: 首页仍然是原来的生活流，但外面已经有固定壁纸、底部任务栏（左侧 Z、右侧时间与 ≡）。点击 Z 出现启动器，点击 ≡ 出现系统菜单，三套预设按钮可即时切换且刷新后保持。任务栏不遮挡内容，页面可滚动。

注意：这个中间提交里启动器会暂时包含 `/life`、`/gallery`、`/snippets` 三个尚未创建的路由（Task 5 迁移路由、Task 6 补齐页面）。它们只存在于开发中间态，不要在这个提交上对外发布；Task 7 的验收会确认所有图标都有真实去处。

- [ ] **Step 12: 提交**

```bash
git add src/components/desktop/wallpaper.tsx src/components/desktop/clock-store.ts src/components/desktop/clock.tsx src/components/desktop/taskbar.tsx src/components/desktop/launcher.tsx src/components/desktop/system-menu.tsx src/components/desktop/desktop-shell.tsx "src/app/(site)/layout.tsx" src/components/site/account-menu.tsx src/app/globals.css
git commit -m "feat(desktop): 壁纸、任务栏、启动器与系统菜单"
```

### Task 5: 路由组迁移、应用窗口与滚动根

**Files:**
- Create: `src/components/desktop/app-frame.tsx`
- Create: `src/app/(site)/(apps)/layout.tsx`
- Modify: `src/components/blog/reading-progress.tsx`（整体替换）
- Modify: `src/components/blog/toc.tsx`（滚动根）
- Modify: `src/components/letters/letter-form.tsx`、`src/components/life/comment-form.tsx`、`src/components/playlist/song-form.tsx`、`src/components/write/moment-form.tsx`（action 路径）
- Modify: `src/app/globals.css`（最大化窗口与内部平滑滚动）
- Move: 13 个路由目录到 `(apps)`

**Interfaces:**
- Consumes：`findAppByPath`。
- Produces：
  - `AppFrame({ children: ReactNode })`
  - `useScrollRoot(): RefObject<HTMLDivElement | null> | null`
  - `(apps)` 路由组：`/about`、`/admin`、`/friends`、`/journal`、`/letters`、`/life/[id]`、`/login`、`/notes`、`/notes/[slug]`、`/playlist`、`/projects`、`/shelf`、`/style`、`/write` 全部套窗口。

- [ ] **Step 1: 迁移路由目录**

Run:

```bash
mkdir -p "src/app/(site)/(apps)"
git mv "src/app/(site)/about" "src/app/(site)/(apps)/about"
git mv "src/app/(site)/admin" "src/app/(site)/(apps)/admin"
git mv "src/app/(site)/friends" "src/app/(site)/(apps)/friends"
git mv "src/app/(site)/journal" "src/app/(site)/(apps)/journal"
git mv "src/app/(site)/letters" "src/app/(site)/(apps)/letters"
git mv "src/app/(site)/life" "src/app/(site)/(apps)/life"
git mv "src/app/(site)/login" "src/app/(site)/(apps)/login"
git mv "src/app/(site)/notes" "src/app/(site)/(apps)/notes"
git mv "src/app/(site)/playlist" "src/app/(site)/(apps)/playlist"
git mv "src/app/(site)/projects" "src/app/(site)/(apps)/projects"
git mv "src/app/(site)/shelf" "src/app/(site)/(apps)/shelf"
git mv "src/app/(site)/style" "src/app/(site)/(apps)/style"
git mv "src/app/(site)/write" "src/app/(site)/(apps)/write"
```

Expected: `git status` 显示 13 个 rename；`src/app/(site)/page.tsx`、`layout.tsx`、`error.tsx` 仍在原处。

- [ ] **Step 2: 创建 AppFrame**

创建 `src/components/desktop/app-frame.tsx`：

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { findAppByPath } from "@/config/apps";

const ScrollRootContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

/** 页面里的阅读进度与目录用它找真正的滚动容器；移动端返回 null（页面滚动）。 */
export function useScrollRoot() {
  return useContext(ScrollRootContext);
}

function useDesktopViewport() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(min-width: 768px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const app = findAppByPath(pathname);
  const scrollRef = useRef<HTMLDivElement>(null);
  const desktop = useDesktopViewport();
  const [expanded, setExpanded] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const titleId = useId();
  const canFocus = /^\/notes\/[^/]+$/.test(pathname);

  useEffect(() => {
    setExpanded(false);
    setFocusMode(false);
  }, [pathname]);

  useEffect(() => {
    if (!focusMode) return;
    const root = document.documentElement;
    root.dataset.focusMode = "true";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      delete root.dataset.focusMode;
    };
  }, [focusMode]);

  return (
    <ScrollRootContext.Provider value={desktop ? scrollRef : null}>
      <section
        className="os-app-frame"
        data-expanded={expanded ? "true" : "false"}
        data-focus={focusMode ? "true" : "false"}
        role="region"
        aria-labelledby={titleId}
      >
        <div className="os-app-window">
          <header className="os-titlebar">
            <Link href="/" className="os-titlebar-back" aria-label="最小化到桌面">
              ‹ 桌面
            </Link>
            <span id={titleId} className="os-titlebar-title">
              {app?.title ?? "Z·OS"}
            </span>
            <span className="os-titlebar-path">{pathname}</span>
            <div className="os-titlebar-controls">
              {canFocus && (
                <button
                  type="button"
                  className="os-titlebar-control"
                  aria-label="专注阅读"
                  aria-pressed={focusMode}
                  onClick={() => setFocusMode((on) => !on)}
                >
                  ◱
                </button>
              )}
              <Link href="/" className="os-titlebar-control" aria-label="最小化">
                —
              </Link>
              <button
                type="button"
                className="os-titlebar-control"
                aria-label={expanded ? "还原窗口" : "最大化"}
                onClick={() => setExpanded((on) => !on)}
              >
                □
              </button>
              <Link
                href="/"
                className="os-titlebar-control is-close"
                aria-label="关闭"
              >
                ×
              </Link>
            </div>
          </header>

          <div className="os-mobile-appbar">
            <Link href="/">‹ 桌面</Link>
            <span>{app?.title ?? "Z·OS"}</span>
          </div>

          <div ref={scrollRef} className="os-app-content">
            {children}
          </div>
        </div>
      </section>
    </ScrollRootContext.Provider>
  );
}
```

- [ ] **Step 3: 创建应用路由组布局**

创建 `src/app/(site)/(apps)/layout.tsx`：

```tsx
import { AppFrame } from "@/components/desktop/app-frame";

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppFrame>{children}</AppFrame>;
}
```

- [ ] **Step 4: 让阅读进度跟随窗口滚动容器**

把 `src/components/blog/reading-progress.tsx` 整体替换为：

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useScrollRoot } from "@/components/desktop/app-frame";

/**
 * 顶部阅读进度条：跟随真正的滚动容器填充。
 * 桌面端是 AppFrame 的内部容器，移动端是 window。
 */
export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const scrollRoot = useScrollRoot();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const node = scrollRoot?.current ?? null;

    const update = () => {
      const total = node
        ? node.scrollHeight - node.clientHeight
        : document.documentElement.scrollHeight -
          document.documentElement.clientHeight;
      const top = node ? node.scrollTop : window.scrollY;
      const progress =
        total > 0 ? Math.min(1, Math.max(0, top / total)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };

    update();
    const target: EventTarget = node ?? window;
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      target.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrollRoot]);

  return <div ref={barRef} aria-hidden="true" className="os-reading-progress" />;
}
```

- [ ] **Step 5: 让目录观察器使用同一个滚动根**

修改 `src/components/blog/toc.tsx`：

```tsx
import { useEffect, useState } from "react";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollRoot } from "@/components/desktop/app-frame";
```

在组件内、`useState` 之后加：

```tsx
const scrollRoot = useScrollRoot();
```

把 `useEffect` 里的 `IntersectionObserver` 构造函数改为：

```tsx
useEffect(() => {
  if (items.length === 0) return;
  const headings = items
    .map((h) => document.getElementById(h.id))
    .filter((el): el is HTMLElement => el !== null);
  if (headings.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
          break;
        }
      }
    },
    {
      root: scrollRoot?.current ?? null,
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    }
  );
  headings.forEach((h) => observer.observe(h));
  return () => observer.disconnect();
}, [items, scrollRoot]);
```

- [ ] **Step 6: 修正 server action 导入路径**

把四个客户端组件里的 action 导入改成带路由组的路径：

```ts
// src/components/letters/letter-form.tsx
import { submitLetter, type LetterFormState } from "@/app/(site)/(apps)/letters/actions";

// src/components/life/comment-form.tsx
} from "@/app/(site)/(apps)/life/[id]/actions";

// src/components/playlist/song-form.tsx
import { submitSong, type SongFormState } from "@/app/(site)/(apps)/playlist/actions";

// src/components/write/moment-form.tsx
import { createMoment, type MomentFormState } from "@/app/(site)/(apps)/write/actions";
```

Run: `grep -rn "@/app/(site)/" src/components --include="*.tsx"`

Expected: 无输出（全部已指向 `(apps)`）。

- [ ] **Step 7: 补最大化与内部平滑滚动样式**

在 `src/app/globals.css` 末尾追加：

```css
.os-app-frame[data-expanded="true"] {
  padding: 0;
}

.os-app-frame[data-expanded="true"] .os-app-window {
  border-color: transparent;
  box-shadow: none;
}

.os-app-content {
  scroll-behavior: smooth;
}
```

- [ ] **Step 8: 类型检查**

Run: `npm run type-check`

Expected: 退出码 0。若报 `IntersectionObserver` 的 `root` 类型不匹配，把 `root: scrollRoot?.current ?? null` 改为 `root: (scrollRoot?.current ?? null) as Element | null`，但正常情况下不需要。

- [ ] **Step 9: 手动检查窗口行为**

Run: `npm run dev`

依次访问 `/about`、`/notes`、任意一篇 `/notes/[slug]`、`/journal`、`/write`：

Expected:
- 每个页面都在一个带标题栏的窗口里，标题栏左侧 `‹ 桌面`，右侧 `— □ ×`。
- 点击 `—` 或 `×` 回到 `/`。
- 点击 `□` 窗口贴满桌面区域，再点还原。
- 笔记详情出现 `◱`；点击后任务栏和标题栏消失，`Esc` 退出专注模式。
- 笔记详情滚动时，顶部 2px 进度条跟随窗口内部滚动；目录高亮随内部滚动变化。
- `/write` 的表单能正常提交（action 路径已改）。

- [ ] **Step 10: 提交**

```bash
git add "src/app/(site)/(apps)" src/components/desktop/app-frame.tsx src/components/blog/reading-progress.tsx src/components/blog/toc.tsx src/components/letters/letter-form.tsx src/components/life/comment-form.tsx src/components/playlist/song-form.tsx src/components/write/moment-form.tsx src/app/globals.css
git commit -m "refactor(desktop): 内容页迁入应用窗口与内部滚动根"
```

### Task 6: 桌面主屏、`/life` 生活流与移动端退化

**Files:**
- Create: `src/components/desktop/desktop-home.tsx`
- Move: `src/app/(site)/page.tsx` → `src/app/(site)/(apps)/life/page.tsx`
- Create: `src/app/(site)/page.tsx`（新桌面主屏）
- Create: `src/app/(site)/(apps)/gallery/page.tsx`
- Create: `src/app/(site)/(apps)/snippets/page.tsx`
- Modify: `src/app/(site)/(apps)/life/[id]/page.tsx`（返回链接）

**Interfaces:**
- Consumes：`desktopTileApps`、`AppIcon`、`Clock`、`siteConfig`、`getStatusSentence()`、`NotYetOpen`。
- Produces：
  - `DesktopHome({ status: string })`
  - `/` 桌面主屏；`/life` 生活流；`/gallery`、`/snippets` 诚实占位。

- [ ] **Step 1: 把旧首页移到 `/life`**

Run:

```bash
git mv "src/app/(site)/page.tsx" "src/app/(site)/(apps)/life/page.tsx"
```

然后修改 `src/app/(site)/(apps)/life/page.tsx`：

1. 顶部 import 增加 Metadata 类型、把 `LocalClock` 换成新的 `Clock`：

```tsx
import type { Metadata } from "next";
import { Fragment } from "react";
import { connection } from "next/server";
import { siteConfig } from "@/config/site";
import { now as portfolioNow } from "@/config/portfolio";
import { countThisMonth, groupByMonth } from "@/lib/life";
import { getObservation } from "@/lib/observation";
import { getMoments } from "@/lib/moments-server";
import { getWeather } from "@/lib/weather-server";
import { getGithubActivity } from "@/lib/github-server";
import { getApprovedLetters } from "@/lib/letters-server";
import { getStatusSentence } from "@/lib/settings-server";
import { Moment, NODE_CLASS } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";
import { NowPanel } from "@/components/life/now-panel";
import { ObservBar } from "@/components/site/observ-bar";
import { Clock } from "@/components/desktop/clock";
```

2. 在 `instant = false` 之前加 metadata：

```tsx
export const metadata: Metadata = {
  title: "每日日志",
  description: "一条按时间走的生活流：文字、照片、歌、书和信。",
};
```

3. 把函数名与注释改成生活流，不再叫首页：

```tsx
/**
 * 每日日志 = 原观测台主屏。
 *
 * 左栏是生活流（一条主脊线贯穿），右栏是「此刻」。
 * 全站只有一个客户端常驻组件：页头的本地时钟。其余读数都在服务端算好。
 */
export default async function LifePage() {
```

4. 把 `<LocalClock />` 换成：

```tsx
<Clock className="font-mono text-[22px] leading-none tabular-nums text-data sm:text-[26px]" />
```

其余 JSX、读数、空状态一律不动。

- [ ] **Step 2: 更新单条动态的返回链接**

在 `src/app/(site)/(apps)/life/[id]/page.tsx` 里，把指向桌面根路径的返回链接：

```tsx
href="/"
```

改成：

```tsx
href="/life"
```

只改这一处（第 89 行附近）；上一篇 / 下一篇的链接不动。

- [ ] **Step 3: 创建桌面主屏组件**

创建 `src/components/desktop/desktop-home.tsx`：

```tsx
import Link from "next/link";
import type { CSSProperties } from "react";
import { desktopTileApps } from "@/config/apps";
import { siteConfig } from "@/config/site";
import { AppIcon } from "./icons";

type IconStyle = CSSProperties & { "--i": number };

/**
 * 阶段 1 的桌面主屏。
 *
 * 只有已经能打开的应用才出现在这里：没有死图标，没有「敬请期待」。
 * 阶段 2 接窗口系统后，这个组件会变成客户端的窗口宿主；
 * 现在它是服务端组件，桌面首屏不为此多加载 JS。
 */
export function DesktopHome({ status }: { status: string }) {
  return (
    <div className="os-desktop">
      <header className="os-identity">
        <h1 className="os-identity-name">{siteConfig.name}</h1>
        <p className="os-identity-status">{status}</p>
      </header>

      <nav className="os-icon-grid" aria-label="应用">
        {desktopTileApps.map((app, index) => (
          <Link
            key={app.id}
            href={app.path}
            className="os-icon"
            title={app.description}
            style={{ "--i": index } as IconStyle}
          >
            <span className="os-icon-tile">
              <AppIcon name={app.icon} className="size-6" />
            </span>
            <span className="os-icon-label">{app.title}</span>
          </Link>
        ))}
      </nav>

      <p className="os-desktop-hint">
        <span>单击图标打开</span>
        <span aria-hidden>·</span>
        <span>任务栏 ≡ 切换预设</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: 用桌面主屏替换首页**

创建新的 `src/app/(site)/page.tsx`：

```tsx
import { connection } from "next/server";
import { getStatusSentence } from "@/lib/settings-server";
import { DesktopHome } from "@/components/desktop/desktop-home";

/**
 * 桌面主屏要读站长的状态句，所以停在请求期。
 * 没有这行，构建时数据库缺席会把默认状态句烤进静态壳。
 */
export const instant = false;

export default async function HomePage() {
  await connection();
  const status = await getStatusSentence();
  return <DesktopHome status={status} />;
}
```

- [ ] **Step 5: 给两个阶段 3 应用建诚实占位页**

创建 `src/app/(site)/(apps)/gallery/page.tsx`：

```tsx
import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = {
  title: "生活胶囊",
  description: "带照片的瞬间，按时间铺开。",
};

export default function GalleryPage() {
  return (
    <div className="px-4 py-12 sm:px-6">
      <NotYetOpen
        title="生活胶囊"
        phase="阶段 3 上线"
        description="带照片的瞬间会在这里按时间铺开，窗口内可以放大查看。现在还没有上线，不拿占位图冒充内容。"
      />
    </div>
  );
}
```

创建 `src/app/(site)/(apps)/snippets/page.tsx`：

```tsx
import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = {
  title: "代码片段",
  description: "这个站里真正用过的代码。",
};

export default function SnippetsPage() {
  return (
    <div className="px-4 py-12 sm:px-6">
      <NotYetOpen
        title="代码片段"
        phase="阶段 3 上线"
        description="这里会放这个站里真正跑过的短代码，带语法高亮和一键复制。现在还没有上线，不搬别人的示例充数。"
      />
    </div>
  );
}
```

- [ ] **Step 6: 类型检查**

Run: `npm run type-check`

Expected: 退出码 0。若 `style={{ "--i": index }}` 报错，确认已 `import type { CSSProperties } from "react"` 并保留了 `type IconStyle = CSSProperties & { "--i": number }` 与 `as IconStyle`。

- [ ] **Step 7: 检查桌面与移动端**

Run: `npm run dev`

桌面 1440×900：

Expected:
- `/` 左上角是站点名与状态句，中间是 3×3 的 9 个图标，底部提示一行。
- 图标入场有 30ms 阶梯的上浮淡入；悬停上浮 2px、图标块上浮 3px，边框变暖。
- 鼠标移动时壁纸有轻微光斑与网格视差；停止移动后动画停止。
- 点击「每日日志」进入 `/life` 窗口，旧生活流完整：观测条、主脊线、月份分组、右栏「此刻」。
- 点击「生活胶囊」「代码片段」显示诚实的阶段 3 说明，不是 404。
- 任务栏显示当前应用名；点击 Z 启动器能看到 10 个应用。
- 切换三套预设后，桌面、任务栏、窗口、正文全部换色；刷新不闪。

移动端 390×844（浏览器设备模拟）：

Expected:
- 无横向滚动；身份在顶部，图标 4 列 3 行。
- 底部 56px 任务栏只有 Z、时间、≡；打开应用后是整页内容，顶部有 `‹ 桌面` 条。
- 列表页与笔记页正常滚动；阅读进度条贴顶。

- [ ] **Step 8: 提交**

```bash
git add "src/app/(site)/(apps)/life/page.tsx" "src/app/(site)/(apps)/life/[id]/page.tsx" "src/app/(site)/(apps)/gallery/page.tsx" "src/app/(site)/(apps)/snippets/page.tsx" "src/app/(site)/page.tsx" src/components/desktop/desktop-home.tsx
git commit -m "feat(desktop): 桌面主屏与每日日志应用"
```

### Task 7: 清理旧外壳、更新样式走廊与站点地图、全量验证

**Files:**
- Delete: `src/components/site/navbar.tsx`、`footer.tsx`、`src/components/theme-toggle.tsx`、`src/components/site/reveal.tsx`、`src/components/chat/chat-widget.tsx`、`src/components/chat/open-chat-button.tsx`、`src/components/terminal/terminal-link-button.tsx`、`src/components/site/local-clock.tsx`、`src/components/terminal/terminal-palette.tsx`
- Modify: `src/config/site.ts`（删除 nav/footerNav 派生导出）
- Modify: `src/app/(site)/(apps)/style/page.tsx`（加图标样张）
- Modify: `src/app/sitemap.ts`（加新路由）
- Modify: `package.json`（移除 `next-themes`）
- Verify: 全站

**Interfaces:**
- Consumes：`ICON_KEYS`、`AppIcon`。
- Produces：无新接口；删除已无引用的旧外壳。

- [ ] **Step 1: 删除旧外壳组件**

Run:

```bash
git rm src/components/site/navbar.tsx
git rm src/components/site/footer.tsx
git rm src/components/theme-toggle.tsx
git rm src/components/site/reveal.tsx
git rm src/components/chat/chat-widget.tsx
git rm src/components/chat/open-chat-button.tsx
git rm src/components/terminal/terminal-link-button.tsx
git rm src/components/site/local-clock.tsx
git rm src/components/terminal/terminal-palette.tsx
```

Expected: 命令退出码 0。若某个文件已不存在，先 `git status` 确认是否在前面的任务里已经删除，不要用 `rm -f` 掩盖。

删除完成后，`next-themes` 在代码里不应再有引用。Run: `grep -rn "next-themes" src`，Expected: 无输出。

- [ ] **Step 2: 删除站点配置里重复的导航源**

修改 `src/config/site.ts`：

1. 删除第 5 行：

```ts
import { friends } from "@/config/portfolio";
```

2. 删除 `siteConfig` 里的 `nav` 与 `footerNav` 两个数组（原 46–59 行），保留 `footer`：

```ts
  /**
   * 观测条的天气读数：城市写死，坐标由城市决定；不采集访客位置
   */
  weather: {
    city: "杭州",
    latitude: 30.2741,
    longitude: 120.1551,
  },
  footer: {
    icp: "", // 备案号（有域名备案后填写）
    beianUrl: "",
  },
} as const;
```

3. 删除从 `const EMPTY_SECTION_HREFS` 到文件末尾的全部派生导出（原 68–88 行）。文件的最后一个导出应只剩 `SiteConfig` 类型。

4. 把状态句的注释改成现在的真实来源：

```ts
  /**
   * 状态句的缺省值。数据库里有 site_settings.status_sentence 时以数据库为准；
   * 桌面主屏与 /life 都读 getStatusSentence()。
   */
  status: "在杭州，最近在学做饭",
```

导航的唯一数据源从此是 `src/config/apps.ts`。

- [ ] **Step 3: 样式走廊加图标样张**

修改 `src/app/(site)/(apps)/style/page.tsx`，在顶部加 import：

```tsx
import { AppIcon } from "@/components/desktop/icons";
import { ICON_KEYS } from "@/config/apps";
```

在 `<h1 className="font-heading text-2xl font-bold">样式走廊</h1>` 之后插入：

```tsx
      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          桌面图标
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ICON_KEYS.map((name) => (
            <div
              key={name}
              className="flex flex-col items-center gap-2 border border-rule bg-panel p-3"
            >
              <AppIcon name={name} className="size-5 text-data" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {name}
              </span>
            </div>
          ))}
        </div>
      </section>
```

- [ ] **Step 4: 站点地图补三条路由并修正注释**

修改 `src/app/sitemap.ts`：

1. 把注释里的 `301/308` 改成 `308`（这个站所有旧地址都是 308）。

2. 在 `STATIC_PAGES` 的 `{ path: "", priority: 1 },` 之后、`{ path: "/notes", priority: 0.8 },` 之前插入三条，结果顺序为：

```ts
  { path: "", priority: 1 },
  { path: "/life", priority: 0.8 },
  { path: "/gallery", priority: 0.6 },
  { path: "/snippets", priority: 0.6 },
  { path: "/notes", priority: 0.8 },
```

- [ ] **Step 5: 移除 next-themes 依赖**

Run: `npm uninstall next-themes`

Expected: `package.json` 不再包含 `next-themes`；`package-lock.json` 更新；退出码 0。

- [ ] **Step 6: 跑单元测试**

Run: `npm test`

Expected: 13 个测试文件全部通过，输出 `# fail 0`，退出码 0。特别注意 `tokens` 10 项与 `apps` 5 项。

- [ ] **Step 7: 类型检查与 lint**

Run: `npm run type-check`

Expected: 退出码 0，无输出。

Run: `npm run lint`

Expected: 退出码 0；允许已有警告，但不允许新增 error。

- [ ] **Step 8: 生产构建**

Run: `npm run build`

Expected: 退出码 0。路由清单包含 `/`、`/life`、`/life/[id]`、`/gallery`、`/snippets`、`/about`、`/notes`、`/notes/[slug]`、`/projects`、`/journal`、`/shelf`、`/playlist`、`/letters`、`/friends`、`/login`、`/write`、`/admin`、`/style`。若构建因数据库连接失败，确认相关页面仍有 `await connection()` 且 `instant = false`，不要把数据库调用挪到模块顶层。

- [ ] **Step 9: 验证旧链接仍是 308**

先启动生产服务：

Run: `npm run start`

另开终端：

```bash
curl -sI http://localhost:3000/blog | head -n 5
curl -sI http://localhost:3000/archives | head -n 5
curl -sI http://localhost:3000/changelog | head -n 5
curl -sI http://localhost:3000/guestbook | head -n 5
```

Expected: 每个响应第一行都是 `HTTP/1.1 308 Permanent Redirect`，`location` 分别是 `/notes`、`/notes`、`/journal`、`/letters`。

- [ ] **Step 10: 浏览器全量验收**

先停掉 Step 9 的 `npm run start`，再 Run: `npm run dev`

用预览工具依次检查：

1. **桌面（夜班）**：1440×900，`/`。壁纸有细网格与暖色光斑；身份、9 图标、任务栏层次清楚；首屏没有蓝紫、霓虹、粒子、扫描线。
2. **三套预设**：通过 `≡` 切换夜班 / 稿纸 / 蓝图，各截一张图。检查正文、muted、语义色都可读，paper 模式没有残留暗色块。
3. **应用窗口**：打开 `/life`、`/notes`、任意笔记、`/about`、`/projects`。标题栏、最大化、最小化、关闭、笔记专注模式全部可用；笔记进度条与目录跟随内部滚动。
4. **移动端**：390×844，`/` 与 `/life`。无横向滚动，图标 4 列，底部 dock 固定，应用页有 `‹ 桌面` 条。
5. **无脚本**：在浏览器禁用 JavaScript 后打开 `/`，应看到 `.os-noscript` 的完整应用清单与 RSS/登录链接，而不是空白。
6. **减少动态**：系统开启 `prefers-reduced-motion` 后刷新，图标入场与悬停位移消失，内容仍完整。

若任一项不通过，修到通过再继续；不要用「后续阶段再修」跳过阶段 1 的验收项。

- [ ] **Step 11: 检查首屏 JS 预算**

在 `npm run build` 输出里找到 `/` 的 First Load JS。Expected: 共享首屏 JS ≤ 90KB gzip。若超出，先确认旧的 `SearchPalette`、`ChatWidget`、framer-motion 相关组件已不再被 `(site)/layout.tsx` 引用；不要靠调高预算解决。

- [ ] **Step 12: 提交**

```bash
git add -A
git commit -m "chore(desktop): 清理旧导航并更新样式走廊与站点地图"
```

---

## 阶段 1 完成标准

- `npm test`、`npm run type-check`、`npm run lint`、`npm run build` 全部通过。
- `/` 是桌面主屏；`/life` 是完整生活流；9 个桌面图标全部有真实去处。
- 三套预设可切换、刷新保持、无首屏闪烁；亮色预设不残留暗色。
- 所有旧内容页在 `AppFrame` 内可滚动、可最小化/最大化/关闭；笔记专注模式可用。
- 移动端主屏 + 全屏应用可用，无横向滚动。
- 旧链接仍为 308；sitemap 含 `/life`、`/gallery`、`/snippets`。
- 旧 Navbar/Footer/ChatWidget/SearchPalette 不再进入首屏包。

## 明确不在阶段 1 范围内

以下项目按设计文档的阶段 2–4 另写计划，不塞进本计划：

- 多窗口系统（拖拽、缩放、z-order、最小化到任务栏、从图标位置展开）。
- 终端应用、Spotlight 搜索、终端式 AI 助理。
- 生活日志标签与置顶、生活胶囊、项目看板、代码片段、关于本机、实时状态组件。
- 桌面物件（便利贴、咖啡杯、拍立得、磁带）、右键菜单、系统设置里的桌面物件开关与布局重置。
- 剩余页面的深度内容改造、终端式 404/错误页、全局无障碍与性能收尾。

---

## 自审

**1. 规格覆盖**

| 设计文档章节 | 对应任务 |
|---|---|
| §3 三套预设色板、对比度、chroma | Task 1 |
| §4 字体系统（Geist Mono 标题、移除宋体） | Task 1 |
| §5 桌面布局、图标、任务栏、启动器、系统菜单、提示 | Task 4、Task 6 |
| §6 应用页最大化、标题栏、最小化/最大化/关闭、专注模式 | Task 5 |
| §7 移动端主屏 + 全屏应用 + 56px dock | Task 1 CSS、Task 6 |
| §8 路由表、`(apps)` 路由组、`/life` 迁移 | Task 5、Task 6 |
| §9 应用注册表、单一导航源 | Task 2、Task 7 |
| §10 预设持久化与首屏恢复 | Task 3 |
| §11 时钟、壁纸光斑/视差、reduced-motion | Task 1、Task 4 |
| §12 性能预算与不引入拖拽库 | Global Constraints、Task 7 Step 11 |
| §13 验收标准中的首屏、视觉、交互、移动端 | Task 6、Task 7 |
| §13 旧链接 308、sitemap | Task 7 Step 9、Step 4 |
| 阶段 2–4 的窗口、终端、助理、内容应用 | 明确排除，另写计划 |

**2. 占位符扫描**

计划中没有待定项、待办占位、「类似 Task N」或「自行补充」。每个新建文件都给了完整代码；每个修改都给了可执行的新代码或精确删除块。阶段 2–4 的内容不是占位符，而是显式排除并说明由后续计划承接。

**3. 类型与命名一致性**

- `LinkedApp` 在 Task 2 定义，Task 4 的 `Launcher` 与 Task 6 的 `desktopTileApps` 使用同一类型。
- `useScrollRoot` 在 Task 5 的 `app-frame.tsx` 定义并导出，`reading-progress.tsx` 与 `toc.tsx` 从同一路径导入。
- `DesktopPreset` / `DesktopSettings` 在 Task 3 定义，Task 4 的 `SystemMenu` 只导入这两个名字。
- `SETTINGS_KEY = "z-os:settings"` 在 Task 3 的 store 与根布局内联脚本里是同一个字符串。
- `desktopTileApps` 在 Task 2 产出，Task 6 消费；`launcherApps` 在 Task 2 产出，Task 4 消费。
- CSS 类名 `.os-*` 在 Task 1 定义，Task 4/5/6 只使用不新造。

**4. 已知风险与对策**

- **`.dark` 与 blueprint 的层叠顺序**：`[data-wallpaper="blueprint"]` 必须排在 `.dark` 之后；Task 1 的 CSS 已按此顺序。paper 切换时必须移除 `.dark`，`applyDesktopSettings` 与内联脚本都做了。
- **首屏闪烁**：内联脚本在 `<head>` 里先设属性；`ThemeProvider` 首次布局效应用 `getDesktopSettings()` 读真实存储，而不是用 hydration 的默认快照覆盖。
- **useSyncExternalStore 快照抖动**：`read()` 按 `cachedRaw` 缓存对象，同一份 localStorage 永远返回同一个引用。
- **窗口内滚动**：`scroll(nearest block)`、`IntersectionObserver.root`、`ReadingProgress` 三处都改成窗口内容容器；移动端回退到 window。
- **阶段 1 期间的可运行性**：Task 4 完成后旧页面仍可滚动；Task 5 完成后内容页进窗口；Task 6 才把 `/` 换成桌面。每个任务结束都能启动站点。

**5. 执行顺序**

任务 1 → 2 → 3 → 4 → 5 → 6 → 7 严格顺序执行。Task 1 的 token 是后面所有视觉任务的前提；Task 5 的 `(apps)` 迁移必须早于 Task 6 的 `/life` 创建，否则 `git mv` 会撞到已存在的目录。

