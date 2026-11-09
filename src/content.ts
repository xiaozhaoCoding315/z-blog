/**
 * RSC 侧内容读取入口：带 React cache，供页面与路由使用。
 */
import { cache } from "react";
import {
  listRawNotes,
  getRawNote,
  getAllTags,
  type Note,
} from "@/lib/content-core";

/** 所有已发布笔记（不含草稿），日期倒序，置顶优先 */
export const getAllNotes = cache((): Note[] =>
  listRawNotes()
    .filter((p) => !p.meta.draft)
    .sort((a, b) => {
      if (a.meta.pinned !== b.meta.pinned) return a.meta.pinned ? -1 : 1;
      return new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime();
    })
);

export const getNoteBySlug = cache((slug: string): Note | null =>
  getRawNote(slug)
);

/** 按日期顺序的上一篇 / 下一篇（忽略置顶排序） */
export function getAdjacentNotes(slug: string) {
  const notes = listRawNotes()
    .filter((p) => !p.meta.draft)
    .sort(
      (a, b) =>
        new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
    );
  const index = notes.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    // 列表按时间倒序：索引更小 = 更新
    prev: notes[index - 1] ?? null,
    next: notes[index + 1] ?? null,
  };
}

export const getNoteTags = cache(() => {
  const notes = listRawNotes().filter((p) => !p.meta.draft);
  return getAllTags(notes);
});
