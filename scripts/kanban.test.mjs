import test from "node:test";
import assert from "node:assert/strict";
import {
  KANBAN_COLUMNS,
  applyKanbanOrder,
  columnOf,
  groupProjects,
  moveKanbanProject,
  readKanbanOrder,
  writeKanbanOrder,
} from "../src/lib/kanban.ts";

/** 开发环境下未知状态会告警；测试里收集它们，不让控制台变成噪声。 */
function withWarningsCollected(fn) {
  const original = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    return { result: fn(), warnings };
  } finally {
    console.warn = original;
  }
}

const projects = [
  { name: "Nova", status: "进行中" },
  { name: "TripCraft", status: "已完成" },
  { name: "博客", status: "维护中" },
  { name: "旧实验", status: "归档" },
  { name: "下一个", status: "待启动" },
];

test("进行中与维护中映射到 doing", () => {
  assert.equal(columnOf("进行中"), "doing");
  assert.equal(columnOf("维护中"), "doing");
});

test("已完成映射到 done", () => {
  assert.equal(columnOf("已完成"), "done");
});

test("待启动映射到 backlog", () => {
  assert.equal(columnOf("待启动"), "backlog");
});

test("未知状态归入进行中并在开发环境告警", () => {
  const { result, warnings } = withWarningsCollected(() => [
    columnOf("归档"),
    columnOf(""),
  ]);
  assert.deepEqual(result, ["doing", "doing"]);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /未知项目状态：归档/);
  assert.match(warnings[1], /未知项目状态：/);
});

test("groupProjects 保持配置顺序", () => {
  const { result: grouped } = withWarningsCollected(() =>
    groupProjects(projects)
  );
  assert.deepEqual(
    grouped.doing.map((project) => project.name),
    ["Nova", "博客", "旧实验"]
  );
  assert.deepEqual(
    grouped.done.map((project) => project.name),
    ["TripCraft"]
  );
  assert.deepEqual(
    grouped.backlog.map((project) => project.name),
    ["下一个"]
  );
});

test("groupProjects 三列齐全，空列也是空数组", () => {
  const grouped = groupProjects([]);
  assert.deepEqual(Object.keys(grouped).sort(), ["backlog", "doing", "done"]);
  for (const column of KANBAN_COLUMNS) {
    assert.deepEqual(grouped[column.id], []);
  }
});

test("applyKanbanOrder 应用本地列与顺序，未知名字被忽略", () => {
  const { result: grouped } = withWarningsCollected(() =>
    applyKanbanOrder(projects, {
      Nova: { column: "done", order: 0 },
      博客: { column: "backlog", order: 0 },
      不存在: { column: "doing", order: 0 },
    })
  );
  assert.deepEqual(
    grouped.done.map((project) => project.name),
    ["Nova", "TripCraft"]
  );
  assert.deepEqual(
    grouped.backlog.map((project) => project.name),
    ["博客", "下一个"]
  );
  assert.deepEqual(
    grouped.doing.map((project) => project.name),
    ["旧实验"]
  );
});

test("moveKanbanProject 换列并在目标列重新编号", () => {
  const { result } = withWarningsCollected(() => {
    const next = moveKanbanProject({}, projects, "Nova", "done", 0);
    return { next, board: applyKanbanOrder(projects, next) };
  });
  assert.deepEqual(
    result.board.done.map((project) => project.name),
    ["Nova", "TripCraft"]
  );
  assert.deepEqual(
    result.board.doing.map((project) => project.name),
    ["博客", "旧实验"]
  );
  assert.deepEqual(result.next.Nova, { column: "done", order: 0 });
  assert.deepEqual(result.next.TripCraft, { column: "done", order: 1 });
});

test("moveKanbanProject 不认识的项目原样返回", () => {
  const order = { Nova: { column: "done", order: 0 } };
  assert.equal(
    moveKanbanProject(order, projects, "不存在", "doing"),
    order
  );
});

test("没有 window 时读写看板顺序安全降级", () => {
  assert.deepEqual(readKanbanOrder(), {});
  assert.doesNotThrow(() => writeKanbanOrder({}));
});
