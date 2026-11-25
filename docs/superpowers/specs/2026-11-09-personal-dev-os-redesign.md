# Personal Dev OS 改版 · 设计文档

日期：2026-11-09
状态：v1 待评审
分支建议：从 `refactor/personal-space` 切出 `redesign/dev-os` 实施；验收前不合并 `main`。
前序文档：`docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`（内容层与账号体系继续沿用；本文替换其视觉系统与首页结构）。

## 0. 这次改版改什么

现有站点是「观测台」：暗色仪器面板、1px 硬线、宋体标题、等宽读数，内容是页 + 滚动。它解决了「不像模板站」，但没有解决「第一眼就想动手玩」。

这次改版把站点从「一个好看的博客」变成「一台正在运行的个人工作站」：

- 首页是桌面，不是文章列表；图标、窗口、任务栏、终端、桌面物件构成第一印象。
- 每个应用背后是真内容或真工具：日志、胶囊、项目、片段、笔记、书架、歌单、信箱、关于、助理。
- 应用页是最大化窗口，URL 真实可分享，SEO 与移动端不牺牲。
- 动效来自交互：开窗、拖拽、最小化、终端输入、滚动时间线；唯一的常驻氛围是壁纸微光和时钟。
- 视觉是「复古终端 × 现代桌面」：深灰、米白、琥珀磷光；低彩度、细边框、轻微玻璃、柔和低阴影。

一句话定位：

> Z·OS —— 一台一直开着的个人工作站。记录生活，做点东西，随便翻翻。

## 1. 目标与非目标

### 1.1 目标

- 第一次打开，不滚动就能看到：桌面、12 个应用图标、任务栏、实时状态组件、桌面便签。3 秒内理解「这是一个可以点、可以开窗、可以输入命令的地方」。
- 任意一个图标点开都有真内容；终端输入 `help` 有真实回应；窗口能拖动、缩放、最小化、最大化、关闭。
- 应用页保留壁纸与任务栏，内容在最大化窗口里；深链接、刷新、分享、SEO 都正常。
- 移动端是「手机主屏 + 全屏应用」：不拖拽窗口，不缩小桌面，内容可读、可点、可返回。
- 日常分享的发布压力保持低：一条短句、一张照片、一个标签就能发。
- 视觉与动效有辨识度，且明确避开 AI 站套路：没有蓝紫渐变、霓虹、粒子、扫描线、聊天气泡。
- 现有内容层、账号、评论、信箱、歌单、书架、AI 问答、语义搜索全部保留，不做无谓重写。

### 1.2 非目标

- 不做全站 SPA。应用页仍是真实路由与服务端渲染；只有桌面窗口状态是客户端。
- 不做完整文件系统、代码编辑器、游戏、邮件客户端、音乐播放器。终端是导航与彩蛋，不是真 shell。
- 不做开机动画、全屏加载动画、默认音效、自定义鼠标、鼠标拖尾。
- 不做多桌面、窗口贴边吸附、分屏管理、窗口分组。首版窗口管理只做打开/聚焦/拖拽/缩放/最小化/最大化/关闭。
- 不重写笔记、书架、歌单、信箱、更新日志、友链的内容逻辑；第一阶段只套新外壳与新 token。
- 不为了「像 OS」而造假数据、假进程、假在线状态、假文件。所有读数必须有源。

## 2. 视觉系统

### 2.1 三套桌面预设

预设同时决定明暗 token 与壁纸，避免「暗色配稿纸」这类不协调组合。默认 `夜班`。

| 预设 | 明暗 | 壁纸 | 用途 |
| --- | --- | --- | --- |
| 夜班 `night` | 暗 | 暖黑桌面 + 右上琥珀台灯 + 细网格 + 极轻噪点 | 默认，夜间与代码场景 |
| 稿纸 `paper` | 亮 | 暖纸底 + 横向稿线 + 左侧琥珀页边线 + 纸纹 | 白天、多图、截图阅读 |
| 蓝图 `blueprint` | 暗 | 冷灰蓝底 + 技术网格 + 微弱琥珀角光 | 备选，不改变强调色 |

`夜班` 与 `蓝图` 使用 `dark` 类；`稿纸` 使用亮色 token。壁纸由 `<html data-wallpaper="night|paper|blueprint">` 控制。预设切换写入 `localStorage`，并在 `<head>` 内联脚本中于首帧前恢复，避免闪白/闪暗。

### 2.2 颜色与对比度

所有值以 `globals.css` 为唯一来源；组件只使用 token，不写死十六进制。

| Token | 夜班 | 稿纸 | 蓝图 | 用途 |
| --- | --- | --- | --- | --- |
| `--desk` | `#0f0e0c` | `#e7e1d5` | `#131719` | 桌面底 |
| `--window` | `#1a1814` | `#f6f2e9` | `#1a2023` | 窗口面 |
| `--window-2` | `#211e19` | `#eee8dc` | `#21282c` | 标题栏、凹陷区 |
| `--ink` | `#ece6d8` | `#1b1915` | `#e4e8e6` | 正文 |
| `--ink-dim` | `#a39a8a` | `#625c51` | `#98a3a1` | 弱字、标签、单位 |
| `--rule` | `#352f27` | `#d2cabd` | `#2d373a` | 唯一分隔手段，1px 实线 |
| `--phosphor` | `#d9a05b` | `#8a5a24` | `#d9a05b` | 主强调、链接、读数、活动窗口线 |
| `--ok` | `#8fae86` | `#3f6241` | `#87a995` | 在线、已完成、已通过 |
| `--warn` | `#d3a35c` | `#8a5f1c` | `#d0a35f` | 待审、进行中、维护中 |
| `--danger` | `#cf8070` | `#9e4a3b` | `#c97f70` | 告警、失败、未读 |
| `--info` | `#9fb3bd` | `#47616e` | `#9fb8c4` | 蓝图网格与非文字装饰，不承担状态语义，不用于正文/读数 |
| `--primary-foreground` | `#1a1814` | `#f6f2e9` | `#1a1814` | 琥珀底上的文字 |

硬约束：

- `--phosphor`、`--ok`、`--warn`、`--danger` 的 OKLCH 彩度必须 ≤ 0.12。这是「不像霓虹」的可测量形式，由 `scripts/tokens.test.mjs` 机器复查。
- 四个语义色含义固定，不得挪用。`--info` 不是状态色，不用于「成功/失败/待审」。
- 任何语义色不做大面积铺底、不进装饰性渐变、不做投影色。
- 正文 `--ink` 对 `--window-2` 的对比度 ≥ 7:1；`--ink-dim` 与四个语义色 ≥ 4.5:1。两套明暗、三套预设都要过。
- 窗口层级只用「亮度差 + 1px `--rule` + 柔和阴影」表达；不用发光描边。
- 装饰性渐变只允许壁纸的柔光与网格；窗口、按钮、卡片一律纯色。

保留旧组件使用的 shadcn 变量名作为别名，避免一次性改所有组件：

```
--background: var(--desk)
--foreground: var(--ink)
--card / --popover / --panel: var(--window)
--card-foreground / --popover-foreground: var(--ink)
--secondary / --muted / --accent / --panel-2: var(--window-2)
--muted-foreground: var(--ink-dim)
--border / --input / --rule: var(--rule)
--primary / --data: var(--phosphor)
--destructive / --alert: var(--danger)
--wait: var(--warn)
--ok: var(--ok)
```

`--chart-1..5` 继续绑定 `--data`、`--ok`、`--wait`、`--alert`、`--muted-foreground`。

### 2.3 字体

