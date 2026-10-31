"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { TriangleAlert, X } from "lucide-react";

/**
 * 登录失败提示。
 *
 * OAuth 回调失败时会带着 `?login_error=xxx` 跳回来，但如果不读它，
 * 用户只会看到「点了登录、页面闪了一下、什么也没发生」——
 * 这是最让人困惑的一种失败。
 *
 * 用 useSyncExternalStore 而不是 useSearchParams：
 *   1. useSearchParams 会把这个页面拽进动态渲染，而登录提示只在客户端有意义
 *   2. 它也不允许在 effect 里同步 setState（react-hooks 会报错）
 *
 * 快照必须引用稳定，所以解析结果缓存在模块级；URL 清理放在 effect 里做
 * （那是修改外部系统，不是 setState）。
 */

const MESSAGES: Record<string, string> = {
  "no-code": "GitHub 没有返回授权码。可能是你在授权页点了「取消」，重新点一次登录即可。",
  "token-exchange-failed":
    "换取访问令牌失败。通常是 Client Secret 填错或已失效，也可能是服务器访问 GitHub 超时。",
  "user-fetch-failed": "拿到了令牌，但拉取 GitHub 用户信息失败，稍后再试。",
  "user-upsert-failed": "写入用户记录失败，请检查数据库。",
  "db-unavailable": "数据库暂时不可用，登录功能不可用。",
  "login-unconfigured":
    "服务端还没配置 GitHub 登录参数（GITHUB_OAUTH_CLIENT_ID / SECRET）。",
  "callback-failed": "登录过程中出现异常，请查看服务器日志。",
};

/** 模块级缓存：保证 getSnapshot 每次返回同一个值 */
let cache: { value: string | null } | null = null;

function readLoginError(): string | null {
  if (cache) return cache.value;
  if (typeof window === "undefined") return null;
  const err = new URLSearchParams(window.location.search).get("login_error");
  cache = { value: err };
  return err;
}

const subscribe = () => () => {};
const getServerSnapshot = () => null;

export function LoginNotice() {
  const errorCode = useSyncExternalStore(
    subscribe,
    readLoginError,
    getServerSnapshot
  );
  const [dismissed, setDismissed] = useState(false);

  // 读完就清掉 URL 参数：刷新不该重复弹同一句提示
  useEffect(() => {
    if (!errorCode) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("login_error")) return;
    params.delete("login_error");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : "")
    );
  }, [errorCode]);

  if (!errorCode || dismissed) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-amber-500">登录没有完成</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          {MESSAGES[errorCode] ?? `登录失败（错误码：${errorCode}）`}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
          code: {errorCode}
        </p>
      </div>
      <button
        type="button"
        aria-label="关闭提示"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
