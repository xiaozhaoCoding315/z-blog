import type { Metadata } from "next";
import { getAllPosts, getTags } from "@/content";
import { BlogBrowser } from "@/components/blog/blog-browser";
import { toCardData } from "@/components/blog/post-card";

export const metadata: Metadata = {
  title: "博客",
  description: "全部文章：技术实践、AI 应用与随想。",
};

export default function BlogPage() {
  const posts = getAllPosts().map(toCardData);
  const tags = getTags();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          博客
        </h1>
        <p className="mt-2 text-muted-foreground">
          共 {posts.length} 篇文章 · 按标签或关键词浏览
        </p>
      </header>
      <BlogBrowser posts={posts} allTags={tags} />
    </div>
  );
}
