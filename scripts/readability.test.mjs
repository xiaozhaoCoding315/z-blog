import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const css = read("../src/app/globals.css");
const packageJson = read("../package.json");
const aboutPage = read("../src/app/(site)/(apps)/about/page.tsx");
const aboutProfile = read("../src/components/about/about-profile.tsx");
const notesPage = read("../src/app/(site)/(apps)/notes/page.tsx");
const noteSlugPage = read("../src/app/(site)/(apps)/notes/[slug]/page.tsx");
const blogBrowser = read("../src/components/blog/blog-browser.tsx");
const postCard = read("../src/components/blog/post-card.tsx");
const preBlock = read("../src/components/mdx/pre-block.tsx");
const blogSources = readdirSync(new URL("../src/components/blog", import.meta.url))
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => read(`../src/components/blog/${name}`))
  .join("\n");

function findBlock(marker, label) {
  const start = css.indexOf(marker);
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

function declarations(source) {
  const found = {};
  for (const match of source.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    found[match[1]] = match[2].trim();
  }
  return found;
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

const LIGHT_SCOPE = ".fullpage-shell,\n  .home-body {";
const DARK_ISLAND = ".fullpage-shell :is(";

test("浅色全页回归进入全量测试命令", () => {
  assert.match(packageJson, /scripts\/readability\.test\.mjs/);
});

test("浅色全页与首页正文区自带完整亮色 token，不再继承夜间浅字", () => {
  const block = findBlock(LIGHT_SCOPE, "浅色阅读作用域");
  const tokens = declarations(block);

  for (const token of [
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
  ]) {
    assert.match(tokens[token] ?? "", /^#[0-9a-f]{6}$/i, `缺少亮色 --${token}`);
  }
  for (const [alias, raw] of [
    ["background", "desk"],
    ["foreground", "ink"],
    ["card", "window"],
    ["popover", "window-2"],
    ["primary", "phosphor"],
    ["secondary", "window-2"],
    ["muted", "window-2"],
    ["muted-foreground", "ink-dim"],
    ["accent", "window-2"],
    ["destructive", "danger"],
    ["border", "rule"],
    ["input", "rule"],
    ["ring", "phosphor"],
  ]) {
    assert.equal(tokens[alias], `var(--${raw})`, `亮色 --${alias} 应重新指向本地原始色`);
  }
  assert.match(block, /color-scheme:\s*light/);
  assert.doesNotMatch(block, /#f4fffb|#bad6cf/i, "夜间浅色文字不能漏进亮色作用域");

  assert.ok(contrast(tokens.ink, tokens["window-2"]) >= 7, "正文至少 7:1");
  for (const token of ["ink-dim", "phosphor", "ok", "warn", "danger", "info"]) {
    assert.ok(
      contrast(tokens[token], tokens["window-2"]) >= 4.5,
      `${token} 至少 4.5:1`
    );
    assert.ok(chroma(tokens[token]) <= 0.12, `${token} 彩度过高`);
  }
  assert.ok(contrast(tokens.rule, tokens["window-2"]) >= 3, "1px 边界至少 3:1");
  assert.ok(
    contrast(tokens["primary-foreground"], tokens.phosphor) >= 4.5,
    "主色前景至少 4.5:1"
  );
  assert.match(css, /\.fullpage-shell\s*\{[^}]*background:[\s\S]*?linear-gradient/);
  const paper = findBlock(".fullpage-main {", "亮色纸面容器");
  assert.match(paper, /background:\s*rgb\(244 255 251 \/ 0\.96\)/);
  assert.match(paper, /min-height:\s*calc\(100dvh - 124px\)/);
  const bareContent = findBlock(".fullpage-main > :is(", "无边框内容容器");
  assert.match(bareContent, /background:\s*transparent/);
});

test("终端、助理首屏与代码块保留独立夜间色板", () => {
  const block = findBlock(DARK_ISLAND, "深色岛屿作用域");
  assert.match(block, /\.standalone-terminal-shell/);
  assert.match(block, /\.assistant-hero/);
  assert.match(block, /figure\[data-rehype-pretty-code-figure\]/);
  const tokens = declarations(block);
  assert.equal(tokens.window, "#0c2c29");
  assert.equal(tokens.ink, "#f4fffb");
  assert.equal(tokens["ink-dim"], "#bad6cf");
  assert.equal(tokens.rule, "#28534d");
  assert.equal(tokens.phosphor, "#a9dccc");
  assert.equal(tokens.foreground, "var(--ink)");
  assert.equal(tokens["muted-foreground"], "var(--ink-dim)");

  assert.match(css, /--code-bg:\s*#0c2c29/);
  assert.match(
    css,
    /\.fullpage-shell \[data-rehype-pretty-code-title\][^{]*\{[^}]*color:\s*#bad6cf/
  );
  assert.match(
    css,
    /\.fullpage-shell \.prose img\[src\*="\/images\/diagrams\/"\] \{[^}]*filter:\s*none/
  );
  assert.doesNotMatch(noteSlugPage, /dark:prose-invert/);
});

test("代码块按图形与行内分别锁色，切换壁纸也不压低文字对比度", () => {
  const block = findBlock(DARK_ISLAND, "深色岛屿作用域");
  assert.match(block, /figure\[data-rehype-pretty-code-figure\]/);
  assert.doesNotMatch(block, /(?<!figure)\[data-rehype-pretty-code-figure\]/);
  assert.match(
    css,
    /:root \.fullpage-shell figure\[data-rehype-pretty-code-figure\] :is\(pre, code\) \{[^}]*color:\s*#f4fffb/
  );
  assert.match(
    css,
    /:root \.fullpage-shell figure\[data-rehype-pretty-code-figure\] code span \{[^}]*color:\s*var\(--shiki-dark, #e6edf3\)/
  );
  assert.match(
    css,
    /:root \.fullpage-shell span\[data-rehype-pretty-code-figure\] code span \{[^}]*color:\s*var\(--shiki-light, #24292f\)/
  );
});

test("七个主入口与首页统一 13px 辅助字下限，助理正文升到 16px", () => {
  const smallText = findBlock(
    ":is(.fullpage-shell, .personal-home) :is(",
    "通用小字兜底"
  );
  for (const size of [9, 10, 11]) {
    assert.ok(
      smallText.includes(`[class~="text-[${size}px]"]`),
      `兜底规则缺少 text-[${size}px]`
    );
  }
  assert.match(smallText, /font-size:\s*13px/);
  assert.match(smallText, /line-height:\s*1\.6/);
  assert.match(smallText, /letter-spacing:\s*0\.02em/);
  for (const selector of [
    "\\.home-eyebrow",
    "\\.home-rail",
    "\\.home-rotating-lines > span",
    "\\.home-scroll-cue span",
    "\\.os-status-date",
    "\\.os-status-chevron",
    "\\.os-status-readings",
    "\\.os-status-value",
    "\\.os-status-manual",
    "\\.os-status-updated",
    "\\.home-note-visual-index",
    "\\.os-pane-label",
    "\\.os-kanban-reset",
    "\\.os-kanban-empty",
    "\\.os-kanban-card-stack",
    "\\.os-kanban-status",
    "\\.os-kanban-card-links",
    "\\.os-kanban-column-head h2",
    "\\.os-kanban-count",
    "\\.os-kanban-card-tagline",
    "\\.os-kanban-card-meta button",
    "\\[data-rehype-pretty-code-title\\]",
  ]) {
    assert.match(smallText, new RegExp(selector));
  }

  assert.match(
    css,
    /\.fullpage-shell :is\(\s*\.standalone-terminal-head,[\s\S]*?\.assistant-composer-meta\s*\)\s*\{[^}]*font-size:\s*13px/
  );
  assert.match(
    css,
    /\.fullpage-shell \.assistant-hero p,[\s\S]*?\.assistant-composer-row textarea\s*\{[^}]*font-size:\s*16px/
  );
  assert.match(css, /\.fullpage-shell \.os-terminal \{[^}]*font-size:\s*14px/);
  assert.match(
    css,
    /@media \(max-width: 767px\)[\s\S]*?\.os-mobile-dock-link \{[^}]*font-size:\s*13px/
  );
});

test("全页文章用亮色编辑式排版，中文正文与等宽数据分工明确", () => {
  const prose = findBlock(".fullpage-shell .prose {", "亮色文章排版");
  assert.match(prose, /font-family:\s*var\(--font-sans\)/);
  assert.match(prose, /--tw-prose-body:\s*var\(--ink\)/);
  assert.match(prose, /--tw-prose-captions:\s*var\(--ink-dim\)/);
  assert.match(noteSlugPage, /prose prose-base sm:prose-lg/);
  assert.match(noteSlugPage, /text-\[13px\] leading-5 text-muted-foreground/);
  assert.doesNotMatch(noteSlugPage, /text-foreground\/60|text-\[1[01]px\]/);
  assert.doesNotMatch(preBlock, /text-muted-foreground\/80|text-\[10px\]/);
  for (const source of blogSources) {
    assert.doesNotMatch(source, /text-\[(?:9|10|11)px\]/);
  }
});

test("关于页建立 32 / 20 / 16 / 13 的清晰层级，正文不再用 13–15px 浅灰字", () => {
  assert.match(aboutPage, /className="about-page/);
  assert.match(css, /\.fullpage-shell \.about-page\s*\{[^}]*font-family:\s*var\(--font-sans\)/);
  assert.match(css, /\.fullpage-shell \.about-page\s*\{[^}]*max-width:\s*760px/);
  assert.match(aboutProfile, /about-title/);
  assert.match(css, /\.about-title\s*\{[^}]*font-size:\s*clamp\(2rem/);
  assert.match(css, /\.reading-body\s*\{[^}]*font-size:\s*16px;[^}]*line-height:\s*1\.75/);
  assert.match(css, /\.reading-meta\s*\{[^}]*font-size:\s*13px/);
  assert.doesNotMatch(aboutProfile, /text-\[(?:9|10|11|13|14|15)px\]|text-sm/);
  assert.doesNotMatch(aboutProfile, /uppercase tracking-\[0\.14em\]/);

  // neofetch 读数表已删：页面不再有 key/value 行与「客户端可切换」提示。
  assert.doesNotMatch(aboutProfile, /os-about-row|os-about-hint/);
});

test("笔记列表的标题、摘要、筛选与元信息有可扫读的字号和行高", () => {
  assert.match(notesPage, /text-\[13px\] leading-5/);
  assert.doesNotMatch(notesPage, /text-\[11px\]/);
  assert.match(blogBrowser, /text-\[15px\] leading-6/);
  assert.match(blogBrowser, /placeholder:text-muted-foreground/);
  assert.match(blogBrowser, /text-\[13px\] leading-6/);
  assert.doesNotMatch(
    blogBrowser,
    /placeholder:text-muted-foreground\/60|text-\[11px\]|text-sm/
  );
  assert.match(postCard, /text-\[19px\]/);
  assert.match(postCard, /text-\[15px\] leading-\[1\.65\] text-muted-foreground/);
  assert.match(postCard, /text-\[12px\] leading-5/);
  assert.doesNotMatch(postCard, /text-\[(?:11|13)px\]/);
});
