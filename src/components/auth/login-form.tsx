"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 两步登录：先要码，再验码。
 *
 * 两步都自己发 fetch 而不是 Server Action：登录要在响应里写 cookie，
 * Route Handler 比 Action 直白。
 */
export function LoginForm({ ownerConfigured }: { ownerConfigured: boolean }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function requestCode() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "发送失败");
        return;
      }
      setStep("code");
      setNotice("验证码已发出。收不到先翻一下垃圾箱。");
    } catch {
      setError("网络异常，稍后再试");
    } finally {
      setPending(false);
    }
  }

  async function verify() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "验证失败");
        return;
      }
      window.location.assign(data?.next ?? "/");
    } catch {
      setError("网络异常，稍后再试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="divide-y divide-rule border-y border-rule"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "email") void requestCode();
        else void verify();
      }}
    >
      <div className="py-4">
        <label
          htmlFor="email"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={step === "code"}
          className="mt-2 h-10 rounded-none border-rule bg-transparent font-mono text-[14px]"
          placeholder="you@example.com"
        />
      </div>

      {step === "code" && (
        <div className="py-4">
          <label
            htmlFor="code"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            Code
          </label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            pattern="\d{6}"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="mt-2 h-10 rounded-none border-rule bg-transparent font-mono text-[20px] tracking-[0.3em] tabular-nums"
            placeholder="000000"
          />
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            10 分钟内有效 · 最多试 5 次
          </p>
        </div>
      )}

      {notice && (
        <p className="py-3 font-mono text-[11px] text-ok" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="py-3 font-mono text-[11px] text-alert" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 py-4">
        <Button
          type="submit"
          disabled={pending}
          className="rounded-none border border-data bg-transparent px-4 font-mono text-[12px] text-data hover:border-foreground hover:bg-transparent hover:text-foreground"
        >
          {pending ? "处理中…" : step === "email" ? "发验证码" : "登录"}
        </Button>
        {step === "code" && (
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setNotice(null);
              setError(null);
            }}
            className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            换个邮箱
          </button>
        )}
      </div>

      {!ownerConfigured && (
        <p className="py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          服务器没配 OWNER_EMAIL：登录能成功，但没人会被认成站长，发布页仍然进不去。
        </p>
      )}
    </form>
  );
}