| 角色 | 字体 | 规则 |
| --- | --- | --- |
| 应用标题、窗口标题、桌面标签、读数、路径、终端 | Geist Mono | 11–15px；标签 `uppercase` + `letter-spacing: 0.12em`；中文值不加大字距 |
| 正文、说明、表单、文章正文 | Geist Sans + 系统中文无衬线 | 15–16px，行高 1.7；文章正文最大 68ch |
| 文章内标题 | Geist Mono | 与正文形成技术感反差 |
| 手写体 / 思源宋体 | 不使用 | 移除 `@fontsource-variable/noto-serif-sc` 依赖，减少字体体积 |

- 所有数字一律 `font-variant-numeric: tabular-nums`。走秒、读数、日期、计数都不许抖。
- 代码使用等宽字体；Shiki 代码块与片段应用同一套暖色双主题。
- 不允许用「书法体/手写体」做点缀；那是模板站与 AI 站最常见的廉价个性。

### 2.4 壁纸与氛围

壁纸全部由 CSS/SVG 生成，不引入图片资源。

- **夜班**：`--desk` 底；右上角一团半径约 900px、透明度 8–10% 的琥珀柔光；32px 网格（`--rule`，透明度约 18%）；一层 2–3% 的 SVG 噪点。鼠标位置有一团半径约 600px、透明度 6–8% 的琥珀光，使用 lerp 缓动跟随。
- **稿纸**：`--desk` 暖纸底；28px 横向稿线（`--ink`，透明度 4–5%）；左侧 72px 处一条琥珀页边线（透明度 6%）；纸纹噪点。
- **蓝图**：`--desk` 冷灰底；24px 技术网格（`--info`，透明度 5%）；右上极弱琥珀角光。
- 网格层随鼠标做 2–4px 视差；柔光做 9 秒一次的极慢呼吸（透明度在 4%–7% 之间）。
- `prefers-reduced-motion: reduce` 下：网格静止、柔光静止、呼吸关闭。
- 触屏设备不启用鼠标光。
- 壁纸不是「背景图轮播」，不自动切换；只在系统菜单或右键菜单中手动选择。

### 2.5 窗口

- 窗口 = 1px `--rule` 边框 + `--window` 底 + 4px 圆角 + 柔和低阴影。活动窗口标题栏顶部一条 1px `--phosphor` 线；非活动窗口标题栏文字降为 `--ink-dim`。
- 标题栏高 34px，`--window-2` 底。左侧：应用图标 + 应用名 + 可选路径（`~/life`）；右侧：`↗`（在新页面打开，仅桌面窗口有）、`—` 最小化、`□` 最大化、`×` 关闭。
- 控制按钮 24×24，悬停底色 `color-mix(in oklch, var(--ink) 8%, transparent)`；关闭按钮悬停文字转 `--danger`。不使用 macOS 红黄绿圆点。
- 窗口内容区独立滚动，滚动条 8px、`--rule`/`--ink-dim`。桌面本身不滚动。
- 阴影：暗色 `0 24px 80px -24px rgba(0,0,0,.65), 0 2px 8px rgba(0,0,0,.25)`；亮色 `0 24px 60px -28px rgba(40,32,20,.25), 0 1px 3px rgba(40,32,20,.08)`。阴影只给窗口、任务栏、启动器、菜单，不给文字和图标。
- 轻微玻璃只用于任务栏、启动器、系统菜单、Spotlight：`backdrop-filter: blur(14px)` + 80–95% 窗口底色。窗口本体不透明，保证正文清晰。`prefers-reduced-transparency: reduce` 下全部改为纯色。

### 2.6 图标与桌面物件

- 12 个桌面图标：终端、每日日志、生活胶囊、项目看板、代码片段、关于本机、笔记、书架、歌单、信箱、更多、助理。
- 图标为自定义单色线性 SVG，1.5px 描边，24×24 viewBox，放在 48×48 的圆角底板（6px 圆角、`--window` 55% 底、1px `--rule`）上；标签 11px 等宽，最多两行。
- 悬停：整体上浮 2px、边框转 `--phosphor`、标签转 `--phosphor`；不发光、不弹跳。选中：边框 `--phosphor`，标签保持 `--ink`。
- 图标含义必须直白：终端是 `>_`，片段是 `</>`，项目是看板三列，胶囊是照片叠层，信箱是信封，更多是文件夹，助理是带 `>` 的对话框。助理不用「AI 星芒」图标。
- 桌面物件（仅桌面端显示，可在设置中关闭）：
  - 左下角咖啡杯：悬停冒一点热气；点击触发一次 2 秒的热气动画并打印终端彩蛋 `coffee`。
  - 右上角拍立得：显示最新一张生活照片；没有照片时显示空白相纸与 `NO PHOTO`；点击打开生活胶囊。
  - 右下角磁带：标签写 `PLAYLIST`；点击打开歌单。不放实时曲目，避免额外 DB 读取。
  - 物件不自动播放动画，不发出声音，不遮挡窗口操作。

### 2.7 反 AI 感硬约束

以下任一出现即视为设计错误：

- 蓝紫渐变、霓虹外发光、粒子/数据流背景、扫描线、全屏玻璃拟态。
- 常驻漂浮元素、无意义的呼吸灯、自动播放音频、自定义鼠标。
- AI 拟人头像、圆润聊天气泡、Sparkles 星芒图标、把「AI」当装饰词。
- 假在线状态、假进程、假读数、假文件、假进度、假的「实时」。
- 为装饰存在的 `01 / 02 / 03` 编号、无意义的大写英文水印。
- 把桌面做成 Win95/XP 复刻皮肤；本次是「温暖的工作站」，不是复古主题公园。

## 3. 信息架构

```
/                    桌面（Desktop）
/life                每日日志（全屏应用）
/life/[id]           单条日志
/gallery             生活胶囊
/projects            项目看板
/snippets            代码片段
/about               关于本机
/notes               笔记
/notes/[slug]        单篇笔记
/shelf               书架
/playlist            歌单
/letters             信箱
/journal             更新日志（原开发日志）
/friends             友链
/login               登录
/write               写一条（站长）
/admin               管理（站长）
/style               样式走廊（仅开发环境）
```

路由变化只有一处：`/` 从「生活流」改为「桌面」；原生活流迁到 `/life`。`/life/[id]`、`/notes/[slug]`、旧 `/blog`、`/changelog`、`/guestbook` 的现有 308 重定向、RSS、Sitemap 全部保留。

导航唯一来源是应用注册表（`src/config/apps.ts`），不再维护 `siteConfig.nav` / `footerNav` 两套。页脚删除，链接进入「更多」文件夹、系统菜单与关于本机。

## 4. 首页桌面

### 4.1 布局

桌面区域 = 视口高度减去 48px 任务栏。桌面本身不滚动，窗口内容独立滚动。

```
┌──────────────────────────────────────────────────────────────────┐
│ Z·OS  赵小元 · 在杭州，最近在学做饭                     07:42:11 │
│                                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐                    ┌─────────────┐   │
│  │ >_   │ │ ▤    │ │ ▦    │                    │ 此刻        │   │
│  │ 终端 │ │ 日志 │ │ 胶囊 │                    │ 17° 阴 杭州 │   │
│  └──────┘ └──────┘ └──────┘                    │ ♪ 越难越爱  │   │
│  ┌──────┐ ┌──────┐ ┌──────┐      ┌─────────┐  │ 手动 10.30  │   │
│  │ ▥    │ │ </>  │ │ ◉    │      │ 项目看板│  └─────────────┘   │
│  │ 项目 │ │ 代码 │ │ 关于 │      │  [窗口] │                    │
│  └──────┘ └──────┘ └──────┘      └─────────┘  ┌─────────────┐   │
│  ┌──────┐ ┌──────┐ ┌──────┐                    │ 📌 桌面便签 │   │
│  │ 笔记 │ │ 书架 │ │ 歌单 │                    │ 11.03 …     │   │
│  └──────┘ └──────┘ └──────┘                    └─────────────┘   │
│  ┌──────┐ ┌──────┐ ┌──────┐                                     │
│  │ 信箱 │ │ 更多 │ │ 助理 │            ☕              📷        │
│  └──────┘ └──────┘ └──────┘                                     │
├──────────────────────────────────────────────────────────────────┤
│ ▶  终端   每日日志   项目看板                   07:42    ≡        │
└──────────────────────────────────────────────────────────────────┘
```

