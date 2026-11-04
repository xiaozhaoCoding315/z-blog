"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Filter,
  Folder,
  Loader2,
  LogIn,
  Cloud,
  HardDriveDownload,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LEVEL_LABEL,
  LEVEL_STYLE,
  hydrateMastery,
  masteryStats,
  useMastery,
  type MasteryLevel,
} from "@/components/interview/mastery-store";

export interface InterviewItem {
  slug: string;
  question: string;
  category: string;
  difficulty: "易" | "中" | "难";
  tags: string[];
}

/** 数据里存「易 / 中 / 难」，界面上说人话 */
const DIFFICULTY_LABEL: Record<InterviewItem["difficulty"], string> = {
  易: "简单",
  中: "中等",
  难: "困难",
};

/** 稳定的空集合：每次渲染都 new 一个会让下游的 useMemo 白白重算 */
const EMPTY_SLUGS: ReadonlySet<string> = new Set();

const diffStyle: Record<string, string> = {
  易: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  中: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  难: "border-red-500/40 bg-red-500/10 text-red-500",
};

export function InterviewBrowser({ items }: { items: InterviewItem[] }) {
  const { levels, signedIn, login, loading } = useMastery();
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [onlyUnlearned, setOnlyUnlearned] = useState(false);
  const [onlyReview, setOnlyReview] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void hydrateMastery();
  }, []);

  // 只在登录状态变化时拉一次待复习列表。
  //
  // 两个曾经的问题：把 reviewLoading 放进依赖又在 effect 里 setReviewLoading(true)，
  // 等于自己触发自己，登录后无限发请求；退出登录时在 effect 体内同步 setState，
  // 又会触发级联渲染。现在加载态用「已拿到结果的那次请求是哪个登录态」来推断，
  // 退出登录时什么都不用清——下面派生出来的值天然为空。
  const [reviewFor, setReviewFor] = useState<boolean | null>(null);
  const [loadedSlugs, setLoadedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/interview/review", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.signedIn) return;
        setLoadedSlugs(
          new Set(data.items.map((item: { slug: string }) => item.slug))
        );
        setReviewFor(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  // 未登录或还没拿到结果时，待复习集合为空
  const reviewSlugs = signedIn && reviewFor ? loadedSlugs : EMPTY_SLUGS;

  const stats = useMemo(() => masteryStats(levels), [levels]);

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; masteredCount: number }>();
    for (const item of items) {
      const stat = map.get(item.category) ?? { count: 0, masteredCount: 0 };
      stat.count++;
      if ((levels[item.slug] ?? 0) >= 2) stat.masteredCount++;
      map.set(item.category, stat);
    }
    return [...map.entries()];
  }, [items, levels]);

  const filtered = items.filter((item) => {
    if (category && item.category !== category) return false;
    if (difficulty && item.difficulty !== difficulty) return false;
    if (onlyUnlearned && (levels[item.slug] ?? 0) >= 2) return false;
    if (onlyReview && !reviewSlugs.has(item.slug)) return false;
    if (query && !item.question.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const totalProgress = items.length ? Math.round((stats.mastered / items.length) * 100) : 0;

  return (
    <div>
      <div className="mb-6 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-extrabold tabular-nums">{totalProgress}%</span>
            <span className="text-xs text-muted-foreground">已掌握 {stats.mastered} / {items.length} 题</span>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]", signedIn ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-border/70 text-muted-foreground")}>
            {loading ? <Loader2 className="size-3 animate-spin" /> : signedIn ? <Cloud className="size-3" /> : <HardDriveDownload className="size-3" />}
            {loading ? "同步中…" : signedIn ? `已同步 · ${login}` : "仅本地"}
          </span>
        </div>

        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          {([1, 2, 3] as MasteryLevel[]).map((lv) => {
            const w = items.length ? (stats.byLevel[lv] / items.length) * 100 : 0;
            if (w === 0) return null;
            return (
              <div
                key={lv}
                className={cn("h-full transition-all duration-500", lv === 1 && "bg-amber-500/70", lv === 2 && "bg-emerald-500/80", lv === 3 && "bg-sky-500/80")}
                style={{ width: `${w}%` }}
                title={`${LEVEL_LABEL[lv]}：${stats.byLevel[lv]} 题`}
              />
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap gap-3">
            {([1, 2, 3] as MasteryLevel[]).map((lv) => (
              <span key={lv} className="inline-flex items-center gap-1">
                <span className={cn("size-1.5 rounded-full", lv === 1 && "bg-amber-500/70", lv === 2 && "bg-emerald-500/80", lv === 3 && "bg-sky-500/80")} />
                {LEVEL_LABEL[lv]} {stats.byLevel[lv]}
              </span>
            ))}
          </div>
          {!signedIn && !loading && (
            <a href="/api/auth/github?next=/interview" className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20">
              <LogIn className="size-3" /> GitHub 登录并同步
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="border border-border/60 bg-card/40 rounded-xl p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">目录</p>
          <ul className="space-y-0.5">
            <li>
              <button onClick={() => setCategory(null)} className={cn("w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors", !category ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent")}>
                全部题目 {items.length}
              </button>
            </li>
            {categories.map(([cat, stat]) => (
              <li key={cat}>
                <button onClick={() => setCategory(category === cat ? null : cat)} className={cn("w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors", category === cat ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Folder className="size-3 opacity-60" />
                    {cat}
                    <span className="ml-auto opacity-60">{stat.count}</span>
                  </span>
                </button>
              </li>
            ))}
            <li className="pt-2">
              <button onClick={() => setOnlyReview((v) => !v)} className={cn("w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors", onlyReview ? "border-red-500/40 bg-red-500/10 text-red-500" : "border-border/60 text-muted-foreground hover:bg-accent")}>
                <span className="inline-flex items-center gap-1.5">
                  <RotateCw className="size-3" /> 错误复盘 {reviewSlugs.size}
                </span>
              </button>
            </li>
          </ul>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索题目、标签"
                className="w-full rounded-full border border-border/60 bg-background/60 py-1.5 pl-8 pr-7 text-xs outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60"
              />
              {query && (
                <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="清除搜索">
                  <X className="size-3" />
                </button>
              )}
            </div>
            <button onClick={() => setOnlyUnlearned((v) => !v)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors", onlyUnlearned ? "border-primary/60 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:text-foreground")}>
              <Filter className="size-3" /> 只看未掌握
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setDifficulty(null)} className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", !difficulty ? "border-primary/60 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:text-foreground")}>全部难度</button>
            {(["易", "中", "难"] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(difficulty === d ? null : d)} className={cn("rounded-full border px-2.5 py-0.5 text-xs transition-colors", difficulty === d ? diffStyle[d] : "border-border/70 text-muted-foreground hover:text-foreground")}>
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/30 py-16 text-center text-sm text-muted-foreground">
              没有符合条件的题目
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((item) => {
                const level = levels[item.slug] ?? 0;
                const inReview = reviewSlugs.has(item.slug);
                return (
                  <li key={item.slug}>
                    <Link href={`/interview/${item.slug}`} className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card/40 px-5 py-4 transition-colors hover:border-primary/40">
                      {level >= 2 ? (
                        <CheckCircle2 className={cn("size-5 shrink-0", level === 3 ? "text-sky-500" : "text-emerald-500")} />
                      ) : level === 1 ? (
                        <CircleDashed className="size-5 shrink-0 text-amber-500" />
                      ) : (
                        <CircleDashed className="size-5 shrink-0 text-muted-foreground/50" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium transition-colors group-hover:text-foreground">{item.question}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded border border-border/70 px-1.5 py-px">{item.category}</span>
                          {item.tags.slice(0, 3).map((t) => <span key={t}>#{t}</span>)}
                          {inReview && <span className="inline-flex items-center gap-1 text-red-500"><RotateCw className="size-3" /> 复盘</span>}
                        </p>
                      </div>
                      {level > 0 && (
                        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px]", LEVEL_STYLE[level])}>{LEVEL_LABEL[level]}</span>
                      )}
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px]", diffStyle[item.difficulty])}>{DIFFICULTY_LABEL[item.difficulty]}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        共 {items.length} 题 · 已标记 {stats.touched} 题 {signedIn ? "· 进度已同步到云端" : "· 进度保存在本地浏览器（登录后可同步）"}
      </p>
    </div>
  );
}
