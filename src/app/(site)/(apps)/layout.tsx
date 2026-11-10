import Link from "next/link";
import { Suspense } from "react";
import { AccountEntry } from "@/components/site/account-entry";
import { PageFrame } from "@/components/desktop/page-frame";

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageFrame
      accountEntry={
        <Suspense
          fallback={
            <span className="account-auth">
              <Link href="/login" className="account-auth-login">
                登录
              </Link>
            </span>
          }
        >
          <AccountEntry />
        </Suspense>
      }
    >
      {children}
    </PageFrame>
  );
}