- 左上角是站点身份：`Z·OS` + 站名 + 状态句；12px 等宽，两行，不抢图标。
- 图标 3 列 × 4 行，从左上开始，间距 16×12px；不使用自由散落图标，保证可读与键盘导航。
- 右上角桌面便签、右下角实时状态组件、左下角咖啡杯、右下角拍立得/磁带。窗口浮在它们之上。
- 视口宽度 < 1024px 时：状态组件折叠为底部窄条；便签缩小；窗口默认最大化。视口 < 768px 时进入移动端主屏。

### 4.2 桌面图标行为

- 桌面端：单击选中（琥珀边框），双击打开；`Enter`/`Space` 打开；`Tab` 在图标与任务栏之间移动。触屏/移动端：单击直接打开。
- 窗口型应用（日志、胶囊、项目、片段、关于、更多）在桌面打开浮窗；路由型应用（笔记、书架、歌单、信箱）进入最大化应用页；终端/助理打开覆盖层窗口。
- 路由型与窗口型应用图标同时是真实链接：`href` 指向应用路由，JS 关闭时直接跳转。终端、助理、更多是按钮，无 JS 时由 §4.9 的 `<noscript>` 列表兜底，不出现「点了没反应」。
- 每个图标有 tooltip（400ms 延迟）显示一句应用说明，例如「项目看板 — 进行中 2 · 已完成 1」。

### 4.3 任务栏

- 高 48px，底部固定，背景 80% `--window` + 14px 模糊，顶部 1px `--rule`。
- 左侧：启动器按钮（`Z` 字标）；当前打开的应用项（图标 + 名称，最大 180px，截断）。活动项底部 2px `--phosphor`，最小化项降透明度。
- 右侧：时钟（`HH:mm`，等宽，与状态组件共用同一个时钟源）、系统菜单 `≡`。账号入口在系统菜单内，不单独占任务栏。
- 任务栏不显示天气与提交数；这些读数放在桌面状态组件与 `/life` 顶部，避免每个页面都读外部数据。
- 应用页上，任务栏仍显示：当前应用项 + 桌面上已打开的其他窗口项。点击桌面窗口项回到 `/` 并唤起该窗口，窗口开合状态在路由切换间保持。
- 移动端首页使用 56px 底部 dock（终端、日志、胶囊、项目、更多）；应用页隐藏 dock，改用顶部应用栏返回。

### 4.4 启动器与系统菜单

**启动器**（点击任务栏 `Z` 字标）：

- 任务栏上方弹出面板，宽 420px；4 列应用网格，包含所有应用（含更新日志、友链、设置）；顶部「应用」+ `⌘K 搜索` 按钮；底部「系统设置」「关于本机」。
- 点击应用：首页开窗/切换窗口；应用页直接路由；覆盖层应用打开对应窗口。点击外部或 `Esc` 关闭。

**系统菜单**（点击任务栏 `≡`）：

- 桌面：夜班 / 稿纸 / 蓝图（单选）；桌面物件开关；重置窗口布局。
- 系统：关于本机、更新日志、友链、RSS、GitHub。
- 账号：复用现有会话与 `AccountMenu` 逻辑；登录/退出、我的推荐、管理（`owner`）、写一条（`owner`）。服务端读取会话，不在客户端读 cookie。

### 4.5 右键菜单

桌面空白处右键：

- 桌面预设 → 夜班 / 稿纸 / 蓝图
- 打开终端
- 全部应用
- 关于本机

菜单 220px 宽，`--window` 95% 底 + 1px `--rule` + 柔和阴影，项高 28px；方向键选择，`Esc` 关闭。应用页与窗口内不接管右键，保留浏览器默认行为。

### 4.6 实时状态组件

位置：桌面右下角，宽 280px；`< 1024px` 折叠为 280×56 的窄条，放在任务栏上方。

| 读数 | 源 | 无源时 |
| --- | --- | --- |
| `LOCAL TIME` | 站内时钟（北京时间） | 不可能无源 |
| `WEATHER` | Open-Meteo，服务端取，缓存 5 分钟 | `NOT AVAILABLE` |
| `NOW PLAYING` | `src/config/portfolio.ts` 的 `now.listening` | `NOT AVAILABLE`，并标「手动 · 更新于 YYYY.MM.DD」 |
| `READING` | `now.reading` | 同上 |
| `COMMITS 14D` | `GET /api/github` 的 `days[]` 最近 14 天求和 | `NOT AVAILABLE`；事件接口截断时显示 `≥N` |

- 组件由服务端渲染读数，客户端只负责走秒与展开/折叠。
- 点击组件展开为 360px 面板：90 天 GitHub 提交热图、建站天数、动态总数、本月条数；再点收起。提交热图用 `getGithubActivity().days`，建站/动态/本月用 `getObservation`；`/journal` 现有的 changelog 热图仍用 `buildActivityDays`，两者不混用。
- 不显示「服务器在线」，除非接入真实存活探测。不显示假心跳、假进程。
- 移动端：状态组件变成首页图标网格下方的一张卡片，读数两列。

### 4.7 桌面便签

- 数据源：`site_settings` 的 `desktop_pin_moment` = 某条 moment 的 id。站长在管理页选择最近 20 条之一，或选择「不钉」。
- 显示：220×180 暖纸色便签，轻微 -1.5° 旋转，悬停回正；左上角一枚琥珀图钉；内容为动态正文（最多 60 字）、日期、地点、标签。
- 点击打开 `/life/[id]`；站长在动态详情页可直接「钉到桌面 / 取消钉选」。
- 未钉选、动态被删或读不到时不显示便签，不摆占位纸条。
- 移动端：作为一张卡片放在图标网格下方，不旋转。

### 4.8 桌面物件

- 咖啡杯、拍立得、磁带只在桌面端显示；设置中可关闭。
- 咖啡杯点击：2 秒热气动画 + 终端打印 ASCII 咖啡；不弹窗、不阻塞。
- 拍立得：最新照片来自 moments；无图时空白相纸 + `NO PHOTO`；点击打开生活胶囊窗口。
- 磁带：点击打开 `/playlist`；标签固定 `PLAYLIST`，不冒充实时播放。
- 物件是按钮，有 `aria-label`，键盘可聚焦；`prefers-reduced-motion` 下不做热气/回正动画。

### 4.9 首次进入与无 JS

- 首次进入不自动打开任何窗口。图标、任务栏、状态组件、便签以 30ms 间隔淡入上浮，总计 ≤ 600ms；不做开机动画、不做全屏 loader。
- 底部一行 discoverability 提示：`按 \` 打开终端 · ⌘K 搜索 · 双击图标打开`；首次打开窗口/终端后消失，写入 `localStorage`。
- 所有进场动效的基础样式就是最终状态，关键帧只写 `from`，并包在 `@media (scripting: enabled)` 与 `prefers-reduced-motion: no-preference` 中；JS 关闭时内容完整可见。
- JS 关闭：路由型与窗口型应用图标仍是链接；`<noscript>` 提供 `/life`、`/gallery`、`/projects`、`/snippets`、`/about`、`/notes`、`/shelf`、`/playlist`、`/letters`、`/feed.xml` 的完整列表；任务栏只保留站点标识与时钟；终端/助理/启动器/更多不工作，但不影响阅读。

## 5. 窗口系统

### 5.1 桌面窗口

首页浮窗的默认位置与尺寸（相对桌面区域，1440×900 设计基准；实际按视口 clamp）：

