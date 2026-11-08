"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[blog] 页面错误:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Error
      </p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-[-0.02em]">
        出了点状况
      </h1>
      <p className="mt-2 max-w-md text-center text-sm leading-6 text-muted-foreground">
        页面渲染时遇到了错误。重试一下通常能解决；如果持续出现，
        欢迎到
        <Link href="/letters" className="link-underline">
          信箱
        </Link>
        告诉我。
      </p>
      {error.digest && (
        <code className="mt-3 font-mono text-[11px] text-muted-foreground">
          digest: {error.digest}
        </code>
      )}
      <p className="mt-8 flex gap-5 font-mono text-[11px]">
        <button onClick={reset} className="link-underline">
          重试
        </button>
        <Link href="/" className="link-underline">
          回首页
        </Link>
      </p>
    </div>
  );
}
