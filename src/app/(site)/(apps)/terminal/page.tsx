import type { Metadata } from "next";
import { StandaloneTerminal } from "@/components/terminal/standalone-terminal";
import type {
  TerminalNote,
  TerminalSnippet,
} from "@/components/terminal/commands";
import { snippets as snippetConfig } from "@/config/snippets";
import { getAllNotes } from "@/content";
import { chatEnabled } from "@/lib/ai";
import { getUptimeSnapshot } from "@/lib/uptime-server";

export const metadata: Metadata = {
  title: "终端",
  description: "用命令浏览这个个人空间的应用、笔记与代码片段。",
};

export default async function TerminalPage() {
  const notes: TerminalNote[] = getAllNotes().map((note) => ({
    slug: note.slug,
    title: note.meta.title,
    tags: note.meta.tags ?? [],
  }));
  const snippets: TerminalSnippet[] = snippetConfig.map((snippet) => ({
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    tags: snippet.tags,
  }));
  const uptime = await getUptimeSnapshot();

  return (
    <StandaloneTerminal
      notes={notes}
      snippets={snippets}
      uptimeDays={uptime.days}
      aiEnabled={chatEnabled}
    />
  );
}
