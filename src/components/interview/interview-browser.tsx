"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Filter,
  Layers,
  Loader2,
  LogIn,
  Cloud,
  HardDriveDownload,
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
  const { levels, signedIn, login, loading } = useMastery();
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [onlyUnlearned, setOnlyUnlearned] = useState(false);

  // 首次挂载：读本地 + 尝试拉云端
  useEffect(() => {
    void hydrateMastery();
  }, []);

  const stats = useMemo(() => masteryStats(levels), [levels]);

  const categories = useMemo(() => {
    const map = new Map<
      string,
      { count: number; masteredCount: number }
    >();
    for (const item of items) {
      const stat = map.get(item.category) ?? { count: 0, masteredCount: 0 };
      stat.count++;
      const level = levels[item.slug] ?? 0;
      if (level >= 2) stat.masteredCount++;
      map.set(item.category, stat);
    }
    return [...map.entries()];
  }, [items, levels]);

  const filtered = items.filter((item) => {
    if (category && item.category !== category) return false;
    if (difficulty && item.difficulty !== difficulty) return false;
    if (onlyUnlearned && (levels[item.slug] ?? 0) >= 2) return false;
    return true;
  });

  const totalProgress = items.length
    ? Math.round((stats.mastered / items.length) * 100)
    : 0;

  return (
    <div>
      {/* ===== 进度条 + 同步状态 ===== */}
      <div className="glass mb-6 rounded-xl p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-extrabold tabular-nums">
              {totalProgress}%
            </span>
            <span className="text-xs text-muted-foreground">
              已掌握 {stats.mastered} / {items.length} 题
            </span>
          </div>

          {/* 同步来源标识：明确告诉用户进度存在哪 */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
              signedIn
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                : "border-border/70 text-muted-foreground"
            )}
            title={
              signedIn
                ? `已登录 ${login}，进度同步到云端，换设备不丢`
                : "未登录：进度只存在本浏览器，清除数据会丢失"
            }
          >
            {loading ? (
              <>
                <Loader2 className="size-3 animate-spin" /> 同步中
              </>
            ) : signedIn ? (
              <>
                <Cloud className="size-3" /> 已同步 · {login}
              </>
            ) : (
              <>
                <HardDriveDownload className="size-3" /> 仅本地
              </>
            )}
          </span>
        </div>

        {/* 分段进度条：三档各占一段 */}
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          {([1, 2, 3] as MasteryLevel[]).map((lv) => {
            const w = items.length
              ? (stats.byLevel[lv] / items.length) * 100
              : 0;
            if (w === 0) return null;
            return (
              <div
                key={lv}
                className={cn(
                  "h-full transition-all duration-500",
                  lv === 1 && "bg-amber-500/70",
                  lv === 2 && "bg-emerald-500/80",
                  lv === 3 && "bg-sky-500/80"
                )}
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
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    lv === 1 && "bg-amber-500/70",
                    lv === 2 && "bg-emerald-500/80",
                    lv === 3 && "bg-sky-500/80"
                  )}
                />
                {LEVEL_LABEL[lv]} {stats.byLevel[lv]}
              </span>
            ))}
          </div>

          {!signedIn && !loading && (
            <a
              href="/api/auth/github?next=/interview"
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <LogIn className="size-3" />
              用 GitHub 登录，同步进度
            </a>
          )}
        </div>
      </div>

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
          onClick={() => setOnlyUnlearned((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
            onlyUnlearned
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
          {filtered.map((item) => {
            const level = levels[item.slug] ?? 0;
            return (
              <li key={item.slug}>
                <Link
                  href={`/interview/${item.slug}`}
                  className="group glass card-hover flex items-center gap-4 rounded-xl px-5 py-4"
                >
                  {level >= 2 ? (
                    <CheckCircle2
                      className={cn(
                        "size-5 shrink-0",
                        level === 3 ? "text-sky-500" : "text-emerald-500"
                      )}
                    />
                  ) : level === 1 ? (
                    <CircleDashed className="size-5 shrink-0 text-amber-500" />
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
                  {level > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                        LEVEL_STYLE[level]
                      )}
                    >
                      {LEVEL_LABEL[level]}
                    </span>
                  )}
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
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        共 {items.length} 题 · 已记录 {stats.touched} 题
        {signedIn ? " · 进度保存在云端" : " · 进度保存在本浏览器（登录后可跨设备同步）"}
      </p>
    </div>
  );
}
