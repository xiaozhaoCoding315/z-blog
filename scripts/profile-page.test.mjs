/**
 * 资料编辑页布局守卫：左侧公开预览 + 右侧分区表单，移动端单列。
 *   node --test scripts/profile-page.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const page = read("../src/app/(site)/(apps)/profile/page.tsx");
const form = read("../src/components/profile/profile-form.tsx");
const css = read("../src/app/globals.css");

test("资料页改为预览 + 分区表单，字段不再平铺", () => {
  assert.match(form, /className="profile-form profile-studio"/);
  assert.match(form, /className="profile-preview"/);
  assert.match(form, /profile-preview-identity/);
  assert.match(form, /profile-preview-bio/);
  assert.match(form, /profile-preview-meta/);
  assert.match(form, /profile-form-section/);
  assert.match(form, /profile-form-wide/);
  assert.match(form, /aria-labelledby="profile-basic-title"/);
  assert.match(form, /aria-labelledby="profile-more-title"/);
});

test("预览跟随输入实时变化", () => {
  assert.match(form, /const \[bio, setBio\] = useState/);
  assert.match(form, /const \[location, setLocation\] = useState/);
  assert.match(form, /onChange=\{\(event\) => setBio\(event\.target\.value\)\}/);
  assert.match(form, /const previewName = profileDisplayName/);
});

test("表单仍提交原有字段，头像仍走 upload 组件", () => {
  for (const name of [
    "displayName",
    "location",
    "bio",
    "gender",
    "birthday",
    "website",
    "githubUrl",
    "showGender",
    "showBirthday",
  ]) {
    assert.match(form, new RegExp(`name="${name}"`), `缺少字段 ${name}`);
  }
  assert.match(form, /AvatarUploadField/);
  assert.match(form, /updateProfile/);
});

test("预览卡在桌面端吸顶，窄屏堆成单列", () => {
  assert.match(
    css,
    /\.profile-studio \{[^}]*grid-template-columns: minmax\(260px, 308px\)/
  );
  assert.match(css, /\.profile-preview \{[^}]*position: sticky/);
  assert.match(
    css,
    /@media \(max-width: 960px\) \{\s*\.profile-studio \{\s*grid-template-columns: 1fr;/
  );
});

test("资料页文案简短，不再写自我说明", () => {
  assert.match(page, /<h1>编辑资料<\/h1>/);
  assert.doesNotMatch(page, /你好，/);
  assert.doesNotMatch(page, /先登录，再写自己的那一页/);
});