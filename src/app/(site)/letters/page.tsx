import type { Metadata } from "next";
import Link from "next/link";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = { title: "信箱" };

export default function LettersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-bold">信箱</h1>
      <div className="mt-8">
        <NotYetOpen
          title="留言墙"
          description="写一句话，可以顺手推荐一首歌。登录后提交，站长看过了才会挂出来——不是不信任，是怕有人往墙上贴广告。留言墙阶段 3 上线；在那之前，现有的留言板照常可用。"
          phase="阶段 3 上线"
        />
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          现在想留言，请去{" "}
          <Link href="/guestbook" className="link-underline">
            留言板
          </Link>
          。
        </p>
      </div>
    </div>
  );
}
