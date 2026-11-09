import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "404 · 页面不存在" },
};

/**
 * 404：终端里打开了一个不存在的路径。
 *
 * 不显示堆栈，也不猜用户原本想去哪一页；两条真实链接负责带路。
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl border border-rule bg-window font-mono text-[13px] leading-relaxed text-ink">
        <div className="flex items-center justify-between gap-4 border-b border-rule bg-window-2 px-3 py-2 text-[11px] text-ink-dim">
          <h1>zsh — 404</h1>
          <span aria-hidden="true">×</span>
        </div>
        <div className="px-4 py-5">
          <p className="text-ink-dim">
            guest@z-os ~ % <span className="text-ink">open /missing</span>
          </p>
          <p className="mt-1 text-danger">
            zsh: no such file or directory: /missing
          </p>
          <p className="mt-6 text-ink-dim">提示：回到桌面</p>
          <nav aria-label="404 导航" className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <Link
              href="/"
              className="text-phosphor underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phosphor"
            >
              ← 返回桌面
            </Link>
            <Link
              href="/notes"
              className="text-ink-dim underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-phosphor"
            >
              浏览笔记
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
