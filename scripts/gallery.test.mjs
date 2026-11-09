/**
 * 相册图片收集的单元测试。
 *   node --test scripts/gallery.test.mjs
 *
 * gallery.ts 只 import life.ts（无别名、无 React），node 能直接加载。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { collectGalleryImages } from "../src/lib/gallery.ts";

const moment = (over = {}) => ({
  id: "1",
  kind: "photo",
  publishedAt: "2026-11-05T04:00:00.000Z",
  body: "",
  ...over,
});

test("收集所有动态的 images，一张图一项", () => {
  const images = collectGalleryImages([
    moment({
      id: "2",
      publishedAt: "2026-11-04T04:00:00.000Z",
      images: ["/media/2026/11/a.jpg"],
    }),
    moment({
      id: "1",
      publishedAt: "2026-11-05T04:00:00.000Z",
      images: ["/media/2026/11/b.jpg", "/media/2026/11/c.jpg"],
    }),
  ]);
  assert.equal(images.length, 3);
  assert.deepEqual(
    images.map((image) => image.src),
    [
      "/media/2026/11/b.jpg",
      "/media/2026/11/c.jpg",
      "/media/2026/11/a.jpg",
    ]
  );
  assert.equal(images[0].momentId, "1");
  assert.equal(images[2].momentId, "2");
});

test("只保留 /media/ 路径，外链和相近前缀都丢弃", () => {
  const images = collectGalleryImages([
    moment({
      images: [
        "https://example.com/a.jpg",
        "/images/b.jpg",
        "/mediaX/c.jpg",
        "/media/2026/11/a.jpg",
      ],
    }),
  ]);
  assert.deepEqual(
    images.map((image) => image.src),
    ["/media/2026/11/a.jpg"]
  );
});

test("按 publishedAt 倒序，最新的动态排在最前", () => {
  const images = collectGalleryImages([
    moment({
      id: "old",
      publishedAt: "2026-10-01T04:00:00.000Z",
      images: ["/media/old.jpg"],
    }),
    moment({
      id: "new",
      publishedAt: "2026-11-05T04:00:00.000Z",
      images: ["/media/new.jpg"],
    }),
    moment({
      id: "mid",
      publishedAt: "2026-11-01T04:00:00.000Z",
      images: ["/media/mid.jpg"],
    }),
  ]);
  assert.deepEqual(
    images.map((image) => image.momentId),
    ["new", "mid", "old"]
  );
});

test("同一 src 只保留最新动态里的那一张", () => {
  const images = collectGalleryImages([
    moment({
      id: "1",
      publishedAt: "2026-11-01T04:00:00.000Z",
      images: ["/media/shared.jpg", "/media/one.jpg"],
    }),
    moment({
      id: "2",
      publishedAt: "2026-11-05T04:00:00.000Z",
      images: ["/media/shared.jpg", "/media/two.jpg"],
    }),
  ]);
  assert.deepEqual(
    images.map((image) => image.src),
    ["/media/shared.jpg", "/media/two.jpg", "/media/one.jpg"]
  );
  assert.equal(images[0].momentId, "2");
});

test("同一动态里重复的 src 也去重", () => {
  const images = collectGalleryImages([
    moment({ images: ["/media/a.jpg", "/media/a.jpg"] }),
  ]);
  assert.equal(images.length, 1);
});

test("没有图片时返回空数组", () => {
  assert.deepEqual(collectGalleryImages([]), []);
  assert.deepEqual(
    collectGalleryImages([
      moment({ images: [] }),
      moment({ id: "2", images: undefined }),
      moment({ id: "3" }),
    ]),
    []
  );
});

test("每张图带 momentId、日期与「{日期} 的照片」alt", () => {
  const [image] = collectGalleryImages([
    moment({
      id: "42",
      publishedAt: "2026-11-05T04:00:00.000Z",
      images: ["/media/2026/11/a.jpg"],
    }),
  ]);
  assert.equal(image.momentId, "42");
  assert.equal(image.date, "2026-11-05T04:00:00.000Z");
  assert.equal(image.alt, "11.05 的照片");
});
