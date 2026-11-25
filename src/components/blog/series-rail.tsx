import Link from "next/link";
import type { Note } from "@/lib/content-core";
import { cn } from "@/lib/utils";

export interface SeriesRailProps {
  title: string;
  notes: Note[];
  /** 当前笔记在系列里的下标（0 开始） */
  index: number;
}

/**
 * 系列导轨：告诉读者「这是第几篇、前后是什么」。
 *
 * 笔记页最常丢的信息不是标题，而是位置感——从搜索或分享链接进来的读者
 * 不知道前面还有几篇。导轨把整条线摊开，当前这篇高亮，其余可点。
 * 只有写了 series + order 的笔记才有导轨，独立文章不多这一块。
 */
export function SeriesRail({ title, notes, index }: SeriesRailProps) {
  return (
    <nav className="series-rail" aria-label={`系列：${title}`}>
      <p className="series-rail-head">
        <span className="series-rail-label">系列</span>
        <span className="series-rail-title">{title}</span>
        <span className="series-rail-count">
          {index + 1} / {notes.length}
        </span>
      </p>
      <ol className="series-rail-list">
        {notes.map((note, i) => {
          const current = i === index;
          return (
            <li key={note.slug}>
              <Link
                href={`/notes/${note.slug}`}
                className={cn("series-rail-item", current && "is-current")}
                aria-current={current ? "page" : undefined}
              >
                <span className="series-rail-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="series-rail-name">{note.meta.title}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
