import test from "node:test";
import assert from "node:assert/strict";
import {
  apps,
  desktopApps,
  desktopTileApps,
  findAppByPath,
  launcherApps,
} from "../src/config/apps.ts";

test("所有应用 id 唯一，且都有标题和描述", () => {
  assert.equal(new Set(apps.map((app) => app.id)).size, apps.length);
  for (const app of apps) {
    assert.ok(app.title.length > 0, `${app.id} missing title`);
    assert.ok(app.description.length > 0, `${app.id} missing description`);
  }
});

test("桌面图标正好 12 个，顺序是设计文档里的顺序", () => {
  assert.deepEqual(
    desktopApps.map((app) => app.id),
    [
      "terminal",
      "life",
      "gallery",
      "projects",
      "snippets",
      "about",
      "notes",
      "shelf",
      "playlist",
      "letters",
      "more",
      "assistant",
    ]
  );
});

test("阶段 1 桌面只渲染已经有路由的 9 个图标", () => {
  assert.deepEqual(
    desktopTileApps.map((app) => app.id),
    ["life", "gallery", "projects", "snippets", "about", "notes", "shelf", "playlist", "letters"]
  );
});

test("路径唯一，子路径归到父应用，桌面根路径不匹配", () => {
  const paths = apps.filter((app) => app.path).map((app) => app.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(findAppByPath("/notes/hello")?.id, "notes");
  assert.equal(findAppByPath("/life/42")?.id, "life");
  assert.equal(findAppByPath("/notes")?.id, "notes");
  assert.equal(findAppByPath("/"), undefined);
  assert.equal(findAppByPath("/unknown"), undefined);
});

test("启动器只列有路由且允许启动的应用", () => {
  assert.ok(launcherApps.length >= 10);
  for (const app of launcherApps) {
    assert.ok(app.path.startsWith("/"));
    assert.equal(app.launcher, true);
  }
});
