import test from "node:test";
import assert from "node:assert/strict";
import {
  apps,
  desktopTileApps,
  findAppById,
  findAppByPath,
  launcherApps,
  publicApps,
} from "../src/config/apps.ts";

test("所有应用 id 唯一，且都有标题、描述、类型和关键词", () => {
  assert.equal(new Set(apps.map((app) => app.id)).size, apps.length);
  for (const app of apps) {
    assert.ok(app.title.length > 0, `${app.id} missing title`);
    assert.ok(app.description.length > 0, `${app.id} missing description`);
    assert.ok(app.kind === "window" || app.kind === "route", `${app.id} bad kind`);
    assert.ok(app.keywords.length > 0, `${app.id} missing keywords`);
    if (app.kind === "window") {
      assert.ok(app.window, `${app.id} window app missing config`);
    } else {
      assert.equal(app.window, undefined, `${app.id} route app has window config`);
    }
  }
});

test("桌面图标正好 12 个，顺序是设计文档里的顺序", () => {
  assert.deepEqual(
    desktopTileApps.map((app) => app.id),
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

test("窗口型应用带默认尺寸，终端/更多/助理没有路由", () => {
  const expected = {
    terminal: [{ x: 320, y: 120, w: 760, h: 440 }, 420, 280],
    life: [{ x: 24, y: 32, w: 520, h: 620 }, 420, 360],
    gallery: [{ x: 560, y: 48, w: 640, h: 560 }, 420, 320],
    projects: [{ x: 180, y: 72, w: 880, h: 560 }, 560, 360],
    snippets: [{ x: 320, y: 96, w: 760, h: 520 }, 520, 360],
    about: [{ x: 720, y: 96, w: 520, h: 600 }, 400, 360],
    more: [{ x: 240, y: 160, w: 400, h: 320 }, 320, 240],
    assistant: [{ x: 360, y: 120, w: 720, h: 520 }, 420, 320],
  };

  for (const [id, [defaultRect, minWidth, minHeight]] of Object.entries(expected)) {
    const app = findAppById(id);
    assert.ok(app, `${id} missing`);
    assert.equal(app.kind, "window", `${id} should be a window app`);
    assert.deepEqual(app.window?.defaultRect, defaultRect, `${id} defaultRect`);
    assert.equal(app.window?.minWidth, minWidth, `${id} minWidth`);
    assert.equal(app.window?.minHeight, minHeight, `${id} minHeight`);
  }

  for (const id of ["terminal", "more", "assistant"]) {
    assert.equal(findAppById(id)?.path, null, `${id} should have no route`);
  }
  for (const id of ["notes", "shelf", "playlist", "letters", "journal", "friends", "login", "write", "admin", "style"]) {
    assert.equal(findAppById(id)?.kind, "route", `${id} should be a route app`);
  }
  assert.equal(findAppById("nope"), undefined);
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

test("启动器允许无路由应用，公开列表仍只含有路由的应用", () => {
  assert.deepEqual(
    launcherApps.map((app) => app.id),
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
      "journal",
      "friends",
      "settings",
    ]
  );
  for (const app of launcherApps) {
    assert.equal(app.launcher, true);
  }
  for (const id of ["terminal", "more", "assistant", "settings"]) {
    assert.ok(launcherApps.some((app) => app.id === id), `${id} should be in launcher`);
    assert.equal(findAppById(id)?.path, null, `${id} should have no route`);
  }
  assert.equal(findAppById("friends")?.launcher, true);

  assert.ok(publicApps.length > 0);
  for (const app of publicApps) {
    assert.ok(app.path.startsWith("/"));
    assert.equal(app.launcher, true);
  }
  assert.equal(publicApps.some((app) => app.id === "settings"), false);
});