| 应用 | x | y | w | h | 最小尺寸 |
| --- | --- | --- | --- | --- | --- |
| 每日日志 | 24 | 32 | 520 | 620 | 420×360 |
| 生活胶囊 | 560 | 48 | 640 | 560 | 420×320 |
| 项目看板 | 180 | 72 | 880 | 560 | 560×360 |
| 代码片段 | 320 | 96 | 760 | 520 | 520×360 |
| 关于本机 | 720 | 96 | 520 | 600 | 400×360 |
| 更多 | 240 | 160 | 400 | 320 | 320×240 |

- 窗口状态：关闭 / 打开 / 最小化 / 最大化；记录 `rect`、`restoreRect`、`z`。打开时聚焦，z 递增；关闭后任务栏项消失；最小化保留任务栏项。
- 拖拽：按住标题栏 1:1 跟随；拖拽期间只更新本地 transform，松手提交 reducer；不逐帧写 `localStorage`。
- 缩放：右下角 16px 手柄（触屏 24px 命中区）；最小尺寸见上表；内容区实时重排。
- 最大化：记录当前 `rect`，铺满桌面区域；再次点击恢复。双击标题栏等同最大化切换。
- 位置/尺寸持久化到 `localStorage`（`z-os:windows`）；开合状态不跨刷新恢复，避免一进站就被窗口盖住。视口变小时自动 clamp，至少保留 80px 标题栏可见。
- 焦点：`pointerdown` 置顶；`Esc` 关闭当前聚焦窗口；`Tab` 在窗口内循环；关闭后焦点回到任务栏对应项。
- 窗口内容首次打开时才挂载；ReactNode 已由服务端随 RSC payload 下发，不产生额外请求。再次打开保持状态。

### 5.2 应用页最大化窗口

- 非首页路由放进 `(apps)` route group，由 `AppFrame` 包成最大化窗口：桌面可见 12px 边距，底部让出 56px 任务栏；窗口标题栏显示应用图标、应用名、路径（`~/life`）。
- 标题栏控件：`‹ 桌面`、`—`（回桌面）、`□`（铺满/还原 12px 边距）、`×`（回桌面）。笔记阅读页额外提供「专注」：隐藏标题栏与任务栏，`Esc` 退出。
- 内容区独立滚动。现有页面的 `ReadingProgress`、`Toc` 等依赖 `window` 滚动的组件，改用 `AppFrame` 提供的滚动容器上下文；无 JS 时进度条静态、目录照常可点。
- 深链接、刷新、分享正常：`/life/123`、`/notes/xxx` 直接进入对应最大化窗口。旧 `/blog`、`/changelog`、`/guestbook` 的 308 重定向、RSS、Sitemap、metadata 不变。
- 应用页与桌面共享同一个 `DesktopShell`：壁纸、任务栏、终端、搜索、助理在路由切换间保持，窗口开合状态不丢。

### 5.3 移动端（< 768px）

- 首页是「手机主屏」：顶部状态栏（站名、时钟、搜索、系统菜单）+ 4 列图标网格 + 最近日志卡片 + 状态卡片 + 便签卡片 + 56px 底部 dock。页面正常滚动。
- 点图标进入全屏应用页：顶部应用栏（返回桌面、应用名、系统菜单），内容正常滚动；无窗口 chrome、无拖拽、无缩放。底部安全区留白。
- 终端、助理、搜索为全屏覆盖层；输入框固定在底部，适配软键盘。
- 触控目标 ≥ 44×44px；图标标签最多两行；不做 hover 依赖的交互。
- `prefers-reduced-motion` 下应用页不做滑入动画，直接切换。

### 5.4 键盘与可访问性

- 桌面图标：`Tab` 聚焦，方向键在网格内移动，`Enter`/`Space` 打开；焦点环 1px `--phosphor` + 2px offset。
- 全局：`` ` `` 开关终端；`⌘K`/`Ctrl+K` 打开 Spotlight；`Esc` 关闭最上层窗口/菜单；`Alt+1..9` 不做（避免与浏览器冲突）。
- 窗口：标题栏控件是原生按钮，有 `aria-label`；窗口 `role="region"` + `aria-labelledby`；终端/助理/搜索使用 `role="dialog"` + `aria-modal`，焦点限制在弹层内，关闭后归还焦点。
- 颜色不是唯一状态表达：待审/进行中同时有文字标签；活动窗口同时有标题栏亮线与标题加粗。
- 对比度、`tabular-nums`、减少动效、减少透明度均按 §2 与 §7 执行。

## 6. 应用

### 6.1 终端（全局覆盖层）

- 入口：桌面图标、任务栏启动器、系统菜单、`` ` ``、终端命令 `search`/`ask`。
- 外观：760×440 浮窗，`zsh — guest@z-os` 标题栏，琥珀提示符 `guest@z-os ~ %`，等宽 13px；可拖动、可缩放；`Esc` 关闭。
- 命令：
  - `help`：分组列出命令与示例。
  - `ls`：列出应用与笔记数量；`apps`：列出应用 id/名称；`posts`：列出笔记 slug/标题；`snippets`：列出片段 id/标题。
  - `open <app|note-slug|snippet-id>`：首页开窗/应用页路由；`:q` 关闭终端。
  - `ask <问题>`：打开助理窗口并发送问题。
  - `theme night|paper|blueprint`、`wallpaper ...`：切换桌面预设。
  - `whoami` / `date` / `uptime` / `neofetch` / `clear` / `exit`。
  - `coffee`：ASCII 咖啡 + 桌面咖啡杯热气；`sudo` / `rm -rf /` / `vim` 保留无害彩蛋。
- 交互：命令历史 ↑/↓；Tab 补全命令、应用 id、笔记 slug、片段 id；`Ctrl+L` 清屏；输入框自动聚焦；欢迎语首次打开逐字打出（≤ 600ms，减少动效下直接显示）。
- 事实：`neofetch` 只显示真实值（OS: Z·OS、Host: 杭州、Uptime: 建站 N 天、Stack、Apps、Notes、Theme、AI: 已配置/未配置）；`Shell: zsh (simulated)` 明确标注模拟。
- 无 JS：终端不存在，不影响任何内容阅读。

### 6.2 助理（全局覆盖层）

- 入口：桌面图标、终端 `ask`、系统菜单。定位是「这个站点的助理」，不是通用聊天机器人。
- 外观：720×520 浮窗，终端式纯文本；用户行 `> 问题`，助理行以 `·` 起头；无头像、无圆润气泡、无 Sparkles 图标。引用 `[1]` 为琥珀链接，来源列在回答末尾；代码块用 `--window-2` 面板。
- 能力：复用现有 `/api/chat`（RAG + 引用）与 `/api/chat` GET 状态；支持站内问答、轻量技术解释、个人介绍。AI 未配置时显示「AI 未配置：在 .env 填 AI_API_KEY」，不假装可用。
- 交互：流式输出；停止生成；清空对话；建议问题按钮（「你最近在做什么项目？」「推荐几条关于前端的日志」「解释一下 RAG」）；引用点击关闭助理并打开对应笔记锚点。
- 限频、引用校验、数据源沿用现有接口，不在客户端直连模型。

### 6.3 每日日志（`/life` + 桌面窗口）

- 数据：现有 `moments` 表。新增 `tags` 字段后，日志支持标签筛选。
- 桌面窗口：最近 12 条，按月份分组，左侧主脊线；顶部标签筛选 chips；底部「全部日志 →」；站长额外显示「+ 写一条」（链接 `/write`）。窗口内脊线为静态线（窗口内容独立滚动，不做 scroll-timeline）。
- 全屏 `/life`：顶部读数条（建站天数、动态总数、本月条数、90 天提交、天气，复用 `ObservBar` 的语义）；标签筛选写入 URL（`/life?tag=开发`，可分享）；完整时间线；主脊线随页面滚动描出（CSS `animation-timeline: scroll(root block)`，无 JS 时静态完整）。站长「+ 写一条」。
- 标签规则：最多 5 个，每个 1–16 字；存储不带 `#`；展示带 `#`；输入支持逗号/空格分隔；去重、去空白。标签筛选按 AND 语义（选多个标签时同时满足）。
- 空状态：数据库连不上 → 「生活流暂时读不到」，不拿空列表冒充「还没发过」；确实没有动态 → 「还没有第一条」。
- 移动端：窗口内容变成全屏 `/life`；标签 chips 横向滚动；时间线单列。

