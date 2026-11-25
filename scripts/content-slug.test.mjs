/**
 * 笔记 slug 白名单。
 *   node --test scripts/content-slug.test.mjs
 *
 * 动态段会把 %2F 解码成 /，所以必须在拼路径前先拒绝，不能只做字符串替换。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidNoteSlug, getRawNote } from "../src/lib/content-core.ts";

test("合法 slug：小写字母数字，单个连字符分段", () => {
  assert.equal(isValidNoteSlug("hello-world"), true);
  assert.equal(isValidNoteSlug("2g-server-oom-lessons"), true);
});

test("拒绝路径穿越、编码穿越、斜杠、大写与空串", () => {
  for (const bad of [
    "../posts/kafka-exactly-once-truth",
    "..%2Fposts%2Fkafka-exactly-once-truth",
    "hello/world",
    "Hello",
    "",
  ]) {
    assert.equal(isValidNoteSlug(bad), false, `${JSON.stringify(bad)} 不该通过`);
  }
});

test("getRawNote 不读取 notes 目录之外的文件", () => {
  assert.equal(getRawNote("../posts/kafka-exactly-once-truth"), null);
});
