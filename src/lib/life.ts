/**
 * 生活流的纯函数：分组、日期格式、邮戳角度。
 * 刻意不依赖 React 和数据库，这样可以直接用 node --test 跑。
 */

export type MomentKind =
  | "text"
  | "photo"
  | "song"
  | "shelf"
  | "quote"
  | "link";

export interface Moment {
  id: string;
  kind: MomentKind;
  /** ISO 8601，必须带时区 */
  publishedAt: string;
  body: string;
  images?: string[];
  mood?: string;
  weather?: string;
  place?: string;
  /** 卡片形态才有 */
  card?: {
    title: string;
    meta: string;
    note?: string;
    href?: string;
  };
}

export interface MonthGroup {
  key: string;
  label: string;
  moments: Moment[];
}

const MONTHS = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

/** 全站时间一律按北京时间显示，不跟随访客时区 */
const TZ = "Asia/Shanghai";

const dateFmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function parts(iso: string) {
  const p = Object.fromEntries(
    dateFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value])
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
  };
}

/** 邮戳上的日期：11.03 */
export function formatPostmark(iso: string): string {
  const { month, day } = parts(iso);
  return `${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

/** 月份分隔上的字：十一月；不是今年就补上年份 */
export function monthLabel(
  year: number,
  month: number,
  currentYear: number
): string {
  const name = MONTHS[month - 1];
  return year === currentYear ? name : `${year} 年 ${name}`;
}

/**
 * 按年月倒序分组，同月内保持时间倒序。
 * 不修改传入的数组——调用方可能还要拿原数组做别的事。
 */
export function groupByMonth(
  moments: Moment[],
  currentYear: number
): MonthGroup[] {
  const sorted = [...moments].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  );

  const groups: MonthGroup[] = [];
  for (const m of sorted) {
    const { year, month } = parts(m.publishedAt);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: monthLabel(year, month, currentYear), moments: [] };
      groups.push(group);
    }
    group.moments.push(m);
  }
  return groups;
}

/**
 * 邮戳的倾斜角：同一个日期永远得到同一个角度。
 * 范围 -12°~-8°，一屏之内不会显得乱七八糟。
 */
export function rotateForSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 1000;
  }
  return -8 - (h % 5);
}
