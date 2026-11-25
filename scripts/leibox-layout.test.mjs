import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const css = read("../src/app/globals.css");
const home = read("../src/components/home/personal-home.tsx");
const pageFrame = read("../src/components/desktop/page-frame.tsx");
const clockStore = read("../src/components/desktop/clock-store.ts");
const packageJson = read("../package.json");
const research = read("../docs/design-research/2026-11-10-leibox-design-research.md");

function findRule(selector, label) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `缺少 ${label}`);
  let depth = 0;
  let end = -1;
  for (let index = start; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  assert.notEqual(end, -1, `${label} 未闭合`);
  return css.slice(start, end + 1);
}

test("LeiBox 布局回归进入全量测试命令", () => {
  assert.match(packageJson, /scripts\/leibox-layout\.test\.mjs/);
  assert.match(research, /MIT \+ Commons Clause/);
  assert.match(research, /仅供学习使用/);
});

test("首页七入口改成主次两列的无边框索引，保留七个真实完整页面链接", () => {
  assert.match(home, /className="home-entry-index"/);
  assert.match(home, /className="home-entry-main"/);
  assert.match(home, /className="home-entry-side"/);
  assert.match(home, /className="home-entry-line"/);
  assert.match(home, /className="home-entry-name"/);
  assert.match(home, /className="home-entry-description"/);
  assert.match(home, /className="home-entry-rule"/);
  assert.match(home, /className="home-stage"/);
  assert.match(home, /className="home-stage-column"/);
  assert.match(home, /className="home-tide-clock"/);
  assert.match(home, /data-home-index=\{index\}/);
  assert.match(home, /href=\{app\.path \?\? "\/"\}/);
  assert.match(home, /setTimeout\(\(\) => setSection\(next\), 150\)/);
  assert.match(home, /<Clock withSeconds/);
  assert.match(home, /siteConfig\.author\.bio/);
  assert.match(home, /siteConfig\.weather\.city/);
  assert.doesNotMatch(home, /className="home-card"/);
  assert.doesNotMatch(home, /打开完整页面|SEVEN PLACES|RECENT WRITING|LEAVE A TRACE/);
  assert.doesNotMatch(home, /home-primary-grid|home-section-count|home-rail|home-cta/);
  assert.doesNotMatch(home, /Number\.isInteger\(index\)/);
});

test("无边框索引使用细线、非对称栏宽与 150ms 状态反馈，不再套统一卡片", () => {
  const grid = findRule(".home-entry-index {", "非对称索引布局");
  assert.match(grid, /display:\s*grid/);
  assert.match(grid, /grid-template-columns:\s*minmax\(0, 1\.5fr\) minmax\(220px, 0\.72fr\)/);
  assert.match(grid, /gap:\s*clamp\(32px, 6vw, 88px\)/);

  const line = findRule(".home-entry-line {", "入口行");
  assert.match(line, /border:\s*0/);
  assert.match(line, /border-bottom:\s*1px solid/);
  assert.match(line, /border-radius:\s*0/);
  assert.match(line, /box-shadow:\s*none/);
  assert.match(line, /background:\s*transparent/);
  assert.match(line, /transition:\s*color 150ms|transition:[\s\S]*?150ms/);

  const columns = findRule(".home-entry-main,\n  .home-entry-side {", "入口列");
  assert.match(columns, /display:\s*flex/);
  assert.match(columns, /gap:\s*0/);
  const side = findRule(".home-entry-side {\n    align-self: start;", "次入口列");
  assert.match(side, /align-self:\s*start/);
  assert.match(side, /padding-top:\s*clamp\(80px, 12vw, 160px\)/);

  assert.match(css, /\.home-entry-line:is\(:hover, :focus-visible, \[data-current="true"\]\)/);
  assert.match(css, /\.home-entry-rule\s*\{[^}]*transform:\s*scaleX\(0\)/);
  assert.match(css, /\.home-entry-line:is\(:hover, :focus-visible, \[data-current="true"\]\) \.home-entry-rule\s*\{[^}]*scaleX\(1\)/);
});

