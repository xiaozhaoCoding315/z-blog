# 个人空间改版 · 阶段 5（旧内容整理、删题库、上线准备）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 30 篇技术文章只留 10 篇在 `/notes`，旧 `/blog` 链接 301 到新地址；`/changelog` 改为 `/journal`；旧留言板数据已在阶段 3 并入 `/letters`，旧页面删除；`/interview` 全部路由与 API 删除（表和内容文件保留）；RSS 同时输出动态与笔记；站点地图只列真实存在的页面；全站没有站内死链。上线前把环境与部署文档补齐，实际部署因网络与域名条件留待用户执行。

**Architecture:** 内容是文件系统（`content/notes`），数据库是派生索引（`posts` / `chunks`）。把 10 篇移进 `content/notes` 后，`listRawNotes()` 只读这 10 篇，`syncPosts()` 现有的「删除不在文件列表里的文章」逻辑会自动清掉另外 20 篇的派生数据。路由迁移用 Next 的 `permanentRedirect` / `redirects()`，不保留两套页面。旧留言板、题库的 UI 与 API 删除，数据表保留。RSS 与 sitemap 改成动态路由：笔记来自文件，动态来自数据库，数据库不可用时只输出笔记，不输出假条目。

**Tech Stack:** Next.js 16.4.3（App Router、`cacheComponents`、`connection()`、`permanentRedirect`、route handlers、metadata routes）、React 19.3、Tailwind CSS 4.3.3、Drizzle ORM 0.45 + postgres.js、`node --test`。

---

## Global Constraints

- 继承阶段 2–4 的全部约束：Next 16 文档先读后写、中文文案、token 配色、无新依赖、无假数据、Server Action 内重新鉴权、`use cache` + `cacheTag` + `updateTag`、`connection()` 页面 `instant = false`、`node --test` 纯函数无 `@/` 别名、不部署不合 main。
- **内容选择是站长的编辑决定**：本计划固定选 10 篇（见 Task 1 列表）。站长想换，只需把文件在 `content/notes` 与 `content/posts` 之间移动，不需要改代码。
- 旧文章文件保留在 `content/posts`，不删除；它们不再被构建、搜索、RSS 或 AI 引用。
- 旧 `/blog/<slug>` 必须 301：保留的 10 篇跳 `/notes/<slug>`，其余跳 `/notes`；`/blog`、`/blog/tag/*`、`/archives` 跳 `/notes`。
- `/changelog` → `/journal`，`/guestbook` → `/letters`；`/interview` 全部路由与 `api/interview/*` 删除（404 可接受，站内不再有链接）。
- 所有站内链接必须是新路由：`/notes`、`/journal`、`/letters`、`/shelf`、`/playlist`、`/life/[id]`。验收时用 grep 证明。
- RSS 与 sitemap 只有真实内容：数据库不可用时 RSS 只输出笔记，sitemap 不输出动态；不得伪造日期或空条目。
- 删除文件是破坏性操作，但都在 git 里；提交前用 `git status` 确认只删计划列出的文件，不删 `content/posts` 的归档文件、不删 `content/interview`、不删数据库表。
- 每个任务单独提交；任务结束 `npm run type-check` + `npm test`；阶段收尾跑全套门禁。
- 实际部署（`scripts/deploy.sh`）不在本阶段自动执行：本机到 GitHub/服务器网络不通、域名与备案未定。只更新部署文档与环境模板，并把上线前硬门槛写进验收。

---

## 文件结构

**移动 / 删除**

| 操作 | 路径 |
| --- | --- |
| `git mv` 10 篇 | `content/posts/<slug>.mdx` → `content/notes/<slug>.mdx` |
| `git mv` | `src/app/(site)/blog/[slug]/page.tsx` → `src/app/(site)/notes/[slug]/page.tsx` |
| `git mv` | `src/app/blog/[slug]/opengraph-image.tsx` → `src/app/notes/[slug]/opengraph-image.tsx` |
| `git mv` | `src/app/(site)/changelog/page.tsx` → `src/app/(site)/journal/page.tsx` |
| 新建 | `src/app/(site)/notes/page.tsx`（由 blog 列表改写） |
| 新建 | `src/app/blog/[slug]/page.tsx`（仅做 301 判断） |
| 删除 | `src/app/(site)/blog/page.tsx`、`src/app/(site)/blog/tag/[tag]/page.tsx`、`src/app/(site)/archives/page.tsx` |
| 删除 | `src/app/(site)/guestbook/page.tsx`、`src/components/guestbook/`、`src/app/api/guestbook/` |
| 删除 | `src/app/(site)/interview/`、`src/app/api/interview/`、`src/components/interview/`、`src/lib/interview-core.ts`、`src/lib/interview-progress.ts` |
| 删除 | `src/components/blog/giscus.tsx` |
| 保留 | `content/posts` 其余 20 篇、`content/interview` 全部文件、题库数据表 |

