/**
 * 数据库行 → 生活流条目的映射。
 *   node --test scripts/moment-core.test.mjs
 *
 * moment-core.ts 只有 import type，node 能把类型导入擦掉直接跑。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isMomentKind,
  parseMomentId,
  toMoment,
} from "../src/lib/moment-core.ts";

const row = (over = {}) => ({
  id: 7,
  kind: "text",
  body: "降温了。",
  images: [],
  mood: null,
  weather: null,
  place: null,
  card: null,
  publishedAt: new Date("2026-11-05T13:40:00.000Z"),
  createdAt: new Date("2026-11-05T13:40:00.000Z"),
  ...over,
});

test("kind 白名单只认设计文档里的六种", () => {
  for (const k of ["text", "photo", "song", "shelf", "quote", "link"]) {
    assert.equal(isMomentKind(k), true);
  }
  for (const bad of ["", "Text", "video", null, 3]) {
    assert.equal(isMomentKind(bad), false);
  }
});

test("未知 kind 退成短记，不抛错也不丢内容", () => {
  const m = toMoment(row({ kind: "video" }));
  assert.equal(m.kind, "text");
  assert.equal(m.body, "降温了。");
});

test("id 转字符串，时间转 ISO，空串字段直接不出现", () => {
  const m = toMoment(row({ mood: "  ", place: "杭州" }));
  assert.equal(m.id, "7");
  assert.equal(m.publishedAt, "2026-11-05T13:40:00.000Z");
  assert.equal(m.place, "杭州");
  assert.equal("mood" in m, false, "空白心情不该渲染成一个空的分隔符");
});

test("images 只留 /media/ 开头的路径", () => {
  const m = toMoment(
    row({ kind: "photo", images: ["/media/2026/11/a.webp", "https://evil/x.png", 3] })
  );
  assert.deepEqual(m.images, ["/media/2026/11/a.webp"]);
});

test("tags 非空才赋字段，空数组与缺省都不出现", () => {
  const tagged = toMoment(row({ tags: ["杭州", "雨天"] }));
  assert.deepEqual(tagged.tags, ["杭州", "雨天"]);

  const empty = toMoment(row({ tags: [] }));
  assert.equal(empty.tags, undefined);
  assert.equal("tags" in empty, false);

  const legacy = toMoment(row());
  assert.equal(legacy.tags, undefined);
  assert.equal("tags" in legacy, false);
});

test("card 只有四类形态才带，且字段必须齐", () => {
  const card = { title: "Merry Christmas Mr. Lawrence", meta: "坂本龍一" };
  assert.ok(toMoment(row({ kind: "song", card })).card);
  assert.equal(toMoment(row({ kind: "text", card })).card, undefined);
  assert.equal(toMoment(row({ kind: "song", card: { title: "x" } })).card, undefined);
});

test("parseMomentId 接受规范十进制", () => {
  assert.equal(parseMomentId("1"), 1);
  assert.equal(parseMomentId("999"), 999);
  assert.equal(parseMomentId("9007199254740991"), 9007199254740991);
});

test("parseMomentId 拒绝别名、溢出和非数字", () => {
  for (const bad of [
    "0",
    "-1",
    "1.0",
    "01",
    "0x10",
    "1e3",
    " 1",
    "1 ",
    "9007199254740993",
    "12345678901234567",
    "abc",
    "",
  ]) {
    assert.equal(parseMomentId(bad), null, `${JSON.stringify(bad)} 不该被当成 id`);
  }
});

test("没有正文也没有图片的条目仍然映射，不在这里做业务裁剪", () => {
  const m = toMoment(
    row({ kind: "quote", body: "", card: { title: "一句话", meta: "出处" } })
  );
  assert.equal(m.body, "");
  assert.equal(m.card.title, "一句话");
});
