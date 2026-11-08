import test from "node:test";
import assert from "node:assert/strict";
import {
  completeCommand,
  runCommand,
} from "../src/components/terminal/commands.ts";

function makeContext(overrides = {}) {
  return {
    apps: [
      { id: "terminal", title: "终端", path: null, kind: "window" },
      { id: "life", title: "每日日志", path: "/life", kind: "window" },
      { id: "notes", title: "笔记", path: "/notes", kind: "route" },
    ],
    notes: [
      { slug: "hello-world", title: "你好，世界" },
      { slug: "rag-notes", title: "RAG 笔记" },
    ],
    snippets: [{ id: "debounce", title: "防抖", language: "ts" }],
    theme: "night",
    uptimeDays: 129,
    aiEnabled: false,
    ...overrides,
  };
}

const text = (result) => result.lines.join("\n");

test("help 分组列出命令与示例", () => {
  const result = runCommand("help", makeContext());
  const output = text(result);
  assert.ok(output.includes("浏览"));
  assert.ok(output.includes("桌面"));
  assert.ok(output.includes("会话"));
  assert.ok(output.includes("open"));
  assert.ok(output.includes("neofetch"));
  assert.equal(result.effect, undefined);
});

test("ls 给出应用、笔记与片段数量", () => {
  const output = text(runCommand("ls", makeContext()));
  assert.match(output, /apps\/\s+3/);
  assert.match(output, /notes\/\s+2/);
  assert.match(output, /snippets\/\s+1/);
});

test("apps 列出应用 id、名称与路由", () => {
  const output = text(runCommand("apps", makeContext()));
  assert.ok(output.includes("terminal"));
  assert.ok(output.includes("终端"));
  assert.ok(output.includes("life"));
  assert.ok(output.includes("每日日志"));
  assert.ok(output.includes("/notes"));
});

test("posts 列出笔记 slug 与标题", () => {
  const output = text(runCommand("posts", makeContext()));
  assert.ok(output.includes("hello-world"));
  assert.ok(output.includes("你好，世界"));
  assert.ok(output.includes("rag-notes"));
});

test("snippets 列出片段 id、标题与语言；空列表不编造内容", () => {
  const output = text(runCommand("snippets", makeContext()));
  assert.ok(output.includes("debounce"));
  assert.ok(output.includes("防抖"));
  assert.ok(output.includes("[ts]"));

  const empty = text(runCommand("snippets", makeContext({ snippets: [] })));
  assert.ok(empty.includes("还没有代码片段"));
  assert.ok(!empty.includes("防抖"));
});

test("open 按 app → note slug → snippet id 的顺序解析", () => {
  assert.deepEqual(runCommand("open life", makeContext()).effect, {
    type: "open",
    appId: "life",
  });
  assert.deepEqual(runCommand("open hello-world", makeContext()).effect, {
    type: "open",
    appId: "hello-world",
  });
  assert.deepEqual(runCommand("open debounce", makeContext()).effect, {
    type: "open",
    appId: "debounce",
  });
});

test("open 未知目标报错且不产生 effect", () => {
  const result = runCommand("open nowhere", makeContext());
  assert.equal(result.effect, undefined);
  assert.match(result.lines[0], /^open: /);
  assert.ok(text(result).includes("nowhere"));
});

test("open 缺少参数给出用法", () => {
  const result = runCommand("open", makeContext());
  assert.equal(result.effect, undefined);
  assert.match(result.lines[0], /^open: /);
  assert.ok(text(result).includes("用法"));
});

test("theme 切换预设，未知预设报错", () => {
  assert.deepEqual(runCommand("theme paper", makeContext()).effect, {
    type: "theme",
    preset: "paper",
  });
  assert.deepEqual(runCommand("theme blueprint", makeContext()).effect, {
    type: "theme",
    preset: "blueprint",
  });

  const bad = runCommand("theme neon", makeContext());
  assert.equal(bad.effect, undefined);
  assert.match(bad.lines[0], /^theme: /);
  assert.ok(text(bad).includes("night、paper、blueprint"));

  const current = text(runCommand("theme", makeContext()));
  assert.ok(current.includes("夜班"));
  assert.ok(current.includes("night"));
});

