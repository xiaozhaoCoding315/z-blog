import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { needsSync } from "../src/lib/sync-plan.ts";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("没有同步记录或强制同步时必须处理", () => {
  assert.equal(needsSync(null, "h1", false), true);
  assert.equal(needsSync({ contentHash: "h1", embeddingHash: "h1" }, "h1", false, true), true);
});

test("正文没变且向量已追平时跳过", () => {
  assert.equal(
    needsSync({ contentHash: "h1", embeddingHash: "h1" }, "h1", true),
    false
  );
});

test("正文变了要重同步", () => {
  assert.equal(
    needsSync({ contentHash: "h0", embeddingHash: "h0" }, "h1", true),
    true
  );
});

test("上次未开向量或 embeddingHash 落后时补向量", () => {
  assert.equal(
    needsSync({ contentHash: "h1", embeddingHash: null }, "h1", true),
    true
  );
  assert.equal(
    needsSync({ contentHash: "h1", embeddingHash: "h0" }, "h1", true),
    true
  );
  // 向量服务关闭时不需要补，避免每次启动都重跑
  assert.equal(
    needsSync({ contentHash: "h1", embeddingHash: null }, "h1", false),
    false
  );
});

test("同步写入 embeddingHash 的时机在分块落库之后", () => {
  const sync = read("../src/lib/sync.ts");
  assert.match(sync, /needsSync\(prev, post\.hash, embeddingEnabled/);
  const insertChunks = sync.indexOf("await db.insert(chunks).values(rows)");
  const markEmbedded = sync.indexOf("set({ embeddingHash: post.hash })");
  assert.ok(insertChunks !== -1, "缺少分块写入");
  assert.ok(markEmbedded !== -1, "缺少 embeddingHash 回写");
  assert.ok(markEmbedded > insertChunks, "必须先落分块再标记向量已追平");

  const schema = read("../src/db/schema.ts");
  assert.match(schema, /embeddingHash: text\("embedding_hash"\)/);
  const client = read("../src/db/client.ts");
  assert.match(
    client,
    /ALTER TABLE posts ADD COLUMN IF NOT EXISTS embedding_hash text/
  );
});