"use client";

import { useEffect, useState } from "react";
import { findAppById } from "@/config/apps";
import { AssistantWindow } from "@/components/assistant/assistant-window";
import type {
  TerminalNote,
  TerminalSnippet,
} from "@/components/terminal/commands";
import { TerminalWindow } from "@/components/terminal/terminal-window";
import { useDesktopRuntime } from "./desktop-runtime";
import { Window } from "./window";

interface GlobalWindowsProps {
  aiEnabled: boolean;
  notes: TerminalNote[];
  snippets: TerminalSnippet[];
  uptimeDays: number | null;
}

/**
 * 全局窗口宿主：终端和助理不属于桌面图标层，由 DesktopShell 直接挂载。
 *
 * 外层 `.os-global-windows` 是 fixed 定位（底部让出 48px 任务栏），
 * 这样最大化/拖拽的坐标系与任务栏一致；它自己不吃指针事件，
 * 只有里面的 `.os-window` 恢复 pointer-events。
 *
 * 这里常驻监听 `z-os:ask`：终端打开助理窗口后把问题交给本组件暂存，
 * AssistantWindow 挂载后发送一次并广播 `z-os:ask-consumed` 清空。
 * 这样 `ask` 不再是「窗口 state 有了、DOM 是空」的幽灵窗口。
 */
export function GlobalWindows({
  aiEnabled,
  notes,
  snippets,
  uptimeDays,
}: GlobalWindowsProps) {
  const { windows } = useDesktopRuntime();
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const open = windows.store.windows;
  const terminalApp = findAppById("terminal");
  const assistantApp = findAppById("assistant");

  useEffect(() => {
    const onAsk = (event: Event) => {
      const question = (event as CustomEvent<{ question?: unknown }>).detail
        ?.question;
      if (typeof question === "string" && question.trim()) {
        setPendingQuestion(question);
      }
    };
    const onConsumed = () => setPendingQuestion(null);
    window.addEventListener("z-os:ask", onAsk);
    window.addEventListener("z-os:ask-consumed", onConsumed);
    return () => {
      window.removeEventListener("z-os:ask", onAsk);
      window.removeEventListener("z-os:ask-consumed", onConsumed);
    };
  }, []);

  return (
    <div className="os-global-windows">
      {open.terminal && terminalApp && (
        <Window id="terminal" app={terminalApp} title="zsh — guest@z-os">
          <TerminalWindow
            aiEnabled={aiEnabled}
            notes={notes}
            snippets={snippets}
            uptimeDays={uptimeDays}
          />
        </Window>
      )}
      {open.assistant && assistantApp && (
        <Window
          id="assistant"
          app={assistantApp}
          title="助理 — 站内问答"
        >
          <AssistantWindow
            aiEnabled={aiEnabled}
            initialQuestion={pendingQuestion}
          />
        </Window>
      )}
    </div>
  );
}