**修改**

`src/lib/content-core.ts`、`src/content.ts`、`src/app/(site)/notes/[slug]/page.tsx`、`src/app/(site)/notes/page.tsx`、`src/components/blog/post-card.tsx`、`src/components/blog/blog-browser.tsx`、`src/components/blog/related-posts.tsx`、`src/components/search/search-palette.tsx`、`src/components/terminal/terminal-palette.tsx`、`src/app/layout.tsx`、`src/app/not-found.tsx`、`src/app/api/chat/route.ts`、`src/app/feed.xml/route.ts`、`src/app/sitemap.ts`、`src/app/robots.ts`、`next.config.ts`、`src/config/site.ts`、`src/config/changelog.ts`、`src/app/(site)/about/page.tsx`、`src/app/(site)/friends/page.tsx`、`src/app/(site)/projects/page.tsx`、`src/config/portfolio.ts`、`scripts/check-content.mjs`、`scripts/new-post.mjs`、`package.json`、`.env.example`、`README.md`、`DEPLOY.md`、`Dockerfile`、`docker-compose.yml`、`docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`、`docs/superpowers/plans/2026-11-08-personal-space-phase-5.md`

---

### Task 1: 笔记迁移（30 → 10）与路由

**Files:**
- Move: 10 个 `content/posts/*.mdx` → `content/notes/*.mdx`
- Modify: `src/lib/content-core.ts`
- Modify: `src/content.ts`
- Move: `src/app/(site)/blog/[slug]/page.tsx` → `src/app/(site)/notes/[slug]/page.tsx`
- Move: `src/app/blog/[slug]/opengraph-image.tsx` → `src/app/notes/[slug]/opengraph-image.tsx`
- Create: `src/app/(site)/notes/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`（301 判断）
- Delete: `src/app/(site)/blog/page.tsx`、`src/app/(site)/blog/tag/[tag]/page.tsx`
- Modify: `src/components/blog/post-card.tsx`、`src/components/blog/blog-browser.tsx`、`src/components/blog/related-posts.tsx`
- Modify: `src/components/search/search-palette.tsx`
- Modify: `src/app/layout.tsx`、`src/app/(site)/layout.tsx`、`src/app/not-found.tsx`、`src/app/api/chat/route.ts`
- Modify: `src/app/(site)/changelog/page.tsx`（Task 2 再改名为 journal）、`src/app/(site)/life/[id]/actions.ts`、`src/lib/activity.ts`、`src/lib/sync.ts`
- Modify: `scripts/check-content.mjs`、`scripts/new-post.mjs`、`package.json`

**Interfaces:**
- `src/lib/content-core.ts`：
  - `export const NOTES_DIR = path.join(process.cwd(), "content", "notes")`
  - `listRawNotes(): Post[]`、`getRawNote(slug: string): Post | null`
  - 不再导出 `POSTS_DIR` / `listRawPosts` / `getRawPost`（除非有阶段 3 代码临时引用，改名后全量替换）。
- `src/content.ts`：
  - `getAllNotes(): Note[]`（React cache，过滤 draft，pinned 优先 + 日期倒序）
  - `getNoteBySlug(slug: string): Note | null`
  - `getAdjacentNotes(slug: string)`
  - `getNoteTags(): { tag: string; count: number }[]`
  - `Note` 类型保留字段 `slug/meta/content/readingMinutes/readingText/hash`，只是改名。

- [ ] **Step 1: 移动 10 篇笔记**

```bash
mkdir -p content/notes
git mv content/posts/hello-world.mdx content/notes/hello-world.mdx
git mv content/posts/build-blog-with-nextjs.mdx content/notes/build-blog-with-nextjs.mdx
git mv content/posts/rag-powered-blog.mdx content/notes/rag-powered-blog.mdx
git mv content/posts/semantic-search-recall-tuning.mdx content/notes/semantic-search-recall-tuning.mdx
git mv content/posts/next16-cache-components-pitfalls.mdx content/notes/next16-cache-components-pitfalls.mdx
git mv content/posts/rsc-server-client-boundary.mdx content/notes/rsc-server-client-boundary.mdx
git mv content/posts/agent-memory-design.mdx content/notes/agent-memory-design.mdx
git mv content/posts/agent-orchestration-patterns.mdx content/notes/agent-orchestration-patterns.mdx
git mv content/posts/why-agent-tool-calls-fail.mdx content/notes/why-agent-tool-calls-fail.mdx
git mv content/posts/2g-server-oom-lessons.mdx content/notes/2g-server-oom-lessons.mdx
```

