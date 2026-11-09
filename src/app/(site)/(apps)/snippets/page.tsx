import type { Metadata } from "next";
import { Suspense } from "react";
import { SnippetBrowser } from "@/components/snippets/snippet-browser";
import { snippets } from "@/config/snippets";
import { highlightSnippets } from "@/lib/snippets-server";

export const metadata: Metadata = {
  title: "代码片段",
  description: "这个站里真正用过的代码。",
};

export default async function SnippetsPage() {
  const highlighted = await highlightSnippets();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          代码片段
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {snippets.length} 段 · 这个站里真正跑过的代码
        </p>
      </header>

      {/* useSearchParams 只影响选中态；Suspense 让页面其余部分仍可预渲染。 */}
      <Suspense
        fallback={
          <p className="os-snippets-empty" aria-live="polite">
            正在加载代码片段…
          </p>
        }
      >
        <SnippetBrowser
          snippets={snippets}
          highlighted={highlighted}
          variant="page"
        />
      </Suspense>
    </div>
  );
}
