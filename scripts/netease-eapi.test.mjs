/**
 * 网易云扫码登录 eapi 请求：路径、客户端身份、AES-128-ECB 与摘要、chainId。
 *   node --test scripts/netease-eapi.test.mjs
 *
 * 这些断言来自官方 PC 客户端的请求形态；明文网页接口扫码后会被 8821 风控拒绝，
 * 所以任何一处退化都必须在这里红掉。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv, createHash } from "node:crypto";
import {
  PC_APPVER,
  cookieHeader,
  eapiParams,
  eapiRequest,
  mergeSetCookies,
  neteaseQrContent,
  newDeviceId,
  newQrCookieJar,
} from "../src/lib/netease-eapi.ts";

const EAPI_KEY = Buffer.from("e82ckenh8dichen8", "utf8");
const SEPARATOR = "-36cd479b6b5-";

/** 解开 params，返回 path / JSON 原文 / 摘要 */
function openParams(body) {
  assert.ok(body.startsWith("params="), "body 必须是 params=");
  const hex = body.slice("params=".length);
  assert.match(hex, /^[0-9A-F]+$/, "密文必须是全大写十六进制");
  const decipher = createDecipheriv("aes-128-ecb", EAPI_KEY, null);
  const plain = Buffer.concat([
    decipher.update(Buffer.from(hex, "hex")),
    decipher.final(),
  ]).toString("utf8");
  const first = plain.indexOf(SEPARATOR);
  const last = plain.lastIndexOf(SEPARATOR);
  assert.ok(first > 0 && last > first, "分隔符必须完整");
  return {
    path: plain.slice(0, first),
    payload: plain.slice(first + SEPARATOR.length, last),
    digest: plain.slice(last + SEPARATOR.length),
  };
}

test("每张二维码的 deviceId 是 32 位大写十六进制且互不相同", () => {
  const a = newDeviceId();
  const b = newDeviceId();
  assert.match(a, /^[0-9A-F]{32}$/);
  assert.notEqual(a, b);
});

test("unikey 请求走 interfacepc eapi，身份与加密体齐全", () => {
  const device = "0123456789ABCDEF0123456789ABCDEF";
  const request = eapiRequest(
    "/api/login/qrcode/unikey",
    { type: 3 },
    device,
    1_700_000_000_123
  );

  assert.equal(
    request.url,
    "https://interfacepc.music.163.com/eapi/login/qrcode/unikey"
  );
  assert.equal(request.headers["Content-Type"], "application/x-www-form-urlencoded");
  assert.match(request.headers["User-Agent"], /NeteaseMusicDesktop\/3\.1\.17\.204416/);
  assert.equal("Referer" in request.headers, false);

  const cookie = request.headers.Cookie;
  for (const part of [
    "os=pc",
    `appver=${PC_APPVER}`,
    "channel=netease",
    "osver=Microsoft-Windows-10-Professional-build-19045-64bit",
    `deviceId=${device}`,
  ]) {
    assert.ok(cookie.includes(part), `Cookie 缺少 ${part}`);
  }

  const opened = openParams(request.body);
  assert.equal(opened.path, "/api/login/qrcode/unikey");
  const payload = JSON.parse(opened.payload);
  assert.equal(payload.type, 3);
  assert.equal(payload.e_r, false);
  assert.equal(payload.header.os, "pc");
  assert.equal(payload.header.appver, PC_APPVER);
  assert.equal(payload.header.deviceId, device);
  assert.equal(payload.header.buildver, "1700000000");
  assert.equal(payload.header.requestId, "1700000000123_0123");
  assert.equal("key" in payload, false);

  const expected = createHash("md5")
    .update(`nobody/api/login/qrcode/unikeyuse${opened.payload}md5forencrypt`)
    .digest("hex");
  assert.equal(opened.digest, expected);
});

test("轮询请求带同一个 deviceId 和 key", () => {
  const device = "ABCDEF0123456789ABCDEF0123456789";
  const request = eapiRequest(
    "/api/login/qrcode/client/login",
    { key: "KEY-123", type: 3 },
    device,
    1_700_000_000_123
  );
  assert.equal(
    request.url,
    "https://interfacepc.music.163.com/eapi/login/qrcode/client/login"
  );
  assert.ok(request.headers.Cookie.includes(`deviceId=${device}`));
  const opened = openParams(request.body);
  assert.equal(opened.path, "/api/login/qrcode/client/login");
  const payload = JSON.parse(opened.payload);
  assert.equal(payload.key, "KEY-123");
  assert.equal(payload.type, 3);
  assert.equal(payload.e_r, false);
  assert.equal(payload.header.deviceId, device);
});

test("扫码票带官方客户端匿名身份，NMTID 同时进 Cookie 与加密 header", () => {
  const now = 1_700_000_000_123;
  const jar = newQrCookieJar(now);
  assert.match(jar._ntes_nuid, /^[0-9a-f]{64}$/);
  assert.equal(jar._ntes_nnid, `${jar._ntes_nuid},${now}`);
  assert.match(jar.WNMCID, /^[a-z]{6}\.1700000000123\.01\.0$/);
  assert.equal(jar.__remember_me, "true");
  assert.equal(jar.ntes_kaola_ad, "1");

  mergeSetCookies(jar, [
    "NMTID=abc; Domain=.music.163.com; Path=/",
    "bad name=x",
    "MUSIC_U=secret",
  ]);
  assert.equal(jar.NMTID, "abc");
  assert.equal(jar.MUSIC_U, "secret");
  assert.equal("bad name" in jar, false);
  assert.ok(cookieHeader(jar).includes("NMTID=abc"));

  const device = "0123456789ABCDEF0123456789ABCDEF";
  const request = eapiRequest(
    "/api/login/qrcode/client/login",
    { key: "KEY", type: 3 },
    device,
    now,
    jar
  );
  assert.ok(request.headers.Cookie.includes("NMTID=abc"));
  assert.ok(request.headers.Cookie.includes("_ntes_nuid="));
  const payload = JSON.parse(openParams(request.body).payload);
  assert.equal(payload.header.NMTID, "abc");
  assert.equal(payload.header.deviceId, device);
});

test("二维码内容带与轮询一致的 chainId", () => {
  const content = neteaseQrContent(
    "a961d01d-5a96-49f5-92bd-ab3d90f18f3e",
    "0123456789ABCDEF0123456789ABCDEF",
    1_700_000_000_123
  );
  assert.equal(
    content,
    "https://music.163.com/login?codekey=a961d01d-5a96-49f5-92bd-ab3d90f18f3e&chainId=v1_0123456789ABCDEF0123456789ABCDEF_pc_login_1700000000123"
  );
});

test("eapiParams 的摘要覆盖 path 与 JSON", () => {
  const path = "/api/login/qrcode/unikey";
  const payload = '{"type":3,"e_r":false}';
  const sealed = eapiParams(path, payload);
  const opened = openParams(`params=${sealed}`);
  assert.equal(opened.path, path);
  assert.equal(opened.payload, payload);
  const expected = createHash("md5")
    .update(`nobody${path}use${payload}md5forencrypt`)
    .digest("hex");
  assert.equal(opened.digest, expected);
});