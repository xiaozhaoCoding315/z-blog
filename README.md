# Z·Blog — 全栈 AI 博客

一个**深色科技风**的全栈个人博客：MDX 内容系统 + pgvector 语义搜索 + RAG 智能问答 + Docker 一键部署。博客本身就是一个全栈 / AI 应用开发的作品集项目。

![stack](https://img.shields.io/badge/Next.js-16-black) ![react](https://img.shields.io/badge/React-19-blue) ![db](https://img.shields.io/badge/PostgreSQL-17%20%2B%20pgvector-336791) ![docker](https://img.shields.io/badge/Docker-Compose-2496ED)

## 功能特性

**内容系统**
- MDX 写作（Markdown + 组件），Git 即版本管理，`git pull` 即发布
- 文章静态生成（SEO 友好、秒开），Shiki 双主题代码高亮 + 行高亮 + 复制按钮
- 阅读进度条、目录 TOC 滚动高亮、上下篇、标签筛选、草稿支持
- RSS / Sitemap / 动态 OG 分享卡片 / JSON-LD 结构化数据
- Giscus 评论（GitHub Discussions）、自建浏览量统计

**AI 能力**（智谱 GLM，OpenAI 兼容协议，可一键换供应商）
- **RAG 问答助手**：右下角悬浮窗，基于全站文章流式回答，回答带 `[1][2]` 引用溯源，点击直达原文锚点
- **语义搜索**：`⌘K / Ctrl K` 唤起，向量检索命中「意思相近」的内容（搜「上线」找到「部署」）
- **AI 自动摘要**：frontmatter 缺 description 的文章，同步时自动生成摘要
- **向量相关文章**：摘要向量预计算相似度，文章页零开销推荐

**工程化**
- 内容同步引擎：SHA-256 内容哈希增量同步，容器启动自动执行
- 优雅降级：未配置 AI key / 数据库不可用时站点照常运行
- Docker Compose 一键编排（app + PostgreSQL/pgvector），多阶段构建，standalone 产物
- 服务器部署见 [DEPLOY.md](./DEPLOY.md)

## 技术栈

Next.js 16 (App Router) · React 19 · TypeScript · TailwindCSS v4 · shadcn/ui · framer-motion · PostgreSQL + pgvector · Drizzle ORM · Vercel AI SDK v7 · Docker

## 本地开发

前置要求：Node 20+、Docker（跑数据库）

```bash
# 1. 安装依赖
npm install

# 2. 起数据库（本地暴露 5432）
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

# 3. 配置环境变量
cp .env.example .env   # 本地开发可保持默认值；AI key 可后填

# 4. 同步内容到数据库（建表 + 文章元数据/向量）
npm run blog:sync

# 5. 启动
npm run dev
```

打开 <http://localhost:3000>。

> 配置了 `AI_API_KEY` 后重新运行 `npm run blog:sync [-- --force]` 可生成向量与 AI 摘要。

## 写新文章并发布（两条命令）

```bash
# 1. 生成文章模板（自动填日期，给出预览地址）
npm run new -- "我的新文章标题" my-new-post

# 2. 写完 content/posts/my-new-post.mdx 后，本地预览（可选）
npm run dev   # 打开 http://localhost:3000/blog/my-new-post

# 3. 一键发布上线（本地构建镜像→上传→滚动更新，新文章自动同步+向量化）
npm run deploy
```

发布脚本：`scripts/deploy.sh`（可用 `DEPLOY_HOST`/`DEPLOY_DIR` 环境变量改目标）。
文章模板：`scripts/new-post.mjs`。

### 手动建文章

在 `content/posts/` 新建 `xxx.mdx`：

```mdx
---
title: 文章标题
date: 2026-10-25
description: 一句话摘要（可留空，同步时 AI 自动生成）
tags: [标签1, 标签2]
pinned: false
draft: false
---

正文，支持所有 Markdown 语法 + MDX 组件：

<Callout type="tip" title="提示">高亮提示框</Callout>
```

代码块支持语言标注、文件名和行高亮：

````mdx
```ts title="src/xx.ts" {3}
const a = 1;        // 普通行
const b = 2;        // 这一行会高亮
```
````

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建（standalone） |
| `npm run blog:sync` | 增量同步内容到数据库（`--force` 全量重建向量） |
| `npm run db:push` | Drizzle 推送 schema 变更（一般不需要，sync 自带建表） |
| `npm run db:studio` | 数据库可视化管理 |

## 目录结构

```
content/posts/        # 文章（MDX）
src/app/              # 页面与 API 路由
src/components/       # UI 组件（chat / search / blog / site / mdx）
src/lib/              # 内容层、分块、同步引擎、AI 封装
src/db/               # Drizzle schema 与客户端
src/config/           # 站点配置（site.ts / portfolio.ts）—— 改这里即可定制
scripts/              # 同步 CLI 与 Docker entrypoint
```

## 环境变量

见 [.env.example](./env.example)，关键项：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `AI_API_KEY` | 智谱 API key（[免费注册](https://open.bigmodel.cn)），留空则 AI 功能降级 |
| `CHAT_MODEL` / `EMBEDDING_MODEL` | 默认 `glm-4.6` / `embedding-3` |
| `NEXT_PUBLIC_SITE_URL` | 站点地址（部署后改为 `http://服务器IP`） |
| `NEXT_PUBLIC_GISCUS_*` | 评论配置，见 DEPLOY.md |

## 部署

见 [DEPLOY.md](./DEPLOY.md) —— 从裸服务器初始化到一键部署的完整流程。
