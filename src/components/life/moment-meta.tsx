import { formatDay, type Moment } from "@/lib/life";

/**
 * 动态头部那一行读数：日期 · 天气 · 地点 · 心情。
 * 等宽 + 表格数字，和观测条同一套语气。
 */
export function MomentMeta({ moment }: { moment: Moment }) {
  const rest = [moment.weather, moment.place, moment.mood].filter(
    (x): x is string => Boolean(x)
  );

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] tabular-nums text-muted-foreground">
      <time dateTime={moment.publishedAt}>
        {formatDay(moment.publishedAt)}
      </time>
      {rest.map((item) => (
        <span key={item}>
          <span aria-hidden>·</span> {item}
        </span>
      ))}
    </p>
  );
}
