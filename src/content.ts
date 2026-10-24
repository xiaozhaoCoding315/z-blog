/**
 * RSC 侧内容读取入口：带 React cache，供页面与路由使用。
 */
import { cache } from "react";
import {
  listRawPosts,
  getRawPost,
  getAllTags,
  type Post,
} from "@/lib/content-core";

/** 所有已发布文章（不含草稿），日期倒序，置顶优先 */
export const getAllPosts = cache((): Post[] =>
  listRawPosts()
    .filter((p) => !p.meta.draft)
    .sort((a, b) => {
      if (a.meta.pinned !== b.meta.pinned) return a.meta.pinned ? -1 : 1;
      return new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime();
    })
);

export const getPostBySlug = cache((slug: string): Post | null =>
  getRawPost(slug)
);

/** 按日期顺序的上一篇 / 下一篇（忽略置顶排序） */
export function getAdjacentPosts(slug: string) {
  const posts = listRawPosts()
    .filter((p) => !p.meta.draft)
    .sort(
      (a, b) =>
        new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
    );
  const index = posts.findIndex((p) => p.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    // 列表按时间倒序：索引更小 = 更新
    prev: posts[index - 1] ?? null,
    next: posts[index + 1] ?? null,
  };
}

export const getTags = cache(() => {
  const posts = listRawPosts().filter((p) => !p.meta.draft);
  return getAllTags(posts);
});
