import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = {
  title: "生活胶囊",
  description: "带照片的瞬间，按时间铺开。",
};

export default function GalleryPage() {
  return (
    <div className="px-4 py-12 sm:px-6">
      <NotYetOpen
        title="生活胶囊"
        phase="阶段 3 上线"
        description="带照片的瞬间会在这里按时间铺开，窗口内可以放大查看。现在还没有上线，不拿占位图冒充内容。"
      />
    </div>
  );
}
