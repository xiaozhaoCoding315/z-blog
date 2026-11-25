import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decodeOauthNext,
  encodeOauthNext,
  sanitizeNext,
} from "../src/lib/auth.ts";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("回跳地址只允许站内相对路径", () => {
  assert.equal(sanitizeNext("/notes?x=1"), "/notes?x=1");
  assert.equal(sanitizeNext("/"), "/");
  assert.equal(sanitizeNext(null), "/");
  assert.equal(sanitizeNext("//evil.com"), "/");
  assert.equal(sanitizeNext("https://evil.com"), "/");
  assert.equal(sanitizeNext("/\\evil.com"), "/");
  assert.equal(sanitizeNext("/ok\u0000"), "/");
});

test("回跳地址 cookie 编解码能往返中文路径", () => {
  const next = "/笔记?tag=RAG";
  assert.equal(decodeOauthNext(encodeOauthNext(next)), next);
  assert.equal(decodeOauthNext(undefined), "/");
  assert.equal(decodeOauthNext("!!!not-base64!!!"), "/");
});

test("授权入口写入一次性 nonce，并把 state 设为 nonce 而不是回跳地址", () => {
  const route = read("../src/app/api/auth/github/route.ts");
  assert.match(route, /crypto\.randomUUID\(\)/);
  assert.match(route, /authorize\.searchParams\.set\("state", nonce\)/);
  assert.match(route, /res\.cookies\.set\(OAUTH_STATE_COOKIE, nonce/);
  assert.match(route, /encodeOauthNext\(next\)/);
  assert.doesNotMatch(route, /searchParams\.set\("state", next\)/);
});

test("回调校验 cookie 中的 nonce，校验不过不换 token", () => {
  const callback = read("../src/app/api/auth/github/callback/route.ts");
  assert.match(callback, /jar\.get\(OAUTH_STATE_COOKIE\)/);
  assert.match(callback, /state !== expected/);
  assert.match(callback, /state-mismatch/);
  assert.match(callback, /function clearOauth/);
  assert.match(callback, /return clearOauth\(/);
  // 校验必须发生在 exchangeCode 之前
  assert.ok(
    callback.indexOf("state !== expected") < callback.indexOf("exchangeCode(")
  );
});