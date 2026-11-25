/**
 * 天气码映射的单元测试。
 *   node --test scripts/weather.test.mjs
 *
 * 只测 weather.ts —— 它没有任何 import，node 能直接跑。
 * 带 `@/` 别名的模块（observation.ts 等）不在这里测：
 * node --test 不解析 tsconfig 的 paths，测它们会直接报模块找不到。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { weatherLabel } from "../src/lib/weather.ts";

test("WMO 天气码翻成中文", () => {
  assert.equal(weatherLabel(0), "晴");
  assert.equal(weatherLabel(2), "多云");
  assert.equal(weatherLabel(3), "阴");
  assert.equal(weatherLabel(61), "小雨");
  assert.equal(weatherLabel(75), "大雪");
  assert.equal(weatherLabel(95), "雷雨");
});

test("没见过的天气码不许编，返回未知", () => {
  assert.equal(weatherLabel(-1), "未知");
  assert.equal(weatherLabel(1234), "未知");
});