### 6.4 生活胶囊（`/gallery` + 桌面窗口）

- 数据：所有 `images.length > 0` 的 moments，按 `publishedAt` 倒序；每张图带 moment id、日期、地点、正文、标签。
- 桌面窗口：最近 12 张，CSS columns 瀑布流，图片保持原始比例、不裁切、不降饱和、不加滤镜；悬停显示日期 + 一句话备注；点击在窗口内打开灯箱（铺满窗口内容区），左右切换、`Esc` 关闭。
- 全屏 `/gallery`：全部图片，灯箱铺满页面；底部「查看这条日志 →」链接到 `/life/[id]`。
- 空状态：「还没有照片。等第一条带图的动态。」不摆示例图。
- 图片沿用 `MomentPhoto` 的处理与 `/media/[...path]` 路由；瀑布流图片 `loading="lazy"`，避免首页一次拉全部图。

### 6.5 项目看板（`/projects` + 桌面窗口）

- 数据：`src/config/portfolio.ts` 的 `projects`。`Project.status` 增加 `待启动` 可选值；现有项目不改。
- 三列：待启动 / 进行中 / 已完成。映射：`进行中` 与 `维护中` 进「进行中」列，卡片带真实状态徽标（维护中显示 `维护中`）；`已完成` 进「已完成」；`待启动` 当前为空，显示「还没有排队的项目」。
- 卡片：项目名、一句话 tagline、技术栈前 3 项、真实状态徽标；点击打开详情面板。
- 详情：描述、为什么做、做完的感受、亮点、结果、技术栈、源码/演示链接。桌面为右侧滑出面板，移动端为全屏覆盖层；`Esc` 关闭。
- 拖拽：桌面端可拖拽卡片在本列排序、也可拖到其他列——但只改「你的本地视图」，不改真实状态；出现「本地视图 · 重置」提示；刷新后保留在 `localStorage`（`z-os:kanban`）。卡片上的真实状态徽标不随拖动变化。移动端不启用拖拽。
- 空状态与未知状态：未知 status 归入「进行中」并在开发环境告警，不在生产猜。

### 6.6 代码片段（`/snippets` + 桌面窗口）

- 数据：`src/config/snippets.ts`，Git 版本管理；首版不建表、不做后台 CRUD。类型：

  ```ts
  interface Snippet {
    id: string;
    title: string;
    language: string;   // Shiki 语言名
    useCase: string;    // 一句话用途
    tags: string[];
    code: string;
    note?: string;      // 使用场景 / 踩坑
    updatedAt?: string;
  }
  ```

- 首版 6 条真实片段，全部从现有代码抽取，不写示例占位：
  1. `Next 16：数据库页面别把空数据烤进静态壳`（`connection()` + `instant = false`）
  2. `useSyncExternalStore 版站内时钟`（不在 effect 里 setState）
  3. `滚动驱动的脊线：CSS animation-timeline`
  4. `Drizzle + pgvector：HNSW 余弦索引`
  5. `设计 token 的 WCAG 护栏`
  6. `AI SDK：把引用来源随流下发`
- 桌面窗口：左侧语言/用途列表 + 右侧详情；全屏页同构，窄屏改为上下布局。
- 详情：标题、语言、用途、标签、Shiki 高亮代码、注释、复制按钮。复制使用 Clipboard API，成功后按钮显示「已复制」1.5 秒；失败时选中代码并提示手动复制。
- 高亮在服务端完成，与 MDX 代码块同一套暖色双主题；代码区独立横向滚动。
- 空状态：某语言没有片段时显示「这个语言还没有收藏」，不显示假代码。

### 6.7 关于本机（`/about` + 桌面窗口）

- 布局：左侧头像（现有 Z 字标 SVG）、姓名、状态句、GitHub/邮箱；右侧 `neofetch` 式档案卡：OS: Z·OS、Host: 杭州、Uptime: 建站 N 天、Stack: Next.js 16 / React 19 / PostgreSQL、Apps: N、Notes: N、AI: 已配置/未配置。
- 下方：现在（在做/在学/在读，标「手动 · 更新于」）、能力分组、关于本站。
- 所有值来自 `siteConfig`、`portfolio.now`、`getUptimeSnapshot`、`getChangelogStats`、`getAllNotes`、`chatEnabled`；不写死假版本号。
- 桌面窗口显示紧凑版（档案卡 + 现在）；全屏页显示完整内容。
- 移动端单列；neofetch 卡横向滚动，不压缩到不可读。

### 6.8 笔记 / 书架 / 歌单 / 信箱 / 更新日志 / 友链

- 「更多」文件夹内容：更新日志、友链（非空时）、RSS、GitHub、系统设置、管理（`owner`）。
- 第一阶段只换外壳与 token，不改内容逻辑：
  - 全部进入 `(apps)`，由 `AppFrame` 包成最大化窗口；移动端全屏应用页。
  - 原有服务端读库、服务端 action、评论、表单、分页、搜索、RSS 不变。
  - 页面内标题可保留；窗口标题栏只显示应用名 + 路径，不强行去重。
- `/notes/[slug]` 阅读页支持「专注」：隐藏标题栏与任务栏，`Esc` 退出；阅读进度、TOC 改用 `AppFrame` 滚动容器。
- `/journal`（更新日志）保留现有 `ActivityHeatmap` 与时间线；在「更多」文件夹与系统菜单中进入。
- `/friends` 为空时：桌面「更多」文件夹与系统菜单不显示该入口；页面本身保留空状态。
- `/login`、`/write`、`/admin`：AppFrame + 新 token；登录/权限逻辑不变。`/write` 增加标签输入；`/admin` 增加「桌面便签」选择器。
- 旧 Navbar、Footer、ThemeToggle、Reveal、ChatWidget、OpenChatButton、TerminalPalette 全部下掉或替换；不留两套导航与两套视觉。

### 6.9 搜索（Spotlight）

- `⌘K`/`Ctrl+K` 打开；沿用事件名 `blog:open-search` 以兼容旧入口。
- 外观：视口顶部 18% 居中的 640px 面板，`--window` 95% 底 + 1px `--rule` + 柔和阴影 + 轻微背景模糊；输入 14px 等宽。
- 结果分组：应用（本地注册表）、笔记（现有 `/api/search` 语义检索，200ms 防抖）、代码片段（本地）。日志不做全局搜索——它有自己的标签筛选；避免为了搜索在每页都读 moments。
- 交互：↑/↓ 选择，`Enter` 打开，`Esc` 关闭；应用结果走 `openApp`；笔记跳 `/notes/[slug]`；片段跳 `/snippets?s=<id>`。
- 无结果时显示「没有找到。试试直接问助理。」并提供打开助理的按钮。
- 搜索面板按需加载（cmdk 只在此 chunk 中），首屏不加载。

### 6.10 设置

设置不是独立页面，而是系统菜单内的分段面板：

- 桌面：夜班 / 稿纸 / 蓝图；桌面物件开关；重置窗口布局。
- 动效：跟随系统 `prefers-reduced-motion`，不提供站内强制开关（避免两套行为难测）。
- 关于：关于本机、更新日志、RSS、GitHub、备案信息（有则显示）。
- 账号：登录/退出、我的推荐、管理、写一条。

## 7. 动效系统

