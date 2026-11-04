import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>
      <h1 className="mt-3 font-heading text-3xl font-bold tracking-[-0.02em]">
        这一页不在
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        可能链接打错了，也可能文章还在草稿箱里。
      </p>
      <p className="mt-8 flex gap-5 font-mono text-[11px]">
        <Link href="/" className="link-underline">
          ← 回首页
        </Link>
        <Link href="/blog" className="link-underline">
          浏览文章
        </Link>
      </p>
    </div>
  );
}
