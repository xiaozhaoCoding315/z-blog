import type { ShelfItemView } from "@/lib/shelf-server";

/**
 * 一行一条书影音。
 *
 * 不做卡片：没有底色、圆角、阴影，只用一条横线分隔；
 * 封面固定 48×64，底部 mono 读数是日期与评分。
 */
export function ShelfRow({ item }: { item: ShelfItemView }) {
  return (
    <article className="flex gap-4 border-b border-rule py-4">
      {item.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.coverUrl}
          alt={item.title}
          className="h-16 w-12 shrink-0 border border-rule object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-16 w-12 shrink-0 items-center justify-center border border-rule bg-panel-2 font-mono text-[11px] text-muted-foreground"
        >
          {[...item.title][0] ?? "·"}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="break-words text-[15px]">{item.title}</p>
        {item.creator && (
          <p className="mt-0.5 break-words font-mono text-[11px] text-muted-foreground">
            {item.creator}
          </p>
        )}
        {item.note && (
          <p className="mt-2 break-words text-[14px] leading-relaxed">{item.note}</p>
        )}
        <p className="mt-3 font-mono text-[11px] tabular-nums text-muted-foreground">
          {item.date}
          {" · "}
          {item.rating ? (
            <span aria-label={`${item.rating} 分，满分 5 分`}>
              {item.rating}/5
            </span>
          ) : (
            <span>未评分</span>
          )}
        </p>
      </div>
    </article>
  );
}
