import type { Metadata } from "next";
import { NotYetOpen } from "@/components/site/not-yet-open";

export const metadata: Metadata = {
  title: "代码片段",
  description: "这个站里真正用过的代码。",
};

export default function SnippetsPage() {
  return (
    <div className="px-4 py-12 sm:px-6">
      <NotYetOpen
        title="代码片段"
        phase="阶段 3 上线"
        description="这里会放这个站里真正跑过的短代码，带语法高亮和一键复制。现在还没有上线，不搬别人的示例充数。"
      />
    </div>
  );
}
