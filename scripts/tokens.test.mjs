import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing block ${selector}`);
  const end = css.indexOf("\n}", start);
  assert.notEqual(end, -1, `unterminated block ${selector}`);
  return css.slice(start, end);
}

function declarations(source) {
  const found = {};
  for (const match of source.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    found[match[1]] = match[2].trim();
  }
  return found;
}

const aliases = declarations(block(":root"));
const presets = {
  night: declarations(block(".dark")),
  paper: declarations(block('[data-wallpaper="paper"]')),
  blueprint: declarations(block('[data-wallpaper="blueprint"]')),
};

function resolve(preset, key) {
  let value = preset[key] ?? aliases[key];
  for (let hop = 0; hop < 6 && value?.startsWith("var("); hop += 1) {
    const name = value.slice(4, -1).trim().replace(/^--/, "");
    value = preset[name] ?? aliases[name];
  }
  return value;
}

function rgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function chroma(hex) {
  const [r, g, b] = rgb(hex).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.450593709 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return Math.hypot(a, bb);
}

const RAW = [
  "desk",
  "window",
  "window-2",
  "ink",
  "ink-dim",
  "rule",
  "phosphor",
  "ok",
  "warn",
  "danger",
  "info",
  "primary-foreground",
];

test("三套预设都定义原始色，且是十六进制", () => {
  for (const [name, preset] of Object.entries(presets)) {
    for (const token of RAW) {
      assert.match(preset[token] ?? "", /^#[0-9a-f]{6}$/i, `${name} missing ${token}`);
    }
  }
});

test("别名在每套预设里解析到正确的原始色", () => {
  for (const [name, preset] of Object.entries(presets)) {
    const expect = {
      background: "desk",
      foreground: "ink",
      card: "window",
      popover: "window-2",
      primary: "phosphor",
      secondary: "window-2",
      muted: "window-2",
      "muted-foreground": "ink-dim",
      accent: "window-2",
      destructive: "danger",
      border: "rule",
      input: "rule",
      panel: "window",
      "panel-2": "window-2",
      "sidebar": "window",
      "sidebar-border": "rule",
      data: "phosphor",
      wait: "warn",
      alert: "danger",
    };
    for (const [alias, raw] of Object.entries(expect)) {
      assert.equal(resolve(preset, alias), resolve(preset, raw), `${name}: --${alias}`);
    }
  }
});

test("正文对比度 ≥ 7:1", () => {
  for (const [name, preset] of Object.entries(presets)) {
    const ratio = contrast(resolve(preset, "ink"), resolve(preset, "window-2"));
    assert.ok(ratio >= 7, `${name}: ink on window-2 = ${ratio.toFixed(2)}`);
  }
});

test("muted 与语义色对比度 ≥ 4.5:1", () => {
  for (const [name, preset] of Object.entries(presets)) {
    for (const token of ["ink-dim", "phosphor", "ok", "warn", "danger", "info"]) {
      const ratio = contrast(resolve(preset, token), resolve(preset, "window-2"));
      assert.ok(ratio >= 4.5, `${name}: ${token} = ${ratio.toFixed(2)}`);
    }
  }
});

test("所有阅读用色的 chroma ≤ 0.12", () => {
  for (const [name, preset] of Object.entries(presets)) {
    for (const token of ["ink", "ink-dim", "phosphor", "ok", "warn", "danger", "info"]) {
      assert.ok(chroma(resolve(preset, token)) <= 0.12, `${name}: ${token} too saturated`);
    }
  }
});

test("四种语义色彼此不同", () => {
  for (const [name, preset] of Object.entries(presets)) {
    const values = ["phosphor", "ok", "warn", "danger"].map((token) => resolve(preset, token));
    assert.equal(new Set(values).size, values.length, `${name}: duplicated semantic colors`);
  }
});

test("主色前景在 phosphor 上可读", () => {
  for (const [name, preset] of Object.entries(presets)) {
    const ratio = contrast(resolve(preset, "primary-foreground"), resolve(preset, "phosphor"));
    assert.ok(ratio >= 4.5, `${name}: primary-foreground = ${ratio.toFixed(2)}`);
  }
});

test("已退役的 v1 token 不再出现", () => {
  for (const retired of [
    "--paper-raised",
    "--paper-sunken",
    "--grid-line",
    "--scanline",
    "--amber",
    "--serif-display",
    "--stamp",
    "--postmark",
    "--vermilion",
  ]) {
    assert.equal(css.includes(retired), false, `retired token ${retired} still present`);
  }
  for (const className of [".postmark", ".perforated", ".paper-sheet"]) {
    assert.equal(css.includes(className), false, `retired class ${className} still present`);
  }
});

test("图表与侧栏别名齐全", () => {
  for (const token of [
    "chart-1",
    "chart-2",
    "chart-3",
    "chart-4",
    "chart-5",
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-accent",
    "sidebar-border",
    "sidebar-ring",
  ]) {
    assert.ok(aliases[token], `missing alias --${token}`);
  }
});

test("图表语义色映射正确", () => {
  assert.equal(aliases["chart-1"], "var(--phosphor)");
  assert.equal(aliases["chart-2"], "var(--ok)");
  assert.equal(aliases["chart-3"], "var(--warn)");
  assert.equal(aliases["chart-4"], "var(--danger)");
  assert.equal(aliases["chart-5"], "var(--ink-dim)");
});

test("标题字体是等宽，不再加载宋体", () => {
  assert.match(block("@theme inline"), /--font-heading:\s*var\(--font-geist-mono\)/);
  assert.equal(css.includes("noto-serif"), false);
  assert.equal(css.includes("Noto Serif"), false);
});
