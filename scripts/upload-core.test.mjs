/**
 * 图片落盘的纯逻辑：认格式、算哈希、拼路径、挡穿越。
 *   node --test scripts/upload-core.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contentHash,
  isSafeMediaPath,
  mediaDirName,
  mediaFileName,
  sniffImageType,
} from "../src/lib/upload-core.ts";

const bytes = (...xs) => new Uint8Array(xs);

test("认得 WebP / JPEG / PNG 的魔数", () => {
  const webp = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);
  const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
  const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0);
  assert.equal(sniffImageType(webp), "webp");
  assert.equal(sniffImageType(jpeg), "jpeg");
  assert.equal(sniffImageType(png), "png");
});

test("别的一律不认：改个扩展名骗不过去", () => {
  assert.equal(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38)), null); // GIF
  assert.equal(
    sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20)),
    null
  ); // RIFF/AVI
  assert.equal(sniffImageType(new Uint8Array(0)), null);
  assert.equal(sniffImageType(bytes(0x3c, 0x73, 0x76, 0x67)), null);
});

test("内容哈希稳定且是 64 位十六进制", () => {
  const a = contentHash(bytes(1, 2, 3));
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(a, contentHash(bytes(1, 2, 3)));
  assert.notEqual(a, contentHash(bytes(1, 2, 4)));
});

test("目录按北京时间分年月", () => {
  // 2026-10-31T17:00:00Z = 北京时间 11 月 1 日 01:00
  assert.equal(mediaDirName(new Date("2026-10-31T17:00:00Z")), "2026/11");
  assert.equal(mediaDirName(new Date("2026-01-05T00:00:00Z")), "2026/01");
});

test("文件名用哈希前 32 位加扩展名", () => {
  const hash = "a".repeat(64);
  assert.equal(
    mediaFileName(hash, "webp"),
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp"
  );
  assert.equal(
    mediaFileName(hash, "jpeg"),
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"
  );
  assert.equal(
    mediaFileName(hash, "png"),
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png"
  );
});

test("路径穿越一律拒绝", () => {
  assert.equal(
    isSafeMediaPath(["2026", "11", "a".repeat(32) + ".webp"]),
    true
  );
  for (const bad of [
    ["..", "etc", "passwd"],
    ["2026", "..", "x.webp"],
    ["2026/11/x.webp"],
    ["2026", "11", "x.webp/../../y"],
    ["2026", "11", ".hidden.webp"],
    [],
  ]) {
    assert.equal(isSafeMediaPath(bad), false, `应当拒绝 ${JSON.stringify(bad)}`);
  }
});
