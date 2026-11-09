"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { filterByTags } from "@/lib/tags";

interface FilterItem {
  id: string;
  tags: string[];
  node: ReactNode;
}

interface DesktopTagFilterProps {
  tags: { tag: string; count: number }[];
  items: FilterItem[];
  max: number;
  emptyMessage: string;
}

/**
 * 桌面日志窗口的即时标签筛选岛。
 *
 * 条目是服务端渲染好的 ReactNode 槽位，组件只决定哪些槽位可见；
 * 没有函数 prop 跨服务端/客户端边界。所有 12 条内容始终在服务端 HTML 里，
 * JS 关闭时本岛不渲染任何隐藏逻辑（服务端 HTML 直接是完整列表），
 * /life 仍是可分享的完整无 JS 入口。
 */
export function DesktopTagFilter({
  tags,
  items,
  max,
  emptyMessage,
}: DesktopTagFilterProps) {
  const [active, setActive] = useState<string[]>([]);

  const visibleIds = useMemo(() => {
    if (active.length === 0) return null;
    // filterByTags 是 /life 共用的 AND 语义；这里用最小领域投影调用它。
    const moments = items.map((item) => ({ id: item.id, tags: item.tags }));
    return new Set(
      filterByTags(moments, active).map((moment) => moment.id)
    );
  }, [active, items]);

  const toggle = (tag: string) => {
    setActive((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      if (current.length >= max) return current;
      return [...current, tag];
    });
  };

  return (
    <div className="os-desktop-tags">
      <div className="os-desktop-tags-bar" role="group" aria-label="日志标签筛选">
        {tags.map(({ tag, count }) => {
          const isActive = active.includes(tag);
          const disabled = !isActive && active.length >= max;
          return (
            <button
              key={tag}
              type="button"
              className="os-desktop-tag"
              data-active={isActive ? "true" : undefined}
              aria-pressed={isActive}
              disabled={disabled}
              title={disabled ? `最多同时筛选 ${max} 个标签` : undefined}
              onClick={() => toggle(tag)}
            >
              <span>#{tag}</span>
              <span aria-hidden className="os-desktop-tag-count">
                {count}
              </span>
              {isActive && <span className="os-desktop-tag-selected">已选</span>}
            </button>
          );
        })}
        {active.length > 0 && (
          <button
            type="button"
            className="os-desktop-tag is-clear"
            onClick={() => setActive([])}
          >
            清除
          </button>
        )}
        <Link href="/life" className="os-desktop-tags-more">
          全部日志 →
        </Link>
      </div>

      {visibleIds === null || visibleIds.size > 0 ? (
        <div className="relative pl-6">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>
          <ul className="flex flex-col gap-7">
            {items
              .filter((item) => visibleIds === null || visibleIds.has(item.id))
              .map((item) => item.node)}
          </ul>
        </div>
      ) : (
        <div className="os-desktop-tags-empty" role="status">
          <p>{emptyMessage}</p>
          <p className="os-desktop-tags-hint">
            标签按 AND 匹配，最多 {max} 个。
          </p>
        </div>
      )}
    </div>
  );
}
