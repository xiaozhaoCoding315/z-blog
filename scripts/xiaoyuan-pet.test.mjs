/**
 * 潮汐小元守卫：全站挂载、单一共享会话、持久化快照与定位避让。
 *   node --test scripts/xiaoyuan-pet.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PET_POSITION_KEY,
  clampPetPosition,
  readPetPosition,
  writePetPosition,
} from "../src/lib/pet-position.ts";
import {
  isSongRecommendationRequest,
  pickPetMusicCandidate,
} from "../src/lib/pet-music.ts";

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const layout = read("../src/app/layout.tsx");
const siteLayout = read("../src/app/(site)/layout.tsx");
const shell = read("../src/components/desktop/desktop-shell.tsx");
const provider = read("../src/components/assistant/assistant-provider.tsx");
const pet = read("../src/components/assistant/xiaoyuan-pet.tsx");
const musicProvider = read("../src/components/playlist/music-provider.tsx");
const pageView = read("../src/components/assistant/assistant-page-view.tsx");
const windowView = read("../src/components/assistant/assistant-window.tsx");
const session = read("../src/lib/assistant-session.ts");
const css = read("../src/app/pet.css");

test("小元同学挂在站点外壳里，所有页面都点得到", () => {
  assert.match(siteLayout, /<AssistantChatProvider enabled=\{chatEnabled\}>/);
  assert.match(siteLayout, /<MusicProvider>[\s\S]*<DesktopShell/);
  assert.match(shell, /import \{ XiaoyuanPet \}/);
  assert.match(shell, /<XiaoyuanPet chatEnabled=\{aiEnabled\} \/>/);
  assert.match(pet, /export function XiaoyuanPet/);
  assert.match(pet, /if \(!chatEnabled\) return null/);
  assert.match(pet, /className="xiaoyuan-pet"/);
  assert.match(pet, /aria-label="小元同学对话"/);
  assert.match(pet, /XiaoyuanMascot/);
  assert.match(css, /\.xiaoyuan-pet\s*\{/);
  assert.match(css, /\.xiaoyuan-mascot-body/);
  // 参考图形态：圆坐垫、打结领巾、全息电路与两侧对话气泡。
  assert.match(pet, /xiaoyuan-mascot-cushion/);
  assert.match(pet, /xiaoyuan-mascot-collar/);
  assert.match(pet, /xiaoyuan-mascot-circuit/);
  assert.match(pet, /xiaoyuan-mascot-hud/);
  assert.match(pet, /xiaoyuan-mascot-headphones/);
  assert.match(pet, /className="xiaoyuan-pet-eq"/);
});

test("助手页、终端窗口与萌宠共用同一个 useChat 实例", () => {
  assert.match(provider, /useChat\(\{/);
  assert.match(provider, /id:\s*"xiaoyuan-global"/);
  assert.match(provider, /new DefaultChatTransport\(\{ api: "\/api\/chat" \}\)/);
  assert.match(provider, /useAssistantChat/);
  assert.match(pageView, /useAssistantChat\(\)/);
  assert.match(windowView, /useAssistantChat\(\)/);
  assert.doesNotMatch(pageView, /useChat\(\{/);
  assert.doesNotMatch(windowView, /useChat\(\{/);
  // 助手页的 ?q= 与终端 ask 都写进共享会话，而不是各自的局部状态。
  assert.match(pageView, /send\(question\)/);
  assert.match(windowView, /send\(question\)/);
  // 对话在萌宠面板和整页之间切换后仍然指向同一组消息。
  assert.match(pet, /messages\.map\(\(message\)/);
  assert.match(pet, /const \{[\s\S]*messages,[\s\S]*send,[\s\S]*\} = useAssistantChat\(\)/);
});

test("会话快照存 localStorage，读到坏数据也不渲染", () => {
  assert.match(session, /ASSISTANT_SESSION_KEY = "z-os:xiaoyuan-chat:v1"/);
  assert.match(session, /ASSISTANT_SESSION_LIMIT = 80/);
  assert.match(session, /JSON\.parse\(raw\)/);
  assert.match(session, /catch \{\s*return \[\]/);
  assert.match(session, /role !== "user" && role !== "assistant"/);
  assert.match(session, /href\.startsWith\("\/"\) && !href\.startsWith\("\/\/"\)/);
  assert.match(session, /slice\(-ASSISTANT_SESSION_LIMIT\)/);
  assert.match(session, /slice\(-12\)/);
  // Provider 只在挂载后恢复，避免 SSR 与客户端首帧不一致。
  assert.match(provider, /readAssistantSession\(window\.localStorage\)/);
  assert.match(provider, /writeAssistantSession\(window\.localStorage, messages\)/);
  assert.match(provider, /SAVE_DELAY_MS/);
  assert.match(provider, /addEventListener\("pagehide", flush\)/);
  // 未完成恢复的页面离开时不得用空数组覆盖已存对话。
  assert.match(
    provider,
    /const flush = \(\) => \{\s*if \(!hydratedRef\.current\) return;[\s\S]*?writeAssistantSession\(window\.localStorage, messagesRef\.current\)/
  );
  assert.match(provider, /writeAssistantSession\(window\.localStorage, \[\]\)/);
  assert.match(provider, /ASSISTANT_SESSION_KEY/);
  assert.match(provider, /addEventListener\("storage", onStorage\)/);
});

test("面板直接对话，在助手页则把焦点送回整页输入框", () => {
  assert.match(pet, /assistantRoute/);
  assert.match(pet, /\[data-assistant-composer\]/);
  assert.match(pet, /scrollIntoView\(/);
  assert.match(pet, /composer\.focus\(/);
  assert.match(pageView, /data-assistant-composer/);
  assert.match(pet, /\(source\.href\?\.trim\(\) \|\| `\/notes\/\$\{source\.slug\}`\)/);
  assert.match(pet, /<Link[\s\S]*href="\/assistant"/);
  assert.match(pet, /maxLength=\{2000\}/);
  assert.match(pet, /Shift\+Enter 换行/);
  assert.match(pet, /event\.nativeEvent\.isComposing/);
  assert.match(pet, /clearConversation/);
  assert.match(pet, /onClick=\{retry\}/);
  assert.match(pet, /xiaoyuan-streaming|xiaoyuan-caret/);
  // 点击与待机都有自己的反馈动作。
  assert.match(pet, /data-idle=/);
  assert.match(pet, /data-press=/);
  assert.match(pet, /IDLE_ACTIONS/);
  assert.match(pet, /PET_MUSIC_QUIPS/);
  assert.match(pet, /xiaoyuan-pet-burst/);
  assert.match(pet, /xiaoyuan-pet-quip/);
});

test("萌宠有自己的日常动作：零食、运动、游戏与手机", () => {
  assert.match(pet, /const ACTIVITIES = \["snack", "workout", "game", "phone"\]/);
  assert.match(pet, /data-activity=\{activity \?\? "none"\}/);
  assert.match(pet, /ACTIVITY_HOLD_MS/);
  assert.match(pet, /PET_ACTIVITY_QUIPS/);
  assert.match(pet, /xiaoyuan-mascot-snack/);
  assert.match(pet, /xiaoyuan-mascot-cookie/);
  assert.match(pet, /xiaoyuan-mascot-dumbbell/);
  assert.match(pet, /xiaoyuan-mascot-controller/);
  assert.match(pet, /xiaoyuan-mascot-phone/);
  assert.match(pet, /xiaoyuan-mascot-hearts/);
  assert.match(css, /\[data-activity="snack"\][\s\S]*?\.xiaoyuan-mascot-snack/);
  assert.match(css, /\[data-activity="workout"\][\s\S]*?\.xiaoyuan-mascot-dumbbell/);
  assert.match(css, /\[data-activity="game"\][\s\S]*?\.xiaoyuan-mascot-controller/);
  assert.match(css, /\[data-activity="phone"\][\s\S]*?\.xiaoyuan-mascot-phone/);
  // 放歌或生成回答时，日常动作让位。
  assert.match(
    css,
    /\.xiaoyuan-pet\[data-music="false"\]\[data-busy="false"\]\[data-activity="snack"\]/
  );
});

test("重复检索来源按文章归组，旧会话也不再显示重复标题", () => {
  const route = read("../src/app/api/chat/route.ts");
  const shared = read("../src/components/assistant/assistant-shared.tsx");
  assert.match(route, /mergeChunksByPost\(pickContext\(candidates\)\)/);
  assert.match(shared, /export function groupMessageSources/);
  assert.match(pet, /groupMessageSources\(sources\)/);
  assert.match(windowView, /groupMessageSources\(sources\)/);
  assert.match(pageView, /groupMessageSources\(sources\)/);
});

test("同一篇文章的多个检索块合并成一条来源", async () => {
  const { mergeChunksByPost } = await import("../src/lib/chat-retrieval.ts");
  const merged = mergeChunksByPost([
    {
      post_slug: "memory",
      title: "Agent 的「记忆」",
      heading: "什么时候该「忘记」",
      content: "## 什么时候该「忘记」\n第一段",
      similarity: 0.82,
    },
    {
      post_slug: "memory",
      title: "Agent 的「记忆」",
      heading: "什么时候该「忘记」",
      content: "## 什么时候该「忘记」\n第二段",
      similarity: 0.76,
    },
    {
      post_slug: "deploy",
      title: "部署笔记",
      heading: null,
      content: "部署正文",
      similarity: 0.61,
    },
  ]);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].content, "## 什么时候该「忘记」\n第一段\n\n第二段");
  assert.equal(merged[0].similarity, 0.82);
  assert.equal(merged[1].post_slug, "deploy");

  // 不同小节仍然合并成一篇来源，但各自的小节标题留在正文里。
  const mixed = mergeChunksByPost([
    {
      post_slug: "memory",
      title: "Agent 的「记忆」",
      heading: "什么时候该「忘记」",
      content: "## 什么时候该「忘记」\n第一段",
      similarity: 0.8,
    },
    {
      post_slug: "memory",
      title: "Agent 的「记忆」",
      heading: "召回之后",
      content: "## 召回之后\n第二段",
      similarity: 0.7,
    },
  ]);
  assert.equal(mixed.length, 1);
  assert.match(mixed[0].content, /## 召回之后\n第二段/);
});

test("萌宠避开播放器与移动 dock，动效服从减少动效", () => {
  assert.match(css, /z-index:\s*60/);
  assert.match(css, /bottom:\s*calc\(18px \+ var\(--music-dock-clearance, 0px\)\)/);
  assert.match(
    css,
    /\.os-shell\[data-home="true"\] \.xiaoyuan-pet[\s\S]*?calc\(124px \+ env\(safe-area-inset-bottom, 0px\)\)/
  );
  assert.match(
    css,
    /\.os-shell:not\(\[data-home="true"\]\):not\(\[data-full="true"\]\) \.xiaoyuan-pet[\s\S]*?calc\(60px \+ var\(--music-dock-clearance, 0px\)\)/
  );
  const motionGate =
    "@media (scripting: enabled) and (prefers-reduced-motion: no-preference) {";
  assert.match(css, /@media \(scripting: enabled\) and \(prefers-reduced-motion: no-preference\)/);
  const gate = css.slice(
    css.indexOf(motionGate),
    css.indexOf("@keyframes xiaoyuan-breathe")
  );
  for (const name of [
    "xiaoyuan-breathe",
    "xiaoyuan-blink",
    "xiaoyuan-dance",
    "xiaoyuan-note",
    "xiaoyuan-eq",
    "xiaoyuan-squish",
    "xiaoyuan-hud-float",
    "xiaoyuan-circuit-pulse",
    "xiaoyuan-snack-bob",
    "xiaoyuan-curl",
    "xiaoyuan-game-bob",
    "xiaoyuan-phone-bob",
    "xiaoyuan-panel-in",
    "xiaoyuan-caret",
  ]) {
    assert.match(
      gate,
      new RegExp(`animation:\\s*${name}\\b`),
      `${name} 未进萌宠动效门`
    );
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /xiaoyuan-mascot-body[\s\S]*?animation:\s*none !important/);
  assert.match(css, /--pet-panel-max/);
  assert.match(layout, /import "\.\/assistant\.css";\s*import "\.\/pet\.css";/);
});

test("播放音乐时戴上耳机跟拍摇摆，暂停后收起来", () => {
  assert.match(musicProvider, /root\.dataset\.musicPlaying = playing/);
  assert.match(
    css,
    /\.xiaoyuan-pet\[data-music="true"\] \.xiaoyuan-pet-trigger \.xiaoyuan-mascot-headphones/
  );
  assert.match(
    css,
    /\.xiaoyuan-pet\[data-music="true"\] \.xiaoyuan-pet-trigger \.xiaoyuan-mascot-body[\s\S]*?xiaoyuan-dance/
  );
  // 面板打开时，标题栏里的头像也要戴耳机跟拍，而不是只有外面的萌宠在动。
  assert.match(
    css,
    /\.xiaoyuan-pet\[data-music="true"\] \.xiaoyuan-panel-avatar \.xiaoyuan-mascot-headphones/
  );
  assert.match(
    css,
    /\.xiaoyuan-pet\[data-music="true"\] \.xiaoyuan-panel-avatar \.xiaoyuan-mascot-body[\s\S]*?xiaoyuan-dance/
  );
  assert.match(css, /xiaoyuan-mascot-note/);
  assert.match(css, /xiaoyuan-tap-left/);
  assert.match(css, /xiaoyuan-eq/);
  assert.match(pet, /PET_MUSIC_QUIPS/);
  // 放歌时待机动作让位给跟拍摇摆，避免两套 animation 互相盖住。
  assert.match(
    css,
    /\.xiaoyuan-pet\[data-music="false"\]\[data-busy="false"\]\[data-activity="none"\]\[data-idle="stretch"\]/
  );
});

test("音乐感应覆盖页内媒体、mediaSession 与跨站播放器", () => {
  // 页内 <audio>/<video> 的 play/pause 不冒泡，捕获阶段监听才能收到。
  assert.match(pet, /querySelectorAll<HTMLMediaElement>\(\s*"audio, video"\s*\)/);
  assert.match(pet, /document\.addEventListener\(event, onMedia, true\)/);
  assert.match(pet, /window\.setInterval\(syncMedia, 1500\)/);
  assert.match(pet, /navigator\.mediaSession\?\.playbackState === "playing"/);
  // 站内播放器（data-music-playing）、页内媒体、手动开关汇成一个根属性。
  assert.match(pet, /root\.dataset\.music =/);
  assert.match(pet, /document\.documentElement\.dataset\.musicPlaying === "true"/);
  assert.match(pet, /new MutationObserver\(sync\)/);
  // 跨站 iframe 读不到播放状态时，面板里可以手动戴上耳机。
  assert.match(pet, /className="xiaoyuan-panel-music"/);
  assert.match(pet, /aria-pressed=\{manualMusic\}/);
  assert.match(pet, /aria-label=\{\s*manualMusic \? "关闭小元的听歌模式"/);
  assert.match(css, /\.xiaoyuan-panel-music\[aria-pressed="true"\]/);
  assert.match(css, /\.xiaoyuan-panel-music-label/);
});

test("萌宠拖动位置夹在视口内，并在本地记住", () => {
  assert.match(pet, /data-dragged=\{position \? "true" : "false"\}/);
  assert.match(pet, /onPointerDown=\{onPointerDown\}/);
  assert.match(pet, /setPointerCapture\(event\.pointerId\)/);
  assert.match(pet, /Math\.hypot\(dx, dy\) < 5/);
  assert.match(pet, /writePetPosition\(window\.localStorage, current\)/);
  assert.match(pet, /className="xiaoyuan-panel-home"/);
  assert.match(css, /\.xiaoyuan-pet\[data-dragged="true"\]/);
  assert.match(css, /\.xiaoyuan-pet\[data-dragged="true"\] \.xiaoyuan-panel/);
  assert.match(css, /touch-action:\s*none/);

  const size = { width: 96, height: 104 };
  const viewport = { width: 1200, height: 800 };
  assert.deepEqual(clampPetPosition({ x: -40, y: -20 }, viewport, size), {
    x: 8,
    y: 8,
  });
  assert.deepEqual(clampPetPosition({ x: 5000, y: 5000 }, viewport, size), {
    x: 1096,
    y: 688,
  });

  const store = new Map();
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  };

  assert.equal(readPetPosition(storage), null);
  assert.equal(writePetPosition(storage, { x: 240, y: 320 }), true);
  assert.match(store.get(PET_POSITION_KEY), /"x":240/);
  assert.deepEqual(readPetPosition(storage), { x: 240, y: 320 });

  store.set(PET_POSITION_KEY, '{"x":"nope","y":1}');
  assert.equal(readPetPosition(storage), null);
  store.set(PET_POSITION_KEY, "[240,320]");
  assert.equal(readPetPosition(storage), null);

  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(readPetPosition(blocked), null);
  assert.equal(writePetPosition(blocked, { x: 1, y: 2 }), false);
});

test("小元能听懂点歌，推荐后直接送到播放器", () => {
  assert.match(pet, /recommendSongForPet/);
  assert.match(pet, /requestPlayQueue\(/);
  assert.match(pet, /isSongRecommendationRequest\(text\)/);
  assert.match(pet, /className="xiaoyuan-panel-pick"/);
  assert.match(pet, /className="xiaoyuan-pet-recommend"/);
  assert.match(css, /\.xiaoyuan-pet-recommend\s*\{/);
  assert.match(css, /\.xiaoyuan-panel-pick\s*\{/);

  for (const text of [
    "推荐一首歌",
    "来首歌",
    "放点音乐",
    "换一首歌",
    "听点什么歌",
    "推荐一首曲子",
    "给我放首歌吧",
  ]) {
    assert.equal(isSongRecommendationRequest(text), true, text);
  }
  for (const text of [
    "推荐一篇站内笔记",
    "你了解这个站吗",
    "你最近在做什么项目？",
    "帮我写个歌单接口",
    "怎么给歌单排序",
  ]) {
    assert.equal(isSongRecommendationRequest(text), false, text);
  }

  const candidate = (id) => ({
    track: { id, title: `歌 ${id}`, artist: "小元", url: "", platform: "netease", externalId: "1", coverUrl: null, duration: 180, note: "" },
    playlistId: null,
    playlistTitle: "小元推荐",
    playlistCover: null,
  });
  const candidates = [candidate(1), candidate(2)];
  assert.equal(pickPetMusicCandidate(candidates, 1, () => 0).track.id, 2);
  assert.equal(pickPetMusicCandidate(candidates, null, () => 0.99).track.id, 2);
  assert.equal(pickPetMusicCandidate([], null), null);
  // 只有被排除的那一首时仍然放它，而不是告诉用户「没有歌」。
  assert.equal(pickPetMusicCandidate([candidates[0]], 1, () => 0.5).track.id, 1);
});