import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { SearchPalette } from "@/components/search/search-palette";
import { TerminalPalette } from "@/components/terminal/terminal-palette";
import { getAllPosts } from "@/content";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const posts = getAllPosts().filter((p) => !p.meta.draft);
  const searchable = posts.map((p) => ({
    slug: p.slug,
    title: p.meta.title,
    tags: p.meta.tags,
  }));

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      <SearchPalette posts={searchable} />
      <TerminalPalette posts={searchable} />
      <ChatWidget />
    </>
  );
}
