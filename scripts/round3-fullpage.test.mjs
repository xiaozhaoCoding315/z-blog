import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as appConfig from "../src/config/apps.ts";

function read(relativePath) {
  try {
    return readFileSync(new URL(relativePath, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

let retrieval = null;
try {
  retrieval = await import("../src/lib/chat-retrieval.ts");
} catch {
  // RED 阶段尚未抽出纯函数；测试会明确报告缺少模块。
}

const css = read("../src/app/globals.css");
const rootLayout = read("../src/app/layout.tsx");
const page = read("../src/app/(site)/page.tsx");
const home = read("../src/components/home/personal-home.tsx");
const appsLayout = read("../src/app/(site)/(apps)/layout.tsx");
const shell = read("../src/components/desktop/desktop-shell.tsx");
const pageFrame = read("../src/components/desktop/page-frame.tsx");
const windowManager = read("../src/components/desktop/use-window-manager.ts");
const terminalPage = read("../src/app/(site)/(apps)/terminal/page.tsx");
const assistantPage = read("../src/app/(site)/(apps)/assistant/page.tsx");
const standaloneTerminal = read("../src/components/terminal/standalone-terminal.tsx");
const standaloneAssistant = read("../src/components/assistant/standalone-assistant.tsx");
const assistantView = read("../src/components/assistant/assistant-page-view.tsx");
const assistantWindow = read("../src/components/assistant/assistant-window.tsx");
const assistantShared = read("../src/components/assistant/assistant-shared.tsx");
const terminalWindow = read("../src/components/terminal/terminal-window.tsx");
const commands = read("../src/components/terminal/commands.ts");
const chatRoute = read("../src/app/api/chat/route.ts");
const chatRetrieval = read("../src/lib/chat-retrieval.ts");
const site = read("../src/config/site.ts");
const terminalCommandsTest = read("./terminal-commands.test.mjs");
const nextConfig = read("../next.config.ts");
const packageJson = read("../package.json");
const deployScript = read("../scripts/deploy.sh");

const FULL_PAGE_PATHS = [
  "/terminal",
  "/projects",
  "/about",
  "/playlist",
  "/notes",
  "/assistant",
  "/letters",
];

function combinedGate(source) {
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

test("第三轮回归进入全量测试命令，部署脚本保持无需提交", () => {
  assert.match(packageJson, /scripts\/round3-fullpage\.test\.mjs/);
  assert.match(deployScript, /tar czf/);
  assert.doesNotMatch(deployScript, /git (?:commit|push)/);
});

test("七个主入口都有完整页面路径，子路径也走全页外壳", () => {
  assert.deepEqual(appConfig.primaryApps.map((app) => app.path), FULL_PAGE_PATHS);
  assert.deepEqual(appConfig.publicApps.map((app) => app.path), FULL_PAGE_PATHS);
  assert.equal(typeof appConfig.isFullPagePath, "function");
  for (const path of FULL_PAGE_PATHS) {
    assert.equal(appConfig.isFullPagePath(path), true, `${path} 应为全页`);
  }
  assert.equal(appConfig.isFullPagePath("/notes/hello"), true);
  assert.equal(appConfig.isFullPagePath("/life"), false);
  assert.equal(appConfig.isFullPagePath("/"), false);
});

test("首页七个入口全部是完整页面链接，不再开局部小窗", () => {
  assert.match(home, /href=\{app\.path(?: \?\? "\/")?\}/);
  assert.doesNotMatch(home, /openApp\(app\.id\)/);
  assert.doesNotMatch(home, /home-window-layer|HomeWindowFrame/);
  assert.match(home, /className="home-hero-nav"/);
  assert.match(home, /className="home-intro-card"/);
  assert.match(home, /className="home-weather"/);
  assert.match(home, /className="home-entry-index"/);
  assert.match(home, /className="home-section-index"/);
  assert.match(page, /home-note-visual/);
  assert.doesNotMatch(page, /windowContent|KanbanBoard|AboutProfile/);
  assert.match(page, /<Suspense fallback=\{<ReadingFallback label="实时状态" \/>\}>/);
  assert.match(page, /ReadingFallback/);
});

test("窗口深链与主入口统一走路径优先，隐藏应用仍被挡住", () => {
  assert.match(windowManager, /if \(!isPrimaryAppId\(id\)\) return;/);
  assert.match(windowManager, /if \(app\.path\) \{\s*router\.push\(app\.path\);/);
  assert.doesNotMatch(
    windowManager,
    /if \(app\.kind === "route"\) \{\s*if \(app\.path\) router\.push/
  );
});

test("全页外壳按路径切换，七个入口有完整页面顶栏", () => {
  assert.match(appsLayout, /import \{ PageFrame \}/);
  assert.match(appsLayout, /<PageFrame/);
  assert.match(pageFrame, /isFullPagePath\(pathname\)/);
  assert.match(pageFrame, /className="fullpage-topbar"/);
  assert.match(pageFrame, /className="fullpage-main(?: route-enter)?"/);
  assert.match(pageFrame, /primaryApps\.map/);
  assert.match(pageFrame, /<AppFrame>/);
  assert.match(shell, /import \{ isFullPagePath, publicApps \}/);
  assert.match(shell, /data-full=\{fullPage \? "true" : "false"\}/);
});

test("终端与 AI 助理各有独立完整页面，终端 ask 直达助理页", () => {
  assert.match(terminalPage, /<StandaloneTerminal/);
  assert.match(assistantPage, /<StandaloneAssistant/);
  assert.match(standaloneTerminal, /dynamic\(/);
  assert.match(standaloneTerminal, /TerminalWindow/);
  assert.match(standaloneTerminal, /onExit=\{onExit\}/);
  assert.match(standaloneAssistant, /dynamic\(/);
  assert.match(standaloneAssistant, /AssistantPageView/);
  assert.match(terminalWindow, /case "close":[\s\S]*?onExit/);
  assert.match(terminalWindow, /router\.push\(`\/assistant\?q=/);
  assert.doesNotMatch(terminalWindow, /openAssistant\(\)/);
});

test("助理页复用真实流式状态、来源卡片与仓库笔记建议", () => {
  assert.match(assistantShared, /type === "data-sources"/);
  assert.match(assistantWindow, /from "@\/components\/assistant\/assistant-shared"/);
  assert.match(assistantView, /useChat\(\{/);
  assert.match(assistantView, /messageSources\(/);
  assert.match(assistantView, /retrievalEnabled/);
  assert.match(assistantView, /prompts\.map/);
  assert.match(assistantView, /window\.location\.search/);
  assert.match(assistantView, /status === "streaming"/);
  assert.match(assistantView, /NOT AVAILABLE/);
  assert.doesNotMatch(assistantView, /在线人数|示例文章|假数据/);
});

test("多轮追问的检索 query 会带上近期问题与已回答要点", () => {
  assert.ok(retrieval, "缺少 src/lib/chat-retrieval.ts 纯函数模块");
  assert.match(chatRoute, /from "@\/lib\/chat-retrieval"/);
  assert.match(chatRetrieval, /export function buildRetrievalQuery/);
  const longQuestion = "详细解释一下 Next 16 的 Cache Components 工作原理";
  const messages = [
    {
      id: "1",
      role: "user",
      parts: [{ type: "text", text: "RAG 的召回率怎么优化？" }],
    },
    {
      id: "2",
      role: "assistant",
      parts: [{ type: "text", text: "先用相对窗口，再限制单篇块数。" }],
    },
    {
      id: "3",
      role: "user",
      parts: [{ type: "text", text: "那部署呢？" }],
    },
  ];
  assert.equal(retrieval.buildRetrievalQuery(messages.slice(2)), "那部署呢？");
  const query = retrieval.buildRetrievalQuery(messages);
  assert.match(query, /RAG 的召回率怎么优化/);
  assert.match(query, /已回答要点：先用相对窗口，再限制单篇块数/);
  assert.match(query, /当前问题：那部署呢/);
  assert.equal(
    retrieval.buildRetrievalQuery([
      {
        id: "4",
        role: "user",
        parts: [{ type: "text", text: longQuestion }],
      },
    ]),
    longQuestion
  );
});

test("首页与全页路由恢复自然文档滚动，根布局不再锁死视口高度", () => {
  const lock = css.indexOf("@media (min-width: 768px) {\n  body {\n    overflow: hidden;");
  const override = css.indexOf(
    'html:has(.os-shell[data-home="true"]),\nhtml:has(.os-shell[data-full="true"]) {'
  );
  assert.ok(lock >= 0, "缺少桌面 body 锁滚动规则");
  assert.ok(override > lock, "首页/全页覆盖必须写在未分层规则之后");
  assert.match(
    css,
    /html:has\(\.os-shell\[data-home="true"\]\),\s*html:has\(\.os-shell\[data-full="true"\]\)\s*\{[^}]*height:\s*auto;[^}]*min-height:\s*100dvh;/
  );
  assert.match(
    css,
    /html:has\(\.os-shell\[data-home="true"\]\) body,\s*html:has\(\.os-shell\[data-full="true"\]\) body\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;/
  );
  assert.match(
    css,
    /\.os-shell\[data-home="true"\],\s*\.os-shell\[data-full="true"\]\s*\{/
  );
  assert.match(rootLayout, /"dark min-h-dvh antialiased"/);
  assert.match(rootLayout, /className="flex min-h-dvh flex-col"/);
  assert.doesNotMatch(rootLayout, /h-full|data-scroll-behavior="smooth"/);
  assert.doesNotMatch(css, /@apply font-sans scroll-smooth|html\s*\{\s*scroll-behavior:\s*smooth;/);
  assert.match(home, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
});

test("CSS 动态背景与助理流线只在组合动效门里运行，基础态可见", () => {
  for (const selector of [
    ".home-weather-rain",
    ".home-weather-cloud-a",
    ".home-weather-ring",
    ".assistant-flow-line",
    ".standalone-terminal-shell",
  ]) {
    assert.ok(css.includes(selector), `缺少 ${selector} 基础样式`);
  }
  assert.match(css, /\.home-weather-rain\s*\{[^}]*opacity:\s*0\.[1-9]/);
  const { gate, outside } = combinedGate(css);
  for (const name of [
    "home-rain-fall",
    "home-cloud-drift",
    "home-glow-breathe",
    "home-ring-pulse",
    "assistant-flow",
  ]) {
    assert.match(gate, new RegExp(`animation:\\s*${name}\\b`), `${name} 未进门`);
    assert.doesNotMatch(
      outside,
      new RegExp(`animation:\\s*${name}\\b`),
      `${name} 出现在门外`
    );
  }
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.assistant-flow-line/
  );
});

test("所在地改为北京，终端与测试不再残留杭州", () => {
  assert.match(site, /status: "在北京，最近在学做饭"/);
  assert.match(site, /city: "北京"/);
  assert.match(site, /latitude: 39\.9042/);
  assert.match(site, /longitude: 116\.4074/);
  assert.match(commands, /city: string;/);
  assert.match(commands, /Host: \$\{ctx\.city\}/);
  assert.match(terminalWindow, /city: siteConfig\.weather\.city/);
  assert.doesNotMatch(commands, /杭州/);
  assert.doesNotMatch(site, /杭州/);
  assert.doesNotMatch(terminalCommandsTest, /杭州/);
});

test("旧 URL 与 AI 引用数据部件仍保持兼容", () => {
  for (const [source, destination] of [
    ["/blog", "/notes"],
    ["/archives", "/notes"],
    ["/changelog", "/journal"],
    ["/guestbook", "/letters"],
  ]) {
    assert.match(
      nextConfig,
      new RegExp(
        `source: "${source.replaceAll("/", "\\/")}", destination: "${destination.replaceAll("/", "\\/")}", permanent: true`
      )
    );
  }
  assert.match(chatRoute, /type: "data-sources"/);
});
