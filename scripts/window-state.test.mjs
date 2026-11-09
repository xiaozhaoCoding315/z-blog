import test from "node:test";
import assert from "node:assert/strict";
import {
  clampRect,
  initialWindowStore,
  preferredRect,
  sanitizeSavedRects,
  windowReducer,
} from "../src/components/desktop/window-state.ts";

const bounds = { width: 1200, height: 800 };
const rect = { x: 100, y: 100, w: 500, h: 400 };

test("open 创建窗口并聚焦，重复 open 只聚焦", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  assert.equal(state.windows.life.rect.w, 500);
  assert.equal(state.windows.life.z, 2);
  const again = windowReducer(state, { type: "open", id: "life", rect: { ...rect, x: 0 } });
  assert.equal(again.windows.life.rect.x, 100);
  assert.ok(again.windows.life.z > state.windows.life.z);
});

test("minimize 保留窗口，restore 重新置顶", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "minimize", id: "life" });
  assert.equal(state.windows.life.minimized, true);
  state = windowReducer(state, { type: "restore", id: "life" });
  assert.equal(state.windows.life.minimized, false);
  assert.ok(state.windows.life.z > 2);
});

test("minimize 聚焦窗口后焦点落到剩余可见窗口", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "open", id: "gallery", rect });
  assert.equal(state.windows.gallery.z, state.zCounter);

  state = windowReducer(state, { type: "minimize", id: "gallery" });
  assert.equal(state.windows.gallery.minimized, true);
  assert.equal(state.windows.life.z, state.zCounter);
});

test("close 聚焦窗口后焦点回落；关闭最后一个不崩溃", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "open", id: "gallery", rect });
  assert.equal(state.windows.gallery.z, state.zCounter);

  state = windowReducer(state, { type: "close", id: "gallery" });
  assert.equal(state.windows.gallery, undefined);
  assert.equal(state.windows.life.z, state.zCounter);

  state = windowReducer(state, { type: "close", id: "life" });
  assert.deepEqual(state.windows, {});
  assert.equal(state.zCounter, 2);
});

test("maximize 保存 restoreRect，还原回原 rect", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "toggleMaximize", id: "life" });
  assert.equal(state.windows.life.maximized, true);
  assert.deepEqual(state.windows.life.restoreRect, rect);
  state = windowReducer(state, { type: "toggleMaximize", id: "life" });
  assert.equal(state.windows.life.maximized, false);
  assert.deepEqual(state.windows.life.rect, rect);
});

test("close 删除窗口但保留 saved 位置", () => {
  let state = windowReducer(initialWindowStore, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "move", id: "life", rect: { ...rect, x: 240 } });
  state = windowReducer(state, { type: "close", id: "life" });
  assert.equal(state.windows.life, undefined);
  assert.equal(state.saved.life.x, 240);
});

test("hydrate 只恢复位置，preferredRect 用保存值并 clamp", () => {
  let state = windowReducer(initialWindowStore, {
    type: "hydrate",
    saved: { life: { x: 20, y: 40, w: 480, h: 600 } },
  });
  assert.equal(state.hydrated, true);
  assert.equal(state.windows.life, undefined);
  assert.deepEqual(
    preferredRect(state.saved.life, rect, bounds, 420, 360),
    { x: 20, y: 40, w: 480, h: 600 }
  );
  state = windowReducer(state, { type: "open", id: "life", rect });
  assert.deepEqual(state.windows.life.rect, rect);
  assert.deepEqual(state.saved.life, { x: 20, y: 40, w: 480, h: 600 });
});

test("preferredRect 初始位置整体落在视口内（1024 宽度）", () => {
  const rect = preferredRect(
    undefined,
    { x: 320, y: 120, w: 760, h: 440 },
    { width: 1024, height: 768 },
    420,
    280
  );
  assert.deepEqual(rect, { x: 264, y: 120, w: 760, h: 440 });
  assert.ok(rect.x + rect.w <= 1024);
  assert.ok(rect.y + rect.h <= 768);
});

test("clampRect 限制最小尺寸并保留 80px 标题栏", () => {
  const clamped = clampRect(
    { x: 2000, y: -200, w: 100, h: 100 },
    bounds,
    420,
    360
  );
  assert.equal(clamped.w, 420);
  assert.equal(clamped.h, 360);
  assert.ok(clamped.x + clamped.w >= 80);
  assert.equal(clamped.y, 0);
});

test("reset 清空窗口与保存位置，但保持已水合标记", () => {
  let state = windowReducer(initialWindowStore, { type: "hydrate", saved: {} });
  state = windowReducer(state, { type: "open", id: "life", rect });
  state = windowReducer(state, { type: "reset" });
  assert.deepEqual(state.windows, {});
  assert.deepEqual(state.saved, {});
  assert.equal(state.hydrated, true);
});

test("sanitizeSavedRects：损坏 JSON 与数组/null 都回退空布局", () => {
  for (const raw of [null, [], [rect], "not json", 42, true]) {
    assert.deepEqual(sanitizeSavedRects(raw), {});
  }
  assert.deepEqual(sanitizeSavedRects(JSON.parse("{}")), {});
});

test("sanitizeSavedRects：字段类型错误或缺失整项丢弃", () => {
  assert.deepEqual(
    sanitizeSavedRects({
      life: { x: 1, y: 2, w: "500", h: 400 },
      gallery: { x: 1, y: 2, w: 500 },
      terminal: { x: "0", y: 0, w: 760, h: 440 },
      projects: null,
      snippets: [1, 2, 3, 4],
    }),
    {}
  );
});

test("sanitizeSavedRects：NaN/Infinity/非正尺寸与未知 id 都丢弃", () => {
  assert.deepEqual(
    sanitizeSavedRects({
      life: { x: NaN, y: 2, w: 500, h: 400 },
      gallery: { x: 1, y: Infinity, w: 500, h: 400 },
      terminal: { x: 1, y: 2, w: 760, h: -Infinity },
      projects: { x: 1, y: 2, w: 0, h: 400 },
      snippets: { x: 1, y: 2, w: 760, h: -1 },
      unknown: { x: 1, y: 2, w: 500, h: 400 },
      notes: rect,
    }),
    {}
  );
});

test("sanitizeSavedRects：保留注册表里有限四元组，hydrate 后仍钳制", () => {
  const raw = {
    life: { x: 20, y: 40, w: 480, h: 600 },
    terminal: { x: 0, y: 0, w: 760, h: 440 },
    about: { x: 1, y: 2, w: 520, h: 600 },
    "bad-key": { x: 1, y: 2, w: 500, h: 400 },
  };
  const saved = sanitizeSavedRects(raw);
  assert.deepEqual(Object.keys(saved).sort(), ["about", "life", "terminal"]);
  assert.deepEqual(saved.life, { x: 20, y: 40, w: 480, h: 600 });
  const hydrated = windowReducer(initialWindowStore, {
    type: "hydrate",
    saved,
  });
  assert.equal(hydrated.hydrated, true);
  assert.equal(hydrated.saved["bad-key"], undefined);
  assert.deepEqual(
    preferredRect(hydrated.saved.life, rect, bounds, 420, 360),
    { x: 20, y: 40, w: 480, h: 600 }
  );
});
