import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = { title: "信箱" };

export default function LettersPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-[24px] font-bold">信箱</h1>
      <div className="mt-8">
        <NotYetOpen
          title="留言墙"
          description="写一句话，可以顺手推荐一首歌。登录后提交，站长看过了才会挂出来——不是不信任，是怕有人往墙上贴广告。"
          phase="阶段 3 上线"
        />
      </div>
    </div>
  );
}
