# LeiBox 页面设计与组件收藏调研（2026-11-10）

> **调研日期**：2026-11-10。  
> **调研范围**：公开站点 `https://leibox.pantoria.cn/`（首页、`/components`、文档页、版权页、404 与代表性组件详情页）、公开 CSS/JS bundle、首页导航/主题/语言/减少动效交互、其 README 指向的公开 GitHub 仓库及 raw 源文件、公开 AI catalog。  
> **面向对象**：Z-Blog 中文个人网站「个人开发者工作台 / 潮汐工作台」后续视觉优化。  
> **证据规则**：`[直接观察到]` 表示页面原文、源码、HTTP 响应或浏览器 computed style / DOM 实测；`[设计推断]` 表示由这些事实得到的判断或对本项目的建议。凡未实测的内容不写成事实。  
> **存放位置说明**：仓库已有 `docs/superpowers/specs/`（日期前缀设计规格）、`docs/superpowers/plans/`（实施计划）、`.superpowers/sdd/tmp/`（本地临时工作笔记），但没有「外部设计调研」目录或命名约定。按任务指定回退到 `docs/design-research/2026-11-10-leibox-design-research.md`。来源：[`docs/superpowers/specs/` 文件清单](../../../docs/superpowers/specs/)、[`.superpowers/sdd/tmp/round2-design-and-plan.md`](../../../.superpowers/sdd/tmp/round2-design-and-plan.md)。  
> **边界执行**：本次只写这一份 Markdown；未改代码/CSS/测试/配置，未启动本地预览或 dev server，未连接 `60.205.0.224`，未安装依赖，未提交/推送/合并/建 PR。浏览器仅访问公开参考站；临时截图文件已删除，未作为交付物保留。

---

## 0. 结论先行

