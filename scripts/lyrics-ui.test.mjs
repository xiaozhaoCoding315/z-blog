/**
 * 歌词页与律动层的结构守卫：入口、可访问性、音画同步方式、减少动效。
 *   node --test scripts/lyrics-ui.test.mjs
 *
 * 直接读源码，不启动浏览器；行为细节由 lyrics-core.test.mjs 覆盖。
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const layout = read("../src/app/layout.tsx");
const siteLayout = read("../src/app/(site)/layout.tsx");
const player = read("../src/components/playlist/playlist-player.tsx");
const provider = read("../src/components/playlist/music-provider.tsx");
const overlay = read("../src/components/playlist/lyrics-overlay.tsx");
const stage = read("../src/components/playlist/lyrics-stage.tsx");
const server = read("../src/lib/lyrics-server.ts");
const css = read("../src/app/lyrics.css");

test("歌词样式接在动效层之后，且不依赖 JS 才有布局", () => {
  assert.match(
    layout,
    /import "\.\/globals\.css";\s*import "\.\/motion\.css";\s*import "\.\/lyrics\.css";/
  );
  assert.match(css, /\.lyrics-overlay\s*\{/);
  assert.match(css, /\.lyrics-lines\s*\{/);
  assert.match(css, /\.lyrics-line\.is-active/);
});

test("点击 dock 唱片打开歌词页，播放器不卸载、音频不断", () => {
  assert.match(provider, /const openLyrics = useCallback/);
  assert.match(provider, /onClick=\{openLyrics\}/);
  assert.match(provider, /aria-label=\{`打开《\$\{current\.title\}》歌词页`\}/);
  assert.match(provider, /<LyricsOverlay/);
  assert.match(provider, /<LyricsStage/);
  assert.match(provider, /variant="ambient"/);
  assert.match(provider, /lyricsOpen && current/);
  // 音乐挂在站点布局层级，切到其他路由时不会被页面卸载
  assert.match(siteLayout, /<MusicProvider>/);
  assert.match(provider, /<audio/);
  assert.match(provider, /playQueue/);
});

test("歌词页是可访问的对话框：焦点、Esc、减少动效", () => {
  assert.match(overlay, /role="dialog"/);
  assert.match(overlay, /aria-modal="true"/);
  assert.match(overlay, /event\.key === "Escape"/);
  assert.match(overlay, /document\.body\.style\.overflow = "hidden"/);
  assert.match(overlay, /autoFocus/);
  assert.match(overlay, /is-active/);
  assert.match(overlay, /lyrics-line-translation/);
  assert.match(overlay, /onSeek\(line\.time/);
});

test("第三态间奏：蓝紫极光、向上光尘，与主歌绿和高潮金分开", () => {
  assert.match(stage, /bridge: \[157, 183, 255\]/);
  assert.match(stage, /bridge: 0\.75/);
  assert.match(stage, /BRIDGE_VIOLET: \[number, number, number\] = \[186, 160, 255\]/);
  assert.match(stage, /const drawBridgeAurora =/);
  assert.match(stage, /section === "bridge"\) \{\s*drawBridgeAurora/);
  assert.match(stage, /section === "bridge"\) \{\s*\/\/ 间奏没有歌词可落/);
  assert.match(overlay, /bridge: "BRIDGE · 间奏"/);
  assert.match(overlay, /前奏 \/ 主歌 \/ 间奏 \/ 高潮 \/ 尾奏/);
  assert.match(css, /\.lyrics-overlay\[data-section="bridge"\]/);
  assert.match(css, /--lyrics-accent: #9db7ff/);
  assert.match(css, /157 183 255 \/ 0\.22/);
});

test("律动直接读音频时钟，按段落加强，且尊重减少动效", () => {
  assert.match(stage, /requestAnimationFrame/);
  assert.match(stage, /audioRef\.current/);
  assert.match(stage, /currentTime/);
  assert.match(stage, /sectionAt/);
  assert.match(stage, /INTENSITY\[section\]/);
  assert.match(stage, /prefers-reduced-motion/);
  assert.match(stage, /devicePixelRatio/);
  assert.match(stage, /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);
  assert.match(stage, /audioRef,\s*lyrics,\s*playing,\s*variant/);
});

test("放歌时琴弦全站复用；VIP / 失效音源自动跳下一首且不会整队死循环", () => {
  // 只有小元同学控制台让位，其余页面共用同一套琴弦（音频元素始终在布局层）
  assert.match(
    provider,
    /ambientAllowed = !pathname\.startsWith\("\/assistant"\)/
  );
  assert.match(provider, /const handleAudioError = useCallback/);
  assert.match(provider, /audioFailuresRef\.current < queueLength/);
  assert.match(provider, /音源不可用，已自动播放下一首/);
  assert.match(provider, /onError=\{handleAudioError\}/);
  // 真正开始播放才清零失败计数，否则「跳过 → 失败 → 跳过」会无限循环
  assert.match(
    provider,
    /onPlay=\{\(\) => \{\s*audioFailuresRef\.current = 0;/
  );
  assert.match(provider, /队列里的音源都不可用/);
  assert.match(provider, /playlist-dock-skip/);
  // 单曲循环时 audioSrc 不变，必须靠 playToken 重新 load/起播
  assert.match(provider, /setPlayToken\(\(value\) => value \+ 1\)/);
  assert.match(provider, /\[audioSrc, playToken\]/);
});

test("歌词服务端只认网易云数字 id，并带超时和缓存", () => {
  assert.match(server, /\/\^\\d\{1,20\}\$\//);
  assert.match(server, /AbortSignal\.timeout/);
  assert.match(server, /const cache = new Map/);
  assert.match(server, /buildLyrics/);
  assert.doesNotMatch(server, /music-auth|decryptMusicCookie|MUSIC_U/);
});