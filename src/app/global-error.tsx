"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * 根布局级别的错误回退。
 *
 * global-error 会替换整个根布局，不能依赖 globals.css / 主题 token：
 * 颜色与排版全部内联，保证在最坏情况下也是可读的深色终端。
 */
const COLORS = {
  desk: "#0f0e0c",
  window: "#1a1814",
  window2: "#211e19",
  ink: "#ece6d8",
  inkDim: "#a39a8a",
  amber: "#d9a05b",
  rule: "#352f27",
} as const;

function digestOf(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string"
  ) {
    return (error as { digest: string }).digest;
  }
  return null;
}

export default function GlobalError({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = digestOf(error);

  return (
    <html lang="zh-CN">
      <head>
        <title>系统错误</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 16,
          background: COLORS.desk,
          color: COLORS.ink,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, "PingFang SC", "Microsoft YaHei", monospace',
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: 640,
            border: `1px solid ${COLORS.rule}`,
            background: COLORS.window,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "8px 12px",
              borderBottom: `1px solid ${COLORS.rule}`,
              background: COLORS.window2,
              color: COLORS.inkDim,
              fontSize: 11,
            }}
          >
            <span>zsh — system</span>
            <span aria-hidden="true">×</span>
          </div>

          <div style={{ padding: "20px 16px" }}>
            <p style={{ margin: 0, color: COLORS.inkDim }}>
              guest@z-os ~ % <span style={{ color: COLORS.ink }}>status</span>
            </p>
            <h1
              style={{
                margin: "4px 0 0",
                color: COLORS.amber,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ! 系统错误
            </h1>
            {digest && (
              <p
                style={{
                  margin: "8px 0 0",
                  color: COLORS.inkDim,
                  fontSize: 11,
                  wordBreak: "break-all",
                }}
              >
                digest: {digest}
              </p>
            )}
            <p style={{ margin: "24px 0 0", color: COLORS.inkDim }}>
              提示：可以重试，或回到桌面。
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 20,
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  color: COLORS.amber,
                  font: "inherit",
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                  cursor: "pointer",
                }}
              >
                重试
              </button>
              <Link
                href="/"
                style={{
                  color: COLORS.inkDim,
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                回桌面
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
