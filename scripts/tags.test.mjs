import test from "node:test";
import assert from "node:assert/strict";
import {
  collectTags,
  filterByTags,
  parseTagInput,
  readTags,
} from "../src/lib/tags.ts";

test("parseTagInput：空格/逗号/# 前缀，去重保序", () => {
  assert.deepEqual(parseTagInput("#杭州, 雨天 杭州，咖啡").tags, ["杭州", "雨天", "咖啡"]);
});

test("parseTagInput：最多 5 个，单个最多 16 字素", () => {
  assert.equal(parseTagInput("a b c d e f").ok, false);
  assert.equal(parseTagInput("字".repeat(17)).ok, false);
  assert.equal(parseTagInput("👨‍💻".repeat(16)).ok, true);
});

test("parseTagInput：空输入是合法空数组", () => {
  assert.deepEqual(parseTagInput("  ,  # ").tags, []);
});

test("readTags：丢弃非字符串、超长、# 前缀，截到 5 个", () => {
  assert.deepEqual(
    readTags(["#杭州", "杭州", 3, "字".repeat(17), "a", "b", "c", "d"]),
    ["杭州", "a", "b", "c", "d"]
  );
  assert.deepEqual(readTags(null), []);
});

test("filterByTags：多标签 AND", () => {
  const moments = [
    { id: "1", tags: ["杭州", "雨天"] },
    { id: "2", tags: ["杭州"] },
    { id: "3", tags: [] },
  ];
  assert.deepEqual(filterByTags(moments, ["杭州", "雨天"]).map((m) => m.id), ["1"]);
  assert.equal(filterByTags(moments, []).length, 3);
});

test("collectTags：按次数降序，次数相同按中文排序", () => {
  const moments = [
    { id: "1", tags: ["杭州", "雨天"] },
    { id: "2", tags: ["杭州", "咖啡"] },
    { id: "3", tags: ["咖啡"] },
  ];
  assert.deepEqual(collectTags(moments), [
    { tag: "杭州", count: 2 },
    { tag: "咖啡", count: 2 },
    { tag: "雨天", count: 1 },
  ]);
});
