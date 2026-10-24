"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Square, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSource {
  id: number;
  slug: string;
  title: string;
  heading: string | null;
  href: string;
}

const SUGGESTIONS = [
  "这个博客是怎么搭起来的？",
  "怎么把应用部署到服务器？",
  "写文章的流程是什么样的？",
  "推荐一篇入门文章",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<"loading" | "on" | "off">("loading");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { messages, sendMessage, status, setMessages, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  // AI 可用性（未配置 key 时显示引导而不是报错）
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAiStatus(d?.enabled ? "on" : "off"))
      .catch(() => setAiStatus("off"));
  }, []);

  // 首页按钮 / 其他入口通过自定义事件唤起
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("blog:open-chat", handler);
    return () => window.removeEventListener("blog:open-chat", handler);
  }, []);

  // 流式输出时自动滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || aiStatus !== "on") return;
    setInput("");
    sendMessage({ text: trimmed });
  }

  return (
    <>
      {/* 悬浮球 */}
      <motion.button
        type="button"
        aria-label="AI 助手"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] text-white",
          "shadow-xl shadow-primary/30 transition-shadow hover:shadow-2xl hover:shadow-primary/40"
        )}
        style={{ width: 52, height: 52 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="size-5" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles className="size-5" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 size-3 animate-pulse rounded-full bg-emerald-400 ring-2 ring-background" />
        )}
      </motion.button>

      {/* 聊天面板 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass fixed bottom-24 right-4 z-50 flex h-[560px] max-h-[calc(100dvh-8rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl shadow-2xl sm:right-6"
          >
            {/* 头部 */}
            <div className="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] text-white">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">博客 AI 助手</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {aiStatus === "on"
                    ? "读过站内所有文章 · 回答附引用来源"
                    : aiStatus === "loading"
                      ? "连接中…"
                      : "AI 未配置"}
                </p>
              </div>
              {messages.length > 0 && (
                <button
                  aria-label="清空对话"
                  onClick={() => setMessages([])}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              )}
            </div>

            {/* 消息区 */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
                  {aiStatus === "off" ? (
                    <>
                      <Sparkles className="size-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        AI 功能尚未启用
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground/70">
                        在服务器 .env 中配置 AI_API_KEY（智谱开放平台免费注册），
                        重启容器即可解锁语义搜索与智能问答。
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        问点什么吧 —— 我读过这里的每一篇文章
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {SUGGESTIONS.map((text) => (
                          <button
                            key={text}
                            onClick={() => submit(text)}
                            className="rounded-full border border-border/70 bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                          >
                            {text}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                      {getText(message.parts)}
                    </div>
                  </div>
                ) : (
                  <AssistantBubble key={message.id} message={message} onNavigate={router.push} />
                )
              )}

              {busy && (
                <div className="flex items-center gap-1.5 px-1 text-muted-foreground">
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                </div>
              )}
              {error && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  请求失败：{error.message ?? "请稍后重试"}
                </p>
              )}
            </div>

            {/* 输入区 */}
            <div className="border-t border-border/70 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  rows={1}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit(input);
                    }
                  }}
                  placeholder={
                    aiStatus === "on" ? "输入问题，Enter 发送…" : "AI 未启用"
                  }
                  disabled={aiStatus !== "on"}
                  className="max-h-28 flex-1 resize-none rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 disabled:opacity-50"
                />
                {busy ? (
                  <button
                    aria-label="停止"
                    onClick={() => stop()}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Square className="size-3.5" />
                  </button>
                ) : (
                  <button
                    aria-label="发送"
                    onClick={() => submit(input)}
                    disabled={!input.trim() || aiStatus !== "on"}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] text-white transition-opacity disabled:opacity-40"
                  >
                    <Send className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** 助手气泡：渲染文本 + [n] 引用徽章 + 来源列表 */
function AssistantBubble({
  message,
  onNavigate,
}: {
  message: { id: string; parts: unknown[]; data?: unknown };
  onNavigate: (href: string) => void;
}) {
  const sources = extractSources(message.data);
  const text = getText(message.parts);
  const segments = text.split(/(\[\d+\])/g);

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border/60 bg-card/70 px-3.5 py-2.5 text-sm leading-relaxed">
        {segments.map((segment, i) => {
          const match = /^\[(\d+)\]$/.exec(segment);
          if (!match) return <span key={i}>{segment}</span>;
          const source = sources.find((s) => s.id === Number(match[1]));
          if (!source) return <span key={i}>{segment}</span>;
          return (
            <button
              key={i}
              onClick={() => onNavigate(source.href)}
              className="mx-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full border border-primary/50 bg-primary/10 px-1 align-super text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
              title={`引用：${source.title}`}
            >
              {match[1]}
            </button>
          );
        })}
      </div>
      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => onNavigate(source.href)}
              className="max-w-full truncate rounded-full border border-border/70 bg-secondary/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              [{source.id}] {source.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getText(parts: unknown[]): string {
  return parts
    .filter((part): part is { type: "text"; text: string } => {
      const p = part as { type?: string };
      return p?.type === "text";
    })
    .map((part) => part.text)
    .join("");
}

function extractSources(data: unknown): ChatSource[] {
  if (!Array.isArray(data)) return [];
  const part = data.find(
    (item) => (item as { type?: string })?.type === "data-sources"
  ) as { data?: ChatSource[] } | undefined;
  return part?.data ?? [];
}
