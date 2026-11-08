# Personal Dev OS 阶段 2：窗口系统、终端、Spotlight 与助理 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把阶段 1 的桌面主屏变成真正可用的窗口系统：图标双击开窗、拖拽/缩放/最小化/最大化/关闭、任务栏切换、终端、Spotlight 搜索和终端式助理；路由切换后窗口开合状态保持。

**Architecture:** 窗口状态放在 `(site)/layout.tsx` 的 `DesktopShell` 中（跨路由保持），用纯 reducer + localStorage 只持久化位置/尺寸，不恢复开合状态。桌面窗口内容由首页服务端组件通过 ReactNode 槽传入，首次打开才挂载。终端/助理是全局覆盖层窗口，由 `DesktopShell` 渲染；Spotlight 懒加载。所有打开应用的操作统一走 `DesktopRuntime.openApp(id)`。

**Tech Stack:** React 19 `useReducer`/`useSyncExternalStore`、pointer events（手写拖拽/缩放）、Next.js `next/dynamic`、现有 `/api/chat`、cmdk（只在 Spotlight chunk）。

## Global Constraints

- 继承阶段 1 的全部 token、字体、对比度、动效与反 AI 感约束；窗口本体不透明，玻璃只用于任务栏/启动器/系统菜单/Spotlight。
- 桌面本身不滚动；窗口内容独立滚动。窗口 = 1px `--rule` 边框 + `--window` 底 + 4px 圆角 + 柔和阴影。
- 窗口状态：关闭/打开/最小化/最大化；记录 `rect`、`restoreRect`、`z`。位置尺寸存 `z-os:windows`；开合状态不跨刷新恢复。
- 默认尺寸严格按设计文档 §5.1 表；视口变小自动 clamp，至少保留 80px 标题栏可见。
- 拖拽期间只更新本地 `transform`，松手提交 reducer；不逐帧写 localStorage。缩放右下角 16px 手柄（触屏 24px 命中区）。
- 图标：桌面端单击选中、双击打开；`Enter`/`Space` 打开；`Tab`/方向键可导航；触屏单击直接打开。图标同时是真实链接。
- 窗口、终端、助理、Spotlight：`role="region"/"dialog"`、`aria-labelledby`、`aria-modal`、焦点限制与归还；关闭后焦点回任务栏对应项。
- 终端只显示真实值；`neofetch` 标明 `Shell: zsh (simulated)`；不伪造 AI/在线状态。
- 不引入拖拽/窗口库、canvas、three；终端/助理/Spotlight 按需加载。
- 首屏 shell ≤ 25KB gzip；首屏总 JS ≤ 90KB gzip。
- 每个任务结束提交；阶段结束跑 `npm run type-check && npm run lint && npm test && npm run build`，并在夜班/稿纸/蓝图下检查。

## 文件结构

**新建**

| 文件 | 职责 |
|---|---|
| `src/components/desktop/window-state.ts` | 纯窗口 reducer、`clampRect`、持久化类型 |
| `src/components/desktop/use-window-manager.ts` | `useReducer` + localStorage + 边界测量 + `openApp` |
| `src/components/desktop/desktop-runtime.tsx` | 跨组件窗口/设置上下文与 hooks |
| `src/components/desktop/window.tsx` | 窗口框、标题栏、拖拽、缩放、控件 |
| `src/components/desktop/global-windows.tsx` | 终端/助理等全局窗口宿主 |
| `src/components/desktop/desktop-home.tsx`（重写） | 12 图标、窗口槽、首次提示、桌面物件插槽 |
| `src/components/terminal/commands.ts` | 纯命令解析/执行，可被 Node 测试 |
| `src/components/terminal/terminal-window.tsx` | 终端浮窗 |
| `src/components/assistant/assistant-window.tsx` | 终端式助理 |
| `src/components/search/search-palette.tsx`（重写） | Spotlight |
| `scripts/window-state.test.mjs` | 窗口 reducer 测试 |
| `scripts/terminal-commands.test.mjs` | 终端命令测试 |

**修改**

`src/config/apps.ts`（kind/window/keywords/launcher）、`src/components/desktop/taskbar.tsx`、`launcher.tsx`、`system-menu.tsx`、`desktop-shell.tsx`、`src/app/(site)/layout.tsx`、`src/app/(site)/page.tsx`、`src/app/globals.css`、`scripts/apps.test.mjs`、`package.json`（test 脚本）。

---

### Task 1: 注册表扩展、窗口 reducer 与测试

**Files:** Modify `src/config/apps.ts`、`scripts/apps.test.mjs`、`package.json`；Create `src/components/desktop/window-state.ts`、`scripts/window-state.test.mjs`。

