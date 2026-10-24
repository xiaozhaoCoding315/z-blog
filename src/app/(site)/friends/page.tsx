import type { Metadata } from "next";
import Link from "next/link";
import { friends } from "@/config/portfolio";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "友链",
  description: "朋友们的主页。",
};

export default function FriendsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          友链
        </h1>
        <p className="mt-2 text-muted-foreground">
          互联网上值得一看的主页，欢迎交换友链
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {friends.map((friend) => (
          <a
            key={friend.name}
            href={friend.url}
            target="_blank"
            rel="noreferrer noopener"
            className="card-hover glass flex items-center gap-4 rounded-xl p-5"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] text-lg font-bold text-white">
              {friend.name.charAt(0)}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">{friend.name}</span>
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {friend.description}
              </span>
            </span>
          </a>
        ))}
      </div>

      <div className="glass mt-10 rounded-xl p-6 text-sm leading-relaxed text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">交换友链</h2>
        <p>
          本站信息：<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{siteConfig.name}</code>{" "}
          ·{" "}
          <Link href="/" className="text-primary">
            {siteConfig.url}
          </Link>
          。通过关于页面的方式联系我，附上你的站点名称、链接和一句话介绍即可。
        </p>
      </div>
    </div>
  );
}
