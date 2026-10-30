/**
 * 站点运行期计算：全站只此一处口径，避免首页 / 页脚 / 终端各算各的。
 *
 * 口径是「已经完整运行了几天」（elapsed days），不是「第几天」：
 * 2026-07-02 起算，到 2026-10-30 恰好在线上满 120 天。
 * 起始日期非法时返回 null，调用方自行降级。
 */

const MS_PER_DAY = 86_400_000;

/** 把 YYYY-MM-DD 解析为该日北京时间 00:00 的时间戳 */
export function startOfDayAt(dateStr: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const ts = Date.UTC(Number(y), Number(m) - 1, Number(d)) - 8 * 3_600_000;
  return Number.isFinite(ts) ? ts : null;
}

/**
 * 站点已运行天数（满天数）。
 * @param startedAt 起始日期（YYYY-MM-DD）
 * @param now 当前时间戳，默认 Date.now()
 */
export function daysSince(startedAt: string, now = Date.now()): number | null {
  const start = startOfDayAt(startedAt);
  if (start === null) return null;
  return Math.max(0, Math.floor((now - start) / MS_PER_DAY));
}

/** 格式化运行天数，非法日期返回占位符 */
export function formatDays(startedAt: string, now = Date.now()): string {
  const days = daysSince(startedAt, now);
  return days === null ? "—" : String(days);
}
