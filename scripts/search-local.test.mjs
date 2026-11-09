import test from "node:test";
import assert from "node:assert/strict";
import {
  filterLocalApps,
  filterLocalNotes,
  filterLocalSnippets,
  mergeNoteHits,
} from "../src/components/search/search-local.ts";

const apps = [
  { id: "terminal", title: "终端", keywords: ["shell", "zsh"] },
  { id: "life", title: "每日日志", keywords: ["动态", "moment"] },
  { id: "gallery", title: "生活胶囊", keywords: ["照片", "photo"] },
  { id: "projects", title: "项目看板", keywords: ["kanban"] },
  { id: "snippets", title: "代码片段", keywords: ["code"] },
  { id: "about", title: "关于本机", keywords: ["info"] },
  { id: "notes", title: "笔记", keywords: ["blog", "posts"] },
];

const notes = [
  { slug: "rag-notes", title: "RAG 笔记", tags: ["AI", "检索"] },
  { slug: "frontend", title: "前端日志", tags: ["前端", "css"] },
  { slug: "next-16", title: "Next 16 笔记", tags: ["Next"] },
];

const snippets = [
  {
    id: "window-reducer",
    title: "窗口矩形收敛",
    language: "ts",
    tags: ["desktop", "window"],
  },
  {
    id: "semantic-search",
    title: "语义搜索去重",
    language: "sql",
    tags: ["postgres", "pgvector"],
  },
  {
    id: "tag-parse",
    title: "标签输入解析",
    language: "ts",
    tags: ["life", "tags"],
  },
  {
    id: "commit-count",
    title: "提交按天聚合",
    language: "ts",
    tags: ["github"],
  },
  {
    id: "moment-id",
    title: "动态 id 校验",
    language: "ts",
    tags: ["life"],
  },
  {
    id: "rate-limit",
    title: "滑动窗口限频",
    language: "ts",
    tags: ["api"],
  },
  {
    id: "extra",
    title: "第七条",
    language: "ts",
    tags: [],
  },
];

test("空查询时应用列表只截前 6 条", () => {
  assert.equal(filterLocalApps(apps, "   ").length, 6);
});

test("应用可按 id、名称与关键词匹配，大小写不敏感", () => {
  assert.deepEqual(
    filterLocalApps(apps, "ZSH").map((app) => app.id),
    ["terminal"]
  );
  assert.deepEqual(
    filterLocalApps(apps, "后端不匹配").map((app) => app.id),
    []
  );
  assert.deepEqual(
    filterLocalApps(apps, "kanban").map((app) => app.id),
    ["projects"]
  );
  assert.deepEqual(
    filterLocalApps(apps, "笔记").map((app) => app.id),
    ["notes"]
  );
});

test("笔记按标题或标签过滤，空查询只截前 6 条", () => {
  assert.equal(filterLocalNotes(notes, "").length, 3);
  assert.deepEqual(
    filterLocalNotes(notes, "ai").map((note) => note.slug),
    ["rag-notes"]
  );
  assert.deepEqual(
    filterLocalNotes(notes, "前端").map((note) => note.slug),
    ["frontend"]
  );
  assert.deepEqual(filterLocalNotes(notes, "不存在"), []);
});

test("片段按 id、标题、语言或标签过滤，大小写不敏感", () => {
  assert.deepEqual(
    filterLocalSnippets(snippets, "WINDOW-REDUCER").map((item) => item.id),
    ["window-reducer"]
  );
  assert.deepEqual(
    filterLocalSnippets(snippets, "语义").map((item) => item.id),
    ["semantic-search"]
  );
  assert.deepEqual(
    filterLocalSnippets(snippets, "sql").map((item) => item.id),
    ["semantic-search"]
  );
  assert.deepEqual(
    filterLocalSnippets(snippets, "github").map((item) => item.id),
    ["commit-count"]
  );
  assert.deepEqual(filterLocalSnippets(snippets, "不存在"), []);
});

test("片段空查询只截前 6 条", () => {
  assert.equal(filterLocalSnippets(snippets, "   ").length, 6);
  assert.equal(filterLocalSnippets(snippets, "   ")[0].id, "window-reducer");
});

test("语义命中补在本地命中之后并按 slug 去重", () => {
  const merged = mergeNoteHits(
    [notes[0]],
    [
      { post_slug: "rag-notes", title: "RAG 笔记（语义）", heading: null, snippet: "重复" },
      { post_slug: "next-16", title: "Next 16 笔记", heading: "缓存", snippet: "片段" },
    ],
    notes
  );
  assert.deepEqual(
    merged.map((note) => note.slug),
    ["rag-notes", "next-16"]
  );
  assert.equal(merged[0].title, "RAG 笔记");
  assert.deepEqual(merged[1].tags, ["Next"]);
  assert.equal(merged[1].detail, "缓存");
});

test("语义命中没有 heading 时用 snippet 补 detail，空 slug 被忽略", () => {
  const merged = mergeNoteHits(
    [],
    [
      { post_slug: "shelf", title: "书架", heading: null, snippet: "读过的书" },
      { post_slug: "", title: "坏数据", heading: null, snippet: "x" },
    ],
    []
  );
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].tags, []);
  assert.equal(merged[0].detail, "读过的书");
});
