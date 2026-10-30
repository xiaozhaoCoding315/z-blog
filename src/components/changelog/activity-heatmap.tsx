"use client";

import { useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export interface ActivityDay {
  date: string;
  count: number;
}

/**
 * 迭代活跃度热力图（GitHub 贡献图风格）。
 *
 * 数据从开发日志 + 文章发布日期本地计算，不依赖任何外部 API：
 * 国内服务器访问 GitHub Events API 经常超时，那段热力图长期是空白。
 *
 * 关于「今天是哪天」：预渲染阶段不能读 new Date()（会被固化成构建时刻），
 * 所以服务端快照用数据里最新的一天（确定性），水合后再切换成真实今天。
 */

const HOUR = 3_600_000;

/** 客户端快照：模块级缓存，保证 getSnapshot 返回稳定值 */
let clientToday: number | null = null;
function getClientToday() {
  if (clientToday === null) clientToday = Date.now();
  return clientToday;
}

const subscribeToClock = () => () => {};

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** 从 today 往前推 n 周，补齐成「列 = 周，行 = 周一到周日」的矩阵 */
export function buildActivityWeeks(
  days: ActivityDay[],
  weeksCount: number,
  todayTs: number
) {
  const counts = new Map(days.map((d) => [d.date, d.count]));

  // 对齐到本周周一
  const cursor = new Date(todayTs);
  cursor.setUTCHours(0, 0, 0, 0);
  const weekday = (cursor.getUTCDay() + 6) % 7; // 周一 = 0
  cursor.setTime(
    cursor.getTime() - weekday * 24 * HOUR - 7 * (weeksCount - 1) * 24 * HOUR
  );

  const weeks: ActivityDay[][] = [];
  for (let w = 0; w < weeksCount; w++) {
    const week: ActivityDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor.getTime() + (w * 7 + d) * 24 * HOUR);
      const iso = toISO(date);
      week.push({ date: iso, count: counts.get(iso) ?? 0 });
    }
    weeks.push(week);
  }
  return weeks;
}

function level(count: number) {
  if (count === 0) return "bg-muted/50";
  if (count === 1) return "bg-primary/30";
  if (count <= 3) return "bg-primary/50";
  if (count <= 5) return "bg-primary/75";
  return "bg-primary";
}

const WEEKS = 20;

export function ActivityHeatmap({
  days,
  className,
}: {
  days: ActivityDay[];
  className?: string;
}) {
  // 服务端：用数据里最新的一天兜底（预渲染结果确定，不会漂移）
  const fallbackTs = useMemo(() => {
    const latest = days.reduce(
      (max, d) => (d.date > max ? d.date : max),
      "1970-01-01"
    );
    return new Date(`${latest}T00:00:00Z`).getTime();
  }, [days]);

  const todayTs = useSyncExternalStore(
    subscribeToClock,
    getClientToday,
    () => fallbackTs
  );

  const weeks = useMemo(
    () => buildActivityWeeks(days, WEEKS, todayTs),
    [days, todayTs]
  );
  const total = days.reduce((sum, d) => sum + d.count, 0);

  // 月份刻度：某一列的首日跨月时标记
  const monthMarks = weeks.map((week, i) => {
    const month = Number(week[0].date.slice(5, 7));
    const prev = i === 0 ? null : Number(weeks[i - 1][0].date.slice(5, 7));
    return month !== prev ? `${month}月` : null;
  });

  return (
    <div className={cn("glass rounded-xl p-5", className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">迭代活跃度</h3>
        <span className="text-xs text-muted-foreground">
          近 {weeks.length} 周 · {total} 次提交
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* 星期标签 */}
        <div className="flex shrink-0 flex-col gap-[3px] pr-1 pt-[15px] text-[9px] leading-none text-muted-foreground/70">
          {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
            <span key={d} className="flex h-[11px] items-center">
              {d}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              <span className="h-3 whitespace-nowrap text-[9px] leading-none text-muted-foreground/70">
                {monthMarks[wi] ?? ""}
              </span>
              {week.map((day) => (
                <span
                  key={day.date}
                  title={`${day.date} · ${day.count} 次`}
                  className={cn(
                    "size-[11px] rounded-[3px] transition-colors hover:ring-1 hover:ring-primary/60",
                    level(day.count)
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        少
        {[0, 1, 3, 5, 7].map((n) => (
          <span key={n} className={cn("size-[9px] rounded-[2px]", level(n))} />
        ))}
        多
      </div>
    </div>
  );
}

