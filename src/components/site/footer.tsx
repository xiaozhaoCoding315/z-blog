import Link from "next/link";
import { Rss } from "lucide-react";
import { GithubIcon } from "@/components/icons/github";
import { CurrentYear } from "@/components/site/runtime-info";
import { siteConfig, footerNavItems } from "@/config/site";
import { getUptimeSnapshot } from "@/lib/uptime-server";

/**
 * 页脚：一条线，一行导航，一行署名。
 * 没有第三栏「联系与订阅」——那些链接在下面这行里就够了。
 */
export async function Footer() {
  const uptime = await getUptimeSnapshot();

  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            {footerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.title}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <GithubIcon className="size-3.5" /> GitHub
            </a>
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Rss className="size-3.5" /> RSS
            </a>
          </div>
        </div>

        <p className="mt-8 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted-foreground/80">
          <span>
            © <CurrentYear year={uptime.year} /> {siteConfig.name}
          </span>
          <span aria-hidden>·</span>
          <span>since {siteConfig.startedAt}</span>
          <span aria-hidden>·</span>
          <span>{uptime.daysText} 天</span>
          {siteConfig.footer.icp ? (
            <>
              <span aria-hidden>·</span>
              <a
                href={siteConfig.footer.beianUrl || "#"}
                target="_blank"
                rel="noreferrer noopener"
              >
                {siteConfig.footer.icp}
              </a>
            </>
          ) : null}
        </p>
      </div>
    </footer>
  );
}
