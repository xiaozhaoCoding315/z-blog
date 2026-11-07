"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { useState } from "react";
import { siteConfig, navItems, allNavItems } from "@/config/site";
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

/**
 * 顶部导航：一条细线，四个入口。
 * 不吸顶浮动、不做玻璃——滚动时它只是安静地留在页面顶部。
 */
export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4 sm:px-6">
        {/* 首页自带报头，导航不再重复站名 */}
        {pathname !== "/" && (
          <Link href="/" className="font-heading text-[15px] font-bold tracking-tight">
            {siteConfig.name}
          </Link>
        )}

        {/* 导航与工具按钮始终收在右侧：首页没有站名时也不会跑到左边 */}
        <div className="ml-auto flex items-center gap-6">
          <nav className="hidden items-center gap-6 sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-[13px] transition-colors",
                  isActive(item.href)
                    ? "text-foreground underline decoration-1 underline-offset-4"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="搜索"
              className="h-8 gap-1.5 rounded-none px-2 text-muted-foreground hover:text-foreground"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("blog:open-search"))
              }
            >
              <Search className="size-4" />
              <kbd className="hidden font-mono text-[10px] sm:inline">⌘K</kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="GitHub"
              className="size-8 rounded-none text-muted-foreground hover:text-foreground"
              onClick={() => window.open(siteConfig.links.github, "_blank")}
            >
              <GithubIcon className="size-4" />
            </Button>
            <ThemeToggle />
  
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="菜单"
                  className="size-8 rounded-none"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetHeader>
                  <SheetTitle className="text-left">{siteConfig.name}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col px-4">
                  {allNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "border-b border-border py-3 text-sm transition-colors",
                        isActive(item.href)
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
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
      </div>
    </header>
  );
}
