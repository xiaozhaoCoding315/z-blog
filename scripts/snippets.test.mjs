import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { snippets } from "../src/config/snippets.ts";

const EXPECTED = [
  ["next-connection", "Next 16：数据库页面别把空数据烤进静态壳"],
  ["clock-store", "useSyncExternalStore 版站内时钟"],
  ["spine-scroll", "滚动驱动的脊线：CSS animation-timeline"],
  ["pgvector-hnsw", "Drizzle + pgvector：HNSW 余弦索引"],
  ["token-contrast", "设计 token 的 WCAG 护栏"],
  ["ai-citations", "AI SDK：把引用来源随流下发"],
];

test("首版正好 6 条，id/title 严格匹配设计文档 §6.6", () => {
  assert.equal(snippets.length, 6);
  assert.deepEqual(
    snippets.map((snippet) => [snippet.id, snippet.title]),
    EXPECTED
  );
  assert.equal(new Set(snippets.map((s) => s.id)).size, 6);
});

test("每条都有 useCase、语言、标签、非空代码与来源", () => {
  for (const snippet of snippets) {
    assert.ok(snippet.useCase.length > 0, `${snippet.id} useCase`);
    assert.ok(snippet.language.length > 0, `${snippet.id} language`);
    assert.ok(snippet.tags.length > 0, `${snippet.id} tags`);
    assert.ok(snippet.code.trim().length > 0, `${snippet.id} code`);
    assert.match(
      snippet.source ?? "",
      /^(src|scripts)\/|^src\/app\/|^scripts\//,
      `${snippet.id} source`
    );
  }
});

test("代码包含六处本仓库真实实现的关键片段", () => {
  const byId = new Map(snippets.map((snippet) => [snippet.id, snippet.code]));
  assert.match(byId.get("next-connection"), /await connection\(\)/);
  assert.match(byId.get("clock-store"), /useSyncExternalStore\(/);
  assert.match(byId.get("spine-scroll"), /animation-timeline: scroll\(nearest block\)/);
  assert.match(byId.get("pgvector-hnsw"), /USING hnsw \(embedding vector_cosine_ops\)/);
  assert.match(byId.get("token-contrast"), /assert\.ok\(ratio >= 7/);
  assert.match(byId.get("ai-citations"), /writer\.write\(\{ type: "data-sources"/);
});

test("摘录确实能在被指认的源文件里找到（不编造示例）", () => {
  const realSignatures = {
    "next-connection": ["src/app/(site)/(apps)/login/page.tsx", "await connection()"],
    "clock-store": ["src/components/desktop/clock-store.ts", "useSyncExternalStore("],
    "spine-scroll": ["src/app/globals.css", "animation-timeline: scroll(nearest block)"],
    "pgvector-hnsw": ["src/db/client.ts", "vector_cosine_ops"],
    "token-contrast": ["scripts/tokens.test.mjs", "assert.ok(ratio >= 7"],
    "ai-citations": ["src/app/api/chat/route.ts", 'type: "data-sources"'],
  };
  for (const [id, [file, signature]] of Object.entries(realSignatures)) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(signature), `${id}: ${file} 缺少 ${signature}`);
    assert.ok(snippets.find((s) => s.id === id)?.code.includes(signature), `${id} 摘录`);
  }
});

test("每条摘录的连续行都能在被指认的源码里找到", () => {
  for (const snippet of snippets) {
    const [file] = (snippet.source ?? "").split(":");
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const rows = snippet.code.split("\n").filter(
      (row) => row.trim() && row.trim() !== "// ..."
    );
    for (const row of rows) {
      assert.ok(
        source.includes(row),
        `${snippet.id}: ${file} 缺少逐字摘录行 ${row}`
      );
    }
  }
});