**Interfaces:**
- `type AppKind = "window" | "route"`
- `interface WindowRect { x; y; w; h }`
- `interface WindowConfig { defaultRect: WindowRect; minWidth: number; minHeight: number }`
- `AppDefinition` 增加 `kind: AppKind`、`window?: WindowConfig`、`keywords: string[]`
- `findAppById(id: string): AppDefinition | undefined`
- `desktopTileApps: AppDefinition[]`（全部 12 个桌面图标，不再过滤 path）
- `launcherApps: AppDefinition[]`（全部 `launcher: true`，含无 path 的终端/助理/更多/设置；友链若有内容也进启动器）
- `window-state.ts`：`Rect`、`DesktopBounds`、`WindowState`、`WindowStore`、`initialWindowStore`、`clampRect`、`preferredRect`、`windowReducer`、`WINDOW_STORAGE_KEY`、`DEFAULT_BOUNDS`

- [ ] **Step 1: 写失败的 reducer 测试**

`scripts/window-state.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  clampRect,
  initialWindowStore,
  preferredRect,
  windowReducer,
} from "../src/components/desktop/window-state.ts";

const bounds = { width: 1200, height: 800 };
const rect = { x: 100, y: 100, w: 500, h: 400 };

test("open 创建窗口并聚焦，重复 open 只聚焦", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  assert.equal(state.windows.life.rect.w, 500);
  assert.equal(state.windows.life.z, 2);
  const again = windowReducer(state, { type: "open", id: "life", rect: { ...rect, x: 0 } });
  assert.equal(again.windows.life.rect.x, 100);
  assert.ok(again.windows.life.z > state.windows.life.z);
});

test("minimize 保留窗口，restore 重新置顶", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "minimize", id: "life" });
  assert.equal(state.windows.life.minimized, true);
  state = windowReducer(state, { type: "restore", id: "life" });
  assert.equal(state.windows.life.minimized, false);
  assert.ok(state.windows.life.z > 2);
});

test("maximize 保存 restoreRect，还原回原 rect", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "toggleMaximize", id: "life" });
  assert.equal(state.windows.life.maximized, true);
  assert.deepEqual(state.windows.life.restoreRect, rect);
  state = windowReducer(state, { type: "toggleMaximize", id: "life" });
  assert.equal(state.windows.life.maximized, false);
  assert.deepEqual(state.windows.life.rect, rect);
});

test("close 删除窗口但保留 saved 位置", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "move", id: "life", rect: { ...rect, x: 240 } });
  state = windowReducer(state, { type: "close", id: "life" });
  assert.equal(state.windows.life, undefined);
  assert.equal(state.saved.life.x, 240);
});

test("hydrate 只恢复位置，preferredRect 用保存值并 clamp", () => {
  let state = windowReducer(initialWindowStore, {
    type: "hydrate",
    saved: { life: { x: 20, y: 40, w: 480, h: 600 } },
  });
  assert.equal(state.windows.life, undefined);
  assert.deepEqual(
    preferredRect(state.saved.life, rect, bounds, 420, 360),
    { x: 20, y: 40, w: 480, h: 600 }
  );
  state = windowReducer(state, { type: "open", id: "life", rect });
  assert.deepEqual(state.windows.life.rect, rect);
  assert.deepEqual(state.saved.life, { x: 20, y: 40, w: 480, h: 600 });
});

test("clampRect 限制最小尺寸并保留 80px 标题栏", () => {
  const clamped = clampRect(
    { x: 2000, y: -200, w: 100, h: 100 },
    bounds,
    420,
    360
  );
  assert.equal(clamped.w, 420);
  assert.equal(clamped.h, 360);
  assert.ok(clamped.x + clamped.w >= 80);
  assert.equal(clamped.y, 0);
});

test("reset 清空窗口与保存位置", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "reset" });
  assert.deepEqual(state.windows, {});
  assert.deepEqual(state.saved, {});
});
```

- [ ] **Step 2: 运行测试确认失败** — `node --test scripts/window-state.test.mjs`，Expected: `ERR_MODULE_NOT_FOUND`。

- [ ] **Step 3: 实现 `window-state.ts`**

