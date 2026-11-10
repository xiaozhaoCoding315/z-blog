import type { Metadata } from "next";
import { AboutProfile } from "@/components/about/about-profile";
import { siteConfig } from "@/config/site";

// 档案请求期读取状态句、运行快照与 GitHub 活动；允许阻塞导航，
// 避免 Next 16 Partial Prefetching 在开发期反复提示 instant-shell URL 数据。
export const instant = false;

export const metadata: Metadata = {
  title: "关于",
  description: `关于 ${siteConfig.author.name}：全栈 / AI 应用开发者。`,
};

export default function AboutPage() {
  return (
    <div className="about-page mx-auto px-4 py-12 sm:px-6" data-reveal>
      <AboutProfile variant="page" />
    </div>
  );
}
