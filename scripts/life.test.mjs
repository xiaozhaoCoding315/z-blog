/**
 * 生活流纯函数的单元测试。
 *   node --test scripts/life.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countThisMonth,
  formatDay,
  groupByMonth,
  momentExcerpt,
  momentText,
  monthKeyOf,
  monthLabel,
} from "../src/lib/life.ts";

const moment = (id, publishedAt, kind = "text") => ({
  id,
  kind,
  publishedAt,
  body: id,
});

test("日期按北京时间换算，输出 MM.DD", () => {
  assert.equal(formatDay("2026-11-03T16:30:00Z"), "11.04");
  assert.equal(formatDay("2026-11-03T23:30:00+08:00"), "11.03");
  assert.equal(formatDay("2026-01-05T09:00:00+08:00"), "01.05");
});

test("monthKeyOf 给出分组用的年月键", () => {
  assert.equal(monthKeyOf("2026-11-03T23:30:00+08:00"), "2026-11");
  assert.equal(monthKeyOf("2026-11-01T07:30:00+08:00"), "2026-11");
});

test("月份名用中文，跨年时带年份", () => {
  assert.equal(monthLabel(2026, 11, 2026), "十一月");
  assert.equal(monthLabel(2025, 12, 2026), "2025 年 十二月");
});

test("按月倒序分组，同月内保持时间倒序", () => {
  const groups = groupByMonth(
    [
      moment("a", "2026-10-02T10:00:00+08:00"),
      moment("b", "2026-11-05T10:00:00+08:00"),
      moment("c", "2026-11-01T10:00:00+08:00"),
    ],
    2026
  );
  assert.deepEqual(
    groups.map((g) => g.key),
    ["2026-11", "2026-10"]
  );
  assert.deepEqual(
    groups[0].moments.map((m) => m.id),
    ["b", "c"]
  );
  assert.equal(groups[0].label, "十一月");
  assert.equal(groups[1].label, "十月");
});

test("分组不修改传入的数组", () => {
  const input = [
    moment("a", "2026-10-02T10:00:00+08:00"),
    moment("b", "2026-11-05T10:00:00+08:00"),
  ];
  groupByMonth(input, 2026);
  assert.deepEqual(
    input.map((m) => m.id),
    ["a", "b"]
  );
});

test("本月条数只算当月，跨年不算", () => {
  const moments = [
    { publishedAt: "2026-11-05T21:40:00+08:00" },
    { publishedAt: "2026-11-01T09:00:00+08:00" },
    { publishedAt: "2026-10-31T23:00:00+08:00" },
    { publishedAt: "2025-11-03T09:00:00+08:00" },
  ];
  assert.equal(countThisMonth(moments, 2026, 11), 2);
  assert.equal(countThisMonth(moments, 2026, 10), 1);
  assert.equal(countThisMonth(moments, 2027, 1), 0);
});

test("动态标题折叠空白，只留正文", () => {
  const m = { body: "  降温了，\n 记得加衣服。  " };
  assert.equal(momentText(m), "降温了， 记得加衣服。");
  assert.equal(momentExcerpt(m, 40), "降温了， 记得加衣服。");
});

test("动态标题按字素簇截断，不劈开 emoji", () => {
  const m = { body: "🌧️".repeat(3) + "雨下了一整天" };
  assert.equal(momentExcerpt(m, 3), "🌧️🌧️🌧️");
});

test("momentExcerpt 40 上限按字素簇截断，不劈开 emoji 与组合字符", () => {
  const body = "é🌧️👨‍👩‍👧‍👦汉字".repeat(20);
  const segmenter = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });
  const graphemes = (text) =>
    [...segmenter.segment(text)].map((item) => item.segment);
  const excerpt = momentExcerpt({ body }, 40);
  assert.ok(graphemes(excerpt).length <= 40);
  assert.deepEqual(graphemes(excerpt), graphemes(body).slice(0, 40));
});

test("momentExcerpt 60 上限按字素簇截断，不劈开 emoji 与组合字符", () => {
  const body = "é🌧️👨‍👩‍👧‍👦汉字".repeat(20);
  const segmenter = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });
  const graphemes = (text) =>
    [...segmenter.segment(text)].map((item) => item.segment);
  const excerpt = momentExcerpt({ body }, 60);
  assert.ok(graphemes(excerpt).length <= 60);
  assert.deepEqual(graphemes(excerpt), graphemes(body).slice(0, 60));
});

test("没有正文时用卡片标题，纯图片动态说一张照片", () => {
  assert.equal(
    momentText({ body: "   ", card: { title: "晴天 - 周杰伦" } }),
    "晴天 - 周杰伦"
  );
  assert.equal(momentText({ body: "", images: ["/media/a.jpg"] }), "一张照片");
  assert.equal(momentText({ body: "", images: [] }), "一条动态");
});
