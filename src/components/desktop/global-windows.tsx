"use client";

import { findAppById } from "@/config/apps";
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
 */
export function GlobalWindows({
  aiEnabled,
  notes,
  snippets,
  uptimeDays,
}: GlobalWindowsProps) {
  const { windows } = useDesktopRuntime();
  const open = windows.store.windows;
  const terminalApp = findAppById("terminal");

  return (
    <div className="os-global-windows">
      {open.terminal && terminalApp && (
        <Window id="terminal" app={terminalApp}>
          <TerminalWindow
            aiEnabled={aiEnabled}
            notes={notes}
            snippets={snippets}
            uptimeDays={uptimeDays}
          />
        </Window>
      )}
      {open.assistant && <AssistantWindowHost aiEnabled={aiEnabled} />}
    </div>
  );
}

function AssistantWindowHost({ aiEnabled }: { aiEnabled: boolean }) {
  // Task 5 用真实助理窗口替换此宿主；保留 prop 接线，避免下一步再改 GlobalWindows。
  void aiEnabled;
  return null;
}
