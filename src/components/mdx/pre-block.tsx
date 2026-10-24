"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function PreBlock(props: React.ComponentProps<"pre">) {
  return (
    <div className="group/code relative">
      <pre {...props} />
      <CopyButton />
    </div>
  );
}

function CopyButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent<HTMLButtonElement>) {
    const container = e.currentTarget.closest("div.group/code");
    const code = container?.querySelector("pre")?.textContent ?? "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // HTTP 环境下 clipboard API 可能不可用，回退到旧 API
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      aria-label="复制代码"
      onClick={handleCopy}
      className="absolute right-2.5 top-2.5 z-10 inline-flex size-7 items-center justify-center rounded-md border border-border/60 bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition hover:text-foreground group-hover/code:opacity-100"
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}
