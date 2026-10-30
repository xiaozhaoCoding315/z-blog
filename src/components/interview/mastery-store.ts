"use client";

import { useSyncExternalStore } from "react";

/**
 * 面试题掌握度：本地缓存 + 云端同步。
 *
 * 设计要点：
 * 1. **未登录也能用** —— 状态存 localStorage，行为跟以前完全一样。
 * 2. **登录后以云端为准** —— 首次拉取时合并：本地有、云端没有的会补传上去，
 *    这样「先离线刷了几天，再登录」不会丢进度。
 * 3. **写入即时反馈** —— 先改本地、立刻重渲染，再异步打 API；
 *    网络失败只是没同步上，不影响当前操作。
 *
 * level 三档（不是布尔）：
 *   0 = 未掌握（等于删除记录）
 *   1 = 模糊：能想起大概，被追问会卡
 *   2 = 掌握：能完整讲清楚
 *   3 = 熟练：能应对深度追问
 */

export type MasteryLevel = 0 | 1 | 2 | 3;

export interface MasteryState {
  /** slug -> level（只存 level > 0 的） */
  levels: Record<string, MasteryLevel>;
  /** 是否已登录（云端可写） */
  signedIn: boolean;
  /** 当前登录用户名，未登录为 null */
  login: string | null;
  /** 首帧是否仍在拉云端数据 */
  loading: boolean;
}

const STORE_KEY = "interview:mastery:v2";
const EVENT = "blog:mastery-changed";

/** useSyncExternalStore 要求快照引用稳定 */
let snapshot: MasteryState = {
  levels: {},
  signedIn: false,
  login: null,
  loading: true,
};

let hydrated = false;

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

function setSnapshot(next: Partial<MasteryState>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

/* ---------------- localStorage 读写 ---------------- */

function readLocal(): Record<string, MasteryLevel> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, MasteryLevel> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const n = Number(v);
      if (n >= 1 && n <= 3) out[k] = n as MasteryLevel;
    }
    return out;
  } catch {
    return {};
  }
}

function writeLocal(levels: Record<string, MasteryLevel>) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(levels));
  } catch {
    /* 隐私模式下不可用，忽略 */
  }
}

/* ---------------- 初始化 ---------------- */

/**
 * 首次挂载时调用一次：先读本地，再尝试拉云端并合并。
 * 幂等——重复调用不会重复请求。
 */
export async function hydrateMastery(): Promise<void> {
  if (hydrated) return;
  hydrated = true;

  const local = readLocal();
  snapshot = { ...snapshot, levels: local, loading: true };
  emit();

  try {
    const res = await fetch("/api/interview/mastery", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      items: { slug: string; level: number }[];
      signedIn: boolean;
      user?: { login: string; avatarUrl: string | null };
    };

    if (!data.signedIn) {
      setSnapshot({ loading: false, signedIn: false, login: null });
      return;
    }

    const cloud: Record<string, MasteryLevel> = {};
    for (const item of data.items) {
      const n = Number(item.level);
      if (n >= 1 && n <= 3) cloud[item.slug] = n as MasteryLevel;
    }

    // 合并策略：同 key 以云端为准（云端是「最后写入」的权威记录），
    // 本地独有的（离线期间刷的）补传上去。
    const merged: Record<string, MasteryLevel> = { ...local, ...cloud };
    const toUpload = Object.entries(local).filter(([slug]) => !(slug in cloud));

    writeLocal(merged);
    setSnapshot({
      levels: merged,
      signedIn: true,
      login: data.user?.login ?? null,
      loading: false,
    });

    // 补传：并发打，失败静默（下次写入时还会带上）
    await Promise.all(
      toUpload.map(([slug, level]) =>
        fetch("/api/interview/mastery", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, level }),
        }).catch(() => undefined)
      )
    );
  } catch {
    // 云端不可达：保持本地模式，用户无感
    setSnapshot({ loading: false, signedIn: false, login: null });
  }
}

/* ---------------- 订阅 ---------------- */

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

const getSnapshot = () => snapshot;
const getServerSnapshot = (): MasteryState => ({
  levels: {},
  signedIn: false,
  login: null,
  loading: true,
});

export function useMastery(): MasteryState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** 兼容旧调用点：返回「level > 0 的 slug 集合」 */
export function useMastered(): Set<string> {
  const { levels } = useMastery();
  return new Set(Object.keys(levels));
}

/* ---------------- 写入 ---------------- */

/**
 * 设置某题的掌握度。level=0 表示清除。
 * 先更新本地快照（界面立刻响应），再异步同步云端。
 */
export function setMastery(slug: string, level: MasteryLevel): void {
  const levels = { ...snapshot.levels };
  if (level === 0) delete levels[slug];
  else levels[slug] = level;

  writeLocal(levels);
  setSnapshot({ levels });

  if (!snapshot.signedIn) return;

  void fetch("/api/interview/mastery", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, level }),
  }).catch(() => {
    /* 离线时静默失败：本地已经记住了，下次登录会补传 */
  });
}

/** 兼容旧调用点：布尔切换（true → 2 掌握，false → 0 清除） */
export function toggleMastered(slug: string, mastered: boolean): void {
  setMastery(slug, mastered ? 2 : 0);
}

/* ---------------- 统计 ---------------- */

export interface MasteryStats {
  /** 已掌握（level 2 + 3）的题数 */
  mastered: number;
  /** 全部有标记的题数 */
  touched: number;
  /** 按档位统计 */
  byLevel: Record<MasteryLevel, number>;
}

export function masteryStats(
  levels: Record<string, MasteryLevel>
): MasteryStats {
  const byLevel: Record<MasteryLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const level of Object.values(levels)) byLevel[level]++;
  return {
    mastered: byLevel[2] + byLevel[3],
    touched: Object.keys(levels).length,
    byLevel,
  };
}

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  0: "未学",
  1: "模糊",
  2: "掌握",
  3: "熟练",
};

export const LEVEL_STYLE: Record<MasteryLevel, string> = {
  0: "border-border/70 text-muted-foreground",
  1: "border-amber-500/50 bg-amber-500/10 text-amber-500",
  2: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
  3: "border-sky-500/50 bg-sky-500/10 text-sky-500",
};
