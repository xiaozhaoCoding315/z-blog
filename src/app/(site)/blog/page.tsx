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
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          文章
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          共 {posts.length} 篇
        </p>
      </header>
      <BlogBrowser posts={posts} allTags={tags} />
    </div>
  );
}
