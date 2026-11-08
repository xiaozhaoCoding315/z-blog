import { Suspense } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/site/account-menu";
import { DesktopShell } from "@/components/desktop/desktop-shell";
import { friends } from "@/config/portfolio";
import { chatEnabled } from "@/lib/ai";

export default function SiteLayout({
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

  return (
    <DesktopShell
      accountMenu={accountMenu}
      hasFriends={friends.length > 0}
      aiEnabled={chatEnabled}
    >
      {children}
    </DesktopShell>
  );
}
