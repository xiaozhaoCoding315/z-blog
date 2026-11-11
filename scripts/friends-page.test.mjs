/**
 * 友链页守卫：数据可自行追加、沿用全页外壳与首页天气 / 潮汐语言、
 * 不占用七个主入口。
 *   node --test scripts/friends-page.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const portfolio = read("../src/config/portfolio.ts");
const page = read("../src/app/(site)/(apps)/friends/page.tsx");
const copy = read("../src/components/friends/friends-copy.tsx");
const home = read("../src/components/home/personal-home.tsx");
const apps = read("../src/config/apps.ts");
const layout = read("../src/app/layout.tsx");
const css = read("../src/app/friends.css");

test("友链数据源可自行追加，不摆占位站", () => {
  assert.match(portfolio, /export interface FriendLink/);
  assert.match(portfolio, /tags\?: string\[\]/);
  assert.match(portfolio, /export const friends: FriendLink\[\] = \[/);
  assert.doesNotMatch(portfolio, /example\.(com|org)/);
});

test("友链页复用首页天气与潮汐特效", () => {
  assert.match(page, /friends-hero/);
  for (const className of [
    "home-weather",
    "home-weather-orb",
    "home-weather-tide-a",
    "home-weather-rain",
    "home-ticker",
    "home-tide-line",
  ]) {
    assert.match(page, new RegExp(className), `友链页缺少 ${className}`);
  }
  assert.match(page, /data-reveal/);
  assert.match(page, /data-spotlight/);
  assert.match(page, /friend-card/);
  assert.match(page, /friends-empty/);
  assert.match(page, /friends-exchange/);
  assert.match(page, /FriendsCopy/);
});

test("友链卡片保留标签与复制交互，动效可降级", () => {
  assert.match(page, /friend-tags/);
  assert.match(page, /friend-tag/);
  assert.match(copy, /navigator\.clipboard\.writeText/);
  assert.match(copy, /document\.execCommand\("copy"\)/);
  assert.match(css, /\.friend-card:hover,[\s\S]{0,120}\.friend-card:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("首页新增友链区块，但不改动七个主入口", () => {
  assert.match(home, /import \{ friends \} from "@\/config\/portfolio"/);
  assert.match(home, /"friends"/);
  assert.match(home, /id="home-friends"/);
  assert.match(home, /home-friends/);
  assert.match(home, /href="\/friends"/);
  assert.match(
    apps,
    /PRIMARY_APP_IDS = \[\s*"terminal",\s*"projects",\s*"about",\s*"playlist",\s*"notes",\s*"assistant",\s*"letters",\s*\] as const/
  );
});

test("友链路由进入全页文档流，不占用七个主入口", () => {
  assert.match(apps, /id: "friends"[\s\S]{0,260}launcher: false/);
  assert.match(apps, /id: "friends"[\s\S]{0,260}public: false/);
  assert.match(
    apps,
    /pathname === "\/friends" \|\| pathname\.startsWith\("\/friends\/"\)/
  );
  assert.match(layout, /import "\.\/friends\.css";/);
});