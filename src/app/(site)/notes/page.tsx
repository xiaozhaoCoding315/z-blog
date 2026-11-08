import type { Metadata } from "next";
import { getAllNotes, getNoteTags } from "@/content";
import { BlogBrowser } from "@/components/blog/blog-browser";
import { toCardData } from "@/components/blog/post-card";

export const metadata: Metadata = {
  title: "笔记",
  description: "保留下来的技术笔记：建站、检索、Agent 与运行时",
};

export default function NotesPage() {
  const notes = getAllNotes().map(toCardData);
  const tags = getNoteTags();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          笔记
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          共 {notes.length} 篇
        </p>
      </header>
      <BlogBrowser posts={notes} allTags={tags} />
    </div>
  );
}
