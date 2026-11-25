# Personal Dev OS 阶段 4：桌面交互、设置、移动端与交付 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把桌面操作系统的手感补完整：右键菜单、设置面板、更多文件夹、移动端 dock、错误页、焦点管理；清理旧壳与旧配色，跑全量验证并交付可验收的分支。

**Architecture:** 右键菜单只在桌面背景出现，复用 `DesktopRuntime` 的 openApp/settings；设置仍只在系统菜单里，不新增路由。移动端不模拟窗口，改为 4 列主屏 + 56px dock + 全屏应用。错误页用终端窗口风格。最后做一次全仓库死代码/旧 token 扫描和真实构建验收。

**Tech Stack:** React 19、pointer/contextmenu events、现有 `useDesktopSettings`/`useWindowManager`、Next.js `not-found.tsx`/`error.tsx`、Playwright/Chrome DevTools 截图。

## Global Constraints

- 继承阶段 1–3 全部约束；不新增依赖（焦点限制手写，不引 focus-trap 库）。
- 右键菜单只在 `(pointer: fine)` 且桌面背景触发；窗口/图标自己的右键不被劫持。
- 设置面板只放：三套预设、桌面物件开关、重置窗口布局、系统链接、账号；不提供动效开关（跟随系统 `prefers-reduced-motion`）。
- 重置布局 = 关闭所有窗口 + 清空 `z-os:windows`；不删除 `z-os:settings`（预设/物件偏好保留）。
- 移动端 56px dock；触控目标 ≥44px；不渲染窗口层；应用全屏；桌面物件和便签隐藏，状态改为普通卡片。
- 404/错误页不出现内部堆栈、数据库信息、密钥；错误页提供重试和回桌面。
- 清理后不得残留旧导航（`siteConfig.nav`/`footerNav`）、`next-themes`、旧 `--paper-*`/`--amber` token、蓝紫渐变/语法主题。
- 最终不合并 main、不创建 PR；分支留给用户验收。
- 所有验证命令的真实输出写进最终报告，不写「应该通过」。

## 文件结构

**新建**

| 文件 | 职责 |
|---|---|
| `src/components/desktop/context-menu.tsx` | 桌面右键菜单 |
| `src/components/desktop/mobile-dock.tsx` | 移动端 56px dock |
| `src/components/desktop/more-window.tsx` | 更多文件夹窗口内容 |
| `src/lib/focus-trap.ts` | 手写焦点限制/归还 hook |
| `src/app/not-found.tsx` | 404 终端页 |
| `src/app/error.tsx` | 运行时错误页 |
| `src/app/global-error.tsx` | 根错误兜底 |

**修改**

`src/components/desktop/desktop-shell.tsx`、`desktop-home.tsx`、`taskbar.tsx`、`system-menu.tsx`、`global-windows.tsx`、`src/app/(site)/page.tsx`、`src/app/(site)/style/page.tsx`、`src/app/icon.tsx`、`src/app/notes/[slug]/opengraph-image.tsx`、`src/config/changelog.ts`、`src/app/sitemap.ts`、`src/app/globals.css`、`package.json`（仅 test 清单）、`.superpowers/sdd/progress.md`。

---

### Task 1: 右键菜单、设置面板、更多文件夹与移动端 dock

**Files:** Create `context-menu.tsx`、`mobile-dock.tsx`、`more-window.tsx`、`focus-trap.ts`；Modify `desktop-shell.tsx`、`desktop-home.tsx`、`taskbar.tsx`、`system-menu.tsx`、`src/app/(site)/page.tsx`、`globals.css`。

**Interfaces:**
- `<ContextMenu x y onClose onOpenApps onOpenTerminal onOpenSettings />`
- `<MobileDock />`，4 个链接：`/life`、`/projects`、`/gallery`、`/snippets`，加当前路由高亮。
- `<MoreWindow hasFriends />`：更新日志、友链（仅非空）、RSS、GitHub、打开设置。
- `useFocusTrap(ref, active, onClose)`：Tab 循环、Esc、恢复原焦点。

