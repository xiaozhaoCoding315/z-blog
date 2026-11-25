import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(
  new URL("../src/app/(site)/page.tsx", import.meta.url),
  "utf8"
);
const about = readFileSync(
  new URL("../src/components/about/about-profile.tsx", import.meta.url),
  "utf8"
);
const home = readFileSync(
  new URL("../src/components/home/personal-home.tsx", import.meta.url),
  "utf8"
);
const shell = readFileSync(
  new URL("../src/components/desktop/desktop-shell.tsx", import.meta.url),
  "utf8"
);
const palette = readFileSync(
  new URL("../src/components/search/search-palette.tsx", import.meta.url),
  "utf8"
);
const aboutPage = readFileSync(
  new URL("../src/app/(site)/(apps)/about/page.tsx", import.meta.url),
  "utf8"
);

test("关于页声明允许阻塞导航，避免开发期 instant-shell 噪声", () => {
  assert.match(aboutPage, /export const instant = false/);
});

test("首页保留请求期边界与流式状态洞", () => {
  assert.match(page, /import \{ connection \} from "next\/server"/);
  assert.match(page, /await connection\(\)/);
  assert.match(page, /export const instant = false/);
  assert.match(page, /<Suspense fallback=\{<ReadingFallback label="实时状态" \/>\}>/);
  assert.match(page, /status=\{siteConfig\.status\}/);
  assert.match(page, /ReadingFallback/);
});

test("首页改为 PersonalHome，七入口全部链接到完整页面", () => {
  assert.match(page, /import \{ PersonalHome, type HomeNote \} from "@\/components\/home\/personal-home"/);
  assert.match(page, /<PersonalHome/);
  assert.doesNotMatch(page, /<DesktopHome/);
  assert.match(home, /interface PersonalHomeProps \{[\s\S]*?status: string;/);
  assert.doesNotMatch(home, /windowContent/);
  assert.match(home, /href=\{app\.path \?\? "\/"\}/);
  assert.doesNotMatch(home, /openApp\(app\.id\)/);
  assert.doesNotMatch(page, /KanbanBoard|AboutProfile|windowContent/);
});

test("关于页不再展示 neofetch 读数，只留人与站点", () => {
  // OS / Host / Shell / Apps / Theme 这类构建参数对访客没有意义，
  // 删掉后页面只回答「这是谁、在做什么、能力到哪」。
  assert.doesNotMatch(about, /os-about-neofetch/);
  assert.doesNotMatch(about, /label: "Shell"/);
  assert.doesNotMatch(about, /label: "Theme"/);
  assert.match(about, /skillGroups\.map/);
  assert.match(about, /关于本站/);
});

test("无脚本导航与 Spotlight 只索引主入口", () => {
  assert.match(shell, /noScriptApps = useMemo\(\(\) => publicApps, \[\]\)/);
  assert.match(shell, /noScriptApps\.map/);
  assert.match(palette, /const launcherAppIndex = primaryApps\.map/);
  assert.doesNotMatch(palette, /hasFriends: boolean;/);
});
