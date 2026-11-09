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
  new URL("../src/components/desktop/desktop-home.tsx", import.meta.url),
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

test("首页保留请求期边界与图标壳流式洞", () => {
  assert.match(page, /import \{ connection \} from "next\/server"/);
  assert.match(page, /await connection\(\)/);
  assert.match(page, /export const instant = false/);
  assert.match(page, /<Suspense fallback=\{<ReadingFallback label="实时状态" \/>\}>/);
  assert.match(page, /<Suspense fallback=\{<ReadingFallback label="每日日志" \/>\}>/);
  assert.match(page, /<Suspense fallback=\{<ReadingFallback label="生活胶囊" \/>\}>/);
  assert.match(page, /<Suspense fallback=\{<ReadingFallback label="代码片段" \/>\}>/);
  assert.match(page, /<Suspense fallback=\{<ReadingFallback label="关于本机" \/>\}>/);
  assert.match(page, /<Suspense fallback=\{<ReadingFallback label="最近日志" \/>\}>/);
  assert.match(page, /<Suspense fallback=\{null\}>/);
  assert.match(page, /const readLife = cache\(\(\) => getMoments\(\)\)/);
  assert.match(page, /const readActivity = cache\(\(\) => getGithubActivity\(\)\)/);
  assert.match(page, /status=\{siteConfig\.status\}/);
});

test("首页窗口键与客户端 DesktopHome 接口保持原样", () => {
  for (const key of [
    "life:",
    "gallery:",
    "projects:",
    "snippets:",
    "about:",
    "more:",
  ]) {
    assert.ok(page.includes(`    ${key}`), `missing windowContent key ${key}`);
  }
  assert.doesNotMatch(page, /<DesktopHome[\s\S]*?statusSentence=/);
  assert.doesNotMatch(home, /statusSentence/);
  assert.match(home, /interface DesktopHomeProps \{[\s\S]*?status: string;/);
  assert.match(home, /windowContent: Record<string, ReactNode>;/);
  assert.doesNotMatch(home, /\bstatusSentence\?: ReactNode;/);
});

test("首页胶囊窗口只取最近 12 张真实图片", () => {
  assert.match(page, /galleryImages\.slice\(0, 12\)/);
  assert.match(page, /首页窗口只铺最近 12 张；完整相册在 \/gallery。/);
  assert.doesNotMatch(page, /galleryImages\.slice\(0, 24\)/);
});

test("关于本机 Apps 行取桌面应用注册表真实数量", () => {
  assert.match(about, /import \{ desktopTileApps \} from "@\/config\/apps"/);
  assert.match(about, /\{ label: "Apps", value: String\(desktopTileApps\.length\) \}/);
  assert.match(about, /\{ label: "AI", value: chatEnabled \? "已配置" : "未配置" \}/);
  assert.match(about, /NOT AVAILABLE/);
});

test("友链为空时 Spotlight 与无脚本导航都隐藏好友页", () => {
  assert.match(shell, /publicApps\.filter\(\(app\) => app\.id !== "friends" \|\| hasFriends\)/);
  assert.match(shell, /noScriptApps\.map/);
  assert.match(shell, /hasFriends=\{hasFriends\}/);
  assert.match(palette, /launcherAppIndex\.filter\(\(app\) => app\.id !== "friends" \|\| hasFriends\)/);
  assert.match(palette, /hasFriends: boolean;/);
});
