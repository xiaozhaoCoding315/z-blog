/**
 * 歌词解析：时间轴、制作人信息过滤、翻译合并、高潮段落识别。
 *   node --test scripts/lyrics-core.test.mjs
 *
 * 歌词来源是网易云公开 LRC 接口，格式没有承诺：时间戳有两位也有三位小数、
 * 一行可带多个时间戳、翻译单独一份 LRC。这里把可用性和“高潮段”判断固定下来。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildLyrics, sectionAt } from "../src/lib/lyrics-core.ts";

test("解析时间轴：多时间戳、两种毫秒位、乱入行都接住并排序", () => {
  const lrc = [
    "[00:21.02]这首歌写给你听",
    "[00:22.64][01:00.00]我想请你闭上眼睛",
    "[00:25.280]这首可能不太动听",
    "这不是时间戳行",
    "[00:30]整秒也能解析",
  ].join("\n");

  const parsed = buildLyrics(lrc);
  assert.deepEqual(
    parsed.lines.map((line) => [line.time, line.text]),
    [
      [21.02, "这首歌写给你听"],
      [22.64, "我想请你闭上眼睛"],
      [25.28, "这首可能不太动听"],
      [30, "整秒也能解析"],
      [60, "我想请你闭上眼睛"],
    ]
  );
  assert.deepEqual(parsed.credits, []);
});

test("制作信息从正文里拿掉，作为 credits 保留", () => {
  const lrc = [
    "[00:00.00] 作词 : G.G(张思源）",
    "[00:01.00] 作曲 : G.G(张思源）",
    "[00:05.12]编曲：刘羽晟",
    "[00:06.00][by:歌词搬运工]",
    "[00:21.02]这首歌写给你听",
    "[00:22.64]我想请你闭上眼睛",
    "[00:30.00]制作人 : 某人",
  ].join("\n");

  const parsed = buildLyrics(lrc);
  assert.deepEqual(parsed.lines.map((line) => line.text), [
    "这首歌写给你听",
    "我想请你闭上眼睛",
  ]);
  assert.deepEqual(parsed.credits, [
    "作词 : G.G(张思源）",
    "作曲 : G.G(张思源）",
    "编曲：刘羽晟",
    "制作人 : 某人",
  ]);
});

test("翻译按时间轴合并；与原文相同的翻译不重复显示", () => {
  const lrc = [
    "[00:39.390]you are so beautiful",
    "[00:44.430]沉鱼落雁",
  ].join("\n");
  const translation = [
    "[by:aiPlumai]",
    "[00:39.390]你是如此美丽",
    "[00:44.430]沉鱼落雁",
  ].join("\n");

  const parsed = buildLyrics(lrc, translation);
  assert.equal(parsed.lines[0].translation, "你是如此美丽");
  assert.equal(parsed.lines[1].translation, null);
});
test("重复的四句副歌被识别为高潮段，两行的重复不会抢先", () => {
  const lrc = [
    "[00:10.00]第一句",
    "[00:12.00]第二句",
    "[00:14.00]第三句",
    "[00:16.00]第四句",
    "[00:20.00]主歌甲",
    "[00:22.00]主歌乙",
    "[00:30.00]第一句",
    "[00:32.00]第二句",
    "[00:34.00]第三句",
    "[00:36.00]第四句",
    "[00:40.00]尾声",
    "[00:50.00]重复甲",
    "[00:52.00]重复乙",
    "[01:00.00]重复甲",
    "[01:02.00]重复乙",
  ].join("\n");

  const parsed = buildLyrics(lrc);
  assert.deepEqual(parsed.chorus, [
    { start: 10, end: 20 },
    { start: 30, end: 40 },
  ]);
});

test("长留白的后半段识别为间奏，短留白不硬造", () => {
  const longGap = buildLyrics(
    [
      "[00:10.00]第一句",
      "[00:12.00]第二句",
      "[00:30.00]第三句",
      "[00:34.00]第四句",
    ].join("\n")
  );
  assert.deepEqual(longGap.bridges, [{ start: 20.1, end: 29.65 }]);
  assert.equal(sectionAt(15, longGap), "verse");
  assert.equal(sectionAt(20.2, longGap), "bridge");
  assert.equal(sectionAt(25, longGap), "bridge");
  assert.equal(sectionAt(30, longGap), "verse");

  const shortGap = buildLyrics(
    ["[00:10.00]第一句", "[00:12.00]第二句", "[00:18.00]第三句"].join("\n")
  );
  assert.deepEqual(shortGap.bridges, []);
  assert.equal(sectionAt(15, shortGap), "verse");
});

test("间奏不会盖掉副歌，也不会占掉前奏与尾奏", () => {
  const parsed = buildLyrics(
    [
      "[00:10.00]第一句",
      "[00:12.00]第二句",
      "[00:20.00]第一句",
      "[00:22.00]第二句",
      "[00:30.00]尾声",
      "[00:45.00]最后一句",
    ].join("\n")
  );
  assert.deepEqual(parsed.chorus, [{ start: 10, end: 30 }]);
  // 22→30 的留白落在副歌尾部，不另标间奏；30→45 的后半段才是间奏
  assert.deepEqual(parsed.bridges, [{ start: 36.75, end: 44.65 }]);
  assert.equal(sectionAt(11, parsed), "chorus");
  assert.equal(sectionAt(38, parsed), "bridge");
  assert.equal(sectionAt(5, parsed), "intro");
  assert.equal(sectionAt(52, parsed), "outro");
});

test("段落判断：前奏 / 高潮 / 主歌 / 尾奏 / 纯音乐", () => {
  const lrc = [
    "[00:10.00]第一句",
    "[00:12.00]第二句",
    "[00:14.00]第三句",
    "[00:16.00]第四句",
    "[00:20.00]主歌甲",
    "[00:22.00]主歌乙",
    "[00:30.00]第一句",
    "[00:32.00]第二句",
    "[00:34.00]第三句",
    "[00:36.00]第四句",
    "[00:40.00]尾声",
  ].join("\n");
  const parsed = buildLyrics(lrc);

  assert.equal(sectionAt(5, parsed), "intro");
  assert.equal(sectionAt(11, parsed), "chorus");
  assert.equal(sectionAt(21, parsed), "verse");
  assert.equal(sectionAt(31, parsed), "chorus");
  assert.equal(sectionAt(47, parsed), "outro");
  assert.equal(sectionAt(12, buildLyrics("")), "instrumental");
});
