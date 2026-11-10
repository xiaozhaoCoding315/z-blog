"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type {
  TerminalNote,
  TerminalSnippet,
} from "@/components/terminal/commands";

const TerminalWindowLazy = dynamic(
  () =>
    import("@/components/terminal/terminal-window").then(
      (mod) => mod.TerminalWindow
    ),
  { ssr: false }
);

interface StandaloneTerminalProps {
  notes: TerminalNote[];
  snippets: TerminalSnippet[];
  uptimeDays: number | null;
  aiEnabled: boolean;
}

/**
 * 完整终端页只加载终端 chunk；`exit` 返回首页而不是关闭一个不存在的浮窗。
 */
export function StandaloneTerminal({
  notes,
  snippets,
  uptimeDays,
  aiEnabled,
}: StandaloneTerminalProps) {
  const router = useRouter();
  const onExit = () => router.push("/");

  return (
    <div className="standalone-terminal-shell">
      <div className="standalone-terminal-head">
        <span>Z·OS / TERMINAL</span>
        <span>输入 help 查看命令 · exit 返回首页</span>
      </div>
      <div className="standalone-terminal-body">
        <TerminalWindowLazy
          notes={notes}
          snippets={snippets}
          uptimeDays={uptimeDays}
          aiEnabled={aiEnabled}
          onExit={onExit}
        />
      </div>
    </div>
  );
}