- [ ] **Step 1: 写焦点限制 hook**
  - `useFocusTrap(containerRef, active, onClose)`：active 时记录 `document.activeElement`，`focusin` 把焦点拉回容器；`keydown` 的 Tab 在首尾循环，Esc 调用 `onClose`；cleanup 恢复焦点。
  - 只用于 Spotlight、右键菜单、lightbox、系统菜单等 `aria-modal` 面板；窗口本体不限制焦点。
- [ ] **Step 2: 右键菜单**
  - `DesktopHome` 根节点 `onContextMenu`：仅当 `event.target === event.currentTarget`（桌面背景）或目标带 `data-desktop-bg` 时 `preventDefault`，设置 `{x,y}`；窗口/图标/物件不触发。
  - 菜单 220px，`position: fixed`，坐标 clamp 到视口；`role="menu"`；项：三套预设（当前项 ✓）、打开终端、全部应用、关于本机；`aria-label`。
  - Esc / 点击外部 / 选择后关闭；焦点进第一项；`Shift+F10` 或 ContextMenu 键在桌面焦点时打开（x=48,y=48 兜底）。
  - `pointer: coarse` 下不渲染。
  - 预设调用 `settings.setPreset`；终端 `runtime.openTerminal()`；全部应用 dispatch `z-os:open-launcher`（Taskbar 监听）；关于 `router.push("/about")`。
- [ ] **Step 3: 设置面板**
  - `SystemMenu` 增加「桌面物件」开关（`aria-pressed`，`setObjects`）、「重置窗口布局」按钮（`windows.resetLayout()` + `onClose`）、「打开终端」。
  - 面板宽度 280px，分组：桌面 / 系统 / 账号；不增加动效开关；重置后 toast 式一行「已重置，窗口已关闭」2 秒。
  - 任务栏 Z 菜单按钮保持现有打开方式；启动器底部「系统设置」打开同一个菜单（事件 `z-os:open-system-menu`）。
- [ ] **Step 4: 更多文件夹窗口**
  - `(site)/page.tsx` 的 `windowContent.more` 渲染 `MoreWindow`：更新日志（最近 5 条 `changelog`）、友链（`friends` 非空才显示）、`RSS`、`GitHub`、`关于本机`、`打开设置`（事件）。
  - 窗口 400×320；列表行高 ≥44px；外部链接 `rel="noreferrer noopener"`。
- [ ] **Step 5: 移动端 dock**
  - `DesktopShell` 渲染 `<MobileDock />`（`md:hidden`）；四列等分，56px，玻璃底；图标 20px + 10px 标签；当前路由 `aria-current="page"` 琥珀色；安全区 `padding-bottom: env(safe-area-inset-bottom)`。
  - 移动端隐藏 `.os-window-layer`、便签、状态组件、桌面物件；首页移动布局只保留身份、4 列 12 图标、最近日志卡、状态卡、便签卡（若有）。
  - 触屏点击图标直接打开：窗口型应用在移动端改走 `app.path`（`/life` 等），不创建窗口；`terminal`/`assistant` 在移动端打开全屏覆盖（`position: fixed; inset: 0`）或提示「桌面端可用」——选择全屏覆盖，终端/助理仍可用。
- [ ] **Step 6: 手动验收** — 右键桌面出现菜单，窗口上右键不出现；预设切换立即生效；桌面物件开关隐藏/显示；重置关闭所有窗口；移动端 4 个 dock 项可达，图标不溢出，触控目标 ≥44px。
- [ ] **Step 7: 提交** — `git commit -m "feat(desktop): 右键菜单、设置面板与移动端 dock"`

---

### Task 2: 404、错误页、焦点与无障碍收口

**Files:** Create `src/app/not-found.tsx`、`src/app/error.tsx`、`src/app/global-error.tsx`；Modify `search-palette.tsx`、`context-menu.tsx`、`gallery-view.tsx`、`system-menu.tsx`、`globals.css`。

