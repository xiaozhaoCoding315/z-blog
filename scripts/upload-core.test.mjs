/**
 * 图片落盘的纯逻辑：认格式、算哈希、拼路径、挡穿越。
 *   node --test scripts/upload-core.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  contentHash,
  isSafeMediaPath,
  mediaDirName,
  mediaFileName,
  sniffImageType,
} from "../src/lib/upload-core.ts";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

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

test("头像上传只对登录用户开放，并且有更小上限与频率限制", () => {
  const route = read("../src/app/api/profile/avatar/route.ts");
  assert.match(route, /getSessionUser/);
  assert.match(route, /MAX_AVATAR_BYTES/);
  assert.match(route, /rateLimit\(`avatar:m:\$\{user\.id\}`, 6/);
  assert.match(route, /rateLimit\(`avatar:d:\$\{user\.id\}`, 20/);
  assert.match(route, /sniffImageType/);
  assert.match(route, /writeUpload/);
  // 与站长专用上传不同：这里不能再要求 owner，但仍要求登录
  assert.doesNotMatch(route, /role !== "owner"/);
  assert.match(route, /status: 401/);
});

test("资料表单改为本地选图，不再提供外链输入", () => {
  const form = read("../src/components/profile/profile-form.tsx");
  const field = read("../src/components/profile/avatar-upload-field.tsx");
  assert.match(form, /<AvatarUploadField/);
  assert.doesNotMatch(form, /name="avatarUrl"\s+type="text"/);
  assert.match(field, /type="file"/);
  assert.match(field, /accept="image\/webp,image\/jpeg,image\/png"/);
  assert.match(field, /createImageBitmap/);
  assert.match(field, /\/api\/profile\/avatar/);
  assert.match(field, /type="hidden" name="avatarUrl"/);
  assert.match(field, /取消外链|不再接受外链/);
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