1. `[直接观察到]` LeiBox 不是单一「组件库」或页面模板站，而是「个人界面学习、交互实验与设计参考收藏」：官网 `<meta name="description">` 写的是 *“LeiBox is a personal collection of UI inspiration, interaction experiments and design references for learning and research.”*，README 写的是「雷师傅维护的网页组件、交互与动效收藏」；`/docs` 原文是「个人界面学习、交互实验与设计参考收藏」。首页标题为 `LeiBox — UI inspiration and component collection`。来源：[首页 HTML](https://leibox.pantoria.cn/)、[README](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md)、[`/docs`](https://leibox.pantoria.cn/docs)。
2. `[直接观察到]` 它是开源可见、带文档与六框架代码包的 Next.js 站点，但**不是无限制可复用组件库**：`package.json` 为 `private: true`、`"license": "SEE LICENSE IN LICENSE.md"`；`LICENSE.md` 是 **MIT + Commons Clause v1.0**，禁止单独/打包/移植后销售、再许可或再分发组件本身；GitHub API 归类为 `Other / NOASSERTION`。官网与 `COPYRIGHT.md` 都写「仅供学习使用」，第三方设计、图片、字体、商标须逐项核对。来源：[package.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/package.json)、[LICENSE.md](https://raw.githubusercontent.com/leishifu666/LeiBox/main/LICENSE.md)、[COPYRIGHT.md](https://raw.githubusercontent.com/leishifu666/LeiBox/main/COPYRIGHT.md)、[GitHub API](https://api.github.com/repos/leishifu666/LeiBox)、[`/copyright`](https://leibox.pantoria.cn/copyright)。
3. `[直接观察到]` 目录有 **58 个条目**：公开 catalog 按 `discovery.category` 分为 cards 9、input 8、navigation 7、hero 6、background 6、media 4、layout 4、feedback 3、text 3、cursor 3、collaboration 2、data/files/scroll 各 1。57 项列六种框架（React/Vue/Svelte/Solid/Preact/Vanilla），1 项仅 React；12 项标 WebGL 或 WebGL+WebGPU。来源：[`/components`](https://leibox.pantoria.cn/components)、[`public/ai/catalog.json`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json)。
4. `[直接观察到]` 站点本体是克制的**黑白灰单色系统**，而非深青绿或蓝紫渐变：亮色 `--background: lab(100% 0 0)` / `#fff`，`--foreground: lab(2.75381% 0 0)` / `#0a0a0a`，`--radius: .625rem`；暗色 `#0a0a0a` / `#fafafa` / `#171717`。中文正文用 `GeistSans + MiSans VF`，代码用 `GeistMono + MiSans VF`。玻璃导航是 `blur(24px) saturate(1.5)`，主按钮为 44px 高黑底白字胶囊。来源：[bundle `2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)、[`/fonts/misans.css`](https://leibox.pantoria.cn/fonts/misans.css)、浏览器实测选择器 `header`、`h1`、`a[href="/docs"].inline-flex`。
5. `[直接观察到]` 首页不是一屏仪表盘，而是约 **6,779px（1036×906 视口）**的长画廊：居中 hero → 972×432 演示面板 → 多个 829–833px 展示带（虚线分隔）→ 深色 842px 终端 CTA → 409px footer；375px 宽时增至 7,640px。信息密度靠「大留白 + 局部高密度演示」交替，而不是每屏都铺卡片。来源：浏览器实测 `main` / `.landing-hero-demo` / `main section`，[首页](https://leibox.pantoria.cn/)。
6. `[直接观察到]` 首页动态背景是 **Canvas 2D 的极轻粒子层**，不是 WebGL：两个 `canvas[aria-hidden="true"][class*="pointer-events-none"]`，分别覆盖 alpine-lake 图片与深色 CTA；bundle `3jks3s7uzxikm.js` 中 `AmbientParticles` 使用 `getContext("2d")`、65 个 night / 180 个 day 点、GSAP ticker、约 32ms 节流、DPR 限 1.5，并检查 `prefers-reduced-motion`、页面可见性与 IntersectionObserver。组件目录才包含 WebGL/WebGPU 效果。来源：[bundle `3jks3s7uzxikm.js`](https://leibox.pantoria.cn/_next/static/chunks/3jks3s7uzxikm.js)、[`/docs/rendering`](https://leibox.pantoria.cn/docs/rendering)、浏览器 DOM 实测。
7. `[设计推断]` 对当前个人站最有价值的不是搬 58 个特效，而是借三点：**「无边框卡片 + 内容自己形成边界」**、**「一条线/一个局部演示承载记忆点」**、**「长页面的疏密交替」**。直接搬粒子、玻璃、AI 品牌封面、圆点矩阵会撞上用户明确排除的「粒子 / 蓝紫渐变 / 聊天泡泡 / Sparkles / AI 化」清单。
8. `[设计推断]` 最适合「潮汐工作台」的唯一 signature 是 **「北京时间的真实潮汐栏」**：一条贯穿全站的窄水位刻度，只由真实时钟与真实数据驱动，滚动时作为章节定位；不是粒子、不是扫描线、不是假在线/心跳。详见第 9 节。

---

## 1. 一手来源清单与可达性

### 1.1 公开站点页面

| 页面 / 文件 | HTTP 与用途 | 证据 |
|---|---|---|
| [首页](https://leibox.pantoria.cn/) | `[直接观察到]` curl `200 OK`，`Content-Length: 175305`，`Server: nginx`，`Last-Modified: Sun, 08 Nov 2026 18:56:16 GMT`；浏览器 title `LeiBox — UI inspiration and component collection` | curl 响应头；Playwright `https://leibox.pantoria.cn/` |
| [`/components`](https://leibox.pantoria.cn/components) | `[直接观察到]` `200`，260,145 bytes；58 个组件详情链接、中文名称与交互说明 | curl；HTML 解析；Playwright computed style |
| [`/docs`](https://leibox.pantoria.cn/docs) | `[直接观察到]` `200`；简介、安装入口、学习用途说明 | curl/HTML 文本 |
| [`/docs/installation`](https://leibox.pantoria.cn/docs/installation) | `[直接观察到]` `200`；`npx skills add https://leibox.pantoria.cn --skill leibox`；复制代码不等于完成依赖/渲染/键盘/卸载验证 | curl/HTML 文本 |
| [`/docs/rendering`](https://leibox.pantoria.cn/docs/rendering) | `[直接观察到]` `200`；原文「普通 DOM 与 SVG、Canvas 2D 和 WebGL」「遵循系统的减少动态效果设置」 | curl/HTML 文本 |
| [`/docs/mcp`](https://leibox.pantoria.cn/docs/mcp) | `[直接观察到]` `200`，148,474 bytes；首页导航列为「AI 接入」 | curl 响应；[首页 HTML](https://leibox.pantoria.cn/) |
| [`/copyright`](https://leibox.pantoria.cn/copyright) | `[直接观察到]` `200`；学习用途、逐项核对来源、图片/媒体/商标边界、权利人联系 | curl/HTML 文本 |
| [`/privacy`](https://leibox.pantoria.cn/privacy) | `[直接观察到]` `200`；仅确认可达，本报告不以隐私条款作设计结论 | curl 响应 |
| [不存在的测试 URL](https://leibox.pantoria.cn/definitely-missing-page-research-20261110) | `[直接观察到]` `404`，39,140 bytes；不是所有路径都落到组件环游 404 | curl 响应 |
| `?lang=en` | `[直接观察到]` `200` 且字节数与首页相同（175,305）；语言切换由客户端按钮完成：`html[lang]` / `data-locale` 从 `zh-CN`/`zh` 变为 `en`/`en`，URL 不变 | curl；Playwright 点击 `button[aria-label="Switch to English"]` 后 computed DOM |
| [GitHub 仓库页](https://github.com/leishifu666/LeiBox) | `[直接观察到]` `200`；README、LICENSE.md、COPYRIGHT.md、源码树可见 | curl / Playwright 导航目标链接 |
| [`WebFetch` 对首页](https://leibox.pantoria.cn/) | `[直接观察到]` 返回「Unable to verify if domain … is safe to fetch」；是工具安全校验限制，不是站点 404。`WebSearch` 对 `site:leibox.pantoria.cn OR "leibox" "pantoria"` 无相关结果；精确仓库查询才返回 GitHub 仓库页 | WebFetch / WebSearch 实测 |

### 1.2 源码、CSS、JS 与数据文件（均为一手）

- [GitHub 仓库](https://github.com/leishifu666/LeiBox) · [README](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md) · [LICENSE.md](https://raw.githubusercontent.com/leishifu666/LeiBox/main/LICENSE.md) · [COPYRIGHT.md](https://raw.githubusercontent.com/leishifu666/LeiBox/main/COPYRIGHT.md) · [package.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/package.json) · [components.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/components.json)。
- [`src/data/component-catalog.ts`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/src/data/component-catalog.ts)：`COMPONENT_CATALOG` 由 `INTERACTION_PREVIEWS`（`kind: "interaction"`）与 `COMPONENTS`（`kind: "canvas"`）合并。
- [`public/ai/catalog.json`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json)：`schemaVersion: 1`，`items: 58`，含每项的 `frameworks`、`renderers`、`source`、`distribution`、`discovery`。
- [`public/ai/SKILL.md`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/SKILL.md) · [`integrations/skills/leibox/SKILL.md`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/integrations/skills/leibox/SKILL.md) · [`scripts/build-registry.mts`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/scripts/build-registry.mts)：AI 检索与 shadcn registry 构建入口。
- [`GitHub API repo metadata`](https://api.github.com/repos/leishifu666/LeiBox) · [`GitHub tree API`](https://api.github.com/repos/leishifu666/LeiBox/git/trees/main?recursive=1)：public、main、`NOASSERTION`、文件树；Windows curl 首次因 `CRYPT_E_NO_REVOCATION_CHECK` 失败，加 `--ssl-no-revoke` 后读取成功。
- 首页 CSS：[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)、[`3emxx0wqex-8t.css`](https://leibox.pantoria.cn/_next/static/chunks/3emxx0wqex-8t.css)、[`1ghc4rhmajt88.css`](https://leibox.pantoria.cn/_next/static/chunks/1ghc4rhmajt88.css)、[`0s77ddh8od065.css`](https://leibox.pantoria.cn/_next/static/chunks/0s77ddh8od065.css)、[`22virj_ogtzci.css`](https://leibox.pantoria.cn/_next/static/chunks/22virj_ogtzci.css)、[`312lna3mvqfa8.css`](https://leibox.pantoria.cn/_next/static/chunks/312lna3mvqfa8.css)、[`/fonts/misans.css`](https://leibox.pantoria.cn/fonts/misans.css)、[`/assets/motion/277409f80fe93bffdd9f8d5b.css`](https://leibox.pantoria.cn/assets/motion/277409f80fe93bffdd9f8d5b.css)。
- 首页 JS（用于确认渲染与交互实现）：[`3jks3s7uzxikm.js`](https://leibox.pantoria.cn/_next/static/chunks/3jks3s7uzxikm.js)、[`3t39t2k0bw_2d.js`](https://leibox.pantoria.cn/_next/static/chunks/3t39t2k0bw_2d.js)、[`0whjn--8u41ju.js`](https://leibox.pantoria.cn/_next/static/chunks/0whjn--8u41ju.js)、[`0fn8_yd-yhnh4.js`](https://leibox.pantoria.cn/_next/static/chunks/0fn8_yd-yhnh4.js)、[`0qsaadr9m5xsc.js`](https://leibox.pantoria.cn/_next/static/chunks/0qsaadr9m5xsc.js)、[`34l7z_sncbak1.js`](https://leibox.pantoria.cn/_next/static/chunks/34l7z_sncbak1.js)。
- 代表性详情页：[帆船滚动目录](https://leibox.pantoria.cn/docs/animations/sailing-toc)、[组件环游 404](https://leibox.pantoria.cn/docs/components/orbit-not-found)、[立体按压按钮](https://leibox.pantoria.cn/docs/animations/tactile-push-button)、[分享邀请面板](https://leibox.pantoria.cn/docs/components/share-invite)、[蓝色棱纹流动背景](https://leibox.pantoria.cn/docs/animations/blue-fluted-glass)、[玻璃文件夹](https://leibox.pantoria.cn/docs/animations/glass-folder)、[粒子滚动](https://leibox.pantoria.cn/docs/components/particle-scroll)、[验证码](https://leibox.pantoria.cn/docs/components/otp-verification)。均 `[直接观察到]` 返回 `200`。

### 1.3 本地项目需求来源

- 当前项目约束来自用户任务描述；仓库内可核对的既有工作笔记：[`docs/superpowers/specs/2026-11-09-personal-dev-os-redesign.md`](../../superpowers/specs/2026-11-09-personal-dev-os-redesign.md)、[`.superpowers/sdd/tmp/round2-design-and-plan.md`](../../../.superpowers/sdd/tmp/round2-design-and-plan.md)。后者明确记录深青绿 `#042421 / #103733 / #f4fffb / #a9dccc / #e3f1ef`、七入口、「潮汐工作台」、北京、真实数据、不造假状态及「深青绿首屏 → 波浪 → 浅色长内容」节奏；本报告不把该本地笔记当作 LeiBox 的一手来源。

---

## 2. 站点性质：到底是什么

### 2.1 原文分类

- `[直接观察到]` 首页 meta：`LeiBox is a personal collection of UI inspiration, interaction experiments and design references for learning and research.`；`application-name: LeiBox`；`author: 雷师傅`；`og:locale: zh_CN`；keywords 横跨 `component library, react/vue/svelte component library, webgl/webgpu/canvas components, shadcn registry`。来源：[首页 HTML](https://leibox.pantoria.cn/) 的 `<meta name="description">`、`<meta name="keywords">`。
- `[直接观察到]` README：**「LeiBox 是雷师傅维护的网页组件、交互与动效收藏。先在页面里体验真实效果，再查看文档、依赖和源码；也可以让 AI 按当前任务搜索合适的组件，把所选框架的代码包接入项目。」** 并明确「本站组件代码包提供 React、Vue、Svelte、Solid、Preact 和 Vanilla 版本，各组件支持情况以详情页为准」。来源：[README:12–14](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md)。
- `[直接观察到]` `/docs`：「个人界面学习、交互实验与设计参考收藏」；`/copyright`：「LeiBox 是个人界面学习与交互实验项目，不是所参考设计师或项目的官方网站，也不代表获得其背书」。来源：[`/docs`](https://leibox.pantoria.cn/docs)、[`/copyright`](https://leibox.pantoria.cn/copyright)。
- `[直接观察到]` 首页显示「收藏组件 58 / 持续精选中」「真实演示 100%」「工作原理：01 挑选组件 → 02 查看来源与许可 → 03 把灵感带入你的项目」；`/components` 页头写「将这些创意组件直接用在你的项目中。浏览组件库，按自己的需要调整，更多效果正在加入」。来源：[首页](https://leibox.pantoria.cn/)、[`/components`](https://leibox.pantoria.cn/components)。

### 2.2 综合判断

`[设计推断]` 它是「**可运行、可检索、可复制部分源码的 curated interaction gallery / 个人灵感收藏箱**」，兼有组件目录、设计参考、交互实验与 AI/Skill 分发；不是承诺统一 API、统一主题、统一版本治理的产品级 design system，也不是只卖 landing page 的模板站。依据：README 自称「收藏」；catalog 混有 `project-source`、`upstream-reference`、`project-reference` 三种来源；`/copyright` 要求逐项核对许可；`components.json` 虽是 shadcn `base-nova` 配置，但 registry builder 仅生成一个首页 hero block。来源：[README](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md)、[catalog](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json)、[`/copyright`](https://leibox.pantoria.cn/copyright)、[`components.json`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/components.json)、[`scripts/build-registry.mts`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/scripts/build-registry.mts)。

### 2.3 技术栈与入口

- `[直接观察到]` `package.json`：Next `16.2.10`、React `19.2.4`、Tailwind CSS `^4`、`shadcn ^4.13.0`、`gsap 3.12.7`、`motion ^12.42.2`、`three ^0.185.1`、`vgpu ^0.3.1`、`shiki ^4.3.1`、`next-themes ^0.4.6`、`lucide-react ^1.24.0`；README 推荐 Node.js 24、`npm ci && npm run build && npm start`，并称项目使用 Next.js 静态导出。来源：[package.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/package.json)、[README:65–77](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md)。
- `[直接观察到]` 首页 header 指向 `/docs`、`/components`、`https://github.com/leishifu666/LeiBox`；按钮含 `Switch to English`、`联系与投稿`、`搜索`、`切换深色模式`、`打开菜单`；点击 EN 后 `html[lang=]` / `data-locale` 改为 `en`，`h1` 变为 `A box of playful components for your pages.`，URL 不变。来源：Playwright 实测 [首页](https://leibox.pantoria.cn/) 的 `header nav` 与 `button[aria-label]`。
- `[直接观察到]` `/docs/installation` 提供 `npx skills add https://leibox.pantoria.cn --skill leibox`；`README` 写明安装后可用中英文需求搜索、比较推荐结果、下载所选框架完整源码文件。来源：[`/docs/installation`](https://leibox.pantoria.cn/docs/installation)、[README:53–63](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md)。

---

## 3. 组件 / 模块目录

### 3.1 站点骨架模块（首页与内页直接观察到）

| 模块 | DOM / 类名 / 选择器 | 计算样式或行为 | 来源 |
|---|---|---|---|
| 固定玻璃导航 | `header.fixed.inset-x-0.top-0.z-50.border-b`；`header nav.mx-auto.grid.h-14.w-full.max-w-6xl` | 1036px 视口下 1036×57px；`background: oklab(... / .7)`；`backdrop-filter: blur(24px) saturate(1.5)`；`grid-template-columns: 428px 116px 428px`；`max-width: 1152px`；`padding: 0 32px` | Playwright computed style，[首页](https://leibox.pantoria.cn/) |
| 三段式导航 | `nav` 内 `grid-cols-[1fr_auto_1fr]` | 左 logo、中央 `/docs` + `/components`、右 EN/联系/搜索/主题/GitHub；375px 时中央列计算为 `0px`，显示「打开菜单」 | 首页 HTML class + Playwright 375×812 实测 |
| 胶囊主按钮 | `a[href="/docs"].inline-flex.h-11…rounded-full.bg-foreground` | 44px 高、`padding: 0 24px`、15px/500、黑底白字、圆角约 `2.23696e7px`；`hover:opacity-85`、`active:scale-[0.98]` | [首页 HTML](https://leibox.pantoria.cn/) + computed style |
| 次级文字按钮 | `a[href="/components"].inline-flex…` | 透明底、15px、`hover:text-muted-foreground`；移动端改为 44px 高带边框 | 同上 |
| 圆图标按钮 | `button.inline-flex.h-8.min-w-8…rounded-full.border` | 32×32px、12px/500、边框 `0.666667px`、`transition: color/background-color/transform .15s ease-out`、`active:scale-95` | 同上 |
| 搜索 / 联系浮层 | `button[aria-label="搜索"]`；`[data-contact-surface]` / `<dialog class="fixed inset-0…">` | 联系面板宽 440px、`max-height: calc(100svh - 40px)`、`border-radius: 16px`、`background: oklab(... / .85)`、`backdrop-filter: blur(24px) saturate(1.5)`、`shadow-xl` | Playwright computed style，[首页](https://leibox.pantoria.cn/) |
| Hero 区 | `section.landing-hero-demo`、`h1.hero-enter` | 1036px 视口：`padding: 144px 32px 10px`；h1 `clamp(2.25rem,5.5vw,3.75rem)` 实测 56.98px / 67.24px、`font-weight: 500`、`letter-spacing: -1.9943px`、居中；正文 16/28px、`max-width: 448px` | [`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css) + computed style |
| Hero 演示面板 | `.hero-panel-enter` | 972×432px、`border-radius: 18px`、`background: lab(96.52% ...)`、`min-height: 27rem`、内含 alpine-lake 图片 + canvas + 两张玻璃小卡 + 命令块 | Playwright computed style，[首页 HTML](https://leibox.pantoria.cn/) |
| 无边框预览卡 | `.lb-card`、`.lb-preview-container`、`.lb-source-hero` | `.lb-card` 213×148px、`background: transparent`、`border: 0`、`box-shadow: none`、flex `gap: 8px`；`.lb-preview-container` 438×219px、`border-radius: 8px`、`#f7f7f7`、`overflow: hidden`；图片 `loading="lazy"`、`alt=""` | Playwright computed style，[首页](https://leibox.pantoria.cn/) |
| 来源面板 | `.lb-showcase.lb-panel`、`.lb-meta-grid` | 486×460px、`padding: 20px 24px`、`border-radius: 16px`、背景纯白、`box-shadow: rgba(0,0,0,.02) 0 0 0 1px, rgba(0,0,0,.06) 0 8px 32px -12px`；来源/许可/源码行数以 1 列 grid、`gap: 4px` 排列 | Playwright computed style，[首页](https://leibox.pantoria.cn/) |
| 分类 / 精选列表 | 首页「组件」「真实演示」「按分类浏览」「动效交互」「文字与控件」 | 631px 宽列表带，`margin-bottom: 36px`；分类计数为画布交互 7、面板形变 6、拖拽与聚焦 5、文字选区 2、菜单交互 2、页面模板 1 | 首页文本 + Playwright section boxes |
| 长内容分隔 | `main section.relative.border-t.border-dashed` | `border-top: 0.666667px dashed oklab(... / .6)`；区块高 829 / 833 / 697 / 737 / 628 / 503px；首块 `padding: 128px 0` | Playwright computed style，[首页](https://leibox.pantoria.cn/) |
| 深色终端 CTA | `section[aria-labelledby="cta-heading"] > div > div` | `background: #0a0a0a`、`border-radius: 18px`、`min-height: 52rem`（sm+）、白字标题 3xl→5xl、canvas 粒子层、两个 CTA | [首页 HTML](https://leibox.pantoria.cn/) + computed style |
| FAQ 折叠 | `button.w-full.py-5.text-left` + `grid-rows-[0fr]/[1fr]` | `transition-[grid-template-rows] duration-300 cubic-bezier(.23,1,.32,1)`；`motion-reduce:transition-none` | [`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css) / 首页 HTML class |
| 表格 / 表单 | `textarea.w-full.rounded-lg.border…`；详情页 `table` | textarea 14/21px、`padding: 10px 14px`、`border-radius: 10px`、`border: .666667px`、`min-height: 100px`；联系表单含内容类型、留言、参考链接、回复邮箱、称呼、Website；表单 `data-state="checking"` 时按钮显示「检查中…」 | Playwright computed style，[首页](https://leibox.pantoria.cn/) |
| Footer | `footer.mt-auto` | 409px 高，左 logo+简介、右「网站导航」，下方「仅供学习使用」与 `/copyright` 链接；375px 时高 598px | 首页文本 + Playwright box |

### 3.2 58 个组件：分类、用途、交互、DOM/技术

`[直接观察到]` 下表来自 [`/components`](https://leibox.pantoria.cn/components) 的中文名与一行说明、[`catalog.json`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json) 的 `discovery.category` / `frameworks` / `renderers` / `source.kind`，以及代表性详情页。完整 58 个 URL 均可从 `/components` HTML 的 `a[href^="/docs/"]` 推出：48 条 `/docs/animations/*`、10 条 `/docs/components/*`。「DOM/技术」列中 `dom/svg` 是 catalog 未标 GPU renderer 的条目，**不等于**证明内部绝无 canvas；`webgl`/`webgpu` 是 catalog 明确 renderer。

| # | 名称（详情页 URL） | 类别 | 用途与交互（官网原文压缩） | DOM / 技术 | 对当前个人站的可借鉴点 |
|---|---|---|---|---|---|
| 1 | [组件环游 404](https://leibox.pantoria.cn/docs/components/orbit-not-found) | navigation | 预览卡排成环形轨道；hover/focus 暂停，点击打开组件 | `dom/svg`；仅 React；Next `app/not-found.tsx` + GSAP；`items` 输入预览与链接 | 404 可以有导航功能，但环形轨道对七入口偏花 |
| 2 | [胶囊弹出下拉菜单](https://leibox.pantoria.cn/docs/animations/blister-dropdown) | input | 选中一行，药槽飞入顶部，铝箔留空槽 | 六框架 | 菜单状态可由实体隐喻表达 |
| 3 | [像素日夜开关](https://leibox.pantoria.cn/docs/animations/pixel-toggle) | input | 拖动切换日夜，像素散开重组，光带绕滑块 | WebGL | 主题切换可有意义，但像素化易抢戏 |
| 4 | [弹性图片手风琴](https://leibox.pantoria.cn/docs/animations/image-accordion) | media | hover 展开，邻图调整，总宽不变 | `dom/svg` | 图片列表的「总量不变」比统一卡片生动 |
| 5 | [弹性图片对比](https://leibox.pantoria.cn/docs/animations/image-compare) | media | 拖动分隔线；线随手弯，快甩滑到边缘 | `dom/svg` | 手势物理可用于前后对照 |
| 6 | [拖甩照片卡片](https://leibox.pantoria.cn/docs/animations/card-swap) | cards | 点/甩最前卡到队尾，其余顺势前移 | `dom/svg` | 卡片堆不必每页都用 |
| 7 | [立体按压按钮](https://leibox.pantoria.cn/docs/animations/tactile-push-button) | input | **纯 CSS**；hover 下沉、按住内缩，空格键可触发 | `dom/svg`；四文件包；`options.height=540`、`reducedMotion` | 适合「终端」入口的克制 tactile 反馈 |
| 8 | [多光标页面搭建](https://leibox.pantoria.cn/docs/animations/multi-cursor-builder) | hero | 12 个彩色光标随滚动打字、画框、搬图，上滚撤回 | `dom/svg` | 滚动叙事，但「假协作光标」不应搬 |
| 9 | [专辑封面隧道](https://leibox.pantoria.cn/docs/animations/album-cover-tunnel) | media | 真实封面组成 3D 隧道，hover 吸起、点击飞入 | WebGL | 歌单可用静态封面墙替代 |
| 10 | [标签叠放展开](https://leibox.pantoria.cn/docs/animations/stacked-metadata) | navigation | 优先级/日期/负责人标签叠放，hover/focus 向左展开 | `dom/svg` | **适合笔记/项目元数据**：省空间且不用统一大卡 |
| 11 | [转账光雾确认](https://leibox.pantoria.cn/docs/animations/transfer-glow) | feedback | 粉金光雾与上浮粒子后两段处理提示，再成功 | `dom/svg` | 光雾/粒子与用户禁区冲突 |
| 12 | [液体注入卡片](https://leibox.pantoria.cn/docs/animations/shader-flood) | cards | 实时液体从鼠标进入处铺满再收拢，每卡独立三色 | WebGL | 鼠标驱动强，但 shader 过重 |
| 13 | [字符鲨鱼与鱼群](https://leibox.pantoria.cn/docs/animations/ascii-sharks) | background | ASCII 鲨鱼在细网格游动，指针避让、点击惊散 | `dom/svg` | ASCII 可作为个人站纹理，但鲨鱼是特定品牌趣味 |
| 14 | [墨水扩散图片轮播](https://leibox.pantoria.cn/docs/animations/ink-spread-carousel) | cards | 点击位置沿不规则墨边扩散，带轻微折射与柔焦换色 | `dom/svg` | 换页转场可借鉴「从点击处发生」 |
| 15 | [粒子纹理三联](https://leibox.pantoria.cn/docs/animations/particle-texture-trio) | background | 三固定点阵：蓝绿流、黑白圆弧、橙红纹理 | `dom/svg` | 粒子/三联卡是明确避免项 |
| 16 | [包装撕开粒子消散](https://leibox.pantoria.cn/docs/animations/matcha-powder-reveal) | hero | 拖开金属包装，可停半途，撕开后释放抹茶粉 | `dom/svg` | 撕纸物理有趣，粒子不适用 |
| 17 | [AI 品牌封面三联卡片](https://leibox.pantoria.cn/docs/animations/ai-brand-cover-cards) | cards | Claude/Codex/Cursor 竖版封面 + 真实 SVG 标志 | `dom/svg` | 第三方商标与 AI 品牌感，不能搬 |
| 18 | [折边滚动表情选择器](https://leibox.pantoria.cn/docs/animations/folded-emoji-scroll) | input | 网格滚入上下边缘时内弯压缩，搜索栏固定 | `dom/svg` | 长列表边缘反馈可借鉴 |
| 19 | [渐变卡片环形轮播](https://leibox.pantoria.cn/docs/animations/gradient-ring-cards) | cards | 五张渐变卡立体圆环、镜像背面、粒子与色散拖影 | `dom/svg` | 渐变/霓虹感，避免 |
| 20 | [流体提示气泡](https://leibox.pantoria.cn/docs/animations/fluid-tooltip) | navigation | 黑胶囊随六个导航入口移动变宽，裁切切换文字 | `dom/svg` | **可改造**：导航指示器替代六张同款卡；但「气泡」形态需避开聊天泡泡联想 |
| 21 | [蜘蛛牵引切歌](https://leibox.pantoria.cn/docs/animations/spider-music-player) | media | 八足蜘蛛结网搬运专辑封面与本地播放控件 | `dom/svg` | 吉祥物式叙事，不搬 |
| 22 | [列表卡片堆叠切换](https://leibox.pantoria.cn/docs/animations/collection-layout-morph) | layout | Claude/Codex/Grok 三 SVG 在列表/并排/叠放间连续重排 | `dom/svg` | **可借鉴同一数据三种密度**，但不照搬品牌 SVG |
| 23 | [品牌海报三联卡片](https://leibox.pantoria.cn/docs/animations/brand-poster-cards) | cards | 三张人像海报统一角标/字标/介绍，图片轻缓缩放 | `dom/svg` | 统一模板感强，且图片版权复杂 |
| 24 | [点阵波纹与旋涡](https://leibox.pantoria.cn/docs/animations/dot-matrix-trio) | background | 三张点阵卡同步扩散波纹、旋涡、圆形扩张 | `dom/svg` | 点阵/粒子，避免 |
| 25 | [文字选区开花](https://leibox.pantoria.cn/docs/animations/selection-flower) | text | 拖选真实文字，字符周围长出描边花，松手反向收回 | `dom/svg` | 真实 `Selection` 交互值得学，花朵视觉不必 |
| 26 | [内联词组变形](https://leibox.pantoria.cn/docs/animations/inline-text-morph) | text | 点击三处内联胶囊，相同字母连续重排，句子居中 | `dom/svg` | 可做中文标题的局部词替换，但不能破坏可读性 |
| 27 | [脑形滑块粒子增强](https://leibox.pantoria.cn/docs/animations/galaxy-effort-slider) | input | 脑褶随六档增加，Galaxy 档点阵/放射粒子/光晕/震动 | `dom/svg` | AI 化 + 粒子，避免 |
| 28 | [文字选区调色器](https://leibox.pantoria.cn/docs/animations/notes-text-color) | text | 选择笔记文字，唤出磨砂九色调色器，跨行上色并可跳回 | `dom/svg` | **可借鉴真实选区浮层**，但当前站无批注需求 |
| 29 | [选框拖拽缩放](https://leibox.pantoria.cn/docs/animations/bounding-box-resize) | layout | 八控制点变箭头，拖拽显示尺寸胶囊与辅助线，可直接输入宽高 | `dom/svg` | 与「工作台」语义契合，但当前站无需画布编辑器 |
| 30 | [柔光环形菜单展开](https://leibox.pantoria.cn/docs/animations/soft-action-wheel) | navigation | 黑图标顺时针错峰收拢成环，关闭时六项外散 | `dom/svg` | 环形菜单易模板化 |
| 31 | [环形菜单交错展开](https://leibox.pantoria.cn/docs/animations/staggered-radial-menu) | navigation | 六彩色按钮顺时针对齐收拢，逆序散开并模糊淡出 | `dom/svg` | 彩色圆按钮与七入口气质不合 |
| 32 | [弹性面板缩放](https://leibox.pantoria.cn/docs/animations/elastic-panel-resize) | layout | 把手靠近显现，拖动同向弯曲，越界弹性拉伸后回弹 | `dom/svg` | 适合可调整阅读宽度，但需键盘替代 |
| 33 | [蓝色棱纹流动背景](https://leibox.pantoria.cn/docs/animations/blue-fluted-glass) | background | 蓝流体经竖毛玻璃棱纹折射，中央白 logo 固定；点击/空格/回车暂停；reduced motion 静帧；`options.height=833`、`reducedMotion` | `dom/svg`；四文件；共用原生核心，框架各自 mount/update/destroy | **只借鉴「一个局部、可暂停、静帧兜底」结构**；蓝色流体本身禁用 |
| 34 | [模型思考强度滑块](https://leibox.pantoria.cn/docs/animations/reasoning-effort-slider) | input | 三档滑块、流动星空填充、果冻形变与吸附 | `dom/svg` | 星空/AI 感，避免 |
| 35 | [Agent 对话输入框](https://leibox.pantoria.cn/docs/animations/deep-agent-composer) | input | 直接迁入 Deep Agent 原版：权限菜单、上下文容量、附件、模型选择、思考滑块 | `dom/svg` | 聊天气泡/AI 输入框形态与用户禁区冲突，且是第三方原版 |
| 36 | [字符鲨鱼追踪价格路径](https://leibox.pantoria.cn/docs/animations/hammerhead-chart) | data | ASCII 锤头鲨沿三条预测路径游动并标概率/波动率/gamma | `dom/svg` | 数据叙事有个性，金融主题不契合 |
| 37 | [玻璃标签栏展开菜单](https://leibox.pantoria.cn/docs/animations/glass-tab-menu) | navigation | 四项磨砂标签连续成六宫格，选中块滑动，加号旋为关闭 | `dom/svg` | 玻璃 + 统一圆角，当前站应少用 |
| 38 | [揉皱纸张展开](https://leibox.pantoria.cn/docs/animations/crumpled-paper) | cards | 三纸团 hover 展开为信/山景照片/便笺，沿折叠网格变形 | `dom/svg` | 纸的「材质」可启发，但照片版权与折纸特效不搬 |
| 39 | [帆船滚动目录](https://leibox.pantoria.cn/docs/animations/sailing-toc) | navigation | 帆船随章节沿弯曲虚线移动，滚动跟随、点击目录平滑跳转；`options.height=918`、`reducedMotion`；演示 iframe 715×547px | `dom/svg`；四文件；六框架 | **最值得改造**：滚动进度 + 章节定位，但换成水位刻度而非帆船 |
| 40 | [思考步骤粒子变形](https://leibox.pantoria.cn/docs/animations/thinking-particles) | feedback | 粒子随五步变形，完成收起并逐字回答，可暂停/重播/复制 | `dom/svg` | 粒子 + 逐字 AI 回答，明确避免 |
| 41 | [玻璃文件夹展开](https://leibox.pantoria.cn/docs/animations/glass-folder) | files | 磨砂文件夹展开扇形文件，生成纹理、添加落入动效、键盘菜单；`options.height=600`、`reducedMotion` | `dom/svg`；四文件/673 行；React/Vue/Svelte/Solid/Preact/Vanilla | 文件隐喻可用，但玻璃/统一圆角不宜照搬 |
| 42 | [轨道与点阵动效](https://leibox.pantoria.cn/docs/animations/cosmic-panels) | background | 轨道加载、半色调星云、悬浮服务器三联宇宙视觉 | `dom/svg` | 假服务器/宇宙，避免 |
| 43 | [渐变卡片跟随](https://leibox.pantoria.cn/docs/animations/gradient-cover-wall) | cards | 六张颗粒渐变封面、细线纹样、慢漂移色团、弹簧柔光 | `dom/svg` | 渐变装饰，避免 |
| 44 | [验证码输入验证](https://leibox.pantoria.cn/docs/components/otp-verification) | input | 胶囊展开六位输入；`123456` 成功，其他错误摇动；本地演示，真实场景须接服务端；`autoPlay`、`onReplayComplete` | `dom/svg`；GSAP | 表单反馈可参考，但「假校验」绝不可用于真实数据站 |
| 45 | [鼠标感应线条](https://leibox.pantoria.cn/docs/animations/brand-line-cards) | cards | 竖线重构 Apple/Google/Tesla 标志，弹簧回弹与鼠标检测框连线 | `dom/svg` | 第三方商标 + 鼠标驱动线，避免 |
| 46 | [分享邀请面板](https://leibox.pantoria.cn/docs/components/share-invite) | collaboration | 可收拢；邮箱、成员权限、真实链接复制；邀请只更新本地演示；`options.locale="en"|"zh"`、`height=500` | `dom/svg`；GSAP | 留言板可用「展开式表单」，但不要假头像/假成员 |
| 47 | [访问申请展开](https://leibox.pantoria.cn/docs/animations/bouncy-access) | collaboration | 权限胶囊弹性展开，堆叠头像与成员列表交错切换 | `dom/svg` | 假头像/权限流程，避免 |
| 48 | [日历惯性拖拽](https://leibox.pantoria.cn/docs/animations/velocity-drag) | layout | 日程卡随拖速拉伸、跟随，浮动态切换聚焦内容 | `dom/svg` | 可启发真实时间轴，但别做惯性玩具 |
| 49 | [点阵加载](https://leibox.pantoria.cn/docs/animations/ai-generating) | feedback | 20×20 点阵围绕两个移动焦点呼吸，表示图片生成等待 | `dom/svg` | 点阵/AI 生成感，避免 |
| 50 | [ASCII 物体](https://leibox.pantoria.cn/docs/components/ascii-object) | hero | GLB/glTF/SVG/图片悬浮灯光场景，用匹配轮廓的 ASCII 重绘 | WebGL+WebGPU；Canvas UI upstream reference | 许可与素材边界复杂，避免 |
| 51 | [字符透镜](https://leibox.pantoria.cn/docs/components/asciify) | cursor | 透镜随指针把下方网页内容重绘为 ASCII | WebGL+WebGPU；upstream | 指针特效 + 许可，避免 |
| 52 | [冰霜](https://leibox.pantoria.cn/docs/components/frost) | cursor | 网页覆冰，指针融冰，移开重凝 | WebGL+WebGPU；upstream | 全屏 pointer 材质，过重 |
| 53 | [玻璃透镜](https://leibox.pantoria.cn/docs/components/glass) | cursor | 玻璃透镜跟随指针，折射放大网页内容 | WebGL+WebGPU；upstream | 当前站明确要避开过度玻璃 |
| 54 | [玻璃物体](https://leibox.pantoria.cn/docs/components/glass-object) | hero | 3D/SVG/图片变悬浮液态玻璃，折射/色散/磨砂 | WebGL+WebGPU；upstream | 避免 |
| 55 | [字符雨](https://leibox.pantoria.cn/docs/components/glyph-rain) | background | 下落字符流照亮网页，指针激起字符涌动 | WebGL+WebGPU；upstream | 扫描线/字符雨联想，避免 |
| 56 | [粒子物体](https://leibox.pantoria.cn/docs/components/particle-object) | hero | 3D/SVG/图片重建为粒子，指针散开再弹回 | WebGL+WebGPU；upstream | 明确粒子禁区 |
| 57 | [粒子滚动](https://leibox.pantoria.cn/docs/components/particle-scroll) | scroll | 指定线下内容化细沙，滚动逐粒拼回；`point=0.68`、`band=420`、`density=2`、`size=1.25`、`spread=220`、`gravity=.35`、`drift=.7`、`swirl=60`、`stagger=.7`、`fade=.85`、`settle=1.2`、`smoothing=.6`、`className` | WebGL+WebGPU；upstream；源码与许可须看原作者 | **滚动驱动思路可借鉴**，粒子实现禁用 |
| 58 | [流体物体](https://leibox.pantoria.cn/docs/components/liquid-object) | hero | 3D/SVG/图片浸隐形液体，指针水流拖动并分光 | WebGL+WebGPU；upstream | 避免 |

补充：`[直接观察到]` 首页还实现了「组件环游 404」之外的通用 404 页面（不存在的测试路径返回 39,140 bytes 的 404）；前者是 catalog 中的可交互组件演示，不是全站所有 404 的必然形态。来源：[测试 URL](https://leibox.pantoria.cn/definitely-missing-page-research-20261110)、[组件环游 404 详情](https://leibox.pantoria.cn/docs/components/orbit-not-found)。

### 3.3 组件输入输出与「真实演示」边界

- `[直接观察到]` 多数详情页的结构是「返回组件库 → 标题 + 复制给 AI → 描述 + 分类/六框架/TypeScript → 演示（重置/完整预览）→ 安装命令 → 依赖 → 代码包 → 使用示例 → 下载独立 HTML → 作者/来源 → 复刻提示词 → API 参考 → 上一个/下一个」。以 `SailingToc` 为例：`import { SailingToc } from "./SailingToc"; return <SailingToc />;`，四文件放同目录，共用原生核心、各框架独立 `mount/update/destroy`。来源：[SailingToc](https://leibox.pantoria.cn/docs/animations/sailing-toc)、[GlassFolder](https://leibox.pantoria.cn/docs/animations/glass-folder)。
- `[直接观察到]` 常见输入是 `options.height`（建议场景高度，值随条目变化：540/600/833/918/510/500px）、`options.reducedMotion`（覆盖系统偏好但保留完整交互状态）、少数条目有 `autoPlay` / `onReplayComplete` / `locale`。`particle-scroll` 则暴露 13 个 numeric/string 属性。来源：上述详情页原文。
- `[直接观察到]` 首页 `GlassFolder.tsx` 源码片段明示 `useEffect` 中 `mountGlassFolder(host.current!, options)`、第二个 effect `controller.current?.update(options ?? {})`、卸载 `instance.destroy()`，输出 `<div ref={host} className={className} data-motion-component="glass-folder" />`。来源：[首页 HTML 内嵌代码展示](https://leibox.pantoria.cn/)。
- `[直接观察到]` 多个演示明确是**本地状态**：Share Invite「不会发送邮件」、OTP「校验仅为本地演示」、Glass Folder「所有文件均为本地演示状态」、组件环游 404 是 `app/not-found.tsx` 中的真实导航组件。来源：[Share Invite](https://leibox.pantoria.cn/docs/components/share-invite)、[OTP](https://leibox.pantoria.cn/docs/components/otp-verification)、[Glass Folder](https://leibox.pantoria.cn/docs/animations/glass-folder)、[Orbit 404](https://leibox.pantoria.cn/docs/components/orbit-not-found)。
- `[直接观察到]` `/docs/installation` 提醒：下载源码不等于安装依赖或应用可用，需在自己的项目验证渲染、交互、键盘操作与卸载清理。来源：[`/docs/installation`](https://leibox.pantoria.cn/docs/installation)。

---

## 4. 设计语言、token 与真实 CSS 值

### 4.1 颜色与层级

`[直接观察到]` 以下为 bundle `2t77hwbj8404l.css` 中 `:root` / `.dark` 的十六进制 fallback，后面又用 `@supports (color: lab(...))` 覆盖为等价 `lab()`；浏览器实测 `html.light` 生效的是 `lab()` 版本，`--radius` 为 `.625rem`。

| Token | 亮色 hex | 亮色 lab / 浏览器 computed | 暗色 hex / lab | 用途 |
|---|---|---|---|---|
| `--background` | `#fff` | `lab(100% 0 0)` | `#0a0a0a` / `lab(2.75381% 0 0)` | 页面底 |
| `--foreground` | `#0a0a0a` | `lab(2.75381% 0 0)` | `#fafafa` / `lab(98.26% 0 0)` | 正文 |
| `--card` / `--popover` | `#fff` | `lab(100% 0 0)` | `#171717` / `lab(7.78201% ...)` | 卡片/浮层 |
| `--primary` | `#171717` | `lab(7.78201% ...)` | `#e5e5e5` / `lab(90.952% ...)` | 主按钮、强调 |
| `--secondary` / `--muted` / `--accent` | `#f5f5f5` | `lab(96.52% ...)` | `#262626` / `lab(15.204% 0 0)` | 次级面 |
| `--muted-foreground` | `#737373` | `lab(48.496% 0 0)` | `#a1a1a1` / `lab(66.128% ...)` | 弱字 |
| `--border` / `--input` | `#e5e5e5` | `lab(90.952% ...)` | `#ffffff1a` / `lab(100% 0 0/.1)`、`#ffffff26` / `.15` | 1px 分隔/输入边 |
| `--ring` | `#a1a1a1` | `lab(66.128% ...)` | `#737373` / `lab(48.496% 0 0)` | focus ring |
| `--destructive` | `#e40014` | `lab(48.4493% 77.4328 61.5452)` | `#ff6568` / `lab(63.7053% 60.7449 31.3109)` | 错误 |
| `--radius` | `.625rem` = 10px | `.625rem` | `.625rem` | token 基准；`rounded-lg` 实测 10px |
| `--chart-1..5` | `#d4d4d4 #737373 #525252 #404040 #262626` | 灰度 | 同灰度 | 图表 |

来源：[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css) 的 `:root`、`.dark`、`@supports`；Playwright `getComputedStyle(document.documentElement)` 于 [首页](https://leibox.pantoria.cn/) 的 `.light` 与点击主题后的 `.dark`。

`[直接观察到]` 点击 `button[aria-label="切换深色模式"]` 后 `html.className` 从 `… light` 变 `… dark`，`--background` 为 `lab(2.75381% 0 0)`、`--foreground` 为 `lab(98.26% 0 0)`，header 背景为 `oklab(.145 … / .7)`，hero panel 为 `lab(15.204 0 0)`；按钮标签变为「切换浅色模式」。来源：Playwright 实测 [首页](https://leibox.pantoria.cn/)。

`[直接观察到]` 首页 HTML 的 `<meta name="theme-color">` 亮色 `#ffffff`、暗色 `#0a0a0a`；`/docs` 的 meta description 为 `LeiBox UI studies, source packages and learning-use permissions.`。来源：[首页 HTML](https://leibox.pantoria.cn/)、[`/docs` HTML](https://leibox.pantoria.cn/docs)。

### 4.2 背景材质、边框、阴影、圆角

- `[直接观察到]` 页面底是纯白/纯黑，没有全站渐变；首页的材质来自两处：hero panel 内的 alpine-lake 优化 webp（320/640/960/1200 四档 `srcset`）与深色 CTA 的 `#0a0a0a` + Canvas 2D 粒子。来源：[首页 HTML](https://leibox.pantoria.cn/) 的 `img[srcset*="alpine-lake"]`、`canvas`、`section[aria-labelledby="cta-heading"]`。
- `[直接观察到]` 长内容分隔用 `0.666667px dashed oklab(0.921998 ... / 0.6)`，不是阴影；`header` 是 `border-b border-border/40` + `blur(24px) saturate(1.5)`；联系浮层是 `blur(24px) saturate(1.5)` + `0 20px 25px -5px` / `0 8px 10px -6px` 的 10% 黑阴影；`.lb-showcase.lb-panel` 用极轻 `0 0 0 1px rgba(0,0,0,.02)` 与 `0 8px 32px -12px rgba(0,0,0,.06)`；组件索引的卡片本身 `background: transparent`、`border: 0`、`box-shadow: none`。来源：Playwright computed style 于 [首页](https://leibox.pantoria.cn/) / [`/components`](https://leibox.pantoria.cn/components)，[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)。
- `[直接观察到]` 圆角是分层而非「统一大圆角」：导航链接/按钮为 pill（computed `2.23696e7px`），`rounded-lg` 为 10px，`.lb-preview-container` 为 8px，`.lb-showcase.lb-panel` / 联系面板为 16px，hero panel / 深色 CTA / `rounded-2xl` 为 18px。来源：Playwright computed style 于 [首页](https://leibox.pantoria.cn/)。
- `[设计推断]` 这种「透明卡 + 8px 预览图 + 16px 外层面板 + 18px 主舞台」的分级，比给每张卡同一圆角和同一阴影更不模板化；但玻璃模糊用得多时仍会落入通用 SaaS 质感。

### 4.3 字体与字号层级

- `[直接观察到]` `--font-site-sans: var(--font-geist-sans), "MiSans VF", sans-serif`；`--font-geist-sans: "GeistSans", "GeistSans Fallback"`；`--font-mono: "GeistMono", "MiSans VF", monospace`；`--font-geist-mono` 还含 `ui-monospace, SFMono-Regular, Roboto Mono, Menlo, …`。`html[data-locale=zh] / html[lang=zh-CN]` 用 `--font-site-sans`；中文 `h1.hero-enter` 额外 `letter-spacing: -.035em; line-height: 1.18`。首页 meta 注明 `Chinese typeface: MiSans VF by Xiaomi. https://hyperos.mi.com/font/zh/`。来源：[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)、[`/fonts/misans.css`](https://leibox.pantoria.cn/fonts/misans.css)、[首页 HTML](https://leibox.pantoria.cn/)。
- `[直接观察到]` 实测字号层级（1036px 视口）：body / header / footer 16px / 24px；hero h1 56.98px / 67.24px / 500 / `-1.9943px`；hero 正文 16px / 28px；CTA 标题桌面 `sm:text-5xl`、移动 `text-3xl`；首页展示区 14px / 21px；导航链接 14px / 20px；图标按钮 12px / 18px；`.lb-text-muted` 14.4px / 21.6px；详情页 H1 30px、H2 18px、代码 13px。来源：Playwright computed style 于 [首页](https://leibox.pantoria.cn/)、[`/components`](https://leibox.pantoria.cn/components)、[SailingToc](https://leibox.pantoria.cn/docs/animations/sailing-toc)。
- `[直接观察到]` `/components` 页头 h1 为 30px；首页英文模式有独立 `font-size: clamp(2.5rem, 6vw, 4.25rem)` 规则，中文 hero 是 `clamp(2.25rem, 5.5vw, 3.75rem)`。来源：[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css) 中 `html[lang="en"] .hero-english-module…` 与 `.hero-enter` 规则。
- `[设计推断]` 对当前项目「其他页面字体保持不变」是硬约束，不应引入 MiSans VF 或把现有 Geist/系统中文链替换掉；可借鉴的是字号层级与中文负字距，而不是字体本身。

### 4.4 留白、对齐、最大宽度、断点

- `[直接观察到]` 首页 `.landing-hero-demo`：`padding: 144px 32px 10px`，1036px 视口下 grid 单列 972px；hero h1 与正文居中；hero panel `margin-top: 80px`；长内容 band `padding: 128px 0`，列表带之间 `margin-bottom: 36px`；深色 CTA `padding: 0 10px 10px`、标题区 `pt-28 pb-20` / sm `pt-36 pb-24`。来源：Playwright computed style 于 [首页](https://leibox.pantoria.cn/)，首页 HTML class。
- `[直接观察到]` 全局容器 `max-w-6xl` = 1152px；`nav` 实测 `grid-template-columns: 1fr auto 1fr` → `428px 116px 428px`；首页 hero 文本 `max-width: 448px`；组件/文档页 `main` 为 `padding: 64px 32px 40px 288px`，左侧 256px 文档栏 + 32px 间距，内容区 716px；详情页 iframe 715×547px；组件索引卡片约 217px 宽、三列。来源：Playwright computed style 于 [首页](https://leibox.pantoria.cn/)、[`/components`](https://leibox.pantoria.cn/components)、[SailingToc](https://leibox.pantoria.cn/docs/animations/sailing-toc)。
- `[直接观察到]` CSS bundle 中响应式断点为 `40rem / 48rem / 64rem / 80rem / 96rem`（640/768/1024/1280/1536px），另有组件级 `max-width: 500px`、`max-width: 639px`、`max-width: 374px`、container query `max-width: 480px`。来源：[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)、[`3emxx0wqex-8t.css`](https://leibox.pantoria.cn/_next/static/chunks/3emxx0wqex-8t.css)。
- `[直接观察到]` 375×812 实测：header nav 三列为 `117.521px 0px 217.812px`（中央链接列折叠），hero `padding: 112px 20px 10px`，h1 36px / 42.48px 且 `text-align: left`，正文 16/28px 左对齐，hero panel 335×288px，`.lb-showcase` 335×460px，footer 598px，页面总高 7,640px。768×1024 实测：nav 中央 116px 恢复，h1 42.24px 居中，hero panel 704×432px，`.lb-showcase` 580×512px。来源：Playwright `browser_resize` + computed style 于 [首页](https://leibox.pantoria.cn/)。
- `[设计推断]` LeiBox 的桌面节奏是「中央窄文本 + 全宽舞台 + 左右 32px 呼吸」；移动端把首屏文本改为左对齐，说明居中不是教条。当前项目要求首页「居中而不全列在左侧」，可用居中标题 + 非对称真实信息带，而不是把七入口全堆左栏。

---

## 5. 布局节奏与 ASCII 线框

### 5.1 首页（1036×906 桌面，约 6,779px）

`[直接观察到]` 结构来自 Playwright 的 `main section` bounding boxes、computed padding/border 与首页文本；数值见第 4.4 节。

```text
┌──────────────────────────── 1036px ────────────────────────────┐
│ fixed 57px glass header: logo │ Docs · Components │ EN □ □ □ GitHub │
├────────────────────────────────────────────────────────────────┤
│ .landing-hero-demo  y=0…1707  padding 144/32/10                 │
│                                                                │
│             centered h1 56.98px / 67.24px                      │
│             为你的页面，挑一箱好玩的组件                        │
│             centered 448px / 16px / 28px 自述                  │
│             [black 44px pill]  [text link]                     │
│             58 · 100% · Skill command                          │
│                                                                │
│         ┌────────── 972×432, radius 18 ──────────┐             │
│         │ alpine-lake webp + 2D canvas + 2 cards │  y=1265      │
│         │ + command block + pause button         │             │
│         └────────────────────────────────────────┘             │
├── 1px dashed rule ─────────────────────────────────────────────┤
│ y=1707…2536  h=829  padding 128px                              │
│ 「收藏箱」：左侧窄文本 / 右侧 486×460 白面板 + 无边框小卡       │
│             .lb-card 213×148, preview 438×219 radius 8          │
├── 1px dashed rule ─────────────────────────────────────────────┤
│ y=2536…3369  h=833  「工作原理」01 / 02 / 03 + 可切演示        │
├── 1px dashed rule ─────────────────────────────────────────────┤
│ y=3369…4066  h=697  六框架 tabs + 4 文件 / 673 行源码          │
├── 1px dashed rule ─────────────────────────────────────────────┤
│ y=4065…4802  h=737  AI/Claude/Codex 接入演示                   │
├── 1px dashed rule ─────────────────────────────────────────────┤
│ y=4802…5430  h=628  FAQ（grid-rows 0fr/1fr 折叠）              │
├── 1px dashed rule ─────────────────────────────────────────────┤
│ y=5430…5933  h=503  投稿 CTA：左标题 / 右表单                  │
├────────────────────────────────────────────────────────────────┤
│ y=5933…6775  h=842  dark #0a0a0a radius 18                    │
│              canvas 粒子 + 居中白标题 + 两个按钮                 │
│              内含 footer 409px：logo / 导航 / 学习用途声明      │
└────────────────────────────────────────────────────────────────┘
```

**首屏到长内容的过渡**：`[直接观察到]` 首屏不是 100svh 封面，而是 1,707px 的「标题 → 介绍 → 统计 → 大演示舞台」；之后用 1px 虚线切成 6 个约 500–833px 的展台，最后收束到深色 CTA。`[设计推断]` 重复的是「虚线 + 左右双栏 + 一块可操作演示」，变化的是演示内容（卡片、源码、AI 模拟、FAQ、表单、暗场）；信息密度在低密度说明区与高密度演示区之间交替。

**模板默认感**：`[设计推断]` 「01/02/03 工作原理」「58 / 100% 统计胶囊」「六框架 tab + 复制代码」「AI 接入对话演示」本身是典型开发者产品 landing 模板语汇；真正不模板的是无边框卡、虚线分隔、局部真实演示和暗场收束。当前项目若抄统计胶囊、编号步骤、每张同款卡，会正中用户所说「太一般了」。

### 5.2 `/components`（1036×906，约 7,723px）

`[直接观察到]` 来源：Playwright computed style 于 [`/components`](https://leibox.pantoria.cn/components)。

```text
┌──────────────────────────── 1036px ────────────────────────────┐
│ ┌── 256px fixed sidebar ──┐ │ main padding-left 288px          │
│ │ 入门指南 / 组件         │ │ h1 30px  组件                    │
│ │ 简介 安装 渲染 AI 接入  │ │ 一句话说明                       │
│ │ 浏览全部                │ │                                  │
│ │ 58 条组件长目录         │ │ ┌ 217 ┐ ┌ 217 ┐ ┌ 217 ┐         │
│ │（当前项高亮）           │ │ │ webp│ │ webp│ │ webp│  三列   │
│ │                        │ │ │名称 │ │名称 │ │名称 │         │
│ │                        │ │ │说明 │ │说明 │ │说明 │         │
│ │                        │ │ └─────┘ └─────┘ └─────┘         │
│ │                        │ │ … 58 项，border/shadow = none    │
│ │                        │ │ footer 409px                     │
│ └────────────────────────┘ └──────────────────────────────────┘
```

`[设计推断]` 这是「文档目录 + 无边框缩略图网格」：用图片本身而不是卡片容器分隔内容，避免 58 张卡片的阴影噪声；但长侧栏 + 等高网格仍是标准组件库信息架构。

### 5.3 组件详情页（以 SailingToc 为例，1036×906，约 3,381px）

`[直接观察到]` 来源：Playwright computed style 于 [SailingToc](https://leibox.pantoria.cn/docs/animations/sailing-toc)；页面原文见第 3.3 节。

```text
┌── 256px docs sidebar ──┬────────── 716px content ───────────────┐
│ 同 /components 目录   │ 返回组件库                              │
│                       │ h1 30px 帆船滚动目录                    │
│                       │ 描述 / 分类 / 六框架 / TypeScript       │
│                       │ h2 18px 演示                            │
│                       │ ┌──────── iframe 715×547 ──────────┐   │
│                       │ │ 真实滚动目录 + 帆船沿虚线移动     │   │
│                       │ └──────────────────────────────────┘   │
│                       │ 重置 / 完整预览                         │
│                       │ 安装 → 依赖 → 代码 → 使用示例           │
│                       │ 复刻提示词 → API 表格 → 上一个/下一个   │
│                       │ footer / 投稿                           │
└───────────────────────┴─────────────────────────────────────────┘
```

`[设计推断]` 详情页的节奏是「一个高 547px 的真实 iframe 演示」后接线性文档，不靠装饰卡堆砌；对当前项目的启示是每个整页路由都应先给出可操作/可读的真实内容，再加次级说明。

---

## 6. 动效、背景与可访问性

### 6.1 直接观察到的 CSS 动效

| 行为 | 精确值 / 选择器 | 来源 |
|---|---|---|
| 页面入场 | `.page-enter { animation: .24s cubic-bezier(.23,1,.32,1) both page-in }`；`@keyframes page-in { 0% { opacity:0; transform: translateY(8px) } }` | [`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css) |
| Hero 逐项入场 | `.hero-enter { animation: .6s cubic-bezier(.23,1,.32,1) both hero-enter; animation-delay: calc(var(--enter-index,0) * 60ms) }`；`@keyframes hero-enter { 0% { opacity:0; transform: translateY(12px) } }` | 同上；Playwright computed `h1` / `h1+p` 分别为 0s / 0.06s delay |
| Hero 面板揭幕 | `.hero-panel-enter { animation: 1s cubic-bezier(.23,1,.32,1) 60ms both hero-panel-enter }`；`@keyframes hero-panel-enter { 0% { clip-path: inset(0 0 98% round 1rem) } }` | 同上 |
| 滚动显现 | `.reveal { opacity:0; transform: translateY(14px); transition: opacity .7s cubic-bezier(.23,1,.32,1), transform .7s … }`；`.reveal[data-in-view] { opacity:1; transform:none }` | 同上；首页 14 处 `reveal` class |
| 跑马灯 | `.marquee-track { width:max-content; animation: marquee-scroll var(--marquee-duration,60s) linear infinite; display:flex }`；`:not([data-ready])` / `:not([data-in-view])` / `:focus-within` 时 `animation-play-state: paused` | 同上 |
| Hover / active | 大量 150ms `ease-out` 的 color/background/transform；`active:scale-95` / `active:scale-[.98]`；箭头 `group-hover:translate-x-0.5 duration-200`；折叠 `grid-template-rows .3s cubic-bezier(.23,1,.32,1)` | [`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)、[首页 HTML](https://leibox.pantoria.cn/) class |
| 视图过渡 | `::view-transition-old/new(root) { animation-duration:.25s; animation-timing-function:cubic-bezier(.23,1,.32,1) }`；主题切换用 `document.startViewTransition` 做圆形 clip，`reduced motion` 时直接切换 | [`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)、[`3t39t2k0bw_2d.js`](https://leibox.pantoria.cn/_next/static/chunks/3t39t2k0bw_2d.js) |
| 滚动隐藏 header | `ScrollHideHeader` 用 GSAP `yPercent: -100/0`、`duration:.3`、子项 `y:-12 → 0 .45s back.out(1.5)`；隐藏时设 `inert`、`aria-hidden="true"`、`pointer-events:none` | [`3t39t2k0bw_2d.js`](https://leibox.pantoria.cn/_next/static/chunks/3t39t2k0bw_2d.js) |
| Logo / 路由过渡 | `ComponentEntryTransition` 在组件卡到详情页间做 GSAP 矩形→标题形变；`prefers-reduced-motion` 时直接导航并聚焦 `h1` | [`3t39t2k0bw_2d.js`](https://leibox.pantoria.cn/_next/static/chunks/3t39t2k0bw_2d.js) |
| 预览视频 | `PreviewVideo` 仅在 `IntersectionObserver` 可见、非 touch pointerenter 或 focusin、页面可见且未减少动效时播放；离开 350ms 后暂停/移除 src | [`0fn8_yd-yhnh4.js`](https://leibox.pantoria.cn/_next/static/chunks/0fn8_yd-yhnh4.js)、[`3qyxqsfpig9ax.js`](https://leibox.pantoria.cn/_next/static/chunks/3qyxqsfpig9ax.js) |
| 手动控制 | 首页 `button[aria-label="暂停演示"]`；详情有「重置演示 / 打开完整预览 / 重播参考流程」；蓝色棱纹背景支持点击、轻触、空格与回车暂停 | Playwright DOM；[Blue Fluted Glass](https://leibox.pantoria.cn/docs/animations/blue-fluted-glass) |

### 6.2 Canvas / WebGL / 视频 / 粒子

- `[直接观察到]` 首页有 **2 个 canvas、0 个 video、79 个 SVG**，两个 canvas 都是 `aria-hidden="true"`、`pointer-events-none`、`absolute inset-0 size-full`：一个在 alpine-lake 图片之上（972×432），一个在深色 CTA（1016×832）。来源：Playwright computed DOM 于 [首页](https://leibox.pantoria.cn/)。
- `[直接观察到]` 首页 `AmbientParticles`（bundle `3jks3s7uzxikm.js`）是 Canvas 2D：`getContext("2d")`；`tone="night"` 65 点 / `day` 180 点；黄金比/银比分布；半径 `0.4 + (i%5)*0.2`；速度 `0.004 + (i%7)*0.001`；`x` 用 `.012*sin(.16s + 8y)` 缓慢摆动；night 色 `rgba(113,162,239,α)`、day 色 `rgba(255,255,255,.22)`；GSAP ticker 约 32ms 节流；`ResizeObserver` + `Math.min(devicePixelRatio, 1.5)`；intersection、visibilitychange、`prefers-reduced-motion` 均决定是否运行，reduced 时只画 `p(0)` 静帧。来源：[`3jks3s7uzxikm.js`](https://leibox.pantoria.cn/_next/static/chunks/3jks3s7uzxikm.js) 的 `AmbientParticles` 模块。
- `[直接观察到]` `/docs/rendering` 原文：「收藏中的示例按需使用普通 DOM 与 SVG、Canvas 2D 和 WebGL」「预览卡片按需加载对应交互示例」「网站遵循系统的减少动态效果设置，部分示例还提供暂停、重播或重置操作」；首页 FAQ 又说「效果通过 WebGL 或基于 vgpu 的 WebGPU 在 GPU 上渲染……组件挂载时才初始化，离开视口时暂停，卸载时释放资源」。二者描述范围不同：前者是全部收藏，后者是首页 FAQ 对 GPU 效果的概括。来源：[`/docs/rendering`](https://leibox.pantoria.cn/docs/rendering)、[首页 FAQ 文本](https://leibox.pantoria.cn/)。
- `[直接观察到]` catalog 中 12 项标 WebGL（`album-cover-tunnel`、`shader-flood`、`pixel-toggle` 等）或 WebGL+WebGPU（9 个 Canvas UI upstream references）；首页自身未实测到 `getContext("webgl")` / `getContext("webgpu")`。来源：[catalog.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json)、[首页 JS bundles](https://leibox.pantoria.cn/_next/static/chunks/3jks3s7uzxikm.js)。
- `[直接观察到]` 首页 HTML 中出现 `mousemove`/`pointermove`/`scroll` 等脚本标记；可确认的具体鼠标驱动行为包括 `PreviewVideo` 的 pointerenter/focusin 与详情页 `particle-scroll` 的滚动聚合、`sailing-toc` 的滚动跟随、`brand-line-cards` 的鼠标感应线条。首页 AmbientParticles 不读取指针位置。来源：[首页 HTML](https://leibox.pantoria.cn/)、[`0fn8_yd-yhnh4.js`](https://leibox.pantoria.cn/_next/static/chunks/0fn8_yd-yhnh4.js)、[Particle Scroll](https://leibox.pantoria.cn/docs/components/particle-scroll)、[Sailing TOC](https://leibox.pantoria.cn/docs/animations/sailing-toc)、[`/components` 条目说明](https://leibox.pantoria.cn/components)。

### 6.3 `prefers-reduced-motion` 与可访问性

- `[直接观察到]` CSS 中有 `.motion-reduce:transition-none`、`.shimmer{animation:none}`、`.page-enter{animation:none}`、`.marquee-track{animation:none}`、`.reveal{transition:opacity .3s; transform:none}`、`.hero-enter,.hero-panel-enter` 降级为 `.4s hero-enter-fade`、`::view-transition-*{animation:none!important}`、若干 GSAP 演示把动画时长降到 `1ms` 或直接 `set` 终态。来源：[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)、[`3emxx0wqex-8t.css`](https://leibox.pantoria.cn/_next/static/chunks/3emxx0wqex-8t.css)、[`1ghc4rhmajt88.css`](https://leibox.pantoria.cn/_next/static/chunks/1ghc4rhmajt88.css)、[`312lna3mvqfa8.css`](https://leibox.pantoria.cn/_next/static/chunks/312lna3mvqfa8.css)。
- `[直接观察到]` Playwright 将 `reducedMotion: reduce` 后实测：`main`、`h1`、`.hero-panel-enter` 的 `animationName: none`、`animationDuration: 0s`、`transform: none`；`.reveal` 的 `transitionProperty: opacity`、`duration: .3s`、`transform: none`；`button[aria-label="暂停演示"]` 的 `animationPlayState: paused`。来源：Playwright `browser_emulate_media` + computed style 于 [首页](https://leibox.pantoria.cn/)。
- `[直接观察到]` 可见性/性能兜底存在于 JS：`IntersectionObserver` 控制演示/预览视频运行，`document.hidden` 暂停，`theme/view transitions` 在 reduced motion 时跳过，组件原生核心提供 `destroy()`。来源：[`3jks3s7uzxikm.js`](https://leibox.pantoria.cn/_next/static/chunks/3jks3s7uzxikm.js)、[`0fn8_yd-yhnh4.js`](https://leibox.pantoria.cn/_next/static/chunks/0fn8_yd-yhnh4.js)、[`3t39t2k0bw_2d.js`](https://leibox.pantoria.cn/_next/static/chunks/3t39t2k0bw_2d.js)、[`/docs/installation`](https://leibox.pantoria.cn/docs/installation)。
- `[直接观察到]` 焦点与语义：按钮有 `aria-label`（EN/联系/搜索/主题/菜单/暂停），`focus-visible:outline-2 + outline-offset-2`；header 隐藏时 `inert` / `aria-hidden`；canvas 为 `aria-hidden`；组件详情路由过渡在 reduced motion 下聚焦 `h1`；Orbit 404 支持 Tab 聚焦暂停。来源：[首页 HTML](https://leibox.pantoria.cn/)、[`3t39t2k0bw_2d.js`](https://leibox.pantoria.cn/_next/static/chunks/3t39t2k0bw_2d.js)、[Orbit 404](https://leibox.pantoria.cn/docs/components/orbit-not-found)。
- `[直接观察到]` 但 reduced motion 下首页仍有屏幕外 `.reveal` 元素为 `opacity: 0`（只有 `[data-in-view]` 才变 1），本次未验证无 JS / 打印 / 键盘逐段滚动时是否始终可见，因此不能宣称完整无障碍通过。来源：Playwright reduced-motion computed style 于 [首页](https://leibox.pantoria.cn/)。
- `[直接观察到]` 浏览器控制台在最后一次首页加载出现 2 个错误：请求 `https://api.github.com/repos/leishifu666/LeiBox` 被 CORS/loopback 地址空间策略拦截，资源 `net::ERR_FAILED`；另有 1 个 warning。这不改变设计结论，但说明浏览器内的 GitHub 动态读数不可靠。来源：Playwright console 于 [首页](https://leibox.pantoria.cn/)。

### 6.4 克制与「AI 化」判断

`[设计推断]` **克制**：150–300ms hover/active、≤14px 入场位移、0.24–1s 一次性入场、只在悬停/焦点/可见时播放预览、暂停按钮与 reduced-motion 静帧、装饰 canvas 为 `aria-hidden` 且不拦指针。

`[设计推断]` **容易显得 AI 化**：蓝色流体 + 中央 logo、脑形/思考粒子、Agent 对话输入框、逐字生成回答、点阵加载、星空滑块、宇宙轨道服务器、渐变卡环、多光标协作、彩色光标拖尾、品牌海报三联。这些恰好与用户明确禁止的「蓝紫渐变、霓虹、粒子、扫描线、聊天泡泡、Sparkles、AI 人形头像」及「假在线/心跳」高度重合。

---

## 7. 开源、许可与复用边界

### 7.1 许可原文与仓库状态

- `[直接观察到]` GitHub API：`private: false`、`archived: false`、`default_branch: main`、`language: HTML`、`license.key: "other"`、`spdx_id: "NOASSERTION"`、`homepage: https://leibox.pantoria.cn`；created `2026-10-22T10:46:50Z`、pushed `2026-11-08T18:56:00Z`、updated `2026-11-10T03:32:51Z`、204 stars / 24 forks、约 293,337 KB。来源：[GitHub API](https://api.github.com/repos/leishifu666/LeiBox)。
- `[直接观察到]` `LICENSE.md` 标题 **MIT + Commons Clause License Condition v1.0**，Copyright `(c) 2026 David Haz`：允许作为 application/website/product 的一部分使用、复制、修改、合并、发布、分发并允许商业用途，**但不得 sell / sublicense / redistribute the components themselves，whether alone, in a bundle, or as a ported version**；要求保留版权与许可声明；无担保。来源：[LICENSE.md:1–28](https://raw.githubusercontent.com/leishifu666/LeiBox/main/LICENSE.md)。
- `[直接观察到]` `package.json` 是 `private: true`，`"license": "SEE LICENSE IN LICENSE.md"`；`components.json` 是 shadcn `style: "base-nova"`、`baseColor: "neutral"`、`cssVariables: true`、`iconLibrary: "lucide"`。来源：[package.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/package.json)、[components.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/components.json)。
- `[直接观察到]` `COPYRIGHT.md`（更新 2026-10-28）说：9 个 Canvas UI 原有效果保留原实现；详情源码与许可入口指向原作者，不把这些实现作为本站独立原创代码包交给 AI 拉取；替换背景不改变来源和原许可；历史网站基础代码仍有改编自 David Haz Canvas UI 的部分；`Three.js` 及另行传入图片/模型仍应遵守各自许可；「仓库内容不代表线上部署版本」；不重写公共 Git 历史，也不承诺以免责声明消除历史发布风险。来源：[COPYRIGHT.md](https://raw.githubusercontent.com/leishifu666/LeiBox/main/COPYRIGHT.md)。
- `[直接观察到]` `/copyright` 说：学习用途声明不代替授权/不转移著作权/不授予复制、分发或商业使用第三方内容的权利；公开链接、署名、免费提供或改写实现不等于授权；许可不明确应取得授权或换权利清楚的替代内容；代码许可不一定涵盖照片、专辑封面、字体、插画、商标及参考设计。来源：[`/copyright`](https://leibox.pantoria.cn/copyright)。
- `[直接观察到]` `README` 的加粗声明：「**仅供学习使用。** 第三方设计、代码、图片、字体、商标等权利归各自权利人所有。本声明不代替授权，也不授予复制、分发或商业使用第三方内容的权利。」来源：[README:16](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md)。

### 7.2 技术栈、输入/输出与可移植性

- `[直接观察到]` 项目为 Next 16 + React 19 + Tailwind 4 + shadcn registry 生成；代码包按框架生成，详情页可复制完整文件、下载独立 HTML、用 Skill 检索；64 个文件/行数等以具体条目为准（GlassFolder 为 4 文件 / 673 行）。来源：[package.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/package.json)、[`scripts/build-registry.mts`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/scripts/build-registry.mts)、[GlassFolder 详情](https://leibox.pantoria.cn/docs/animations/glass-folder)、[首页代码展示](https://leibox.pantoria.cn/)。
- `[直接观察到]` catalog 的 `distribution` 统计：48 项 `canRedistributeSource: true` / `installFromThisSite: true` / `installProvider: "leibox"`；10 项为 `false` / `false`，其中 9 项 `installProvider: "upstream"`（Canvas UI），1 项 `github`。`source.kind` 为 `project-source 48` / `upstream-reference 9` / `project-reference 1`。来源：[catalog.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json)。
- `[直接观察到]` 多数详情页的组件输入是 `options` 对象（至少 `height`、`reducedMotion`），输出是挂载到 host 元素的 DOM/Canvas 状态与 `destroy()`；`particle-scroll` 额外暴露 13 个数值/字符串参数；`orbit-not-found` 的 `items` 输入预览卡和跳转链接。来源：第 3.3 节所列详情页。
- `[设计推断]` 当前项目是 Next.js + React + TypeScript，理论上可移植 React 源码包；但必须逐条核对条目来源、保留许可、确认依赖（GSAP / Three / vgpu / WebGPU）与性能预算。更稳妥的是**只移植设计原则、CSS 数值节奏与自写交互**，不直接复制整包。尤其不要通过 `npx skills add …` 自动拉代码进仓库，因为任务边界禁止安装依赖且会引入授权/供应链审查问题。

### 7.3 明确不能照搬的内容

`[直接观察到]` 依据 README、`/copyright`、`COPYRIGHT.md` 与 catalog：**网站文案与自我介绍、LeiBox logo / 雷师傅品牌、第三方设计参考、照片、人像海报、专辑封面、AI 品牌 SVG 标志、雪山湖泊/alpine-lake 背景、MiSans VF 字体文件及其署名条件、GLB/glTF/3D 模型、插画/吉祥物（蜘蛛、鲨鱼、帆船、猫等若有）、商标、可能受版权保护的预览图**。来源：[README:16,79–85](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md)、[`/copyright`](https://leibox.pantoria.cn/copyright)、[COPYRIGHT.md](https://raw.githubusercontent.com/leishifu666/LeiBox/main/COPYRIGHT.md)、[catalog `source`/`distribution`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json)、[首页 `img[srcset*="alpine-lake"]`](https://leibox.pantoria.cn/)。

`[设计推断]` 也不能照搬「58 / 100% / 4 文件 673 行 / 六框架 / 01–03」这些站点自己的读数与序列到个人站；用户明确禁止编号假序列、无意义箭头和假在线/心跳。若展示真实读数，只能来自当前项目真实内容/构建数据，读不到就如实写 `NOT AVAILABLE`。

---

## 8. 对当前项目的「采用 / 改造 / 避免」矩阵

> 本节的「当前项目需求」是用户任务与本地工作笔记给定；LeiBox 事实均已在前面注明来源。`[设计推断]` 适用于本矩阵的判断与建议。

| 观察项（LeiBox 一手依据） | 采用 | 改造 | 避免 | 理由 / 执行边界 |
|---|---|---|---|---|
| 无边框卡：`.lb-card` transparent / 0 border / no shadow；`/components` 卡同样无边框 | ✅ | 用细分隔线、图片本身、文字层级替代统一 SaaS 卡；七入口不要 7 张等尺寸圆角卡 | 把「无边框」理解为所有容器都无层次 | 直接针对「统一大圆角 / 每张同阴影 / 通用 SaaS 卡」；保留亮色文字容器 + 深色边缘背景的层级 |
| 1px dashed全宽分隔 + 128px band + 36px list gap | ✅ | 改成深青绿 `103733 / e3f1ef` 体系下的「潮汐刻度线」与不规则栏宽；保留疏密交替 | 照抄 01/02/03 编号步骤、58/100% 统计胶囊 | 节奏可学，模板文案不能学；不要编号假序列 |
| `--radius` token 分层：8 / 10 / 16 / 18 / pill | ✅ | 当前站可定义 2–3 档而非全站统一；正文容器接近直角，仅交互控件用 pill | 所有卡统一 18px 或全站 pill | 用户明确反对「统一大圆角」 |
| 字体：Geist Sans + MiSans VF / GeistMono | ❌ | 只借鉴中文 `line-height:1.18` / 负字距与 16/28px 正文节奏 | 引入 MiSans VF、改其他页面字体、全大写窄字距标签 | 用户要求其他页面字体保持不变；全大写窄字距标签被明确列为模板痕迹 |
| 黑白灰单色 token | ❌ | 换成已定深青绿 `#042421 / #103733 / #f4fffb / #a9dccc / #e3f1ef`；保留「一个强调色 + 灰度层级」的方法 | 照抄纯黑白，或加入蓝紫渐变 / 霓虹 | 当前项目色板已确定；LeiBox 的彩色多是第三方示例而非站点主题 |
| 玻璃 header `blur(24px)` / 浮层 `blur(24px)` | △ | 顶栏可保留**一层**轻玻璃；其余内容用实色 + 1px 边界 | 每张卡、每个面板都玻璃化 | 当前项目要求文字容器亮色、边缘背景深色/有层次；玻璃泛滥会回到 SaaS 模板 |
| Canvas 2D AmbientParticles（65/180 点、静帧兜底） | ❌ | 若需要可见动态背景，用纯 CSS/SVG 的**一条缓慢水位线 / 真实时钟刻度** | 粒子、扫描线、字符雨、WebGL/WebGPU、视频、鼠标视差 | 用户明确禁止粒子与 AI 化；「可见但不 AI 化」应由真实时间驱动 |
| reduced motion / IntersectionObserver / 暂停按钮 / destroy | ✅ | 任何新动效都必须有 `prefers-reduced-motion` 终态、可见性暂停、键盘可达与卸载清理 | 只做 hover 无 focus、滚动淡入无兜底 | 这是可复制的工程约束，不是视觉素材 |
| `sailing-toc`：滚动跟随 + 点击目录平滑跳转 | ✅ | 改造成水位刻度/章节游标替代帆船；只服务真实章节 | 帆船、弯曲虚线装饰、平滑滚动劫持 | 让「滚轮自然下滑」仍成立，滚动驱动只改变指示器，不劫持距离 |
| `stacked-metadata`：标签叠放，hover/focus 展开 | ✅ | 用于项目看板/笔记的真实标签（技术栈、日期、状态），键盘可展开 | 假优先级/假负责人、统一标签胶囊 | 真实数据优先；减少每卡重复元数据框 |
| `tactile-push-button`：纯 CSS 按压 + 空格键 | ✅ | 仅用于「终端」等 1–2 个关键入口 | 七入口全做弹性/果冻按钮 | 一处 tactile 反馈能成为手感，七处就是模板动效 |
| `fluid-tooltip`：导航滑块随入口变宽 | △ | 可改成 1px 下划线/水位刻度随当前路由移动，不用黑胶囊 | 聊天气泡形态、头像、AI 人形 | 满足「七个主入口默认完整页面」，同时避免统一卡片 |
| `share-invite`：展开式表单 + 本地状态说明 | △ | 留言板可用展开式真实表单，提交成功/失败由真实后端决定 | 假成员头像、假权限、假发送成功 | 用户要求真实数据，不能放假在线/心跳/假提交 |
| 蓝色棱纹、Agent composer、思考粒子、星空滑块、渐变卡环、品牌海报、专辑隧道 | ❌ | 至多借鉴「局部演示可暂停/重置」的控件模式 | 全部视觉与文案 | 蓝紫渐变 / 粒子 / 聊天泡泡 / Sparkles / AI 人形头像均属明确禁区 |
| 六框架/Skill/registry 代码包 | ❌ | 只读源码理解接口，不自动安装 | 直接 `npx skills add`、复制第三方代码包进当前仓库 | 任务禁止安装依赖；Commons Clause + 逐条来源核对；当前项目已自有组件体系 |
| 长画廊 6,779px / 7,640px | △ | 首页保留自然滚轮下滑、深青绿首屏 → 波浪 → 浅色长内容；控制总长，避免为炫技堆 6 个演示带 | 把每个应用路由都做成首页弹窗/半页 | 用户要求七个入口默认都是完整页面；首页是入口而不是全部内容 |
| 组件详情页「先真实演示，后文档」 | ✅ | 每个整页路由首屏先给真实内容/工具，再放说明 | 先放空壳 hero + 假数据卡 | 符合「真实数据」与「完整页面」 |

---

## 9. 给当前站点的设计方案与唯一 signature

### 9.1 3–5 条可执行建议

1. `[设计推断]` **把首页从「七张卡」改成「一张深青绿水位图 + 三段真实内容」**。100svh 首屏居中放自我介绍与北京时间/地点，不放假在线/心跳；一条 1px `#a9dccc` 水位线在首屏下缘，滚动后自然过渡到 `#e3f1ef` 浅色长内容。灵感来自 LeiBox 的「中央窄文本 → 全宽舞台 → 虚线分隔长内容」与本地已记录的「深青绿首屏 → 波浪 → 浅色长内容」节奏；不复制其 alpine-lake 图或 canvas 粒子。来源：[首页 `.landing-hero-demo` / `.hero-panel-enter` 实测](https://leibox.pantoria.cn/)、[本地 round2 笔记](../../../.superpowers/sdd/tmp/round2-design-and-plan.md)。
2. `[设计推断]` **七入口用「非对称索引」而非等尺寸网格**：中央一条主列出 4 个高频入口（终端 / 项目看板 / 笔记 / AI 助理），右侧窄列放 3 个低频入口（关于本机 / 歌单 / 留言板），每项只有中文名、一句真实说明、一个真实路由与一条细下划线；hover/focus 只移动 1px 水位刻度，不做箭头、阴影、统一大圆角。借鉴 `/components` 无边框卡与 `fluid-tooltip` 导航指示，但不复制胶囊/气泡。来源：[`/components` 卡片 computed style](https://leibox.pantoria.cn/components)、[Fluid Tooltip 条目](https://leibox.pantoria.cn/components)、[Sailing TOC 滚动跟随](https://leibox.pantoria.cn/docs/animations/sailing-toc)。
3. `[设计推断]` **每个整页路由首屏先给真实内容**：终端是可输入命令区、项目看板是真实项目、笔记是真实文章、留言板是真实表单；次级说明放在内容之后。文字容器用 `#f4fffb` / `#e3f1ef` 亮色实底，页面边缘保留 `#042421 / #103733` 深青绿层次；只顶栏用一层轻玻璃，避免全站玻璃卡。借鉴详情页「先 715×547 iframe 演示，再安装/API」的信息顺序。来源：[SailingToc 详情 iframe 实测](https://leibox.pantoria.cn/docs/animations/sailing-toc)、[首页 header / `.lb-card` / `.lb-showcase` computed style](https://leibox.pantoria.cn/)。
4. `[设计推断]` **动效预算写死**：入场 ≤0.24s / ≤8px、hover/focus 150ms、单个常驻背景动效周期 ≥8s、只改 `opacity` 或 1px 线的 `transform`；必须有 `prefers-reduced-motion` 静帧、可见性暂停、键盘 focus 与卸载清理；禁止 canvas/WebGL/粒子/视频/鼠标视差。这是把 LeiBox 中克制的部分（`.page-enter .24s` / 150ms hover / reduced motion / IntersectionObserver）工程化，而不是搬它的粒子实现。来源：[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)、[`3jks3s7uzxikm.js`](https://leibox.pantoria.cn/_next/static/chunks/3jks3s7uzxikm.js)、[`/docs/rendering`](https://leibox.pantoria.cn/docs/rendering)。
5. `[设计推断]` **保留字体与真实数据边界**：其他页面字体不变；不出现全大写窄字距眉标、编号假序列、无意义箭头、假在线/心跳、假统计；所有时间/地点/项目/留言都来自真实数据，读不到显示 `NOT AVAILABLE`。来源：用户任务约束、[本地 round2 笔记](../../../.superpowers/sdd/tmp/round2-design-and-plan.md)；LeiBox 的「本地演示/不会发送邮件」提醒见 [Share Invite](https://leibox.pantoria.cn/docs/components/share-invite)、[OTP](https://leibox.pantoria.cn/docs/components/otp-verification)。

### 9.2 建议首页线框（桌面）

```text
┌──────────────────────── 深青绿 #042421 ─────────────────────────┐
│ 顶栏：Z · 北京 · 真实时间        七个完整页路由（文字，不是卡）  │
│                                                                │
│                         （居中，不是左栏）                      │
│                     赵小元 / 一句真实自我介绍                   │
│                 全栈 · AI 应用 · 在北京                        │
│                                                                │
│          ┌──────────── 真实内容窄台 ────────────┐              │
│          │ 当前在做什么（有源）  │ 最近一篇笔记（有源）│       │
│          └──────────────────────────────────────┘              │
│  ~~~~~~~~~~~~ 1px 水位线 + CSS 波浪过渡到浅色 ~~~~~~~~~~~~~~~  │
├────────────────────── 边缘 #103733 深青绿 ──────────────────────┤
│  ┌────────────────── 亮色 #f4fffb 文字容器 ─────────────────┐  │
│  │  主列：终端 / 项目看板 / 笔记 / AI 助理（四条细线索引） │  │
│  │  右窄列：关于本机 / 歌单 / 留言板                       │  │
│  │  真实项目摘要 · 真实笔记列表 · 真实留言入口             │  │
│  └──────────────────────────────────────────────────────────┘  │
│  footer：地点 / 真实数据说明 / NOT AVAILABLE 规则                │
└────────────────────────────────────────────────────────────────┘
```

### 9.3 建议整页路由线框

```text
┌ 深青绿顶栏：当前页名 + 七入口文字导航 + 水位刻度 ─────────────┐
│ 深色边缘 / 层次背景                                           │
│   ┌──────── 亮色实底文字容器，字体不变 ────────┐             │
│   │ H1 + 一句真说明                            │             │
│   │ 先：真实工具 / 真实列表 / 真实文章内容      │             │
│   │ 后：来源、时间、相关入口（无卡墙）          │             │
│   └────────────────────────────────────────────┘             │
│ 底部：返回首页 / 上一项 / 下一项（文字，不用箭头）            │
└──────────────────────────────────────────────────────────────┘
```

### 9.4 唯一记忆点 / signature：「北京时间的真实潮汐栏」

`[设计推断]` **定义**：全站只有一条 1px 深青绿/薄荷色水平刻度线。首页它位于首屏与浅色内容之间，随滚轮自然下滑变成左侧/顶部的章节刻度；每个完整页路由复用同一条线，线旁只显示**真实北京时间**（`Asia/Shanghai`）与当前页在七个入口中的序号/名称（来自真实路由表）。线的轻微起伏用纯 CSS `clip-path`/`border-radius` 完成，周期 ≥8s；`prefers-reduced-motion` 时静止；不接天气/在线/心跳，不显示无法验证的读数。

**为什么它不是模板套路**：

- 它不是蓝紫渐变、霓虹、粒子、扫描线、聊天泡泡、Sparkles 或 AI 人形头像，也不依赖鼠标视差；甚至不是一张卡。依据：用户任务禁区 + [LeiBox AmbientParticles 源码](https://leibox.pantoria.cn/_next/static/chunks/3jks3s7uzxikm.js) 的反面参照。
- 它承载「潮汐工作台 / 北京 / 真实数据」三重语义：时间来自系统时钟与 `Asia/Shanghai`，入口顺序来自真实路由，读不到的数据不编造；不是 LeiBox 的「58 / 100%」式展示数字，也不是假在线状态。依据：用户任务约束、[本地 round2 笔记](../../../.superpowers/sdd/tmp/round2-design-and-plan.md)、[首页 FAQ/统计文本](https://leibox.pantoria.cn/)。
- 它把 LeiBox 值得学的「`sailing-toc` 滚动跟随」「虚线分隔」「单一局部动效」压缩成一个跨页面连续元素：不是 58 个特效轮播，不是统一大圆角卡，不是每屏阴影；「一条线随真实时间/路由变化」比装饰性水位光点更克制。依据：[Sailing TOC](https://leibox.pantoria.cn/docs/animations/sailing-toc)、[首页 `border-top: .666667px dashed` 与 `.reveal` 实测](https://leibox.pantoria.cn/)、[`2t77hwbj8404l.css`](https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css)。
- 它不复制参考站 `https://s1316339343.github.io/ssyunduan.xyz/` 的文案、猫/雨/萤火虫/头像/插画或 139+143 个 SVG 场景，只保留「深色首屏 → 波浪 → 浅色长内容」的排版节奏。依据：[本地 round2 笔记第 2–3 节](../../../.superpowers/sdd/tmp/round2-design-and-plan.md)。
- 它可访问且可验证：一条线不遮挡文字；reduced motion 静止；无 JS 时仍是普通分隔线；时间/路由都有源头；不是需要 canvas/WebGL 或第三方字体/插画才能存在的视觉。

---

## 10. 未解决 / 无法验证项与空白

1. `[直接观察到]` `WebFetch` 无法验证 `leibox.pantoria.cn` 域名安全，`WebSearch` 未索引站点子页；本报告改用 curl、Playwright、GitHub/raw/API 与公开 bundle 取得一手证据。来源：WebFetch / WebSearch 实测（第 1.1 节）。
2. `[直接观察到]` 常规根目录 `/LICENSE` raw 路径返回 `404`；实际许可文件是 `LICENSE.md`。未找到独立的 `docs/` 官方站外文档域名、npm package 发布页或独立组件库 API 文档站；首页导航的 `/docs` 就是文档入口。来源：[`/LICENSE` 404](https://raw.githubusercontent.com/leishifu666/LeiBox/main/LICENSE)、[`/LICENSE.md`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/LICENSE.md)、[首页 HTML 链接清单](https://leibox.pantoria.cn/)。
3. `[直接观察到]` 猜测的 `/registry.json`、`/ai-catalog.json`、`/public/registry.json` 等站点路径均返回 404；真实 catalog 是仓库 raw 的 `public/ai/catalog.json`，registry builder 输出到构建期 `public/r/registry.json`，本次未验证线上 `public/r/registry.json` 是否存在。来源：curl 探测；[`scripts/build-registry.mts`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/scripts/build-registry.mts)。
4. `[直接观察到]` 本次逐页打开了 8 个代表性详情页，另外 50 个详情页的正文与交互描述来自 `/components` 的一手文本与 catalog 元数据，未逐个打开 iframe 或验证其运行时；不能宣称 58 个演示都实际跑通。来源：[`/components`](https://leibox.pantoria.cn/components)、[catalog.json](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json)。
5. `[直接观察到]` 未读取仓库全部 2,000 个 tree 条目，未审计每个组件目录内的 `LICENSE` / `*.LICENSE` / 图片/模型授权链；`COPYRIGHT.md` 明确说有些原设计许可尚未独立核实。因此任何具体组件在复用前仍需逐条核对。来源：[GitHub tree API](https://api.github.com/repos/leishifu666/LeiBox/git/trees/main?recursive=1)、[COPYRIGHT.md:17–21](https://raw.githubusercontent.com/leishifu666/LeiBox/main/COPYRIGHT.md)。
6. `[直接观察到]` 未验证 `/docs/mcp` 的完整正文、Skill 安装命令实际执行结果、MCP endpoint 是否存在；只确认页面 200、README/`/docs/installation` 的命令原文、SKILL.md 与 catalog 可达。任务也明确禁止安装依赖。来源：[`/docs/mcp`](https://leibox.pantoria.cn/docs/mcp)、[README](https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md)、[`public/ai/SKILL.md`](https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/SKILL.md)。
7. `[直接观察到]` 未做颜色对比度、键盘全链路、屏幕阅读器、打印、无 JS、低网速或跨浏览器测试；reduced motion 测试发现屏幕外 `.reveal` 仍可能为 `opacity: 0`，不能宣称完整 a11y 通过。来源：Playwright reduced-motion computed style 于 [首页](https://leibox.pantoria.cn/)。
8. `[直接观察到]` 首页浏览器控制台出现 GitHub API CORS/loopback 错误（2 errors + 1 warning）；未判断其是否影响站内 GitHub 星标显示，不能把该动态读数当可靠事实。来源：Playwright console 于 [首页](https://leibox.pantoria.cn/)。
9. `[直接观察到]` 未访问/验证用户另一个参考站 `https://s1316339343.github.io/ssyunduan.xyz/`；本报告中所有关于「深青绿首屏 → 波浪 → 浅色长内容」的描述均转引自仓库内既有工作笔记，并明确标为本地项目上下文，不是本次对参考站的一手实测。来源：[`.superpowers/sdd/tmp/round2-design-and-plan.md`](../../../.superpowers/sdd/tmp/round2-design-and-plan.md)。
10. `[直接观察到]` 本报告没有验证当前 Z-Blog 工作区代码、CSS、测试或线上部署状态，也没有运行项目测试；所有「给当前站点」的内容均为设计建议，不表示已实现。仓库当时已存在大量未提交改动，本次未触碰。来源：任务边界与 `git status --short` 只读检查。

---

## 11. 一手来源 URL 总表

### 11.1 站点页面

- https://leibox.pantoria.cn/
- https://leibox.pantoria.cn/components
- https://leibox.pantoria.cn/docs
- https://leibox.pantoria.cn/docs/installation
- https://leibox.pantoria.cn/docs/rendering
- https://leibox.pantoria.cn/docs/mcp
- https://leibox.pantoria.cn/copyright
- https://leibox.pantoria.cn/privacy
- https://leibox.pantoria.cn/definitely-missing-page-research-20261110 （404 测试）
- https://leibox.pantoria.cn/docs/animations/sailing-toc
- https://leibox.pantoria.cn/docs/components/orbit-not-found
- https://leibox.pantoria.cn/docs/animations/tactile-push-button
- https://leibox.pantoria.cn/docs/components/share-invite
- https://leibox.pantoria.cn/docs/animations/blue-fluted-glass
- https://leibox.pantoria.cn/docs/animations/glass-folder
- https://leibox.pantoria.cn/docs/components/particle-scroll
- https://leibox.pantoria.cn/docs/components/otp-verification

### 11.2 CSS / 字体 / JS bundle

- https://leibox.pantoria.cn/_next/static/chunks/2t77hwbj8404l.css
- https://leibox.pantoria.cn/_next/static/chunks/3emxx0wqex-8t.css
- https://leibox.pantoria.cn/_next/static/chunks/1ghc4rhmajt88.css
- https://leibox.pantoria.cn/_next/static/chunks/0s77ddh8od065.css
- https://leibox.pantoria.cn/_next/static/chunks/22virj_ogtzci.css
- https://leibox.pantoria.cn/_next/static/chunks/312lna3mvqfa8.css
- https://leibox.pantoria.cn/fonts/misans.css
- https://leibox.pantoria.cn/assets/motion/277409f80fe93bffdd9f8d5b.css
- https://leibox.pantoria.cn/_next/static/chunks/3jks3s7uzxikm.js
- https://leibox.pantoria.cn/_next/static/chunks/3t39t2k0bw_2d.js
- https://leibox.pantoria.cn/_next/static/chunks/0whjn--8u41ju.js
- https://leibox.pantoria.cn/_next/static/chunks/0fn8_yd-yhnh4.js
- https://leibox.pantoria.cn/_next/static/chunks/0qsaadr9m5xsc.js
- https://leibox.pantoria.cn/_next/static/chunks/34l7z_sncbak1.js
- https://leibox.pantoria.cn/_next/static/chunks/3qyxqsfpig9ax.js
- https://leibox.pantoria.cn/_next/static/chunks/01okt656te_ri.js
- https://leibox.pantoria.cn/_next/static/chunks/0iec5q4ack_04.js
- https://leibox.pantoria.cn/_next/static/chunks/0jvoozoq-e1uh.js
- https://leibox.pantoria.cn/_next/static/chunks/0nk_x0x8g-sqx.js

### 11.3 GitHub 仓库、源码与 API

- https://github.com/leishifu666/LeiBox
- https://api.github.com/repos/leishifu666/LeiBox
- https://api.github.com/repos/leishifu666/LeiBox/git/trees/main?recursive=1
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/README.md
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/LICENSE.md
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/COPYRIGHT.md
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/package.json
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/components.json
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/src/data/component-catalog.ts
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/catalog.json
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/public/ai/SKILL.md
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/integrations/skills/leibox/SKILL.md
- https://raw.githubusercontent.com/leishifu666/LeiBox/main/scripts/build-registry.mts
- https://github.com/DavidHDev/canvas-ui/blob/main/LICENSE.md （仅由 `COPYRIGHT.md` 指向的历史基础代码许可，本报告未独立审计其内容）
- https://hyperos.mi.com/font/zh/ （首页 meta 指向的 MiSans VF 字体官方署名页，本报告未打开验证字体许可）

### 11.4 本地项目上下文（不是 LeiBox 一手来源）

- `docs/superpowers/specs/2026-11-09-personal-dev-os-redesign.md`
- `.superpowers/sdd/tmp/round2-design-and-plan.md`
- `docs/superpowers/specs/`、`docs/superpowers/plans/`、`.superpowers/sdd/tmp/`（目录约定）

### 11.5 未找到 / 404 / 未验证的源码与子页面

- `https://raw.githubusercontent.com/leishifu666/LeiBox/main/LICENSE`：404；实际为 `LICENSE.md`。
- `https://leibox.pantoria.cn/registry.json`、`/ai-catalog.json`、`/public/registry.json`、`/public/ai-catalog.json`、`/registry/index.json`、`/public/registry/index.json`：均 404；真实 catalog 在 GitHub raw，线上 `public/r/registry.json` 未探测。
- `https://leibox.pantoria.cn/definitely-missing-page-research-20261110`：真实 404 页面，可达但不属于正常导航；不能据此断言全站使用 Orbit 404 组件。
- 未找到独立 npm 包发布页、独立 docs 域名、公开的 MCP endpoint 文档正文验证、每个第三方组件原作者许可审计结果。
- 首页 WebFetch 被域名安全校验拒绝、WebSearch 未索引子页；不是页面本身 404。

---

**调研结束。** 本报告只包含外部观察、源码事实与明确标注的设计推断；没有修改当前项目实现，也没有把任何 LeiBox 文案、素材或代码写入项目代码。
