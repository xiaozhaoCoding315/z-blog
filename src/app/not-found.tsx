import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-noise relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black,transparent)]" />
      <div
        className="glow-orb left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "var(--glow-1)" }}
      />
      <div className="relative flex flex-col items-center text-center">
        <h1 className="text-gradient font-heading text-[7rem] font-extrabold leading-none tracking-tighter sm:text-[9rem]">
          404
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          页面去星际旅行了
        </p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          也可能只是链接打错了，或者文章还在草稿箱里
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild className="rounded-full">
            <Link href="/">
              <ArrowLeft className="size-4" /> 回首页
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/blog">
              <Compass className="size-4" /> 逛博客
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
