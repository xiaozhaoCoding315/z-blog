import { siteConfig } from "@/config/site";

/**
 * ICP 备案号。大陆服务器对外提供网站必须展示，并链接到工信部备案系统。
 *
 * 号码在 `config/site.ts` 的 `footer.icp`；留空则整块不渲染，本地开发和
 * 海外部署都不会凭空多出一行。
 */
export function IcpNotice({ className }: { className?: string }) {
  const { icp, beianUrl } = siteConfig.footer;
  if (!icp) return null;
  return (
    <a
      href={beianUrl || "https://beian.miit.gov.cn/"}
      target="_blank"
      rel="noreferrer noopener"
      className={className}
    >
      {icp}
    </a>
  );
}
