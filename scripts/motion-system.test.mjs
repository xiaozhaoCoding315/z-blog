/**
 * 全站动效系统守卫：动效可以很饱满，但不能把内容藏死、不能绕过减少动效。
 * 直接读源码文本，不启动浏览器。
 *   node --test scripts/motion-system.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const css = read("../src/app/motion.css");
const layout = read("../src/app/layout.tsx");
const frame = read("../src/components/desktop/page-frame.tsx");
const runtime = read("../src/components/motion/motion-runtime.tsx");
const progress = read("../src/components/motion/scroll-progress.tsx");
const home = read("../src/components/home/personal-home.tsx");
const player = read("../src/components/playlist/playlist-player.tsx");
const musicProvider = read("../src/components/playlist/music-provider.tsx");
const siteLayout = read("../src/app/(site)/layout.tsx");
const playlist = read("../src/app/(site)/(apps)/playlist/page.tsx");
const detail = read("../src/app/(site)/(apps)/playlist/[id]/page.tsx");
const letters = read("../src/app/(site)/(apps)/letters/page.tsx");
const notes = read("../src/app/(site)/(apps)/notes/[slug]/page.tsx");
const assistant = read("../src/components/assistant/assistant-page-view.tsx");
const schemaTest = read("./schema.test.mjs");

function findRule(selector, label) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `缺少 ${label}`);
  let depth = 0;
  let end = -1;
  for (let index = start; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  assert.notEqual(end, -1, `${label} 未闭合`);
  return css.slice(start, end + 1);
}

test("全局动效样式接在 globals 之后，并带首帧开关与兜底", () => {
  assert.match(layout, /import "\.\/globals\.css";\s*import "\.\/motion\.css";/);
  assert.match(layout, /MOTION_BOOT_SCRIPT/);
  assert.match(layout, /classList\.add\("motion-ready"\)/);
  assert.match(layout, /motion-fallback/);
  assert.match(layout, /<MotionRuntime \/>/);
  assert.match(runtime, /document\.documentElement\.classList\.add\("motion-booted"\)/);
  assert.match(runtime, /motion-fallback/);
  assert.match(css, /html\.motion-fallback \[data-reveal\]:not\(\.is-in\)/);
  assert.match(css, /opacity:\s*1 !important/);
});

test("入场、光斑与倾斜都挂在 data 属性上，服务端页面不用变成客户端组件", () => {
  for (const selector of ["[data-reveal]", "[data-spotlight]", "[data-tilt]"]) {
    assert.ok(css.includes(selector), `motion.css 缺少 ${selector}`);
  }
  assert.match(runtime, /querySelectorAll<HTMLElement>\("\[data-reveal\]"\)/);
  assert.match(runtime, /IntersectionObserver/);
  assert.match(runtime, /MutationObserver/);
  assert.match(runtime, /--spot-x/);
  assert.match(runtime, /--tilt-x/);
  assert.match(runtime, /pointerType !== "mouse"/);
  assert.match(runtime, /prefers-reduced-motion: reduce/);
  // 减少动效时直接显示终态，不把内容留在透明里
  assert.match(runtime, /if \(reduce\) element\.classList\.add\("is-in"\)/);
});

test("页面切换有统一入场，滚动进度条只改 transform", () => {
  assert.match(frame, /<ScrollProgress \/>/);
  assert.match(frame, /key=\{pathname\}/);
  assert.match(frame, /fullpage-main route-enter/);
  assert.match(progress, /scaleX\(\$\{ratio\}\)/);
  assert.match(progress, /requestAnimationFrame/);
  const enter = findRule(".route-enter {", "页面入场");
  assert.match(enter, /animation:\s*route-enter/);
});

test("首页、留言、笔记、助手等页面都实际带上动效属性", () => {
  assert.match(home, /data-reveal/);
  assert.match(home, /data-spotlight/);
  assert.match(home, /data-reveal-delay|--reveal-delay/);
  assert.match(home, /className="home-ticker"/);
  assert.match(letters, /data-reveal/);
  assert.match(letters, /data-spotlight/);
  assert.match(notes, /data-reveal/);
  assert.match(assistant, /data-reveal/);
  assert.match(assistant, /<ChatComposer/);
  assert.match(playlist, /data-spotlight/);
  assert.match(playlist, /data-reveal/);
  assert.match(detail, /data-tilt/);
});

test("播放器能暂停、能显示当前曲目封面，并带动画与减少动效守卫", () => {
  assert.match(musicProvider, /const toggle = useCallback/);
  assert.match(musicProvider, /aria-label=\{playing \? "暂停" : "播放"\}/);
  assert.match(player, /playlist-track-cover/);
  assert.match(player, /playlist-track-eq/);
  assert.match(musicProvider, /playlist-dock-vinyl/);
  assert.match(musicProvider, /data-spin=\{playing \? "true" : "false"\}/);
  assert.match(musicProvider, /playlist-dock-glow/);
  assert.match(musicProvider, /playlist-dock-progress/);
  assert.match(musicProvider, /onEnded=\{\(\) => step\(1\)\}/);
  assert.match(musicProvider, /neteaseEmbedUrl/);
  const eq = findRule(".playlist-track-eq i {", "电平条");
  assert.match(eq, /animation:\s*eq-bounce/);
  const paused = findRule(
    '.playlist-player[data-playing="false"] .playlist-track-eq i {',
    "暂停时的电平条"
  );
  assert.match(paused, /animation-play-state:\s*paused/);
  assert.match(css, /@keyframes vinyl-spin/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.playlist-track-eq i,[\s\S]*?animation:\s*none !important/);
});

test("新表与新列都进了幂等 DDL 守卫", () => {
  assert.match(schemaTest, /playlist_suggestions/);
  assert.match(schemaTest, /music_accounts/);
  assert.match(schemaTest, /suggested_by/);
  assert.match(schemaTest, /suggestion_note/);
});
test("播放器控制是命令式的，播放状态不被异步事件来回翻转", () => {
  // 回归：曾用 [audioSrc, playing] effect 驱动 play/pause，play/pause 事件异步迟到，
  // 状态与元素真实状态错相反向，形成每秒数百次 play→pause 的死循环（听感即卡顿）。
  assert.match(musicProvider, /const autoplayRef = useRef/);
  assert.match(musicProvider, /const startPlayback = useCallback/);
  assert.match(musicProvider, /const pausePlayback = useCallback/);
  assert.match(musicProvider, /const syncPlaying = useCallback/);
  // onPlay 先清失败计数再同步真实状态；仍然以元素事件为准，不自造 playing
  assert.match(
    musicProvider,
    /onPlay=\{\(\) => \{[\s\S]{0,120}?syncPlaying\(\);/
  );
  assert.match(musicProvider, /onPause=\{syncPlaying\}/);
  // 只允许换曲 effect 依赖 audioSrc；任何把 playing 也放进依赖的 effect 都会重启回环
  assert.doesNotMatch(musicProvider, /\}, \[audioSrc, playing/);
  assert.doesNotMatch(musicProvider, /if \(playing\)[\s\S]{0,60}audio\.pause\(\)/);
});

test("音频挂在站点布局级的 Provider，路由切换不打断播放", () => {
  assert.match(siteLayout, /<MusicProvider>/);
  assert.match(siteLayout, /import \{ MusicProvider \}/);
  assert.match(musicProvider, /usePathname/);
  assert.match(musicProvider, /<audio/);
  assert.match(musicProvider, /playQueue/);
  assert.match(player, /useMusic\(\)/);
  assert.match(player, /playQueue\(tracks, index/);
});

test("路由入场动画不用 forwards/both，避免 fixed 播放器被 main 的 matrix 困住", () => {
  const rule = findRule(".route-enter {", "路由入场");
  assert.match(rule, /animation:\s*route-enter 560ms[^;]*backwards/);
  assert.doesNotMatch(rule, /animation:[^;]*\bboth\b/);
});
