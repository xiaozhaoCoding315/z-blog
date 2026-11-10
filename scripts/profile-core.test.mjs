/**
 * 个人资料的纯校验层。
 *   node --test scripts/profile-core.test.mjs
 *
 * profile-core.ts 只依赖 zod；这里只喂 FormData，不碰数据库与 session。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatBirthday,
  genderLabel,
  parseProfileInput,
  profileDisplayName,
  profileHref,
  profileInitial,
} from "../src/lib/profile-core.ts";

function fd(entries) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return form;
}

test("资料：空表单合法，可选字段落成 null 或空串", () => {
  const result = parseProfileInput(fd({}));
  assert.equal(result.ok, true);
  assert.equal(result.value.displayName, null);
  assert.equal(result.value.bio, "");
  assert.equal(result.value.gender, null);
  assert.equal(result.value.birthday, null);
  assert.equal(result.value.website, null);
  assert.equal(result.value.avatarUrl, null);
  assert.equal(result.value.showBirthday, false);
  assert.equal(result.value.showGender, false);
});

test("资料：昵称按字符数限 24，emoji 不会被拆半", () => {
  const ok = parseProfileInput(fd({ displayName: "元".repeat(24) }));
  assert.equal(ok.ok, true);
  const tooLong = parseProfileInput(fd({ displayName: "元".repeat(25) }));
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.error, /24/);
});

test("资料：签名 160 字、所在地 40 字是硬上限", () => {
  assert.equal(parseProfileInput(fd({ bio: "字".repeat(160) })).ok, true);
  assert.equal(parseProfileInput(fd({ bio: "字".repeat(161) })).ok, false);
  assert.equal(parseProfileInput(fd({ location: "城".repeat(40) })).ok, true);
  assert.equal(parseProfileInput(fd({ location: "城".repeat(41) })).ok, false);
});

test("资料：性别只认白名单，空值表示不填", () => {
  assert.equal(parseProfileInput(fd({ gender: "secret" })).value.gender, "secret");
  assert.equal(parseProfileInput(fd({ gender: "" })).value.gender, null);
  assert.equal(parseProfileInput(fd({ gender: "unknown" })).ok, false);
});

test("资料：生日必须是真实、已过去且不早于 1900 的日期", () => {
  assert.equal(parseProfileInput(fd({ birthday: "1998-03-12" })).ok, true);
  assert.equal(parseProfileInput(fd({ birthday: "1998-02-30" })).ok, false);
  assert.equal(parseProfileInput(fd({ birthday: "1899-12-31" })).ok, false);
  assert.equal(parseProfileInput(fd({ birthday: "2999-01-01" })).ok, false);
  assert.equal(parseProfileInput(fd({ birthday: "1998/03/12" })).ok, false);
});

test("资料：链接必须 http(s)，头像只允许本站 /media/ 图片", () => {
  assert.equal(
    parseProfileInput(fd({ website: "https://example.com" })).ok,
    true
  );
  assert.equal(parseProfileInput(fd({ website: "javascript:alert(1)" })).ok, false);
  assert.equal(parseProfileInput(fd({ githubUrl: "not-a-url" })).ok, false);
  assert.equal(
    parseProfileInput(fd({ avatarUrl: "/media/avatar.png" })).ok,
    true
  );
  assert.equal(
    parseProfileInput(
      fd({ avatarUrl: `/media/2026/11/${"a".repeat(32)}.webp` })
    ).ok,
    true
  );
  assert.equal(parseProfileInput(fd({ avatarUrl: "/etc/passwd" })).ok, false);
  assert.equal(
    parseProfileInput(fd({ avatarUrl: "/media/../private/avatar.png" })).ok,
    false
  );
  // 外链头像已经下线：只接受本站上传后的 /media/ 路径
  assert.equal(
    parseProfileInput(fd({ avatarUrl: "https://cdn.example.com/a.png" })).ok,
    false
  );
});

test("资料：隐私开关只认勾选，默认不公开", () => {
  const result = parseProfileInput(
    fd({ birthday: "1998-03-12", gender: "female" })
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.showBirthday, false);
  assert.equal(result.value.showGender, false);

  const publicResult = parseProfileInput(
    fd({ birthday: "1998-03-12", showBirthday: "on", showGender: "on" })
  );
  assert.equal(publicResult.value.showBirthday, true);
  assert.equal(publicResult.value.showGender, true);
});

test("显示名：没填昵称回落到登录名，空白也回落", () => {
  assert.equal(profileDisplayName("小元", "owner@example.com"), "小元");
  assert.equal(profileDisplayName(null, "owner@example.com"), "owner@example.com");
  assert.equal(profileDisplayName("   ", "owner@example.com"), "owner@example.com");
});

test("头像字形取首个字符并大写，不会切开 emoji", () => {
  assert.equal(profileInitial("zhao"), "Z");
  assert.equal(profileInitial("元元"), "元");
  assert.equal(profileInitial("😀同学"), "😀");
  assert.equal(profileInitial("   "), "?");
});

test("生日展示与性别文案", () => {
  assert.equal(formatBirthday("1998-03-12"), "1998.03.12");
  assert.equal(genderLabel("male"), "男");
  assert.equal(genderLabel(null), null);
});

test("资料页地址只接受正整数 id", () => {
  assert.equal(profileHref(7), "/u/7");
  assert.equal(profileHref(null), null);
  assert.equal(profileHref(0), null);
  assert.equal(profileHref(1.5), null);
});