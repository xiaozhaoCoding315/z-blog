import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = { title: "书架" };

export default function ShelfPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-[24px] font-bold">书架</h1>
      <div className="mt-8">
        <NotYetOpen
          title="书、影、音，按时间倒序"
          description="读过的书、看过的电影、反复听的专辑，每一条一句话短评。不分类，只按时间排——这是过日子，不是建数据库。"
          phase="阶段 4 上线"
        />
      </div>
    </div>
  );
}