```ts
export interface Rect { x: number; y: number; w: number; h: number }
export interface DesktopBounds { width: number; height: number }
export interface WindowState {
  id: string;
  rect: Rect;
  restoreRect: Rect | null;
  z: number;
  minimized: boolean;
  maximized: boolean;
}
export interface WindowStore {
  windows: Record<string, WindowState>;
  saved: Record<string, Rect>;
  zCounter: number;
}

export const WINDOW_STORAGE_KEY = "z-os:windows";
export const DEFAULT_BOUNDS: DesktopBounds = { width: 1440, height: 852 };
export const initialWindowStore: WindowStore = { windows: {}, saved: {}, zCounter: 1 };

export function clampRect(
  rect: Rect,
  bounds: DesktopBounds,
  minWidth: number,
  minHeight: number
): Rect {
  const w = Math.min(Math.max(rect.w, minWidth), bounds.width);
  const h = Math.min(Math.max(rect.h, minHeight), bounds.height);
  const x = Math.min(Math.max(rect.x, 80 - w), bounds.width - 80);
  const y = Math.min(Math.max(rect.y, 0), bounds.height - 34);
  return { x, y, w, h };
}

/** 打开窗口时的最终 rect：优先用上次保存的位置，再按当前视口 clamp。 */
export function preferredRect(
  saved: Rect | undefined,
  fallback: Rect,
  bounds: DesktopBounds,
  minWidth: number,
  minHeight: number
): Rect {
  return clampRect(saved ?? fallback, bounds, minWidth, minHeight);
}

type Action =
  | { type: "open"; id: string; rect: Rect }
  | { type: "close"; id: string }
  | { type: "focus"; id: string }
  | { type: "minimize"; id: string }
  | { type: "restore"; id: string }
  | { type: "toggleMaximize"; id: string }
  | { type: "move"; id: string; rect: Rect }
  | { type: "resize"; id: string; rect: Rect }
  | { type: "hydrate"; saved: Record<string, Rect> }
  | { type: "reset" };

export function windowReducer(state: WindowStore, action: Action): WindowStore {
  const z = state.zCounter + 1;
  switch (action.type) {
    case "open": {
      const existing = state.windows[action.id];
      if (existing) {
        return {
          ...state,
          zCounter: z,
          windows: {
            ...state.windows,
            [action.id]: { ...existing, z, minimized: false },
          },
        };
      }
      return {
        ...state,
        zCounter: z,
        windows: {
          ...state.windows,
          [action.id]: {
            id: action.id,
            rect: action.rect,
            restoreRect: null,
            z,
            minimized: false,
            maximized: false,
          },
        },
      };
    }
    case "close": {
      const current = state.windows[action.id];
      const saved = current
        ? { ...state.saved, [action.id]: current.maximized ? current.restoreRect ?? current.rect : current.rect }
        : state.saved;
      const windows = { ...state.windows };
      delete windows[action.id];
      return { ...state, windows, saved };
    }
    case "focus": {
      const current = state.windows[action.id];
      if (!current || current.z === state.zCounter) return state;
      return { ...state, zCounter: z, windows: { ...state.windows, [action.id]: { ...current, z } } };
    }
    case "minimize": {
      const current = state.windows[action.id];
      if (!current) return state;
      return { ...state, windows: { ...state.windows, [action.id]: { ...current, minimized: true } } };
    }
    case "restore": {
      const current = state.windows[action.id];
      if (!current) return state;
      return { ...state, zCounter: z, windows: { ...state.windows, [action.id]: { ...current, minimized: false, z } } };
    }
    case "toggleMaximize": {
      const current = state.windows[action.id];
      if (!current) return state;
      if (current.maximized) {
        return { ...state, windows: { ...state.windows, [action.id]: { ...current, maximized: false, rect: current.restoreRect ?? current.rect, restoreRect: null } } };
      }
      return { ...state, windows: { ...state.windows, [action.id]: { ...current, maximized: true, restoreRect: current.rect } } };
    }
    case "move":
    case "resize": {
      const current = state.windows[action.id];
      if (!current || current.maximized) return state;
      return {
        ...state,
        windows: { ...state.windows, [action.id]: { ...current, rect: action.rect } },
        saved: { ...state.saved, [action.id]: action.rect },
      };
    }
    case "hydrate":
      return { ...state, saved: { ...state.saved, ...action.saved } };
    case "reset":
      return { ...initialWindowStore };
    default:
      return state;
  }
}
```

- [ ] **Step 4: 扩展应用注册表**

在 `src/config/apps.ts` 增加 `AppKind`、`WindowRect`、`WindowConfig`，给每个应用补 `kind`、`keywords`；窗口型应用按设计文档 §5.1 补 `window`：

| id | 默认 rect | min |
|---|---|---|
| terminal | 320,120,760,440 | 420×280 |
| life | 24,32,520,620 | 420×360 |
| gallery | 560,48,640,560 | 420×320 |
| projects | 180,72,880,560 | 560×360 |
| snippets | 320,96,760,520 | 520×360 |
| about | 720,96,520,600 | 400×360 |
| more | 240,160,400,320 | 320×240 |
| assistant | 360,120,720,520 | 420×320 |

`terminal`、`more`、`assistant` 的 `kind: "window"`、`path: null`；`more.launcher` 改为 `true`。`notes/shelf/playlist/letters/journal/friends/login/write/admin/style` 为 `kind: "route"`。同时按设计文档 §4.4 把 `friends.launcher`、`settings.launcher` 改为 `true`（`settings` 仍无 path，由 `Launcher` 打开系统菜单）；`write/admin/login/style` 不进启动器（账号区/开发环境）。新增：

