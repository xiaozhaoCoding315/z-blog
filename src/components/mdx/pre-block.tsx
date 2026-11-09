"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** 语言标识 → 展示名（只映射常用的，其余按原名显示） */
const LANG_LABEL: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  jsx: "JSX",
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  zsh: "Shell",
  sql: "SQL",
  yml: "YAML",
  yaml: "YAML",
  json: "JSON",
  md: "Markdown",
  mdx: "MDX",
  css: "CSS",
  html: "HTML",
  java: "Java",
  py: "Python",
  python: "Python",
  go: "Go",
  rust: "Rust",
  dockerfile: "Dockerfile",
  ini: "INI",
  diff: "Diff",
  plaintext: "Text",
};

export function PreBlock(props: React.ComponentProps<"pre">) {
  // rehype-pretty-code 会把 ```ts title="x.ts" 写成 <pre data-language="ts" data-theme="...">
  const language =
    (props as Record<string, unknown>)["data-language"] as string | undefined;

  return (
    <div className="group/code relative">
      {language && LANG_LABEL[language] && (
        <span className="pointer-events-none absolute right-11 top-2.5 z-10 rounded border border-border/50 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/80 backdrop-blur">
          {LANG_LABEL[language]}
        </span>
      )}
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
      className="absolute right-2.5 top-2.5 z-10 inline-flex size-7 items-center justify-center rounded-md border border-border/60 bg-background/70 text-muted-foreground opacity-0 backdrop-blur transition hover:text-foreground group-hover/code:opacity-100 focus-visible:opacity-100"
    >
      {copied ? <Check className="size-3.5 text-ok" /> : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}
