"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Check, Link2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 文章页浮动工具条（桌面端显示在右侧留白区）：
 * 回到顶部 + 复制链接 / 分享 + 滚动进度环。
 */
export function ArticleTools() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const p = total > 0 ? Math.min(1, window.scrollY / total) : 0;
      setProgress(p);
      setVisible(window.scrollY > 480);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
    } catch {
      /* 用户取消分享，走复制兜底 */
    }
    await copy(url);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const circumference = 2 * Math.PI * 15;

  return (
    <div
      className={cn(
        "fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2 transition-all duration-300 xl:flex",
        visible
          ? "pointer-events-auto translate-x-0 opacity-100"
          : "pointer-events-none translate-x-4 opacity-0"
      )}
    >
      {/* 进度环 */}
      <div className="relative mb-1 flex size-10 items-center justify-center">
        <svg viewBox="0 0 36 36" className="size-10 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            strokeWidth="2"
            className="stroke-border"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="stroke-primary transition-[stroke-dashoffset] duration-150"
          />
        </svg>
        <span className="absolute font-mono text-[9px] tabular-nums text-muted-foreground">
          {Math.round(progress * 100)}
        </span>
      </div>

      <button
        type="button"
        aria-label="分享这篇文章"
        onClick={share}
        className="card-surface flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
      >
        <Share2 className="size-4" />
      </button>

      <button
        type="button"
        aria-label="复制链接"
        onClick={() => copy(window.location.href)}
        className="card-surface flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
      >
        {copied ? (
          <Check className="size-4 text-emerald-500" />
        ) : (
          <Link2 className="size-4" />
        )}
      </button>

      <button
        type="button"
        aria-label="回到顶部"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="card-surface flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  );
}
