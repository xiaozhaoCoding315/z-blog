"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RelatedItem {
  slug: string;
  title: string;
}

/**
 * 相关文章：服务端按标签交集兜底渲染，客户端再尝试用向量相似度升级。
 */
export function RelatedPosts({
  slug,
  fallback,
}: {
  slug: string;
  fallback: RelatedItem[];
}) {
  const [items, setItems] = useState<RelatedItem[]>(fallback);
  const [upgraded, setUpgraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/related?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (
          !cancelled &&
          Array.isArray(d?.items) &&
          d.items.length > 0
        ) {
          setItems(d.items.slice(0, 3));
          setUpgraded(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (items.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="mb-4 inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
        相关文章
        {upgraded && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-normal text-primary">
            向量推荐
          </span>
        )}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/notes/${item.slug}`}
            className="card-surface-hover rounded-lg p-4 text-sm font-medium leading-snug"
          >
            {item.title}
          </Link>
        ))}
      </div>
    </section>
  );
}
