# Z-Blog 体验、无障碍与访客路径调研（2026-11-24）

> **调研日期**：2026-11-24。  
> **范围**：当前工作树中的 Next.js **16.4.3** / React **19.3.0** 代码；仓库随包提供的 Next.js 官方文档；W3C/WCAG 2.2、MDN、React 官方资料；Nova Agent 公开首页。  
> **证据规则**：**[事实]** 是代码、官方原文、公开页面或本次静态计算直接支持的内容；**[建议]** 是面向本站的设计/工程判断。`[未实测]` 不把推断写成运行结果。  
> **边界**：只读源码、官方网页与 Nova 公开首页；未登录、未发验证码、未提交任何表单或数据，未启动本地站点，未部署、未提交 Git、未读写密钥。本次只新增本文件。仓库开始调研前已有 `globals.css`、桌面/首页/站点配置等未提交改动；下文描述的是**工作树现状**，不代表某个已发布版本的实测。

---

## 0. 结论先行：最高收益的 6 项

| 优先级 | [建议] 做什么 | 为什么收益高 | 改动边界 |
|---|---|---|---|
| 1 | **保留青绿主色，把颜色用于内容分类、当前状态与操作反馈；建立“实际前景 / 实际背景”的对比度验收表。** | 当前 token 的文字对比度已较高；单调感应优先由层次与内容色解决，而非整体加饱和。低对比分隔线需要按是否承载控件信息逐项检查。 | 纯 UI / CSS；不碰权限与数据。 |
| 2 | **把“动效不足”改成“关键反馈明确”：统一入场、选中、提交成功、播放/暂停与章节切换的短反馈，并补齐 JS 的减少动态效果分支。** | 本站已有多层动效，继续叠加 Canvas/粒子容易增加干扰。已有全站 CSS 降级，但 JS 平滑滚动和 Canvas 偏好监听仍有具体缺口。 | 纯 UI / 客户端；先在真实设备测帧率与交互延迟。 |
| 3 | **登录前也能看懂并填写留言/单曲推荐；登录后回到原表单位置并恢复草稿，默认收起次要歌曲字段。** | 可以减少“到了表单底部才发现要登录”与验证码往返后的上下文丢失；不必取消登录、审核、配额或服务端校验。 | 上述流程可纯 UI；若要跨设备草稿或更细字段错误则需 Action/API 配合。 |
| 4 | **友链页先把交换步骤说清，并复用留言草稿；有独立申请、状态和筛选需求再扩后端。** | 当前没有访客友链表，而是“复制本站资料 → 留言板或 GitHub”。独立入口、状态通知不是 CSS 能变出来的；但现有两条路径可以更易懂。 | 说明/模板/客户端筛选为 UI；专用申请与处理流需后端。 |
| 5 | **把“单曲 / 整张歌单”做成同一推荐区的两个明确选项，优先改善已有能力，而不是再要求访客理解平台差异。** | 歌单已经支持整段分享文案与网易云名称搜索；单曲仍是手填歌名、艺人、链接。单曲自动补全需外部检索服务，但布局与提示可以先改。 | 选项、渐进展开纯 UI；歌曲名称搜索/链接取元数据需后端。 |
| 6 | **项目页为 Nova Agent 放“可验证”的真实产品卡：一句定位、开发/论文两模式、证据链、真实公开界面与官方入口。** | Nova 公开首页可访问，有具体产品内容可展示；比泛化的“AI 助手”标签或虚构运行画面更准确。 | 纯 UI 与内容维护；版本号等时效信息需定期复核。 |

不建议把「取消登录」「跳过审核」「整页鼠标跟随特效」「全站高饱和渐变」作为这轮优化的前提。

---

## 1. 一手规范：颜色与对比度

### 1.1 文字和控件分别验，不用“颜色好看”替代测量

