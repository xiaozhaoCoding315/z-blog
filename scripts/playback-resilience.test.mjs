/**
 * 播放器回归守卫：失效音源跳过之后必须真的响起下一首，
 * 以及 fixed dock 不能压住终端 / 小元同学的输入区。
 *   node --test scripts/playback-resilience.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const provider = read("../src/components/playlist/music-provider.tsx");
const globals = read("../src/app/globals.css");

test("失效音源的 play() 拒绝不会清掉跳歌后的起播意图", () => {
  assert.match(provider, /const playIntentRef = useRef\(0\)/);
  // select 与用户重新起播都同步推进意图序号
  assert.match(provider, /playIntentRef\.current \+= 1/);
  assert.match(provider, /const intent = playIntentRef\.current/);
  // 跳歌后的 effect：旧曲目的 NotSupportedError 迟到时直接作废
  assert.match(
    provider,
    /if \(cancelled \|\| intent !== playIntentRef\.current\) return;/
  );
  assert.match(provider, /if \(autoplayRef\.current\) \{[\s\S]{0,80}audio\.play\(\)/);
  // 跳过路径仍然由 error → step(1) 驱动
  assert.match(provider, /announceSkip\([\s\S]{0,140}step\(1\);/);
});

test("播放器按实测高度预留底部空间，输入区不会被 dock 盖住", () => {
  assert.match(provider, /const dockRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(provider, /--music-dock-clearance/);
  assert.match(provider, /new ResizeObserver\(sync\)/);
  assert.match(provider, /node\.offsetHeight \+ bottom \+ 12/);
  assert.match(
    globals,
    /padding: 32px 0 calc\(72px \+ var\(--music-dock-clearance, 0px\)\)/
  );
  assert.match(
    globals,
    /height: clamp\(260px, calc\(70dvh - var\(--music-dock-clearance, 0px\)\), 680px\)/
  );
});