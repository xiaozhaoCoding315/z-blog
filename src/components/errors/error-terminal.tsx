"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * error.tsx 的终端式回退。
 *
 * 错误边界必须由客户端组件渲染，但这里只做展示：错误细节只写控制台，
 * 页面只暴露 digest（用于和服务端日志对上），从不渲染 message。
 * `reset()` 会重新渲染出错的分段；「回桌面」是普通链接，无 JS 也能走。
 */
function digestOf(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  ) {
    return (error as { digest: string }).digest;
  }
  return null;
}

export function ErrorTerminal({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = digestOf(error);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl border border-rule bg-window font-mono text-[13px] leading-relaxed text-ink">
        <div className="flex items-center justify-between gap-4 border-b border-rule bg-window-2 px-3 py-2 text-[11px] text-ink-dim">
          <span>zsh — system</span>
          <span aria-hidden="true">×</span>
        </div>
        <div className="px-4 py-5">
          <p className="text-ink-dim">
            guest@z-os ~ % <span className="text-ink">status</span>
          </p>
          <h1 className="mt-1 text-danger">! 系统错误</h1>
          {digest && (
            <p className="mt-2 break-all text-[11px] text-ink-dim">
              digest: {digest}
            </p>
          )}
          <p className="mt-6 text-ink-dim">提示：可以重试，或回到桌面。</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer text-phosphor underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phosphor"
            >
              重试
            </button>
            <Link
              href="/"
              className="text-ink-dim underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phosphor"
            >
              回桌面
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
