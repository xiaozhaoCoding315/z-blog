/**
 * GitHub 事件 → 每日提交数的单元测试。
 *   node --test scripts/github-activity.test.mjs
 *
 * 只测 github-activity.ts —— 它没有任何 import，node 能直接跑。
 * 带 `@/` 别名的模块（github-server.ts 等）不在这里测：
 * node --test 不解析 tsconfig 的 paths，测它们会直接报模块找不到。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { countCommitsByDay } from "../src/lib/github-activity.ts";

const push = (createdAt, size) => ({
  type: "PushEvent",
  created_at: createdAt,
  payload: { size },
});

test("PushEvent 按 payload.size 计入当天", () => {
  const counts = countCommitsByDay([push("2026-11-05T10:00:00Z", 3)]);
  assert.equal(counts.get("2026-11-05"), 3);
});

test("非 Push 事件不计提交", () => {
  const counts = countCommitsByDay([
    { type: "WatchEvent", created_at: "2026-11-05T10:00:00Z" },
    { type: "IssuesEvent", created_at: "2026-11-05T11:00:00Z" },
  ]);
  assert.equal(counts.get("2026-11-05") ?? 0, 0);
  assert.equal(counts.size, 0);
});

test("payload.size 缺失或非数字时按 1 计", () => {
  assert.equal(
    countCommitsByDay([{ type: "PushEvent", created_at: "2026-11-05T10:00:00Z" }]).get(
      "2026-11-05"
    ),
    1
  );
  assert.equal(countCommitsByDay([push("2026-11-05T10:00:00Z", "3")]).get("2026-11-05"), 1);
  assert.equal(countCommitsByDay([push("2026-11-05T10:00:00Z", NaN)]).get("2026-11-05"), 1);
});

test("payload.size 为 0 时按 1 计，绝不为 0", () => {
  assert.equal(countCommitsByDay([push("2026-11-05T10:00:00Z", 0)]).get("2026-11-05"), 1);
});

test("不同日期分别入桶", () => {
  const counts = countCommitsByDay([
    push("2026-11-05T10:00:00Z", 2),
    push("2026-11-06T10:00:00Z", 4),
    push("2026-11-06T18:00:00Z", 1),
  ]);
  assert.equal(counts.get("2026-11-05"), 2);
  assert.equal(counts.get("2026-11-06"), 5);
  assert.equal(counts.size, 2);
});

test("空事件序列给出空 Map", () => {
  const counts = countCommitsByDay([]);
  assert.equal(counts.size, 0);
});