选择理由（写进验收记录，方便站长以后换）：一篇建站自述（pinned）、一篇站点架构、两篇 RAG/检索、两篇 Next.js/React、三篇 Agent、一篇运维。其余 20 篇留在 `content/posts` 作为归档，不再出现在站点。

- [ ] **Step 2: 改 `src/lib/content-core.ts`**

- `POSTS_DIR` → `NOTES_DIR`，指向 `content/notes`。
- `listRawPosts` → `listRawNotes`，`getRawPost` → `getRawNote`；注释从「文章」改为「笔记」。
- 其余 frontmatter schema、阅读时长、哈希、TOC 提取不变。

- [ ] **Step 3: 改 `src/content.ts`**

把 `getAllPosts/getPostBySlug/getAdjacentPosts/getTags` 改为 `getAllNotes/getNoteBySlug/getAdjacentNotes/getNoteTags`，内部改调 `listRawNotes/getRawNote`。保留 React `cache()`。`Post` 类型改名为 `Note`（或保留 `Post` 作为别名并注释「笔记沿用了旧的 Post 形状」；优先彻底改名，别留两个名字）。

- [ ] **Step 4: 建 `/notes` 列表页**

把原 `src/app/(site)/blog/page.tsx` 的逻辑搬到 `src/app/(site)/notes/page.tsx`：
- `metadata.title = "笔记"`，description「保留下来的技术笔记：建站、检索、Agent 与运行时」。
- H1「笔记」，mono 读数「共 N 篇」。
- 继续用 `BlogBrowser` 做本地筛选（组件名不改，内部文案从「文章」改「笔记」），但 `PostCard` 的链接改 `/notes/${slug}`。
- 标签不再链到独立标签页：`post-card.tsx` 里的标签改为 `<span>`，去掉 `/blog/tag/...` 链接；`blog/[slug]` 页头的标签同样改成 span。标签筛选仍由 `BlogBrowser` 在客户端做。

- [ ] **Step 5: 建 `/notes/[slug]` 详情页**

`git mv` 后修改：
- import 改为 `getAllNotes/getNoteBySlug/getAdjacentNotes`。
- 返回链接 `/notes`，文案「← 笔记」。
- 标签 span 化；上一篇/下一篇 `/notes/${slug}`。
- `generateStaticParams` 用 `getAllNotes()`。
- 保留 ViewCounter、LikeButton、SummaryFallback、RelatedPosts、TOC、ArticleTools。
- **删除 Giscus**，换成阶段 3 的评论组件（若阶段 3 的评论组件已支持 `targetType="note"`）：页面里读 `getVisibleComments("note", slug)`、`getSessionUser()`、`loginReady()`；未登录显示登录说明。评论区放在 RelatedPosts 之后。若为了保证笔记页静态壳，把评论区包进 `<Suspense>`，`NoteComments` 服务端组件内部读 cookies；构建失败时按 `authentication-with-cache-components.md` 调整，实在不行让笔记页动态并记录取舍。
- JSON-LD 类型仍是 `BlogPosting`（笔记也是文章），URL 不再是字段内容，无需改。

- [ ] **Step 6: 建 `/blog/[slug]` 301 判断页**

```tsx
import { permanentRedirect } from "next/navigation";
import { getRawNote } from "@/lib/content-core";

/**
 * 旧链接兜底：保留的笔记跳新地址，归档文章统一回 /notes。
 * 不渲染任何内容，只做 301。
 */
export default async function LegacyBlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(getRawNote(slug) ? `/notes/${slug}` : "/notes");
}
```

删除 `src/app/(site)/blog/page.tsx` 与 `src/app/(site)/blog/tag/[tag]/page.tsx`；`/blog` 与标签的重定向交给 Task 2 的 `next.config.ts`。

- [ ] **Step 7: 移动 OG 图路由**

`git mv src/app/blog/[slug]/opengraph-image.tsx src/app/notes/[slug]/opengraph-image.tsx`，import 改为 `getNoteBySlug`。确认 `generateImageMetadata` / `alt` 文案里的「文章」改「笔记」。

- [ ] **Step 8: 改所有 `/blog` 链接**

