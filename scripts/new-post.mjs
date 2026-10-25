/**
 * 新文章脚手架：npm run new -- "文章标题" [slug]
 * 生成 content/posts/<slug>.mdx 模板（date 自动填今天），写完 npm run deploy 发布。
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

const [, , titleArg, slugArg] = process.argv;

if (!titleArg) {
  console.log('用法：npm run new -- "文章标题" [英文slug]');
  console.log('示例：npm run new -- "我的第一篇随笔" my-first-post');
  process.exit(0);
}

const today = new Date().toISOString().slice(0, 10);
const slug =
  slugArg && /^[a-z0-9-]+$/.test(slugArg)
    ? slugArg
    : `post-${today}-${Math.random().toString(36).slice(2, 6)}`;

const filepath = path.join(process.cwd(), "content", "posts", `${slug}.mdx`);
if (fs.existsSync(filepath)) {
  console.error(`已存在同名文章：${filepath}`);
  process.exit(1);
}

const template = `---
title: ${titleArg}
date: ${today}
description: 一句话摘要（建议手写；留空则发布同步时由 AI 自动生成）
tags: []
pinned: false
draft: false
---

## 开始写吧

从这里开始正文。支持全部 Markdown 语法，试试这些：

- 行内代码：\`const a = 1\`
- [链接](https://example.com)、**加粗**、> 引用

代码块支持文件名和行高亮：

\`\`\`ts title="demo.ts" {2}
const hello = "world";
console.log(hello); // 这一行会高亮
\`\`\`

提示框组件：

<Callout type="tip" title="小提示">MDX 里可以直接用组件。</Callout>

写完保存 → \`npm run dev\` 本地预览 → \`npm run deploy\` 一键发布上线。
`;

fs.mkdirSync(path.dirname(filepath), { recursive: true });
fs.writeFileSync(filepath, template, "utf-8");
console.log(`✅ 已创建：content/posts/${slug}.mdx`);
console.log(`   本地预览：npm run dev 后打开 http://localhost:3000/blog/${slug}`);
console.log("   发布上线：npm run deploy");
void readline;
