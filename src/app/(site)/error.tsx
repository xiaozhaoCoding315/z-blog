"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="bg-noise relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black,transparent)]" />
      <div
        className="glow-orb left-1/2 top-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "var(--glow-1)", opacity: 0.6 }}
      />
      <div className="relative flex flex-col items-center text-center">
        <p className="text-gradient font-heading text-2xl font-extrabold">
          出了点小状况
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          页面渲染时遇到了错误。可能是网络抖动或服务暂时不可用，
          重试一下通常就能解决；如果持续出现，欢迎到留言板告诉博主。
        </p>
        {error.digest && (
          <code className="mt-3 rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
            digest: {error.digest}
          </code>
        )}
        <div className="mt-8 flex gap-3">
          <Button onClick={reset} className="rounded-full">
            <RotateCcw className="size-4" /> 重试
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/">
              <Home className="size-4" /> 回首页
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
