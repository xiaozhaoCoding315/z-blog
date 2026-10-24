import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { SearchPalette } from "@/components/search/search-palette";
import { getAllPosts } from "@/content";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const searchable = getAllPosts()
    .filter((p) => !p.meta.draft)
    .map((p) => ({ slug: p.slug, title: p.meta.title, tags: p.meta.tags }));

  return (
    <>
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      <SearchPalette posts={searchable} />
      <ChatWidget />
    </>
  );
}
