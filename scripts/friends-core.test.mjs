/**
 * 友链输入校验：后台表单唯一的入口。
 *   node --test scripts/friends-core.test.mjs
 *
 * friends-core.ts 只依赖 zod；这里只喂 FormData，不碰数据库。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFriendInput } from "../src/lib/friends-core.ts";

function fd(entries) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

test("友链：完整输入去掉首尾空格，标签去重", () => {
  const result = parseFriendInput(
    fd({
      name: " 小站 ",
      url: "  https://example.com  ",
      description: " 一个站点 ",
      avatar: "/images/friends/a.png",
      tags: " 设计，独立开发, 设计 ",
    })
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    name: "小站",
    url: "https://example.com",
    description: "一个站点",
    avatar: "/images/friends/a.png",
    tags: ["设计", "独立开发"],
  });
});

test("友链：站点名必填，按字符数限 40", () => {
  assert.equal(parseFriendInput(fd({})).ok, false);
  assert.equal(parseFriendInput(fd({ name: "   " })).ok, false);
  assert.equal(
    parseFriendInput(fd({ name: "站".repeat(40), url: "https://a.dev" })).ok,
    true
  );
  assert.equal(
    parseFriendInput(fd({ name: "站".repeat(41), url: "https://a.dev" })).ok,
    false
  );
  assert.equal(
    parseFriendInput(fd({ name: "🌊".repeat(40), url: "https://a.dev" })).ok,
    true
  );
});

test("友链：链接只接受 http(s)", () => {
  const valid = parseFriendInput(
    fd({ name: "站点", url: "http://example.com/path" })
  );
  assert.equal(valid.ok, true);

  for (const url of [
    "javascript:alert(1)",
    "ftp://example.com",
    "//example.com",
    "/relative",
    "not a url",
    "",
  ]) {
    assert.equal(
      parseFriendInput(fd({ name: "站点", url })).ok,
      false,
      `${url || "空链接"} 不应通过`
    );
  }
});

test("友链：介绍最多 160 字", () => {
  const base = { name: "站点", url: "https://example.com" };
  assert.equal(
    parseFriendInput(fd({ ...base, description: "字".repeat(160) })).ok,
    true
  );
  assert.equal(
    parseFriendInput(fd({ ...base, description: "字".repeat(161) })).ok,
    false
  );
});

test("友链：头像可留空，只接受 http(s) 或站内绝对路径", () => {
  const base = { name: "站点", url: "https://example.com" };

  assert.equal(parseFriendInput(fd(base)).value.avatar, null);
  assert.equal(
    parseFriendInput(fd({ ...base, avatar: "https://cdn.example.com/a.webp" }))
      .value.avatar,
    "https://cdn.example.com/a.webp"
  );
  assert.equal(
    parseFriendInput(fd({ ...base, avatar: "/media/a.webp" })).value.avatar,
    "/media/a.webp"
  );

  for (const avatar of [
    "//evil.example/a.png",
    "data:image/png;base64,AAAA",
    "media/a.png",
  ]) {
    assert.equal(
      parseFriendInput(fd({ ...base, avatar })).ok,
      false,
      `${avatar} 不应通过`
    );
  }
});

test("友链：标签最多 3 个，单个最多 12 字", () => {
  const base = { name: "站点", url: "https://example.com" };

  assert.deepEqual(parseFriendInput(fd(base)).value.tags, []);
  assert.equal(
    parseFriendInput(fd({ ...base, tags: "一,二,三" })).value.tags.length,
    3
  );
  assert.equal(parseFriendInput(fd({ ...base, tags: "一,二,三,四" })).ok, false);
  assert.equal(
    parseFriendInput(fd({ ...base, tags: "字".repeat(12) })).ok,
    true
  );
  assert.equal(
    parseFriendInput(fd({ ...base, tags: "字".repeat(13) })).ok,
    false
  );
  assert.equal(
    parseFriendInput(fd({ ...base, tags: "🌊".repeat(12) })).ok,
    true
  );
});