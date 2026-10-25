"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Filter,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface InterviewItem {
  slug: string;
  question: string;
  category: string;
  difficulty: "易" | "中" | "难";
  tags: string[];
}

const STORE_KEY = "interview:mastered";

/**
 * 掌握度存储：localStorage 持久化的 slug 集合。
 * useSyncExternalStore 要求 getSnapshot 返回稳定引用，
 * 因此用模块级缓存（写入时整体替换），不能每次 new Set。
 */
let cachedMastered: Set<string> | null = null;

function readMastered(): Set<string> {
  if (cachedMastered) return cachedMastered;
  try {
    cachedMastered = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]"));
  } catch {
    cachedMastered = new Set();
  }
  return cachedMastered;
}

function writeMastered(set: Set<string>) {
  cachedMastered = set;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...set]));
  } catch {
    /* 忽略 */
  }
}

const EMPTY_SET = new Set<string>();

export function useMastered(): Set<string> {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("blog:mastered-changed", cb);
      return () => window.removeEventListener("blog:mastered-changed", cb);
    },
    readMastered,
    () => EMPTY_SET
  );
}

export function toggleMastered(slug: string, mastered: boolean) {
  const set = new Set(readMastered());
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

/** 分类视觉标识：固定渐变色 + 单字徽章 */
const categoryPalette = [
  "from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_250)]",
  "from-[oklch(0.62_0.2_200)] to-[oklch(0.75_0.15_160)]",
  "from-[oklch(0.7_0.18_30)] to-[oklch(0.8_0.15_75)]",
  "from-[oklch(0.6_0.22_320)] to-[oklch(0.72_0.18_285)]",
  "from-[oklch(0.65_0.18_150)] to-[oklch(0.72_0.16_215)]",
  "from-[oklch(0.68_0.2_260)] to-[oklch(0.75_0.12_200)]",
  "from-[oklch(0.7_0.16_100)] to-[oklch(0.78_0.14_60)]",
  "from-[oklch(0.6_0.2_240)] to-[oklch(0.7_0.18_300)]",
  "from-[oklch(0.66_0.16_170)] to-[oklch(0.76_0.13_130)]",
  "from-[oklch(0.62_0.22_290)] to-[oklch(0.72_0.15_220)]",
  "from-[oklch(0.7_0.15_60)] to-[oklch(0.8_0.13_30)]",
  "from-[oklch(0.58_0.2_280)] to-[oklch(0.7_0.17_190)]",
  "from-[oklch(0.68_0.17_330)] to-[oklch(0.78_0.14_270)]",
];
function categoryColor(index: number) {
  return categoryPalette[index % categoryPalette.length];
}

export function InterviewBrowser({ items }: { items: InterviewItem[] }) {
  const mastered = useMastered();
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [onlyUnmastered, setOnlyUnmastered] = useState(false);

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; masteredCount: number }>();
    for (const item of items) {
      const stat = map.get(item.category) ?? { count: 0, masteredCount: 0 };
      stat.count++;
      if (mastered.has(item.slug)) stat.masteredCount++;
      map.set(item.category, stat);
    }
    return [...map.entries()];
  }, [items, mastered]);

  const filtered = items.filter((item) => {
    if (category && item.category !== category) return false;
    if (difficulty && item.difficulty !== difficulty) return false;
    if (onlyUnmastered && mastered.has(item.slug)) return false;
    return true;
  });

  const totalProgress = items.length
    ? Math.round((mastered.size / items.length) * 100)
    : 0;

  return (
    <div>
      {/* ===== 分类卡片网格 ===== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map(([cat, stat], i) => {
          const pct = Math.round((stat.masteredCount / stat.count) * 100);
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(active ? null : cat)}
              className={cn(
                "card-hover glass group relative overflow-hidden rounded-xl p-4 text-left",
                active && "ring-2 ring-primary/60"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-white",
                    categoryColor(i)
                  )}
                >
                  {cat.replace(/[^A-Za-z\u4e00-\u9fff]/g, "").charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{cat}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {stat.count} 题 · 已掌握 {stat.masteredCount}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                    categoryColor(i)
                  )}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== 筛选条 ===== */}
      <div className="mt-8 flex flex-wrap items-center gap-1.5">
        <Layers className="mr-1 size-4 text-muted-foreground" />
        <button
          onClick={() => setCategory(null)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            !category
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          )}
        >
          全部 {items.length}
        </button>
        {categories.map(([cat, stat]) => (
          <button
            key={cat}
            onClick={() => setCategory(category === cat ? null : cat)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              category === cat
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            {cat} <span className="opacity-60">{stat.count}</span>
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />
        {(["易", "中", "难"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(difficulty === d ? null : d)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              difficulty === d
                ? diffStyle[d]
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setOnlyUnmastered((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
            onlyUnmastered
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          )}
        >
          <Filter className="size-3" /> 只看未掌握
        </button>
      </div>

      {/* ===== 题目列表 ===== */}
      {filtered.length === 0 ? (
        <div className="glass mt-4 rounded-xl py-16 text-center text-sm text-muted-foreground">
          没有符合条件的题目 🎉（也许这个分类都刷完了）
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
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
                    <span className="rounded border border-border/70 px-1.5 py-px">
                      {item.category}
                    </span>
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

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        共 {items.length} 题 · 已掌握 {mastered.size}（{totalProgress}%）· 进度保存在浏览器本地
      </p>
    </div>
  );
}
