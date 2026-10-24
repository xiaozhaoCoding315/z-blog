"use client";

import { Terminal } from "lucide-react";

/** 页脚的终端入口（服务端 Footer 中的客户端孤岛） */
export function TerminalLinkButton() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("blog:open-terminal"))
      }
      className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
    >
      <Terminal className="size-4" /> 终端（按 ` 唤起）
    </button>
  );
}