test("首页浅色内容恢复深色墨字，所有文字容器与其背景构成可读对比", () => {
  const shell = findRule(".personal-home {", "首页深色边缘");
  assert.match(shell, /background:[\s\S]*?linear-gradient[\s\S]*?#042421/);
  const body = findRule(".home-body {", "首页亮色文字容器");
  assert.match(body, /background:\s*#e3f1ef/);
  assert.match(body, /color:\s*#103733/);
  assert.match(body, /border-radius:\s*4px/);
  assert.match(css, /\.home-section-head h2,[\s\S]*?color:\s*#103733/);
  assert.match(css, /\.home-section-head p:last-child\s*\{[^}]*color:\s*#2f504d/);
  assert.match(css, /\.home-text-link\s*\{[^}]*color:\s*#15564c/);
  assert.match(css, /\.home-fact-label,[\s\S]*?color:\s*#2f504d/);
  assert.match(css, /\.home-stage\s*\{[^}]*background:\s*#f7fffc/);
  assert.match(css, /\.home-stage\s*\{[^}]*color:\s*#103733/);
  assert.match(css, /\.home-writing\s*\{[^}]*background:\s*#f7fffc/);
  assert.match(css, /\.home-note-index\s*\{[^}]*color:\s*#103733/);
  assert.match(css, /\.home-about-note\s*\{[^}]*background:\s*#e3f1ef/);
  assert.match(css, /\.home-about-note\s*\{[^}]*color:\s*#103733/);
  assert.match(css, /\.home-letter-note\s*\{[^}]*background:\s*#103733/);
  assert.match(css, /\.home-letter-note\s*\{[^}]*color:\s*#f4fffb/);
  assert.match(css, /\.home-letter-link\s*\{[^}]*color:\s*#a9dccc/);
  assert.match(css, /\.home-eyebrow\s*\{[^}]*color:\s*#15564c/);
  assert.match(css, /\.dark-eyebrow\s*\{[^}]*color:\s*#15564c/);
  assert.doesNotMatch(css, /\.home-hero\s*\{[\s\S]*?border-radius:\s*24px/);
});

test("北京时间潮汐栏复用真实时钟与真实路由序号，不编造状态", () => {
  assert.match(clockStore, /timeZone: "Asia\/Shanghai"/);
  assert.match(home, /formatClock\(/);
  assert.match(home, /useClockSeconds/);
  assert.match(home, /from "@\/components\/desktop\/clock-store"/);
  assert.match(home, /home-tide-clock/);
  assert.match(home, /北京/);
  assert.match(pageFrame, /formatClock\(/);
  assert.match(pageFrame, /useClockSeconds/);
  assert.match(pageFrame, /from "@\/components\/desktop\/clock-store"/);
  assert.match(pageFrame, /fullpage-tide-clock/);
  assert.match(pageFrame, /String\(appIndex \+ 1\)\.padStart\(2, "0"\)/);
  assert.match(pageFrame, /app\?\.title/);
  const tideClock = findRule(".home-tide-clock,\n  .fullpage-tide-clock {", "共享潮汐栏");
  assert.match(tideClock, /border-top:\s*1px solid/);
  assert.match(css, /\.home-tide-clock\s*\{[^}]*position:\s*absolute/);
  assert.match(css, /\.fullpage-tide-clock\s*\{[^}]*position:\s*sticky/);
  assert.doesNotMatch(home, /在线人数|心跳|假数据|示例文章(?!占位)/);
  assert.doesNotMatch(pageFrame, /在线人数|心跳|示例文章|假数据/);
});

test("全页入口共享深色边缘与亮色实底文字容器，不再给每张卡套统一大圆角", () => {
  assert.match(css, /\.fullpage-shell\s*\{[\s\S]*?linear-gradient[\s\S]*?#042421/);
  assert.match(css, /\.fullpage-main\s*\{[^}]*background:\s*rgb\(244 255 251 \/ 0\.96\)/);
  assert.match(css, /\.fullpage-main\s*\{[^}]*border-radius:\s*4px/);
  const paper = findRule(".fullpage-main > :is(", "全页文字容器");
  assert.match(paper, /background:\s*transparent/);
  assert.match(paper, /border:\s*0/);
  assert.match(paper, /box-shadow:\s*none/);
  assert.match(css, /\.fullpage-topbar\s*\{[^}]*border-radius:\s*0/);
  assert.match(css, /\.fullpage-topbar\s*\{[^}]*background:\s*rgb\(4 36 33 \/ 0\.92\)/);
  assert.match(css, /\.fullpage-topbar\s*\{[^}]*color:\s*#f4fffb/);
  assert.match(css, /\.fullpage-brand,[\s\S]*?color:\s*#f4fffb/);
  assert.match(css, /\.fullpage-nav-link\s*\{[^}]*color:\s*#bad6cf/);
  assert.match(css, /\.fullpage-nav-link:is\(:hover, :focus-visible, \[aria-current="page"\]\)\s*\{[^}]*background:\s*transparent[^}]*color:\s*#f4fffb/);
  assert.match(css, /\.fullpage-nav-link::after/);
  assert.match(css, /\.fullpage-footer\s*\{[^}]*background:\s*#042421/);
  assert.match(pageFrame, /<nav className="fullpage-nav"/);
  assert.match(pageFrame, /primaryApps\.map/);
  assert.match(pageFrame, /<main/);
});

test("新动效只用一条线的 opacity/transform，无脚本与减少动效都保留静态终态", () => {
  const entryRule = findRule(".home-entry-rule {", "入口指示线");
  assert.doesNotMatch(entryRule, /animation:/);
  assert.match(css, /@keyframes home-tide-breathe\s*\{[\s\S]*?opacity/);
  assert.match(css, /@keyframes home-tide-flow\s*\{[\s\S]*?transform:\s*translate3d/);
  const tideBase = findRule(".home-tide-breathe,\n.home-tide-flow {", "潮汐基础态");
  assert.match(tideBase, /opacity:\s*0\.7/);
  const marker = "@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {";
  const gateStart = css.indexOf(marker);
  assert.notEqual(gateStart, -1, "缺少组合动效门");
  let depth = 0;
  let gateEnd = -1;
  for (let index = gateStart; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        gateEnd = index;
        break;
      }
    }
  }
  assert.notEqual(gateEnd, -1, "组合动效门未闭合");
  const gate = css.slice(gateStart, gateEnd + 1);
  const outside = `${css.slice(0, gateStart)}\n${css.slice(gateEnd + 1)}`;
  for (const name of ["home-tide-breathe", "home-tide-flow"]) {
    assert.match(gate, new RegExp(`animation:\\s*${name}\\b`), `${name} 未进门`);
    assert.doesNotMatch(outside, new RegExp(`animation:\\s*${name}\\b`), `${name} 出现在门外`);
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.home-tide-breathe,[\s\S]*?\.home-tide-flow,[\s\S]*?animation:\s*none !important/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)[\s\S]*?\.fullpage-main/);
  assert.doesNotMatch(home, /<canvas|<video|WebGL|three|gsap/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.home-entry-index\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
});
