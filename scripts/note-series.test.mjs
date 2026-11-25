/**
 * 笔记系列：series + order 决定导轨顺序，缺 order 的笔记不进系列。
 *   node --test scripts/note-series.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  groupNotesBySeries,
  noteMetaSchema,
} from "../src/lib/content-core.ts";

function note(slug, date, meta) {
  return { slug, meta: { ...meta, date }, content: "", readingMinutes: 1 };
}

test("系列按 order 排，不按日期排", () => {
  const groups = groupNotesBySeries([
    note("c", "2026-01-01", { series: "线 A", order: 3 }),
    note("a", "2026-09-01", { series: "线 A", order: 1 }),
    note("b", "2026-05-01", { series: "线 A", order: 2 }),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].notes.map((n) => n.slug),
    ["a", "b", "c"]
  );
});

test("同一 order 用日期兜底，顺序稳定", () => {
  const groups = groupNotesBySeries([
    note("late", "2026-08-01", { series: "线", order: 1 }),
    note("early", "2026-02-01", { series: "线", order: 1 }),
  ]);
  assert.deepEqual(
    groups[0].notes.map((n) => n.slug),
    ["early", "late"]
  );
});

test("没写 order 或没写 series 的笔记不进系列", () => {
  const groups = groupNotesBySeries([
    note("no-order", "2026-01-01", { series: "线" }),
    note("no-series", "2026-01-01", { order: 1 }),
    note("plain", "2026-01-01", {}),
    note("ok", "2026-01-01", { series: "线", order: 1 }),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0].notes.map((n) => n.slug),
    ["ok"]
  );
});

test("frontmatter 里 series/order 可选，空串与空白视为未写", () => {
  const base = { title: "标题", date: "2026-01-01" };
  assert.equal(noteMetaSchema.parse(base).series, undefined);
  assert.equal(noteMetaSchema.parse({ ...base, series: "  " }).series, undefined);
  assert.equal(
    noteMetaSchema.parse({ ...base, series: " 线 " }).series,
    "线"
  );
  assert.equal(noteMetaSchema.parse({ ...base, order: 2 }).order, 2);
  // 0 与负数不是合法顺序：从 1 开始
  assert.equal(noteMetaSchema.safeParse({ ...base, order: 0 }).success, false);
  assert.equal(noteMetaSchema.safeParse({ ...base, order: -1 }).success, false);
});

test("每条已发布的阅读线都有导读页可列", () => {
  const start = readFileSync(
    new URL("../src/app/(site)/(apps)/notes/start/page.tsx", import.meta.url),
    "utf8"
  );
  assert.match(start, /getNoteSeries\(\)/);
  assert.match(start, /notes-start-item/);
  // 导读页不能只是目录：每条线要有一句「读它能得到什么」
  assert.match(start, /SERIES_NOTES/);
});
