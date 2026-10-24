"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { GithubIcon } from "@/components/icons/github";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "glass border-b shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] font-bold text-white shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
            {siteConfig.name.charAt(0)}
          </span>
          <span className="font-heading text-[1.05rem] font-bold tracking-tight">
            {siteConfig.name}
          </span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive(item.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.title}
              {isActive(item.href) && (
                <span className="absolute inset-x-3 -bottom-[3px] h-[2px] rounded-full bg-gradient-to-r from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)]" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="搜索"
            className="h-9 gap-2 rounded-full border border-border/60 px-3 text-muted-foreground"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("blog:open-search"))
            }
          >
            <Search className="size-4" />
            <span className="hidden text-xs sm:inline">搜索文章</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="GitHub"
            className="text-muted-foreground"
            onClick={() =>
              window.open(siteConfig.links.github, "_blank")
            }
          >
            <GithubIcon className="size-[1.1rem]" />
          </Button>
          <ThemeToggle />

          {/* 移动端菜单 */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="菜单">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle className="text-left">{siteConfig.name}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {siteConfig.nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