```ts
export function findAppById(id: string): AppDefinition | undefined {
  return apps.find((app) => app.id === id);
}
export const desktopTileApps = apps.filter((app) => app.desktop);
export const launcherApps = apps.filter((app) => app.launcher);
```

更新 `scripts/apps.test.mjs`：桌面图标期望 12 个（顺序不变），阶段 1 的“9 个”断言删除；启动器允许无 path 的应用，并断言 `terminal/more/assistant/settings` 在其中，`friends` 的 `launcher` 为 true；`publicApps` 仍只含 path 非空的应用。

- [ ] **Step 5: 运行测试** — `node --test scripts/apps.test.mjs scripts/window-state.test.mjs`，Expected: apps 5 pass、window 7 pass。
- [ ] **Step 6: 提交** — `git add src/config/apps.ts src/components/desktop/window-state.ts scripts/apps.test.mjs scripts/window-state.test.mjs package.json && git commit -m "feat(window): 应用注册表扩展与纯窗口 reducer"`

---

### Task 2: 窗口管理器、运行时上下文与 Window 组件

**Files:** Create `src/components/desktop/use-window-manager.ts`、`desktop-runtime.tsx`、`window.tsx`、`global-windows.tsx`；Modify `globals.css`。

**Interfaces:**
- `useWindowManager(): { store; boundsRef; bounds; openApp(id); close(id); focus(id); minimize(id); restore(id); toggleMaximize(id); move(id, rect); resize(id, rect); resetLayout() }`
- `<DesktopRuntimeProvider value={runtime}>` + `useDesktopRuntime()`
- `<Window state app focused onFocus onClose onMinimize onToggleMaximize onMove onResize>{children}</Window>`

- [ ] **Step 1: 实现 `use-window-manager.ts`**

要点（完整实现）：

```ts
"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { findAppById } from "@/config/apps";
import {
  DEFAULT_BOUNDS,
  WINDOW_STORAGE_KEY,
  initialWindowStore,
  preferredRect,
  windowReducer,
  type Rect,
  type DesktopBounds,
} from "./window-state";

export function useWindowManager() {
  const router = useRouter();
  const pathname = usePathname();
  const [store, dispatch] = useReducer(windowReducer, initialWindowStore);
  const boundsRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<DesktopBounds>(DEFAULT_BOUNDS);

  // 只恢复位置/尺寸；开合状态不恢复
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WINDOW_STORAGE_KEY) ?? "{}");
      if (saved && typeof saved === "object") dispatch({ type: "hydrate", saved });
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify(store.saved)); } catch {}
  }, [store.saved]);

  useEffect(() => {
    const node = boundsRef.current;
    if (!node) return;
    const update = () => setBounds({ width: node.clientWidth, height: node.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const openApp = useCallback((id: string) => {
    const app = findAppById(id);
    if (!app) return;
    if (app.kind === "route") {
      if (app.path) router.push(app.path);
      return;
    }
    if (pathname !== "/") {
      router.push(app.path ?? `/?open=${id}`);
      return;
    }
    const config = app.window;
    if (!config) return;
    const rect = preferredRect(
      store.saved[id],
      config.defaultRect,
      bounds,
      config.minWidth,
      config.minHeight
    );
    dispatch({ type: "open", id, rect });
  }, [bounds, pathname, router, store.saved]);

  const close = useCallback((id: string) => dispatch({ type: "close", id }), []);
  const focus = useCallback((id: string) => dispatch({ type: "focus", id }), []);
  const minimize = useCallback((id: string) => dispatch({ type: "minimize", id }), []);
  const restore = useCallback((id: string) => dispatch({ type: "restore", id }), []);
  const toggleMaximize = useCallback((id: string) => dispatch({ type: "toggleMaximize", id }), []);
  const move = useCallback((id: string, rect: Rect) => dispatch({ type: "move", id, rect }), []);
  const resize = useCallback((id: string, rect: Rect) => dispatch({ type: "resize", id, rect }), []);
  const resetLayout = useCallback(() => {
    dispatch({ type: "reset" });
    try { localStorage.removeItem(WINDOW_STORAGE_KEY); } catch {}
  }, []);

  return { store, boundsRef, bounds, openApp, close, focus, minimize, restore, toggleMaximize, move, resize, resetLayout };
}
```

- [ ] **Step 2: 实现运行时上下文**

`desktop-runtime.tsx`：