- `src/components/blog/post-card.tsx`：`/blog/${slug}` → `/notes/${slug}`；标签链接删除。
- `src/components/blog/related-posts.tsx`：`/blog/${slug}` → `/notes/${slug}`。
- `src/components/search/search-palette.tsx`：本地结果与语义结果的 `router.push`/`navigate` 目标改 `/notes/${slug}`。
- `src/components/terminal/terminal-palette.tsx`（零引用但保留）：命令里的 `/blog` 改 `/notes`。
- `src/app/layout.tsx`：JSON-LD `SearchAction.target` 改 `${siteConfig.url}/notes?q={search_term_string}`。
- `src/app/not-found.tsx`：返回链接 `/blog` → `/notes`。
- `src/app/api/chat/route.ts`：citation `href` 改 `/notes/${post_slug}#${heading}`。
- `src/app/(site)/about/page.tsx`：两处 `/blog/...` 改 `/notes/...`；若链接到归档文章（不在 10 篇内），改成 `/notes` 或删除。
- `src/app/(site)/layout.tsx`、`src/app/(site)/changelog/page.tsx`、`src/lib/activity.ts`：把 `getAllPosts` 改为 `getAllNotes`（函数改名后必须同步；Task 2 再把 changelog 文件改名为 journal）。
- `src/lib/sync.ts`：`listRawPosts` → `listRawNotes`。
- `src/app/(site)/life/[id]/actions.ts`（阶段 3 创建）：评论目标校验里的 `getPostBySlug` → `getNoteBySlug`。
- `README.md`、`scripts/new-post.mjs` 的预览地址改 `localhost:3000/notes/<slug>`。
- 笔记内部链接：`content/notes/build-blog-with-nextjs.mdx` 的 `/blog/rag-powered-blog` → `/notes/rag-powered-blog`；`content/notes/hello-world.mdx` 指向 `/blog/deploy-with-docker`（已归档）→ 改成 `/notes` 或删掉链接，不能留 301 链到列表的绕路。

- [ ] **Step 9: 改内容检查与新文章脚本**

- `scripts/check-content.mjs`：`POSTS_DIR` → `NOTES_DIR`（`content/notes`）；错误前缀改「笔记」；保留所有 frontmatter 检查。加一条警告：笔记数不是 10 时 `warnings.push`（不是错误，允许站长调整）。
- `scripts/new-post.mjs`：写入目录改 `content/notes`，预览 URL 改 `/notes/`。
- 若 `package.json` 有 `blog:sync` 名称，保留（脚本名不是路由），但在 README 里说明它同步的是笔记。

- [ ] **Step 10: 跑测试、内容检查、构建**

```bash
npm run type-check
npm test
node scripts/check-content.mjs
npm run build
```
Expected: 全部 exit 0；`check-content` 显示 10 篇、0 错；构建不再生成 `/blog` 或 `/blog/tag/*` 页面。

- [ ] **Step 11: 提交**

```bash
git add -A content/notes content/posts src/lib/content-core.ts src/content.ts src/app/'(site)'/notes src/app/'(site)'/blog src/app/blog src/app/'(site)'/about/page.tsx src/app/'(site)'/layout.tsx src/app/'(site)'/changelog/page.tsx src/app/'(site)'/life/'[id]'/actions.ts src/app/layout.tsx src/app/not-found.tsx src/app/api/chat/route.ts src/lib/activity.ts src/lib/sync.ts src/components/blog src/components/search/search-palette.tsx src/components/terminal/terminal-palette.tsx scripts/check-content.mjs scripts/new-post.mjs README.md package.json
git commit -m "feat(phase-5): 10 篇笔记迁入 /notes，旧 /blog 链接 301"
```

**注意**：`git add -A content/posts` 会包含未移动的 20 篇，它们没有改动，不会进提交；但 `git mv` 的删除记录会进提交。提交前用 `git status --short` 逐项确认。

---

### Task 2: 日志、留言板、题库与 giscus 清理

**Files:**
- Move: `src/app/(site)/changelog/page.tsx` → `src/app/(site)/journal/page.tsx`
- Modify: `next.config.ts`（redirects）
- Modify: `src/config/site.ts`、`src/config/changelog.ts`
- Delete: `src/app/(site)/guestbook/page.tsx`、`src/components/guestbook/`、`src/app/api/guestbook/`
- Delete: `src/app/(site)/interview/`、`src/app/api/interview/`、`src/components/interview/`、`src/lib/interview-core.ts`、`src/lib/interview-progress.ts`
- Delete: `src/components/blog/giscus.tsx`
- Modify: `src/app/(site)/about/page.tsx`、`src/app/(site)/friends/page.tsx`
- Modify: `.env.example`、`Dockerfile`、`docker-compose.yml`、`README.md`、`DEPLOY.md`

