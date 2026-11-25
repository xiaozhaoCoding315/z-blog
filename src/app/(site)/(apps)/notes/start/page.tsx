import type { Metadata } from "next";
import Link from "next/link";
import { getAllNotes, getNoteSeries } from "@/content";
import { excerptOf } from "@/components/blog/post-card";

export const metadata: Metadata = {
  title: "从哪读起",
  description:
    "这个站点的笔记不是按时间堆的，而是三条阅读线：从零搭一个博客、检索与 RAG、Agent 工程。",
};

/** 每条线补一句「读它能得到什么」，导读页不能只是目录的另一种排版。 */
const SERIES_NOTES: Record<string, string> = {
  "从零搭一个博客":
    "从动机、架构、运行时边界到部署翻车，走完一个站点从想法到上线。",
  "检索与 RAG": "先让搜索能理解意思，再让助手回答时引用到正确的段落。",
  "Agent 工程": "工具怎么设计、记忆怎么分类、多 Agent 什么时候不值得。",
};

export default function NotesStartPage() {
  const series = getNoteSeries();
  const total = getAllNotes().length;
  const covered = series.reduce((sum, group) => sum + group.notes.length, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header data-reveal>
        <p className="reading-label">导读</p>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-[-0.02em]">
          从哪读起
        </h1>
        <div className="notes-start-intro mt-5">
          <p>
            站里一共 {total} 篇笔记，{covered} 篇归进了三条线。每条线是一条
            从问题到结论的完整路径，不是按日期堆出来的归档；挑一条从头读，
            比按时间倒序翻更接近它们当初被写下来的顺序。
          </p>
        </div>
      </header>

      <div className="notes-start mt-12">
        {series.map((group) => (
          <section key={group.title} className="notes-start-line" data-reveal>
            <div className="notes-start-line-head">
              <h2>{group.title}</h2>
              <p>{group.notes.length} 篇</p>
            </div>
            {SERIES_NOTES[group.title] && (
              <p className="reading-body text-ink-dim">
                {SERIES_NOTES[group.title]}
              </p>
            )}
            <ol className="notes-start-list">
              {group.notes.map((note, index) => (
                <li key={note.slug}>
                  <Link href={`/notes/${note.slug}`} className="notes-start-item">
                    <span className="notes-start-num">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="notes-start-name">{note.meta.title}</span>
                    <span className="notes-start-meta">
                      {note.readingText} · {note.meta.date.replace(/-/g, ".")}
                    </span>
                    <span className="notes-start-desc">
                      {note.meta.description ?? excerptOf(note.content, 80)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-rule pt-5 reading-meta">
        <Link href="/notes" className="link-underline">
          全部笔记
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <Link href="/notes/start" className="link-underline">
          从哪读起
        </Link>
      </p>
    </div>
  );
}
