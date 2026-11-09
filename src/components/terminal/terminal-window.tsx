"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { apps, desktopTileApps, findAppById } from "@/config/apps";
import { useDesktopRuntime } from "../desktop/desktop-runtime";
import {
  WELCOME_LINES,
  completeCommand,
  lineKind,
  runCommand,
  type TerminalContext,
  type TerminalEffect,
  type TerminalNote,
  type TerminalSnippet,
} from "./commands";

export interface TerminalWindowProps {
  notes: TerminalNote[];
  /** Phase 3 才会引入片段数据模型；本阶段由 layout 传入空数组。 */
  snippets: TerminalSnippet[];
  uptimeDays: number | null;
  aiEnabled: boolean;
}

type LineKind = "input" | "output" | "error" | "hint";

interface Line {
  id: number;
  kind: LineKind;
  text: string;
}

const WELCOME_TEXT = WELCOME_LINES.join("\n");
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const TYPE_INTERVAL = 16;
/** 16ms × 36 ≈ 576ms，保证欢迎语在 600ms 内打完 */
const TYPE_TICKS = 36;
const MAX_COMPLETION_HINTS = 12;

/** 同一次页面会话只打一次欢迎语；之后重开终端直接显示全文。 */
let welcomeTypedOnce = false;

/**
 * 终端浮窗内容：只负责输入、历史与本地渲染。
 *
 * 命令解析全在 `commands.ts` 的纯函数里；这里把 effect 落到运行时动作
 * （开窗 / 路由 / 助理 / 预设 / 咖啡），不接收任何函数 props。
 * Esc 不在这里拦截：`Window` 监听全局 keydown 关闭聚焦窗口。
 */
