"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Entry {
  id: number;
  name: string;
  message: string;
  createdAt: string;
}

const AVATAR_GRADIENTS = [
  "from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)]",
  "from-[oklch(0.65_0.18_160)] to-[oklch(0.72_0.16_215)]",
  "from-[oklch(0.7_0.18_30)] to-[oklch(0.75_0.15_75)]",
  "from-[oklch(0.6_0.22_285)] to-[oklch(0.7_0.18_30)]",
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso + "Z").toLocaleDateString("zh-CN");
}

export function GuestbookBoard() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  useEffect(() => {
    fetch("/api/guestbook")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setEntries(Array.isArray(d.items) ? d.items : []))
      .catch(() => setEntries([]));
  }, []);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.item) {
        setEntries((prev) => [data.item, ...(prev ?? [])]);
        setMessage("");
        setFeedback({ kind: "ok", text: "留言成功，感谢留言！✨" });
      } else {
        setFeedback({ kind: "err", text: data?.error ?? "提交失败" });
      }
    } catch {
      setFeedback({ kind: "err", text: "网络异常，稍后再试" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* 留言表单 */}
      <div className="glass h-fit rounded-xl p-6 lg:sticky lg:top-24">
        <h2 className="mb-4 font-semibold">留下点什么</h2>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称（可留空）"
            maxLength={20}
            className="bg-background/60"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="写点什么…（Enter 发送）"
            rows={4}
            maxLength={300}
            className="w-full resize-none rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {message.length}/300
            </span>
            <Button
              onClick={submit}
              disabled={submitting || message.trim().length < 2}
              className="rounded-full px-5"
            >
              <Send className="size-3.5" />
              {submitting ? "发送中…" : "留言"}
            </Button>
          </div>
          {feedback && (
            <p
              className={
                feedback.kind === "ok"
                  ? "text-xs text-emerald-500"
                  : "text-xs text-red-400"
              }
            >
              {feedback.text}
            </p>
          )}
        </div>
        <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          留言直接存到博主的数据库里，不会同步到任何第三方。文明发言，都会被看见。
        </p>
      </div>

      {/* 留言流 */}
      <div>
        {entries === null ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass h-20 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="glass flex flex-col items-center gap-2 rounded-xl py-16 text-center text-muted-foreground">
            <Send className="size-8 opacity-40" />
            <p className="text-sm">还没有留言</p>
            <p className="text-xs opacity-70">来做第一个留下脚印的人</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.article
                  key={entry.id}
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="glass card-hover flex gap-4 rounded-xl p-5"
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white ${
                      AVATAR_GRADIENTS[entry.name.length % AVATAR_GRADIENTS.length]
                    }`}
                  >
                    {entry.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold">
                        {entry.name}
                      </span>
                      <time className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(entry.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                      {entry.message}
                    </p>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
