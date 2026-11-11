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

test("关于本机 Apps 行取主入口注册表真实数量", () => {
  assert.match(about, /import \{ primaryApps \} from "@\/config\/apps"/);
  assert.match(about, /\{ label: "Apps", value: String\(primaryApps\.length\) \}/);
  assert.match(about, /\{ label: "AI", value: chatEnabled \? "已配置" : "未配置" \}/);
  assert.match(about, /NOT AVAILABLE/);
});

test("无脚本导航与 Spotlight 只索引主入口", () => {
  assert.match(shell, /noScriptApps = useMemo\(\(\) => publicApps, \[\]\)/);
  assert.match(shell, /noScriptApps\.map/);
  assert.match(palette, /const launcherAppIndex = primaryApps\.map/);
  assert.doesNotMatch(palette, /hasFriends: boolean;/);
});