```tsx
"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { useWindowManager } from "./use-window-manager";
import type { useDesktopSettings } from "./use-desktop-settings";

type WindowManager = ReturnType<typeof useWindowManager>;
type Settings = ReturnType<typeof useDesktopSettings>;

export interface DesktopRuntime {
  windows: WindowManager;
  settings: Settings;
  openSpotlight: () => void;
  openSettings: () => void;
  openTerminal: () => void;
  openAssistant: () => void;
}

const DesktopRuntimeContext = createContext<DesktopRuntime | null>(null);

export function DesktopRuntimeProvider({ value, children }: { value: DesktopRuntime; children: ReactNode }) {
  return <DesktopRuntimeContext.Provider value={value}>{children}</DesktopRuntimeContext.Provider>;
}

export function useDesktopRuntime() {
  const runtime = useContext(DesktopRuntimeContext);
  if (!runtime) throw new Error("useDesktopRuntime must be used inside DesktopShell");
  return runtime;
}
```

- [ ] **Step 3: 实现 `window.tsx`**

必须实现的行为：
- props：`state: WindowState`、`app: AppDefinition`、`focused: boolean`、`onFocus`、`onClose`、`onMinimize`、`onToggleMaximize`、`onMove(rect)`、`onResize(rect)`、`children`。
- 根节点 `.os-window`，`style={{ left, top, width, height, zIndex }}`；最大化时 `inset: 0`（用 `data-maximized` + CSS）。
- 标题栏：`aria-labelledby` 的标题 id（`useId`）；左侧 `AppIcon` + 应用名 + `~/life` 路径；右侧 `↗`（仅 app.path）、`—`、`□`、`×`。
- 拖拽：标题栏 `onPointerDown` 忽略按钮/链接；`setPointerCapture`；move 时 `el.style.transform = translate3d(dx,dy,0)`；up 时 `onMove({...rect,x+dx,y+dy})` 并清 transform。最大化时禁用。
- 缩放：右下角 `.os-window-resize`，pointerdown 记录起点；move 更新 `el.style.width/height`；up 调用 `onResize`。最小尺寸来自 `app.window`。
- clamp：拖拽/缩放松手提交前调用 `clampRect`（min 来自 app.window，bounds 来自窗口层），保证至少 80px 标题栏留在视口内；最大化时禁用拖拽/缩放。
- 双击标题栏 `onToggleMaximize`；`onPointerDown` 冒泡调用 `onFocus`。
- 控件全部是 `button`/`Link`，有 `aria-label`；关闭按钮 hover `--danger`。
- 窗口内容 `.os-window-body` 独立滚动。
- 打开动画 class `.is-open`；减少动效时无。

- [ ] **Step 4: 实现 `global-windows.tsx`**

```tsx
"use client";
// 渲染 terminal / assistant 两个全局窗口；内容由 TerminalWindow / AssistantWindow 提供
export function GlobalWindows({ aiEnabled }: { aiEnabled: boolean }) {
  const { windows } = useDesktopRuntime();
  return (
    <>
      {windows.store.windows.terminal && <TerminalWindowHost />}
      {windows.store.windows.assistant && <AssistantWindowHost aiEnabled={aiEnabled} />}
    </>
  );
}
```
（TerminalWindowHost/AssistantWindowHost 在 Task 4/5 创建；本任务可先渲染 `null` 占位并在 Task 4/5 接入，避免提前引用未定义模块。Task 4/5 会替换此文件。不要留下永久占位。）

- [ ] **Step 5: 追加窗口 CSS**

在 `globals.css` 末尾追加 `.os-window*`：窗口本体、标题栏 34px、活动琥珀线、控件 24×24、内容独立滚动、右下角 resize 手柄 16px（触屏 24px）、最大化/最小化/打开动画、`prefers-reduced-motion` 与 `prefers-reduced-transparency` 降级。窗口阴影按设计文档 §2.5 的暗/亮值，用 `html.dark` 与 `[data-wallpaper="paper"]` 区分。

- [ ] **Step 6: 类型检查** — `npm run type-check`，Expected 0。
- [ ] **Step 7: 提交** — `git add src/components/desktop/use-window-manager.ts src/components/desktop/desktop-runtime.tsx src/components/desktop/window.tsx src/components/desktop/global-windows.tsx src/app/globals.css && git commit -m "feat(window): 窗口管理器、运行时上下文与窗口框"`

---

### Task 3: 桌面主屏接入窗口、任务栏与键盘

**Files:** Modify `src/components/desktop/desktop-shell.tsx`、`desktop-home.tsx`、`taskbar.tsx`、`launcher.tsx`、`system-menu.tsx`、`src/app/(site)/layout.tsx`、`src/app/(site)/page.tsx`、`src/app/globals.css`。

