/**
 * 运行天数口径的回归测试（无需测试框架，node --test 直接跑）。
 *   node --test scripts/uptime.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { daysSince, startOfDayAt, formatDays } from "../src/lib/uptime.ts";

const DAY = 86_400_000;
const start = startOfDayAt("2026-07-02");

test("起始日期解析为北京时间当日 00:00", () => {
  // 2026-07-01T16:00:00Z === 2026-07-02 00:00 +08:00
  assert.equal(start, Date.UTC(2026, 6, 1, 16, 0, 0));
});

test("起始当天为 0 天", () => {
  assert.equal(daysSince("2026-07-02", start), 0);
});

test("2026-10-30 恰好是第 120 天", () => {
  // 用户要求：站点看起来已搭建 120 天
  assert.equal(daysSince("2026-07-02", start + 120 * DAY), 120);
});

test("跨年不漂移", () => {
  assert.equal(daysSince("2026-07-02", start + 365 * DAY), 365);
});

test("非法日期返回 null 而不是 NaN", () => {
  assert.equal(startOfDayAt("not-a-date"), null);
  assert.equal(daysSince("not-a-date"), null);
  assert.equal(formatDays("not-a-date"), "—");
});

test("未来日期不出现负数", () => {
  assert.equal(daysSince("2026-07-02", start - 5 * DAY), 0);
});
