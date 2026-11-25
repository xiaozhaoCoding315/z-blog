"use client";

import { useState } from "react";

/**
 * 友链页的「复制我的站点信息」：优先 Clipboard API，
 * 在 HTTP 环境下回退到旧 execCommand，失败也不弹假成功。
 */
export function FriendsCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
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
      className="friends-copy"
      onClick={handleCopy}
      aria-live="polite"
    >
      {copied ? "已复制站点信息" : "复制我的站点信息"}
    </button>
  );
}