- [ ] **Step 1: 404**
  - 终端风格：`zsh — 404`、`guest@z-os ~ % open /missing`、`zsh: no such file or directory: /missing`、`提示：回到桌面`。
  - `<Link href="/">← 返回桌面</Link>` + `<Link href="/notes">浏览笔记</Link>`；`metadata` title「404 · 页面不存在」；不显示堆栈。
- [ ] **Step 2: error.tsx**
  - `"use client"`；接收 `error, reset`；显示 `! 系统错误` + `error.digest`（仅有则显示）+「重试」按钮 +「回桌面」链接；`console.error` 记录；不显示 message 内部细节。
- [ ] **Step 3: global-error.tsx**
  - 最小 HTML（`html/body`），同样终端风格，`reset`；不依赖 token（根布局失败时 CSS 可能没加载），用内联深色/琥珀样式。
- [ ] **Step 4: 焦点与 aria**
  - Spotlight、右键菜单、lightbox、系统菜单全部用 `useFocusTrap`；关闭后焦点回触发按钮/任务栏项。
  - 窗口打开时焦点进窗口标题栏（`tabIndex={-1}`），关闭后回任务栏对应项；`Esc` 只关最上层（Spotlight > lightbox > 窗口）。
  - 终端输出 `role="log" aria-live="polite"`；图标网格 `role="list"`/`listitem` 不破坏链接语义（用 `ul/li` + 链接）。
  - 跳过链接：`<a href="#os-main" className="sr-only focus:not-sr-only">跳到主内容</a>`。
- [ ] **Step 5: 减少透明度/动效**
  - `@media (prefers-reduced-transparency: reduce)` 下任务栏、启动器、系统菜单、Spotlight、便签全部纯色，无 `backdrop-filter`。
  - `@media (prefers-reduced-motion: reduce)` 下窗口打开/图标 stagger/打字机/鼠标光晕/物件浮动全部停止；`scroll-behavior: auto`。
- [ ] **Step 6: 键盘走查** — Tab 能到所有图标和任务栏；方向键在 3 列网格移动；Enter/Space 打开；⌘K/` 打开覆盖层；Esc 逐层关闭；焦点不丢。
- [ ] **Step 7: 提交** — `git commit -m "feat(a11y): 错误页、焦点管理与减少动效"`

---

### Task 3: 旧壳清理、配色收口与最终验证

**Files:** Delete old shell files; Modify `src/app/icon.tsx`、`src/app/notes/[slug]/opengraph-image.tsx`、`src/config/changelog.ts`、`src/app/(site)/style/page.tsx`、`src/app/sitemap.ts`、`package.json`、`.superpowers/sdd/progress.md`。

- [ ] **Step 1: 删除旧壳**
  - 删除：`src/components/site/navbar.tsx`、`footer.tsx`、`reveal.tsx`、`local-clock.tsx`、`src/components/theme-toggle.tsx`、`src/components/terminal/terminal-palette.tsx`、`terminal-link-button.tsx`、`src/components/chat/chat-widget.tsx`、`open-chat-button.tsx`。
  - `src/components/search/search-palette.tsx` 已在阶段 2 重写，不删；`src/components/site/observ-bar.tsx` 仍用于 `/life`，保留。
  - `rg` 检查无 import 指向已删文件；`siteConfig.nav`/`footerNav` 已删且无引用；`next-themes` 不在 package.json。
- [ ] **Step 2: 旧配色**
  - `src/app/icon.tsx` 改为夜班 token：底 `#0f0e0c`、字 `#d9a05b`；注释同步。
  - `src/app/notes/[slug]/opengraph-image.tsx` 常量改为 `#0f0e0c / #ece6d8 / #a39a8a / #d9a05b / #352f27`；注释说明与 globals 同步。
  - `src/config/changelog.ts` 的 `border-rose/sky/violet/amber` 改为语义 token：fix=`alert`、docs=`info`、refactor=`data`、perf=`warn`、feat=`data`、chore=`muted-foreground`；不出现蓝紫。
  - 全仓 `rg "blue-|indigo-|violet-|purple-|sky-|from-|to-|via-"` 检查；只允许中性/语义 token。
