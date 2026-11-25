"use client";

import { ErrorTerminal } from "@/components/errors/error-terminal";

/**
 * 站内页面的错误边界：错误落在 .os-main 里，外壳（任务栏、壁纸）仍在，
 * 因此回退页与根级 error.tsx 共用同一套终端样式。
 */
export default function SiteError({
  error,
  reset,
}: {
  error: unknown;
  reset: () => void;
}) {
  return <ErrorTerminal error={error} reset={reset} />;
}
