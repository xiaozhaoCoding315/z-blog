/**
 * 发布表单的校验。
 *   node --test scripts/moment-input.test.mjs
 *
 * 这个模块 import zod（裸包名，node 解析得到），不碰 `@/` 别名。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MOMENT_KIND_VALUES,
  momentInputSchema,
  parseMomentInput,
} from "../src/lib/moment-input.ts";
import { MOMENT_KINDS } from "../src/lib/moment-core.ts";

const fd = (entries) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else f.append(k, v);
  }
  return f;
};

const MEDIA = `/media/2026/11/${"a".repeat(32)}.webp`;

test("纯文字：正文够长就能发，卡片字段被丢掉", () => {
  const r = parseMomentInput(fd({ kind: "text", body: "降温了。" }));
  assert.equal(r.ok, true);
  assert.equal(r.value.kind, "text");
  assert.equal(r.value.body, "降温了。");
  assert.equal(r.value.card, undefined);
});

test("标签：# 前缀与空白拆分，去重保序", () => {
  const r = parseMomentInput(fd({ kind: "text", body: "x", tags: "#杭州 雨天" }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.tags, ["杭州", "雨天"]);
});

test("标签：没填就是空数组", () => {
  const r = parseMomentInput(fd({ kind: "text", body: "x" }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.tags, []);
});

test("标签：最多 5 个，第 6 个被拒绝", () => {
  const r = parseMomentInput(
    fd({ kind: "text", body: "x", tags: "a b c d e f" })
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /最多 5 个/);
});

test("标签：单个最多 16 字素，超长被拒绝", () => {
  const r = parseMomentInput(
    fd({ kind: "text", body: "x", tags: "字".repeat(17) })
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /最多 16 个字符/);
});

test("图文：没有图也没有正文要拒绝", () => {
  const r = parseMomentInput(fd({ kind: "photo", body: "" }));
  assert.equal(r.ok, false);
});

test("图文：只有图也行", () => {
  const r = parseMomentInput(fd({ kind: "photo", body: "", images: MEDIA }));
  assert.equal(r.ok, true);
  assert.equal(r.value.images.length, 1);
});

test("图路径必须是 /media/ 下的哈希名", () => {
  const r = parseMomentInput(
    fd({ kind: "photo", body: "x", images: "https://evil.example/x.png" })
  );
  assert.equal(r.ok, false);
});

test("读数卡：缺标题要拒绝，字段齐了能发", () => {
  assert.equal(
    parseMomentInput(fd({ kind: "song", cardTitle: "", cardMeta: "坂本龍一" }))
      .ok,
    false
  );
  const r = parseMomentInput(
    fd({ kind: "song", cardTitle: "Merry Christmas", cardMeta: "坂本龍一" })
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.card, {
    title: "Merry Christmas",
    meta: "坂本龍一",
  });
});

test("未知 kind 拒绝，不猜", () => {
  assert.equal(parseMomentInput(fd({ kind: "video", body: "x" })).ok, false);
});

test("正文超长拒绝", () => {
  const r = parseMomentInput(fd({ kind: "text", body: "字".repeat(2001) }));
  assert.equal(r.ok, false);
});

test("可选字段去空白后为空就不进对象", () => {
  const r = parseMomentInput(
    fd({ kind: "text", body: "x", mood: "   ", place: "杭州" })
  );
  assert.equal(r.ok, true);
  assert.equal(r.value.mood, undefined);
  assert.equal(r.value.place, "杭州");
});

test("schema 单独可用（给将来的编辑接口留口子）", () => {
  assert.equal(
    momentInputSchema.safeParse({ kind: "text", body: "" }).success,
    false
  );
});

test("校验失败时给中文提示", () => {
  const mood = parseMomentInput(
    fd({ kind: "text", body: "x", mood: "字".repeat(21) })
  );
  assert.equal(mood.ok, false);
  assert.equal(mood.error, "心情最多 20 字");

  const image = parseMomentInput(
    fd({ kind: "photo", body: "x", images: "https://evil.example/x.png" })
  );
  assert.equal(image.ok, false);
  assert.equal(image.error, "图片路径不对");

  const kind = parseMomentInput(fd({ kind: "video", body: "x" }));
  assert.equal(kind.ok, false);
  assert.equal(kind.error, "不认识的形态");

  const tooMany = parseMomentInput(
    fd({ kind: "photo", body: "x", images: Array(10).fill(MEDIA) })
  );
  assert.equal(tooMany.ok, false);
  assert.equal(tooMany.error, "最多放 9 张图");
});

test("外链只收 http(s)：javascript: 拒绝，https:// 放行", () => {
  const card = { kind: "link", cardTitle: "首页", cardMeta: "示例" };

  const bad = parseMomentInput(fd({ ...card, cardHref: "javascript:alert(1)" }));
  assert.equal(bad.ok, false);
  assert.equal(bad.error, "外链要以 http:// 或 https:// 开头");

  const good = parseMomentInput(
    fd({ ...card, cardHref: "https://example.com" })
  );
  assert.equal(good.ok, true);
  assert.equal(good.value.card.href, "https://example.com");
});

test("kind 清单与读取层那份必须一致", () => {
  // 两份清单不能合并：moment-input.ts 要被 node --test 直接加载，
  // 而 Node 不解析无扩展名的相对导入，所以它没法 import moment-core.ts。
  // 与其留一个无声的漂移口子，不如让这条断言替我们盯着。
  assert.deepEqual([...MOMENT_KIND_VALUES], [...MOMENT_KINDS]);
});
