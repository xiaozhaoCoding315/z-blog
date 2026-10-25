"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, CircleDashed, Eye, EyeOff, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleMastered, useMastered } from "@/components/interview/interview-browser";
import type { ReactNode } from "react";

/** 答案折叠区：先思考再看答案 */
export function AnswerCard({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="mt-8">
      <button
        onClick={() => setRevealed((v) => !v)}
        className="group inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
      >
        {revealed ? (
          <>
            <EyeOff className="size-4" /> 收起参考答案
          </>
        ) : (
          <>
            <Eye className="size-4" /> 先想一想，再查看参考答案
          </>
        )}
        <ChevronDown
          className={cn("size-4 transition-transform", revealed && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {revealed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="glass mt-5 rounded-xl p-6 sm:p-8">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {!revealed && (
        <p className="mt-3 text-xs text-muted-foreground">
          建议先口述一遍你的答案，再对照参考——面试是「说出来」的艺术
        </p>
      )}
    </div>
  );
}

/** 掌握度三态 */
export function MasteryBar({ slug }: { slug: string }) {
  const mastered = useMastered();
  const isMastered = mastered.has(slug);

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <span className="text-xs text-muted-foreground">这题掌握得怎么样？</span>
      <button
        onClick={() => toggleMastered(slug, !isMastered)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
          isMastered
            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-500"
            : "border-border/70 text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500"
        )}
      >
        {isMastered ? (
          <>
            <CheckCircle2 className="size-3.5" /> 已掌握（点击撤销）
          </>
        ) : (
          <>
            <CircleDashed className="size-3.5" /> 标记为已掌握
          </>
        )}
      </button>
    </div>
  );
}

/** AI 面试官追问面板 */
export function FollowUpPanel({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/interview",
      body: { slug },
    }),
  });
  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    sendMessage({ text: trimmed });
  }

  return (
    <div className="mt-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-transform hover:scale-[1.03]"
      >
        <Sparkles className="size-4" />
        {open ? "收起 AI 面试官" : "让 AI 面试官追问这题"}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">
        提交你的口头答案，AI 会像真实面试官一样点评并连环深挖
      </p>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="glass mt-5 rounded-xl p-5">
              {messages.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    先说说你的答案——比如「这题我会从…开始答」
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => submit("这题我不太确定，能从基础开始带我过一遍吗？")}
                    >
                      不太会，求讲解
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => submit("我来回答一下这题：这题的核心考点是…（从原理开始讲）")}
                    >
                      我来回答
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        message.role === "user"
                          ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border border-border/60 bg-card/70"
                      )}
                    >
                      {getText(message.parts)}
                    </div>
                  ))}
                  {busy && (
                    <div className="flex items-center gap-1.5 px-1 text-muted-foreground">
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              )}

              {messages.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submit(input);
                      }
                    }}
                    placeholder="输入你的回答，Enter 发送…"
                    className="flex-1 rounded-full border border-border/70 bg-background/60 px-4 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60"
                  />
                  <Button
                    size="icon"
                    className="size-9 shrink-0 rounded-full"
                    aria-label="发送"
                    disabled={!input.trim() || busy}
                    onClick={() => submit(input)}
                  >
                    <Send className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-9 shrink-0 rounded-full text-muted-foreground"
                    aria-label="重新开始"
                    onClick={() => setMessages([])}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