| 交互 | 动效 | 时长 / 曲线 | 减少动效时 |
| --- | --- | --- | --- |
| 首次进入图标 | 淡入 + 上浮 8px，30ms 间隔 | 420ms `cubic-bezier(.22,1,.36,1)` | 直接显示 |
| 任务栏出现 | 上移 8px + 淡入 | 320ms 同曲线 | 直接显示 |
| 图标悬停 | 上浮 2px、边框转琥珀 | 160ms ease-out | 只变色 |
| 窗口打开 | 从图标方向 scale .96 + translateY(8px) + 淡入 | 240ms 同曲线 | 瞬时打开 |
| 窗口最小化 | 缩向任务栏对应项 + 淡出 | 220ms 同曲线 | 瞬时隐藏 |
| 窗口聚焦 | 阴影加深、标题栏琥珀线 | 140ms ease-out | 瞬时 |
| 拖拽 | 1:1 跟随；拖拽中阴影略深 | 无过渡 | 同 |
| 壁纸柔光 | 鼠标 lerp 跟随，静止 500ms 后停 rAF | 持续，极低透明度 | 关闭 |
| 柔光呼吸 | opacity 4% ↔ 7% | 9s alternate | 关闭 |
| 终端欢迎语 | 逐字打出 | ≤ 600ms | 直接显示 |
| 终端光标 | 方块闪烁 | 1.1s step-end | 常亮 |
| 日志脊线 | 滚动描出/收回 | 随滚动位置 | 静态全显 |
| 状态读数 | 数字上翻；热图逐格点亮 | 520ms / 180ms stagger | 直接落位 |
| 应用页进入 | 窗口从 .97 放大落位 | 260ms 同曲线 | 直接显示 |
| 便签悬停 | -1.5° 回正 | 180ms ease-out | 不回正 |
| 咖啡热气 | 上升 24px + 淡出 | 2s ease-out | 不播放 |

原则：

- 动效必须有触发源：交互、滚动位置、真实读数、时间。没有数据源的持续动画一律不做。
- 只动 `transform` / `opacity` / 颜色；不动 `top/left/width/height` 做持续动画（拖拽/缩放除外，使用 transform 或提交式更新）。
- 所有动画有明确结束状态；不循环（时钟、光标、柔光呼吸除外，且均受减少动效控制）。
- 无全屏遮罩淡入、无页面级 loader、无 skeleton 闪烁超过 400ms。

## 8. 技术架构

### 8.1 路由与目录

```
src/app/(site)/layout.tsx                全局 DesktopShell + 壁纸 + 任务栏 + 覆盖层
src/app/(site)/page.tsx                  桌面首页
src/app/(site)/(apps)/layout.tsx         AppFrame（最大化窗口）
src/app/(site)/(apps)/life/page.tsx      每日日志（原首页内容迁入）
src/app/(site)/(apps)/gallery/page.tsx   生活胶囊（新）
src/app/(site)/(apps)/snippets/page.tsx  代码片段（新）
src/app/(site)/(apps)/projects/page.tsx  项目看板（改造）
src/app/(site)/(apps)/about/page.tsx     关于本机（改造）
src/app/(site)/(apps)/notes/...          笔记（套壳）
src/app/(site)/(apps)/shelf/...          书架（套壳）
src/app/(site)/(apps)/playlist/...       歌单（套壳）
src/app/(site)/(apps)/letters/...        信箱（套壳）
src/app/(site)/(apps)/journal/page.tsx   更新日志（套壳）
src/app/(site)/(apps)/friends/page.tsx   友链（套壳）
src/app/(site)/(apps)/login|write|admin/ 账号与站长工具（套壳）
```

- `/life/[id]` 保持在 `(apps)/life/[id]`；`/notes/[slug]` 保持在 `(apps)/notes/[slug]`。
- `sitemap.ts` 增加 `/life`、`/gallery`、`/snippets`；`feed.xml` 保持动态与笔记输出，动态描述可附标签。
- 旧 `/blog`、`/changelog`、`/guestbook` 的 308 重定向按 `next.config.ts` 与 `src/app/blog/[slug]/route.ts` 现状保持不变。

### 8.2 组件与状态

新增：

- `src/config/apps.ts`：应用注册表（id、标题、路径、图标 key、描述、kind、desktop/launcher、默认窗口尺寸、关键词）。纯数据，可被 Node 测试直接 import。
- `src/components/desktop/icons.tsx`：12 个图标 SVG + `AppIcon` 映射。
- `src/components/desktop/desktop-shell.tsx`：全局客户端壳；接收 `apps`、`notes`、`snippets`、`accountMenu`、`aiEnabled`，渲染壁纸、任务栏、启动器、系统菜单、终端/搜索/助理宿主、`children`。站长标记由首页/页面自身读取，不塞进全局壳。
- `src/components/desktop/desktop-home.tsx`：桌面图标网格、窗口容器、状态组件/便签/物件插槽、首次提示。
- `src/components/desktop/window.tsx`：窗口框、标题栏、拖拽/缩放、控件。
- `src/components/desktop/window-state.ts`：纯 reducer、`clampRect`、`nextZ`；可测试。
- `src/components/desktop/use-window-manager.ts`：`useReducer` + localStorage + 边界测量，并提供 `openApp(id)`（首页开窗 / 应用页路由）。
- `src/components/desktop/use-desktop-settings.ts`：预设、桌面物件、重置布局的 localStorage 状态；壁纸、系统菜单、终端共享。
- `src/components/desktop/taskbar.tsx`、`launcher.tsx`、`system-menu.tsx`、`context-menu.tsx`。
- `src/components/desktop/wallpaper.tsx`：三套壁纸、鼠标柔光、网格视差、桌面物件。
- `src/components/desktop/status-widget.tsx`、`sticky-note.tsx`、`desk-objects.tsx`。
- `src/components/desktop/app-frame.tsx`：应用页最大化窗口 + 滚动容器上下文 + 专注模式。
- `src/components/terminal/terminal-window.tsx`：终端（替换旧 `terminal-palette.tsx`）。
- `src/components/assistant/assistant-window.tsx`：终端式助理（替换旧 `chat-widget.tsx`）。
- `src/components/search/search-palette.tsx`：Spotlight（改造现有）。
- `src/components/snippets/snippets-app.tsx`、`src/components/gallery/gallery-app.tsx`、`src/components/projects/kanban-board.tsx`、`src/components/life/tag-filter.tsx`。
- `src/components/desktop/clock-store.ts`：单 ticker 的 `useSyncExternalStore` 时钟，任务栏与状态组件共享；不复用旧 `LocalClock` 的整页挂载方式。

修改：

- `src/app/(site)/layout.tsx`：移除 Navbar/Footer/Search/Chat，改为 DesktopShell。
- `src/app/layout.tsx`：更新 themeColor；保留 `dark` 默认与 ThemeProvider；增加预设内联脚本。
- `src/app/globals.css`：三套 token、壁纸、窗口、任务栏、图标、终端、Spotlight、prose 暖色主题；移除思源宋体 import。
- `src/config/site.ts`：移除/废弃 `nav`/`footerNav`；保留站点信息、状态句、天气、友链。
- `src/db/schema.ts`、`src/lib/moment-core.ts`、`src/lib/moment-input.ts`、`src/lib/moments-server.ts`、`src/components/write/moment-form.tsx`、`src/app/(site)/write/...`：moment tags。
- `src/lib/settings-server.ts`、`src/app/(site)/admin/...`：桌面便签。
- `src/lib/life.ts`：标签筛选、按标签分组/计数。
- `src/app/(site)/style/page.tsx`：更新为新组件陈列。
- `scripts/tokens.test.mjs`、`package.json`：新 token 测试、新测试脚本、移除思源宋体依赖。

删除/替换：`navbar.tsx`、`footer.tsx`、`theme-toggle.tsx`、`reveal.tsx`、`chat-widget.tsx`、`open-chat-button.tsx`、`terminal-palette.tsx`、旧 `search-palette` 的样式与 `blog:open-chat` 事件（保留兼容别名直到所有入口迁移完）。

