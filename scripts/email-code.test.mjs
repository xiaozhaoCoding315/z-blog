/**
 * 验证码的纯逻辑：生成、哈希、比对、过期。
 *   node --test scripts/email-code.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  codeMatches,
  generateCode,
  hashCode,
  isValidEmail,
  normalizeEmail,
} from "../src/lib/email-code.ts";

const SECRET = "test-secret";

test("验证码永远是六位数字，允许前导 0", () => {
  for (let i = 0; i < 200; i++) {
    const code = generateCode();
    assert.match(code, /^\d{6}$/, `生成了非法验证码 ${code}`);
  }
});

test("同一份码与密钥哈希稳定，换密钥就变", () => {
  assert.equal(hashCode("123456", SECRET), hashCode("123456", SECRET));
  assert.notEqual(hashCode("123456", SECRET), hashCode("123456", "other"));
});

test("比对认得出对与错，且不因长度不同抛错", () => {
  const hash = hashCode("123456", SECRET);
  assert.equal(codeMatches("123456", hash, SECRET), true);
  assert.equal(codeMatches("123457", hash, SECRET), false);
  assert.equal(codeMatches("12345", hash, SECRET), false);
  assert.equal(codeMatches("1234567", hash, SECRET), false);
});

test("常量对得上文档：10 分钟有效、5 次上限", () => {
  assert.equal(CODE_TTL_MS, 10 * 60_000);
  assert.equal(MAX_ATTEMPTS, 5);
});

test("邮箱规范化：去空白、转小写；明显不是邮箱的拒绝", () => {
  assert.equal(normalizeEmail("  Foo@Example.COM "), "foo@example.com");
  assert.equal(isValidEmail("foo@example.com"), true);
  assert.equal(isValidEmail("foo@example"), false);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail("a b@example.com"), false);
});