**Interfaces:**
- `next.config.ts` 增加 `async redirects()`，返回：
  - `/blog` → `/notes`（permanent）
  - `/blog/tag/:tag` → `/notes`（permanent）
  - `/archives` → `/notes`（permanent）
  - `/changelog` → `/journal`（permanent）
  - `/guestbook` → `/letters`（permanent）
- 不添加 `/blog/:slug` 的配置重定向（保留 `src/app/blog/[slug]/page.tsx` 做条件判断）。

- [ ] **Step 1: 移动 changelog 到 journal**

```bash
git mv src/app/(site)/changelog/page.tsx src/app/(site)/journal/page.tsx
```

页面内标题「开发日志」保留，metadata title 改「日志」，文案里提到 `/changelog` 的地方改 `/journal`。`src/config/changelog.ts` 的数据不动，只改文案里的路径引用。

- [ ] **Step 2: 在 `next.config.ts` 加 redirects**

```ts
async redirects() {
  return [
    { source: "/blog", destination: "/notes", permanent: true },
    { source: "/blog/tag/:tag", destination: "/notes", permanent: true },
    { source: "/archives", destination: "/notes", permanent: true },
    { source: "/changelog", destination: "/journal", permanent: true },
    { source: "/guestbook", destination: "/letters", permanent: true },
  ];
}
```

读一遍 `node_modules/next/dist/docs/01-app/02-guides/redirecting.md` 与 `next.config` 的 redirects 文档，确认 `permanent: true` 的状态码（308）与顺序；不要用 `has`/`missing` 做多余条件。

- [ ] **Step 3: 删除旧留言板 UI 与 API**

```bash
git rm -r src/app/'(site)'/guestbook src/components/guestbook src/app/api/guestbook
```

数据表 `guestbook` 保留（阶段 3 已迁移，历史可查）；`src/db/schema.ts` / `ensureSchema()` 不动。`letters` 页面的 `/guestbook` 链接已在阶段 3 删除；再 grep 确认没有残留。

- [ ] **Step 4: 删除题库路由、API、组件与只服务于它们的 lib**

```bash
git rm -r src/app/'(site)'/interview src/app/api/interview src/components/interview
git rm src/lib/interview-core.ts src/lib/interview-progress.ts
```

先 grep 确认 `interview-core` / `interview-progress` 只被上述文件引用；若有别处引用，停下来报告，不要强删。`content/interview/` 200 个文件、`interview_mastery` / `interview_review` 两张表保留。`scripts/classify-difficulty.mjs` 是内容维护脚本，保留（不参与构建）。

- [ ] **Step 5: 删除 giscus 组件与配置**

- `git rm src/components/blog/giscus.tsx`（笔记页已在 Task 1 去掉 import）。
- `src/config/site.ts` 删除 `giscus` 对象。
- `.env.example` 删除 `NEXT_PUBLIC_GISCUS_*` 五行。
- `Dockerfile` 删除 `ARG NEXT_PUBLIC_GISCUS_*` 与对应 `ENV`。
- `docker-compose.yml` 删除 build args 与 environment 里的 giscus 变量。
- `README.md`、`DEPLOY.md` 删除 giscus 配置说明与相关行。
- 全仓 `rg -n "giscus|GISCUS"` 应只剩文档历史记录（设计文档可以保留「不迁移」的说明）。

- [ ] **Step 6: 更新导航、页脚、关于页、友链页**

- `src/config/site.ts` 的 `footerNav`：「笔记」→ `/notes`，「日志」→ `/journal`。
- `src/app/(site)/about/page.tsx`：删除 `/interview` 入口与相关段落（题库已下架）；`/changelog` → `/journal`；`/guestbook` → `/letters`；两处 `/blog/...` 在 Task 1 已改。
- `src/app/(site)/friends/page.tsx`：`/guestbook` → `/letters`。
- 主导航四项（生活、书架、歌单、信箱）不动。

- [ ] **Step 7: 全仓扫旧路由**

```bash
rg -n '"/blog|/blog/|"/changelog|/changelog|"/interview|/interview|"/guestbook|/guestbook' src scripts content/notes README.md DEPLOY.md
```

允许保留的：
- `next.config.ts` 的 redirect source；
- `src/app/blog/[slug]/page.tsx` 的兼容页；
- `docs/superpowers/` 的历史计划/规格；
- `content/posts` 归档文章正文里的示例路径（不构建）；
- `src/config/changelog.ts` 里描述历史的文字（可改则改）。

其余全部改掉。把这条 grep 的结果记进验收。

