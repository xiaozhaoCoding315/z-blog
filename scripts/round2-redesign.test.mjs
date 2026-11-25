import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  apps,
  desktopTileApps,
  findAppById,
  findAppByPath,
  isPrimaryAppId,
  launcherApps,
  primaryApps,
  publicApps,
} from "../src/config/apps.ts";
import { SAVED_RECT_APP_IDS } from "../src/components/desktop/window-state.ts";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../src/app/(site)/page.tsx", import.meta.url), "utf8");
const shell = readFileSync(
  new URL("../src/components/desktop/desktop-shell.tsx", import.meta.url),
  "utf8"
);
const palette = readFileSync(
  new URL("../src/components/search/search-palette.tsx", import.meta.url),
  "utf8"
);
const mobileDock = readFileSync(
  new URL("../src/components/desktop/mobile-dock.tsx", import.meta.url),
  "utf8"
);
const letters = readFileSync(
  new URL("../src/app/(site)/(apps)/letters/page.tsx", import.meta.url),
  "utf8"
);
const letterForm = readFileSync(
  new URL("../src/components/letters/letter-form.tsx", import.meta.url),
  "utf8"
);
const about = readFileSync(
  new URL("../src/components/about/about-profile.tsx", import.meta.url),
  "utf8"
);
const terminal = readFileSync(
  new URL("../src/components/terminal/terminal-window.tsx", import.meta.url),
  "utf8"
);
const rootLayout = readFileSync(
  new URL("../src/app/layout.tsx", import.meta.url),
  "utf8"
);
const nextConfig = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const personalHomePath = new URL(
  "../src/components/home/personal-home.tsx",
  import.meta.url
);

function readPersonalHome() {
  return readFileSync(personalHomePath, "utf8");
}

test("主入口恰好七个，顺序与用户指定一致", () => {
  assert.deepEqual(primaryApps.map((app) => app.id), [
    "terminal",
    "projects",
    "about",
    "playlist",
    "notes",
    "assistant",
    "letters",
  ]);
  assert.equal(primaryApps.length, 7);
});

test("信箱改名为留言板，路径与旧 308 不变", () => {
  const lettersApp = findAppById("letters");
  assert.equal(lettersApp?.title, "留言板");
  assert.equal(lettersApp?.path, "/letters");
  assert.ok(lettersApp?.keywords.includes("留言板"));
  assert.match(letters, /<h1[^>]*>留言板<\/h1>/);
  assert.match(letterForm, /已放进留言板/);
  assert.match(letterForm, /写进留言板/);
  assert.match(about, />\s*留言板\s*</);
  assert.match(nextConfig, /source: "\/guestbook", destination: "\/letters", permanent: true/);
});

test("隐藏应用保留注册表与几何，但退出桌面/启动器/公开导航", () => {
  const hidden = [
    "life",
    "gallery",
    "snippets",
    "shelf",
    "more",
    "journal",
    "friends",
  ];
  for (const id of hidden) {
    const app = findAppById(id);
    assert.ok(app, `${id} 应保留兼容条目`);
    assert.equal(app.desktop, false, `${id} 不应出现在桌面入口`);
    assert.equal(app.launcher, false, `${id} 不应出现在启动器`);
    assert.equal(app.public, false, `${id} 不应出现在公开导航`);
  }
  assert.equal(findAppByPath("/life/42")?.id, "life");
  assert.equal(findAppByPath("/notes/hello")?.id, "notes");
  for (const id of SAVED_RECT_APP_IDS) {
    assert.ok(findAppById(id)?.window, `${id} 窗口几何应保留`);
  }
  assert.equal(apps.length, 19, "ICON_KEYS 与注册表不删条目");
  assert.equal(desktopTileApps.length, 0, "新首页不再使用左侧图标网格");
});

test("启动器、Spotlight 与无脚本导航只列七个主入口 + 系统设置", () => {
  assert.deepEqual(launcherApps.map((app) => app.id), [
    "terminal",
    "projects",
    "about",
    "playlist",
    "notes",
    "assistant",
    "letters",
    "settings",
  ]);
  assert.deepEqual(
    publicApps.map((app) => app.path),
    ["/terminal", "/projects", "/about", "/playlist", "/notes", "/assistant", "/letters"]
  );
  assert.match(palette, /import \{ primaryApps \} from "@\/config\/apps"/);
  assert.match(shell, /noScriptApps = useMemo\(\(\) => publicApps, \[\]\)/);
  assert.match(palette, /const launcherAppIndex = primaryApps\.map/);
  assert.match(mobileDock, /href: "\/terminal"/);
  assert.match(mobileDock, /href: "\/notes"/);
  assert.match(mobileDock, /href: "\/assistant"/);
  assert.match(mobileDock, /href: "\/letters"/);
  assert.doesNotMatch(mobileDock, /href: "\/life"|href: "\/gallery"|href: "\/snippets"/);
});

