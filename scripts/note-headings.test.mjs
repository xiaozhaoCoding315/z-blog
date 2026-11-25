/**
 * 笔记目录锚点：必须和正文 rehype-slug 生成的 id 完全一致。
 *   node --test scripts/note-headings.test.mjs
 *
 * 旧实现对下划线、重复标题和部分标点的处理与 GitHub slugger 不同，
 * 目录点过去会落到错误标题或原地不动。这里直接拿库函数当对照。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { slug } from "github-slugger";
import { extractHeadings } from "../src/lib/content-core.ts";
import { githubSlug } from "../src/lib/slug.ts";

test("重复标题按出现顺序加后缀，和 rehype-slug 一致", () => {
  const headings = extractHeadings(
    "## 部署\n\n## 部署\n\n### 部署\n\n## 部署-1\n"
  );
  assert.deepEqual(
    headings.map((heading) => heading.id),
    ["部署", "部署-1", "部署-2", "部署-1-1"]
  );
});

test("下划线、加号、斜杠等符号按 GitHub 规则归一", () => {
  for (const text of ["a_b 测试", "C++ / Next.js", "2G Server: OOM?"]) {
    assert.equal(githubSlug(text), slug(text), text);
  }
  assert.deepEqual(
    extractHeadings("## a_b 测试\n## C++ / Next.js\n").map(
      (heading) => heading.id
    ),
    [slug("a_b 测试"), slug("C++ / Next.js")]
  );
});

test("代码块里的井号不是标题，行内代码与链接只取文字", () => {
  const headings = extractHeadings(
    "```md\n## 代码里的标题\n```\n\n## `use cache` 与 [链接](/notes/x)\n"
  );
  assert.equal(headings.length, 1);
  assert.equal(headings[0].text, "use cache 与 链接");
  assert.equal(headings[0].id, slug("use cache 与 链接"));
});