test("ask 产生 ask effect 并保留完整问题", () => {
  const result = runCommand("ask 什么是 RAG", makeContext());
  assert.deepEqual(result.effect, { type: "ask", question: "什么是 RAG" });
  assert.equal(result.lines.length, 1);
});

test("ask 缺少问题给出用法", () => {
  const result = runCommand("ask", makeContext());
  assert.equal(result.effect, undefined);
  assert.match(result.lines[0], /^ask: /);
});

test("whoami / date / uptime 输出真实字段", () => {
  assert.ok(text(runCommand("whoami", makeContext())).includes("guest"));

  const date = text(runCommand("date", makeContext()));
  assert.match(date, /^\d{4}-\d{2}-\d{2} 周[日一二三四五六] \d{2}:\d{2}:\d{2}$/);
  assert.ok(date.startsWith(String(new Date().getFullYear())));

  assert.ok(text(runCommand("uptime", makeContext())).includes("建站 129 天"));
  assert.ok(
    text(runCommand("uptime", makeContext({ uptimeDays: null }))).includes("—")
  );
});

test("neofetch 只显示真实值与明示的模拟 Shell", () => {
  const output = text(runCommand("neofetch", makeContext()));
  assert.ok(output.includes("OS: Z·OS"));
  assert.ok(output.includes("Host: 杭州"));
  assert.ok(output.includes("Uptime: 建站 129 天"));
  assert.ok(output.includes("Stack: Next.js 16 / React 19 / PostgreSQL"));
  assert.ok(output.includes("Apps: 3"));
  assert.ok(output.includes("Notes: 2"));
  assert.ok(output.includes("Theme: 夜班 (night)"));
  assert.ok(output.includes("AI: 未配置"));
  assert.ok(output.includes("Shell: zsh (simulated)"));

  const configured = text(
    runCommand("neofetch", makeContext({ aiEnabled: true, theme: "paper" }))
  );
  assert.ok(configured.includes("AI: 已配置"));
  assert.ok(configured.includes("Theme: 稿纸 (paper)"));

  const unknownUptime = text(
    runCommand("neofetch", makeContext({ uptimeDays: null }))
  );
  assert.ok(unknownUptime.includes("Uptime: 建站 —"));
});

test("coffee 打印 ASCII 咖啡并产生热气事件", () => {
  const result = runCommand("coffee", makeContext());
  assert.deepEqual(result.effect, { type: "coffee" });
  assert.ok(result.lines.length >= 5);
});

test("sudo / rm -rf / / vim 是无害彩蛋", () => {
  for (const input of ["sudo", "rm -rf /", "vim"]) {
    const result = runCommand(input, makeContext());
    assert.equal(result.effect, undefined, `${input} should stay harmless`);
    assert.ok(result.lines.length > 0, `${input} should answer`);
    assert.ok(!text(result).includes("command not found"));
  }
  assert.ok(text(runCommand("rm -rf /", makeContext())).includes("只读"));
});

test("clear / exit / :q 返回对应 effect", () => {
  assert.deepEqual(runCommand("clear", makeContext()).effect, { type: "clear" });
  assert.deepEqual(runCommand("exit", makeContext()).effect, { type: "close" });
  assert.deepEqual(runCommand(":q", makeContext()).effect, { type: "close" });

  const clear = runCommand("clear", makeContext());
  assert.deepEqual(clear.lines, []);
});

test("未知命令给出 zsh 风格提示，空输入不输出", () => {
  const unknown = runCommand("nope", makeContext());
  assert.equal(unknown.effect, undefined);
  assert.ok(unknown.lines[0].includes("zsh: command not found: nope"));
  assert.ok(text(unknown).includes("help"));

  assert.deepEqual(runCommand("   ", makeContext()), { lines: [] });
});

test("completeCommand 补全命令、应用 id、笔记 slug 与片段 id", () => {
  const ctx = makeContext();
  assert.deepEqual(completeCommand("op", ctx), ["open"]);
  assert.ok(completeCommand("li", ctx).includes("life"));
  assert.deepEqual(completeCommand("rag", ctx), ["rag-notes"]);
  assert.deepEqual(completeCommand("deb", ctx), ["debounce"]);
  assert.deepEqual(completeCommand("zzz", ctx), []);
  assert.ok(completeCommand("", ctx).includes("help"));
});