test("首页保留请求期边界并改为 PersonalHome", () => {
  assert.match(page, /export const instant = false/);
  assert.match(page, /await connection\(\)/);
  assert.match(page, /import \{ PersonalHome, type HomeNote \} from "@\/components\/home\/personal-home"/);
  assert.match(page, /<PersonalHome/);
  assert.doesNotMatch(page, /<DesktopHome/);
  assert.match(page, /ReadingFallback/);
  assert.match(page, /<Suspense/);
});

test("新首页有自我介绍、七个完整页面索引、下滚区块与真实动态读数", () => {
  const home = readPersonalHome();
  assert.match(home, /className="home-hero"/);
  assert.match(home, /siteConfig\.author\.bio/);
  assert.match(home, /className="home-entry-index"/);
  assert.match(home, /className="home-entry-main"/);
  assert.match(home, /className="home-entry-side"/);
  assert.match(home, /href="#home-apps"/);
  assert.match(home, /<Clock\b/);
  assert.match(home, /home-scroll-cue|向下/);
  assert.match(home, /MAIN_ENTRIES\.map\(renderEntry\)/);
  assert.match(home, /href=\{app\.path \?\? "\/"\}/);
});

test("三套预设换成低彩度深青绿，themeColor 同步", () => {
  assert.match(css, /\.dark\s*\{[\s\S]*?--desk: #103733/);
  assert.match(css, /\[data-wallpaper="paper"\]\s*\{[\s\S]*?--desk: #e3f1ef/);
  assert.match(css, /\[data-wallpaper="blueprint"\]\s*\{[\s\S]*?--desk: #1a3033/);
  assert.match(css, /--phosphor: #a9dccc/);
  assert.match(css, /--phosphor: #1c6558/);
  assert.match(rootLayout, /themeColor: "#042421"/);
});

test("首页长滚动、非对称索引、波浪与水位线有专属样式", () => {
  assert.match(css, /\.os-shell\[data-home="true"\]/);
  assert.match(css, /\.home-hero\s*\{/);
  assert.match(css, /\.home-entry-index\s*\{/);
  assert.match(css, /\.home-entry-line\s*\{/);
  assert.match(css, /\.home-wave\s*\{/);
  assert.match(css, /\.home-tide-line\s*\{/);
  assert.match(css, /\.home-about-note\s*\{/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.home-entry-index/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*?\.home-tide-line/);
});

test("水位线入场动效只声明在组合门内，且基础态可见", () => {
  const marker = "@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {";
  const start = css.indexOf(marker);
  assert.notEqual(start, -1, "缺少组合门");
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
  assert.notEqual(end, -1, "组合门未闭合");
  const gate = css.slice(start, end + 1);
  const outside = `${css.slice(0, start)}\n${css.slice(end + 1)}`;
  for (const name of [
    "home-hero-in",
    "home-card-in",
    "home-tide-drift",
    "home-scroll-dot",
  ]) {
    assert.match(gate, new RegExp(`animation:\\s*${name}\\b`), `${name} 未进门`);
    assert.doesNotMatch(
      outside,
      new RegExp(`animation:\\s*${name}\\b`),
      `${name} 出现在门外`
    );
  }
  assert.match(css, /@keyframes home-hero-in[\s\S]*?from\s*\{/);
  assert.match(css, /@keyframes home-card-in[\s\S]*?from\s*\{/);
});

test("关于页只讲人与站点，不再报桌面读数", () => {
  // 「关于本机」的 neofetch 读数（OS / Shell / Theme / 应用数）已整段移除。
  assert.doesNotMatch(about, /primaryApps/);
  assert.doesNotMatch(about, /os-about-neofetch|os-about-row/);
  assert.match(about, /getAllNotes\(\)\.length/);
  assert.match(about, /skillGroups\.map/);
  assert.match(terminal, /import \{ isPrimaryAppId, primaryApps, findAppById \}/);
  assert.match(terminal, /desktopAppCount: primaryApps\.length/);
});

test("终端与窗口深链只渲染七个主入口，隐藏应用不再造幽灵窗口", () => {
  assert.equal(isPrimaryAppId("terminal"), true);
  assert.equal(isPrimaryAppId("assistant"), true);
  assert.equal(isPrimaryAppId("life"), false);
  assert.equal(isPrimaryAppId("gallery"), false);
  assert.equal(isPrimaryAppId("unknown"), false);
  assert.match(terminal, /import \{ isPrimaryAppId, primaryApps, findAppById \} from "@\/config\/apps"/);
  assert.match(terminal, /const terminalApps = primaryApps\.map/);
  assert.match(terminal, /if \(!isPrimaryAppId\(effect\.appId\)\) return;/);
  assert.doesNotMatch(rootLayout, /data-scroll-behavior="smooth"/);
});

test("旧 URL 四条 308 重定向保持原样", () => {
  for (const [source, destination] of [
    ["/blog", "/notes"],
    ["/archives", "/notes"],
    ["/changelog", "/journal"],
    ["/guestbook", "/letters"],
  ]) {
    assert.match(
      nextConfig,
      new RegExp(
        `source: "${source.replaceAll("/", "\\/")}", destination: "${destination.replaceAll("/", "\\/")}", permanent: true`
      )
    );
  }
});
