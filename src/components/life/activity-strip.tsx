/**
 * 90 天密度格。一格一天，颜色深浅表示当天提交数。
 * 没有数据源时整块显示 NOT AVAILABLE——不画一排空格冒充「那天没做事」。
 */
export function ActivityStrip({
  days,
  total,
}: {
  days: { date: string; count: number }[];
  total: number;
}) {
  if (days.length === 0) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        NOT AVAILABLE
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-[3px]" aria-hidden>
        {days.map((d) => (
          <span
            key={d.date}
            className="size-[7px] rounded-[1px] bg-data"
            style={{ opacity: d.count === 0 ? 0.12 : Math.min(0.3 + d.count * 0.18, 1) }}
          />
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
        {total} 次 / 90 天
      </p>
    </div>
  );
}
