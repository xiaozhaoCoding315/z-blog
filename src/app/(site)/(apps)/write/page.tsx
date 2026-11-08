import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { MomentForm } from "@/components/write/moment-form";

export const metadata: Metadata = { title: "写一条" };

// 读会话，每次请求现算
export const instant = false;

export default async function WritePage() {
  await connection();
  const user = await getSessionUser();

  if (!user) {
    return (
      <Shell>
        <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
          发布需要登录。
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
        >
          去登录
        </Link>
      </Shell>
    );
  }

  if (user.role !== "owner") {
    return (
      <Shell>
        <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
          这个入口只对站长开放。你现在是访客身份。
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mt-8">
        <MomentForm />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">写一条</h1>
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        短记 / 图文 / 读数卡 · 发布后立刻出现在首页
      </p>
      {children}
    </div>
  );
}