### 8.3 服务端 / 客户端边界

- `(site)/layout.tsx` 是服务端组件：读取 notes（`getAllNotes`）、snippets（配置）、会话（账号菜单）、`chatEnabled`；把这些作为 props 传给 `DesktopShell`（`aiEnabled = chatEnabled`）。
- `DesktopShell` 是客户端组件；`children` 仍是服务端渲染。窗口内容通过 ReactNode props 从服务端传入，客户端只控制显隐与几何。
- 首页服务端组件用 `<Suspense>` 分区：桌面壳与图标先出；状态组件、日志窗口、胶囊窗口、关于窗口流式补。`connection()` 仍用于阻止预渲染把空数据烤进静态壳；首页保留 `instant = false`（按 Next 16 Cache Components 文档核对）。
- 应用页：`AppFrame` 是客户端壳，页面内容是服务端组件；`ReadingProgress`/`Toc` 通过 `ScrollRootContext` 获取滚动容器。
- 时间/天气/GitHub/观测读数全部服务端读取并缓存；客户端不直连第三方。时钟是唯一每秒更新的客户端状态，使用模块级单 ticker。
- 设置（预设/物件/窗口位置）存 `localStorage`；不使用 cookie，不产生服务端往返。
- 写操作（发动态、标签、钉选、评论、审核）仍走现有 server actions；写后按现有缓存标签 `revalidateTag`/`refresh`，具体 API 以 `node_modules/next/dist/docs/` 当前版本为准。

### 8.4 缓存与数据读取

- 首页与 `/life` 读 `moments`；同一次渲染内用 `React.cache` 共享 `getMoments`，避免日志/胶囊/便签重复查询。
- 天气 5 分钟缓存、失败标记 60 秒；GitHub 活动沿用现有缓存；观测读数按小时。外部依赖失败显示 `NOT AVAILABLE`，不阻塞首屏。
- 首页窗口内容限制：日志 12 条、胶囊 12 图；全屏页才取全量。隐藏窗口内容首次打开才挂载，图片 `loading="lazy"`。
- 片段高亮在服务端完成；首版 6 条全部预高亮，条目增长后再按需。
- `getPinnedMomentId` 读 `site_settings`，与状态句同一套缓存；钉选写后失效首页标签。

### 8.5 性能预算

- 首屏 shell（不含 React/Next 运行时）：≤ 25KB gzip。
- 首屏总客户端 JS：≤ 90KB gzip。
- 终端、助理、Spotlight、设置面板按需加载；cmdk 只在搜索 chunk。
- 不引入 `three`、canvas 窗口管理器、拖拽库；窗口管理手写。
- 壁纸纯 CSS/SVG；鼠标柔光用 `transform`/`opacity` + rAF，静止 500ms 停；无持续 canvas。
- 首页隐藏窗口不加载图片；窗口内容首次打开才挂载。
- 提供一个 60fps 的基准验收：1440×900 下打开 4 个窗口、拖动一个窗口时无明显掉帧；低端设备可接受降级。

### 8.6 无 JS 与降级

- 首页图标是 `<a>`；路由型应用直接跳转；窗口型应用跳到对应全屏页。`<noscript>` 列出全部应用链接与 RSS。
- 应用页内容服务端渲染；窗口 chrome 由客户端增强，无 JS 时内容完整。
- 数据库/AI/天气/GitHub 任一不可用：对应读数 `NOT AVAILABLE`，页面照常显示；不出现假 0、假百分比、假在线。
- 登录未配置 SMTP：互动入口显示「暂未开放」；浏览不受影响。
- `prefers-reduced-motion`、`prefers-reduced-transparency`、`prefers-contrast: more` 均按 §2/§7 降级。

## 9. 数据模型变更

### 9.1 `moments.tags`

- 新增：`tags jsonb("tags").$type<string[]>().notNull().default([])`。
- 迁移：`npm run db:push`；现有行默认 `[]`。
- 校验（`src/lib/moment-input.ts`）：最多 5 个；每个 1–16 字；去掉 `#`、首尾空白；逗号/空格分隔；去重；空数组合法。
- 读写：`Moment` 领域类型增加 `tags: string[]`；`moments-server` 映射；RSS 动态描述附 `#tag` 列表；`/write` 表单增加标签输入；`/life` 与桌面日志窗口支持筛选。
- 测试：`scripts/moment-input.test.mjs` 增加标签用例；`scripts/life.test.mjs` 增加筛选/计数。

### 9.2 桌面便签

- 不新增表。`site_settings` 新增 key `desktop_pin_moment`，值为 moment id 字符串；空字符串表示不钉。
- `settings-server.ts` 增加 `getPinnedMomentId()` / `setPinnedMomentId(id)`；后者仅 `owner` 可调用，校验 moment 存在。
- `/admin` 增加选择器（最近 20 条 + 不钉）；`/life/[id]` 对 `owner` 显示钉选/取消按钮。
- 读取失败或动态不存在时首页不显示便签。

### 9.3 代码片段

- 首版不建表：`src/config/snippets.ts` 静态数据，Git 即版本管理。
- 后续若需要后台编辑，再加 `snippets` 表与 admin CRUD；本次不做。

### 9.4 项目看板本地视图

- 不新增表，不改 `projects` 真实状态。
- 本地排序/跨列视图存 `localStorage` key `z-os:kanban`；结构与真实数据分离；「重置」清空。

## 10. 验收标准

### 10.1 第一印象

- 1440×900、1280×720、390×844 三档截图：首屏能看到桌面、图标、任务栏、状态组件、便签（有钉选时）。
- 3 秒内可以指出：哪个是终端、哪个是日志、怎么打开应用、怎么回到桌面。
- 不滚动就能看到至少 8 个应用图标与任务栏。

### 10.2 交互

