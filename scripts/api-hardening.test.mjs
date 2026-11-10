import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_CHAT_BODY_CHARS,
  MAX_CHAT_MESSAGES,
  MAX_CHAT_QUESTION_CHARS,
  MAX_CHAT_TEXT_CHARS,
  parseChatPayload,
} from "../src/lib/chat-input.ts";
import { isPublishedNoteSlug } from "../src/lib/content-core.ts";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function payload(messages) {
  return JSON.stringify({ messages });
}

function userMessage(text, id = "m1") {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

test("聊天输入接受正常的单轮问题", () => {
  const result = parseChatPayload(payload([userMessage("什么是 RAG")]));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.question, "什么是 RAG");
    assert.equal(result.messages.length, 1);
  }
});

test("聊天输入拒绝畸形 JSON、缺字段与空对话", () => {
  for (const raw of [
    "{",
    JSON.stringify({}),
    JSON.stringify({ messages: [] }),
    JSON.stringify({ messages: [{ role: "user", parts: [] }] }),
    payload([{ id: "1", role: "tool", parts: [{ type: "text", text: "x" }] }]),
    payload([{ id: "1", role: "user", parts: [{ type: "text", text: 42 }] }]),
  ]) {
    const result = parseChatPayload(raw);
    assert.equal(result.ok, false, raw);
    assert.equal(result.status, 400, raw);
  }
});

test("聊天输入限制消息条数、正文总量与单条问题长度", () => {
  const many = Array.from({ length: MAX_CHAT_MESSAGES + 1 }, (_, i) =>
    userMessage("hi", `m${i}`)
  );
  assert.equal(parseChatPayload(payload(many)).ok, false);

  const longText = "字".repeat(MAX_CHAT_TEXT_CHARS + 1);
  const tooMuch = parseChatPayload(payload([userMessage(longText)]));
  assert.equal(tooMuch.ok, false);
  if (!tooMuch.ok) assert.equal(tooMuch.status, 413);

  const longQuestion = "问".repeat(MAX_CHAT_QUESTION_CHARS + 1);
  const tooLongQuestion = parseChatPayload(payload([userMessage(longQuestion)]));
  assert.equal(tooLongQuestion.ok, false);
  if (!tooLongQuestion.ok) assert.equal(tooLongQuestion.status, 413);

  const hugeBody = "x".repeat(MAX_CHAT_BODY_CHARS + 1);
  assert.equal(parseChatPayload(hugeBody).ok, false);
});

test("聊天路由在进入模型前解析并校验请求体", () => {
  const route = read("../src/app/api/chat/route.ts");
  assert.match(route, /parseChatPayload\(rawBody\)/);
  assert.match(route, /request\.text\(\)/);
  assert.doesNotMatch(route, /request\.json\(\)/);
});

test("浏览量/点赞只统计已发布笔记并带限频", () => {
  assert.equal(isPublishedNoteSlug("hello-world"), true);
  assert.equal(isPublishedNoteSlug("../hello-world"), false);
  assert.equal(isPublishedNoteSlug("does-not-exist"), false);

  for (const path of [
    "../src/app/api/views/[slug]/route.ts",
    "../src/app/api/likes/[slug]/route.ts",
  ]) {
    const source = read(path);
    assert.match(source, /isPublishedNoteSlug\(slug\)/);
    assert.match(source, /rateLimit\(/);
    assert.match(source, /status: 404/);
    assert.match(source, /status: 429/);
  }
});