import type { Metadata } from "next";
import { AboutProfile } from "@/components/about/about-profile";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "关于",
  description: `关于 ${siteConfig.author.name}：全栈 / AI 应用开发者。`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <AboutProfile variant="page" />
    </div>
  );
}
