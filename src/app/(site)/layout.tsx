import { Suspense } from "react";
import Link from "next/link";
import type {
  TerminalNote,
  TerminalSnippet,
} from "@/components/terminal/commands";
import { AccountMenu } from "@/components/site/account-menu";
import { DesktopShell } from "@/components/desktop/desktop-shell";
import { friends } from "@/config/portfolio";
import { getAllNotes } from "@/content";
import { chatEnabled } from "@/lib/ai";
import { getUptimeSnapshot } from "@/lib/uptime-server";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Suspense 把读 cookie 的账号菜单收进动态洞，静态外壳不被拖成整页动态
  const accountMenu = (
    <Suspense
      fallback={
        <Link href="/login" className="os-menu-link">
          登录
        </Link>
      }
    >
      <AccountMenu />
    </Suspense>
  );

  // 终端与 Spotlight（Task 5）共用同一份笔记索引；内容层直接读文件，不查库。
  const notes: TerminalNote[] = getAllNotes().map((note) => ({
    slug: note.slug,
    title: note.meta.title,
    tags: note.meta.tags ?? [],
  }));
  // Phase 3 才引入代码片段数据模型；这里先给空数组，不编造数据。
  const snippets: TerminalSnippet[] = [];
  // Cache Components 下不能在预渲染期直接 Date.now()；复用站点既有的
  // 「use cache + cacheLife(hours)」快照，拿到的仍是真实建站天数。
  const uptime = await getUptimeSnapshot();

  return (
    <DesktopShell
      accountMenu={accountMenu}
      hasFriends={friends.length > 0}
      aiEnabled={chatEnabled}
      notes={notes}
      snippets={snippets}
      uptimeDays={uptime.days}
    >
      {children}
    </DesktopShell>
  );
}
