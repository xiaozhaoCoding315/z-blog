import { Suspense } from "react";
import Link from "next/link";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { AccountMenu } from "@/components/site/account-menu";
import { ChatWidget } from "@/components/chat/chat-widget";
import { SearchPalette } from "@/components/search/search-palette";
import { getAllNotes } from "@/content";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const notes = getAllNotes().filter((p) => !p.meta.draft);
  const searchable = notes.map((p) => ({
    slug: p.slug,
    title: p.meta.title,
    tags: p.meta.tags,
  }));

  // Suspense 把读 cookie 的账号菜单收进动态洞，静态页面壳不被拖成整页动态
  const accountMenu = (
    <Suspense
      fallback={
        <Link
          href="/login"
          className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          登录
        </Link>
      }
    >
      <AccountMenu />
    </Suspense>
  );

  return (
    <>
      <Navbar accountMenu={accountMenu} />
      <main className="flex-1">{children}</main>
      <Footer />
      <SearchPalette posts={searchable} />
      <ChatWidget />
    </>
  );
}
