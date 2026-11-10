/**
 * 小元同学科技控制台守卫：真实流式、模型标签、深色 HUD 与减少动效。
 *   node --test scripts/assistant-console.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function gateSlice(source) {
  const marker =
    "@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {";
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, "缺少组合动效门");
  let depth = 0;
  let end = -1;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  assert.notEqual(end, -1, "组合动效门未闭合");
  return {
    gate: source.slice(start, end + 1),
    outside: `${source.slice(0, start)}\n${source.slice(end + 1)}`,
  };
}

const layout = read("../src/app/layout.tsx");
const css = read("../src/app/assistant.css");
const view = read("../src/components/assistant/assistant-page-view.tsx");
const ai = read("../src/lib/ai.ts");
const route = read("../src/app/api/chat/route.ts");
const envExample = read("../.env.example");
const readme = read("../README.md");

test("助手控制台样式独立成层，接在氛围层之后", () => {
  assert.match(
    layout,
    /import "\.\/lyrics\.css";\s*import "\.\/ambient\.css";\s*import "\.\/assistant\.css";/
  );
  assert.match(css, /\.assistant-page\s*\{/);
  assert.match(css, /\.assistant-page \.assistant-workspace\s*\{/);
  assert.match(css, /\.assistant-workspace-bar\s*\{/);
  assert.match(css, /\.assistant-core-ring/);
  assert.match(css, /grid-template-rows:\s*auto minmax\(380px, 56dvh\) auto/);
});

test("界面明确是深色 HUD，与站内纸面页区分", () => {
  assert.match(css, /--ai-bg:\s*#020b0a/);
  assert.match(css, /--ai-mint:\s*#6fffd2/);
  assert.match(css, /--ai-cyan:\s*#6bd9ff/);
  assert.match(css, /repeating-linear-gradient/);
  assert.match(css, /\.assistant-page \.assistant-hero::after/);
  assert.match(view, /className="assistant-h1-tag"/);
  assert.match(view, /className="assistant-core"/);
  assert.match(view, /className="assistant-core-readout"/);
  assert.match(view, /className="assistant-flow-scan"/);
});

test("模型配置默认 Agnes-3.0-Flash，界面显示产品名而不是 API slug", () => {
  assert.match(ai, /CHAT_MODEL \?\? "agnes-3\.0-flash"/);
  assert.match(ai, /https:\/\/api\.agnes-ai\.cn\/v1/);
  assert.match(envExample, /CHAT_MODEL=agnes-3\.0-flash/);
  assert.match(readme, /默认 `agnes-3\.0-flash`/);
  assert.match(view, /formatModelLabel\(modelId\)/);
  assert.match(view, /MODEL \{modelLabel\}/);
  assert.match(view, /READY \/ \{modelLabel\}/);
  assert.match(view, /part\.toLowerCase\(\) === "agnes"\) return "Agnes"/);
});

test("流式输出有可见证据：尾部光标、状态条、字符数与停止按钮", () => {
  assert.match(view, /status === "streaming" &&\s*message\.id === messages\[messages\.length - 1\]\?\.id/);
  assert.match(view, /data-streaming=\{isStreaming \? "true" : "false"\}/);
  assert.match(view, /assistant-stream-caret/);
  assert.match(view, /assistant-message-metrics/);
  assert.match(view, /SSE · LIVE/);
  assert.match(view, /assistant-stream-bars/);
  assert.match(view, /maxLength=\{2000\}/);
  assert.match(view, /assistant-composer-counter/);
  assert.match(view, /isStreaming \? "STREAMING" : "RESPONSE"/);
  // 仍是真实 useChat/DefaultChatTransport，不是假打字机
  assert.match(view, /useChat\(\{/);
  assert.match(view, /new DefaultChatTransport/);
  assert.match(view, /onClick=\{\(\) => stop\(\)\}/);
});

test("模型繁忙时快速失败，并把供应商错误翻译成用户能看懂的话", () => {
  // 供应商 429 是账号级限流，默认两次重试会把一次失败拖到一两分钟
  assert.match(route, /maxRetries:\s*1/);
  assert.match(route, /timeout:\s*\{ firstChunkMs: 30_000, chunkMs: 20_000 \}/);
  assert.match(route, /APICallError\.isInstance\(cause\)/);
  assert.match(route, /lastError/);
  assert.match(route, /cause\.statusCode === 429/);
  assert.match(route, /排队较多/);
  assert.match(route, /onError: \(error\) => chatErrorMessage\(error\)/);
  // 错误文案不透传供应商原文；服务端日志只记状态码，不碰响应体
  assert.doesNotMatch(route, /responseBody/);
  assert.match(route, /\[api\/chat\] 模型调用失败/);
});

test("放歌时助手页用独立粒子场，不叠加歌单琴弦", () => {
  const field = read("../src/components/assistant/assistant-music-field.tsx");
  assert.match(view, /<AssistantMusicField \/>/);
  assert.match(field, /current && playing && !frameMode/);
  assert.match(field, /getAudioTime\(\)/);
  assert.match(field, /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);
  assert.match(field, /prefers-reduced-motion/);
  assert.match(field, /document\.hidden/);
  assert.match(css, /\.assistant-music-field\s*\{/);
  assert.match(css, /pointer-events:\s*none/);
});

test("持续动画只在组合动效门里，减少动效时读数静态可见", () => {
  const { gate, outside } = gateSlice(css);
  for (const name of [
    "assistant-scan",
    "assistant-beacon",
    "assistant-core-spin",
    "assistant-node-breathe",
    "assistant-caret",
    "assistant-bar",
  ]) {
    assert.match(gate, new RegExp(`animation:\\s*${name}\\b`), `${name} 未进门`);
    assert.doesNotMatch(
      outside,
      new RegExp(`animation:\\s*${name}\\b`),
      `${name} 出现在门外`
    );
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation:\s*none !important/);
  assert.match(css, /\.assistant-page \.assistant-prompt:hover,[\s\S]*?transform:\s*none/);
});

test("移动端控制台不挤压正文，核心环退场", () => {
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?\.assistant-core\s*\{\s*display:\s*none/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?grid-template-rows:\s*auto minmax\(320px, 50dvh\) auto/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.assistant-composer-channel\s*\{\s*display:\s*none/);
});