**Interfaces:**
- `DesktopShell` props 增加 `notes: {slug,title}[]`、`aiEnabled: boolean`。
- `DesktopHome` 改为客户端组件，接收 `status`、`windowContent: Record<string, ReactNode>`、`statusWidget`、`stickyNote`、`deskObjects` 插槽。
- `Taskbar` 从 `useDesktopRuntime()` 读取窗口与 open/restore/focus。

- [ ] **Step 1: 改造 `DesktopShell`**

```tsx
"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useWindowManager } from "./use-window-manager";
import { useDesktopSettings } from "./use-desktop-settings";
import { DesktopRuntimeProvider } from "./desktop-runtime";
import { GlobalWindows } from "./global-windows";
import { Taskbar } from "./taskbar";
import { Wallpaper } from "./wallpaper";

const SearchPalette = dynamic(() => import("@/components/search/search-palette").then((m) => m.SearchPalette), { ssr: false });

export function DesktopShell({ accountMenu, hasFriends, notes, aiEnabled, children }: {...}) {
  const windows = useWindowManager();
  const settings = useDesktopSettings();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openTerminal = useCallback(() => windows.openApp("terminal"), [windows]);
  const openAssistant = useCallback(() => windows.openApp("assistant"), [windows]);
  const openSpotlight = useCallback(() => setSpotlightOpen(true), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "`" && !typing) { event.preventDefault(); openTerminal(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSpotlight(); }
    };
    const onOpenSearch = () => openSpotlight();
    const onOpenTerminal = () => openTerminal();
    window.addEventListener("keydown", onKey);
    window.addEventListener("blog:open-search", onOpenSearch);
    window.addEventListener("blog:open-terminal", onOpenTerminal);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blog:open-search", onOpenSearch);
      window.removeEventListener("blog:open-terminal", onOpenTerminal);
    };
  }, [openSpotlight, openTerminal]);

  const runtime = useMemo(() => ({ windows, settings, openSpotlight, openSettings, openTerminal, openAssistant }), [windows, settings, openSpotlight, openSettings, openTerminal, openAssistant]);

  return (
    <DesktopRuntimeProvider value={runtime}>
      <div className="os-shell">
        <Wallpaper />
        <main className="os-main">{children}</main>
        <GlobalWindows aiEnabled={aiEnabled} />
        <Taskbar accountMenu={accountMenu} hasFriends={hasFriends} onOpenSettings={openSettings} />
        {spotlightOpen && <SearchPalette notes={notes} onClose={() => setSpotlightOpen(false)} />}
        <noscript>…沿用阶段 1 的列表…</noscript>
      </div>
    </DesktopRuntimeProvider>
  );
}
```

`(site)/layout.tsx`：读取 `getAllNotes()` 的 slug/title，`chatEnabled`，传给 `DesktopShell`。

- [ ] **Step 2: 重写 `DesktopHome`**

要求：
- 首页服务端 `(site)/page.tsx` 构造 `windowContent`：
  - `life`：最近 12 条生活流的紧凑版（Phase 3 替换为 TagFilter 版本；Phase 2 先复用 `Moment` + 主脊线，限制 12 条，底部「全部日志 →」）。
  - `gallery`：Phase 2 先显示真实图片缩略图或“去相册”链接；Phase 3 替换。
  - `projects`：Phase 2 先渲染 `projects` 列表卡片；Phase 3 替换为 Kanban。
  - `snippets`：Phase 2 先显示片段标题列表；Phase 3 替换。
  - `about`：Phase 2 紧凑档案卡；Phase 3 替换。
  - `more`：更新日志、友链（非空）、RSS、GitHub、设置按钮（打开系统菜单）。
- 客户端 `DesktopHome`：
  - 12 个图标，`button`/`Link` 混合；窗口型应用用 `button`，路由型用 `Link`（无 JS 可跳转）。
  - 单击选中（`selectedId`），双击打开；触屏 `pointerType === "touch"` 单击打开；`Enter`/`Space` 打开。
  - `Tab` 焦点；方向键在 3 列网格移动（左右 ±1，上下 ±3，边界 clamp）。
  - 图标 `title`/tooltip 400ms（可用 `title` 属性作为最小实现，后续可做自定义 tooltip）。
  - 窗口层 `ref={windows.boundsRef}`，渲染 `store.windows` 中非 minimized 的窗口；每个窗口内容用 `windowContent[id]`。
  - 首次提示：`按 \` 打开终端 · ⌘K 搜索 · 双击图标打开`，打开任一窗口/终端后写入 `z-os:hint` 并消失。
  - 点击空白取消选中；`Esc` 关闭聚焦窗口（由 Window/Taskbar 处理）。
  - 移动端：图标直接打开（路由型跳转，窗口型调用 `openApp`，窗口型在移动端应跳转 `app.path`，无窗口）。
  - 插入 `statusWidget`、`stickyNote`、`deskObjects` 插槽（Phase 3 填充）。
