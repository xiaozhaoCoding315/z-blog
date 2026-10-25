"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleDashed, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InterviewItem {
  slug: string;
  question: string;
  category: string;
  difficulty: "易" | "中" | "难";
  tags: string[];
}

const STORE_KEY = "interview:mastered";

/** 掌握度存储：localStorage 持久化的 slug 集合 */
function readMastered(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}
function writeMastered(set: Set<string>) {
  localStorage.setItem(STORE_KEY, JSON.stringify([...set]));
}

export function useMastered(): Set<string> {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("blog:mastered-changed", cb);
      return () => window.removeEventListener("blog:mastered-changed", cb);
    },
    readMastered,
    () => new Set<string>()
  );
}

export function toggleMastered(slug: string, mastered: boolean) {
  const set = readMastered();
  if (mastered) set.add(slug);
  else set.delete(slug);
  writeMastered(set);
  window.dispatchEvent(new Event("blog:mastered-changed"));
}

const diffStyle: Record<string, string> = {
  易: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  中: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  难: "border-red-500/40 bg-red-500/10 text-red-500",
};

export function InterviewBrowser({ items }: { items: InterviewItem[] }) {
  const mastered = useMastered();
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [onlyUnmastered, setOnlyUnmastered] = useState(false);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return [...map.entries()];
  }, [items]);

  const filtered = items.filter((item) => {
    if (category && item.category !== category) return false;
    if (difficulty && item.difficulty !== difficulty) return false;
    if (onlyUnmastered && mastered.has(item.slug)) return false;
    return true;
  });

  const progress = items.length ? Math.round((mastered.size / items.length) * 100) : 0;

  return (
    <div>
      {/* 进度 + 筛选 */}
      <div className="mb-6 space-y-3">
        <div className="glass flex items-center gap-4 rounded-xl px-5 py-4">
          <div className="relative size-14 shrink-0">
            <svg viewBox="0 0 36 36" className="size-14 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-muted" />
              <circle
                cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 97.4} 97.4`}
                className="stroke-primary transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {progress}%
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              已掌握 {mastered.size} / {items.length} 题
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              进度保存在浏览器本地，刷过的题会一直记得
            </p>
          </div>
          <button
            onClick={() => setOnlyUnmastered((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
              onlyUnmastered
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            <Filter className="size-3" /> 只看未掌握
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              !category ? "border-primary/60 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            全部
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? null : cat)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                category === cat ? "border-primary/60 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              {cat} <span className="opacity-60">{count}</span>
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />
          {(["易", "中", "难"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? null : d)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                difficulty === d ? diffStyle[d] : "border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* 题目列表 */}
      {filtered.length === 0 ? (
        <div className="glass rounded-xl py-16 text-center text-sm text-muted-foreground">
          没有符合条件的题目 🎉（也许这个分类都刷完了）
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/interview/${item.slug}`}
                className="group glass card-hover flex items-center gap-4 rounded-xl px-5 py-4"
              >
                {mastered.has(item.slug) ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                ) : (
                  <CircleDashed className="size-5 shrink-0 text-muted-foreground/50" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                    {item.question}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded border border-border/70 px-1.5 py-px">{item.category}</span>
                    {item.tags.slice(0, 3).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px]",
                    diffStyle[item.difficulty]
                  )}
                >
                  {item.difficulty}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
