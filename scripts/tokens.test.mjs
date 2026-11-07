/**
 * 设计 token 的护栏：颜色可以改，但不能改到看不清。
 * 直接读 globals.css，不依赖浏览器。
 *   node --test scripts/tokens.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8"
);

function block(selector) {
  const start = css.indexOf(selector + " {");
  assert.notEqual(start, -1, `globals.css 里找不到 ${selector} 块`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const map = {};
  for (const m of body.matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

const light = block(":root");
const dark = block(".dark");

const rgb = (hex) => {
  assert.match(hex, /^#[0-9a-fA-F]{6}$/, `不是六位十六进制：${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
};

const luminance = ([r, g, b]) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrast = (a, b) => {
  const x = luminance(rgb(a));
  const y = luminance(rgb(b));
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

test("亮色：正文对纸底不低于 7:1", () => {
  assert.ok(contrast(light.foreground, light.background) >= 7);
});

test("亮色：次要文字对纸底不低于 4.5:1", () => {
  assert.ok(contrast(light["muted-foreground"], light.background) >= 4.5);
});

test("暗色：正文对纸底不低于 7:1", () => {
  assert.ok(contrast(dark.foreground, dark.background) >= 7);
});

test("暗色：次要文字对纸底不低于 4.5:1", () => {
  assert.ok(contrast(dark["muted-foreground"], dark.background) >= 4.5);
});

test("两套主题都定义了邮戳、朱红与格线", () => {
  for (const [name, tokens] of [
    ["亮色", light],
    ["暗色", dark],
  ]) {
    for (const key of ["stamp", "postmark", "rule"]) {
      assert.match(
        tokens[key] ?? "",
        /^#[0-9a-fA-F]{6}$/,
        `${name}主题缺少 --${key}`
      );
    }
  }
});
