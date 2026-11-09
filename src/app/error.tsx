"use client";

import { ErrorTerminal } from "@/components/errors/error-terminal";

/**
 * 根级错误边界：接管根布局之下的渲染错误。
 * 页面错误若还有更近的边界（如 (site)/error.tsx）会先被它们处理。
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  return <ErrorTerminal error={error} reset={reset} />;
}
