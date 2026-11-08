import Link from "next/link";
import { MAX_TAGS } from "@/lib/tags";

interface TagFilterProps {
  tags: { tag: string; count: number }[];
  active: string[];
}

/**
 * `/life` 顶部的标签过滤条。
 *
 * 纯链接，没有客户端 JS：每个标签要么把当前 URL 里的自己加进去，
 * 要么拿掉自己，其余已选标签原样保留。无 JS 也能用。
 */
export function TagFilter({ tags, active }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tags.map(({ tag, count }) => {
        const isActive = active.includes(tag);
        const chipClass = `inline-flex items-baseline gap-1.5 border px-2 py-1 font-mono text-[11px] transition-colors ${
          isActive
            ? "border-data text-data"
            : "border-rule text-muted-foreground hover:text-foreground"
        }`;
        const label = (
          <>
            <span>#{tag}</span>
            <span className="text-[10px] opacity-60">{count}</span>
          </>
        );

        // readTags 只保留前 MAX_TAGS 个；已到上限时把未选标签渲染成不可点，
        // 否则链接会把第 6 个写进 URL，又被读取侧静默丢掉，看起来像没反应。
        // 已选标签仍然可点，用来移除自己、把数量降回上限以下。
        if (!isActive && active.length >= MAX_TAGS) {
          return (
            <span
              key={tag}
              aria-disabled="true"
              title="最多同时过滤 5 个标签"
              className={chipClass}
            >
              {label}
            </span>
          );
        }

        const next = isActive
          ? active.filter((item) => item !== tag)
          : [...active, tag];

        const params = new URLSearchParams();
        for (const item of next) params.append("tag", item);
        const query = params.toString();

        return (
          <Link
            key={tag}
            href={query ? `/life?${query}` : "/life"}
            aria-pressed={isActive}
            className={chipClass}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
