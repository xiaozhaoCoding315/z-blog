import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/lib/songs-server.ts", import.meta.url),
  "utf8"
);

/** 按函数名截出单个顶层函数体，避免误取到相邻的缓存函数。 */
function functionBody(name) {
  const start = source.indexOf(`async function ${name}`);
  assert.notEqual(start, -1, `找不到 ${name}`);
  // 顶层函数以「新行 + 单列 } + 换行」收尾；文末最后一个函数可能没有结尾换行
  let end = source.indexOf("\n}\n", start);
  if (end === -1) end = source.lastIndexOf("\n}");
  assert.ok(end > start, `${name} 没有正常结束`);
  return source.slice(start, end);
}

function assertCachesSuccessOnly(name, errorPattern) {
  const body = functionBody(name);
  // 缓存函数在数据库故障时必须抛错，不能把失败对象写进缓存
  assert.match(body, errorPattern);
  assert.doesNotMatch(body, /available: false/);
  assert.doesNotMatch(body, /catch \{/);
}

test("歌单详情只缓存成功结果，数据库故障不写进缓存", () => {
  // 外层负责把异常转成 available:false
  assert.match(
    source,
    /export async function getPlaylistDetail[\s\S]*?try \{[\s\S]*?getPlaylistDetailCached\(id\)[\s\S]*?\} catch \{\s*return \{ available: false, playlist: null \};\s*\}/
  );
  assertCachesSuccessOnly(
    "getPlaylistDetailCached",
    /if \(!db\) throw new Error\("DATABASE_URL 未配置，无法读取歌单"\)/
  );
});

test("单曲与歌单列表缓存同样只缓存成功结果", () => {
  assertCachesSuccessOnly(
    "getApprovedSongsCached",
    /if \(!db\) throw new Error\("DATABASE_URL 未配置，无法读取单曲"\)/
  );
  assertCachesSuccessOnly(
    "getApprovedPlaylistsCached",
    /if \(!db\) throw new Error\("DATABASE_URL 未配置，无法读取歌单列表"\)/
  );
  // 三个公开读接口都把异常挡在缓存外
  assert.match(
    source,
    /export async function getApprovedSongs[\s\S]*?try \{\s*return await getApprovedSongsCached\(\)/
  );
  assert.match(
    source,
    /export async function getApprovedPlaylists[\s\S]*?try \{\s*return await getApprovedPlaylistsCached\(\)/
  );
});