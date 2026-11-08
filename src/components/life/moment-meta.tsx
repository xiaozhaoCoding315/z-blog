import Link from "next/link";
import { formatDay, type Moment } from "@/lib/life";

/**
 * 动态头部那一行读数：日期 · 天气 · 地点 · 心情。
 * 等宽 + 表格数字，和观测条同一套语气。
 *
 * 日期同时是「这条的固定链接」——生活流里没有别的地方可以点进单条页，
 * 又不想为它加一个多余的「详情」按钮。
 */
export function MomentMeta({
  moment,
  linked = true,
}: {
  moment: Moment;
  /** 单条页自己不需要链回自己 */
  linked?: boolean;
}) {
  const rest = [moment.weather, moment.place, moment.mood].filter(
    (x): x is string => Boolean(x)
  );

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] tabular-nums text-muted-foreground">
      {linked ? (
        <Link
          href={`/life/${moment.id}`}
          className="transition-colors hover:text-foreground"
        >
          <time dateTime={moment.publishedAt}>
            {formatDay(moment.publishedAt)}
          </time>
        </Link>
      ) : (
        <time dateTime={moment.publishedAt}>
          {formatDay(moment.publishedAt)}
        </time>
      )}
      {rest.map((item, index) => (
        <span key={`${item}-${index}`}>
          <span aria-hidden>·</span> {item}
        </span>
      ))}
    </p>
  );
}