- `?open=` 支持：`useEffect` 读取 `window.location.search`，对 `open` 参数调用 `windows.openApp`，然后 `history.replaceState` 清理。

- [ ] **Step 3: 任务栏显示窗口**

`Taskbar`：
- 从 `useDesktopRuntime()` 拿 `windows.store.windows`。
- 左侧 Z 后渲染当前路由应用 + 所有打开窗口（最多 180px 截断），活动窗口底部 2px 琥珀线，最小化降透明度。
- 点击窗口项：若当前路由不是 `/`，`router.push("/")`；随后 `windows.restore(id)`/`focus(id)`。
- 系统菜单 `onOpenSettings` 打开设置面板（Phase 4 完整；Phase 2 先复用 `SystemMenu` 的桌面段）。
- 打开启动器时用 `launcherApps`，`Launcher` 增加 `onOpen(id)`：`settings` 调用 `runtime.openSettings()`，窗口型调用 `openApp`，路由型 `router.push`。`Launcher` 的 `apps` 类型改为 `AppDefinition[]`（不再要求 `path` 非空）。

- [ ] **Step 4: 更新阶段 1 测试**

`scripts/apps.test.mjs` 的 12 图标顺序不变；确保 `desktopTileApps` 不再只含 9 个。`npm test` 全绿。

- [ ] **Step 5: 手动验收** — 1440×900：双击日志/项目/片段/关于/更多/终端/助理；拖拽、缩放、最大化、最小化、关闭；点任务栏恢复；去 `/notes` 再回 `/` 窗口仍在；`Esc` 关聚焦窗口；刷新后位置保留、窗口不自动打开；减少动效下无窗口动画。
- [ ] **Step 6: 提交** — `git add ... && git commit -m "feat(window): 桌面图标开窗与任务栏窗口切换"`

---

### Task 4: 终端（命令纯函数 + 浮窗）

**Files:** Create `src/components/terminal/commands.ts`、`terminal-window.tsx`、`scripts/terminal-commands.test.mjs`；Modify `global-windows.tsx`、`package.json`、`globals.css`。

**Interfaces:**
- `type TerminalEffect = { type: "clear" } | { type: "close" } | { type: "open"; appId: string } | { type: "ask"; question: string } | { type: "theme"; preset: DesktopPreset } | { type: "coffee" }`
- `interface TerminalContext { apps: {id,title,path,kind}[]; notes: {slug,title}[]; snippets: {id,title,language}[]; theme: DesktopPreset; uptimeDays: number; aiEnabled: boolean }`
- `runCommand(input: string, ctx: TerminalContext): { lines: string[]; effect?: TerminalEffect }`
- `completeCommand(prefix: string, ctx): string[]`

- [ ] **Step 1: 写 `scripts/terminal-commands.test.mjs`**，覆盖：`help` 含分组；`ls` 含 apps/notes 数量；`apps` 列出 id/名称；`posts` 列出 slug/标题；`snippets`；`open life` effect open；`open note-slug`；`open unknown` 错误；`theme paper` effect；`theme bad` 错误；`ask 什么是 RAG` effect ask；`whoami`/`date`/`uptime`/`neofetch` 真实字段；`coffee` effect；`sudo`/`rm -rf /`/`vim` 无害；`clear`/`exit`；未知命令提示。
- [ ] **Step 2: 运行测试确认失败**。
- [ ] **Step 3: 实现 `commands.ts`**，完全按测试和设计文档 §6.1 的命令表；`neofetch` 输出 `OS: Z·OS`、`Host: 杭州`、`Uptime: 建站 N 天`、`Stack: Next.js 16 / React 19 / PostgreSQL`、`Apps: 12`、`Notes: N`、`Theme: ...`、`AI: 已配置/未配置`、`Shell: zsh (simulated)`。`open` 先匹配 app id，再 note slug，再 snippet id。
- [ ] **Step 4: 实现 `terminal-window.tsx`**：
  - 作为 `Window` 的 children，标题 `zsh — guest@z-os`；等宽 13px；琥珀提示符 `guest@z-os ~ %`。
  - 行类型 input/output/error/hint；欢迎语逐字（≤600ms，reduced-motion 直接显示）；历史 ↑/↓；Tab 补全；Ctrl+L 清屏；Esc 关闭（Window 层处理）。
  - 输入框自动聚焦；输出区滚动到底部；`coffee` 触发 dispatch `z-os:coffee` 自定义事件（桌面杯子监听，Phase 3）。
  - `ask` 调用 runtime.openAssistant + `z-os:ask` 事件携带问题（助理监听）。
  - `theme` 调用 settings.setPreset；`open` 调用 windows.openApp 或 router.push。
