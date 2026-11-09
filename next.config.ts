import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 部署使用 standalone 产物
  output: "standalone",
  cacheComponents: true,
  // nodemailer 走原生 socket，不进打包器更稳
  serverExternalPackages: ["nodemailer"],
  partialPrefetching: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  /**
   * 旧路由永久重定向（permanent: true → 308）。
   * 这里只列“整段搬家”的路径：/blog/:slug 交给 Route Handler 判断，
   * 因为归档文章要回 /notes，保留的笔记要回 /notes/:slug，配置层分不出来。
   */
  async redirects() {
    return [
      { source: "/blog", destination: "/notes", permanent: true },
      { source: "/blog/tag/:tag", destination: "/notes", permanent: true },
      { source: "/archives", destination: "/notes", permanent: true },
      { source: "/changelog", destination: "/journal", permanent: true },
      { source: "/guestbook", destination: "/letters", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
