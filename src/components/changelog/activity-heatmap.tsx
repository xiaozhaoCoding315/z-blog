import { cn } from "@/lib/utils";

export interface ActivityDay {
  date: string;
  count: number;
}

const LEVEL_CLASS = [
  "bg-transparent",
  "bg-primary/15",
  "bg-primary/30",
  "bg-primary/50",
  "bg-primary/75",
];

/**
 * 活动热力图：一行一年，细线方格。
 * 不用圆角卡片和 tooltip 气泡——它只是给「哪天写过东西」一个低分辨率的视图。
 */
export function ActivityHeatmap({
  days,
  className,
}: {
  days: ActivityDay[];
  className?: string;
}) {
  if (days.length === 0) return null;

  const max = Math.max(...days.map((d) => d.count), 1);
  const levels = days.map((d) =>
    d.count === 0 ? 0 : Math.min(4, Math.ceil((d.count / max) * 4))
  );

  return (
    <div className={cn("border-t border-border pt-4", className)}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-base font-bold tracking-tight">
          写作节奏
        </h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {days.reduce((s, d) => s + d.count, 0)} 次记录
        </span>
      </div>

      <div
        className="mt-3 grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(0, 1fr))" }}
        role="img"
        aria-label={`过去 ${days.length} 天的更新频率`}
      >
        {days.map((day, i) => (
          <span
            key={day.date}
            title={`${day.date}：${day.count} 次`}
            className={cn(
              "aspect-square w-full border border-border/60",
              LEVEL_CLASS[levels[i]]
            )}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 font-mono text-[10px] text-muted-foreground">
        <span>少</span>
        {LEVEL_CLASS.map((cls, i) => (
          <span
            key={i}
            className={cn("size-2 border border-border/60", cls)}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
