"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const emptySubscribe = (cb: () => void) => {
  window.addEventListener("blog:likes-changed", cb);
  return () => window.removeEventListener("blog:likes-changed", cb);
};

/**
 * 文章点赞按钮：同一浏览器对同一文章只计一次（localStorage 去重）。
 */
export function LikeButton({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);

  // 「已赞」状态从 localStorage 读取（SSR 恒为 false，避免水合不匹配）
  const liked = useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        return localStorage.getItem(`liked:${slug}`) === "1";
      } catch {
        return false;
      }
    },
    () => false
  );

  useEffect(() => {
    fetch(`/api/likes/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.count === "number") setCount(d.count);
      })
      .catch(() => {});
  }, [slug]);

  async function like() {
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    if (liked) return;
    try {
      localStorage.setItem(`liked:${slug}`, "1");
    } catch {
      /* 忽略 */
    }
    // 通知 useSyncExternalStore 重新读取（已赞状态变 true）
    window.dispatchEvent(new Event("blog:likes-changed"));
    const res = await fetch(`/api/likes/${slug}`, { method: "POST" });
    const d = await res.json().catch(() => null);
    if (d && typeof d.count === "number") setCount(d.count);
    else setCount((c) => (c ?? 0) + 1);
  }

  return (
    <button
      type="button"
      aria-label="点赞"
      onClick={like}
      className={cn(
        "relative inline-flex items-center gap-1.5 text-sm transition-colors",
        liked ? "text-rose-400" : "text-muted-foreground hover:text-rose-400"
      )}
    >
      <Heart className={cn("size-4 transition-transform", liked && "fill-rose-400 scale-110")} />
      {count !== null && <span>{count}</span>}
      <AnimatePresence>
        {burst && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 1, y: 0, x: 0, scale: 0.6 }}
                animate={{
                  opacity: 0,
                  y: -34 - i * 8,
                  x: (i - 1) * 14,
                  scale: 1,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="pointer-events-none absolute left-1 top-0 text-rose-400"
              >
                <Heart className="size-3 fill-rose-400" />
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>
    </button>
  );
}
