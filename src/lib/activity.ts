/**
 * 迭代活跃度热力图数据：开发日志 + 笔记发布日期。
 *
 * 抽到 lib 里是因为首页和 /changelog 都要用，避免两处各算一遍导致数字对不上。
 */
import { getAllNotes } from "@/content";
import { getChangelog } from "@/config/changelog";

export interface ActivityDay {
  date: string;
  count: number;
}

/** 同一天的多条改动合并计数，作为「提交次数」的近似 */
export function buildActivityDays(): ActivityDay[] {
  const counts = new Map<string, number>();
  const bump = (date: string, times = 1) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    counts.set(date, (counts.get(date) ?? 0) + times);
  };

  for (const entry of getChangelog()) {
    // 一条日志里的若干改动视为同一天的多次提交
    bump(entry.date, Math.max(1, entry.items?.length ?? 1));
  }
  for (const note of getAllNotes()) bump(note.meta.date);

  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
