/**
 * 单曲分享文案识别：能从整段分享里拿到曲名、艺人与链接，认不出就明说。
 *   node --test scripts/song-share.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSongShareText,
  platformOf,
  shareKindOf,
} from "../src/lib/song-share.ts";

test("网易云单曲分享：曲名、艺人、单曲链接都取出来", () => {
  const result = parseSongShareText(
    "分享吴若希的单曲《越难越爱》: https://music.163.com/song?id=287183 (来自@网易云音乐)"
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, "song");
  assert.equal(result.value.platform, "netease");
  assert.equal(result.value.title, "越难越爱");
  assert.equal(result.value.artist, "吴若希");
  assert.equal(result.value.url, "https://music.163.com/song?id=287183");
});

test("QQ 音乐单曲分享：用《》后面的短横线取艺人", () => {
  const result = parseSongShareText(
    "《夜航西飞》 - 陈鸿宇 https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV"
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, "song");
  assert.equal(result.value.platform, "qq");
  assert.equal(result.value.title, "夜航西飞");
  assert.equal(result.value.artist, "陈鸿宇");
});

test("歌单链接被认成 playlist，交给歌单入口处理", () => {
  const result = parseSongShareText(
    "分享歌单《夜航西飞》https://music.163.com/playlist?id=24381616（来自网易云音乐）"
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, "playlist");
  assert.equal(result.value.title, "夜航西飞");
  assert.equal(result.value.artist, null);
});

test("认不出曲名也保留链接，交给访客补字段", () => {
  const result = parseSongShareText("https://music.163.com/song?id=287183");
  assert.equal(result.ok, true);
  assert.equal(result.value.kind, "song");
  assert.equal(result.value.title, null);
  assert.equal(result.value.artist, null);
});

test("没有链接、空输入、超长输入都明确报错", () => {
  assert.equal(parseSongShareText("").ok, false);
  assert.equal(parseSongShareText("   ").ok, false);
  assert.equal(parseSongShareText("只有歌名没有链接").ok, false);
  assert.equal(parseSongShareText("x".repeat(1001)).ok, false);
});

test("平台与链接类型按域名和路径判断，第三方站点不冒充", () => {
  assert.equal(platformOf("https://music.163.com/song?id=1"), "netease");
  assert.equal(platformOf("https://y.qq.com/n/ryqq/songDetail/abc"), "qq");
  assert.equal(platformOf("https://example.com/song"), "other");
  assert.equal(platformOf("不是链接"), "other");

  assert.equal(shareKindOf("https://music.163.com/#/song?id=1"), "song");
  assert.equal(shareKindOf("https://music.163.com/playlist?id=1"), "playlist");
  assert.equal(shareKindOf("https://y.qq.com/n/ryqq/taoge/7707261125"), "playlist");
  assert.equal(shareKindOf("https://163cn.tv/abc"), "unknown");
  assert.equal(shareKindOf("nonsense"), "unknown");
});