- [ ] **Step 8: 门禁**

```bash
npm run type-check
npm run lint
npm test
npm run build
```
Expected: exit 0；构建不再有 `/guestbook`、`/interview` 页面。

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "feat(phase-5): /journal、删留言板与题库路由、清 giscus"
```

提交前 `git status --short` 必须只包含本任务列出的删除/修改；`content/posts` 与 `content/interview` 不应出现在删除列表。

---

### Task 3: RSS、站点地图、robots 与引用

**Files:**
- Modify: `src/app/feed.xml/route.ts`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`
- Modify: `src/app/api/chat/route.ts`（若 Task 1 只改了 citation，这里再检查系统提示与内部链接文案）
- Modify: `src/lib/ai.ts`（若系统提示里写「博客文章」改「站内笔记」）

**Interfaces:**
- RSS：`GET /feed.xml` 返回 `application/rss+xml; charset=utf-8`；条目 = 10 篇笔记 + 数据库里全部 moments；按发布时间倒序；笔记链接 `/notes/<slug>`，动态链接 `/life/<id>`。
- Sitemap：静态页 `/`、`/shelf`、`/playlist`、`/letters`、`/notes`、`/projects`、`/journal`、`/friends`、`/about`；笔记 10 篇；动态逐条 `/life/<id>`（DB 可用时）；不包含 `/blog`、`/blog/tag/*`、`/archives`、`/changelog`、`/guestbook`、`/interview`、`/admin`、`/write`、`/login`。
- Robots：允许 `/`，禁止 `/admin`、`/write`、`/login`、`/api/`；保留 sitemap 地址。

- [ ] **Step 1: 重写 RSS**

读 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` 与 `connection.md`。要点：
- `await connection()` 放在 `GET()` 顶部，避免构建期把「没有数据库」的结果烤成静态 RSS。
- 笔记：`getAllNotes()`；动态：`getMoments()`（`src/lib/moments-server.ts`）。两者都可能为空。
- 统一条目形状 `{ title, link, guid, pubDate, description }`；动态的 title 用正文前 40 字（折叠空白）或卡片标题，description 用正文/卡片标题；没有正文的纯图片动态用「一张照片」。
- 排序：`Date.parse(pubDate)` 倒序。
- `siteConfig.url` 拼接；`escapeXml` 保留。
- 数据库不可用时 `getMoments()` 返回 `available: false`，此时**只输出笔记**，不输出空 `<item>`。
- 不加 `revalidate`，靠 `connection()` 动态读取；若构建报 route handler 静态化冲突，按 docs 改用 `export const dynamic = "force-dynamic"` 或等价的 Next 16 写法。

- [ ] **Step 2: 重写 sitemap**

读 `generate-sitemaps.md`。`export default async function sitemap(): Promise<MetadataRoute.Sitemap>`：
- `await connection()`。
- 静态页列表（含 `/notes`、`/shelf`、`/playlist`、`/letters`、`/journal`）。
- 笔记：`getAllNotes()`，`lastModified` 用 `meta.date`。
- 动态：`getMoments()`；`available` 为真时逐条 `url: ${siteConfig.url}/life/${m.id}`，`lastModified: publishedAt`；为假时跳过，不写假日期。
- 删除对 `getChangelog`、`getTags`、`/interview`、`/guestbook`、`/blog`、`/archives` 的引用。
- `priority`：首页 1，生活/笔记 0.8，其余 0.6–0.7。

- [ ] **Step 3: 更新 robots**

```ts
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/write", "/login", "/api/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: 检查 chat 引用与提示**

- `src/app/api/chat/route.ts` 的 citation 链接已由 Task 1 改 `/notes`；确认没有 `/blog`。
- `src/lib/ai.ts` / chat system prompt 若写「博客文章」「技术博客」，改成「站内笔记」；不要承诺 AI 能检索已归档的 20 篇——同步后数据库只有 10 篇。
- `src/app/api/stats` / `related` / `search` 不需要改代码：它们从 `posts` / `chunks` 读，`syncPosts()` 会清掉归档文章；在验收里验证数据库只剩 10 篇。

- [ ] **Step 5: 构建与本地验证**

```bash
npm run type-check
npm run build
```
起生产服务器，验证：
- `curl -s http://localhost:PORT/feed.xml | head`：是 RSS；包含 `/notes/` 与 `/life/`；不含 `/blog/`。
- `curl -s http://localhost:PORT/sitemap.xml`：包含新路由；不含旧路由。
- `curl -s http://localhost:PORT/robots.txt`：含 disallow 与 sitemap。
- XML 用 Node 解析一遍（`node -e` + 简单标签检查），确认没有未转义的 `&`。

