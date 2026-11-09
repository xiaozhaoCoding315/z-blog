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
    id: "next-connection",
    title: "Next 16：数据库页面别把空数据烤进静态壳",
    language: "tsx",
    tags: ["next", "cache-components"],
  },
  {
    id: "clock-store",
    title: "useSyncExternalStore 版站内时钟",
    language: "ts",
    tags: ["react", "clock"],
  },
  {
    id: "spine-scroll",
    title: "滚动驱动的脊线：CSS animation-timeline",
    language: "css",
    tags: ["css", "scroll"],
  },
  {
    id: "pgvector-hnsw",
    title: "Drizzle + pgvector：HNSW 余弦索引",
    language: "sql",
    tags: ["postgres", "pgvector"],
  },
  {
    id: "token-contrast",
    title: "设计 token 的 WCAG 护栏",
    language: "js",
    tags: ["a11y", "css"],
  },
  {
    id: "ai-citations",
    title: "AI SDK：把引用来源随流下发",
    language: "ts",
    tags: ["ai-sdk", "rag"],
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
    filterLocalSnippets(snippets, "NEXT-CONNECTION").map((item) => item.id),
    ["next-connection"]
  );
  assert.deepEqual(
    filterLocalSnippets(snippets, "站内时钟").map((item) => item.id),
    ["clock-store"]
  );
  assert.deepEqual(
    filterLocalSnippets(snippets, "sql").map((item) => item.id),
    ["pgvector-hnsw"]
  );
  assert.deepEqual(
    filterLocalSnippets(snippets, "rag").map((item) => item.id),
    ["ai-citations"]
  );
  assert.deepEqual(filterLocalSnippets(snippets, "不存在"), []);
});

test("片段空查询只截前 6 条", () => {
  assert.equal(filterLocalSnippets(snippets, "   ").length, 6);
  assert.equal(filterLocalSnippets(snippets, "   ")[0].id, "next-connection");
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