- [ ] **Step 3: 样式走廊与站点地图**
  - `style/page.tsx` 增加窗口框、终端行、标签、状态组件的展示；仍只在开发环境存在；不引入假读数（用 `available:false` 或真实示例并标注示例）。
  - `sitemap.ts` 增加 `/life`、`/gallery`、`/snippets`；保留旧 308 中转站不收录。
- [ ] **Step 4: 全量自动验证**
  - `npm test`（全部脚本 + 新增 3 个测试）→ 记录 pass/fail。
  - `npm run type-check`、`npm run lint`、`npm run build` → 记录输出；构建失败必须修，不许跳过。
  - `node scripts/check-content.mjs` → 记录。
  - `node --test scripts/tokens.test.mjs` → 三套预设 token/对比度/chroma。
- [ ] **Step 5: 真实浏览器验收**
  - 启动 `npm run dev`；用浏览器工具在 1440×900、1280×720、390×844 截图：桌面、启动器、系统菜单、两个窗口、终端、Spotlight、相册 lightbox、看板、/life 过滤、/about。
  - 检查：无横向滚动、无遮挡、便签/状态/物件不重叠、窗口可拖拽、任务栏切换、移动 dock 可达。
  - 无 JS：`curl` 首页确认 `<noscript>` 应用列表与链接存在；`/life`、`/gallery`、`/projects`、`/snippets`、`/about` 直接访问可读。
  - 旧 URL：`curl -I` 检查 `/blog`、`/archives`、`/changelog`、`/guestbook` 仍为 308 且 `Location` 正确。
  - 预算：记录构建输出的 first load JS；shell ≤25KB gzip、总 JS ≤90KB gzip；超标先删依赖/懒加载再复测。
- [ ] **Step 6: 记录与提交**
  - `.superpowers/sdd/progress.md` 追加 Phase 2/3/4 完成情况、遗留 Minor、验证输出摘要。
  - `git add -A` 前确认无 `.next`、无 `node_modules`、无 `.superpowers`；提交 `chore(release): Personal Dev OS 阶段 4 验收与清理`。
  - 不合并 main，不创建 PR；最终报告给出分支、提交范围、验证结果、截图路径和已知 Minor。

## 阶段 4 完成标准

- 右键菜单/设置面板/更多文件夹/移动 dock/404/错误页全部可用。
- Spotlight/lightbox/菜单焦点限制与归还正确；减少动效/透明度生效。
- 旧壳、旧导航、`next-themes`、旧 token、蓝紫配色清理干净。
- 全量测试/类型/lint/构建/内容检查通过；三档截图与无 JS/308 验证有输出。
- 分支 `redesign/dev-os` 保持未合并，交付给用户验收。

## 风险与回退

- **拖拽/缩放性能**：只在 pointerup 提交 reducer，localStorage 只在提交后写；若仍卡顿，降级为标题栏拖动 + 右下角缩放，不做逐帧 React 更新。
- **移动端窗口**：移动端不渲染窗口层；若终端/助理全屏覆盖遮挡 dock，改为路由页或提示桌面端可用。
- **Schema 变更**：`tags` 与 `desktop_pin_moment` 通过 `npm run db:push` 应用；上线前先备份，旧库可空跑新增列（默认 `[]`）。
- **构建预算**：若首屏超 25KB，优先把 Spotlight/助理/终端从 shell 静态 chunk 移出（已动态导入），再检查窗口内容是否被误打包进 shell。
- **无 JS**：所有关键入口保持真实 `<a>`；若某窗口型应用无 JS 无法打开，确保 `<noscript>` 列表提供对应 `/life`、`/projects`、`/gallery`、`/snippets`、`/about` 链接。