- 桌面端：双击图标开窗；窗口可拖动、缩放、最小化、最大化、关闭；点击置顶；任务栏可切换/恢复；路由切换后窗口状态保持。
- 终端：`` ` `` 打开；`help`、`ls`、`open`、`ask`、`theme`、`neofetch`、`coffee` 可用；Tab 补全与历史可用；`Esc` 关闭。
- 搜索：`⌘K` 打开；应用/笔记/日志/片段分组；键盘选择；`Esc` 关闭。
- 助理：终端式输出、流式、引用可点；AI 未配置时有明确说明。
- 日志：标签筛选（桌面即时 / 全屏 URL）；站长可写、可钉选；空状态诚实。
- 胶囊：瀑布流、悬停信息、灯箱、左右切换；空状态诚实。
- 项目：三列、详情、桌面端本地拖拽、重置；真实状态徽标不随拖拽变化。
- 片段：语言筛选、详情、复制成功/失败反馈；首版 6 条均为真实代码。
- 关于：neofetch 值全部可指源；「手动」标注存在。

### 10.3 视觉与动效

- 三套预设均通过 token 对比度/彩度测试；正文 ≥ 7:1，弱字/语义色 ≥ 4.5:1，彩度 ≤ 0.12。
- 没有蓝紫渐变、霓虹、粒子、扫描线、聊天气泡、Sparkles 图标、假读数。
- 减少动效下：无窗口动画、无柔光、无呼吸、无光标闪烁、无数字滚动；内容完整。
- 减少透明度下：任务栏/菜单纯色，不糊。
- 首次进场 ≤ 600ms，无全屏 loader；图标/任务栏/状态组件按序出现。

### 10.4 可访问性与无 JS

- 键盘可完成：打开应用、切换窗口、关闭窗口、打开终端、搜索、关闭菜单。
- 焦点可见；焦点顺序合理；终端/搜索/助理焦点限制在弹层内并在关闭后归还。
- JS 关闭：首页图标可跳转；`<noscript>` 链接完整；应用页内容可读；状态读数可见。
- 触控目标 ≥ 44px；移动端无 hover 依赖；软键盘不遮挡终端输入。

### 10.5 性能与工程质量

- 首屏 shell ≤ 25KB gzip；首屏总 JS ≤ 90KB gzip（以构建产物为准，记录数值）。
- 无 canvas/three/拖拽库；壁纸纯 CSS/SVG；图片懒加载。
- `npm run type-check`、`npm run lint`、`npm test`、`node scripts/check-content.mjs`、`npm run build` 全部通过。
- 测试覆盖：token、窗口 reducer、应用注册表、片段数据、画廊分组、看板排序、moment 标签。
- 无零引用组件残留；旧 Navbar/Footer/ThemeToggle/Reveal/ChatWidget/TerminalPalette 清理完毕。
- 生产 404/500 不出现 Next 默认错误页；终端式错误页可返回桌面。

### 10.6 内容与 SEO

- `/`、`/life`、`/gallery`、`/snippets`、`/projects`、`/about` metadata 完整；sitemap 包含新路由；RSS 正常。
- 根 JSON-LD 的 `SearchAction` 若仍指向 `/notes?q=`，而该 URL 不再承载搜索，则删除 `potentialAction`；不保留一个打不开的搜索声明。
- 旧 `/blog` 链接仍能到达笔记；`/life/[id]`、`/notes/[slug]` 深链接可用。
- 生活胶囊上线前至少补 6 张真实照片（站长内容准备，不阻塞代码验收；空状态也必须可用）。
- `now.listening/reading` 上线前更新，日期真实；便签钉选一条真实动态。

## 11. 实施阶段

| 阶段 | 内容 | 完成标志 |
| --- | --- | --- |
| 1 | 视觉地基：三套 token、字体、壁纸、DesktopShell、任务栏、启动器、AppFrame、移动端主屏骨架 | 所有旧页面套新壳不破；深浅/蓝图 + 手机截图；token 测试通过 |
| 2 | 窗口系统：reducer、桌面图标、桌面窗口、终端、Spotlight、助理重做 | 开/拖/缩/最小化/最大化/关闭；键盘；无 JS 链接；减少动效；bundle 预算 |
| 3 | 内容应用：每日日志（标签/钉选）、生活胶囊、项目看板、代码片段、关于、状态组件 | 真数据、空状态、灯箱、复制、拖拽、筛选、测试全部通过 |
| 4 | 收口：笔记/书架/歌单/信箱/更新日志/友链/登录/后台套壳；系统菜单、右键菜单、设置、清理与构建 | 全路由新壳；无死链；全量检查与截图；部署文档更新 |

每阶段结束都跑：`npm run type-check`、`npm run lint`、`npm test`、`node scripts/check-content.mjs`、`npm run build`，并在夜班/稿纸两套预设下截图。蓝图作为第三套抽查。

## 12. 风险与取舍

| 风险 | 应对 |
| --- | --- |
| 桌面隐喻降低可用性，访客不知道点哪里 | 图标有文字标签与 tooltip；单击选中/双击打开/Enter 打开；图标同时是真链接；移动端直接跳转；首次提示条 |
| 窗口管理器变复杂、拖拽掉帧 | 手写纯 reducer + 指针事件；拖拽期间只改 transform，松手提交；不逐帧写 localStorage；不做吸附/分组 |
| 客户端 JS 膨胀 | 手写窗口管理；终端/助理/搜索按需加载；壁纸纯 CSS；首屏预算 25KB shell / 90KB total |
| 隐藏窗口让首页 HTML 过大 | 窗口内容首次打开才挂载；日志/胶囊限制 12 条；图片懒加载；全屏页才取全量 |
| 壁纸柔光/呼吸在低端设备卡顿 | 只动 transform/opacity；静止 500ms 停 rAF；减少动效关闭；无 canvas |
| 移除思源宋体后文章少了「人味」 | 等宽标题 + 无衬线正文 + 暖色底；笔记页保留足够的行高与留白。本次不引入宋体；上线后若阅读体验确实下降，另开变更评估，不在本方案内回退 |
| 胶囊没有照片、片段没有内容 | 片段首版 6 条从现有代码抽真实内容；胶囊空状态必须可看；上线前站长补图 |
| 旧 token/组件/测试残留 | 保留 shadcn 别名一次性迁移；tokens 测试强制新值；清理零引用组件；style 页做组件陈列 |
| 首页读库变慢 | 壳与图标先出，读数/窗口 Suspense 流式补；天气/GitHub 缓存；`React.cache` 共享 moments |
| 应用页改滚动容器导致阅读进度/TOC 失效 | `AppFrame` 提供 `ScrollRootContext`；组件改用上下文；无 JS 时静态降级 |
| 旧 `/` 链接与 SEO 受影响 | `/` 仍是首页（桌面），生活流迁到 `/life`；旧 `/life/[id]` 不变；sitemap/RSS 更新；旧 `/blog`、`/changelog`、`/guestbook` 的 308 重定向保留 |
| 2C2G 服务器 | 不在服务器构建；新增全是客户端/SSR，无新服务；按 DEPLOY.md 本地构建上传 |
| 移动端软键盘遮住终端输入 | 终端全屏覆盖层 + 输入框 sticky 底部；`visualViewport`/安全区适配；真机验收 |

## 13. 明确不做

- 全站 SPA 重写、客户端路由接管、把服务端页面塞进单一 canvas。
- 开机动画、全屏加载动画、默认音效、自定义鼠标、鼠标拖尾、扫描线。
- 粒子/数据流/极光/蓝紫渐变/霓虹发光/全屏玻璃拟态。
- AI 拟人头像、聊天气泡、Sparkles 装饰、通用聊天机器人定位。
- 假在线、假进程、假文件、假读数、假进度、假实时。
- 图标自由拖拽、窗口吸附/分组/多桌面、文件系统、代码编辑器、游戏、音乐播放器。
- 为「像 OS」而引入 three.js、canvas 窗口管理器、重型拖拽库。
- 重写笔记/书架/歌单/信箱/账号/评论/AI 检索的内容逻辑。

## 14. 调研依据

- [Simone's Computer](https://simone.computer)：桌面站点的记忆点来自「应用真能用」（浏览器、终端、文件系统），不是皮肤。
- [daedalOS](https://github.com/DustinBrett/daedalOS)：窗口管理、任务栏、位置持久化、按需加载的成熟参照；本次刻意缩小范围。
- [OSFOLIO](https://github.com/amaansyed27/OSFOLIO) / [AMingOS](https://github.com/AMingDrift/AMingOS)：React/Next 桌面作品集的实现模式；也印证了「Win 皮肤 + 空内容」会迅速露馅。
- [ECHO-OS 案例](https://www.uisdc.com/agents-enter-figma)：Windows XP 桌面作品集的彩蛋与探索感；本次保留彩蛋，但不做复古皮肤。
- [Now Page 设计](https://adammuiz.com/a-now-page-for-a-personal-website-sharing-what-matters-at-this-moment)：短条目、固定更新节奏、诚实的「最后更新于」。
- [Cyd Stumpel · Awwwards](https://www.awwwards.com/sites/cyd-stumpel-portfolio-2025)：原生 CSS scroll-driven animations 与 view transitions 的克制用法。
- [daedalOS 概览](https://www.zendot.org/en/posts/dustinbrett-daedalos)：窗口/任务栏/壁纸/文件系统的功能清单，用于取舍。

调研结论：

1. OS 站的成败在于「应用是不是真内容」；本方案每个图标都接到现有真实数据。
2. 日常分享站的核心是低发布压力与时间感；moments + 标签 + 便签 + now 组件直接复用它。
3. 高级动效来自跟手与克制；本方案只保留交互驱动与极弱氛围，不做常驻炫技。
4. 与参考站点区分：不复制 Win95/XP，不做赛博霓虹；走「温暖工作站」，用琥珀磷光、暖灰、纸张与真实生活内容建立辨识度。