- **[事实 / 外部]** WCAG 2.2 SC 1.4.3（AA）要求文字与背景至少 **4.5:1**；大尺度文字至少 **3:1**。大尺度通常指至少 18pt（约 24 CSS px），或粗体 14pt（约 18.5 CSS px）；偶然文字、停用部分和标志文字有例外。4.499 不能四舍五入成合格。来源：[W3C — Understanding SC 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)。
- **[事实 / 外部]** SC 1.4.11（AA）要求识别用户界面组件与状态所必需的视觉信息，以及理解内容所必需的图形部分，与相邻颜色至少 **3:1**；非活动组件及未被作者修改的浏览器原生外观有例外。来源：[W3C — Understanding SC 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。
- **[建议]** 页面中的 10–13px 标签、提示与错误文字按普通文字目标检查，不能因为字小而降低目标。装饰性细线不必一律拉到 3:1；但输入框边界、焦点指示、选中状态若仅靠这条线辨认，就应单独验 3:1，不能只验证文字。

### 1.2 当前 token 的静态计算

**[事实 / 本地]** `globals.css` 定义潮汐（默认深青绿）、paper（浅水亮色）、blueprint（深蓝绿）三套原始色，再映射到语义别名。来源：[`src/app/globals.css:8-108`](../../src/app/globals.css#L8-L108)。

下表为本次依据 W3C 相对亮度/对比度定义，对**两个不透明 token**做的静态计算，不是对整站的 WCAG 合规认证；透明叠加、渐变背景、图片上的文字、禁用状态和 hover/focus 应另测。

| 前景 / 背景 | 比值 | 可读出的边界 |
|---|---:|---|
| 潮汐正文 `#f4fffb` / `#103733` | 12.71:1 | 高于普通文字 4.5:1 目标 |
| 潮汐弱字 `#bad6cf` / `#103733` | 8.42:1 | 同上 |
| paper 正文 `#143d3a` / `#f7fffc` | 11.75:1 | 同上 |
| paper 弱字 `#45615e` / `#e3f1ef` | 5.79:1 | 同上 |
| blueprint 正文 `#eef6f4` / `#1a3033` | 12.63:1 | 同上 |
| blueprint 弱字 `#b5c9c7` / `#1a3033` | 8.02:1 | 同上 |
| 潮汐 `--rule #28534d` / `#103733` | 1.51:1 | 不应未经组合检查就作为必要控件边界 |
| paper `--rule #b7d3ce` / `#f7fffc` | 1.56:1 | 同上 |
| blueprint `--rule #345358` / `#1a3033` | 1.67:1 | 同上 |

- **[事实 / 本地]** 现有表单输入与按钮大量使用 `border-rule`、`text-data`、`focus-visible:ring-ring`，例如留言表单。来源：[`letter-form.tsx:43-150`](../../src/components/letters/letter-form.tsx#L43-L150)。
- **[建议]** 不要为了“颜色丰富”降低已经充足的可读性。保留青绿为基底，把已有的暖色 `--warn`、信息色 `--info` 等发展为**有语义的局部色**：例如生活/留言偏暖纸色、项目偏蓝图色、播放状态用独立强调色；每对前景/背景单独过阈值。最终验收应覆盖三套主题、键盘焦点、触屏、成功/失败和禁用态，而非只截首页。

---

## 2. 一手规范：减少动态效果与性能

### 2.1 降级不是隐藏内容

- **[事实 / 外部]** `prefers-reduced-motion` 用来检测用户是否希望减少非必要动态；MDN 特别指出大对象缩放、平移可能诱发前庭不适。来源：[MDN — `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)。
- **[事实 / 外部]** WCAG 2.2 SC 2.3.3（AAA）要求交互触发的非必要运动动画可以禁用；W3C 给出的办法包括避免不必要动画、提供关闭控件、利用系统的 reduce motion 设置。来源：[W3C — Understanding SC 2.3.3: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)。
- **[建议]** 降级模式应直接呈现完整内容、保留清楚的选中/成功状态，只取消位移、视差、循环漂浮和连续滚动；不能简单把元素透明度留在 0。对装饰 Canvas 使用静帧是合适方向。

### 2.2 滚动与指针：优先少做，而不是做得更花

- **[事实 / 外部]** MDN 建议能用 CSS transition/animation 时优先使用；不触发 reflow/repaint 的动画可移出主线程，`transform` 是常见例子。具体是否合成仍取决于浏览器、元素与场景，不能把“用了 transform”当成必然流畅。来源：[MDN — CSS and JavaScript animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance)。
- **[事实 / 外部]** Intersection Observer 异步观察元素与祖先/视口的交叉，适合“是否可见再执行动画任务”；回调仍在主线程，应保持简短。来源：[MDN — Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)。
- **[事实 / 外部]** CSS scroll-driven animations 可用 `scroll()` 或 `view()` 将动画进度绑定到滚动；不能据此省略不支持浏览器的静态兜底或减少动态效果分支。来源：[MDN — CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations)。
- **[建议]** 指针反馈采用 passive 事件 + 每帧最多一次更新；进入视口才启动，离开后停止；后台标签不绘制。不要在每个卡片各自创建永久 rAF，也不要通过逐帧 React state 更新绘制装饰。

### 2.3 本站已有什么、具体缺口在哪里

- **[事实 / 本地]** `MotionRuntime` 已使用 IntersectionObserver 做一次性入场、passive pointermove + rAF 更新光斑/倾斜，并只对鼠标开启；CSS 的 reveal 主要修改 opacity/transform。来源：[`motion-runtime.tsx:19-144`](../../src/components/motion/motion-runtime.tsx#L19-L144)、[`motion.css:12-117`](../../src/app/motion.css#L12-L117)。
- **[事实 / 本地]** 全站 reduce 规则把 CSS 动画/过渡压到极短、关闭 CSS 平滑滚动；life-spine 已有 `@supports(animation-timeline: scroll())` 和 `no-preference` 包裹。来源：[`globals.css:452-463`](../../src/app/globals.css#L452-L463)、[`globals.css:500-539`](../../src/app/globals.css#L500-L539)。
- **[事实 / 本地]** 首页的“向下滚动”在 JS 中显式调用 `scrollIntoView({behavior: "smooth"})`，没有先检查 reduce；CSS 的 `scroll-behavior:auto` 不能视为已经覆盖了这个显式 JS 参数。来源：[`personal-home.tsx:91-97`](../../src/components/home/personal-home.tsx#L91-L97)。
- **[事实 / 本地]** 首页滚动监听每个事件读取多个 `getBoundingClientRect()` 并 `setSection`，不是 rAF 合并；另两个运行时还有滚动监听。来源：[`personal-home.tsx:115-137`](../../src/components/home/personal-home.tsx#L115-L137)、[`scroll-progress.tsx:9-29`](../../src/components/motion/scroll-progress.tsx#L9-L29)、[`motion-runtime.tsx:37-79`](../../src/components/motion/motion-runtime.tsx#L37-L79)。
- **[事实 / 本地]** 环境 Canvas 读取 reduce 后画静帧；普通模式在页面可见时持续每帧重绘，DPR 上限为 2；首页和部分路由不挂环境层。它已监听 `visibilitychange`，但未按元素可见性暂停，也未监听系统偏好运行中改变。来源：[`page-ambient.tsx:75-98`](../../src/components/ambient/page-ambient.tsx#L75-L98)、[`page-ambient.tsx:467-536`](../../src/components/ambient/page-ambient.tsx#L467-L536)。
- **[事实 / 本地]** 所有 `[data-reveal]` 都长期保留 `will-change: opacity, transform`，包括已完成一次性入场的元素。来源：[`motion.css:29-56`](../../src/app/motion.css#L29-L56)。
- **[建议]** 先做三处小修再考虑新增效果：显式 JS 平滑滚动尊重 reduce；监听媒体查询变化以即时停/启 Canvas；将首页章节定位改为 rAF 合并或 IntersectionObserver，并在 reveal 结束后撤销不必要的 `will-change`。这些是由代码导出的候选优化，**[未实测]** 不断言当前已经掉帧；上线前以中低端移动设备和长列表 profile 验证。
- **[建议]** 新增动效只强化“从哪里来、当前是什么、操作是否成功”：短距离列表入场、选中下划线、按钮按压、提交后卡片进入待审状态、播放封面旋转可暂停。时长与 easing 属于设计建议，不是 W3C 数值要求；减少动态模式下直接显示终态。

### 2.4 Next.js 16.4.3 对这类改动的官方边界

- **[事实 / 本地官方文档]** 需要 state、事件、effect、浏览器 API 的部分属于 Client Component；Server Component 适合近源数据读取、保密、减少浏览器 JavaScript。把 `'use client'` 放在真正交互的小组件，而不是整个布局，可减少客户端 bundle。来源：[`node_modules/next/dist/docs/.../05-server-and-client-components.md:12-35,178-190`](../../node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md#L12-L35)。
- **[事实 / 本地官方文档]** Next 16.4.3 的 lazy loading 指南支持 `next/dynamic`、`React.lazy` / Suspense；Server Component 动态导入 Client Component 时文档明确提示当前不支持自动 code splitting，`ssr:false` 也只能用于 Client Component。不能凭旧经验随意挪动指令。来源：[`lazy-loading.md:9-20,60-96`](../../node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md#L9-L20)。
- **[建议]** 内容、真实项目说明、友链表继续由服务端渲染；只为草稿、选项卡、媒体偏好和可见的增强动效保留客户端边界。不要为“动效更丰富”把整个首页/项目页改成 Client Component。

---

## 3. 表单与能力盘点：事实和改动边界

### 3.1 留言（包括可附带的单曲）

**[事实 / 本地]**

- 公开页可读已审留言；写入必须登录，且服务端 Action 再查会话。未登录只显示“去登录”，登录链接目前为 `/login`，没有原位置 `next`。来源：[`letters/page.tsx:169-203`](../../src/app/(site)/(apps)/letters/page.tsx#L169-L203)、[`letters/actions.ts:25-35`](../../src/app/(site)/(apps)/letters/actions.ts#L25-L35)。
- 字段：留言正文（2–1000 字，客户端 textarea `required`）；可选附带歌曲的歌名、艺人、链接。三个歌曲字段全空才不推荐，只填一部分时歌名/艺人必填，链接可空，服务端允许 http/https。客户端 label 写“https://”，与服务端实际允许 http 略不一致。来源：[`letter-form.tsx:19-89`](../../src/components/letters/letter-form.tsx#L19-L89)、[`community-input.ts:13-44,65-74`](../../src/lib/community-input.ts#L13-L44)。
- 提交后为 `pending`，作者和站长可见，审核后公开；同一用户 24 小时最多 5 封。失败保留受控草稿，成功清空；已有 `role=alert/status` 和 pending 按钮状态，但服务端只返回一条总体错误，不返回字段级错误对象。来源：[`letter-form.tsx:26-34,92-114`](../../src/components/letters/letter-form.tsx#L26-L34)、[`letters/actions.ts:15-16,38-59`](../../src/app/(site)/(apps)/letters/actions.ts#L15-L16)。
- 没有针对留言列表的搜索框或查询参数。

**[建议 / 纯 UI 可做]** 把“邮箱验证码登录、无需密码、审核后公开、24 小时上限”放到操作前；让未登录用户也能先写本地草稿，登录链接携带回跳路径与锚点，回来恢复草稿；默认只显示正文，点“顺便推荐一首歌”再展开三项。客户端可补 `minLength=2` 和歌曲字段的原生必填提示，但服务端校验仍保留。

**[建议 / 需要后端才算完整]** 跨设备草稿、持久字段级错误结构、留言全文检索/分页过滤不是只改 CSS 能实现的；若只是本地草稿与原生字段提示，则不需要新增 API。

### 3.2 友链

**[事实 / 本地]**

- 公开友链页没有访客申请表，只列出站长已维护的站点，并引导“把站点发到留言板或 GitHub”；有“复制我的站点信息”按钮。公开页也没有搜索。来源：[`friends/page.tsx:216-253`](../../src/app/(site)/(apps)/friends/page.tsx#L216-L253)、[`friends-copy.tsx:9-36`](../../src/components/friends/friends-copy.tsx#L9-L36)。
- 后台友链字段是：站点名（必填，最多 40 字）、链接（必填 http/https，最多 500 字）、一句话介绍（可空，最多 160 字）、头像（可空 http/https 或站内路径，最多 500 字）、标签（可空，最多 3 个、每个最多 12 字、中英文逗号分隔）。添加/编辑/删除的 Action 均要求 owner。来源：[`friends-admin.tsx:18-97,125-195`](../../src/components/admin/friends-admin.tsx#L18-L97)、[`friends-core.ts:35-108`](../../src/lib/friends-core.ts#L35-L108)、[`admin/actions.ts:233-267`](../../src/app/(site)/(apps)/admin/actions.ts#L233-L267)。
- 公开卡片已有头像、介绍、标签，但没有按标签筛选控件；服务端列表能力不等于已有访客搜索。

**[建议 / 纯 UI 可做]** 把交换流程写成两步：“复制我的资料 → 在留言板留下你的站点名、URL、介绍（可选头像与最多 3 个标签）”，可用站内草稿预填，但仍沿用留言登录与审核；说明 GitHub 是另一条联系路径，不虚构独立“申请成功”。数据量增长后，可对已经取得的全量 friends 做客户端名称/标签筛选，不需要新查询接口。

**[建议 / 需要后端]** 若希望不经过留言板、保存专用友链申请、让访客查处理状态、站长一键采纳并自动回信，则需要新表/字段、服务端身份校验、审核 Action 和通知策略；这不是当前已有能力。

### 3.3 单曲推荐

**[事实 / 本地]**

- 字段为歌名、艺人、链接、推荐语（可选）。前三个客户端均必填；链接为 http/https；推荐语最多 200 字，其余上限分别 120/120/500。平台由链接域名推断为网易云、QQ 或 other。来源：[`song-form.tsx:11-77,106-140`](../../src/components/playlist/song-form.tsx#L11-L77)、[`community-input.ts:104-132`](../../src/lib/community-input.ts#L104-L132)。
- 需要登录、审核后公开，同一用户 24 小时最多 3 首；失败保留草稿、成功清空。没有按歌曲名搜索/自动补全。来源：[`playlist/actions.ts:15-68`](../../src/app/(site)/(apps)/playlist/actions.ts#L15-L68)、[`song-form.tsx:79-101`](../../src/components/playlist/song-form.tsx#L79-L101)。

**[建议 / 纯 UI 可做]** 与留言采用一致的登录前草稿、回跳、字段说明；把“单曲 / 整张歌单”放进同一推荐区，以两个清晰选项切换，默认只展开当前所需字段，减少长页面里两个相似表单的认知负担。此重排不改变现有 Action 的校验与配额。

**[建议 / 需要后端]** 按歌曲名/艺人检索、粘贴单曲分享文案后自动取歌名与封面，需要可信的平台查询/解析服务和失败兜底；不能在前端用伪造候选替代。

### 3.4 整张歌单推荐：已有搜索，不要重复建设

**[事实 / 本地]**

- 未登录不能搜索或提交；登录后可粘贴网易云 / QQ 音乐整段分享文字，系统提取链接；也可只输入歌单名搜索，再从候选点“推荐这张”。推荐语最多 300 字。来源：[`playlist-suggest-panel.tsx:57-114,134-214`](../../src/components/playlist/playlist-suggest-panel.tsx#L57-L114)、[`suggestion-actions.ts:59-97`](../../src/app/(site)/(apps)/playlist/suggestion-actions.ts#L59-L97)。
- **名称搜索只调用网易云**；QQ 音乐可走支持的分享链接/短链，不支持站内按名称搜索 QQ 候选。识别不了平台 id 会拒绝，不静默伪造。来源：[`suggestion-actions.ts:59-80,132-146`](../../src/app/(site)/(apps)/playlist/suggestion-actions.ts#L59-L80)、[`playlist-core.ts:101-153,495-517`](../../src/lib/playlist-core.ts#L101-L153)。
- 每名用户最多 5 张待审；采纳前存元数据，站长采纳后才真正导入；同用户/平台/外部 id 重复提交会更新待审记录。访客只能看自己提交的记录（最多 50 条），站长看待审队列。来源：[`suggestion-actions.ts:33,99-185`](../../src/app/(site)/(apps)/playlist/suggestion-actions.ts#L33-L185)、[`playlist-suggestions-server.ts:51-100`](../../src/lib/playlist-suggestions-server.ts#L51-L100)。

**[建议 / 纯 UI 可做]** 把按钮文案按输入状态区分“搜索网易云歌单 / 提交分享文案”，先告诉用户名称搜索的平台范围；搜索时用结果数、加载和空状态反馈。注意当前两个操作共用一个 `busy`，加载文案不要暗示正在同时搜索两个平台。

**[建议 / 需要后端]** QQ 按名称搜索、跨平台统一结果、匿名搜索或匿名提交需要后端/权限/限流设计；其中“允许匿名”是产品与滥用防护决策，不是视觉优化。

### 3.5 登录是完整两步流程，不是密码框

**[事实 / 本地]** 邮箱验证码是两步：先请求验证码，再提交邮箱 + 6 位数字；支持 `autocomplete=email` 与 `one-time-code`，首次验证会自动创建账号。服务端配置同时具备会话密钥和 SMTP 才开放。来源：[`login-form.tsx:22-78,80-174`](../../src/components/auth/login-form.tsx#L22-L78)、[`login/page.tsx:115-158`](../../src/app/(site)/(apps)/login/page.tsx#L115-L158)。

**[建议]** 第一阶段可明确写“验证码登录，首次使用自动注册”，避免“登录 / 注册”两个入口让新访客先做一次无意义选择；这是文案/流程呈现优化，不改变邮箱凭证模型。

### 3.6 Next / React 对现有表单的支持与底线

- **[事实 / 本地官方文档]** Next 16.4.3 表单指南要求即使只在已登录页显示表单，也要在每个 Server Action 内验证身份和授权；支持原生 `required/type` 客户端校验、Zod 服务端校验，以及 `useActionState` 返回校验错误。来源：[`forms.md:7-16,129-192`](../../node_modules/next/dist/docs/01-app/02-guides/forms.md#L7-L16)。
- **[事实 / 外部]** React 官方 `useActionState` 返回 state、formAction、isPending 三项，isPending 可用于提交中的反馈。来源：[React — `useActionState`](https://react.dev/reference/react/useActionState)。
- **[事实 / 本地]** 留言与单曲已经用 `useActionState`、pending 禁用、受控草稿和 alert/status；所以“增加提交 loading”不是待办，重点应是登录前后上下文与字段级可理解性。来源见 3.1、3.3。
- **[建议]** 所有 UI 捷径都不能取代 Action 的鉴权、Zod 校验和配额。若要字段旁显示错误，可让 Action 返回结构化的 fieldErrors 并给输入加 `aria-describedby` / `aria-invalid`；总体错误状态已存在，不必推倒重写表单。

---

## 4. Nova Agent 公开首页：可准确使用的展示素材

**[事实 / 公开页面观察，2026-11-24]** `https://nova.zxycoder.cn/` 可访问，浏览器 title 为 **“Nova Agent — 可验证的工程 Agent”**。页面正文将产品描述为“可自托管的工程 Agent”，首屏主张为“让每一个结论，都能有据可查。”；公开导航含“两种模式、能力、交付、手机遥控、下载”，并有文档和下载链接。来源：[Nova Agent 公开首页](https://nova.zxycoder.cn/)。

可直接用于 Z-Blog 项目卡的内容：

1. **[事实]** 开发模式面向代码仓库：导入项目、读改文件、运行测试、核验文件/行号引用，写入前展示 diff；论文模式按题目、提纲、章节推进，可导出 MD/DOCX/PDF。来源同上首页的“两种模式”区。
2. **[事实]** 首页强调引用核验、真实命令退出码、人工批准补丁，以及手机指令进入队列、电脑确认后执行；这些比“聪明/全能”更适合做简短卖点。来源同上首页“证据链”“能力清单”“手机遥控”区。
3. **[事实]** 页面展示 Windows 安装包 **v2.2.2**、自托管、BYOK、Apache-2.0、无遥测；这些是页面自述，不是本次独立审计结论，版本具有时效性。来源同上首屏与页脚。
4. **[事实]** 有公开的游客试用/登录按钮，但本次未点击、未登录、未创建工作区、未发送消息或下载文件；因此不对真实生成质量、权限执行、沙箱安全性或试用配额作体验结论。
5. **[事实]** 浏览器报告 2 条 console error，但本次未将其归因，也未据此判断页面不可用；公开正文和导航已成功呈现。它不是 Z-Blog 自身错误证据。

**[建议]** Z-Blog 项目页可以采用“真实界面截图或经过标注的局部预览 + 3 条可验证事实 + 官方站点/使用文档”结构，标题用“Nova Agent：可验证的工程 Agent”，短述聚焦“开发 / 论文两种工作区，引用、测试与变更可回看”。不要复制成夸张的运行数据或把示意界面写成访客当前会话；截图应在获得/确认素材使用许可后维护，外部图片优先本地化并写准确 alt。

---

## 5. 推荐实施顺序与验收

1. **先做访客路径（建议 3–5）**：未登录草稿 → 邮箱验证码 → 回到原位置 → 提交 → 待审状态；同时整理友链交换说明和单曲/歌单入口。
2. **再做语义色与状态（建议 1）**：只替换少量 token/组件映射，逐项测三套主题，不做全站渐变。
3. **收敛已有动效并补缺（建议 2）**：减少重复 scroll 工作、处理 reduce 的动态变化和 JS 平滑滚动，再增强真实状态反馈。
4. **最后补 Nova 项目展示（建议 6）**：使用公开可核对的描述，避免营销性空词和虚构演示。

**[建议] 最小验收清单**

- 键盘走完登录入口、正文、可选歌曲、候选歌单与提交；焦点可见，错误与状态不只用颜色表达。
- 三套主题对实际文本、输入边界和焦点组合做对比度检查；透明/渐变背景取最不利位置，不只抄 token 比值。
- 系统减少动态效果在首次加载及运行中切换时，内容都立即可读、无连续漂浮/跑马灯/平滑滚动；操作状态仍明确。
- 375px 触屏无 hover 依赖；中低端设备对首页长滚动、留言/歌单页和 Canvas 做 Performance 录制后再决定是否降帧/按可见性暂停。
- 未登录草稿在登录返回后仍存在；登录、待审、24 小时/待审配额、平台搜索边界与失败文案和代码一致。
- Nova 的项目描述定期与公开首页核对；不把版本号或公开页自述写成永久、已独立验证的事实。

---

## 6. 来源索引

### 外部一手资料

- W3C：[Contrast (Minimum), WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)；[Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)；[Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)。
- MDN：[prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion)；[CSS and JavaScript animation performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance)；[Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)；[CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations)。
- React：[useActionState](https://react.dev/reference/react/useActionState)。
- 产品一手公开页：[Nova Agent](https://nova.zxycoder.cn/)（仅首页，只读）。

### 本地官方文档与代码

- 版本：[`package.json`](../../package.json)。
- Next.js 16.4.3 随包文档：[Server and Client Components](../../node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md)、[Forms](../../node_modules/next/dist/docs/01-app/02-guides/forms.md)、[Lazy Loading](../../node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md)。
- 主要实现：[`src/app/globals.css`](../../src/app/globals.css)、[`src/app/motion.css`](../../src/app/motion.css)、[`src/components/motion/motion-runtime.tsx`](../../src/components/motion/motion-runtime.tsx)、[`src/components/ambient/page-ambient.tsx`](../../src/components/ambient/page-ambient.tsx)、[`src/components/letters/letter-form.tsx`](../../src/components/letters/letter-form.tsx)、[`src/components/playlist/song-form.tsx`](../../src/components/playlist/song-form.tsx)、[`src/components/playlist/playlist-suggest-panel.tsx`](../../src/components/playlist/playlist-suggest-panel.tsx)、[`src/app/(site)/(apps)/friends/page.tsx`](../../src/app/(site)/(apps)/friends/page.tsx)。

### 调研限制

本次没有运行 Z-Blog 页面、没有制造登录会话或真实提交，因此“访客操作复杂”的代码层证据不等于可用性测试结论。外部 `WebFetch` 对部分官方域名出现安全校验不可达，随后用只读 HTTP 请求核对了上述 W3C/MDN/React 官方原文；Nova 使用浏览器仅读取公开首页。对比度为源码颜色的静态计算，未替代浏览器组合样式和真实设备测试。