export function TerminalWindow({
  notes,
  snippets,
  uptimeDays,
  aiEnabled,
}: TerminalWindowProps) {
  const { windows, settings, openAssistant, openSettings } =
    useDesktopRuntime();
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const [caret, setCaret] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [typed, setTyped] = useState(() => {
    if (typeof window === "undefined") return 0;
    return welcomeTypedOnce || window.matchMedia(REDUCED_MOTION).matches
      ? WELCOME_TEXT.length
      : 0;
  });
  const [showWelcome, setShowWelcome] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lineIdRef = useRef(0);
  const historyIndexRef = useRef(-1);
  const draftRef = useRef("");

  const context: TerminalContext = {
    apps: apps.map(({ id, title, path, kind }) => ({ id, title, path, kind })),
    desktopAppCount: desktopTileApps.length,
    notes,
    snippets,
    theme: settings.preset,
    uptimeDays,
    aiEnabled,
  };

  // 首次打开：逐字打出欢迎语；减少动效或本会话已经打过时直接显示全文。
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (welcomeTypedOnce) return;
    if (window.matchMedia(REDUCED_MOTION).matches) {
      queueMicrotask(() => {
        welcomeTypedOnce = true;
        setTyped(WELCOME_TEXT.length);
      });
      return;
    }
    // StrictMode 会 mount → cleanup → mount；用微任务标记「本会话已打字」，
    // 第二次 effect 仍会启动打字机，不会因为标记而直接跳过。
    queueMicrotask(() => {
      welcomeTypedOnce = true;
    });
    const step = Math.max(1, Math.ceil(WELCOME_TEXT.length / TYPE_TICKS));
    const timer = window.setInterval(() => {
      setTyped((current) => {
        const next = Math.min(WELCOME_TEXT.length, current + step);
        if (next >= WELCOME_TEXT.length) window.clearInterval(timer);
        return next;
      });
    }, TYPE_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const node = outputRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines, typed]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pushLine = (kind: LineKind, text: string) => {
    const line = { id: lineIdRef.current++, kind, text };
    setLines((previous) => [...previous, line]);
  };

  const applyEffect = (effect: TerminalEffect) => {
    switch (effect.type) {
      case "clear":
        setLines([]);
        setShowWelcome(false);
        return;
      case "close":
        windows.close("terminal");
        return;
      case "open": {
        // settings 是 Phase 2 的系统菜单，不是窗口；显式走 runtime 入口。
        if (effect.appId === "settings") {
          openSettings();
          return;
        }
        // 与命令层一致：app id → 开窗/路由，笔记 slug → 笔记页，片段 id → 片段页。
        if (findAppById(effect.appId)) {
          windows.openApp(effect.appId);
          return;
        }
        if (notes.some((note) => note.slug === effect.appId)) {
          router.push(`/notes/${effect.appId}`);
          return;
        }
        if (snippets.some((snippet) => snippet.id === effect.appId)) {
          router.push(`/snippets?s=${effect.appId}`);
        }
        return;
      }
      case "ask":
        openAssistant();
        window.dispatchEvent(
          new CustomEvent("z-os:ask", { detail: { question: effect.question } })
        );
        return;
      case "theme":
        settings.setPreset(effect.preset);
        return;
      case "coffee":
        window.dispatchEvent(new Event("z-os:coffee"));
        return;
      default:
        return;
    }
  };

  const clearScreen = () => {
    setLines([]);
    setShowWelcome(false);
  };

  const execute = () => {
    const raw = value;
    setValue("");
    setCaret(0);
    historyIndexRef.current = -1;
    draftRef.current = "";
    if (!raw.trim()) return;

    const command = raw.trim();
    setHistory((previous) =>
      previous[previous.length - 1] === command
        ? previous
        : [...previous, command]
    );

    const result = runCommand(raw, context);
    if (result.effect?.type !== "clear") {
      const next: Line[] = [
        { id: lineIdRef.current++, kind: "input", text: command },
      ];
      for (const line of result.lines) {
        next.push({ id: lineIdRef.current++, kind: lineKind(line), text: line });
      }
      setLines((previous) => [...previous, ...next]);
    }
    if (result.effect) applyEffect(result.effect);
  };

  const pushMatches = (matches: string[]) => {
    if (matches.length === 0) return;
    const shown = matches.slice(0, MAX_COMPLETION_HINTS).join("  ");
    const more = matches.length > MAX_COMPLETION_HINTS ? " …" : "";
    pushLine("hint", `提示：匹配 ${shown}${more}`);
  };

  const complete = () => {
    const token = value.split(/\s+/).pop() ?? "";
    if (!token) {
      if (!value.trim()) return;
      // `open `：列出可打开的应用 / 笔记 / 片段 id，不混入命令名。
      const targets = [
        ...new Set([
          ...context.apps.map((app) => app.id),
          ...context.notes.map((note) => note.slug),
          ...context.snippets.map((snippet) => snippet.id),
        ]),
      ].sort();
      pushMatches(targets);
      return;
    }
    const matches = completeCommand(token, context);
    if (matches.length === 1) {
      const next = value.slice(0, value.length - token.length) + matches[0];
      setValue(next);
      setCaret(next.length);
      return;
    }
    pushMatches(matches);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    // 中文输入法候选阶段：Enter/Tab/Ctrl 组合都不能当命令执行。
    if (event.nativeEvent.isComposing) return;

    if (event.key === "Enter") {
      event.preventDefault();
      execute();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (history.length === 0) return;
      if (historyIndexRef.current === -1) {
        draftRef.current = value;
        historyIndexRef.current = history.length - 1;
      } else {
        historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
      }
      setValue(history[historyIndexRef.current]);
      setCaret(history[historyIndexRef.current].length);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndexRef.current === -1) return;
      const next = historyIndexRef.current + 1;
      if (next >= history.length) {
        historyIndexRef.current = -1;
        setValue(draftRef.current);
        setCaret(draftRef.current.length);
      } else {
        historyIndexRef.current = next;
        setValue(history[next]);
        setCaret(history[next].length);
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      complete();
      return;
    }

    // Ctrl+L 与 Ctrl+Shift+L（Cmd 同理）：Shift 不改变小写化后的字母，
    // 同一条判断同时覆盖两种组合，避免与浏览器占用的 Ctrl/Cmd+L 冲突。
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "l"
    ) {
      event.preventDefault();
      clearScreen();
    }

    // Esc 故意不 stopPropagation：交给 Window 关闭聚焦的终端窗口。
  };

  const typing = typed < WELCOME_TEXT.length;
  const visibleWelcome = typing
    ? WELCOME_TEXT.slice(0, typed).split("\n")
    : WELCOME_LINES;

  return (
    <div
      className="os-terminal"
      onClick={(event) => {
        if (event.target === inputRef.current) return;
        // 用户正在选中输出文本时不要抢焦点，否则选择会被折叠。
        if (window.getSelection()?.toString()) return;
        inputRef.current?.focus();
      }}
    >
      <div
        ref={outputRef}
        className="os-terminal-output"
        role="log"
        aria-live="polite"
        aria-label="终端输出"
      >
        {showWelcome && (
          <div className="os-terminal-welcome">
            {visibleWelcome.map((line, index) => {
              const last = index === visibleWelcome.length - 1;
              return (
                <div className="os-terminal-line" data-kind="output" key={index}>
                  {line || " "}
                  {last && typing && (
                    <span className="os-terminal-cursor" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {lines.map((line) => (
          <div
            className="os-terminal-line"
            data-kind={line.kind}
            key={line.id}
          >
            {line.kind === "input" ? (
              <>
                <span className="os-terminal-prompt">guest@z-os ~ %</span>{" "}
                {line.text}
              </>
            ) : (
              line.text || " "
            )}
          </div>
        ))}
      </div>

      <form
        className="os-terminal-form"
        onSubmit={(event) => {
          event.preventDefault();
          execute();
        }}
      >
        <span className="os-terminal-prompt" aria-hidden="true">
          guest@z-os ~ %
        </span>
        <span className="os-terminal-input-wrap">
          {/*
           * 镜像层只负责画方块光标：文字透明，位置跟随 selectionStart。
           * 真正的可见文本仍由 input 渲染，读屏也只读 input。
           */}
          <span className="os-terminal-mirror" aria-hidden="true">
            {value.slice(0, caret)}
            <span className="os-terminal-cursor" />
            {value.slice(caret)}
          </span>
          <input
            ref={inputRef}
            className="os-terminal-input"
            aria-label="终端命令"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setCaret(event.target.selectionStart ?? event.target.value.length);
            }}
            onSelect={(event) =>
              setCaret(event.currentTarget.selectionStart ?? 0)
            }
            onKeyDown={onKeyDown}
          />
        </span>
      </form>
    </div>
  );
}