- [ ] **Step 5: 在 `GlobalWindows` 渲染终端窗口**：state 为 `windows.store.windows.terminal`，用 `<Window app={terminalApp} ...>` 包 `<TerminalWindow />`；最小化/最大化可用，关闭后 state 删除。`Esc` 关闭聚焦窗口。
- [ ] **Step 6: 测试与提交** — `node --test scripts/terminal-commands.test.mjs`（预计 8+ pass）；`git commit -m "feat(terminal): 命令表与终端浮窗"`。

---

### Task 5: Spotlight 与终端式助理

**Files:** Rewrite `src/components/search/search-palette.tsx`；Create `src/components/assistant/assistant-window.tsx`；Modify `global-windows.tsx`、`desktop-shell.tsx`、`globals.css`；Test `scripts/search-local.test.mjs`（可选，若抽纯函数）。

**Interfaces:**
- `SearchPalette({ notes, onClose })`；`notes: {slug,title,tags}[]`。
- `AssistantWindow({ aiEnabled, initialQuestion? })`。
- 事件：`z-os:ask`（detail `{question}`）、`z-os:coffee`、`z-os:open-app`（detail `{id}`）。

- [ ] **Step 1: 重写 Spotlight**
  - 用 `cmdk`；`⌘K`/`Ctrl+K` 由 DesktopShell 打开；输入 200ms 防抖调用 `/api/search?q=`（只查 notes），本地过滤 apps（`title/keywords/id`）与 snippets（`title/tags/id`）。
  - 分组顺序：应用 / 笔记 / 代码片段；无结果文案「没有找到。试试直接问助理。」+ 打开助理按钮。
  - ↑/↓/Enter/Esc；应用结果 `runtime.openApp`；笔记 `router.push("/notes/"+slug)`；片段 `router.push("/snippets?s="+id)`（Phase 3 页面）。
  - 面板 640px、顶部 18%、`--window` 95% + 1px `--rule` + blur(14px)；`role="dialog" aria-modal="true"`；焦点自动进输入框；关闭归还焦点；减少透明时纯色。
  - 动态导入已在 DesktopShell，首屏不加载 cmdk。
- [ ] **Step 2: 创建助理窗口**
  - `useChat` + `/api/chat`；`messages` 渲染：用户 `> 问题`，助理 `· 文本`；引用来源 `data-sources` 渲染为 `[1]` 琥珀链接，点击 `onClose` + `router.push(`/notes/${slug}#${anchor}`)`（无 anchor 时 `/notes/${slug}`）。
  - 流式；停止按钮；清空；建议问题 3 个；AI 未配置显示 `AI 未配置：在 .env 填 AI_API_KEY`，不显示输入框。
  - 无头像、无气泡、无 Sparkles；错误行 `! 请求失败：...`。
  - `z-os:ask` 事件：打开助理并发送问题。
- [ ] **Step 3: 在 `GlobalWindows` 渲染助理**，`aiEnabled` 由 layout 传入。
- [ ] **Step 4: 手动验收** — `⌘K` 搜索应用/笔记/片段；终端 `ask` 打开助理并发送；AI 未配置文案；引用点击跳笔记；Esc 关闭；焦点归还；减小透明时面板纯色。
- [ ] **Step 5: 提交** — `git commit -m "feat(search): Spotlight 与终端式助理"`

---

### Task 6: 阶段 2 收口

- [ ] `npm run type-check`、`npm run lint`、`npm test`、`npm run build` 全绿。
- [ ] 1440×900 打开 4 个窗口拖动，无明显掉帧；首屏 shell/总 JS 记录数值。
- [ ] 无 JS：图标链接/`<noscript>` 完整；终端/助理/启动器不工作但不影响阅读。
- [ ] 减少动效/透明度：无窗口动画/柔光/闪烁，菜单纯色。
- [ ] 删除阶段 1/2 产生的死代码；确保 `search-palette` 不再被静态导入。
- [ ] 提交 `chore(window): 阶段 2 验收与清理`。

## 阶段 2 完成标准

- 12 个桌面图标全部可用；窗口可拖/缩/最小化/最大化/关闭/置顶；任务栏切换；路由切换保持开合。
- 终端命令表、历史、Tab 补全、Ctrl+L、Esc，`neofetch` 全真实。
- Spotlight 分组搜索、键盘操作、懒加载。
- 助理流式、引用、停止、清空、未配置状态；无 AI 气泡/头像/星芒。
- `npm test` 包含窗口 reducer 与终端命令；全量构建通过。

## 明确不在阶段 2

- 日志标签/钉选、胶囊、看板、片段内容页、关于页、状态组件、便签、桌面物件（阶段 3）。
- 右键菜单、设置面板完整项、错误页、最终清理（阶段 4）。
