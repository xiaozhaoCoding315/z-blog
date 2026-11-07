/**
 * 生活流纯函数的单元测试。
 *   node --test scripts/life.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatPostmark,
  groupByMonth,
  monthLabel,
  rotateForSeed,
} from "../src/lib/life.ts";

const moment = (id, publishedAt, kind = "text") => ({
  id,
  kind,
  publishedAt,
  body: id,
});

test("邮戳日期按北京时间换算", () => {
  // UTC 16:30 已经是北京时间次日 00:30
  assert.equal(formatPostmark("2026-11-03T16:30:00Z"), "11.04");
  assert.equal(formatPostmark("2026-11-03T23:30:00+08:00"), "11.03");
  // 个位数月日补零
  assert.equal(formatPostmark("2026-01-05T09:00:00+08:00"), "01.05");
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

test("邮戳角度稳定且落在 -12 到 -8 之间", () => {
  const a = rotateForSeed("11.03南京西路");
  assert.equal(a, rotateForSeed("11.03南京西路"));
  for (const seed of ["", "11.03", "十二月", "阿远"]) {
    const deg = rotateForSeed(seed);
    assert.ok(deg >= -12 && deg <= -8, `${seed} 得到 ${deg}`);
  }
});
