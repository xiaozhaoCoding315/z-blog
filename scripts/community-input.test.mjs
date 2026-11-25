import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLetterInput,
  parseCommentInput,
  parseSongInput,
  parseStatusInput,
  inferPlatform,
} from "../src/lib/community-input.ts";

function fd(entries) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

test("留言：正文去空白后 2–1000 字", () => {
  assert.equal(parseLetterInput(fd({ body: " 你好 " })).ok, true);
  assert.equal(parseLetterInput(fd({ body: "好" })).ok, false);
  assert.equal(parseLetterInput(fd({ body: "   " })).ok, false);
});

test("留言：歌曲字段要么全空，要么歌名与艺人都有", () => {
  assert.equal(parseLetterInput(fd({ body: "你好" })).ok, true);
  assert.equal(
    parseLetterInput(fd({ body: "你好", songTitle: "越难越爱" })).ok,
    false
  );
  assert.equal(
    parseLetterInput(
      fd({ body: "你好", songTitle: "越难越爱", songArtist: "吴若希" })
    ).ok,
    true
  );
});

test("留言：推荐链接只收 http(s)", () => {
  const base = { body: "你好", songTitle: "歌", songArtist: "人" };
  assert.equal(
    parseLetterInput(fd({ ...base, songUrl: "https://music.163.com/song?id=1" })).ok,
    true
  );
  assert.equal(
    parseLetterInput(fd({ ...base, songUrl: "javascript:alert(1)" })).ok,
    false
  );
});

test("评论：正文 1–500 字，目标类型只收 moment / note", () => {
  assert.equal(
    parseCommentInput(
      fd({ targetType: "moment", targetId: "5", body: "写得真好" })
    ).ok,
    true
  );
  assert.equal(
    parseCommentInput(fd({ targetType: "page", targetId: "5", body: "x" })).ok,
    false
  );
});

test("评论：moment 目标只认规范十进制，note 目标只认 slug", () => {
  assert.equal(
    parseCommentInput(fd({ targetType: "moment", targetId: "05", body: "x" })).ok,
    false
  );
  assert.equal(
    parseCommentInput(fd({ targetType: "note", targetId: "hello-world", body: "x" })).ok,
    true
  );
  assert.equal(
    parseCommentInput(fd({ targetType: "note", targetId: "../etc", body: "x" })).ok,
    false
  );
});

test("推荐歌：曲名、艺人、链接必填，推荐语可空", () => {
  const ok = { title: "越难越爱", artist: "吴若希", url: "https://music.163.com/song?id=1" };
  assert.equal(parseSongInput(fd(ok)).ok, true);
  assert.equal(parseSongInput(fd({ ...ok, url: "" })).ok, false);
  assert.equal(parseSongInput(fd({ ...ok, title: " " })).ok, false);
});

test("平台按域名推断：网易云、QQ、其他", () => {
  assert.equal(inferPlatform("https://music.163.com/song?id=1"), "netease");
  assert.equal(inferPlatform("https://y.qq.com/n/ryqq/songDetail/1"), "qq");
  assert.equal(inferPlatform("https://example.com/song"), "other");
});

test("状态句去空白后 1–40 字", () => {
  assert.equal(parseStatusInput(fd({ status: "在杭州，最近在学做饭" })).ok, true);
  assert.equal(parseStatusInput(fd({ status: "   " })).ok, false);
  assert.equal(parseStatusInput(fd({ status: "字".repeat(41) })).ok, false);
});
