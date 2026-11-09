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

const projects = [
  { name: "Nova", status: "进行中" },
  { name: "TripCraft", status: "已完成" },
  { name: "博客", status: "维护中" },
  { name: "旧实验", status: "归档" },
  { name: "下一个", status: "进行中" },
];

test("进行中与维护中映射到 doing", () => {
  assert.equal(columnOf("进行中"), "doing");
  assert.equal(columnOf("维护中"), "doing");
});

test("已完成映射到 done", () => {
  assert.equal(columnOf("已完成"), "done");
});

test("未知状态回落到 backlog", () => {
  assert.equal(columnOf("归档"), "backlog");
  assert.equal(columnOf(""), "backlog");
});

test("groupProjects 保持配置顺序", () => {
  const grouped = groupProjects(projects);
  assert.deepEqual(
    grouped.doing.map((project) => project.name),
    ["Nova", "博客", "下一个"]
  );
  assert.deepEqual(
    grouped.done.map((project) => project.name),
    ["TripCraft"]
  );
  assert.deepEqual(
    grouped.backlog.map((project) => project.name),
    ["旧实验"]
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
  const grouped = applyKanbanOrder(projects, {
    Nova: { column: "done", order: 0 },
    博客: { column: "backlog", order: 0 },
    不存在: { column: "doing", order: 0 },
  });
  assert.deepEqual(
    grouped.done.map((project) => project.name),
    ["Nova", "TripCraft"]
  );
  assert.deepEqual(
    grouped.backlog.map((project) => project.name),
    ["博客", "旧实验"]
  );
  assert.deepEqual(
    grouped.doing.map((project) => project.name),
    ["下一个"]
  );
});

test("moveKanbanProject 换列并在目标列重新编号", () => {
  const next = moveKanbanProject({}, projects, "Nova", "done", 0);
  const board = applyKanbanOrder(projects, next);
  assert.deepEqual(
    board.done.map((project) => project.name),
    ["Nova", "TripCraft"]
  );
  assert.deepEqual(
    board.doing.map((project) => project.name),
    ["博客", "下一个"]
  );
  assert.deepEqual(next.Nova, { column: "done", order: 0 });
  assert.deepEqual(next.TripCraft, { column: "done", order: 1 });
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
