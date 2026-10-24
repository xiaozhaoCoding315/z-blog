import Link from "next/link";
import { Rss } from "lucide-react";
import { GithubIcon } from "@/components/icons/github";
import { CurrentYear, UpTimeDays } from "@/components/site/runtime-info";
import { TerminalLinkButton } from "@/components/terminal/terminal-link-button";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-border/60">
      <div className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] text-sm font-bold text-white">
                {siteConfig.name.charAt(0)}
              </span>
              <span className="font-heading font-bold">{siteConfig.name}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">导航</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {siteConfig.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">联系与订阅</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <GithubIcon className="size-4" /> GitHub
                </a>
              </li>
              <li>
                <a
                  href="/feed.xml"
                  className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <Rss className="size-4" /> RSS 订阅
                </a>
              </li>
              <li>
                <TerminalLinkButton />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © <CurrentYear /> {siteConfig.name} · Built with Next.js & Docker
          </p>
          <p className="flex items-center gap-2">
            {siteConfig.footer.icp ? (
              <a
                href={siteConfig.footer.beianUrl || "#"}
                target="_blank"
                rel="noreferrer noopener"
              >
                {siteConfig.footer.icp}
              </a>
            ) : null}
            <span>
              已稳定运行 <UpTimeDays /> 天
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
