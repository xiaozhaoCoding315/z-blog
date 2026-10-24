"use client";

import { useEffect, useState } from "react";
import { GithubIcon } from "@/components/icons/github";

interface Day {
  date: string;
  count: number;
}

const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

/** GitHub 风格活跃热力图（近 90 天，数据来自公开 Events API） */
export function GithubHeatmap() {
  const [days, setDays] = useState<Day[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/github")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        if (d.available === false) {
          setFailed(true);
          return;
        }
        setDays(d.days);
        setTotal(d.total);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return null;

  // 按周分列（列 = 周，行 = 周一..周日）
  const weeks: Day[][] = [];
  const cells = days ?? Array.from({ length: 90 }, () => null as unknown as Day);
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  function level(count: number) {
    if (count === 0) return "bg-muted/60";
    if (count <= 2) return "bg-primary/25";
    if (count <= 5) return "bg-primary/45";
    if (count <= 10) return "bg-primary/70";
    return "bg-primary";
  }

  return (
    <div className="glass card-hover rounded-xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-semibold">
          <GithubIcon className="size-4" /> 最近开源活跃
        </h3>
        {days && (
          <span className="text-xs text-muted-foreground">
            近 90 天 · {total} 次公开事件
          </span>
        )}
      </div>

      {days === null ? (
        <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
          正在拉取 GitHub 活跃数据…
        </div>
      ) : (
        <>
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <span
                    key={day.date}
                    title={`${day.date} · ${day.count} 个事件`}
                    className={`size-[11px] rounded-[3px] transition-colors ${level(day.count)}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{MONTHS[new Date(days[0].date).getMonth()]} → 今天</span>
            <span className="flex items-center gap-1">
              少
              {[0, 2, 5, 10, 15].map((n) => (
                <span key={n} className={`size-[9px] rounded-[2px] ${level(n)}`} />
              ))}
              多
            </span>
          </div>
        </>
      )}
    </div>
  );
}
