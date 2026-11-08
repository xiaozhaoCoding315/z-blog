import { test } from "node:test";
import assert from "node:assert/strict";
import { parseShelfInput } from "../src/lib/community-input.ts";

function fd(entries) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

test("书架：类型只收 book / film / music", () => {
  const base = { type: "book", title: "置身事内", creator: "兰小欢" };
  assert.equal(parseShelfInput(fd(base)).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, type: "game" })).ok, false);
  assert.equal(parseShelfInput(fd({ ...base, title: " " })).ok, false);
});

test("书架：评分只能 1–5，空值表示不打分", () => {
  const base = { type: "film", title: "海街日记", creator: "是枝裕和" };
  assert.equal(parseShelfInput(fd(base)).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, rating: "5" })).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, rating: "0" })).ok, false);
  assert.equal(parseShelfInput(fd({ ...base, rating: "6" })).ok, false);
});

test("书架：封面只收 http(s) 或站内 /images 路径", () => {
  const base = { type: "music", title: "冀西南林路行", creator: "万能青年旅店" };
  assert.equal(parseShelfInput(fd({ ...base, coverUrl: "https://example.com/a.jpg" })).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, coverUrl: "/images/cover.webp" })).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, coverUrl: "javascript:alert(1)" })).ok, false);
});

test("书架：完成日期只收 YYYY-MM-DD 或空", () => {
  const base = { type: "book", title: "书", creator: "人" };
  assert.equal(parseShelfInput(fd({ ...base, finishedAt: "2026-10-31" })).ok, true);
  assert.equal(parseShelfInput(fd({ ...base, finishedAt: "2026-13-01" })).ok, false);
  assert.equal(parseShelfInput(fd({ ...base, finishedAt: "10/31" })).ok, false);
});
