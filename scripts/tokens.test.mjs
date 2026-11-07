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
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

const light = block(":root");
const dark = block(".dark");

/** 别名（var(--x)）先解析成真正的颜色，测试只认十六进制 */
function resolve(tokens, key) {
  let value = tokens[key];
  for (let i = 0; i < 5 && value?.startsWith("var("); i++) {
    value = tokens[value.slice(6, -1)];
  }
  return value;
}

const rgb = (hex) => {
  assert.match(hex, /^#[0-9a-fA-F]{6}$/, `不是六位十六进制：${hex}`);
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
};

const linear = (v) => {
  v /= 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** sRGB → OKLCH 彩度。用来卡「不许霓虹」。 */
function chroma(hex) {
  const [r, g, b] = rgb(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675718 * s;
  return Math.hypot(A, B);
}

const THEMES = [
  ["报表模式", light],
  ["观测台", dark],
];

test("两套主题都定义了观测台的语义 token", () => {
  for (const [name, tokens] of THEMES) {
    for (const key of [
      "background",
      "panel",
      "panel-2",
      "foreground",
      "muted-foreground",
      "rule",
      "ok",
      "data",
      "wait",
      "alert",
    ]) {
      assert.match(
        resolve(tokens, key) ?? "",
        /^#[0-9a-fA-F]{6}$/,
        `${name}主题缺少 --${key}`
      );
    }
  }
});

test("正文对最深的一层底不低于 7:1", () => {
  for (const [name, tokens] of THEMES) {
    const ratio = contrast(
      resolve(tokens, "foreground"),
      resolve(tokens, "panel-2")
    );
    assert.ok(ratio >= 7, `${name}：正文只有 ${ratio.toFixed(2)}:1`);
  }
});

test("弱字与四个语义色对最深的一层底不低于 4.5:1", () => {
  for (const [name, tokens] of THEMES) {
    for (const key of ["muted-foreground", "ok", "data", "wait", "alert"]) {
      const ratio = contrast(resolve(tokens, key), resolve(tokens, "panel-2"));
      assert.ok(
        ratio >= 4.5,
        `${name}：--${key} 只有 ${ratio.toFixed(2)}:1`
      );
    }
  }
});

test("语义色的彩度不超过 0.12（不像霓虹）", () => {
  for (const [name, tokens] of THEMES) {
    for (const key of ["ok", "data", "wait", "alert"]) {
      const c = chroma(resolve(tokens, key));
      assert.ok(c <= 0.12, `${name}：--${key} 彩度 ${c.toFixed(3)} 过高`);
    }
  }
});

test("语义色两两不同，不许一个色兼职两个状态", () => {
  for (const [name, tokens] of THEMES) {
    const colors = ["ok", "data", "wait", "alert"].map((k) =>
      resolve(tokens, k).toLowerCase()
    );
    assert.equal(new Set(colors).size, 4, `${name}：有语义色重复`);
  }
});

test("v1 的退役 token 与类不许回流", () => {
  for (const name of [
    "--stamp",
    "--postmark",
    "--vermilion",
    "--paper-raised",
  ]) {
    assert.ok(
      !css.includes(name + ":"),
      `globals.css 里又出现了退役变量 ${name}`
    );
  }
  for (const cls of [".postmark", ".perforated", ".paper-sheet"]) {
    assert.ok(!css.includes(cls), `globals.css 里又出现了退役类 ${cls}`);
  }
});

test("--chart-1..5 绑在语义色上", () => {
  const expected = [
    "var(--data)",
    "var(--ok)",
    "var(--wait)",
    "var(--alert)",
    "var(--muted-foreground)",
  ];
  for (const [name, tokens] of THEMES) {
    expected.forEach((want, i) => {
      const key = `chart-${i + 1}`;
      assert.equal(
        tokens[key]?.replace(/\s+/g, " "),
        want,
        `${name}：--${key} 应绑定 ${want}，实际是 ${tokens[key]}`
      );
    });
  }
});
