/**
 * 友链页守卫：后台可自行增删改、公开页读数据库、沿用首页天气 / 潮汐语言，
 * 不占用七个主入口。
 *   node --test scripts/friends-page.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const core = read("../src/lib/friends-core.ts");
const schema = read("../src/db/schema.ts");
const dbClient = read("../src/db/client.ts");
const server = read("../src/lib/friends-server.ts");
const actions = read("../src/app/(site)/(apps)/admin/actions.ts");
const admin = read("../src/components/admin/friends-admin.tsx");
const adminPage = read("../src/app/(site)/(apps)/admin/page.tsx");
const page = read("../src/app/(site)/(apps)/friends/page.tsx");
const portfolio = read("../src/config/portfolio.ts");
const home = read("../src/components/home/personal-home.tsx");
const homePage = read("../src/app/(site)/page.tsx");
const copy = read("../src/components/friends/friends-copy.tsx");
const apps = read("../src/config/apps.ts");
const layout = read("../src/app/layout.tsx");
const css = read("../src/app/friends.css");

test("友链由数据库保存，配置里不再写死站点", () => {
  assert.match(core, /export interface FriendLink/);
  assert.match(core, /export function parseFriendInput/);
  assert.match(schema, /export const friends = pgTable/);
  assert.match(schema, /jsonb\("tags"\)/);
  assert.match(dbClient, /CREATE TABLE IF NOT EXISTS friends/);
  assert.match(dbClient, /CREATE INDEX IF NOT EXISTS friends_created_idx/);
  assert.doesNotMatch(portfolio, /FriendLink/);
  assert.doesNotMatch(portfolio, /export const friends/);
});

test("公开页与首页读同一份友链缓存，读不到库时如实标记", () => {
  assert.match(server, /"use cache"/);
  assert.match(server, /cacheLife\("minutes"\)/);
  assert.match(server, /cacheTag\("friends"\)/);
  assert.match(server, /available: false/);
  assert.match(server, /export async function listFriendsForAdmin/);
  assert.match(page, /import \{ getFriends \} from "@\/lib\/friends-server"/);
  assert.match(page, /const \{ available, friends \} = await getFriends\(\)/);
  assert.match(page, /friends\.map\(\(friend, index\)/);
  assert.match(homePage, /import \{ getFriends \} from "@\/lib\/friends-server"/);
  assert.match(homePage, /friends=\{friendsResult\.friends\}/);
  assert.match(homePage, /friendsAvailable=\{friendsResult\.available\}/);
});

test("后台可添加、编辑、删除友链，写入后让公开缓存失效", () => {
  for (const name of ["addFriend", "updateFriend", "deleteFriend"]) {
    assert.match(
      actions,
      new RegExp(`export async function ${name}\\(formData: FormData\\)`),
      `缺少 ${name}`
    );
  }
  assert.match(actions, /requireOwner\(\)/);
  assert.match(actions, /updateTag\("friends"\)/);
  assert.match(actions, /refresh\(\)/);
  assert.match(admin, /<form action=\{addFriend\}/);
  assert.match(admin, /<form action=\{updateFriend\}/);
  assert.match(admin, /<form action=\{deleteFriend\}/);
  assert.match(admin, /name="url"/);
  assert.match(admin, /name="tags"/);
  assert.match(adminPage, /<FriendsAdmin \/>/);
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

test("文案保持克制，不写自我说明式的句子", () => {
  assert.doesNotMatch(page, /不摆占位|不凑数量|只放真实站点|锚在这条潮汐线/);
  assert.doesNotMatch(home, /不摆占位|示例文章占位|真实笔记/);
  assert.match(page, /这里放我平时会打开的网站/);
  assert.match(home, /id="home-friends"/);
  assert.match(home, /home-friends/);
  assert.match(home, /href="\/friends"/);
});

test("首页新增友链区块，但不改动七个主入口", () => {
  assert.match(home, /import type \{ FriendLink \} from "@\/lib\/friends-core"/);
  assert.match(home, /"friends"/);
  assert.doesNotMatch(home, /from "@\/config\/portfolio"/);
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