- [ ] **Step 6: 提交**

```bash
git add src/app/feed.xml/route.ts src/app/sitemap.ts src/app/robots.ts src/app/api/chat/route.ts src/lib/ai.ts
git commit -m "feat(phase-5): RSS 输出笔记与动态，站点地图与 robots 收口"
```

---

### Task 4: 项目文案角度与部署文档

**Files:**
- Modify: `src/config/portfolio.ts`
- Modify: `src/app/(site)/projects/page.tsx`
- Modify: `.env.example`、`README.md`、`DEPLOY.md`
- Modify: `docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`（阶段 5 记录）

**Interfaces:**
- `Project` 增加两个可选字段：`why?: string`（为什么做）、`feeling?: string`（做完什么感受）。
- 三个项目各补两句中文；页面渲染在 `context` 之后、`highlights` 之前（或按现有结构放在描述下方）。没有字段的条目不渲染空标题。

- [ ] **Step 1: 改 `Project` 接口与数据**

给 Nova Agent、本博客、TripCraft 各写：
- `why`：一句真实动机，不超过 80 字；
- `feeling`：一句做完/在做的感受，不超过 80 字。
基于现有 `context` / `description` / `outcomes`，不编造新事实。示例（可按原文调整，不要照抄模板腔）：
- Nova Agent why「想让 Agent 的每条结论都能被验证，而不是听起来对」；feeling「最满意的不是它能改代码，是失败时知道为什么失败」。
- 本博客 why「想有一个自己的地方记录生活和学习，而不是被平台的时间线推着走」；feeling「从技术博客改成个人空间后，发布压力小了，反而更愿意写」。
- TripCraft why「一次旅行要同时权衡天气、交通、住宿、景点，单次生成总会漏」；feeling「评审 Agent 驳回重跑的那几轮，比我手动改行程更接近真实决策」。

- [ ] **Step 2: 在项目页渲染**

读 `src/app/(site)/projects/page.tsx`，在每条项目的描述/上下文之后加两行 mono 小标签 + 正文：

```tsx
{project.why && (
  <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
    <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.14em]">Why</span>
    {project.why}
  </p>
)}
{project.feeling && (
  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
    <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.14em]">Feeling</span>
    {project.feeling}
  </p>
)}
```

颜色只用 token；不加卡片底。

- [ ] **Step 3: 更新环境模板与部署文档**

- `.env.example`：删除 giscus 五行（Task 2 已删）；确认 `SMTP_*`、`OWNER_EMAIL`、`AUTH_SECRET`、`NEXT_PUBLIC_SITE_URL` 有注释；在 `NEXT_PUBLIC_SITE_URL` 旁写「上线必须是 https://，否则登录 cookie 不会带 Secure」。
- `README.md`：路由从 `/blog` 改 `/notes`、`/changelog` 改 `/journal`；删除 interview/guestbook/giscus 相关段落；写清 `content/notes`（10 篇）与 `content/posts`（归档 20 篇）的分工；写清 `npm run blog:sync` 现在同步的是笔记。
- `DEPLOY.md`：删除 giscus 配置；补上线前检查清单：HTTPS + `NEXT_PUBLIC_SITE_URL=https://`（构建期内联，改完必须重新构建）、反代可信 XFF、真实 SMTP 发信测试、`uploads` 命名卷可写、Docker 构建缓存清理（服务器 16G，缓存约 7.7G）；明确 2C2G 服务器不构建镜像，始终本地 `scripts/deploy.sh`。
- 不实际执行 `scripts/deploy.sh`。

- [ ] **Step 4: 门禁**

```bash
npm run type-check
npm run lint
npm test
node scripts/check-content.mjs
npm run build
```
Expected: exit 0。

- [ ] **Step 5: 提交**

```bash
git add src/config/portfolio.ts src/app/'(site)'/projects/page.tsx .env.example README.md DEPLOY.md docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md
git commit -m "docs(phase-5): 项目文案补动机与感受，部署门槛写清"
```

---

### Task 5: 阶段 5 验收与整枝收尾

**Files:**
- Modify: `docs/superpowers/plans/2026-11-08-personal-space-phase-5.md`（追加 `## 验收结果`）
- Modify: `docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md`（阶段 5 完成记录）
- Modify: `.superpowers/sdd/progress.md`（ledger，gitignored）

- [ ] **Step 1: 全套门禁**

```bash
npm run type-check
npm run lint
npm test
node scripts/check-content.mjs
npm run build
```
把测试数量、路由表、构建输出记下来。

