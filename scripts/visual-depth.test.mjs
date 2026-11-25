import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const css = read("../src/app/globals.css");
const home = read("../src/components/home/personal-home.tsx");
const pageFrame = read("../src/components/desktop/page-frame.tsx");
const packageJson = read("../package.json");

test("背景层次与加强动效回归进入全量测试命令", () => {
  assert.match(packageJson, /scripts\/visual-depth\.test\.mjs/);
});

test("首页首屏有可见的大幅水位、雨线、光晕与轨道动效", () => {
  assert.match(home, /Array\.from\(\{ length: 28 \}/);
  for (const className of [
    "home-weather-tide-a",
    "home-weather-tide-b",
    "home-weather-orb",
    "home-weather-ring",
    "home-weather-rain",
  ]) {
    assert.match(home, new RegExp(`className="${className}"`));
  }
  assert.match(css, /\.home-weather-tide-a,[\s\S]*?height:\s*clamp\(120px, 18vw, 240px\)/);
  assert.match(css, /@keyframes home-tide-wave \{[\s\S]*?translate3d\([^)]*\)/);
  assert.match(css, /@keyframes home-rain-fall \{[\s\S]*?translate3d\([^)]*100vh/);
  assert.match(css, /@keyframes home-orb-drift \{[\s\S]*?translate3d\([^)]*\)/);
  assert.match(css, /\.home-weather-rain > span \{[\s\S]*?opacity:\s*0\.9/);
  assert.match(css, /\.home-weather-rain > span \{[\s\S]*?width:\s*2px/);
  assert.match(css, /\.home-weather-rain > span \{[\s\S]*?height:\s*clamp\(60px, 8vw, 110px\)/);
  assert.match(css, /animation: home-tide-wave 9s/);
  assert.match(css, /animation: home-rain-fall 1\.6s/);
  assert.match(css, /animation: home-orb-drift 14s/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?home-weather-tide-a,[\s\S]*?home-weather-orb,[\s\S]*?animation: none !important/
  );
});

test("全页外壳有分层深色边缘背景，文字容器仍是亮色纸面", () => {
  assert.match(pageFrame, /className="fullpage-shell"/);
  assert.match(
    css,
    /\.fullpage-shell \{[\s\S]*?background:[\s\S]*?linear-gradient[\s\S]*?radial-gradient[\s\S]*?#042421/
  );
  assert.match(
    css,
    /\.fullpage-shell::before \{[\s\S]*?position:\s*fixed[\s\S]*?background:[\s\S]*?repeating-linear-gradient/
  );
  assert.match(
    css,
    /\.fullpage-main \{[\s\S]*?background:\s*rgb\(244 255 251 \/ 0\.96\)[\s\S]*?border:[\s\S]*?box-shadow:/
  );
  assert.match(css, /\.fullpage-main > \.about-page/);
  assert.match(css, /\.fullpage-footer \{[\s\S]*?color:\s*#f4fffb/);
  assert.match(css, /\.fullpage-shell \.card-surface/);
  assert.match(css, /\.personal-home \{[\s\S]*?position:\s*relative[\s\S]*?linear-gradient/);
  assert.match(css, /\.home-body \{[\s\S]*?background:\s*#e3f1ef/);
});

test("不同入口有可区分的背景纹样，但字体与正文色板保持不变", () => {
  const shell = css.slice(css.indexOf(".fullpage-shell {"));
  assert.match(shell, /data-page-theme="terminal"/);
  assert.match(shell, /data-page-theme="assistant"/);
  assert.match(shell, /data-page-theme="notes"/);
  assert.match(shell, /--page-accent:\s*#a9dccc/);
  assert.match(shell, /--page-accent:\s*#15564c/);
  assert.match(pageFrame, /data-page-theme=\{pageTheme\}/);
  assert.match(pageFrame, /data-readable-theme=/);
  assert.match(css, /--color-muted-foreground:\s*var\(--muted-foreground\)/);
});

test("边缘背景仅用 transform/opacity 动效，无 JS 与减少动效保持静态", () => {
  assert.match(css, /\.fullpage-shell::before \{[\s\S]*?animation:\s*none/);
  assert.match(
    css,
    /@media \(scripting: enabled\) and \(prefers-reduced-motion: no-preference\)[\s\S]*?\.fullpage-shell::before \{[\s\S]*?animation:\s*fullpage-drift/
  );
  assert.match(css, /@keyframes fullpage-drift \{[\s\S]*?transform:\s*translate3d/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.fullpage-shell::before \{[\s\S]*?animation:\s*none !important/
  );
});
