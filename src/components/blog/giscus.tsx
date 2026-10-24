"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { siteConfig } from "@/config/site";

/**
 * Giscus 评论（基于 GitHub Discussions）。
 * 配置在 .env 中填写后自动启用；主题跟随站点明暗切换。
 */
export function Giscus() {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const { repo, repoId, category, categoryId, enabled } = siteConfig.giscus;
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !containerRef.current || loadedRef.current) return;
    loadedRef.current = true;

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", repo);
    script.setAttribute("data-repo-id", repoId);
    script.setAttribute("data-category", category);
    script.setAttribute("data-category-id", categoryId);
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-lang", "zh-CN");
    script.setAttribute("data-loading", "lazy");
    containerRef.current.appendChild(script);
  }, [enabled, repo, repoId, category, categoryId]);

  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(
      "iframe.giscus-frame"
    );
    if (!iframe) return;
    iframe.contentWindow?.postMessage(
      {
        giscus: {
          setConfig: {
            theme: resolvedTheme === "dark" ? "transparent_dark" : "light",
          },
        },
      },
      "https://giscus.app"
    );
  }, [resolvedTheme]);

  if (!enabled) {
    return (
      <p className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
        评论区未启用：部署后在 .env 中配置 Giscus 参数并开启仓库 Discussions 即可激活。
      </p>
    );
  }

  return <div ref={containerRef} className="giscus" />;
}
