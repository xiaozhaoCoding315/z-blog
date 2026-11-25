/**
 * 页面氛围层守卫：各页有各自的气质，但不抢音乐页的琴弦语言。
 *   node --test scripts/page-effects.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const layout = read("../src/app/layout.tsx");
const siteLayout = read("../src/app/(site)/layout.tsx");
const ambient = read("../src/components/ambient/page-ambient.tsx");
const css = read("../src/app/ambient.css");
const motionCss = read("../src/app/motion.css");

test("氛围层样式接在歌词样式之后，并挂在站点布局里", () => {
  assert.match(
    layout,
    /import "\.\/globals\.css";\s*import "\.\/motion\.css";\s*import "\.\/lyrics\.css";\s*import "\.\/ambient\.css";/
  );
  assert.match(siteLayout, /import \{ PageAmbient \}/);
  assert.match(siteLayout, /<PageAmbient \/>/);
  assert.match(ambient, /export function PageAmbient/);
});

test("每个入口有自己的氛围，助手页用专属神经侧翼，音乐页让位", () => {
  for (const [prefix, variant] of [
    ["/notes", "ink"],
    ["/journal", "ink"],
    ["/write", "ink"],
    ["/projects", "blueprint"],
    ["/gallery", "film"],
    ["/letters", "letters"],
    ["/life", "life"],
  ]) {
    assert.match(
      ambient,
      new RegExp(`\\["${prefix}", "${variant}"\\]`),
      `${prefix} 缺少 ${variant} 氛围`
    );
  }
  assert.match(ambient, /pathname === "\/assistant"[\s\S]{0,60}return "cortex"/);
  assert.match(ambient, /pathname === "\/playlist"/);
  assert.match(ambient, /pathname === "\/terminal"/);
  assert.match(ambient, /return null/);
  // 助手页的侧翼只读页面时间：不读音频，也不用琴弦 / 钢琴语言。
  assert.match(ambient, /drawCortex/);
  assert.match(ambient, /wing\(1, 1450\)/);
  assert.match(ambient, /wing\(-1, 2650\)/);
  assert.doesNotMatch(ambient, /audioRef/);
  assert.doesNotMatch(ambient, /sectionAt/);
  assert.doesNotMatch(ambient, /<LyricsStage/);
});

test("氛围层省电：DPR 上限、页面隐藏暂停、卷动被动监听、减少动效只画静态帧", () => {
  assert.match(ambient, /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);
  assert.match(ambient, /document\.hidden/);
  assert.match(ambient, /visibilitychange/);
  assert.match(ambient, /addEventListener\("scroll", onScroll, \{ passive: true \}\)/);
  assert.match(ambient, /prefers-reduced-motion: reduce/);
  assert.match(ambient, /if \(reduced\) \{[\s\S]{0,160}drawStatic\(\)/);
  assert.match(ambient, /cancelAnimationFrame\(frameId\)/);
});

test("氛围层的画面与音乐琴弦在视觉语言上分开", () => {
  assert.match(css, /\.page-ambient\s*\{/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /z-index:\s*44/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /mask-image:\s*radial-gradient/);
  assert.match(css, /mix-blend-mode:\s*normal/);
  assert.doesNotMatch(css, /mix-blend-mode:\s*(screen|multiply)/);
  // 音乐页的高饱和琴弦与和弦色不进入常规页面
  assert.doesNotMatch(css, /lyrics-accent|#f0c96b|#7fd6c2/);
  assert.doesNotMatch(ambient, /chorus|piano|beat/i);
  assert.match(motionCss, /\.scroll-progress/);
});