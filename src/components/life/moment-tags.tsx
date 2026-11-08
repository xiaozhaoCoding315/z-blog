import Link from "next/link";

/**
 * 动态底部的标签行。
 *
 * 标签是阅读入口，不是装饰：点一个就进 `/life?tag=...`，与过滤条同一套
 * URL 语义。没有标签时整行不占位。
 */
export function MomentTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px]">
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/life?tag=${encodeURIComponent(tag)}`}
          className="text-muted-foreground transition-colors hover:text-data"
        >
          #{tag}
        </Link>
      ))}
    </p>
  );
}
