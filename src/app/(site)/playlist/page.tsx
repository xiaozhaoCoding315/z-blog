import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = { title: "歌单" };

export default function PlaylistPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-[24px] font-bold">歌单</h1>
      <div className="mt-8">
        <NotYetOpen
          title="此刻循环、我的歌单、大家推荐的"
          description="每首歌一条推荐理由，整行跳到网易云或 QQ 音乐。你推荐的需要审核，通过之后署上你的名字。"
          phase="阶段 3–4 上线"
        />
      </div>
    </div>
  );
}
