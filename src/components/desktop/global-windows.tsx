"use client";

import { useDesktopRuntime } from "./desktop-runtime";

/**
 * 全局窗口宿主：终端和助理不属于桌面图标层，由 DesktopShell 直接挂载。
 *
 * Task 4 / Task 5 会在这里渲染真正的终端窗口与助理窗口；本任务只接好
 * “窗口是否存在”的数据流，两个宿主暂时不渲染任何内容。
 */
export function GlobalWindows({ aiEnabled }: { aiEnabled: boolean }) {
  const { windows } = useDesktopRuntime();
  const open = windows.store.windows;

  return (
    <>
      {open.terminal && <TerminalWindowHost />}
      {open.assistant && <AssistantWindowHost aiEnabled={aiEnabled} />}
    </>
  );
}

function TerminalWindowHost() {
  return null;
}

function AssistantWindowHost({ aiEnabled }: { aiEnabled: boolean }) {
  // Task 5 用真实助理窗口替换此宿主；保留 prop 接线，避免下一步再改 GlobalWindows。
  void aiEnabled;
  return null;
}