- [ ] **Step 2: 起本地数据库、同步笔记**

沿用 `zb-check-db`。运行：

```bash
DATABASE_URL=postgres://blog:blog@localhost:5432/blog npm run blog:sync
```

验证：
- `SELECT count(*) FROM posts` = 10；
- `SELECT count(*) FROM chunks WHERE post_slug NOT IN (10 个 slug)` = 0；
- `SELECT slug, title FROM posts ORDER BY slug` 与 `content/notes` 文件名一致；
- 归档的 20 个 slug 不在 `posts`、`chunks` 里。

- [ ] **Step 3: 路由与 301 验证（生产构建）**

`npm run build` 后 `npm run start`（用 localhost，不要 127.0.0.1），逐个 `curl -sI`：
- `/blog/hello-world` → 308，`location: /notes/hello-world`；
- `/blog/agent-memory-design` → 308 `/notes/agent-memory-design`；
- `/blog/kafka-exactly-once-truth`（归档）→ 308 `/notes`；
- `/blog`、`/blog/tag/Next.js`、`/archives` → 308 `/notes`；
- `/changelog` → 308 `/journal`；
- `/guestbook` → 308 `/letters`；
- `/interview`、`/interview/bean-lifecycle` → 404（站内无链接）；
- `/notes` 200，列出 10 篇；`/notes/hello-world` 200；`/notes/kafka-exactly-once-truth` 404；
- `/journal` 200；页脚「日志」指向 `/journal`。

- [ ] **Step 4: 内容与死链检查**

- `curl /feed.xml`：条目数 = 10 + 动态数；包含 `/notes/`、`/life/`；不含 `/blog`、`/changelog`、`/guestbook`、`/interview`；XML 用解析器跑一遍。
- `curl /sitemap.xml`：包含 `/notes`、`/shelf`、`/playlist`、`/letters`、`/journal`、10 篇笔记、动态 URL；不包含旧路由。
- `curl /robots.txt`：有 `/admin`、`/write`、`/login`、`/api/` 的 disallow。
- 站内链接 grep：`rg -n 'href="/(blog|changelog|guestbook|interview|archives)|href=\{`/(blog|changelog|guestbook|interview|archives)' src/app src/components` 应为空（兼容页与 config redirect 除外）。
- 浏览器点一遍主导航四项、页脚五项、首页「写一封」、笔记列表/详情、单条动态评论、书架、歌单、后台；确认没有 404。
- 关 JS：首页、`/notes`、`/notes/hello-world` 正文可见；动态评论表单可以不工作。

- [ ] **Step 5: 清理与记录**

停 Next 进程、停 `zb-check-db`、删临时脚本。追加验收结果：
- 门禁与测试数量；
- 路由表（包含旧路由 308/404）；
- 10 篇笔记列表与保留理由；
- 数据库同步前后 posts/chunks 数量；
- RSS/sitemap 条目计数；
- 死链 grep 结果；
- 未完成项：**实际部署未执行**（本机网络、域名备案、HTTPS 证书、真实 SMTP 发信测试、反代 XFF、命名卷可写），以及上线前必须重跑 `NEXT_PUBLIC_SITE_URL=https://` 的构建；
- 分支状态：未推送、未部署、未合 main。

- [ ] **Step 6: 提交**

```bash
git add docs/superpowers/plans/2026-11-08-personal-space-phase-5.md docs/superpowers/specs/2026-11-07-personal-space-redesign-design.md
git commit -m "docs(phase-5): 验收结果——迁移、旧链接、RSS 与上线门槛"
```

---

## 自审

- **规格覆盖**：§3 删除 `/interview`；§5.5 保留 10 篇笔记与 RSS；§8 上传卷与部署；§9 全部旧内容处理；§10 阶段 5「线上没有死链，RSS 正常」；§11 死链与 RSS；§13 未决项（域名、AI 助手、terminal-palette）不擅自决定——AI 助手保留现状，`terminal-palette.tsx` 保留并只改路径。
- **无占位**：10 篇名单、路由重定向、RSS/sitemap 形状、删除清单、验收命令都具体；项目文案给的是可调整示例，不编造项目事实。
- **类型一致**：`getAllNotes/getNoteBySlug/getAdjacentNotes/getNoteTags` 在 Task 1 改名后，Task 3 的 RSS/sitemap 直接使用；`getMoments()` 的 `{ available, moments }` 沿用阶段 2 接口。
- **破坏性操作有边界**：只 `git rm` 计划列出的路由/组件/API；`content/posts` 归档、`content/interview`、数据库表全部保留。
