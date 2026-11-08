import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/config/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.title}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.title,
  authors: [{ name: siteConfig.author.name }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: siteConfig.title,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  // 让浏览器和阅读器能自动发现订阅源，不用人肉在首页找那个 RSS 链接
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: siteConfig.title }],
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0e0c",
};

const PRESET_SCRIPT = `(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("z-os:settings") || "{}");
    const preset = saved.preset === "paper" || saved.preset === "blueprint" ? saved.preset : "night";
    const root = document.documentElement;
    root.dataset.wallpaper = preset;
    root.classList.toggle("dark", preset !== "paper");
    root.dataset.deskObjects = saved.objects === false ? "off" : "on";
    root.style.colorScheme = preset === "paper" ? "light" : "dark";
  } catch {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  // 站点级结构化数据：让搜索引擎知道这是一个人在持续维护的个人空间
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    inLanguage: "zh-CN",
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      url: siteConfig.url,
      sameAs: [siteConfig.links.github],
    },
  };

  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-wallpaper="night"
      className={cn(
        // 夜班是默认：把 dark 写进服务端 HTML，关掉 JS 也还是夜班
        "dark h-full antialiased",
        geistSans.variable,
        geistMono.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRESET_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
