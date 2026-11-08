import Link from "next/link";

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
            className={`inline-flex items-baseline gap-1.5 border px-2 py-1 font-mono text-[11px] transition-colors ${
              isActive
                ? "border-data text-data"
                : "border-rule text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>#{tag}</span>
            <span className="text-[10px] opacity-60">{count}</span>
          </Link>
        );
      })}
    </div>
  );
}
